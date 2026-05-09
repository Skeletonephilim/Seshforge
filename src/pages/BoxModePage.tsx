import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DevvAI } from '@devvai/devv-code-backend';
import { withAIRetry } from '@/lib/utils';
import { generateRealisticIP, generateDCIP, generateWebServerIP } from '@/lib/ip-generator';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Terminal,
  Flag,
  Clock,
  Server,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  Zap,
  Target,
  Eye,
  Lightbulb,
  MessageCircleQuestion,
  BookOpen,
  Send,
} from 'lucide-react';

interface Box {
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  skillsTested: string[];
  recommendedTools: string[];
  objective: string;
  targetIP: string;
  openPorts: string[];
  scenario: string;
  flags: {
    user: string;
    root: string;
  };
}

interface TeachingMoment {
  id: string;
  trigger: string;
  concept: string;
  category: 'OWASP' | 'PT1' | 'SEC0' | 'SEC1' | 'CIA' | 'Best Practice';
  message: string;
  timestamp: number;
}

export default function BoxModePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [box, setBox] = useState<Box | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<Array<{ command: string; output: string }>>([]);
  const [flagsFound, setFlagsFound] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [teachingMoments, setTeachingMoments] = useState<TeachingMoment[]>([]);
  const [lastCommandType, setLastCommandType] = useState<string>('');
  const [skippedRecon, setSkippedRecon] = useState(false);
  const [showCustomGenerator, setShowCustomGenerator] = useState(false);
  const [customBoxInput, setCustomBoxInput] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [showQAMode, setShowQAMode] = useState(false);
  const [qaBoxContext, setQaBoxContext] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isStarted) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0 
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addTeachingMoment = (trigger: string, concept: string, category: TeachingMoment['category'], message: string) => {
    const moment: TeachingMoment = {
      id: `${Date.now()}-${Math.random()}`,
      trigger,
      concept,
      category,
      message,
      timestamp: Date.now(),
    };
    setTeachingMoments(prev => [...prev, moment]);
  };

  const analyzeCommandForTeaching = (cmd: string, commandCount: number) => {
    const cmdLower = cmd.toLowerCase();

    // Check for skipped reconnaissance
    if (commandCount === 0 && !cmdLower.includes('nmap') && !cmdLower.includes('masscan')) {
      if (cmdLower.includes('gobuster') || cmdLower.includes('sqlmap') || cmdLower.includes('ssh')) {
        setSkippedRecon(true);
        addTeachingMoment(
          'Skipped Reconnaissance',
          'PT1 Methodology',
          'PT1',
          '⚠️ You jumped straight to exploitation without reconnaissance. PT1 methodology emphasizes: Recon → Scanning → Enumeration → Exploitation. Starting with nmap helps identify all attack surfaces and prevents missing critical services.'
        );
      }
    }

    // Nmap - Port scanning concepts
    if (cmdLower.includes('nmap')) {
      setLastCommandType('recon');
      if (cmdLower.includes('-p-')) {
        addTeachingMoment(
          'Full port scan',
          'Enumeration Best Practice',
          'Best Practice',
          '✅ Good! Scanning all 65535 ports (-p-) prevents missing non-standard services. Many boxes hide critical services on high ports (8080, 8443, 9000+).'
        );
      }
      if (!cmdLower.includes('-sv') && !cmdLower.includes('--version-detection')) {
        addTeachingMoment(
          'Missing service detection',
          'Enumeration Depth',
          'PT1',
          '💡 Consider adding -sV for service version detection. Knowing exact versions (Apache 2.4.41, OpenSSH 7.4) enables targeted exploit searches (searchsploit, CVE databases).'
        );
      }
    }

    // Web directory fuzzing
    if (cmdLower.includes('gobuster') || cmdLower.includes('ffuf') || cmdLower.includes('dirb')) {
      setLastCommandType('enum');
      addTeachingMoment(
        'Directory fuzzing',
        'OWASP A01: Broken Access Control',
        'OWASP',
        '🔍 Directory fuzzing discovers hidden endpoints that may lack authentication. OWASP A01 (Broken Access Control) - admins often forget to protect /admin, /config, /backup directories.'
      );
      
      if (cmdLower.includes('.git') || cmdLower.includes('git')) {
        addTeachingMoment(
          'Source code disclosure',
          'OWASP A05: Security Misconfiguration',
          'OWASP',
          '🎯 Excellent! Exposed .git directories leak entire source code history. Use git-dumper to reconstruct the repo and find hardcoded credentials, API keys, or logic flaws.'
        );
      }
    }

    // SQL injection testing
    if (cmdLower.includes('sqlmap') || (cmdLower.includes('sql') && cmdLower.includes('='))) {
      addTeachingMoment(
        'SQL Injection',
        'OWASP A03: Injection',
        'OWASP',
        '💉 SQL Injection (OWASP A03) bypasses authentication and extracts databases. Always test: login forms, search parameters, cookies. SQLi can lead to full database dumps, file reads (LOAD_FILE), and even RCE (xp_cmdshell, INTO OUTFILE).'
      );
    }

    // SSH brute force
    if (cmdLower.includes('hydra') && cmdLower.includes('ssh')) {
      addTeachingMoment(
        'SSH brute force',
        'CIA Triad: Availability',
        'CIA',
        '⚠️ Brute forcing SSH impacts Availability (CIA Triad). Real pentests avoid this unless authorized - account lockouts deny legitimate users. Try: credential reuse, default creds, SSH key leaks first.'
      );
    }

    // Privilege escalation enumeration
    if (cmdLower.includes('sudo -l') || cmdLower.includes('find') && cmdLower.includes('4000')) {
      addTeachingMoment(
        'Privilege escalation enum',
        'PT1: Post-Exploitation',
        'PT1',
        '🔓 Privilege escalation methodology: (1) sudo -l for NOPASSWD entries, (2) find SUID binaries, (3) kernel version (uname -r), (4) writable cron jobs, (5) PATH hijacking. GTFOBins is your bible for exploiting SUID/sudo binaries.'
      );
    }

    // Curl/wget without SSL verification
    if ((cmdLower.includes('curl') || cmdLower.includes('wget')) && cmdLower.includes('-k')) {
      addTeachingMoment(
        'SSL verification disabled',
        'CIA Triad: Integrity',
        'CIA',
        '🔐 Using -k (insecure) disables SSL certificate validation, risking Man-in-the-Middle attacks (CIA: Integrity). In real pentests, note this as a finding - apps trusting invalid certs are vulnerable to MITM.'
      );
    }

    // File upload testing
    if (cmdLower.includes('upload') || (cmdLower.includes('curl') && cmdLower.includes('-F'))) {
      addTeachingMoment(
        'File upload',
        'OWASP A04: Insecure Design',
        'OWASP',
        '📤 File upload vulnerabilities (OWASP A04) lead to RCE. Bypass techniques: (1) double extensions (.php.jpg), (2) MIME type spoofing, (3) magic byte manipulation, (4) case sensitivity (PHP vs php), (5) null byte injection.'
      );
    }

    // Password found in config/backup
    if ((cmdLower.includes('cat') || cmdLower.includes('grep')) && 
        (cmdLower.includes('config') || cmdLower.includes('backup') || cmdLower.includes('.env'))) {
      addTeachingMoment(
        'Credential hunting',
        'SEC0: Information Gathering',
        'SEC0',
        '🔑 Config files and backups are goldmines. SEC0 teaches: check config.php, .env, database.yml, wp-config.php, application.properties. Developers hardcode credentials in non-production files left on servers.'
      );
    }

    // Netcat reverse shell
    if (cmdLower.includes('nc') && (cmdLower.includes('-e') || cmdLower.includes('bash'))) {
      addTeachingMoment(
        'Reverse shell',
        'PT1: Initial Access',
        'PT1',
        '🐚 Reverse shells establish persistence after exploitation. PT1 tip: Always stabilize shells (python -c "import pty;pty.spawn(\'/bin/bash\')", export TERM=xterm, Ctrl+Z, stty raw -echo; fg) for proper TTY and command history.'
      );
    }

    // Checking /etc/passwd or /etc/shadow
    if (cmdLower.includes('/etc/passwd') || cmdLower.includes('/etc/shadow')) {
      addTeachingMoment(
        'Password file access',
        'SEC1: Linux Fundamentals',
        'SEC1',
        '👥 /etc/passwd lists all users. /etc/shadow contains password hashes (requires root). SEC1 teaches: (1) Identify service accounts, (2) Check for users with /bin/bash, (3) Crack hashes with John/Hashcat, (4) Note users in sudo/admin groups.'
      );
    }

    // Using searchsploit or exploitdb
    if (cmdLower.includes('searchsploit') || cmdLower.includes('exploit')) {
      addTeachingMoment(
        'Exploit research',
        'Best Practice: CVE Validation',
        'Best Practice',
        '🎯 Exploit research methodology: (1) searchsploit [software] [version], (2) Verify CVE applicability, (3) Read exploit code (understand before running), (4) Test in isolated environment first, (5) Document exploit path in report.'
      );
    }
  };

  const askQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim() || !qaBoxContext.trim() || isAnswering) return;

    const question = currentQuestion.trim();
    setCurrentQuestion('');
    setIsAnswering(true);

    try {
      const ai = new DevvAI();

      const prompt = `You are an expert penetration testing mentor with deep knowledge of:
- PT1 (Junior Penetration Tester) certification requirements
- OWASP Top 10 vulnerabilities
- PTES methodology (Reconnaissance, Scanning, Enumeration, Exploitation, Post-Exploitation)
- Linux and Windows privilege escalation techniques
- Active Directory attacks (Kerberoasting, AS-REP Roasting, BloodHound)
- Web application testing (SQLi, XSS, LFI, RCE, file upload bypasses)
- Network enumeration (nmap, gobuster, nikto, etc.)
- Practical command syntax for Kali/BlackArch tools

BOX CONTEXT:
${qaBoxContext}

PREVIOUS Q&A HISTORY:
${qaHistory.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')}

CURRENT QUESTION:
${question}

YOUR TASK:
Provide a comprehensive, practical answer that:

1. **Direct Answer** - Answer the question clearly and completely
2. **PT1 Context** - Connect to PT1 certification requirements when relevant
3. **Practical Syntax** - Show exact command syntax with flag explanations
4. **Methodology** - Explain where this fits in PTES/OWASP/PT1 methodology
5. **Common Pitfalls** - Warn about common mistakes
6. **Tool Alternatives** - Suggest alternative tools (Kali vs BlackArch equivalents)
7. **Next Steps** - What to do after this step

RESPONSE STRUCTURE:
## Direct Answer
[Clear, concise answer to the question]

## Practical Commands
\`\`\`bash
# Example commands with explanations
command --flag value  # what this does
\`\`\`

## Methodology Context
[How this fits into PT1/PTES/OWASP frameworks]

## Common Mistakes
- [Pitfall 1]
- [Pitfall 2]

## Alternative Approaches
[Other tools/methods to achieve the same goal]

## Next Steps
[What to do after this - logical progression]

Be comprehensive but concise. Focus on practical, actionable information.`;

      const response = await withAIRetry(() =>
        ai.chat.completions.create({
          model: 'kimi-k2-0711-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        })
      );

      const answer = response.choices[0]?.message?.content || 'No answer generated';
      
      setQaHistory(prev => [...prev, { question, answer }]);

      toast({
        title: 'Answer Generated',
        description: 'AI mentor has answered your question',
      });

    } catch (error) {
      console.error('Q&A error:', error);
      setQaHistory(prev => [...prev, {
        question,
        answer: 'Error: Failed to generate answer. Please try again.',
      }]);
      toast({
        title: 'Answer Failed',
        description: 'Could not generate answer',
        variant: 'destructive',
      });
    } finally {
      setIsAnswering(false);
    }
  };

  const generateCustomBox = async () => {
    if (!customBoxInput.trim()) {
      toast({
        title: 'Input Required',
        description: 'Provide a box name, writeup, or description to analyze',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingCustom(true);
    setFlagsFound([]);
    setCommandHistory([]);
    setElapsedTime(0);
    setIsStarted(false);

    try {
      const ai = new DevvAI();

      const prompt = `You are an advanced Offensive Security Scenario Generator AI.

ANALYZE THIS SOURCE BOX AND CREATE AN ORIGINAL INSPIRED SCENARIO:

${customBoxInput}

CRITICAL RULES:
1. Extract core mechanics: vulnerabilities, attack chain, technologies, misconfigurations, privesc vectors
2. Generate COMPLETELY ORIGINAL box inspired by those mechanics
3. DO NOT reuse: same IP structure, same directory names, same usernames/passwords, same flags, same exact exploits
4. Mutate logic, change context, recombine vulnerabilities

OUTPUT STRUCTURE (RETURN ONLY VALID JSON):
{
  "title": "Original box name (2-3 words)",
  "difficulty": "easy|medium|hard",
  "description": "Brief 1-2 line description",
  "scenario": "Realistic environment description (company/infra/context, NOT CTF-ish)",
  "skillsTested": ["skill1", "skill2"],
  "technologies": ["Apache", "Node.js", "PHP", "AD", "etc"],
  "targetIP": "Generate realistic IP (172.16.x.x or 10.129.x.x or 192.168.x.x style)",
  "openPorts": ["PORT/protocol - SERVICE (VERSION)"],
  "attackSurface": "Brief description of exposed services",
  "enumerationPhase": "What should be discovered (subtle hints, NOT solutions)",
  "initialFoothold": "Vulnerability type (LFI, SSTI, weak auth, exposed file) - HOW IT BEHAVES, NOT direct exploit",
  "postExploitation": "Internal enumeration steps (linpeas, sudo -l, configs)",
  "privilegeEscalation": "Realistic privesc (sudo misconfig, SUID, cron, PATH, writable service, kernel)",
  "flags": {
    "user": "CTF{context_relevant_flag}",
    "root": "CTF{context_relevant_flag}"
  },
  "recommendedTools": ["tool1", "tool2"],
  "objective": "Clear objective"
}

TRANSFORMATION STRATEGY:
- Extract pattern like: "LFI → creds → SSH → sudo misconfig"
- Transform into: different vuln type OR entry point, different service, different chaining logic
- Example: "Exposed backup → config leak → API token → remote access"

Ensure:
- Feels like professional box quality
- Solvable with real methodology
- Trains PT1/eJPT/OSCP mindset
- ORIGINAL and not traceable to source`;

      const response = await withAIRetry(() =>
        ai.chat.completions.create({
          model: 'kimi-k2-0711-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.95,
          max_tokens: 1500,
        })
      );

      const content = response.choices[0]?.message?.content || '{}';
      console.log('[BoxMode] Custom AI Response:', content.substring(0, 500));

      let boxData: any;
      try {
        boxData = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/```json?\s*({[\s\S]*?})\s*```/) || content.match(/({[\s\S]*})/);
        if (jsonMatch) {
          boxData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No valid JSON found');
        }
      }

      if (!boxData.title || !boxData.openPorts || !boxData.flags) {
        throw new Error('Missing required fields');
      }

      const newBox: Box = {
        title: boxData.title,
        difficulty: (boxData.difficulty || 'medium') as any,
        description: boxData.description || '',
        skillsTested: boxData.skillsTested || [],
        recommendedTools: boxData.recommendedTools || [],
        objective: boxData.objective || 'Find user.txt and root.txt flags',
        targetIP: boxData.targetIP || generateRealisticIP(),
        openPorts: boxData.openPorts || [],
        scenario: boxData.scenario || '',
        flags: boxData.flags || { user: 'CTF{user}', root: 'CTF{root}' },
      };

      setBox(newBox);
      setShowCustomGenerator(false);
      setCustomBoxInput('');

      toast({
        title: 'Custom Box Generated',
        description: `${newBox.title} - Inspired by your input`,
      });

    } catch (error) {
      console.error('Custom generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate custom box',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  const generateBox = async (difficulty: string) => {
    setIsGenerating(true);
    setFlagsFound([]);
    setCommandHistory([]);
    setElapsedTime(0);
    setIsStarted(false);
    
    try {
      const ai = new DevvAI();
      
      const prompt = `You are a realistic pentesting box generator for practice.

Generate a realistic ${difficulty} difficulty box.

CRITICAL: Return ONLY valid JSON (no markdown blocks):
{
  "title": "Box Name (2-3 words)",
  "description": "Brief 1-2 line description",
  "skillsTested": ["skill1", "skill2", "skill3"],
  "recommendedTools": ["tool1", "tool2", "tool3"],
  "objective": "Find user.txt and root.txt flags",
  "targetIP": "Generate realistic IP (172.16.x.x or 10.129.x.x or 192.168.x.x style)",
  "openPorts": ["22/tcp - SSH (OpenSSH 7.4)", "80/tcp - HTTP (Apache 2.4.41)", "3306/tcp - MySQL 5.7"],
  "scenario": "2-3 sentence realistic pentest scenario",
  "flags": {
    "user": "THM{user_flag_here}",
    "root": "THM{root_flag_here}"
  }
}

DIFFICULTY GUIDELINES:
- easy: 2-3 open ports, basic web vulns (SQLi, directory traversal), obvious privesc
- medium: 3-4 ports, hidden directories, credential hunting, sudo misconfig
- hard: 4-5 ports, exploit chaining, kernel exploits, lateral movement

REALISTIC SERVICES:
- Web: Apache, nginx, Tomcat, Node.js, PHP, Python
- Database: MySQL, PostgreSQL, MongoDB
- Remote: SSH, RDP, SMB, FTP
- Other: LDAP, SMTP, DNS

Make it coherent and realistic!`;

      const response = await withAIRetry(() =>
        ai.chat.completions.create({
          model: 'kimi-k2-0711-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9,
          max_tokens: 800,
        })
      );

      const content = response.choices[0]?.message?.content || '{}';
      console.log('[BoxMode] AI Response:', content.substring(0, 500));

      let boxData: any;
      try {
        boxData = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/```json?\s*({[\s\S]*?})\s*```/) || content.match(/({[\s\S]*})/);
        if (jsonMatch) {
          boxData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No valid JSON found');
        }
      }

      if (!boxData.title || !boxData.openPorts || !boxData.flags) {
        throw new Error('Missing required fields');
      }

      const newBox: Box = {
        title: boxData.title,
        difficulty: difficulty as any,
        description: boxData.description,
        skillsTested: boxData.skillsTested || [],
        recommendedTools: boxData.recommendedTools || [],
        objective: boxData.objective || 'Find user.txt and root.txt flags',
        targetIP: boxData.targetIP || generateRealisticIP(),
        openPorts: boxData.openPorts || [],
        scenario: boxData.scenario || '',
        flags: boxData.flags || { user: 'THM{user}', root: 'THM{root}' },
      };

      setBox(newBox);
      
      toast({
        title: 'Box Generated',
        description: `${newBox.title} - ${difficulty} difficulty`,
      });

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate box',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startBox = () => {
    setIsStarted(true);
    setElapsedTime(0);
    commandInputRef.current?.focus();
    
    toast({
      title: 'Box Started',
      description: 'Timer started - good luck!',
    });
  };

  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCommand.trim() || !box || isExecuting) return;

    const cmd = currentCommand.trim();
    setIsExecuting(true);
    setCurrentCommand('');

    // Analyze command for teaching moments BEFORE execution
    analyzeCommandForTeaching(cmd, commandHistory.length);

    try {
      const ai = new DevvAI();
      
      // Check for flag capture first
      let output = '';
      let flagCaptured = false;
      
      if (cmd.toLowerCase().includes('cat') && (cmd.includes('user.txt') || cmd.includes('/home'))) {
        if (!flagsFound.includes('user')) {
          output = box.flags.user;
          setFlagsFound(prev => [...prev, 'user']);
          flagCaptured = true;
          
          // Teaching moment on first flag
          addTeachingMoment(
            'First flag captured',
            'PT1: Objective Achievement',
            'PT1',
            '🎯 User flag captured! In real pentests, document: (1) How you gained access, (2) All enumeration steps, (3) Exploits used, (4) Proof (screenshots/commands). user.txt proves low-privilege access.'
          );
          
          toast({
            title: '🎯 User Flag Captured!',
            description: 'Flag 1/2 found!',
          });
        } else {
          output = box.flags.user;
        }
      } else if (cmd.toLowerCase().includes('cat') && (cmd.includes('root.txt') || cmd.includes('/root'))) {
        if (!flagsFound.includes('root')) {
          output = box.flags.root;
          setFlagsFound(prev => [...prev, 'root']);
          flagCaptured = true;
          
          // Teaching moment on root flag
          addTeachingMoment(
            'Root flag captured',
            'PT1: Privilege Escalation Success',
            'PT1',
            '🎉 Root flag captured! Box completed. In your report, detail: (1) Full privilege escalation path, (2) Vulnerability that enabled root access, (3) Risk rating (Critical - full system compromise), (4) Remediation steps. This is your PT1 climax moment.'
          );
          
          toast({
            title: '🎉 Root Flag Captured!',
            description: 'Box completed! Both flags found!',
          });
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          output = box.flags.root;
        }
      } else {
        // Simulate realistic tool output
        const prompt = `Simulate realistic pentesting tool output for this command on ${box.targetIP}.

COMMAND: ${cmd}

BOX CONTEXT:
- IP: ${box.targetIP}
- Open Ports: ${box.openPorts.join(', ')}
- Scenario: ${box.scenario}

Generate realistic output (max 30 lines). For enumeration, include:
- nmap: show ports from openPorts
- gobuster/dirb: common web paths (/admin, /backup, /config, /uploads, /.git, robots.txt)
- nikto/curl: basic HTTP info
- SSH/MySQL: auth prompts or connection refused
- sudo -l: show NOPASSWD entries or password prompt
- find SUID: show some binaries

Be realistic - some things should fail.`;

        const response = await withAIRetry(() =>
          ai.chat.completions.create({
            model: 'kimi-k2-0711-preview',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 600,
          })
        );

        output = response.choices[0]?.message?.content || 'Command executed';
      }

      setCommandHistory(prev => [...prev, { command: cmd, output }]);

    } catch (error) {
      console.error('Execute error:', error);
      setCommandHistory(prev => [...prev, { 
        command: cmd, 
        output: 'Error: Command execution failed' 
      }]);
    } finally {
      setIsExecuting(false);
      commandInputRef.current?.focus();
    }
  };

  const resetBox = () => {
    setIsStarted(false);
    setElapsedTime(0);
    setCommandHistory([]);
    setFlagsFound([]);
    setShowWalkthrough(false);
    setTeachingMoments([]);
    setLastCommandType('');
    setSkippedRecon(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const difficulties = [
    { name: 'Easy', value: 'easy', color: 'text-green-500', icon: Zap },
    { name: 'Medium', value: 'medium', color: 'text-amber-500', icon: Target },
    { name: 'Hard', value: 'hard', color: 'text-red-500', icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-gradient-primary">Box Mode</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Realistic Pentesting Boxes — Offline-Compatible, No VPN Required
            </p>
          </div>
          
          <Button variant="outline" onClick={() => navigate('/')}>
            <FileText className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Difficulty Selection */}
      {!box && (
        <div className="space-y-4">
          {/* Custom Box Generator */}
          <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                Custom Box Generator
              </CardTitle>
              <CardDescription>
                Analyze a box (name, writeup, or description) and generate an original scenario inspired by its mechanics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!showCustomGenerator ? (
                <Button
                  onClick={() => setShowCustomGenerator(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Create Custom Box
                </Button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Enter Box Name, Writeup, or Description
                    </label>
                    <textarea
                      value={customBoxInput}
                      onChange={(e) => setCustomBoxInput(e.target.value)}
                      placeholder="Example:
• Box name: 'Lame'
• Writeup URL or full text
• Description: 'Linux box with Samba 3.0.20, vulnerable to CVE-2007-2447...'

The AI will extract core mechanics and generate an ORIGINAL box."
                      className="w-full h-48 p-3 bg-background border border-input rounded font-mono text-sm resize-none"
                      disabled={isGeneratingCustom}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={generateCustomBox}
                      disabled={isGeneratingCustom || !customBoxInput.trim()}
                      className="flex-1"
                    >
                      {isGeneratingCustom ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing & Generating...
                        </>
                      ) : (
                        <>
                          <Target className="w-4 h-4 mr-2" />
                          Generate Original Box
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowCustomGenerator(false);
                        setCustomBoxInput('');
                      }}
                      variant="outline"
                      disabled={isGeneratingCustom}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Standard Difficulty Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Or Generate Random Box</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {difficulties.map((diff) => (
                <Card
                  key={diff.value}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => !isGenerating && generateBox(diff.value)}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <diff.icon className={`w-12 h-12 ${diff.color}`} />
                      <h3 className="font-semibold text-lg">{diff.name}</h3>
                      <Button size="sm" disabled={isGenerating} className="w-full">
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Server className="w-4 h-4 mr-2" />
                            Generate Box
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Box */}
      {box && (
        <div className="space-y-4">
          {/* Box Header */}
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-6 h-6" />
                    <CardTitle className="text-2xl">{box.title}</CardTitle>
                    <Badge variant={
                      box.difficulty === 'easy' ? 'secondary' :
                      box.difficulty === 'medium' ? 'default' : 'destructive'
                    }>
                      {box.difficulty.toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription>{box.description}</CardDescription>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {isStarted && (
                    <div className="flex items-center gap-2 text-2xl font-mono font-bold">
                      <Clock className="w-6 h-6 text-primary" />
                      {formatTime(elapsedTime)}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5" />
                    <span className="font-mono font-bold">
                      {flagsFound.length} / 2 flags
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Skills Tested</p>
                  <div className="flex flex-wrap gap-1">
                    {box.skillsTested.map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Recommended Tools</p>
                  <div className="flex flex-wrap gap-1">
                    {box.recommendedTools.map((tool, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tool}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Target</p>
                  <p className="font-mono font-bold">{box.targetIP}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Scenario</p>
                <p className="text-sm">{box.scenario}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Open Ports</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {box.openPorts.map((port, i) => (
                    <div key={i} className="bg-muted/30 px-3 py-1.5 rounded font-mono text-xs">
                      {port}
                    </div>
                  ))}
                </div>
              </div>

              {!isStarted && (
                <Button onClick={startBox} className="w-full" size="lg">
                  <Zap className="w-4 h-4 mr-2" />
                  Start Box
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Terminal */}
          {isStarted && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Terminal — {box.targetIP}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowWalkthrough(!showWalkthrough)}>
                      <Eye className="w-4 h-4 mr-2" />
                      {showWalkthrough ? 'Hide' : 'Show'} Walkthrough
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetBox}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Command History */}
                {commandHistory.length > 0 && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {commandHistory.map((entry, i) => (
                      <div key={i} className="space-y-1">
                        <div className="font-mono text-sm text-primary">
                          $ {entry.command}
                        </div>
                        <div className="bg-muted/50 p-3 rounded font-mono text-xs whitespace-pre-wrap">
                          {entry.output}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Teaching Moments */}
                {teachingMoments.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lightbulb className="w-4 h-4" />
                      <span>Learning Insights</span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {teachingMoments.slice(-5).reverse().map((moment) => (
                        <div
                          key={moment.id}
                          className={`p-3 rounded-lg border ${
                            moment.category === 'OWASP'
                              ? 'bg-red-500/10 border-red-500/30'
                              : moment.category === 'PT1'
                              ? 'bg-blue-500/10 border-blue-500/30'
                              : moment.category === 'CIA'
                              ? 'bg-purple-500/10 border-purple-500/30'
                              : moment.category === 'SEC0' || moment.category === 'Best Practice'
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-amber-500/10 border-amber-500/30'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    moment.category === 'OWASP'
                                      ? 'border-red-500/50 text-red-500'
                                      : moment.category === 'PT1'
                                      ? 'border-blue-500/50 text-blue-500'
                                      : moment.category === 'CIA'
                                      ? 'border-purple-500/50 text-purple-500'
                                      : 'border-green-500/50 text-green-500'
                                  }`}
                                >
                                  {moment.category}
                                </Badge>
                                <span className="text-xs font-semibold">{moment.concept}</span>
                              </div>
                              <p className="text-xs leading-relaxed">{moment.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Command Input */}
                <form onSubmit={executeCommand} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      ref={commandInputRef}
                      type="text"
                      value={currentCommand}
                      onChange={(e) => setCurrentCommand(e.target.value)}
                      placeholder="$ type command..."
                      className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded font-mono text-sm"
                      disabled={isExecuting}
                    />
                  </div>
                  <Button type="submit" disabled={isExecuting || !currentCommand.trim()}>
                    {isExecuting ? 'Executing...' : 'Execute'}
                  </Button>
                </form>

                {/* Flags Status */}
                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    {flagsFound.includes('user') ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-mono">user.txt</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {flagsFound.includes('root') ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-mono">root.txt</span>
                  </div>
                  {flagsFound.length === 2 && (
                    <Badge variant="default" className="ml-auto">
                      BOX COMPLETED!
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Walkthrough (Spoilers) */}
          {showWalkthrough && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Lightbulb className="w-5 h-5" />
                  Walkthrough (Spoilers!)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Attack Path</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Run nmap scan: <code className="bg-muted px-2 py-0.5 rounded">nmap -sV {box.targetIP}</code></li>
                    <li>Enumerate web server: <code className="bg-muted px-2 py-0.5 rounded">gobuster dir -u http://{box.targetIP} -w /usr/share/wordlists/dirb/common.txt</code></li>
                    <li>Check discovered directories for credentials or vulnerabilities</li>
                    <li>Gain initial access via exploit or credential reuse</li>
                    <li>Find user flag: <code className="bg-muted px-2 py-0.5 rounded">find / -name user.txt 2{'>'}dev/null</code></li>
                    <li>Enumerate for privesc: <code className="bg-muted px-2 py-0.5 rounded">sudo -l</code> or <code className="bg-muted px-2 py-0.5 rounded">find / -perm -4000 2{'>'}dev/null</code></li>
                    <li>Escalate to root via SUID binary, sudo misconfiguration, or kernel exploit</li>
                    <li>Find root flag: <code className="bg-muted px-2 py-0.5 rounded">cat /root/root.txt</code></li>
                  </ol>
                </div>

                <div className="p-3 bg-destructive/10 rounded border border-destructive/30">
                  <p className="text-sm text-destructive">
                    <strong>Flags:</strong> user.txt = {box.flags.user} | root.txt = {box.flags.root}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
