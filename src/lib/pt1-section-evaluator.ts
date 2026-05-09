/**
 * PT1 Section Evaluation Generator
 * 
 * AI-powered analysis of PT1 exam section performance:
 * - Command analysis (methodology, tool selection, efficiency)
 * - Findings evaluation (completeness, severity assessment, documentation)
 * - Methodology adherence (PTES phases, systematic approach)
 * - Flag capture tracking
 * - Report quality assessment
 * 
 * Returns comprehensive evaluation with:
 * - Score (0-100)
 * - Strengths demonstrated
 * - Weaknesses identified
 * - Missed opportunities
 * - Methodology issues
 * - Actionable improvement suggestions
 */

import { DevvAI } from '@devvai/devv-code-backend';
import type { PT1Section, SectionEvaluation, CommandEntry, ExamScenario } from '@/store/exam-session-store';

export interface SectionAnalysisData {
  sectionId: PT1Section;
  commandHistory: CommandEntry[];
  flagsFound: number;
  hintsUsed: number;
  reportDraft: string;
  duration: number; // seconds
  scenario: ExamScenario | null;
}

/**
 * PT1 Section Metadata
 */
const PT1_SECTIONS = {
  web_application: {
    name: 'Web Application Testing',
    weight: 0.40,
    expectedPhases: ['reconnaissance', 'scanning', 'enumeration', 'exploitation', 'privilege_escalation'],
    keyTools: ['nmap', 'gobuster', 'ffuf', 'burpsuite', 'nikto', 'sqlmap', 'curl', 'whatweb'],
    focusAreas: ['OWASP Top 10', 'Directory Fuzzing', 'SQLi', 'XSS', 'Authentication Bypass', 'File Upload'],
    expectedFlags: 1, // Typically 1 flag per section
  },
  network_security: {
    name: 'Network Security Testing',
    weight: 0.36,
    expectedPhases: ['reconnaissance', 'scanning', 'enumeration', 'exploitation', 'privilege_escalation', 'post_exploitation'],
    keyTools: ['nmap', 'netcat', 'ssh', 'ftp', 'telnet', 'enum4linux', 'smbclient', 'crackmapexec'],
    focusAreas: ['Service Enumeration', 'Credential Discovery', 'Lateral Movement', 'Privilege Escalation'],
    expectedFlags: 1,
  },
  active_directory: {
    name: 'Active Directory Testing',
    weight: 0.24,
    expectedPhases: ['reconnaissance', 'enumeration', 'exploitation', 'lateral_movement', 'post_exploitation'],
    keyTools: ['ldapsearch', 'bloodhound', 'crackmapexec', 'impacket', 'kerbrute', 'GetUserSPNs.py', 'secretsdump.py'],
    focusAreas: ['LDAP Enumeration', 'Kerberoasting', 'AS-REP Roasting', 'Pass-the-Hash', 'Domain Dominance'],
    expectedFlags: 1,
  },
} as const;

/**
 * Generate AI-powered evaluation for a PT1 exam section
 */
export async function generateSectionEvaluation(
  data: SectionAnalysisData
): Promise<SectionEvaluation> {
  const sectionMeta = PT1_SECTIONS[data.sectionId];
  const durationMinutes = Math.round(data.duration / 60);
  
  // Extract command patterns
  const commandList = data.commandHistory.map(c => c.command).join('\n');
  const commandCount = data.commandHistory.length;
  
  // Analyze tool usage
  const toolsUsed = extractToolsUsed(data.commandHistory);
  const phasesDetected = extractPhases(data.commandHistory);
  
  // Build evaluation prompt
  const evaluationPrompt = `You are an expert penetration testing instructor evaluating a PT1 certification exam section.

SECTION: ${sectionMeta.name} (${Math.round(sectionMeta.weight * 100)}% of total exam)

SECTION REQUIREMENTS:
- Expected Phases: ${sectionMeta.expectedPhases.join(' → ')}
- Key Tools: ${sectionMeta.keyTools.join(', ')}
- Focus Areas: ${sectionMeta.focusAreas.join(', ')}
- Expected Flags: ${sectionMeta.expectedFlags}

STUDENT PERFORMANCE:
- Duration: ${durationMinutes} minutes
- Commands Executed: ${commandCount}
- Flags Captured: ${data.flagsFound}/${sectionMeta.expectedFlags}
- Hints Used: ${data.hintsUsed}
- Report Length: ${data.reportDraft.length} characters

COMMANDS EXECUTED:
${commandList.substring(0, 3000)}${commandList.length > 3000 ? '\n...(truncated)' : ''}

TOOLS DETECTED: ${toolsUsed.join(', ') || 'None identified'}
PHASES COVERED: ${phasesDetected.join(', ') || 'None clear'}

REPORT DRAFT:
${data.reportDraft.substring(0, 1000)}${data.reportDraft.length > 1000 ? '\n...(truncated)' : ''}

YOUR TASK:
Evaluate this section performance and provide a comprehensive assessment.

RESPOND IN VALID JSON FORMAT ONLY (no markdown, no code blocks):
{
  "score": <number 0-100>,
  "strengths": [<string>, <string>, ...],
  "weaknesses": [<string>, <string>, ...],
  "missedOpportunities": [<string>, <string>, ...],
  "methodologyIssues": [<string>, <string>, ...],
  "improvementSuggestions": [<string>, <string>, ...]
}

SCORING CRITERIA:
- Flags Captured: ${data.flagsFound}/${sectionMeta.expectedFlags} = ${Math.round((data.flagsFound / sectionMeta.expectedFlags) * 30)}% of 30 points
- Command Quality: Tool selection, syntax correctness, efficiency (30 points)
- Methodology: PTES phase coverage, systematic approach (20 points)
- Report Quality: Documentation, findings clarity (10 points)
- Efficiency: Hints usage penalty (-${data.hintsUsed * 2} points), time efficiency (10 points)

EVALUATION GUIDELINES:
- Be fair but rigorous (PT1 certification standard)
- Identify SPECIFIC strengths (e.g., "Strong service enumeration with nmap -sV")
- Identify SPECIFIC weaknesses (e.g., "Missed directory fuzzing with gobuster")
- List CONCRETE missed opportunities (e.g., "Should have tested SQLi on /login.php")
- Note methodology issues (e.g., "Skipped reconnaissance phase", "No systematic enumeration")
- Provide ACTIONABLE improvement suggestions (e.g., "Practice Kerberoasting with GetUserSPNs.py")

SCORING RUBRIC:
90-100: Exceptional - Professional-level execution, complete methodology, excellent documentation
80-89: Strong - Solid execution, minor gaps, good documentation
70-79: Competent - Meets PT1 standards, some weaknesses, adequate documentation
60-69: Acceptable - Baseline competence, multiple weaknesses, weak documentation
50-59: Needs Improvement - Significant gaps, poor methodology, incomplete
0-49: Insufficient - Major deficiencies, missing critical phases, no flags captured

RESPOND WITH JSON ONLY. NO MARKDOWN CODE BLOCKS. NO EXPLANATORY TEXT.`;

  try {
    const ai = new DevvAI();
    const response = await ai.chat.completions.create({
      model: 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B',
      messages: [
        {
          role: 'system',
          content: 'You are an expert PT1 exam evaluator. Respond with valid JSON only.',
        },
        {
          role: 'user',
          content: evaluationPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    // Parse AI response with robust error handling
    let evaluation: Partial<SectionEvaluation>;
    try {
      // Remove markdown code blocks if present
      const jsonContent = content.replace(/```json\s*|\s*```/g, '').trim();
      evaluation = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('[PT1SectionEvaluator] JSON parse error:', parseError);
      console.error('[PT1SectionEvaluator] AI response:', content.substring(0, 500));
      
      // Fallback evaluation
      evaluation = generateFallbackEvaluation(data, sectionMeta);
    }

    // Validate and complete evaluation
    const finalEvaluation: SectionEvaluation = {
      score: validateScore(evaluation.score || 0),
      strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
      weaknesses: Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses : [],
      missedOpportunities: Array.isArray(evaluation.missedOpportunities) ? evaluation.missedOpportunities : [],
      methodologyIssues: Array.isArray(evaluation.methodologyIssues) ? evaluation.methodologyIssues : [],
      improvementSuggestions: Array.isArray(evaluation.improvementSuggestions) ? evaluation.improvementSuggestions : [],
      generatedAt: new Date().toISOString(),
    };

    // Ensure minimum content
    if (finalEvaluation.strengths.length === 0 && data.flagsFound > 0) {
      finalEvaluation.strengths.push('Successfully captured flags');
    }
    if (finalEvaluation.weaknesses.length === 0 && data.hintsUsed > 2) {
      finalEvaluation.weaknesses.push('Relied heavily on hints (over-dependence on guidance)');
    }
    if (finalEvaluation.improvementSuggestions.length === 0) {
      finalEvaluation.improvementSuggestions.push(
        'Review PTES methodology phases',
        `Practice key tools: ${sectionMeta.keyTools.slice(0, 3).join(', ')}`
      );
    }

    console.log('[PT1SectionEvaluator] Generated evaluation:', {
      section: data.sectionId,
      score: finalEvaluation.score,
      strengthsCount: finalEvaluation.strengths.length,
      weaknessesCount: finalEvaluation.weaknesses.length,
    });

    return finalEvaluation;
  } catch (error) {
    console.error('[PT1SectionEvaluator] Evaluation error:', error);
    
    // Return fallback evaluation
    return generateFallbackEvaluation(data, sectionMeta);
  }
}

/**
 * Extract tools used from command history
 */
function extractToolsUsed(commandHistory: CommandEntry[]): string[] {
  const tools = new Set<string>();
  const toolPatterns = [
    'nmap', 'gobuster', 'ffuf', 'feroxbuster', 'dirb', 'nikto', 'sqlmap',
    'burpsuite', 'hydra', 'john', 'hashcat', 'ssh', 'ftp', 'telnet',
    'smbclient', 'enum4linux', 'crackmapexec', 'nxc', 'ldapsearch',
    'bloodhound', 'impacket', 'kerbrute', 'GetUserSPNs', 'secretsdump',
    'curl', 'wget', 'nc', 'netcat', 'whatweb', 'wpscan'
  ];

  commandHistory.forEach(entry => {
    const command = entry.command.toLowerCase();
    toolPatterns.forEach(tool => {
      if (command.includes(tool.toLowerCase())) {
        tools.add(tool);
      }
    });
  });

  return Array.from(tools);
}

/**
 * Extract pentesting phases from command outputs
 */
function extractPhases(commandHistory: CommandEntry[]): string[] {
  const phases = new Set<string>();
  const phaseKeywords = {
    reconnaissance: ['nmap', 'ping', 'host', 'whois', 'dig', 'nslookup'],
    scanning: ['nmap -p', 'nmap -sV', 'masscan', 'rustscan'],
    enumeration: ['gobuster', 'dirb', 'enum4linux', 'smbclient', 'ldapsearch', 'nikto'],
    exploitation: ['sqlmap', 'exploit', 'metasploit', 'ssh', 'login'],
    privilege_escalation: ['sudo', 'linpeas', 'find -perm', 'getcap', 'kernel'],
    lateral_movement: ['crackmapexec', 'psexec', 'pass-the', 'bloodhound'],
    post_exploitation: ['secretsdump', 'mimikatz', 'dump', 'extract'],
  };

  commandHistory.forEach(entry => {
    const command = entry.command.toLowerCase();
    Object.entries(phaseKeywords).forEach(([phase, keywords]) => {
      if (keywords.some(kw => command.includes(kw))) {
        phases.add(phase);
      }
    });
  });

  return Array.from(phases);
}

/**
 * Validate score within 0-100 range
 */
function validateScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate fallback evaluation when AI fails
 */
function generateFallbackEvaluation(
  data: SectionAnalysisData,
  sectionMeta: typeof PT1_SECTIONS[keyof typeof PT1_SECTIONS]
): SectionEvaluation {
  const flagScore = (data.flagsFound / sectionMeta.expectedFlags) * 30;
  const commandScore = Math.min(30, data.commandHistory.length * 2); // 2 points per command, max 30
  const reportScore = data.reportDraft.length > 100 ? 10 : 5;
  const hintPenalty = data.hintsUsed * 2;
  
  const baseScore = flagScore + commandScore + reportScore - hintPenalty;
  const finalScore = validateScore(baseScore);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missedOpportunities: string[] = [];
  const methodologyIssues: string[] = [];

  // Analyze performance
  if (data.flagsFound > 0) {
    strengths.push(`Captured ${data.flagsFound} flag(s) successfully`);
  } else {
    weaknesses.push('No flags captured');
    missedOpportunities.push('Complete the full attack chain to capture flags');
  }

  if (data.commandHistory.length >= 15) {
    strengths.push('Good command activity level');
  } else if (data.commandHistory.length < 10) {
    weaknesses.push('Insufficient enumeration and testing');
    methodologyIssues.push('Limited command execution suggests incomplete methodology');
  }

  if (data.hintsUsed > 3) {
    weaknesses.push('Heavy reliance on hints');
  }

  if (data.reportDraft.length < 100) {
    weaknesses.push('Incomplete or minimal report documentation');
    methodologyIssues.push('Professional pentesting requires comprehensive documentation');
  }

  const toolsUsed = extractToolsUsed(data.commandHistory);
  if (toolsUsed.length < 3) {
    missedOpportunities.push('Limited tool variety - should use more enumeration tools');
  }

  return {
    score: finalScore,
    strengths,
    weaknesses,
    missedOpportunities,
    methodologyIssues,
    improvementSuggestions: [
      'Review PTES methodology phases systematically',
      `Focus on key ${sectionMeta.name} techniques`,
      `Practice with: ${sectionMeta.keyTools.slice(0, 3).join(', ')}`,
      'Improve report documentation and findings clarity',
    ],
    generatedAt: new Date().toISOString(),
  };
}
