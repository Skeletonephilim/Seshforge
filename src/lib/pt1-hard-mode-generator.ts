/**
 * PT1 HARD MODE SCENARIO GENERATOR
 * 
 * Generates realistic, high-difficulty PT1-style exam environments that:
 * - CANNOT be solved by pattern recognition
 * - REQUIRE deep enumeration and hypothesis testing
 * - FORCE methodological thinking
 * - Include multi-stage attack chains (3+ steps to foothold)
 * - Introduce false leads and dead ends
 * - Require multiple enumeration techniques
 * - Force tool chaining + reasoning (NOT single-tool solutions)
 */

import { generateRealisticIP, generateDCIP } from './ip-generator';

export interface HardModeScenario {
  targetIP: string;
  difficulty: 'hard';
  targetType: 'linux_web' | 'mixed' | 'active_directory';
  description: string;
  openPorts: string[];
  currentPhase: 'reconnaissance';
  osInfo: string;
  domainInfo?: {
    domainName: string;
    dcHostname: string;
    users: string[];
    spnAccounts: string[];
  };
  
  // Internal solution path (NOT exposed to user)
  internalSolution: {
    entryPoint: string;
    hiddenVulnerability: string;
    requiredEnumeration: string[];
    exploitationPath: string[];
    pivotPoints: string[];
    privescVector: string;
    falseLeads: string[];
    minimumSteps: number;
  };
}

interface VulnerabilityTemplate {
  type: string;
  complexity: 'high' | 'critical';
  requiredTools: string[];
  requiredSteps: string[];
  falsePositives: string[];
}

// FORBIDDEN LOW-EFFORT VULNERABILITIES
const FORBIDDEN_PATTERNS = [
  '/backup',
  '/admin',
  'admin:admin',
  '.bak',
  'robots.txt → direct access',
  'default credentials',
  'anonymous FTP write',
  'writable /etc/passwd',
  'simple SUID /bin/bash',
];

// HIGH-COMPLEXITY VULNERABILITY TEMPLATES
const COMPLEX_WEB_VULNS: VulnerabilityTemplate[] = [
  {
    type: 'Blind SQL Injection (Time-Based)',
    complexity: 'critical',
    requiredTools: ['manual testing', 'sqlmap', 'burp suite'],
    requiredSteps: [
      'Discover hidden API endpoint via JavaScript analysis',
      'Identify parameter vulnerable to SQLi',
      'Confirm via time-based blind SQLi',
      'Extract database schema',
      'Dump credentials table',
      'Crack password hashes',
    ],
    falsePositives: ['Login form (not vulnerable)', 'Search functionality (filtered)'],
  },
  {
    type: 'IDOR with Indirect Object References',
    complexity: 'high',
    requiredTools: ['burp suite', 'ffuf', 'manual analysis'],
    requiredSteps: [
      'Enumerate user profiles',
      'Discover UUID/hash-based object references',
      'Brute-force UUID space or predict pattern',
      'Access restricted user data',
      'Extract SSH keys or API tokens',
    ],
    falsePositives: ['Direct ID enumeration (blocked)', 'Admin panel (authentication required)'],
  },
  {
    type: 'Authentication Logic Flaw (Race Condition)',
    complexity: 'critical',
    requiredTools: ['burp suite intruder', 'custom scripting', 'timing analysis'],
    requiredSteps: [
      'Identify token generation endpoint',
      'Discover race condition in validation',
      'Craft parallel requests',
      'Bypass authentication check',
      'Gain partial admin access',
    ],
    falsePositives: ['Standard login bypass attempts', 'SQL injection in auth form'],
  },
  {
    type: 'API Abuse via Token Extraction',
    complexity: 'high',
    requiredTools: ['burp suite', 'jwt.io', 'custom scripting'],
    requiredSteps: [
      'Discover undocumented API via JS bundle analysis',
      'Extract JWT from localStorage/cookie',
      'Decode JWT and identify weak signing',
      'Forge admin JWT token',
      'Access privileged API endpoints',
      'Leak internal credentials',
    ],
    falsePositives: ['Public API endpoints (limited functionality)', 'Documented API (properly secured)'],
  },
  {
    type: 'XXE (XML External Entity) via File Upload',
    complexity: 'critical',
    requiredTools: ['burp suite', 'xxe payloads', 'file download'],
    requiredSteps: [
      'Discover file upload functionality',
      'Identify XML processing (SVG, DOCX, etc.)',
      'Craft XXE payload',
      'Extract /etc/passwd or internal files',
      'Leak SSH private keys or credentials',
    ],
    falsePositives: ['Image upload (only accepts PNG/JPG)', 'File type filtering (strict)'],
  },
];

const COMPLEX_PRIVESC_VECTORS: VulnerabilityTemplate[] = [
  {
    type: 'PATH Hijack via Writable Script',
    complexity: 'high',
    requiredTools: ['find', 'grep', 'pspy', 'custom script'],
    requiredSteps: [
      'Enumerate writable directories in PATH',
      'Identify script executed by root cron',
      'Discover script calls command without absolute path',
      'Create malicious binary in writable PATH location',
      'Wait for cron execution',
      'Gain root shell',
    ],
    falsePositives: ['Obvious SUID binaries (none exploitable)', 'sudo -l (returns nothing useful)'],
  },
  {
    type: 'Linux Capabilities Exploitation',
    complexity: 'high',
    requiredTools: ['getcap', 'exploit research', 'custom binary'],
    requiredSteps: [
      'Run getcap -r / to find capabilities',
      'Identify binary with cap_setuid capability',
      'Research exploitation method (GTFOBins)',
      'Craft privilege escalation exploit',
      'Gain root access',
    ],
    falsePositives: ['SUID binaries (none useful)', 'Sudo permissions (restricted)'],
  },
  {
    type: 'Container Escape via Misconfigured Mount',
    complexity: 'critical',
    requiredTools: ['mount analysis', 'docker socket', 'host filesystem access'],
    requiredSteps: [
      'Identify containerized environment (check /.dockerenv)',
      'Discover host filesystem mounted at unusual path',
      'Write cron job to host /etc/cron.d/',
      'Wait for host cron execution',
      'Gain root on host system',
    ],
    falsePositives: ['Docker socket (not accessible)', 'Standard container (no escape vector)'],
  },
  {
    type: 'Wildcard Injection in Backup Script',
    complexity: 'high',
    requiredTools: ['pspy', 'tar exploitation', 'file creation'],
    requiredSteps: [
      'Discover backup script running as root',
      'Identify use of wildcards (tar -czf backup.tar.gz *)',
      'Create malicious filenames (--checkpoint, --checkpoint-action)',
      'Inject command execution via tar arguments',
      'Gain root shell',
    ],
    falsePositives: ['Cron jobs visible (none exploitable)', 'Backup files readable (no useful info)'],
  },
  {
    type: 'NFS Root Squashing Disabled',
    complexity: 'high',
    requiredTools: ['showmount', 'mount', 'custom binary', 'SUID manipulation'],
    requiredSteps: [
      'Enumerate NFS shares (showmount -e)',
      'Mount share to local machine',
      'Check for no_root_squash misconfiguration',
      'Create SUID binary on NFS share as local root',
      'Execute SUID binary from target system',
      'Gain root access',
    ],
    falsePositives: ['NFS mounted (root_squash enabled)', 'NFS share read-only'],
  },
];

/**
 * Validates that scenario doesn't contain forbidden low-effort patterns
 */
function validateNoLowEffortVulns(scenario: HardModeScenario): boolean {
  const fullDescription = JSON.stringify(scenario.internalSolution).toLowerCase();
  
  for (const forbidden of FORBIDDEN_PATTERNS) {
    if (fullDescription.includes(forbidden.toLowerCase())) {
      console.warn(`[HardMode] REJECTED: Contains forbidden pattern "${forbidden}"`);
      return false;
    }
  }
  
  // Must require at least 5 total steps
  if (scenario.internalSolution.minimumSteps < 5) {
    console.warn(`[HardMode] REJECTED: Only ${scenario.internalSolution.minimumSteps} steps (need 5+)`);
    return false;
  }
  
  // Must have at least 2 false leads
  if (scenario.internalSolution.falseLeads.length < 2) {
    console.warn(`[HardMode] REJECTED: Only ${scenario.internalSolution.falseLeads.length} false leads (need 2+)`);
    return false;
  }
  
  // Must require multiple enumeration techniques (3+)
  if (scenario.internalSolution.requiredEnumeration.length < 3) {
    console.warn(`[HardMode] REJECTED: Only ${scenario.internalSolution.requiredEnumeration.length} enum techniques (need 3+)`);
    return false;
  }
  
  return true;
}

/**
 * Generate a Hard Mode Linux Web scenario
 */
export function generateLinuxWebHardMode(): HardModeScenario {
  const webVuln = COMPLEX_WEB_VULNS[Math.floor(Math.random() * COMPLEX_WEB_VULNS.length)];
  const privescVuln = COMPLEX_PRIVESC_VECTORS[Math.floor(Math.random() * COMPLEX_PRIVESC_VECTORS.length)];
  
  const targetIP = generateRealisticIP();
  
  // Build service list with false leads
  const services = [
    "22/tcp - SSH (OpenSSH 8.2p1 Ubuntu) - Key-based auth only",
    "80/tcp - HTTP (nginx 1.18.0)",
  ];
  
  // Add 1-2 additional services as potential false leads
  const additionalServices = [
    "3306/tcp - MySQL 5.7.33 - Firewalled (external connections denied)",
    "8080/tcp - Apache Tomcat 9.0.50 - Admin panel (credentials unknown)",
    "9200/tcp - Elasticsearch 7.10.0 - Anonymous access disabled",
    "6379/tcp - Redis 6.0.9 - Protected mode enabled",
  ];
  
  const numFalseServices = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < numFalseServices; i++) {
    const randomIndex = Math.floor(Math.random() * additionalServices.length);
    services.push(additionalServices.splice(randomIndex, 1)[0]);
  }
  
  const scenario: HardModeScenario = {
    targetIP,
    difficulty: 'hard',
    targetType: 'linux_web',
    description: `Linux web server with developer tools and complex misconfigurations. WARNING: Multiple dead-ends exist. Methodical enumeration required.`,
    openPorts: services,
    currentPhase: 'reconnaissance',
    osInfo: 'Linux 4.15 (Ubuntu 18.04 LTS)',
    internalSolution: {
      entryPoint: 'HTTP service on port 80',
      hiddenVulnerability: webVuln.type,
      requiredEnumeration: [
        'Manual web browsing and source code analysis',
        'JavaScript bundle inspection for API endpoints',
        'Parameter fuzzing with ffuf/burp',
        'Service version enumeration',
        'File download and content analysis',
      ],
      exploitationPath: webVuln.requiredSteps,
      pivotPoints: [
        'Leaked credentials from database',
        'SSH private key extraction',
        'Internal service enumeration post-foothold',
      ],
      privescVector: privescVuln.type,
      falseLeads: [
        ...webVuln.falsePositives,
        'Additional services appear vulnerable but are dead-ends',
        'Credentials found but not useful for initial access',
      ],
      minimumSteps: webVuln.requiredSteps.length + privescVuln.requiredSteps.length,
    },
  };
  
  return scenario;
}

/**
 * Generate a Hard Mode Active Directory scenario
 */
export function generateActiveDirectoryHardMode(): HardModeScenario {
  const targetIP = generateDCIP();
  const domains = ['corp.local', 'internal.local', 'enterprise.local'];
  const domainName = domains[Math.floor(Math.random() * domains.length)];
  
  const services = [
    "53/tcp - DNS (Microsoft DNS 6.1.7601)",
    "88/tcp - Kerberos (Microsoft Kerberos 5)",
    "135/tcp - RPC (Microsoft RPC Endpoint Mapper)",
    "139/tcp - NetBIOS (NetBIOS Session Service)",
    "389/tcp - LDAP (Active Directory LDAP)",
    "445/tcp - SMB (Microsoft-DS)",
    "464/tcp - Kerberos Password Change",
    "3268/tcp - Global Catalog (LDAP)",
    "5985/tcp - WinRM (Microsoft WinRM 2.0)",
  ];
  
  // Complex AD attack chain
  const scenario: HardModeScenario = {
    targetIP,
    difficulty: 'hard',
    targetType: 'active_directory',
    description: `Windows Server 2019 Active Directory Domain Controller (${domainName}). Complex AD environment with multiple attack vectors. Standard Kerberoasting alone will NOT succeed.`,
    openPorts: services,
    currentPhase: 'reconnaissance',
    osInfo: 'Windows Server 2019 (Build 17763)',
    domainInfo: {
      domainName,
      dcHostname: 'DC01',
      users: ['administrator', 'sqlservice', 'webadmin', 'backupuser', 'svcaccount', 'helpdesk'],
      spnAccounts: ['sqlservice', 'webadmin'],
    },
    internalSolution: {
      entryPoint: 'LDAP anonymous enumeration (partial access only)',
      hiddenVulnerability: 'AS-REP Roasting + Password Spray + DCSync via Compromised Account',
      requiredEnumeration: [
        'LDAP enumeration for user accounts',
        'Kerberos pre-auth enumeration (GetNPUsers.py)',
        'SMB null session testing (limited info)',
        'RPC endpoint enumeration',
        'User description field analysis for credentials',
      ],
      exploitationPath: [
        'Enumerate domain users via ldapsearch',
        'Identify users with Kerberos pre-auth disabled (AS-REP roasting)',
        'Extract AS-REP hashes for vulnerable users',
        'Crack hashes offline (weak password found)',
        'Authenticate as low-priv user',
        'Enumerate SMB shares with credentials',
        'Discover script with embedded credentials in share',
        'Test credentials → discover admin-level service account',
        'Use BloodHound for privilege path analysis',
        'Identify DCSync rights on compromised account',
        'Perform DCSync attack to dump domain hashes',
        'Pass-the-Hash as Domain Admin',
      ],
      pivotPoints: [
        'AS-REP roastable account with weak password',
        'SMB share with script containing credentials',
        'Service account with DCSync rights (non-obvious)',
      ],
      privescVector: 'DCSync via compromised account with replication rights',
      falseLeads: [
        'Kerberoasting returns hashes but all use strong passwords (uncrackable)',
        'Anonymous LDAP returns limited user list (missing key accounts)',
        'WinRM accessible but credentials unknown',
        'Multiple service accounts visible but most are decoys',
      ],
      minimumSteps: 12,
    },
  };
  
  return scenario;
}

/**
 * Generate a Hard Mode Mixed Environment scenario
 */
export function generateMixedHardMode(): HardModeScenario {
  const targetIP = generateRealisticIP();
  
  const services = [
    "22/tcp - SSH (OpenSSH 8.2p1) - Key-based auth required",
    "80/tcp - HTTP (Apache 2.4.41)",
    "139/tcp - NetBIOS (NetBIOS Session Service)",
    "445/tcp - SMB (Microsoft-DS)",
    "3306/tcp - MySQL 5.7.33 - Remote access restricted",
  ];
  
  // Mixed environment: combine web + SMB + credential reuse
  const scenario: HardModeScenario = {
    targetIP,
    difficulty: 'hard',
    targetType: 'mixed',
    description: `Hybrid Linux/Windows environment with SMB file sharing and web services. Multiple interconnected vulnerabilities. Single-vector attacks will fail.`,
    openPorts: services,
    currentPhase: 'reconnaissance',
    osInfo: 'Mixed (Linux + Windows services)',
    internalSolution: {
      entryPoint: 'HTTP web application',
      hiddenVulnerability: 'Local File Inclusion → Credential Extraction → SMB Lateral Movement → Token Impersonation',
      requiredEnumeration: [
        'Web directory enumeration',
        'Parameter fuzzing for LFI',
        'SMB share enumeration (null session)',
        'File content analysis for credentials',
        'Internal service discovery post-foothold',
      ],
      exploitationPath: [
        'Discover web application with file parameter',
        'Test for Local File Inclusion (LFI)',
        'Use PHP filter wrapper to read application source',
        'Extract database credentials from config file',
        'Access MySQL database via exposed credentials',
        'Dump user table with password hashes',
        'Crack hashes and discover reused password',
        'Test credentials on SMB shares',
        'Discover writable SMB share with scripts',
        'Upload malicious script for code execution',
        'Gain initial shell access',
        'Enumerate Windows tokens and privileges',
        'Perform token impersonation to SYSTEM',
      ],
      pivotPoints: [
        'LFI to database credential leak',
        'Credential reuse from web to SMB',
        'Writable SMB share for code execution',
      ],
      privescVector: 'Windows Token Impersonation (SeImpersonatePrivilege)',
      falseLeads: [
        'Anonymous SMB enumeration reveals shares but most are read-only',
        'MySQL credentials don\'t work directly for SSH',
        'Web application has admin panel but SQLi attempts fail',
        'Several other parameters in web app are not vulnerable to LFI',
      ],
      minimumSteps: 13,
    },
  };
  
  return scenario;
}

/**
 * Main generator function that selects random scenario type and validates
 */
export function generateHardModeScenario(): HardModeScenario {
  const types = ['linux_web', 'active_directory', 'mixed'] as const;
  const selectedType = types[Math.floor(Math.random() * types.length)];
  
  let scenario: HardModeScenario;
  let attempts = 0;
  const maxAttempts = 5;
  
  // Retry generation until valid (no low-effort vulns)
  do {
    if (selectedType === 'linux_web') {
      scenario = generateLinuxWebHardMode();
    } else if (selectedType === 'active_directory') {
      scenario = generateActiveDirectoryHardMode();
    } else {
      scenario = generateMixedHardMode();
    }
    
    attempts++;
    
    if (validateNoLowEffortVulns(scenario)) {
      console.log(`[HardMode] Scenario validated after ${attempts} attempt(s)`);
      return scenario;
    }
    
  } while (attempts < maxAttempts);
  
  // If all attempts fail validation, return last one anyway (shouldn't happen with templates)
  console.warn('[HardMode] Max attempts reached, returning last scenario');
  return scenario;
}

/**
 * Helper: Get human-readable scenario summary (excluding internal solution)
 */
export function getScenarioSummary(scenario: HardModeScenario): string {
  return `
Target: ${scenario.targetIP}
Type: ${scenario.targetType}
Difficulty: HARD MODE
OS: ${scenario.osInfo}
Services: ${scenario.openPorts.length}

⚠️ WARNING: This is a HARD MODE scenario.
- Multiple false leads and dead ends exist
- Standard pattern recognition will NOT work
- Requires deep enumeration and hypothesis testing
- Minimum ${scenario.internalSolution.minimumSteps} steps to complete
- Tool chaining and reasoning mandatory

Good luck. You'll need it.
`.trim();
}
