/**
 * SEC1 Exam Mode - Theory & Analysis-Based Certification Training
 * 
 * Covers SEC0/SEC1 fundamentals through scenario-based MCQ evaluation:
 * - Networking, OS, CLI, Web, Cryptography
 * - Defensive Security, SIEM, Logs, Forensics
 * - Analyst reasoning and log analysis
 * - OWASP Top 10, Security Principles
 * 
 * 10 questions per scenario, multiple scenarios
 * Persistent state, AI mentorship, post-exam analytics
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  TrendingUp,
  AlertTriangle,
  Target,
  Shield,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { DevvAI } from '@devvai/devv-code-backend';
import { parseAIJson } from '@/lib/utils';
import { useSEC1ExamStore } from '@/store/sec1-exam-store';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Scenario {
  title: string;
  description: string;
  context: string;
  questions: Question[];
}

export default function SEC1ExamPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const examStore = useSEC1ExamStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showMentor, setShowMentor] = useState(false);
  const [mentorGuidance, setMentorGuidance] = useState('');
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [startTime]);

  // Load or generate scenarios on mount
  useEffect(() => {
    if (!examStore.hasActiveExam()) {
      generateScenarios();
    }
  }, []);

  const generateScenarios = async () => {
    setIsGenerating(true);
    
    console.log('[SEC1Exam] Starting scenario generation...');
    
    try {
      const ai = new DevvAI();
      
      // Generate 3 scenarios, each with 10 questions
      const scenarios: Scenario[] = [];
      
      for (let i = 0; i < 3; i++) {
        const difficulty = i === 0 ? 'beginner' : i === 1 ? 'intermediate' : 'advanced';
        
        console.log(`[SEC1Exam] Generating scenario ${i + 1}/3 (${difficulty})...`);
        
        // More focused prompt to reduce token usage and improve quality
        const prompt = `You are generating a realistic SEC1 Security Analyst exam scenario.

SCENARIO ${i + 1} - Difficulty: ${difficulty}

Create ONE complete scenario with:
1. A realistic security incident/investigation scenario
2. EXACTLY 10 questions testing SEC0/SEC1 knowledge

SCENARIO TYPES (pick one):
- Network intrusion analysis (packets, logs, protocols)
- Web application security incident (OWASP, SQLi, XSS)
- Active Directory compromise investigation (Kerberos, LDAP, privileges)
- Log analysis & SIEM investigation (defensive security)
- Forensics & incident response (evidence, timeline, IOCs)
- Vulnerability assessment review (CVEs, misconfigurations)

REQUIREMENTS:
✓ Title: Specific and realistic
✓ Description: 2-3 sentences of context
✓ Context: Actual logs, evidence, or technical details (NOT generic text)
✓ Questions: Mix of MCQ testing interpretation, reasoning, and applied knowledge

QUESTION QUALITY:
✓ Scenario-grounded (reference the evidence provided)
✓ Test understanding, not memorization
✓ Realistic distractors
✓ Clear correct answer with explanation

Categories to use: networking, os, cli, web, crypto, defensive, tooling, analyst_reasoning

CRITICAL: Respond with ONLY valid JSON, no other text.

{
  "title": "Specific scenario title",
  "description": "Setup in 2-3 sentences",
  "context": "Logs/evidence/technical details here",
  "questions": [
    {
      "id": 1,
      "question": "Grounded question referencing the evidence?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why A is correct. Why others are wrong. Real-world meaning.",
      "category": "networking",
      "difficulty": "easy"
    }
    // ... 9 more questions
  ]
}`;

        try {
          const response = await ai.chat.completions.create({
            model: 'kimi-k2-0711-preview',
            messages: [
              {
                role: 'system',
                content: 'You are an expert SEC1 exam designer. Generate realistic security analyst scenarios with evidence-based questions. Respond with ONLY valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 4000,
            temperature: 0.85,
          });
          
          const content = response.choices[0]?.message?.content || '{}';
          
          console.log(`[SEC1Exam] AI response received for scenario ${i + 1}, length: ${content.length} chars`);
          console.log(`[SEC1Exam] Response preview: ${content.substring(0, 200)}...`);
          
          const scenario = parseAIJson<Scenario>(content);
          
          // Validate scenario structure
          if (!scenario.title || !scenario.description || !scenario.questions) {
            throw new Error('Invalid scenario structure: missing required fields');
          }
          
          if (scenario.questions.length !== 10) {
            console.warn(`[SEC1Exam] Scenario has ${scenario.questions.length} questions, expected 10`);
            throw new Error(`Invalid question count: ${scenario.questions.length}`);
          }
          
          // Validate each question
          for (let q = 0; q < scenario.questions.length; q++) {
            const question = scenario.questions[q];
            if (!question.question || !question.options || question.options.length !== 4) {
              throw new Error(`Invalid question ${q + 1} structure`);
            }
            if (question.correctAnswer < 0 || question.correctAnswer > 3) {
              throw new Error(`Invalid correctAnswer for question ${q + 1}: ${question.correctAnswer}`);
            }
          }
          
          console.log(`[SEC1Exam] Scenario ${i + 1} validated successfully`);
          scenarios.push(scenario);
          
        } catch (scenarioError) {
          console.error(`[SEC1Exam] Failed to generate scenario ${i + 1}:`, scenarioError);
          console.error(`[SEC1Exam] Error details:`, {
            message: scenarioError instanceof Error ? scenarioError.message : String(scenarioError),
            difficulty,
          });
          
          // Use better fallback for this specific difficulty
          console.warn(`[SEC1Exam] Using rich fallback scenario for ${difficulty}`);
          scenarios.push(createRichFallbackScenario(difficulty));
        }
      }
      
      if (scenarios.length === 0) {
        throw new Error('No scenarios generated successfully');
      }
      
      examStore.startExam(scenarios);
      
      const aiCount = scenarios.filter(s => s.title !== `${s.description.split(' ')[0]} Security Analysis`).length;
      const fallbackCount = scenarios.length - aiCount;
      
      console.log(`[SEC1Exam] Exam ready: ${aiCount} AI scenarios, ${fallbackCount} fallback scenarios`);
      
      toast({
        title: 'SEC1 Exam Ready',
        description: `${scenarios.length} scenarios loaded (${scenarios.length * 10} questions total)`,
      });
      
    } catch (error) {
      console.error('[SEC1Exam] Complete generation failure:', error);
      console.error('[SEC1Exam] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Use all rich fallback scenarios
      const fallbackScenarios = [
        createRichFallbackScenario('beginner'),
        createRichFallbackScenario('intermediate'),
        createRichFallbackScenario('advanced'),
      ];
      
      examStore.startExam(fallbackScenarios);
      
      toast({
        title: 'Using Fallback Scenarios',
        description: 'AI generation unavailable. Using comprehensive pre-built exam content.',
        variant: 'default',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const createRichFallbackScenario = (difficulty: string): Scenario => {
    // Create realistic fallback scenarios based on difficulty
    
    if (difficulty === 'beginner') {
      return {
        title: 'Web Application Reconnaissance',
        description: 'You are analyzing a web application during a security assessment. The development team has requested a review of their authentication system and exposed endpoints.',
        context: `HTTP Response Headers:
Server: nginx/1.18.0
X-Powered-By: PHP/7.4.3
Set-Cookie: PHPSESSID=abc123; HttpOnly

Directory Enumeration Results:
/admin - 403 Forbidden
/api - 200 OK
/backup - 404 Not Found
/login - 200 OK
/config - 403 Forbidden`,
        questions: [
          {
            id: 1,
            question: 'Based on the Server header, which web server is being used?',
            options: ['Apache', 'nginx', 'IIS', 'Tomcat'],
            correctAnswer: 1,
            explanation: 'The Server header explicitly shows "nginx/1.18.0". Headers reveal technology stack information that helps security analysts understand the attack surface.',
            category: 'web',
            difficulty: 'easy',
          },
          {
            id: 2,
            question: 'What does the X-Powered-By header tell us?',
            options: ['The server is running Python', 'The server is using PHP 7.4.3', 'The server uses Java', 'The server runs Node.js'],
            correctAnswer: 1,
            explanation: 'X-Powered-By: PHP/7.4.3 reveals the PHP version. This is valuable for vulnerability research as older PHP versions may have known CVEs.',
            category: 'web',
            difficulty: 'easy',
          },
          {
            id: 3,
            question: 'Why is the HttpOnly flag important in the Set-Cookie header?',
            options: [
              'It encrypts the cookie',
              'It prevents JavaScript from accessing the cookie',
              'It makes the cookie expire faster',
              'It allows cross-domain cookie sharing'
            ],
            correctAnswer: 1,
            explanation: 'HttpOnly prevents JavaScript from accessing cookies via document.cookie, mitigating XSS attacks that attempt to steal session tokens.',
            category: 'web',
            difficulty: 'easy',
          },
          {
            id: 4,
            question: 'What does a 403 Forbidden status code indicate?',
            options: [
              'The page does not exist',
              'The server refuses to authorize the request',
              'The request timed out',
              'The server is overloaded'
            ],
            correctAnswer: 1,
            explanation: '403 means the resource exists but access is denied. This differs from 404 (not found) and suggests the directory exists but requires authentication/authorization.',
            category: 'web',
            difficulty: 'easy',
          },
          {
            id: 5,
            question: 'Which endpoint should be investigated first for sensitive data exposure?',
            options: ['/admin (403)', '/api (200)', '/backup (404)', '/config (403)'],
            correctAnswer: 1,
            explanation: 'The /api endpoint returned 200 OK and is accessible. APIs often expose sensitive data or functionality without proper authentication. Start with what you can access.',
            category: 'analyst_reasoning',
            difficulty: 'easy',
          },
          {
            id: 6,
            question: 'What security risk does the PHP version disclosure create?',
            options: [
              'No risk, version numbers are harmless',
              'Attackers can research known vulnerabilities for that version',
              'It only affects performance',
              'It causes the server to crash'
            ],
            correctAnswer: 1,
            explanation: 'Version disclosure enables targeted attacks. PHP 7.4.3 may have known CVEs that attackers can exploit. Best practice: disable version disclosure in headers.',
            category: 'defensive',
            difficulty: 'medium',
          },
          {
            id: 7,
            question: 'If /admin returns 403 but exists, what should you try next?',
            options: [
              'Give up and move on',
              'Test for authentication bypass or default credentials',
              'Delete the directory',
              'Restart the web server'
            ],
            correctAnswer: 1,
            explanation: '403 means the resource exists. Next steps: test authentication mechanisms, check for default credentials, try privilege escalation, or look for alternate access paths.',
            category: 'analyst_reasoning',
            difficulty: 'medium',
          },
          {
            id: 8,
            question: 'What tool would you use to enumerate more directories?',
            options: ['nmap', 'gobuster', 'ssh', 'ping'],
            correctAnswer: 1,
            explanation: 'gobuster is a directory brute-forcing tool. Other options: ffuf, dirb, feroxbuster. These tools discover hidden endpoints not linked from the main site.',
            category: 'tooling',
            difficulty: 'easy',
          },
          {
            id: 9,
            question: 'Why might /backup show 404 even if it exists?',
            options: [
              'The directory is genuinely missing',
              'Access control rules may be hiding it',
              'The server is broken',
              'Backups cannot exist on web servers'
            ],
            correctAnswer: 1,
            explanation: '404 can be returned intentionally by access control rules to hide sensitive directories. Try variations: /backup.zip, /backup/, /backups, /old, /backup.tar.gz.',
            category: 'analyst_reasoning',
            difficulty: 'medium',
          },
          {
            id: 10,
            question: 'What OWASP Top 10 category does information disclosure via headers fall under?',
            options: [
              'Injection',
              'Security Misconfiguration',
              'Broken Authentication',
              'XSS'
            ],
            correctAnswer: 1,
            explanation: 'Information disclosure via verbose headers is a Security Misconfiguration. The server should not reveal unnecessary technical details that aid attackers.',
            category: 'web',
            difficulty: 'medium',
          },
        ],
      };
    } else if (difficulty === 'intermediate') {
      return {
        title: 'Network Intrusion Detection Analysis',
        description: 'Your SIEM has flagged suspicious network traffic. You have been assigned to investigate potential lateral movement and data exfiltration attempts.',
        context: `Firewall Log Snippet:
2024-03-15 14:23:45 ALLOW TCP 10.10.5.100:49823 -> 10.10.5.200:445 (SMB)
2024-03-15 14:24:12 ALLOW TCP 10.10.5.100:49824 -> 10.10.5.201:445 (SMB)
2024-03-15 14:24:38 ALLOW TCP 10.10.5.100:49825 -> 10.10.5.202:445 (SMB)
2024-03-15 14:25:05 BLOCK TCP 10.10.5.100:49826 -> 8.8.8.8:443 (HTTPS)
2024-03-15 14:25:11 ALLOW UDP 10.10.5.100:53 -> 10.10.1.10:53 (DNS)

IDS Alert:
Possible SMB Enumeration detected from 10.10.5.100`,
        questions: [
          {
            id: 1,
            question: 'What activity pattern is visible in the SMB connections?',
            options: [
              'Random network noise',
              'Sequential scanning of multiple hosts on port 445',
              'Normal file sharing',
              'Web browsing activity'
            ],
            correctAnswer: 1,
            explanation: 'The source (10.10.5.100) is connecting to sequential IPs (.200, .201, .202) on port 445 (SMB). This is characteristic of network enumeration or lateral movement attempts.',
            category: 'networking',
            difficulty: 'medium',
          },
          {
            id: 2,
            question: 'What does port 445 indicate?',
            options: ['HTTP traffic', 'SMB/CIFS file sharing', 'SSH connections', 'Email traffic'],
            correctAnswer: 1,
            explanation: 'Port 445 is used for SMB (Server Message Block) protocol, commonly used for file sharing in Windows networks. It is frequently targeted in lateral movement attacks.',
            category: 'networking',
            difficulty: 'easy',
          },
          {
            id: 3,
            question: 'Why was the connection to 8.8.8.8:443 blocked?',
            options: [
              'Random firewall error',
              'Potential data exfiltration attempt via external IP',
              '8.8.8.8 is malicious',
              'HTTPS is always blocked'
            ],
            correctAnswer: 1,
            explanation: '8.8.8.8 is a public IP (Google DNS). After internal SMB scanning, attempting to reach an external IP on HTTPS suggests potential C2 communication or data exfiltration.',
            category: 'defensive',
            difficulty: 'medium',
          },
          {
            id: 4,
            question: 'What should be your immediate next step?',
            options: [
              'Ignore it, SMB is normal',
              'Isolate 10.10.5.100 and investigate for compromise',
              'Block all SMB traffic',
              'Restart the firewall'
            ],
            correctAnswer: 1,
            explanation: 'Sequential SMB scanning followed by external connection attempts indicates potential compromise. Immediate containment (isolate host) prevents further lateral movement or data loss.',
            category: 'analyst_reasoning',
            difficulty: 'medium',
          },
          {
            id: 5,
            question: 'What tool might an attacker use for this SMB enumeration?',
            options: ['gobuster', 'crackmapexec or nmap', 'sqlmap', 'hydra on HTTP'],
            correctAnswer: 1,
            explanation: 'crackmapexec (or nxc) is commonly used for SMB enumeration and lateral movement. nmap with SMB scripts can also perform this scanning.',
            category: 'tooling',
            difficulty: 'medium',
          },
          {
            id: 6,
            question: 'The DNS query to 10.10.1.10 suggests what?',
            options: [
              'The host is compromised',
              'Normal internal name resolution',
              'Data exfiltration via DNS',
              'A DDoS attack'
            ],
            correctAnswer: 1,
            explanation: 'A single DNS query to an internal DNS server (10.10.1.10) is normal behavior. However, excessive DNS queries or queries to external DNS could indicate DNS tunneling.',
            category: 'networking',
            difficulty: 'medium',
          },
          {
            id: 7,
            question: 'What information would you want to collect from 10.10.5.100?',
            options: [
              'Nothing, just block it',
              'Running processes, network connections, user accounts, scheduled tasks',
              'Only the IP address',
              'The computer\'s color'
            ],
            correctAnswer: 1,
            explanation: 'Incident response requires collecting: running processes, persistence mechanisms (scheduled tasks, services), network connections, user activity, and memory dumps for forensic analysis.',
            category: 'defensive',
            difficulty: 'medium',
          },
          {
            id: 8,
            question: 'If this is lateral movement, what is the attacker likely trying to achieve?',
            options: [
              'Just testing the network',
              'Privilege escalation or accessing sensitive data on other hosts',
              'Fixing security issues',
              'Improving network performance'
            ],
            correctAnswer: 1,
            explanation: 'Lateral movement aims to escalate privileges, access sensitive systems (DCs, file servers), or establish persistence across the network before final objectives (data theft, ransomware).',
            category: 'analyst_reasoning',
            difficulty: 'medium',
          },
          {
            id: 9,
            question: 'What log source would provide the most detail about what 10.10.5.100 accessed?',
            options: [
              'Firewall logs only',
              'Windows Event Logs on the source and destination hosts',
              'Router logs',
              'Physical security logs'
            ],
            correctAnswer: 1,
            explanation: 'Windows Event Logs (Event ID 4624, 4625, 4688, 5140) show login attempts, process execution, and file share access. These provide detailed forensic evidence beyond firewall data.',
            category: 'defensive',
            difficulty: 'hard',
          },
          {
            id: 10,
            question: 'How would you determine if credentials were compromised?',
            options: [
              'Guess',
              'Check for failed login attempts, unusual login times, or use of service accounts from unexpected hosts',
              'Ask the user',
              'Reboot the computer'
            ],
            correctAnswer: 1,
            explanation: 'Credential compromise indicators: Event ID 4625 (failed logins), 4648 (explicit credentials), unusual login times/locations, service accounts used from workstations, or pass-the-hash evidence.',
            category: 'defensive',
            difficulty: 'hard',
          },
        ],
      };
    } else { // advanced
      return {
        title: 'Active Directory Privilege Escalation Investigation',
        description: 'A routine security audit has revealed suspicious Kerberos ticket requests and unusual privileged account activity. You must determine if privilege escalation occurred.',
        context: `PowerShell History Extract (user: bob):
Get-ADUser -Filter * -Properties ServicePrincipalName | Where {$_.ServicePrincipalName -ne $null}
Invoke-Kerberoast -OutputFormat Hashcat | Out-File hashes.txt
hashcat -m 13100 hashes.txt rockyou.txt

Windows Event Log (Domain Controller):
Event ID 4769: Kerberos TGS ticket requested
  Account Name: bob@corp.local
  Service Name: MSSQLSvc/db01.corp.local:1433
  Ticket Encryption: RC4-HMAC

Event ID 4672: Special privileges assigned to new logon
  Account: sqlsvc@corp.local
  Privileges: SeBackupPrivilege, SeRestorePrivilege`,
        questions: [
          {
            id: 1,
            question: 'What attack technique is Bob performing?',
            options: [
              'SQL Injection',
              'Kerberoasting',
              'Phishing',
              'DDoS'
            ],
            correctAnswer: 1,
            explanation: 'Kerberoasting targets service accounts with SPNs. Attackers request TGS tickets encrypted with service account passwords, then crack them offline. This is a common AD privilege escalation technique.',
            category: 'crypto',
            difficulty: 'hard',
          },
          {
            id: 2,
            question: 'What does the PowerShell command "Get-ADUser -Filter * -Properties ServicePrincipalName" reveal?',
            options: [
              'All user passwords',
              'Service accounts with SPNs (Kerberoasting targets)',
              'Deleted accounts',
              'Firewall rules'
            ],
            correctAnswer: 1,
            explanation: 'This enumerates service accounts with SPNs. Service accounts often have weak passwords and high privileges, making them prime Kerberoasting targets.',
            category: 'tooling',
            difficulty: 'hard',
          },
          {
            id: 3,
            question: 'What is hashcat mode 13100 used for?',
            options: [
              'MD5 hashes',
              'Kerberos 5 TGS-REP (Kerberoasting)',
              'NTLM hashes',
              'SHA256 hashes'
            ],
            correctAnswer: 1,
            explanation: 'Hashcat mode 13100 cracks Kerberos TGS-REP tickets. After extracting tickets with Invoke-Kerberoast, attackers use hashcat to brute-force the service account password offline.',
            category: 'crypto',
            difficulty: 'hard',
          },
          {
            id: 4,
            question: 'Why is RC4-HMAC encryption a concern?',
            options: [
              'It is uncrackable',
              'It is weaker and faster to crack than AES',
              'It encrypts everything',
              'It is the most secure option'
            ],
            correctAnswer: 1,
            explanation: 'RC4-HMAC is a legacy Kerberos encryption type, much weaker than AES. It is faster to crack with tools like hashcat. Modern domains should enforce AES encryption.',
            category: 'crypto',
            difficulty: 'hard',
          },
          {
            id: 5,
            question: 'What does Event ID 4769 indicate?',
            options: [
              'A user logged in',
              'A Kerberos service ticket (TGS) was requested',
              'A file was deleted',
              'The system rebooted'
            ],
            correctAnswer: 1,
            explanation: 'Event ID 4769 logs Kerberos TGS ticket requests. High volume requests or requests for many SPNs can indicate Kerberoasting attacks in progress.',
            category: 'defensive',
            difficulty: 'medium',
          },
          {
            id: 6,
            question: 'If Bob successfully cracked sqlsvc account, what can he do next?',
            options: [
              'Nothing, service accounts have no permissions',
              'Authenticate as sqlsvc and access resources it has rights to',
              'Delete the domain',
              'Change the Administrator password'
            ],
            correctAnswer: 1,
            explanation: 'Service accounts often have elevated privileges. With sqlsvc credentials, Bob can access databases, potentially find more credentials, or use privileges like SeBackupPrivilege for further escalation.',
            category: 'analyst_reasoning',
            difficulty: 'hard',
          },
          {
            id: 7,
            question: 'What do SeBackupPrivilege and SeRestorePrivilege allow?',
            options: [
              'Nothing useful',
              'Reading and writing any file on the system, bypassing ACLs',
              'Only backing up personal files',
              'Printing documents'
            ],
            correctAnswer: 1,
            explanation: 'These privileges bypass file ACLs, allowing reading/writing any file including SAM, SYSTEM, and NTDS.dit. Attackers use them to extract domain credentials.',
            category: 'os',
            difficulty: 'hard',
          },
          {
            id: 8,
            question: 'How would you detect Kerberoasting in progress?',
            options: [
              'It cannot be detected',
              'Monitor Event ID 4769 for high volume TGS requests with RC4 encryption from a single user',
              'Check for deleted files',
              'Look at DNS logs'
            ],
            correctAnswer: 1,
            explanation: 'Detection: Event ID 4769 spikes, unusual RC4 ticket requests, TGS requests for accounts the user does not normally access, or requests for many SPNs in a short time.',
            category: 'defensive',
            difficulty: 'hard',
          },
          {
            id: 9,
            question: 'What mitigation would prevent this attack?',
            options: [
              'Disable Kerberos entirely',
              'Use strong passwords for service accounts and enforce AES encryption',
              'Remove all service accounts',
              'Block PowerShell'
            ],
            correctAnswer: 1,
            explanation: 'Mitigations: strong (25+ char) service account passwords, gMSA (Group Managed Service Accounts), disable RC4, monitor for Kerberoasting, use AES-only encryption.',
            category: 'defensive',
            difficulty: 'hard',
          },
          {
            id: 10,
            question: 'What tool would you use to investigate this incident further?',
            options: [
              'Microsoft Word',
              'BloodHound to map AD attack paths and privilege relationships',
              'Photoshop',
              'Excel'
            ],
            correctAnswer: 1,
            explanation: 'BloodHound maps Active Directory relationships, showing attack paths from compromised accounts to Domain Admin. It visualizes privilege escalation opportunities and lateral movement paths.',
            category: 'tooling',
            difficulty: 'hard',
          },
        ],
      };
    }
  };

  const requestMentorGuidance = async () => {
    if (!examStore.activeExam) return;
    
    setShowMentor(true);
    
    const scenario = examStore.activeExam.scenarios[currentScenarioIndex];
    const question = scenario.questions[currentQuestionIndex];
    
    try {
      const ai = new DevvAI();
      
      const prompt = `You are an educational mentor helping a student with a SEC1 certification exam question.

QUESTION: ${question.question}

OPTIONS:
${question.options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}

CATEGORY: ${question.category}

RULES:
- Do NOT reveal the correct answer directly
- Guide the student by:
  * Narrowing the concept domain
  * Reminding them what to compare
  * Encouraging elimination logic
  * Clarifying what the question is testing
- Be educational but not robotic
- Help them think through the problem

Provide helpful guidance (2-3 sentences max):`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      });
      
      const guidance = response.choices[0]?.message?.content || 'Think about the key concept being tested here. Try to eliminate obviously wrong answers first.';
      
      setMentorGuidance(guidance);
      examStore.incrementHints();
      
    } catch (error) {
      console.error('Failed to get mentor guidance:', error);
      setMentorGuidance('Think about the key concept being tested. Try to eliminate obviously wrong answers first, then consider which remaining option best fits the scenario.');
    }
  };

  const submitAnswer = () => {
    if (selectedAnswer === null || !examStore.activeExam) return;
    
    const scenario = examStore.activeExam.scenarios[currentScenarioIndex];
    const question = scenario.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    examStore.answerQuestion(currentScenarioIndex, currentQuestionIndex, selectedAnswer, isCorrect);
    
    setIsAnswered(true);
    
    toast({
      title: isCorrect ? 'Correct!' : 'Incorrect',
      description: isCorrect ? 'Good reasoning!' : 'Review the explanation',
      variant: isCorrect ? 'default' : 'destructive',
    });
  };

  const nextQuestion = () => {
    if (!examStore.activeExam) return;
    
    const scenario = examStore.activeExam.scenarios[currentScenarioIndex];
    
    if (currentQuestionIndex < scenario.questions.length - 1) {
      // Next question in same scenario
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowMentor(false);
      setMentorGuidance('');
    } else if (currentScenarioIndex < examStore.activeExam.scenarios.length - 1) {
      // Next scenario
      setCurrentScenarioIndex(currentScenarioIndex + 1);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowMentor(false);
      setMentorGuidance('');
      
      toast({
        title: 'Scenario Complete',
        description: `Moving to scenario ${currentScenarioIndex + 2}`,
      });
    } else {
      // Exam complete
      examStore.completeExam(elapsedTime);
      navigate('/sec1-exam-results');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isGenerating) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">Generating SEC1 Exam</h2>
            <p className="text-muted-foreground mb-4">
              Creating realistic security analyst scenarios...
            </p>
            <Progress value={33} className="max-w-md mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examStore.activeExam) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-2">Exam Not Ready</h2>
            <p className="text-muted-foreground mb-4">
              Failed to load exam scenarios. Please try again.
            </p>
            <Button onClick={() => navigate('/')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scenario = examStore.activeExam.scenarios[currentScenarioIndex];
  const question = scenario.questions[currentQuestionIndex];
  const totalQuestions = examStore.activeExam.scenarios.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQuestions = examStore.activeExam.scenarios.reduce((sum, s, idx) => {
    if (idx < currentScenarioIndex) return sum + s.questions.length;
    if (idx === currentScenarioIndex) return sum + currentQuestionIndex + (isAnswered ? 1 : 0);
    return sum;
  }, 0);
  const progressPercentage = (answeredQuestions / totalQuestions) * 100;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              SEC1 Exam
            </h1>
            <p className="text-muted-foreground">Security Analyst Certification Training</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Clock className="w-4 h-4 mr-2" />
              {formatTime(elapsedTime)}
            </Badge>
            
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {answeredQuestions} / {totalQuestions}
            </Badge>
          </div>
        </div>
        
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Scenario Card */}
      <Card className="mb-6 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl mb-2">{scenario.title}</CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </div>
            <Badge variant="outline">
              Scenario {currentScenarioIndex + 1}/3
            </Badge>
          </div>
        </CardHeader>
        
        {scenario.context && (
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <p className="text-sm font-mono whitespace-pre-wrap">{scenario.context}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between mb-4">
            <CardTitle className="text-lg">
              Question {currentQuestionIndex + 1}/10
            </CardTitle>
            
            <div className="flex gap-2">
              <Badge variant={question.difficulty === 'easy' ? 'secondary' : question.difficulty === 'medium' ? 'default' : 'destructive'}>
                {question.difficulty}
              </Badge>
              <Badge variant="outline">{question.category}</Badge>
            </div>
          </div>
          
          <p className="text-base leading-relaxed">{question.question}</p>
        </CardHeader>
        
        <CardContent>
          <RadioGroup 
            value={selectedAnswer?.toString()} 
            onValueChange={(val) => setSelectedAnswer(parseInt(val))}
            disabled={isAnswered}
          >
            {question.options.map((option, idx) => (
              <div key={idx} className={`flex items-center space-x-2 p-4 rounded-lg border transition-colors ${
                isAnswered 
                  ? idx === question.correctAnswer 
                    ? 'bg-green-500/10 border-green-500/50' 
                    : idx === selectedAnswer 
                      ? 'bg-destructive/10 border-destructive/50' 
                      : 'bg-muted/30'
                  : 'hover:bg-muted/50'
              }`}>
                <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                <Label 
                  htmlFor={`option-${idx}`} 
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {isAnswered && idx === question.correctAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {isAnswered && idx === selectedAnswer && idx !== question.correctAnswer && (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
          
          {/* Mentor Guidance */}
          {!isAnswered && showMentor && mentorGuidance && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-500 mb-1">AI Mentor Guidance</p>
                  <p className="text-sm">{mentorGuidance}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Explanation (shown after answering) */}
          {isAnswered && (
            <div className="mt-6 p-4 bg-muted/50 border border-border rounded-lg">
              <p className="text-sm font-medium mb-2">📚 Explanation</p>
              <p className="text-sm leading-relaxed">{question.explanation}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="mt-6 flex items-center justify-between">
            {!isAnswered ? (
              <>
                <Button
                  variant="outline"
                  onClick={requestMentorGuidance}
                  disabled={showMentor}
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {showMentor ? 'Guidance Shown' : 'Request Guidance'}
                </Button>
                
                <Button
                  onClick={submitAnswer}
                  disabled={selectedAnswer === null}
                  size="lg"
                >
                  Submit Answer
                  <Target className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button
                onClick={nextQuestion}
                size="lg"
                className="ml-auto"
              >
                {currentQuestionIndex < scenario.questions.length - 1 
                  ? 'Next Question' 
                  : currentScenarioIndex < examStore.activeExam.scenarios.length - 1 
                    ? 'Next Scenario' 
                    : 'Finish Exam'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{examStore.activeExam.correctAnswers}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-2xl font-bold">{examStore.activeExam.incorrectAnswers}</p>
            <p className="text-xs text-muted-foreground">Incorrect</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Lightbulb className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{examStore.activeExam.hintsUsed}</p>
            <p className="text-xs text-muted-foreground">Hints Used</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
