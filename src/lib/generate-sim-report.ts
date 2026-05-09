import { DevvAI } from '@devvai/devv-code-backend';
import type { DecisionEngineAttemptReport } from '@/store/decision-engine-store';

interface SimulationData {
  scenario: string;
  targetIP: string;
  difficulty: string;
  selectedDurationMinutes: number;
  startedAt: string;
  endedAt: string | null;
  history: Array<{
    userCommand: string;
    systemResponse: string;
    phase: string;
    timestamp: string;
  }>;
  discoveredInfo: {
    openPorts?: string[];
    services?: string[];
    directories?: string[];
    credentials?: string[];
    flags?: string[];
  };
  hintsUsed: number;
  evaluation?: {
    reconScore: number | null;
    scanningScore: number | null;
    enumerationScore: number | null;
    exploitationScore: number | null;
    privescScore: number | null;
    methodologyScore: number;
    overallScore: number;
  };
  findings: Array<{
    title: string;
    severity: string;
    cvssEstimate: number;
    markdown: string;
  }>;
}

export async function generateEndOfSimReport(
  simulation: SimulationData
): Promise<DecisionEngineAttemptReport> {
  const ai = new DevvAI();
  
  const durationMinutes = simulation.endedAt 
    ? Math.floor((new Date(simulation.endedAt).getTime() - new Date(simulation.startedAt).getTime()) / 60000)
    : simulation.selectedDurationMinutes;
  
  const findingsSection = simulation.findings.length > 0
    ? simulation.findings.map((f, i) => `### Finding ${i + 1}: ${f.title}\n\n${f.markdown}`).join('\n\n')
    : '### No Formalized Findings\n\nThe simulation was completed but findings were not formally documented during execution. Key evidence discovered includes credentials, directories, and flags, but these were not structured as formal vulnerability findings.';
  
  const technicalScore = simulation.evaluation 
    ? Math.round(((simulation.evaluation.scanningScore || 0) + (simulation.evaluation.enumerationScore || 0)) / 2) || 'N/A'
    : 'N/A';
  
  // Generate markdown report
  const reportPrompt = `Generate a professional pentesting simulation report in markdown format.

SIMULATION DATA:
- Target: ${simulation.targetIP}
- Difficulty: ${simulation.difficulty}
- Duration: ${durationMinutes} minutes
- Commands Executed: ${simulation.history.length}
- Flags Captured: ${simulation.discoveredInfo.flags?.length || 0}
- Hints Used: ${simulation.hintsUsed}

DISCOVERED EVIDENCE:
- Open Ports: ${simulation.discoveredInfo.openPorts?.join(', ') || 'None'}
- Services: ${simulation.discoveredInfo.services?.join(', ') || 'None'}
- Directories: ${simulation.discoveredInfo.directories?.join(', ') || 'None'}
- Credentials: ${simulation.discoveredInfo.credentials?.length || 0} found
- Flags: ${simulation.discoveredInfo.flags?.join(', ') || 'None'}

COMMAND HISTORY (last 20):
${simulation.history.slice(-20).map(h => `[${h.phase}] ${h.userCommand}`).join('\n')}

FINDINGS IDENTIFIED:
${simulation.findings.map((f, i) => `${i + 1}. ${f.title} (${f.severity})`).join('\n') || 'None documented'}

Generate a complete markdown report with these sections:

# Penetration Test Report

## Executive Summary
[2-3 sentences summarizing the engagement, key findings, and risk level]

## Scope & Metadata
- Target: ${simulation.targetIP}
- Difficulty: ${simulation.difficulty}
- Duration: ${durationMinutes} minutes
- Methodology: PTES
- Commands Executed: ${simulation.history.length}
- Flags Captured: ${simulation.discoveredInfo.flags?.length || 0}
- Hints Used: ${simulation.hintsUsed}

## Methodology
[Brief overview of the phases followed: reconnaissance, enumeration, exploitation, privilege escalation, post-exploitation]

## Findings

${findingsSection}

## Attack Narrative
[Chronological story of the attack path from initial reconnaissance to final flag capture. Use actual commands and evidence from the simulation history.]

## Evidence Captured
- Flags: ${simulation.discoveredInfo.flags?.join(', ') || 'None'}
- Credentials: ${simulation.discoveredInfo.credentials?.length || 0} discovered
- Services: ${simulation.discoveredInfo.services?.join(', ') || 'None enumerated'}
- Directories: ${simulation.discoveredInfo.directories?.join(', ') || 'None found'}

## Conclusion
[1-2 sentences on overall engagement success and key takeaways]

## Assessment Metrics
- Overall Performance: ${simulation.evaluation?.overallScore || 'N/A'}%
- Methodology Adherence: ${simulation.evaluation?.methodologyScore || 'N/A'}%
- Technical Execution: ${technicalScore}%

---

*Report Generated: ${new Date().toISOString()}*

CRITICAL: Use only actual evidence from the simulation. Do not invent discoveries. Be concise and professional. No placeholder text.`;

  const reportResponse = await ai.chat.completions.create({
    model: 'kimi-k2-0711-preview',
    messages: [{ role: 'user', content: reportPrompt }],
    max_tokens: 3000,
  });

  const reportMarkdown = reportResponse.choices[0]?.message?.content || '# Report Generation Failed';

  // Generate evaluation
  const evaluationPrompt = `Evaluate this penetration testing simulation report and performance.

SIMULATION CONTEXT:
- Commands: ${simulation.history.length}
- Flags: ${simulation.discoveredInfo.flags?.length || 0}/2
- Hints: ${simulation.hintsUsed}
- Findings: ${simulation.findings.length} documented
- Duration: ${durationMinutes} min

METHODOLOGY PHASES PRACTICED:
${[...new Set(simulation.history.map(h => h.phase))].join(', ')}

REPORT PREVIEW:
${reportMarkdown.substring(0, 1500)}

Rate on 0-10 scale (0-3=very weak, 4-5=partial, 6-7=competent, 8-9=strong, 10=exceptional):
- overall: holistic quality
- methodology: PTES adherence and phase execution
- technicalClarity: precision and accuracy of technical details
- professionalism: report tone and structure
- completeness: coverage of required sections

Also identify:
- strengths (3-5 points): what was done well
- weaknesses (3-5 points): what weakened the performance
- missing (2-4 points): what critical elements were absent
- splitFindings (0-3 points): what should be separate findings if merged
- fastestImprovements (3 points): highest-impact changes for next attempt

Respond ONLY with valid JSON. NO explanation text. ONLY JSON.

{
  "overall": 7,
  "methodology": 6,
  "technicalClarity": 8,
  "professionalism": 7,
  "completeness": 5,
  "strengths": ["point1", "point2", "point3"],
  "weaknesses": ["point1", "point2"],
  "missing": ["element1", "element2"],
  "splitFindings": ["merged issue description"],
  "fastestImprovements": ["improvement1", "improvement2", "improvement3"]
}`;

  const evalResponse = await ai.chat.completions.create({
    model: 'kimi-k2-0711-preview',
    messages: [{ role: 'user', content: evaluationPrompt }],
    max_tokens: 800,
  });

  let evaluation;
  try {
    const evalContent = evalResponse.choices[0]?.message?.content || '{}';
    const jsonMatch = evalContent.match(/\{[\s\S]*\}/);
    evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      overall: 5,
      methodology: 5,
      technicalClarity: 5,
      professionalism: 5,
      completeness: 5,
      strengths: ['Completed simulation'],
      weaknesses: ['Evaluation generation failed'],
      missing: [],
      splitFindings: [],
      fastestImprovements: ['Document findings during engagement', 'Follow PTES methodology', 'Write clear attack narrative'],
    };
  } catch (error) {
    console.error('Evaluation parsing error:', error);
    evaluation = {
      overall: 5,
      methodology: 5,
      technicalClarity: 5,
      professionalism: 5,
      completeness: 5,
      strengths: ['Completed simulation'],
      weaknesses: ['Evaluation generation failed'],
      missing: [],
      splitFindings: [],
      fastestImprovements: ['Document findings during engagement', 'Follow PTES methodology', 'Write clear attack narrative'],
    };
  }

  // Generate AI professional report
  const commandHistory = simulation.history.slice(-15).map(h => `[${h.phase}] ${h.userCommand}`).join('\n');
  
  const professionalPrompt = `Generate a refined professional version of this penetration test report.

ORIGINAL REPORT:
${reportMarkdown}

ACTUAL EVIDENCE (ground this version in reality):
- Commands: ${simulation.history.length}
- Flags: ${simulation.discoveredInfo.flags?.join(', ') || 'None'}
- Credentials: ${simulation.discoveredInfo.credentials?.length || 0}
- Ports: ${simulation.discoveredInfo.openPorts?.join(', ') || 'None'}
- Services: ${simulation.discoveredInfo.services?.join(', ') || 'None'}
- Directories: ${simulation.discoveredInfo.directories?.join(', ') || 'None'}

COMMAND HISTORY:
${commandHistory}

Generate an improved professional report that:
- Uses actual evidence only (no invention)
- Follows PTES methodology strictly
- Splits merged findings if needed
- Uses human-sounding professional tone (not robotic AI)
- Maintains concise executive summary
- Clear attack narrative with chronology
- Specific remediation tied to actual issues

Keep same markdown structure but improve quality. Be serious and operator-grade. No fluff.`;

  const professionalResponse = await ai.chat.completions.create({
    model: 'kimi-k2-0711-preview',
    messages: [{ role: 'user', content: professionalPrompt }],
    max_tokens: 3000,
  });

  const aiProfessionalReportMarkdown = professionalResponse.choices[0]?.message?.content || reportMarkdown;

  return {
    reportMarkdown,
    aiProfessionalReportMarkdown,
    evaluation,
    generatedAt: new Date().toISOString(),
  };
}
