/**
 * Finding Coach - Evidence-based vulnerability report mentorship
 * Generates structured professional findings when vulnerabilities are confirmed
 */

import type { FindingCoachItem } from '@/store/decision-engine-store';
import { DevvAI } from '@devvai/devv-code-backend';

export interface EvidenceEvent {
  type: 'credential_reuse' | 'auth_bypass' | 'data_exposure' | 'shell_obtained' | 'privesc_confirmed' | 'flag_captured';
  command: string;
  output: string;
  timestamp: string;
  phase: string;
  discoveredData?: {
    credentials?: string[];
    directories?: string[];
    flags?: string[];
    shellType?: string;
    privescMethod?: string;
  };
}

/**
 * Detect if an event represents a confirmed vulnerability (not just recon)
 */
export function isConfirmedFinding(event: EvidenceEvent): boolean {
  const { type, output, command } = event;
  
  // Exclude reconnaissance-only signals
  if (type === 'flag_captured' && !output.toLowerCase().includes('root') && !output.toLowerCase().includes('user')) {
    return false;
  }
  
  // Check for confirmed vulnerability indicators
  const confirmedIndicators = [
    output.toLowerCase().includes('shell'),
    output.toLowerCase().includes('root@'),
    output.toLowerCase().includes('uid=0'),
    output.toLowerCase().includes('authentication successful'),
    output.toLowerCase().includes('logged in'),
    command.toLowerCase().includes('nc -e') || command.toLowerCase().includes('bash -i'),
    event.discoveredData?.shellType !== undefined,
    event.discoveredData?.privescMethod !== undefined,
  ];
  
  return confirmedIndicators.some(indicator => indicator);
}

/**
 * Generate evidence hash for deduplication
 */
export function generateEvidenceHash(event: EvidenceEvent): string {
  const key = `${event.type}-${event.command.substring(0, 50)}-${event.timestamp.substring(0, 10)}`;
  return btoa(key).substring(0, 12);
}

/**
 * Generate a professional finding using AI mentorship
 */
export async function generateFinding(
  event: EvidenceEvent,
  targetIP: string,
  commandHistory: Array<{ userCommand: string; systemResponse: string }>
): Promise<Omit<FindingCoachItem, 'id' | 'index' | 'createdAt'>> {
  const ai = new DevvAI();

  // Build context from recent commands
  const recentCommands = commandHistory.slice(-5).map(h => `$ ${h.userCommand}\n${h.systemResponse.substring(0, 300)}`).join('\n\n');

  const prompt = `You are a senior penetration tester mentoring a junior on writing professional vulnerability findings.

**Target:** ${targetIP}
**Vulnerability Type:** ${event.type.replace(/_/g, ' ')}
**Command:** ${event.command}
**Output:** ${event.output.substring(0, 500)}

**Recent Context:**
${recentCommands}

Generate a concise, professional vulnerability finding report in this EXACT structure:

### [Short Vulnerability Name]

**Severity:** [Critical|High|Medium|Low]

**CVSS (estimated):** [numeric score 0-10]

**Description:** 
[2-3 sentences explaining what the vulnerability is, technically. No fluff.]

**Impact:** 
[What access/control is gained. Be specific to THIS exploit. No exaggeration.]

**Proof of Concept:**
\`\`\`bash
${event.command}
\`\`\`

**Reproduction Steps:**
1. [Clear step using actual commands]
2. [Clear step]
3. [Clear step]

**Remediation:**
[1-2 actionable fixes specific to this exact issue. No generic hardening advice.]

RULES:
- Use actual commands and evidence from the session
- One vulnerability = one finding (do not merge unrelated issues)
- CVSS is estimated, not exact (use realistic ranges)
- No AI-sounding filler, no metaphors, no purple prose
- Sound like a competent human pentester, not a robot
- Keep it under 400 words total`;

  try {
    const response = await ai.chat.completions.create({
      model: 'kimi-k2-0711-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a senior penetration tester. Generate concise, professional vulnerability findings. No fluff, no AI corporate speak.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const markdown = response.choices[0]?.message?.content || '';
    
    // Extract severity and CVSS from generated markdown
    const severityMatch = markdown.match(/\*\*Severity:\*\*\s*(Critical|High|Medium|Low|Informational)/i);
    const cvssMatch = markdown.match(/\*\*CVSS.*?:\*\*\s*(\d+\.?\d*)/i);
    
    const severity = (severityMatch?.[1] as FindingCoachItem['severity']) || 'Medium';
    const cvssEstimate = parseFloat(cvssMatch?.[1] || '5.0');
    
    // Extract title from first heading
    const titleMatch = markdown.match(/###\s*(.+)/);
    const title = titleMatch?.[1]?.trim() || `${event.type.replace(/_/g, ' ')} Vulnerability`;

    return {
      title,
      severity,
      cvssEstimate,
      markdown,
      sourceEvidenceIds: [generateEvidenceHash(event)],
    };
  } catch (error) {
    console.error('[FindingCoach] Failed to generate finding:', error);
    throw error;
  }
}

/**
 * Analyze command output to detect vulnerability confirmation events
 */
export function detectVulnerabilityEvent(
  command: string,
  output: string,
  phase: string,
  discoveredInfo: any
): EvidenceEvent | null {
  const cmdLower = command.toLowerCase();
  const outLower = output.toLowerCase();
  
  // Credential reuse success
  if ((cmdLower.includes('ssh') || cmdLower.includes('mysql') || cmdLower.includes('ftp')) &&
      (outLower.includes('logged in') || outLower.includes('authentication successful') || outLower.includes('welcome'))) {
    return {
      type: 'credential_reuse',
      command,
      output,
      timestamp: new Date().toISOString(),
      phase,
      discoveredData: { credentials: discoveredInfo.credentials },
    };
  }
  
  // Shell obtained
  if (outLower.includes('shell') || outLower.includes('$ ') || outLower.includes('root@') || 
      cmdLower.includes('nc -e') || cmdLower.includes('bash -i')) {
    return {
      type: 'shell_obtained',
      command,
      output,
      timestamp: new Date().toISOString(),
      phase,
      discoveredData: { shellType: outLower.includes('root@') ? 'root' : 'user' },
    };
  }
  
  // Privilege escalation confirmed
  if ((outLower.includes('uid=0') || outLower.includes('root@')) && phase === 'privilege_escalation') {
    return {
      type: 'privesc_confirmed',
      command,
      output,
      timestamp: new Date().toISOString(),
      phase,
      discoveredData: { privescMethod: cmdLower.includes('sudo') ? 'sudo' : 'unknown' },
    };
  }
  
  // Data exposure with clear impact
  if ((cmdLower.includes('cat') || cmdLower.includes('wget') || cmdLower.includes('curl')) &&
      (outLower.includes('password') || outLower.includes('secret') || outLower.includes('api_key') || 
       outLower.includes('database') || outLower.includes('config'))) {
    return {
      type: 'data_exposure',
      command,
      output,
      timestamp: new Date().toISOString(),
      phase,
      discoveredData: { directories: discoveredInfo.directories },
    };
  }
  
  // Flag captured (only if tied to exploit path)
  if (discoveredInfo.flags && discoveredInfo.flags.length > 0 && phase !== 'reconnaissance') {
    return {
      type: 'flag_captured',
      command,
      output,
      timestamp: new Date().toISOString(),
      phase,
      discoveredData: { flags: discoveredInfo.flags },
    };
  }
  
  return null;
}
