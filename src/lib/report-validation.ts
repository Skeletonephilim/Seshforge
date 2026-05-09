/**
 * Professional Report Validation
 */

export interface ReportValidation {
  isValid: boolean;
  hasSections: boolean;
  hasMinimumLength: boolean;
  missingSections: string[];
  characterCount: number;
}

export const REQUIRED_REPORT_SECTIONS = [
  '## Executive Summary',
  '## Scope',
  '## Methodology',
  '## Findings',
  '## Attack Narrative',
  '## Conclusion',
];

export const PT1_REPORT_TEMPLATE = `# Professional Penetration Testing Report

## Executive Summary

[Provide a high-level overview of the assessment, key findings, and business impact for non-technical stakeholders]

## Scope

- **Target:** 
- **Assessment Type:** PT1 Certification Exam
- **Duration:** 
- **Assessment Date:** ${new Date().toISOString().split('T')[0]}

## Methodology

[Describe the penetration testing methodology used: reconnaissance, enumeration, exploitation, privilege escalation, post-exploitation]

## Findings

### Finding 1: [Vulnerability Name]

**Severity:** Critical | High | Medium | Low | Informational

**CVSS Score:** [Base Score]

**Description:**
[Detailed technical description of the vulnerability]

**Impact:**
[Business and technical impact of exploiting this vulnerability]

**Proof of Concept:**
\`\`\`bash
[Commands or steps demonstrating the vulnerability]
\`\`\`

**Reproduction Steps:**
1. [Step-by-step instructions to reproduce]
2. 
3. 

**Remediation:**
[Specific actionable recommendations to fix the vulnerability]

---

### Finding 2: [Next Vulnerability]

[Repeat structure above]

## Attack Narrative

[Chronological narrative of the attack path from initial access to compromise]

## Flags Captured

- User Flag: 
- Root/Administrator Flag: 

## Evidence

[Screenshots, command outputs, or other supporting evidence]

## Conclusion

[Summary of assessment outcomes, overall security posture, and recommended next steps]

---

*Report Generated: ${new Date().toISOString()}*
*Assessment Type: PT1 Certification Exam*
`;

export const DECISION_ENGINE_REPORT_TEMPLATE = `# Professional Drill Report

## Objective

[What was the goal of this drill?]

## Reconnaissance & Enumeration

[What information was gathered? Which tools were used?]

## Exploitation

[How was initial access achieved? What vulnerabilities were exploited?]

## Privilege Escalation / Impact

[How were privileges escalated? What was the final impact?]

## Evidence

\`\`\`bash
[Key commands executed]
\`\`\`

[Flags captured, credentials found, etc.]

## Remediation

[How could the identified vulnerabilities be fixed?]

## Lessons Learned

[What did you learn from this drill? What would you do differently?]

---

*Report Generated: ${new Date().toISOString()}*
*Drill Type: Decision Engine Professional Report Mode*
`;

export function validateReport(report: string): ReportValidation {
  const trimmed = report.trim();
  
  // Check for required sections
  const missingSections = REQUIRED_REPORT_SECTIONS.filter(
    section => !trimmed.includes(section)
  );
  
  const hasSections = missingSections.length === 0;
  const hasMinimumLength = trimmed.length >= 500;
  
  return {
    isValid: hasSections && hasMinimumLength,
    hasSections,
    hasMinimumLength,
    missingSections,
    characterCount: trimmed.length,
  };
}

export function validateDecisionEngineReport(report: string): boolean {
  const trimmed = report.trim();
  const hasObjective = trimmed.includes('## Objective');
  const hasEvidence = trimmed.includes('## Evidence');
  const hasLessons = trimmed.includes('## Lessons Learned');
  const longEnough = trimmed.length >= 300;
  
  return hasObjective && hasEvidence && hasLessons && longEnough;
}
