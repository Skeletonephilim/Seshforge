/**
 * Professional Penetration Testing Report Parser
 * Supports flexible parsing of various professional markdown report formats
 * Unlike training reports, professional reports may use different section names
 * and structure - this parser adapts to them.
 */

import { CertificationDomain, TechnicalSkill } from '@/store/certification-store';
import { DrillReportData } from '@/lib/drill-report-markdown';

/**
 * Professional report metadata for import
 */
export interface ProfessionalReportMetadata {
  title: string;
  date: string;
  customDate?: string; // User-provided manual date
  reportType: 'training' | 'professional' | 'external' | 'custom' | 'partial';
  domain?: 'web' | 'network' | 'ad' | 'mixed' | 'internal' | 'linux' | 'windows';
  tags?: string[];
}

/**
 * Common professional report section headers (case-insensitive patterns)
 */
const PROFESSIONAL_SECTIONS = {
  // Executive Summary variants
  executiveSummary: [
    /##\s*executive\s+summary/i,
    /##\s*summary/i,
    /##\s*overview/i,
  ],
  
  // Scope variants
  scope: [
    /##\s*scope/i,
    /##\s*engagement\s+scope/i,
    /##\s*test\s+scope/i,
    /##\s*target\s+environment/i,
  ],
  
  // Methodology variants
  methodology: [
    /##\s*methodology/i,
    /##\s*approach/i,
    /##\s*testing\s+methodology/i,
    /##\s*attack\s+methodology/i,
  ],
  
  // Findings variants
  findings: [
    /##\s*findings/i,
    /##\s*vulnerabilities/i,
    /##\s*security\s+issues/i,
    /##\s*discovered\s+vulnerabilities/i,
    /##\s*technical\s+findings/i,
  ],
  
  // Attack path/narrative variants
  attackPath: [
    /##\s*attack\s+path/i,
    /##\s*attack\s+narrative/i,
    /##\s*exploitation\s+path/i,
    /##\s*compromise\s+chain/i,
    /##\s*command\s+history/i,
  ],
  
  // Evidence/proof variants
  evidence: [
    /##\s*evidence/i,
    /##\s*proof\s+of\s+concept/i,
    /##\s*poc/i,
    /##\s*screenshots/i,
    /##\s*artifacts/i,
  ],
  
  // Flags/objectives variants
  flags: [
    /##\s*flags\s+captured/i,
    /##\s*objectives\s+achieved/i,
    /##\s*goals\s+met/i,
    /##\s*compromised\s+accounts/i,
  ],
  
  // Conclusion/recommendations variants
  conclusion: [
    /##\s*conclusion/i,
    /##\s*recommendations/i,
    /##\s*remediation/i,
    /##\s*next\s+steps/i,
    /##\s*action\s+items/i,
  ],
};

/**
 * Extract section content using flexible pattern matching
 */
function extractSection(markdown: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = markdown.match(new RegExp(
      pattern.source + '\\s*\\n\\s*\\n(.+?)(?=\\n\\n##|$)',
      'is'
    ));
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extract flags/objectives from various formats
 */
function extractFlags(markdown: string): string[] {
  const flags: string[] = [];
  
  // Pattern 1: THM{...}, HTB{...}, FLAG{...}, CTF{...}
  const flagPatterns = [
    /THM\{[^}]+\}/g,
    /HTB\{[^}]+\}/g,
    /FLAG\{[^}]+\}/g,
    /CTF\{[^}]+\}/g,
    /OSCP\{[^}]+\}/g,
  ];
  
  flagPatterns.forEach(pattern => {
    const matches = markdown.match(pattern);
    if (matches) flags.push(...matches);
  });
  
  // Pattern 2: user.txt / root.txt content
  const fileFlags = markdown.match(/(?:user\.txt|root\.txt).*?(?:\n|:)\s*([a-f0-9]{32}|[a-zA-Z0-9]{20,})/gi);
  if (fileFlags) {
    fileFlags.forEach(match => {
      const hash = match.match(/([a-f0-9]{32}|[a-zA-Z0-9]{20,})/);
      if (hash) flags.push(hash[1]);
    });
  }
  
  // Pattern 3: "Captured user flag: ..." or "Obtained root access"
  const narrativeFlags = markdown.match(/(?:captured|obtained|found|got).*?(?:user|root|admin).*?(?:flag|access|shell)/gi);
  if (narrativeFlags) {
    // Count these as achievements even if no hash
    narrativeFlags.forEach((f, i) => flags.push(`Achievement ${i + 1}: ${f.substring(0, 50)}`));
  }
  
  return [...new Set(flags)]; // Deduplicate
}

/**
 * Extract discovered services/ports from narrative
 */
function extractDiscoveries(markdown: string) {
  const discoveries = {
    ports: [] as string[],
    services: [] as string[],
    directories: [] as string[],
    credentials: [] as string[],
  };
  
  // Extract port numbers (common formats: "port 22", "22/tcp", ":80")
  const portMatches = markdown.match(/\b(?:port\s+)?(\d+)(?:\/(?:tcp|udp))?\b/gi);
  if (portMatches) {
    portMatches.forEach(match => {
      const port = match.match(/\d+/);
      if (port && parseInt(port[0]) <= 65535) {
        discoveries.ports.push(port[0]);
      }
    });
  }
  
  // Extract service names (common: SSH, HTTP, MySQL, SMB, LDAP, etc.)
  const serviceKeywords = /\b(SSH|HTTP|HTTPS|FTP|SMB|LDAP|MySQL|PostgreSQL|MSSQL|RDP|WinRM|Kerberos|DNS|SMTP|POP3|IMAP|Telnet|VNC|Apache|Nginx|IIS|Tomcat)\b/gi;
  const serviceMatches = markdown.match(serviceKeywords);
  if (serviceMatches) {
    discoveries.services = [...new Set(serviceMatches.map(s => s.toUpperCase()))];
  }
  
  // Extract directory paths (/admin, /backup, /api, etc.)
  const dirMatches = markdown.match(/\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]*)*(?=\s|,|\.|$)/g);
  if (dirMatches) {
    discoveries.directories = [...new Set(dirMatches.filter(d => 
      !d.includes('.') && // Exclude file paths
      d.length < 50 && // Reasonable directory length
      d.match(/^\/[a-z]/i) // Must start with /letter
    ))];
  }
  
  // Extract credentials (username:password or "found credentials")
  const credMatches = markdown.match(/\b([a-zA-Z0-9_-]+)\s*:\s*([a-zA-Z0-9!@#$%^&*()_+-=]{4,})\b/g);
  if (credMatches) {
    discoveries.credentials = [...new Set(credMatches)];
  }
  
  // Also look for narrative credential mentions
  const credNarrative = markdown.match(/(?:found|discovered|obtained|cracked).*?(?:credentials|password|username|account)/gi);
  if (credNarrative && !discoveries.credentials.length) {
    discoveries.credentials.push(`Found credentials (see report)`);
  }
  
  return {
    openPorts: [...new Set(discoveries.ports)],
    services: [...new Set(discoveries.services)],
    directories: [...new Set(discoveries.directories.slice(0, 20))], // Limit to 20
    credentials: [...new Set(discoveries.credentials.slice(0, 10))], // Limit to 10
    flags: extractFlags(markdown),
  };
}

/**
 * Extract commands from professional report
 */
function extractCommands(markdown: string): Array<{ command: string; phase: string; timestamp: string }> {
  const commands: Array<{ command: string; phase: string; timestamp: string }> = [];
  
  // Pattern 1: Code blocks (```bash ... ```)
  const codeBlocks = markdown.match(/```(?:bash|sh|shell|powershell|cmd)?\s*\n([\s\S]*?)```/gi);
  if (codeBlocks) {
    codeBlocks.forEach((block, idx) => {
      const cmd = block.replace(/```(?:bash|sh|shell|powershell|cmd)?\s*\n?/gi, '').replace(/```/g, '').trim();
      if (cmd && cmd.length < 500) { // Reasonable command length
        // Try to infer phase from command
        let phase = 'enumeration'; // Default
        if (/nmap|masscan|ping|dig|host/.test(cmd)) phase = 'scanning';
        if (/gobuster|ffuf|dirb|nikto|wpscan/.test(cmd)) phase = 'enumeration';
        if (/sqlmap|burp|curl.*POST|exploit/.test(cmd)) phase = 'exploitation';
        if (/sudo|suid|linpeas|winpeas|privesc/.test(cmd)) phase = 'privilege_escalation';
        if (/ssh|psexec|crackmapexec|evil-winrm/.test(cmd)) phase = 'initial_access';
        
        commands.push({
          command: cmd.split('\n')[0].substring(0, 200), // First line only, max 200 chars
          phase,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }
  
  // Pattern 2: Inline commands (`command`)
  const inlineCommands = markdown.match(/`([^`]{10,200})`/g);
  if (inlineCommands && commands.length < 5) {
    inlineCommands.slice(0, 20).forEach(cmd => {
      const cleaned = cmd.replace(/`/g, '').trim();
      if (cleaned.includes(' ') || cleaned.includes('/')) { // Likely a command
        commands.push({
          command: cleaned,
          phase: 'enumeration',
          timestamp: new Date().toISOString(),
        });
      }
    });
  }
  
  return commands.slice(0, 50); // Limit to 50 commands
}

/**
 * Infer domains practiced from report content
 */
function inferDomains(markdown: string): CertificationDomain[] {
  const content = markdown.toLowerCase();
  const domains: CertificationDomain[] = [];
  
  if (/nmap|scan|recon|discover|enumerat/i.test(content)) {
    domains.push('reconnaissance');
    domains.push('enumeration');
  }
  
  if (/web|http|sql|xss|csrf|burp|owasp/.test(content)) {
    domains.push('web_exploitation');
  }
  
  if (/privilege|privesc|sudo|suid|escalat/.test(content)) {
    domains.push('privilege_escalation');
  }
  
  if (/kerberos|ldap|active directory|smb|winrm|lateral/.test(content)) {
    domains.push('lateral_movement');
  }
  
  if (/password|brute|hydra|crack|hashcat|credential/.test(content)) {
    domains.push('password_attacks');
  }
  
  if (/ssh|smb|rdp|network|service/.test(content)) {
    domains.push('network_exploitation');
  }
  
  if (/pivot|post-exploit|persistence|exfil/.test(content)) {
    domains.push('post_exploitation');
  }
  
  return [...new Set(domains)];
}

/**
 * Parse professional penetration testing report
 * Returns DrillReportData compatible format for import
 */
export function parseProfessionalReport(
  markdown: string,
  metadata?: ProfessionalReportMetadata
): DrillReportData | null {
  try {
    console.log('[PROFESSIONAL PARSER] Starting parse of', markdown.length, 'characters');
    
    // Validate minimum content
    if (!markdown || markdown.length < 100) {
      throw new Error('Report too short - minimum 100 characters required');
    }
    
    // Extract professional sections
    const executiveSummary = extractSection(markdown, PROFESSIONAL_SECTIONS.executiveSummary);
    const scope = extractSection(markdown, PROFESSIONAL_SECTIONS.scope);
    const methodology = extractSection(markdown, PROFESSIONAL_SECTIONS.methodology);
    const findings = extractSection(markdown, PROFESSIONAL_SECTIONS.findings);
    const attackPath = extractSection(markdown, PROFESSIONAL_SECTIONS.attackPath);
    const evidence = extractSection(markdown, PROFESSIONAL_SECTIONS.evidence);
    const conclusion = extractSection(markdown, PROFESSIONAL_SECTIONS.conclusion);
    
    // Extract discoveries
    const discoveries = extractDiscoveries(markdown);
    
    // Extract commands
    const commands = extractCommands(markdown);
    
    // Infer domains
    const domainsPracticed = inferDomains(markdown);
    
    // Build title from available info
    const title = metadata?.title || 
                  markdown.match(/^#\s+(.+?)$/m)?.[1] ||
                  `Professional Report - ${new Date().toLocaleDateString()}`;
    
    // Calculate a basic score based on content richness
    const contentScore = Math.min(100, 
      (discoveries.flags.length * 15) +
      (discoveries.credentials.length * 10) +
      (discoveries.openPorts.length * 3) +
      (commands.length * 2) +
      (methodology ? 15 : 0) +
      (findings ? 15 : 0) +
      (evidence ? 10 : 0)
    );
    
    const result: DrillReportData = {
      title,
      targetIP: scope?.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)?.[0] || 'Not specified',
      date: metadata?.customDate || metadata?.date || new Date().toISOString(),
      timeSpent: 'Not recorded',
      timeSpentSeconds: 0,
      difficulty: 'intermediate', // Default for professional reports
      drillType: (metadata?.domain === 'network' ? 'mixed' : metadata?.domain) || 'mixed',
      
      scenario: executiveSummary || scope || 'Professional penetration testing engagement',
      objectives: findings?.split('\n').filter(l => l.trim()).slice(0, 5) || [],
      
      discoveredInfo: discoveries,
      
      commands,
      
      performance: {
        reconScore: discoveries.openPorts.length > 0 ? 80 : 40,
        scanningScore: discoveries.services.length > 0 ? 80 : 40,
        enumerationScore: discoveries.directories.length > 0 ? 85 : 45,
        exploitationScore: discoveries.credentials.length > 0 ? 85 : 45,
        privescScore: discoveries.flags.length > 0 ? 90 : 40,
        methodologyScore: commands.length > 5 ? 80 : 50,
        overallScore: contentScore,
        timeEfficiency: 'Not tracked',
      },
      
      strengthsDemonstrated: [
        executiveSummary ? 'Comprehensive executive summary provided' : null,
        methodology ? 'Clear methodology documented' : null,
        findings ? 'Detailed findings documented' : null,
        discoveries.flags.length > 0 ? `Captured ${discoveries.flags.length} flag(s)` : null,
        discoveries.credentials.length > 0 ? 'Credential discovery' : null,
        commands.length > 10 ? 'Thorough command documentation' : null,
      ].filter(Boolean) as string[],
      
      focusAreas: [
        !methodology ? 'Document methodology more clearly' : null,
        !evidence ? 'Include proof of concept evidence' : null,
        commands.length < 5 ? 'Document commands executed' : null,
        discoveries.flags.length === 0 ? 'Practice flag capture' : null,
      ].filter(Boolean) as string[],
      
      feedback: conclusion || 'Professional penetration testing report imported',
      
      certificationReadiness: {
        pt1: {
          weighted_score: Math.min(85, contentScore),
          pass_threshold: 70,
          status: contentScore >= 70 ? 'likely_pass' : 'approaching_readiness',
        },
      },
      
      hintsUsed: 0,
      mistakesIdentified: [],
      domainsPracticed,
      technicalSkillsUsed: [], // Will be inferred during import
    };
    
    console.log('[PROFESSIONAL PARSER] Successfully parsed:', {
      title,
      sections: {
        executiveSummary: !!executiveSummary,
        scope: !!scope,
        methodology: !!methodology,
        findings: !!findings,
        attackPath: !!attackPath,
        evidence: !!evidence,
        conclusion: !!conclusion,
      },
      discoveries: {
        ports: discoveries.openPorts.length,
        services: discoveries.services.length,
        directories: discoveries.directories.length,
        credentials: discoveries.credentials.length,
        flags: discoveries.flags.length,
      },
      commands: commands.length,
      domains: domainsPracticed.length,
      contentScore,
    });
    
    return result;
  } catch (error) {
    console.error('[PROFESSIONAL PARSER] Failed:', error);
    return null;
  }
}
