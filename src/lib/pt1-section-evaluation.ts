/**
 * PT1 Section-Based Evaluation System
 * Generates AI-powered evaluation for individual sections and final comprehensive assessment
 */

import { DevvAI } from '@devvai/devv-code-backend';
import type { 
  SectionEvaluation, 
  FinalExamEvaluation, 
  SectionReport, 
  PT1Section 
} from '@/store/exam-session-store';
import { parseAIJson } from './utils';

/**
 * Generate evaluation for a completed PT1 section
 */
export async function generateSectionEvaluation(
  sectionId: PT1Section,
  sectionName: string,
  reportDraft: string,
  commandHistory: any[],
  flagsFound: number,
  hintsUsed: number,
  durationSeconds: number
): Promise<SectionEvaluation> {
  const ai = new DevvAI();
  
  const commandSummary = commandHistory.slice(0, 15).map(h => 
    `${h.command} → ${h.output.substring(0, 80)}`
  ).join('\n');
  
  const prompt = `You are a PT1 certification assessor evaluating a section-specific report.

SECTION: ${sectionName}
DURATION: ${Math.floor(durationSeconds / 60)} minutes
COMMANDS EXECUTED: ${commandHistory.length}
FLAGS CAPTURED: ${flagsFound}
HINTS USED: ${hintsUsed}

COMMAND SUMMARY:
${commandSummary}

SUBMITTED REPORT:
${reportDraft}

TASK:
Evaluate this section report with PT1 certification standards. This is ONE section of a 3-part exam.

SCORING CRITERIA (0-100 scale):
- Methodology: Proper pentesting phases followed (recon → enum → exploit → privesc)
- Technical Accuracy: Correct tool usage, accurate findings, evidence-based
- Report Quality: Clear, professional, structured, actionable remediation
- Completeness: All objectives covered, nothing missed

0-39 = fail, 40-69 = needs improvement, 70-84 = competent, 85-100 = excellent

EVALUATION REQUIREMENTS:
1. score (number 0-100): Overall section score
2. strengths (array of strings): What was done well (3-5 items)
3. weaknesses (array of strings): What needs improvement (2-4 items)
4. missedOpportunities (array of strings): Unexplored attack vectors (2-3 items)
5. methodologyIssues (array of strings): PTES/OSSTMM methodology gaps (1-3 items)
6. improvementSuggestions (array of strings): Actionable next steps (3-4 items)

RULES:
- Tie every judgment to evidence (commands, findings, report content)
- Be harsh but fair - this is certification-level assessment
- Reward correct methodology even if incomplete
- Penalize missing findings, weak remediation, unprofessional language
- Do NOT invent vulnerabilities not shown in commands
- Focus on ${sectionName} specific skills

OUTPUT VALID JSON ONLY:
{
  "score": 75,
  "strengths": ["Systematic enumeration approach", "Clear attack narrative", "Accurate technical findings"],
  "weaknesses": ["Missing privilege escalation attempts", "Vague remediation recommendations"],
  "missedOpportunities": ["Port 445 SMB service not explored", "Backup directory enumeration skipped"],
  "methodologyIssues": ["Jumped to exploitation without full enumeration phase"],
  "improvementSuggestions": ["Practice comprehensive service enumeration", "Strengthen remediation specifics", "Follow PTES phase transitions"]
}`;

  const response = await ai.chat.completions.create({
    model: 'kimi-k2-0711-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a PT1 certification assessor. Evaluate section reports with professional certification standards. Output ONLY valid JSON.'
      },
      { role: 'user', content: prompt }
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = parseAIJson(content);
  
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate final comprehensive evaluation across all sections
 */
export async function generateFinalEvaluation(
  sectionReports: SectionReport[]
): Promise<FinalExamEvaluation> {
  const ai = new DevvAI();
  
  // Build section summaries
  const sectionSummaries = sectionReports.map(section => `
## ${section.sectionName}
- **Score**: ${section.evaluation?.score || 0}/100
- **Duration**: ${Math.floor(section.duration / 60)} minutes
- **Commands**: ${section.commandHistory.length}
- **Flags**: ${section.flagsFound}
- **Hints**: ${section.hintsUsed}

**Strengths**: ${section.evaluation?.strengths.join(', ') || 'N/A'}
**Weaknesses**: ${section.evaluation?.weaknesses.join(', ') || 'N/A'}
  `).join('\n\n');
  
  const prompt = `You are a PT1 certification final assessor. Review all 3 section evaluations and provide comprehensive final assessment.

SECTION EVALUATIONS:
${sectionSummaries}

TASK:
Provide final comprehensive PT1 exam evaluation. Consider:
- Performance consistency across sections
- Overall pentesting competency
- Certification readiness
- Skill gaps and strengths

WEIGHTED SCORING:
- Web Application: 40% weight
- Network Security: 36% weight  
- Active Directory: 24% weight

EVALUATION REQUIREMENTS:
1. sectionScores (object): Map each section to its score
   - web_application: ${sectionReports.find(s => s.sectionId === 'web_application')?.evaluation?.score || 0}
   - network_security: ${sectionReports.find(s => s.sectionId === 'network_security')?.evaluation?.score || 0}
   - active_directory: ${sectionReports.find(s => s.sectionId === 'active_directory')?.evaluation?.score || 0}

2. globalScore (number): Weighted average across all sections

3. overallStrengths (array of strings): Top 5 demonstrated strengths across exam

4. overallWeaknesses (array of strings): Top 5 skill gaps across exam

5. actionableFeedback (array of strings): 5 specific training recommendations for improvement

6. certificationRecommendation (string): PT1 readiness assessment:
   - "confident_pass" (85%+): Ready for PT1 certification
   - "likely_pass" (70-84%): Likely to pass with minor improvements
   - "approaching_pass" (60-69%): Close but needs more practice
   - "needs_more_practice" (<60%): Significant skill gaps, not ready

OUTPUT VALID JSON ONLY:
{
  "sectionScores": {
    "web_application": 78,
    "network_security": 72,
    "active_directory": 65
  },
  "globalScore": 73,
  "overallStrengths": ["Strong enumeration methodology", "Clear technical documentation", "Systematic approach", "Good tool selection", "Evidence-based findings"],
  "overallWeaknesses": ["Privilege escalation gaps", "Incomplete service enumeration", "Weak remediation specifics", "Missing attack narrative transitions", "Limited AD attack paths explored"],
  "actionableFeedback": ["Practice sudo/SUID privilege escalation techniques", "Study PTES methodology phase transitions", "Strengthen remediation recommendations with specific fixes", "Practice Kerberoasting and AD attack chains", "Improve report professionalism and structure"],
  "certificationRecommendation": "likely_pass"
}`;

  const response = await ai.chat.completions.create({
    model: 'kimi-k2-0711-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a PT1 certification final assessor. Provide comprehensive exam evaluation. Output ONLY valid JSON.'
      },
      { role: 'user', content: prompt }
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = parseAIJson(content);
  
  return {
    ...parsed,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate section-specific report markdown
 */
export function generateSectionReportMarkdown(section: SectionReport): string {
  const markdown = `# PT1 Section Report: ${section.sectionName}

## Metadata
- **Section**: ${section.sectionName}
- **Completed**: ${new Date(section.completedAt).toLocaleString()}
- **Duration**: ${Math.floor(section.duration / 60)} minutes
- **Commands Executed**: ${section.commandHistory.length}
- **Flags Captured**: ${section.flagsFound}
- **Hints Used**: ${section.hintsUsed}

---

## Candidate Report

${section.reportDraft}

---

## Section Evaluation

### Score: ${section.evaluation?.score || 0}/100

### Strengths
${section.evaluation?.strengths.map(s => `- ${s}`).join('\n') || '- N/A'}

### Weaknesses
${section.evaluation?.weaknesses.map(w => `- ${w}`).join('\n') || '- N/A'}

### Missed Opportunities
${section.evaluation?.missedOpportunities.map(m => `- ${m}`).join('\n') || '- N/A'}

### Methodology Issues
${section.evaluation?.methodologyIssues.map(m => `- ${m}`).join('\n') || '- N/A'}

### Improvement Suggestions
${section.evaluation?.improvementSuggestions.map(i => `${i}`).join('\n') || '- N/A'}

---

## Command History

${section.commandHistory.map((cmd, i) => `
**Command ${i + 1}:**
\`\`\`bash
${cmd.command}
\`\`\`
**Output:**
\`\`\`
${cmd.output.substring(0, 300)}${cmd.output.length > 300 ? '...' : ''}
\`\`\`
**Timestamp:** ${cmd.timestamp}
`).join('\n---\n')}

---

*Generated by SeshForge PT1 Training Platform*
*Section Report - ${section.sectionName}*
`;

  return markdown;
}

/**
 * Generate final comprehensive exam report markdown
 */
export function generateFinalExamReportMarkdown(
  sectionReports: SectionReport[],
  finalEvaluation: FinalExamEvaluation
): string {
  const markdown = `# PT1 Certification Exam - Final Report

## Executive Summary

**Global Score**: ${finalEvaluation.globalScore}/100
**Certification Recommendation**: ${finalEvaluation.certificationRecommendation.replace(/_/g, ' ').toUpperCase()}

---

## Section Scores

| Section | Score | Weight | Weighted Score |
|---------|-------|--------|----------------|
| Web Application Testing | ${finalEvaluation.sectionScores.web_application}/100 | 40% | ${(finalEvaluation.sectionScores.web_application * 0.4).toFixed(1)} |
| Network Security Testing | ${finalEvaluation.sectionScores.network_security}/100 | 36% | ${(finalEvaluation.sectionScores.network_security * 0.36).toFixed(1)} |
| Active Directory Testing | ${finalEvaluation.sectionScores.active_directory}/100 | 24% | ${(finalEvaluation.sectionScores.active_directory * 0.24).toFixed(1)} |
| **Global Score** | **${finalEvaluation.globalScore}/100** | **100%** | **${finalEvaluation.globalScore}** |

---

## Overall Strengths

${finalEvaluation.overallStrengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}

---

## Overall Weaknesses

${finalEvaluation.overallWeaknesses.map((w, i) => `${i + 1}. ${w}`).join('\n')}

---

## Actionable Feedback

### What to Improve Next

${finalEvaluation.actionableFeedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}

---

## Section Reports

${sectionReports.map(section => `
### ${section.sectionName}

**Score**: ${section.evaluation?.score || 0}/100
**Duration**: ${Math.floor(section.duration / 60)} minutes
**Commands**: ${section.commandHistory.length}
**Flags**: ${section.flagsFound}

**Strengths**: ${section.evaluation?.strengths.join(', ') || 'N/A'}

**Weaknesses**: ${section.evaluation?.weaknesses.join(', ') || 'N/A'}

[Full section report available in separate document]
`).join('\n---\n')}

---

## Certification Readiness Interpretation

${getCertificationInterpretation(finalEvaluation.certificationRecommendation, finalEvaluation.globalScore)}

---

*Generated by SeshForge PT1 Training Platform*
*Final Exam Report - ${new Date().toLocaleString()}*
`;

  return markdown;
}

function getCertificationInterpretation(recommendation: string, score: number): string {
  const interpretations: Record<string, string> = {
    confident_pass: `**Excellent Performance (${score}%)**\n\nYou have demonstrated strong pentesting competency across all three PT1 domains. Your methodology is sound, technical skills are solid, and reporting quality meets certification standards. You are ready to schedule your PT1 certification exam with confidence.`,
    likely_pass: `**Competent Performance (${score}%)**\n\nYou have demonstrated competent pentesting skills with room for minor improvements. Your overall performance indicates you would likely pass the PT1 exam, but addressing the identified weaknesses will strengthen your success probability. Consider focused practice on weak areas before scheduling.`,
    approaching_pass: `**Approaching Competency (${score}%)**\n\nYou have shown foundational pentesting skills but significant skill gaps remain. While you understand the basics, more practice is needed across all domains before attempting certification. Focus on the actionable feedback and aim for 70%+ scores consistently before scheduling your exam.`,
    needs_more_practice: `**Foundational Skills Present (${score}%)**\n\nYou have demonstrated basic pentesting awareness but are not yet ready for PT1 certification. Significant practice is needed across multiple domains. Focus on systematic methodology, tool mastery, and professional reporting. Aim to complete 10-15 additional practice exams before reattempting.`,
  };
  
  return interpretations[recommendation] || interpretations.needs_more_practice;
}
