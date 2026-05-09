import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, Target, FileText, PlayCircle, Skull } from 'lucide-react';
import { useExamSessionStore } from '@/store/exam-session-store';
import { DevvAI } from '@devvai/devv-code-backend';
import { generateRealisticIP, generateDCIP, generateWebServerIP } from '@/lib/ip-generator';
import { useToast } from '@/hooks/use-toast';
import { generateHardModeScenario, getScenarioSummary } from '@/lib/pt1-hard-mode-generator';

export default function PT1ExamConfigPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const startExam = useExamSessionStore(state => state.startExam);
  const [selectedDuration, setSelectedDuration] = useState<number>(240);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'standard' | 'hard'>('standard');
  const [isGenerating, setIsGenerating] = useState(false);

  const durationOptions = [
    { value: 180, label: '3 Hours', description: 'Accelerated exam pace' },
    { value: 240, label: '4 Hours', description: 'Recommended for most candidates' },
    { value: 300, label: '5 Hours', description: 'Extended time for thoroughness' },
    { value: 360, label: '6 Hours', description: 'Maximum exam duration' },
  ];

  const handleStartExam = async () => {
    setIsGenerating(true);

    try {
      let scenario: any;
      
      // HARD MODE: Use deterministic complex generator
      if (selectedDifficulty === 'hard') {
        console.log('[PT1Exam] HARD MODE selected - using complex scenario generator');
        
        const hardScenario = generateHardModeScenario();
        
        // Log internal solution for debugging (NOT shown to user)
        console.log('[PT1Exam] Internal Solution:', hardScenario.internalSolution);
        console.log('[PT1Exam] Scenario Summary:', getScenarioSummary(hardScenario));
        
        // Remove internal solution before passing to exam
        const { internalSolution, ...scenarioForExam } = hardScenario;
        scenario = scenarioForExam;
        
        startExam('PT1', scenario, selectedDuration);
        
        toast({
          title: '🔥 PT1 HARD MODE Exam Started',
          description: `Target: ${scenario.targetIP} | ${selectedDuration / 60}h | EXTREME difficulty - multiple dead-ends guaranteed`,
          duration: 7000,
        });
        
        navigate('/pt1-exam');
        setIsGenerating(false);
        return;
      }
      
      // STANDARD MODE: Use AI generation (existing logic)
      const ai = new DevvAI();
      
      // STEP 1: Randomly select target type (33% each)
      const targetTypes = ['linux_web', 'mixed', 'active_directory'] as const;
      const selectedType = targetTypes[Math.floor(Math.random() * targetTypes.length)];
      
      console.log('[PT1Exam] Selected target type:', selectedType);
      
      // STEP 2: Type-specific prompts with MANDATORY service requirements
      let prompt = '';
      
      if (selectedType === 'linux_web') {
        prompt = `Generate a realistic PT1 exam scenario for a **Linux Web/DevOps target**.

⚠️ CRITICAL REQUIREMENTS:

MANDATORY SERVICES (must be included):
- Port 22: SSH (OpenSSH 7.x-8.x on Debian/Ubuntu/CentOS)
- Port 80: HTTP (nginx 1.14+ OR Apache 2.4+)

OPTIONAL SERVICES (choose 2-3):
- Port 443: HTTPS (nginx/Apache with SSL)
- Port 3000: Gitea / Gogs / Node.js app
- Port 3306: MySQL 5.7+
- Port 5432: PostgreSQL 12+
- Port 8080: Apache Tomcat / Jenkins
- Port 8443: HTTPS alternative port

FORBIDDEN SERVICES (DO NOT include):
- NO Windows services (NO RDP 3389, NO WinRM 5985)
- NO Active Directory ports (NO 88 Kerberos, NO 389 LDAP, NO 636 LDAPS)
- NO SMB 445 (use NFS if network storage needed)

TARGET CHARACTERISTICS:
- OS: Linux (Debian 9-11, Ubuntu 18.04-22.04, CentOS 7-8)
- Environment: Web development / DevOps / CI/CD
- Attack surface: Web vulnerabilities, service exploitation, credential reuse, privilege escalation

Respond ONLY with valid JSON:
{
  "targetIP": "Generate realistic IP (172.16.x.x or 10.129.x.x format)",
  "difficulty": "intermediate",
  "targetType": "linux_web",
  "description": "Linux web server with developer tools and potential misconfigurations",
  "openPorts": [
    "22/tcp - SSH (OpenSSH 8.2p1 Ubuntu)",
    "80/tcp - HTTP (nginx 1.18.0)",
    "3000/tcp - Gitea 1.15.3",
    "8080/tcp - Apache Tomcat 9.0.50"
  ],
  "currentPhase": "reconnaissance",
  "osInfo": "Linux 4.15 (Ubuntu 18.04 LTS)"
}`;
      } else if (selectedType === 'mixed') {
        prompt = `Generate a realistic PT1 exam scenario for a **Mixed Environment** (Linux + Windows services but NOT full Active Directory).

⚠️ CRITICAL REQUIREMENTS:

MANDATORY SERVICES (must be included):
- Port 22: SSH (OpenSSH on Linux)
- Port 80 OR 443: HTTP/HTTPS (nginx/Apache/IIS)
- Port 445: SMB (Microsoft-DS file sharing)

OPTIONAL SERVICES (choose 2-3):
- Port 139: NetBIOS Session Service
- Port 3306: MySQL
- Port 3389: RDP (Windows Remote Desktop)
- Port 5985: WinRM (Windows Remote Management)
- Port 8080: Tomcat / Jenkins

FORBIDDEN SERVICES (DO NOT include):
- NO Kerberos (88) - this would make it full AD
- NO LDAP (389/636) - this would make it full AD
- NO DNS (53) on same host

TARGET CHARACTERISTICS:
- OS: Mixed (Linux primary + Windows SMB/RDP services)
- Environment: Hybrid infrastructure with file sharing
- Attack surface: Web + SMB enumeration + credential reuse + lateral movement

Respond ONLY with valid JSON:
{
  "targetIP": "Generate realistic IP (172.16.x.x or 10.129.x.x format)",
  "difficulty": "intermediate",
  "targetType": "mixed",
  "description": "Hybrid Linux/Windows environment with SMB file sharing and web services",
  "openPorts": [
    "22/tcp - SSH (OpenSSH 8.2p1)",
    "80/tcp - HTTP (Apache 2.4.41)",
    "139/tcp - NetBIOS (NetBIOS Session Service)",
    "445/tcp - SMB (Microsoft-DS)",
    "3306/tcp - MySQL 5.7.33"
  ],
  "currentPhase": "reconnaissance",
  "osInfo": "Mixed (Linux + Windows services)"
}`;
      } else {
        // active_directory
        prompt = `Generate a realistic PT1 exam scenario for an **Active Directory Domain Controller**.

⚠️ CRITICAL REQUIREMENTS:

MANDATORY AD SERVICES (must ALL be included):
- Port 88: Kerberos (Microsoft Kerberos 5)
- Port 389: LDAP (Active Directory Lightweight Directory Services)
- Port 445: SMB (Microsoft-DS)

HIGHLY RECOMMENDED SERVICES (include at least 3):
- Port 53: DNS (Microsoft DNS 6.1+)
- Port 135: RPC (Microsoft RPC Endpoint Mapper)
- Port 139: NetBIOS (NetBIOS Session Service)
- Port 464: Kerberos Password Change
- Port 636: LDAPS (LDAP over SSL)
- Port 3268: Global Catalog (LDAP)
- Port 3269: Global Catalog SSL
- Port 5985: WinRM (Windows Remote Management)

DOMAIN CONFIGURATION (required):
- Domain name: corp.local / internal.local / company.local / enterprise.local
- DC hostname: DC01 / DC-SERVER / ADDC / DC1
- Service accounts: sqlservice, webadmin, backupuser, svcaccount (for Kerberoasting practice)

FORBIDDEN SERVICES (DO NOT include):
- NO Linux-only services (NO SSH 22, NO nginx)
- NO non-Windows web servers (use IIS 80/443 if web needed)

TARGET CHARACTERISTICS:
- OS: Windows Server 2016/2019/2022 (Domain Controller role)
- Environment: Enterprise Active Directory domain
- Attack surface: Kerberoasting, LDAP enumeration, SMB relay, Pass-the-Hash, DCSync

Respond ONLY with valid JSON:
{
  "targetIP": "Generate realistic IP for Domain Controller (10.172.x.10 or 172.16.x.10 format)",
  "difficulty": "intermediate",
  "targetType": "active_directory",
  "description": "Windows Server 2019 Active Directory Domain Controller (corp.local)",
  "openPorts": [
    "53/tcp - DNS (Microsoft DNS 6.1.7601)",
    "88/tcp - Kerberos (Microsoft Kerberos 5)",
    "135/tcp - RPC (Microsoft RPC Endpoint Mapper)",
    "139/tcp - NetBIOS (NetBIOS Session Service)",
    "389/tcp - LDAP (Active Directory LDAP)",
    "445/tcp - SMB (Microsoft-DS)",
    "464/tcp - Kerberos Password Change",
    "3268/tcp - Global Catalog (LDAP)",
    "5985/tcp - WinRM (Microsoft WinRM 2.0)"
  ],
  "currentPhase": "reconnaissance",
  "osInfo": "Windows Server 2019 (Build 17763)",
  "domainInfo": {
    "domainName": "corp.local",
    "dcHostname": "DC01",
    "users": ["administrator", "sqlservice", "webadmin", "backupuser", "svcaccount"],
    "spnAccounts": ["sqlservice", "webadmin"]
  }
}`;
      }

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          { role: 'system', content: `You are a PT1 certification exam generator. Generate realistic scenarios that match real-world pentesting targets. Respond ONLY with valid JSON matching the exact format specified.` },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const content = response.choices[0].message.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const scenario = JSON.parse(jsonMatch[0]);
        
        // STEP 3: Validate scenario matches expected type
        const ports = scenario.openPorts.map((p: string) => parseInt(p.split('/')[0]));
        let isValid = false;
        
        if (selectedType === 'active_directory') {
          isValid = ports.includes(88) && ports.includes(389) && ports.includes(445);
          if (!isValid) {
            console.warn('[PT1Exam] AD scenario invalid - missing required AD ports (88, 389, 445)');
          }
        } else if (selectedType === 'linux_web') {
          isValid = (ports.includes(22) && (ports.includes(80) || ports.includes(443))) &&
                   !ports.includes(88) && !ports.includes(389);
          if (!isValid) {
            console.warn('[PT1Exam] Linux web scenario invalid - missing SSH/HTTP or has AD ports');
          }
        } else {
          isValid = (ports.includes(80) || ports.includes(443)) && 
                   ports.includes(445) && 
                   !ports.includes(88);
          if (!isValid) {
            console.warn('[PT1Exam] Mixed scenario invalid - missing HTTP/SMB or has Kerberos');
          }
        }
        
        if (!isValid) {
          throw new Error(`Generated scenario doesn't match selected type: ${selectedType}`);
        }
        
        console.log('[PT1Exam] Scenario validated successfully:', {
          type: selectedType,
          ports: ports.join(', '),
          target: scenario.targetIP,
        });
        
        startExam('PT1', scenario, selectedDuration);
        
        toast({
          title: `PT1 Exam Started - ${selectedType === 'active_directory' ? 'Active Directory' : selectedType === 'linux_web' ? 'Linux Web' : 'Mixed Environment'}`,
          description: `Target: ${scenario.targetIP} | Duration: ${selectedDuration / 60}h | Professional report MANDATORY`,
          duration: 5000,
        });
        
        navigate('/pt1-exam');
      }
    } catch (error) {
      console.error('Scenario generation error:', error);
      toast({
        title: 'Failed to Start Exam',
        description: 'Scenario generation failed validation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">PT1 Exam Configuration</h1>
        <p className="text-muted-foreground">Configure your certification practice exam</p>
      </div>

      <Card className="border-red-500/20 bg-red-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-red-500" />
            Exam Difficulty
          </CardTitle>
          <CardDescription>
            Choose between standard PT1 practice or HARD MODE (anti-pattern, multi-stage attacks)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={selectedDifficulty} onValueChange={(v: 'standard' | 'hard') => setSelectedDifficulty(v)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <RadioGroupItem
                  value="standard"
                  id="difficulty-standard"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="difficulty-standard"
                  className="flex flex-col items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-semibold text-lg">Standard Mode</span>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Realistic PT1-aligned scenarios with proper methodology focus
                  </span>
                </Label>
              </div>
              
              <div className="relative">
                <RadioGroupItem
                  value="hard"
                  id="difficulty-hard"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="difficulty-hard"
                  className="flex flex-col items-start p-4 border-2 border-red-500/30 rounded-lg cursor-pointer hover:border-red-500/50 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-500/10"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-semibold text-lg text-red-500">HARD MODE</span>
                    <Badge variant="destructive" className="text-xs">⚠️ Expert</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Multi-stage attacks, false leads, anti-pattern design. No pattern recognition shortcuts.
                  </span>
                </Label>
              </div>
            </div>
          </RadioGroup>
          
          {selectedDifficulty === 'hard' && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm font-semibold text-red-500 mb-2">⚠️ HARD MODE WARNING</p>
              <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                <li>NO low-effort vulnerabilities (/backup, admin:admin, obvious .bak files)</li>
                <li>3+ steps required to initial foothold</li>
                <li>Multiple false leads and dead-end services</li>
                <li>Tool chaining MANDATORY (no single-tool solutions)</li>
                <li>Complex privilege escalation (no simple SUID)</li>
                <li>Minimum 5-12 steps to complete root access</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Exam Duration
          </CardTitle>
          <CardDescription>
            Select your exam duration. PT1 exams range from 3-6 hours. Choose based on your preparation level.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={String(selectedDuration)} onValueChange={(v) => setSelectedDuration(Number(v))}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {durationOptions.map(option => (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={String(option.value)}
                    id={`duration-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`duration-${option.value}`}
                    className="flex flex-col items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="font-semibold text-lg">{option.label}</span>
                      {option.value === 240 && (
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{option.description}</span>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600">
            <FileText className="w-5 h-5" />
            Professional Report Required
          </CardTitle>
          <CardDescription>
            You MUST submit a professional penetration testing report to complete this exam
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p>Your report must include:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
              <li>Executive Summary</li>
              <li>Detailed findings with CVSS scoring</li>
              <li>Proof of concept and reproduction steps</li>
              <li>Attack narrative and methodology</li>
              <li>Captured flags and evidence</li>
              <li>Remediation recommendations</li>
            </ul>
          </div>
          <div className="p-3 bg-background border border-border rounded-lg">
            <p className="text-xs text-muted-foreground">
              ⚠️ Minimum report length: 500 characters. The report editor is auto-saved and visible throughout the exam.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Exam Structure
          </CardTitle>
          <CardDescription>
            PT1 certification exam weighting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary mb-1">40%</div>
              <div className="text-sm font-medium mb-1">Web Applications</div>
              <div className="text-xs text-muted-foreground">400 points</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-secondary mb-1">36%</div>
              <div className="text-sm font-medium mb-1">Network Security</div>
              <div className="text-xs text-muted-foreground">360 points</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-chart-3 mb-1">24%</div>
              <div className="text-sm font-medium mb-1">Active Directory</div>
              <div className="text-xs text-muted-foreground">240 points</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <p className="text-sm">
              <span className="font-semibold">Pass Threshold:</span> 750 / 1000 points (75%)
            </p>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleStartExam}
        disabled={isGenerating}
        className={`w-full ${selectedDifficulty === 'hard' ? 'bg-red-500 hover:bg-red-600' : 'neon-glow'}`}
        size="lg"
      >
        <PlayCircle className="w-5 h-5 mr-2" />
        {isGenerating 
          ? 'Generating Scenario...' 
          : `Start ${selectedDuration / 60}h PT1 Exam ${selectedDifficulty === 'hard' ? '(HARD MODE)' : ''}`
        }
      </Button>

      <div className="text-center text-xs text-muted-foreground">
        <p>Your exam session will auto-save. You can safely switch tabs or refresh without losing progress.</p>
      </div>
    </div>
  );
}
