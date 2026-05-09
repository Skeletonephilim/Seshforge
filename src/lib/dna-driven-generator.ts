/**
 * DNA-DRIVEN HARD MODE GENERATOR
 * 
 * Generates exam scenarios from Attack DNA patterns extracted from real writeups.
 * Transforms abstract attack patterns into concrete (but randomized) scenarios.
 * 
 * This generator NEVER copies exact details - it uses Attack DNA as a blueprint
 * to create new, unique scenarios with similar structure and complexity.
 */

import type { AttackDNA } from './attack-pattern-extractor';
import { getDefaultAttackDNALibrary } from './attack-pattern-extractor';
import type { HardModeScenario } from './pt1-hard-mode-generator';
import { generateRealisticIP } from './ip-generator';

/**
 * Generate scenario from Attack DNA pattern
 */
export function generateFromAttackDNA(dna: AttackDNA): HardModeScenario {
  console.log('[DNA-Driven] Generating scenario from pattern:', {
    category: dna.category,
    difficulty: dna.difficulty,
    services: dna.services.length,
    chainLength: dna.attack_chain_shape.length,
  });
  
  // Generate randomized target IP
  const targetIP = generateRealisticIP();
  
  // Map DNA services to realistic port configurations
  const openPorts = generatePortsFromServices(dna.services);
  
  // Determine target type from services
  const targetType = inferTargetType(dna.services);
  
  // Generate OS info based on services
  const osInfo = generateOSInfo(dna.services, targetType);
  
  // Generate domain info if AD
  const domainInfo = targetType === 'active_directory' ? generateDomainInfo() : undefined;
  
  // Build scenario description with warnings
  const description = generateDescription(dna, targetType);
  
  // Transform Attack DNA into internal solution
  const internalSolution = {
    entryPoint: generateEntryPoint(dna.entry_vector_type, dna.services),
    hiddenVulnerability: dna.entry_vector_type,
    requiredEnumeration: dna.enumeration_requirements,
    exploitationPath: dna.attack_chain_shape,
    pivotPoints: dna.pivot_logic,
    privescVector: dna.privilege_escalation_type,
    falseLeads: dna.deception_elements,
    minimumSteps: dna.attack_chain_shape.length,
  };
  
  const scenario: HardModeScenario = {
    targetIP,
    difficulty: 'hard',
    targetType,
    description,
    openPorts,
    currentPhase: 'reconnaissance',
    osInfo,
    domainInfo,
    internalSolution,
  };
  
  console.log('[DNA-Driven] Scenario generated:', {
    targetType,
    portsCount: openPorts.length,
    minimumSteps: internalSolution.minimumSteps,
    falseLeads: internalSolution.falseLeads.length,
  });
  
  return scenario;
}

/**
 * Generate realistic port configurations from abstract service list
 */
function generatePortsFromServices(services: string[]): string[] {
  const portMap: Record<string, string[]> = {
    http: [
      'HTTP (nginx 1.18.0)',
      'HTTP (Apache 2.4.41)',
      'HTTP (Node.js Express)',
    ],
    https: [
      'HTTPS (nginx 1.18.0)',
      'HTTPS (Apache 2.4.41 with SSL)',
    ],
    ssh: [
      'SSH (OpenSSH 8.2p1 Ubuntu) - Key-based auth required',
      'SSH (OpenSSH 8.4p1) - Public key only',
      'SSH (OpenSSH 7.9p1 Debian)',
    ],
    smb: [
      'SMB (Microsoft-DS)',
      'SMB (Samba 4.13.5-Debian)',
    ],
    ldap: [
      'LDAP (Active Directory LDAP)',
      'LDAP (OpenLDAP 2.4.57)',
    ],
    kerberos: [
      'Kerberos (Microsoft Kerberos 5)',
    ],
    database: [
      'MySQL 5.7.33 - Firewalled (external connections denied)',
      'PostgreSQL 12.8 - Local connections only',
      'MongoDB 4.4.10 - Authentication required',
    ],
    ftp: [
      'FTP (vsftpd 3.0.3) - Anonymous disabled',
      'FTP (ProFTPD 1.3.7a)',
    ],
    dns: [
      'DNS (Microsoft DNS 6.1.7601)',
      'DNS (ISC BIND 9.16.8)',
    ],
    rpc: [
      'RPC (Microsoft RPC Endpoint Mapper)',
    ],
    netbios: [
      'NetBIOS (NetBIOS Session Service)',
    ],
    winrm: [
      'WinRM (Microsoft WinRM 2.0)',
    ],
  };
  
  const ports: string[] = [];
  
  for (const service of services) {
    const serviceLower = service.toLowerCase();
    
    if (serviceLower === 'http') {
      const httpVariant = portMap.http[Math.floor(Math.random() * portMap.http.length)];
      ports.push(`80/tcp - ${httpVariant}`);
      
      // Maybe add HTTPS too
      if (Math.random() > 0.7) {
        const httpsVariant = portMap.https[Math.floor(Math.random() * portMap.https.length)];
        ports.push(`443/tcp - ${httpsVariant}`);
      }
    }
    else if (serviceLower === 'ssh') {
      const sshVariant = portMap.ssh[Math.floor(Math.random() * portMap.ssh.length)];
      ports.push(`22/tcp - ${sshVariant}`);
    }
    else if (serviceLower === 'smb') {
      ports.push(`139/tcp - NetBIOS (NetBIOS Session Service)`);
      const smbVariant = portMap.smb[Math.floor(Math.random() * portMap.smb.length)];
      ports.push(`445/tcp - ${smbVariant}`);
    }
    else if (serviceLower === 'ldap') {
      const ldapVariant = portMap.ldap[Math.floor(Math.random() * portMap.ldap.length)];
      ports.push(`389/tcp - ${ldapVariant}`);
      
      // Maybe add LDAPS
      if (Math.random() > 0.6) {
        ports.push(`636/tcp - LDAPS (LDAP over SSL)`);
      }
    }
    else if (serviceLower === 'kerberos') {
      ports.push(`88/tcp - ${portMap.kerberos[0]}`);
      ports.push(`464/tcp - Kerberos Password Change`);
    }
    else if (serviceLower === 'database') {
      const dbVariant = portMap.database[Math.floor(Math.random() * portMap.database.length)];
      const port = dbVariant.includes('MySQL') ? 3306 : dbVariant.includes('PostgreSQL') ? 5432 : 27017;
      ports.push(`${port}/tcp - ${dbVariant}`);
    }
    else if (serviceLower === 'dns') {
      const dnsVariant = portMap.dns[Math.floor(Math.random() * portMap.dns.length)];
      ports.push(`53/tcp - ${dnsVariant}`);
    }
    else if (serviceLower === 'rpc') {
      ports.push(`135/tcp - ${portMap.rpc[0]}`);
    }
    else if (serviceLower === 'winrm') {
      ports.push(`5985/tcp - ${portMap.winrm[0]}`);
    }
  }
  
  // Add false lead services (1-2 additional)
  const falseLeadServices = [
    "3306/tcp - MySQL 8.0.25 - Root login disabled",
    "8080/tcp - Apache Tomcat 9.0.50 - Admin panel (strong credentials)",
    "9200/tcp - Elasticsearch 7.10.0 - Authentication required",
    "6379/tcp - Redis 6.2.5 - Protected mode enabled",
    "27017/tcp - MongoDB 5.0.3 - No anonymous access",
  ];
  
  const numFalseLeads = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < numFalseLeads; i++) {
    const randomIndex = Math.floor(Math.random() * falseLeadServices.length);
    const falseLead = falseLeadServices.splice(randomIndex, 1)[0];
    if (falseLead && !ports.some(p => p.startsWith(falseLead.split('/')[0]))) {
      ports.push(falseLead);
    }
  }
  
  return ports;
}

/**
 * Infer target type from services
 */
function inferTargetType(services: string[]): 'linux_web' | 'mixed' | 'active_directory' {
  const serviceLower = services.map(s => s.toLowerCase());
  
  // If has Kerberos + LDAP → Active Directory
  if (serviceLower.includes('kerberos') && serviceLower.includes('ldap')) {
    return 'active_directory';
  }
  
  // If has SMB + HTTP → Mixed
  if (serviceLower.includes('smb') && serviceLower.includes('http')) {
    return 'mixed';
  }
  
  // If has HTTP/HTTPS + SSH → Linux Web
  if ((serviceLower.includes('http') || serviceLower.includes('https')) && serviceLower.includes('ssh')) {
    return 'linux_web';
  }
  
  // Default to mixed if uncertain
  return 'mixed';
}

/**
 * Generate OS info based on services
 */
function generateOSInfo(services: string[], targetType: string): string {
  if (targetType === 'active_directory') {
    const versions = ['Windows Server 2016 (Build 14393)', 'Windows Server 2019 (Build 17763)', 'Windows Server 2022 (Build 20348)'];
    return versions[Math.floor(Math.random() * versions.length)];
  }
  
  if (targetType === 'linux_web') {
    const versions = ['Linux 4.15 (Ubuntu 18.04 LTS)', 'Linux 5.4 (Ubuntu 20.04 LTS)', 'Linux 4.19 (Debian 10 Buster)', 'Linux 5.10 (Debian 11 Bullseye)'];
    return versions[Math.floor(Math.random() * versions.length)];
  }
  
  return 'Mixed (Linux + Windows services)';
}

/**
 * Generate domain info for AD scenarios
 */
function generateDomainInfo() {
  const domains = ['corp.local', 'internal.local', 'enterprise.local', 'company.local'];
  const dcNames = ['DC01', 'DC-SERVER', 'ADDC', 'DC1'];
  const users = ['administrator', 'sqlservice', 'webadmin', 'backupuser', 'svcaccount', 'helpdesk'];
  const spnAccounts = ['sqlservice', 'webadmin'];
  
  return {
    domainName: domains[Math.floor(Math.random() * domains.length)],
    dcHostname: dcNames[Math.floor(Math.random() * dcNames.length)],
    users,
    spnAccounts,
  };
}

/**
 * Generate entry point description
 */
function generateEntryPoint(entryVectorType: string, services: string[]): string {
  const serviceLower = services.map(s => s.toLowerCase());
  
  if (serviceLower.includes('http')) {
    return `HTTP service (Entry vector: ${entryVectorType})`;
  }
  
  if (serviceLower.includes('ldap')) {
    return `LDAP enumeration (Entry vector: ${entryVectorType})`;
  }
  
  if (serviceLower.includes('smb')) {
    return `SMB service enumeration (Entry vector: ${entryVectorType})`;
  }
  
  return `Service enumeration (Entry vector: ${entryVectorType})`;
}

/**
 * Generate description with DNA-based warnings
 */
function generateDescription(dna: AttackDNA, targetType: string): string {
  const typeNames = {
    linux_web: 'Linux web server',
    mixed: 'Hybrid Linux/Windows environment',
    active_directory: 'Active Directory Domain Controller',
  };
  
  const warnings = [];
  
  if (dna.difficulty_factors.enumeration_depth > 80) {
    warnings.push('Deep enumeration required');
  }
  
  if (dna.difficulty_factors.deception_level > 75) {
    warnings.push('Multiple dead-ends exist');
  }
  
  if (dna.difficulty_factors.chain_complexity > 80) {
    warnings.push('Complex multi-stage attack chain');
  }
  
  if (dna.pivot_logic.length > 2) {
    warnings.push('Multiple pivots required');
  }
  
  return `${typeNames[targetType]} with realistic misconfigurations. WARNING: ${warnings.join('. ')}. Methodical approach mandatory.`;
}

/**
 * Select random Attack DNA from library and generate scenario
 */
export function generateDNADrivenScenario(difficulty?: 'beginner' | 'intermediate' | 'pt1_hard' | 'advanced'): HardModeScenario {
  const library = getDefaultAttackDNALibrary();
  
  // Filter by difficulty if specified
  const candidates = difficulty 
    ? library.patterns.filter(p => p.difficulty === difficulty)
    : library.patterns.filter(p => p.difficulty === 'pt1_hard' || p.difficulty === 'advanced');
  
  if (candidates.length === 0) {
    throw new Error(`No Attack DNA patterns found for difficulty: ${difficulty || 'pt1_hard/advanced'}`);
  }
  
  // Select random pattern
  const selectedDNA = candidates[Math.floor(Math.random() * candidates.length)];
  
  console.log('[DNA-Driven] Selected Attack DNA:', {
    category: selectedDNA.category,
    difficulty: selectedDNA.difficulty,
    extractedFrom: selectedDNA.extracted_from || 'hand-crafted',
  });
  
  // Generate scenario from DNA
  return generateFromAttackDNA(selectedDNA);
}

/**
 * Generate multiple DNA-driven scenarios for variety
 */
export function generateMultipleDNAScenarios(count: number = 3): HardModeScenario[] {
  const library = getDefaultAttackDNALibrary();
  const scenarios: HardModeScenario[] = [];
  
  // Shuffle patterns
  const shuffled = [...library.patterns].sort(() => Math.random() - 0.5);
  
  // Generate scenarios
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const scenario = generateFromAttackDNA(shuffled[i]);
    scenarios.push(scenario);
  }
  
  return scenarios;
}
