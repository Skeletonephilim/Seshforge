import { DevvAI } from '@devvai/devv-code-backend';
import type { ExamSession } from '@/store/exam-session-store';
import type { ReportReviewFeedback } from '@/types/report-review';
import crypto from 'crypto-js';

export function generateReportHash(report: string): string {
  return crypto.SHA256(report).toString();
}

export function generateEvidenceHash(commandHistory: any[], flagsFound: number): string {
  const evidence = JSON.stringify({ commands: commandHistory.length, flags: flagsFound });
  return crypto.SHA256(evidence).toString();
}

export async function generatePostExamReview(
  userReport: string,
  examData: ExamSession
): Promise<ReportReviewFeedback> {
  
  const ai = new DevvAI();
  
  const commandSummary = examData.commandHistory.slice(0, 20).map(h => 
    `${h.command} → ${h.output.substring(0, 100)}`
  ).join('\n');
  
  const prompt = `You are a senior penetration testing operator reviewing a junior's PT1 exam report draft.

EXAM EVIDENCE:
- Target: ${examData.scenario?.targetIP || 'Unknown'}
- Duration: ${Math.floor(examData.elapsedSeconds / 60)}min
- Commands: ${examData.commandHistory.length}
- Flags: ${examData.flagsFound}
- Hints: ${examData.hintsUsed}

COMMAND SUMMARY:
${commandSummary}

USER REPORT:
${userReport}

TASK:
Evaluate this report like a senior operator correcting a junior's draft. Compare what they wrote against exam evidence. Cross-check claims.

SCORING (0-10 scale, be harsh but fair):
- Overall: How good is this report?
- Methodology: PTES/OSSTMM alignment, clear phases?
- Technical Clarity: Readable, precise, evidence-grounded?
- Professionalism: Operator-grade tone, no fluff?
- Completeness: All findings covered, nothing invented?

0-3 = very weak, 4-5 = partial, 6-7 = competent, 8-9 = strong, 10 = exceptional

FEEDBACK CATEGORIES:
1. strengths (array of strings) - what is already solid
2. weaknesses (array of strings) - what weakens the report
3. missingElements (array of strings) - what should be there but isn't
4. splitFindings (array of strings) - merged issues that need separation
5. unprofessionalPhrasing (array of strings) - vague/theatrical language to remove
6. strongerReportWouldDoDifferently (array of strings) - how a better operator writes this

7. methodologyGaps (array of strings) - missing PTES transitions, weak narrative, unclear phases
8. fastestImprovements (array of strings) - top 3 actionable fixes for next attempt

9. improvedProfessionalVersionMarkdown (string) - rewrite based on their findings, stay close to real exploit, human-sounding, concise, operator-grade, NO AI FLUFF

RULES:
- Tie every judgment to exam evidence
- Reward correct technical understanding even if writing is rough
- Penalize merged findings, weak methodology, vague impact, unprofessional phrasing
- Do NOT invent unobserved vulnerabilities
- Do NOT overpraise
- Do NOT flatten into sterile AI sludge
- Improved version must sound human and serious
- Vary sentence length naturally
- Avoid repetitive section openers
- Keep comments specific to this attack chain

OUTPUT VALID JSON ONLY:
{
  "scores": {
    "overall": 6,
    "methodology": 5,
    "technicalClarity": 7,
    "professionalism": 6,
    "completeness": 4
  },
  "strengths": ["Clear technical understanding", "Correct credential discovery"],
  "weaknesses": ["Merged multiple findings into one blob", "Vague impact statements"],
  "missingElements": ["Attack narrative chronology", "Remediation specifics"],
  "splitFindings": ["Exposed admin creds + leaked secrets + docker privesc path"],
  "unprofessionalPhrasing": ["Metaphorical language weakens tone", "Repetitive impact wording"],
  "strongerReportWouldDoDifferently": ["Split findings by CVE/issue", "State access gained not hypothetical damage"],
  "methodologyGaps": ["Recon not formalized", "Enumeration merged with exploitation"],
  "fastestImprovements": ["Split credential exposure into separate finding", "Add methodology transitions", "Replace vague impact with actual access"],
  "improvedProfessionalVersionMarkdown": "# Executive Summary\\n\\nPenetration testing assessment of [IP] revealed..."
}`;

  const response = await ai.chat.completions.create({
    model: 'kimi-k2-0711-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a senior penetration testing operator. Evaluate reports like you are correcting a junior pentester draft. Be direct, fair, human. Output ONLY valid JSON.'
      },
      { role: 'user', content: prompt }
    ],
    max_tokens: 3000,
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '{}';
  
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse review JSON from AI response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  };
}
