import { useState, useEffect } from 'react';
import { DevvAI } from '@devvai/devv-code-backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Timer, 
  Flag, 
  Terminal, 
  PlayCircle, 
  StopCircle, 
  Loader2,
  Database,
  Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { parseAIJson } from '@/lib/utils';
import examData from '@/data/pt1-ad-exam.json';

interface ExamScenario {
  targetIP: string;
  targetDomain: string;
  domainController: string;
  difficulty: string;
  description: string;
  openPorts: string[];
}

interface ExamSession {
  startTime: number;
  timeLimit: number;
  commandsUsed: string[];
  hintsUsed: number;
  flagsFound: number;
  isActive: boolean;
  currentPhase: string;
}

export default function PT1ADExamPage() {
  const [scenario, setScenario] = useState<ExamScenario | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<Array<{ command: string; output: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!session?.isActive) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      const remaining = (session.timeLimit * 60) - elapsed;
      
      if (remaining <= 0) {
        endExam(true);
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  const startExam = async () => {
    setIsProcessing(true);

    try {
      const ai = new DevvAI();
      
      const scenarioData = examData.scenarios[0];
      
      const prompt = `Generate a realistic PT1 Active Directory + Lateral Movement penetration test exam scenario.

**TARGET INFORMATION**
- Domain: ${scenarioData.targetDomain}
- Domain Controller: ${scenarioData.domainController}
- IP: ${scenarioData.targetIP}
- Description: ${scenarioData.description}
- Open Ports:
${scenarioData.openPorts.map(p => `  * ${p}`).join('\n')}

**OBJECTIVES**
${scenarioData.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**EXAM FOCUS**
This exam tests your ability to:
- Enumerate Active Directory via LDAP
- Perform Kerberoasting attacks
- Crack service account passwords
- Enumerate SMB shares with valid credentials
- Demonstrate lateral movement techniques
- Use Pass-the-Hash or Pass-the-Ticket
- Escalate to Domain Admin privileges
- Extract domain flags

**ATTACK PATH**
${Object.entries(scenarioData.attackPath).map(([phase, data]: [string, any]) => `
**${data.name}**
${data.steps.map((step: string) => `- ${step}`).join('\n')}
`).join('\n')}

**GRADING CRITERIA**
- LDAP Enumeration (15%)
- Kerberoasting (20%)
- Hash Cracking (10%)
- Credential Abuse (15%)
- Lateral Movement (20%)
- BloodHound Reasoning (10%)
- Domain Dominance (10%)

Create an engaging exam briefing that explains the AD environment and attack methodology.`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a PT1 certification exam generator specializing in Active Directory penetration testing scenarios.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1200,
        temperature: 0.7,
      });

      const generatedBriefing = response.choices[0].message.content || '';
      
      setScenario({
        targetIP: scenarioData.targetIP,
        targetDomain: scenarioData.targetDomain,
        domainController: scenarioData.domainController,
        difficulty: scenarioData.description,
        description: generatedBriefing,
        openPorts: scenarioData.openPorts,
      });

      setSession({
        startTime: Date.now(),
        timeLimit: examData.timeLimit,
        commandsUsed: [],
        hintsUsed: 0,
        flagsFound: 0,
        isActive: true,
        currentPhase: 'Initial Access & Enumeration',
      });
      
      setTimeRemaining(examData.timeLimit * 60);
      setCommandHistory([]);
      
      toast({
        title: 'AD + Lateral Movement Exam Started',
        description: `You have ${examData.timeLimit} minutes to compromise the domain`,
      });
    } catch (error) {
      console.error('Scenario generation error:', error);
      toast({
        title: 'Failed to Start Exam',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const executeCommand = async () => {
    if (!currentCommand.trim() || !scenario || !session) return;

    setIsProcessing(true);
    const cmd = currentCommand.trim();

    try {
      const ai = new DevvAI();
      
      const contextHistory = commandHistory.slice(-3).map(h => 
        `Command: ${h.command}\nOutput: ${h.output}`
      ).join('\n\n');

      const scenarioDetails = examData.scenarios[0];

      const prompt = `You are simulating a PT1 Active Directory + Lateral Movement penetration testing exam.

**TARGET**
- Domain: ${scenario.targetDomain}
- DC: ${scenario.domainController}
- IP: ${scenario.targetIP}
- Current Phase: ${session.currentPhase}

**EXAM OBJECTIVES**
${scenarioDetails.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**VALID APPROACHES FOR DETECTION**
LDAP Enum: ${scenarioDetails.validApproaches.ldapEnumeration.join(' | ')}
Kerberoasting: ${scenarioDetails.validApproaches.kerberoasting.join(' | ')}
Hash Cracking: ${scenarioDetails.validApproaches.hashCracking.join(' | ')}
SMB Enum: ${scenarioDetails.validApproaches.smbEnumeration.join(' | ')}
Lateral Movement: ${scenarioDetails.validApproaches.lateralMovement.join(' | ')}
Pass-the-Hash: ${scenarioDetails.validApproaches.passTheHash.join(' | ')}

**GRADING INSTRUCTIONS (CRITICAL)**
- Grade by INTENT and GOAL SIGNALS, NOT exact command strings
- Accept Kali AND BlackArch equivalents:
  * CrackMapExec vs NetExec (nxc) - same syntax
  * Impacket tools: GetUserSPNs.py, secretsdump.py, psexec.py, wmiexec.py
  * LDAP: ldapsearch, windapsearch, bloodyAD
  * Crackers: hashcat, john
  * BloodHound: bloodhound-python, SharpHound
- If wrong tool/approach used, explain WHY and suggest better alternatives
- Provide command commentary from this reference:
${Object.entries(scenarioDetails.commandCommentary).map(([tool, desc]) => `  * ${tool}: ${desc}`).join('\n')}

**KALI/BLACKARCH ALTERNATIVES**
${Object.entries(scenarioDetails.kaliAlternatives).map(([tool, alts]) => `  * ${tool}: ${alts}`).join('\n')}

**PREVIOUS COMMANDS**
${contextHistory || 'None'}

**USER EXECUTED:** ${cmd}

Simulate realistic Active Directory output. Include:
1. Realistic AD tool output (LDAP results, Kerberos tickets, SMB shares, lateral movement results)
2. Flag discovery if appropriate (FLAG{ad_exam_flag_here})
3. Commentary on command effectiveness and methodology
4. Hints toward next phase if appropriate

Respond in this format:
OUTPUT:
[realistic AD tool output]

COMMENTARY:
[Methodology assessment and next steps]

PHASE:
[Current phase: Initial Access & Enumeration | Kerberoasting & Credential Abuse | Lateral Movement | Domain Dominance]`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an Active Directory penetration testing exam simulator. Grade by methodology and intent, not exact syntax. Accept CrackMapExec/NetExec interchangeably.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const output = response.choices[0].message.content || 'Command executed';
      
      // Extract phase update
      const phaseMatch = output.match(/PHASE:\s*([^\n]+)/);
      if (phaseMatch) {
        setSession({
          ...session,
          currentPhase: phaseMatch[1].trim(),
          commandsUsed: [...session.commandsUsed, cmd],
        });
      } else {
        setSession({
          ...session,
          commandsUsed: [...session.commandsUsed, cmd],
        });
      }

      // Check for flags
      const flagMatch = output.match(/FLAG\{[^}]+\}/);
      if (flagMatch) {
        setSession(prev => ({
          ...prev!,
          flagsFound: prev!.flagsFound + 1,
        }));
        toast({
          title: 'Flag Found! 🎯',
          description: flagMatch[0],
        });
      }

      // Extract output section
      const outputMatch = output.match(/OUTPUT:\s*([\s\S]*?)(?=\n\nCOMMENTARY:|$)/);
      const cleanOutput = outputMatch ? outputMatch[1].trim() : output;

      setCommandHistory([...commandHistory, {
        command: cmd,
        output: cleanOutput,
      }]);
      
      setCurrentCommand('');
    } catch (error) {
      console.error('Command execution error:', error);
      setCommandHistory([...commandHistory, {
        command: cmd,
        output: 'Error: Failed to execute command',
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const endExam = (timeExpired: boolean = false) => {
    if (!session) return;

    setSession({ ...session, isActive: false });
    
    const duration = Math.floor((Date.now() - session.startTime) / 60000);
    
    toast({
      title: timeExpired ? 'Time Expired' : 'Exam Ended',
      description: `Duration: ${duration}min | Flags: ${session.flagsFound} | Commands: ${session.commandsUsed.length}`,
      duration: 10000,
    });
  };

  const exportReport = () => {
    if (!session) return;

    const report = `# PT1 AD + Lateral Movement Exam Report

## Exam Details
- **Domain:** ${scenario?.targetDomain}
- **Domain Controller:** ${scenario?.domainController}
- **Target IP:** ${scenario?.targetIP}
- **Duration:** ${Math.floor((Date.now() - session.startTime) / 60000)} minutes
- **Final Phase:** ${session.currentPhase}
- **Flags Found:** ${session.flagsFound}
- **Commands Executed:** ${session.commandsUsed.length}
- **Hints Used:** ${session.hintsUsed}

## Command History
${commandHistory.map((h, i) => `
### ${i + 1}. ${h.command}
\`\`\`
${h.output}
\`\`\`
`).join('\n')}

## Grading Criteria
- LDAP Enumeration: 15%
- Kerberoasting: 20%
- Hash Cracking: 10%
- Credential Abuse: 15%
- Lateral Movement: 20%
- BloodHound Reasoning: 10%
- Domain Dominance: 10%

---
*Generated by SeshForge - PT1 AD + Lateral Movement Practice Exam*
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pt1-ad-exam-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Exported',
      description: 'Markdown report downloaded successfully',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">PT1 AD + Lateral Movement Practice</h1>
          <p className="text-muted-foreground font-mono text-sm">
            Kerberoasting, credential abuse, BloodHound reasoning, domain dominance
          </p>
        </div>
      </div>

      {!session?.isActive ? (
        <Card className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dot bg-destructive"></div>
            <div className="terminal-dot bg-chart-3"></div>
            <div className="terminal-dot bg-secondary"></div>
            <span className="ml-2 text-xs text-muted-foreground font-mono">ad-exam-setup.sh</span>
          </div>
          
          <CardHeader>
            <CardTitle>Start Active Directory Exam</CardTitle>
            <CardDescription>
              {examData.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Timer className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Time Limit</h4>
                  <p className="text-sm text-muted-foreground">{examData.timeLimit} minutes</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Flag className="w-5 h-5 text-secondary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Focus Areas</h4>
                  <p className="text-sm text-muted-foreground">
                    LDAP, Kerberoasting, SMB, Lateral Movement, Pass-the-Hash, Domain Dominance
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Terminal className="w-5 h-5 text-chart-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Difficulty</h4>
                  <p className="text-sm text-muted-foreground">Intermediate - Complex AD environment with 150+ users</p>
                </div>
              </div>
            </div>

            <Button
              onClick={startExam}
              disabled={isProcessing}
              className="w-full neon-glow"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating AD Environment...
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Start AD + Lateral Movement Exam
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dot bg-destructive"></div>
              <div className="terminal-dot bg-chart-3"></div>
              <div className="terminal-dot bg-secondary"></div>
              <span className="ml-2 text-xs text-muted-foreground font-mono">ad-exam-session.log</span>
            </div>
            
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
                  <Timer className={`w-5 h-5 mb-2 ${timeRemaining < 600 ? 'text-destructive' : 'text-primary'}`} />
                  <div className="text-lg font-bold font-mono">{formatTime(timeRemaining)}</div>
                  <div className="text-xs text-muted-foreground">Time Left</div>
                </div>
                
                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
                  <Flag className="w-5 h-5 mb-2 text-secondary" />
                  <div className="text-lg font-bold font-mono">{session.flagsFound}</div>
                  <div className="text-xs text-muted-foreground">Flags Found</div>
                </div>
                
                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
                  <Terminal className="w-5 h-5 mb-2 text-chart-3" />
                  <div className="text-lg font-bold font-mono">{session.commandsUsed.length}</div>
                  <div className="text-xs text-muted-foreground">Commands</div>
                </div>

                <div className="flex items-center justify-center">
                  <Button
                    onClick={() => endExam(false)}
                    variant="outline"
                    size="sm"
                  >
                    <StopCircle className="w-4 h-4 mr-2" />
                    End Exam
                  </Button>
                </div>

                <div className="flex items-center justify-center">
                  <Button
                    onClick={exportReport}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              {scenario && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-muted-foreground">Domain: </span>
                      <span className="font-mono text-primary">{scenario.targetDomain}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">DC: </span>
                      <span className="font-mono">{scenario.domainController}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phase: </span>
                      <span className="font-mono text-secondary">{session.currentPhase}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dot bg-destructive"></div>
              <div className="terminal-dot bg-chart-3"></div>
              <div className="terminal-dot bg-secondary"></div>
              <span className="ml-2 text-xs text-muted-foreground font-mono">root@kali:~#</span>
            </div>
            
            <CardContent className="p-0">
              <div className="p-4 bg-background/95 font-mono text-sm h-[500px] overflow-y-auto custom-scrollbar">
                {commandHistory.length === 0 && scenario && (
                  <div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
                    <ReactMarkdown>{scenario.description}</ReactMarkdown>
                    <p className="mt-4 text-secondary">$ _</p>
                  </div>
                )}

                {commandHistory.map((entry, index) => (
                  <div key={index} className="mb-4">
                    <div className="text-secondary">$ {entry.command}</div>
                    <div className="text-muted-foreground mt-1 whitespace-pre-wrap">
                      {entry.output}
                    </div>
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing...</span>
                  </div>
                )}
              </div>

              <div className="border-t border-border p-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-mono">$</span>
                    <input
                      type="text"
                      value={currentCommand}
                      onChange={(e) => setCurrentCommand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isProcessing && currentCommand.trim()) {
                          executeCommand();
                        }
                      }}
                      placeholder="Enter AD pentesting command..."
                      disabled={isProcessing}
                      className="w-full pl-8 pr-4 py-2 rounded-lg bg-background border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                  </div>
                  <Button
                    onClick={executeCommand}
                    disabled={!currentCommand.trim() || isProcessing}
                  >
                    <Terminal className="w-4 h-4 mr-2" />
                    Execute
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
