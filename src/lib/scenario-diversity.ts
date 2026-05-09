/**
 * Scenario Diversity System for Decision Engine
 * Prevents repetitive web-only boxes and ensures PT1-aligned attack surface variety
 */

export type ScenarioType = 'web' | 'ad' | 'smb' | 'mixed' | 'internal' | 'linux' | 'windows';
export type AttackVector = 'web_vuln' | 'smb_enum' | 'ad_kerb' | 'cred_reuse' | 'misconfig' | 'service_exploit';
export type PrivescMethod = 'suid' | 'sudo' | 'kernel' | 'token_abuse' | 'weak_service' | 'registry' | 'ad_misconfig' | 'cronjob' | 'capability' | 'path_abuse';

export interface ScenarioTemplate {
  type: ScenarioType;
  entryPoints: AttackVector[];
  services: { port: number; service: string; version?: string }[];
  privescMethod: PrivescMethod;
  flags: { user: string; root: string };
  contextDescription: string;
  objectives: string[];
  domainInfo?: {
    domainName: string;
    dcIP: string;
    users: string[];
    spnAccounts?: string[];
  };
}

interface ScenarioHistory {
  lastScenarioType: string;
  lastAttackPath: string[];
  lastPrivescMethod: string;
  usedTargetIPs: string[];
  timestamp: string;
}

/**
 * Generate scenario for a SPECIFIC domain (bypasses diversity logic)
 * Used when user explicitly selects domain (Web/Network/AD)
 */
export function generateScenarioForDomain(
  domain: ScenarioType,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  history: ScenarioHistory[]
): ScenarioTemplate {
  const usedIPs = history.flatMap(h => h.usedTargetIPs || []);
  const recentPrivesc = history.slice(-3).map(h => h.lastPrivescMethod);
  const targetIP = generateUniqueIP(usedIPs);
  
  return buildScenarioTemplate(domain, difficulty, targetIP, recentPrivesc);
}

/**
 * Generate diverse scenario based on history to prevent repetition
 */
export function generateDiverseScenario(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  history: ScenarioHistory[]
): ScenarioTemplate {
  const lastScenario = history[history.length - 1];
  const usedIPs = history.flatMap(h => h.usedTargetIPs || []);
  
  // CRITICAL: If last scenario was web-only, prioritize AD/SMB/Internal
  const shouldAvoidWeb = lastScenario?.lastScenarioType === 'web';
  const recentTypes = history.slice(-3).map(h => h.lastScenarioType);
  const recentPrivesc = history.slice(-3).map(h => h.lastPrivescMethod);
  
  // Scenario type selection with anti-repetition
  const scenarioTypes: ScenarioType[] = shouldAvoidWeb
    ? ['ad', 'smb', 'mixed', 'internal', 'windows'] // Force variety after web
    : ['web', 'ad', 'smb', 'mixed', 'internal', 'linux', 'windows'];
  
  // Filter out recently used types
  const availableTypes = scenarioTypes.filter(t => !recentTypes.includes(t));
  const selectedType = availableTypes.length > 0 
    ? availableTypes[Math.floor(Math.random() * availableTypes.length)]
    : scenarioTypes[Math.floor(Math.random() * scenarioTypes.length)];
  
  // Generate unique target IP
  const targetIP = generateUniqueIP(usedIPs);
  
  // Select scenario template based on type and difficulty
  return buildScenarioTemplate(selectedType, difficulty, targetIP, recentPrivesc);
}

/**
 * Build specific scenario template based on type
 */
function buildScenarioTemplate(
  type: ScenarioType,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  targetIP: string,
  recentPrivesc: string[]
): ScenarioTemplate {
  switch (type) {
    case 'ad':
      return buildADScenario(difficulty, targetIP, recentPrivesc);
    case 'smb':
      return buildSMBScenario(difficulty, targetIP, recentPrivesc);
    case 'mixed':
      return buildMixedScenario(difficulty, targetIP, recentPrivesc);
    case 'internal':
      return buildInternalScenario(difficulty, targetIP, recentPrivesc);
    case 'linux':
      return buildLinuxScenario(difficulty, targetIP, recentPrivesc);
    case 'windows':
      return buildWindowsScenario(difficulty, targetIP, recentPrivesc);
    case 'web':
    default:
      return buildWebScenario(difficulty, targetIP, recentPrivesc);
  }
}

/**
 * Active Directory scenario with Kerberos/LDAP/SMB
 */
function buildADScenario(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  targetIP: string,
  recentPrivesc: string[]
): ScenarioTemplate {
  const domainNames = ['corp.local', 'internal.local', 'company.local', 'enterprise.local'];
  const domainName = domainNames[Math.floor(Math.random() * domainNames.length)];
  
  const dcIP = targetIP.replace(/\d+$/, (match) => String((parseInt(match) + 1) % 256));
  
  const baseServices = [
    { port: 88, service: 'Kerberos', version: '5.0' },
    { port: 389, service: 'LDAP', version: '3' },
    { port: 445, service: 'SMB', version: '3.1.1' },
    { port: 135, service: 'RPC', version: 'Microsoft RPC' },
  ];
  
  if (difficulty !== 'beginner') {
    baseServices.push({ port: 5985, service: 'WinRM', version: 'Microsoft WinRM' });
  }
  
  if (difficulty === 'advanced') {
    baseServices.push({ port: 3389, service: 'RDP', version: 'Microsoft Terminal Services' });
  }
  
  // Select privesc method avoiding recent ones
  const privescMethods: PrivescMethod[] = ['token_abuse', 'weak_service', 'registry', 'ad_misconfig'];
  const availablePrivesc = privescMethods.filter(p => !recentPrivesc.includes(p));
  const privescMethod = availablePrivesc.length > 0
    ? availablePrivesc[Math.floor(Math.random() * availablePrivesc.length)]
    : privescMethods[Math.floor(Math.random() * privescMethods.length)];
  
  return {
    type: 'ad',
    entryPoints: ['ad_kerb', 'smb_enum'],
    services: baseServices,
    privescMethod,
    flags: {
      user: `THM{k3rb3r0s_us3r_${Math.random().toString(36).substr(2, 8)}}`,
      root: `THM{d0m41n_4dm1n_${Math.random().toString(36).substr(2, 8)}}`,
    },
    contextDescription: `Active Directory penetration test on ${domainName}. Black-box testing authorized. Client wants assessment of Kerberos security, user enumeration, and domain privilege escalation paths. Rules: No DoS, no data destruction.`,
    objectives: [
      'Enumerate domain users via LDAP',
      'Identify service accounts with SPNs',
      'Perform Kerberoasting attack',
      'Crack service account password',
      'Escalate to Domain Admin privileges',
      'Capture user and DA flags',
    ],
    domainInfo: {
      domainName,
      dcIP,
      users: ['administrator', 'sqlservice', 'backupuser', 'webadmin', 'helpdesk'],
      spnAccounts: ['sqlservice', 'webadmin'],
    },
  };
}

/**
 * SMB-focused scenario with file share enumeration
 */
function buildSMBScenario(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  targetIP: string,
  recentPrivesc: string[]
): ScenarioTemplate {
  const services = [
    { port: 445, service: 'SMB', version: '3.0' },
    { port: 139, service: 'NetBIOS', version: 'Samba smbd 4.7.6' },
    { port: 22, service: 'SSH', version: 'OpenSSH 7.6p1' },
  ];
  
  if (difficulty !== 'beginner') {
    services.push({ port: 3306, service: 'MySQL', version: '5.7.33' });
  }
  
  const privescMethods: PrivescMethod[] = ['suid', 'cronjob', 'capability'];
  const availablePrivesc = privescMethods.filter(p => !recentPrivesc.includes(p));
  const privescMethod = availablePrivesc.length > 0
    ? availablePrivesc[0]
    : privescMethods[0];
  
  return {
    type: 'smb',
    entryPoints: ['smb_enum', 'cred_reuse'],
    services,
    privescMethod,
    flags: {
      user: `THM{smb_sh4r3_us3r_${Math.random().toString(36).substr(2, 8)}}`,
      root: `THM{n3tw0rk_r00t_${Math.random().toString(36).substr(2, 8)}}`,
    },
    contextDescription: `Internal network file server assessment. Client suspects weak SMB share permissions and credential reuse. Authorized to test all SMB shares and attempt lateral movement. Rules: No DoS on production services.`,
    objectives: [
      'Enumerate SMB shares anonymously',
      'Identify readable/writable shares',
      'Discover credentials in file shares',
      'Test credential reuse across services',
      'Gain initial shell access',
      'Escalate to root privileges',
    ],
  };
}

/**
 * Mixed environment with multiple attack vectors
 */
function buildMixedScenario(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  targetIP: string,
  recentPrivesc: string[]
): ScenarioTemplate {
  const services = [
    { port: 80, service: 'HTTP', version: 'Apache 2.4.41' },
    { port: 445, service: 'SMB', version: '3.0' },
    { port: 22, service: 'SSH', version: 'OpenSSH 8.2p1' },
    { port: 3389, service: 'RDP', version: 'Microsoft Terminal Services' },
  ];
  
  if (difficulty === 'intermediate' || difficulty === 'advanced') {
    services.push({ port: 1433, service: 'MSSQL', version: 'Microsoft SQL Server 2019' });
  }
  
  if (difficulty === 'advanced') {
    services.push({ port: 5985, service: 'WinRM', version: 'Microsoft WinRM' });
  }
  
  const privescMethods: PrivescMethod[] = ['weak_service', 'token_abuse', 'registry'];
  const availablePrivesc = privescMethods.filter(p => !recentPrivesc.includes(p));
  const privescMethod = availablePrivesc.length > 0
    ? availablePrivesc[0]
    : privescMethods[0];
  
  return {
    type: 'mixed',
    entryPoints: ['web_vuln', 'smb_enum', 'service_exploit'],
    services,
    privescMethod,
    flags: {
      user: `THM{m1x3d_us3r_${Math.random().toString(36).substr(2, 8)}}`,
      root: `THM{c0mb1n3d_r00t_${Math.random().toString(36).substr(2, 8)}}`,
    },
    contextDescription: `Hybrid Windows/Linux infrastructure assessment. Target is a dual-boot server running both web services and internal file sharing. Client wants full security evaluation including web vulnerabilities and network service exploitation. Rules: No DoS, document all findings.`,
    objectives: [
      'Identify all exposed services',
      'Test web application for vulnerabilities',
      'Enumerate SMB shares and network resources',
      'Find credential reuse opportunities',
      'Establish initial foothold',
      'Pivot and escalate privileges',
    ],
  };
}

/**
 * Internal services scenario (RPC, WinRM, MSSQL, etc.)
 */
function buildInternalScenario(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  targetIP: string,
  recentPrivesc: string[]
): ScenarioTemplate {
  const services = [
    { port: 135, service: 'RPC', version: 'Microsoft RPC' },
    { port: 5985, service: 'WinRM', version: 'Microsoft WinRM' },
    { port: 1433, service: 'MSSQL', version: 'Microsoft SQL Server 2019' },
    { port: 445, service: 'SMB', version: '3.1.1' },
  ];
  
  if (difficulty !== 'beginner') {
    services.push({ port: 389, service: 'LDAP', version: '3' });
  }
  
  const privescMethods: PrivescMethod[] = ['token_abuse', 'weak_service', 'registry'];
  const availablePrivesc = privescMethods.filter(p => !recentPrivesc.includes(p));
  const privescMethod = availablePrivesc.length > 0
    ? availablePrivesc[0]
    : privescMethods[0];
  
  return {
    type: 'internal',
    entryPoints: ['service_exploit', 'cred_reuse'],
    services,
    privescMethod,
    flags: {
      user: `THM{1nt3rn4l_us3r_${Math.random().toString(36).substr(2, 8)}}`,
      root: `THM{s3rv1c3_r00t_${Math.random().toString(36).substr(2, 8)}}`,
    },
    contextDescription: `Internal corporate infrastructure testing. Target is an application server with database backend. Client suspects weak authentication on internal services. Authorized to test RPC, WinRM, MSSQL, and SMB services. Rules: No brute force attacks exceeding 3 attempts per account.`,
    objectives: [
      'Enumerate internal services',
      'Test for default credentials',
      'Identify SQL injection opportunities',
      'Exploit service misconfigurations',
      'Gain initial access via internal service',
      'Escalate to administrator privileges',
    ],
  };
}

/**
 * Linux-focused scenario with SUID/sudo/kernel
 */
function buildLinuxScenario(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  targetIP: string,
  recentPrivesc: string[]
): ScenarioTemplate {
  const services = [
    { port: 22, service: 'SSH', version: 'OpenSSH 7.6p1' },
    { port: 80, service: 'HTTP', version: 'nginx 1.18.0' },
  ];
  
  if (difficulty !== 'beginner') {
    services.push({ port: 3306, service: 'MySQL', version: '5.7.33' });
  }
  
  if (difficulty === 'advanced') {
    services.push({ port: 8080, service: 'HTTP-Proxy', version: 'Apache Tomcat 9.0' });
  }
  
  const privescMethods: PrivescMethod[] = ['suid', 'sudo', 'kernel', 'cronjob', 'capability', 'path_abuse'];
  const availablePrivesc = privescMethods.filter(p => !recentPrivesc.includes(p));
  const privescMethod = availablePrivesc.length > 0
    ? availablePrivesc[Math.floor(Math.random() * availablePrivesc.length)]
    : privescMethods[Math.floor(Math.random() * privescMethods.length)];
  
  return {
    type: 'linux',
    entryPoints: ['web_vuln', 'service_exploit'],
    services,
    privescMethod,
    flags: {
      user: `THM{l1nux_us3r_${Math.random().toString(36).substr(2, 8)}}`,
      root: `THM{l1nux_r00t_${Math.random().toString(36).substr(2, 8)}}`,
    },
    contextDescription: `Linux server security assessment. Target is a web application server running Ubuntu 20.04. Client wants thorough testing of web app security and Linux privilege escalation vectors. Rules: No DoS, no lateral movement to production network.`,
    objectives: [
      'Enumerate web application',
      'Identify and exploit web vulnerabilities',
      'Gain initial shell access',
      'Enumerate Linux system for privesc vectors',
      'Exploit system misconfigurations',
      'Achieve root privileges',
    ],
  };
}

/**
 * Windows-focused scenario with registry/tokens/weak services
 */
function buildWindowsScenario(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  targetIP: string,
  recentPrivesc: string[]
): ScenarioTemplate {
  const services = [
    { port: 445, service: 'SMB', version: '3.0' },
    { port: 3389, service: 'RDP', version: 'Microsoft Terminal Services' },
    { port: 80, service: 'HTTP', version: 'IIS 10.0' },
  ];
  
  if (difficulty !== 'beginner') {
    services.push({ port: 5985, service: 'WinRM', version: 'Microsoft WinRM' });
  }
  
  const privescMethods: PrivescMethod[] = ['token_abuse', 'weak_service', 'registry'];
  const availablePrivesc = privescMethods.filter(p => !recentPrivesc.includes(p));
  const privescMethod = availablePrivesc.length > 0
    ? availablePrivesc[0]
    : privescMethods[0];
  
  return {
    type: 'windows',
    entryPoints: ['web_vuln', 'smb_enum', 'service_exploit'],
    services,
    privescMethod,
    flags: {
      user: `THM{w1nd0ws_us3r_${Math.random().toString(36).substr(2, 8)}}`,
      root: `THM{w1nd0ws_r00t_${Math.random().toString(36).substr(2, 8)}}`,
    },
    contextDescription: `Windows Server 2019 penetration test. Target hosts IIS web application with SMB file sharing. Client wants assessment of Windows-specific vulnerabilities including service permissions and token abuse vectors. Rules: No DoS, no data exfiltration.`,
    objectives: [
      'Enumerate Windows services',
      'Test IIS web application',
      'Enumerate SMB shares',
      'Gain initial access',
      'Enumerate Windows privilege escalation vectors',
      'Escalate to SYSTEM/Administrator',
    ],
  };
}

/**
 * Web-focused scenario (used when variety needed, not repetitively)
 */
function buildWebScenario(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  targetIP: string,
  recentPrivesc: string[]
): ScenarioTemplate {
  const services = [
    { port: 80, service: 'HTTP', version: 'Apache 2.4.41' },
    { port: 22, service: 'SSH', version: 'OpenSSH 8.2p1' },
  ];
  
  if (difficulty !== 'beginner') {
    services.push({ port: 443, service: 'HTTPS', version: 'Apache 2.4.41' });
    services.push({ port: 3306, service: 'MySQL', version: '5.7.33' });
  }
  
  if (difficulty === 'advanced') {
    services.push({ port: 8080, service: 'HTTP-Proxy', version: 'Tomcat 9.0' });
  }
  
  const privescMethods: PrivescMethod[] = ['suid', 'sudo', 'cronjob'];
  const availablePrivesc = privescMethods.filter(p => !recentPrivesc.includes(p));
  const privescMethod = availablePrivesc.length > 0
    ? availablePrivesc[0]
    : privescMethods[0];
  
  return {
    type: 'web',
    entryPoints: ['web_vuln'],
    services,
    privescMethod,
    flags: {
      user: `THM{w3b_us3r_${Math.random().toString(36).substr(2, 8)}}`,
      root: `THM{w3b_r00t_${Math.random().toString(36).substr(2, 8)}}`,
    },
    contextDescription: `Web application penetration test. Target is a custom-built CMS running on Apache. Client authorized full testing including file upload vulnerabilities, SQL injection, and privilege escalation. Rules: No DoS, no social engineering.`,
    objectives: [
      'Enumerate web directories and files',
      'Test for web vulnerabilities (SQLi, LFI, RCE, file upload)',
      'Discover credentials or authentication bypass',
      'Gain initial shell access',
      'Enumerate Linux system for privesc',
      'Achieve root privileges',
    ],
  };
}

/**
 * Generate unique IP address not used in recent history
 */
import { generateRealisticIP } from './ip-generator';

function generateUniqueIP(usedIPs: string[]): string {
  return generateRealisticIP(usedIPs);
}

/**
 * Format scenario template into AI-readable prompt context
 */
export function formatScenarioForAI(template: ScenarioTemplate, difficulty: string): string {
  const servicesText = template.services
    .map(s => `- Port ${s.port}: ${s.service}${s.version ? ` ${s.version}` : ''}`)
    .join('\n');
  
  const objectivesText = template.objectives
    .map((obj, idx) => `${idx + 1}. ${obj}`)
    .join('\n');
  
  let domainInfoText = '';
  if (template.domainInfo) {
    domainInfoText = `\n**DOMAIN INFORMATION**\n- Domain: ${template.domainInfo.domainName}\n- Domain Controller: ${template.domainInfo.dcIP}\n- Users: ${template.domainInfo.users.join(', ')}\n${template.domainInfo.spnAccounts ? `- Service Accounts (SPNs): ${template.domainInfo.spnAccounts.join(', ')}` : ''}\n`;
  }
  
  return `**TARGET INFORMATION**
- IP: ${template.services[0] ? template.services[0].port : ''}
- Target IP: [Use IP from services]
- Difficulty: ${difficulty}
- Objective: Find user flag and root flag
${domainInfoText}
**EXPOSED SERVICES**
${servicesText}

**ENGAGEMENT CONTEXT**
${template.contextDescription}

**YOUR MISSION**
${objectivesText}

**PENETRATION TESTING METHODOLOGY**
You must follow proper methodology:
1. **Reconnaissance** - Gather information about the target
2. **Scanning** - Identify live hosts and open ports (nmap)
3. **Enumeration** - Deep analysis of services
4. **Initial Access** - Exploit vulnerabilities to gain foothold
5. **Privilege Escalation** - Escalate to root/administrator/DA
6. **Post-Exploitation** - Document findings and capture flags

**READY?**
What is your first command? Think carefully about proper methodology.`;
}
