import { useState, useEffect } from 'react';
import { DevvAI } from '@devvai/devv-code-backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Timer, 
  Flag, 
  Terminal, 
  PlayCircle, 
  StopCircle, 
  Loader2,
  Shield,
  Download,
  Lightbulb
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { parseAIJson } from '@/lib/utils';
import examData from '@/data/pt1-web-exam.json';

interface ExamScenario {
  targetIP: string;
  targetDomain: string;
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
  currentObjective: number;
}

export default function PT1WebExamPage() {
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
      
      const prompt = `Generate a realistic PT1 Web Application Black-Box penetration test exam scenario.

**TARGET INFORMATION**
- Domain: ${scenarioData.targetDomain}
- IP: ${scenarioData.targetIP}
- Description: ${scenarioData.description}
- Open Ports:
${scenarioData.openPorts.map(p => `  * ${p}`).join('\n')}

**OBJECTIVES**
${scenarioData.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**EXAM FOCUS**
This exam tests your ability to:
- Discover hidden web content (directories, files, admin panels)
- Identify and exploit authentication vulnerabilities
- Test for IDOR (Insecure Direct Object References)
- Exploit SQL injection to extract credentials
- Demonstrate XSS payload execution
- Test for SSRF vulnerabilities
- Use Burp Suite for manual testing and exploitation

**GRADING CRITERIA**
- Content Discovery (15%)
- Authentication Testing (15%)
- IDOR Exploitation (15%)
- SQL Injection (20%)
- XSS Testing (10%)
- SSRF Testing (10%)
- Burp Suite Workflow (10%)
- Reporting Quality (5%)

Create an engaging exam briefing that explains the scenario and rules of engagement.`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a PT1 certification exam generator. Create realistic, challenging web application pentesting scenarios.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const generatedBriefing = response.choices[0].message.content || '';
      
      setScenario({
        targetIP: scenarioData.targetIP,
        targetDomain: scenarioData.targetDomain,
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
        currentObjective: 0,
      });
      
      setTimeRemaining(examData.timeLimit * 60);
      setCommandHistory([]);
      
      toast({
        title: 'Web Black-Box Exam Started',
        description: `You have ${examData.timeLimit} minutes to complete the assessment`,
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

      const prompt = `You are an advanced penetration testing mentor and red team operator conducting a PT1 Web Application Black-Box exam.
Your role is to guide the candidate interactively while grading by methodology, not exact syntax.

**EXECUTION CONTEXT**
- Domain: ${scenario.targetDomain}
- IP: ${scenario.targetIP}
- Open Ports: ${scenario.openPorts.join(', ')}

**EXAM OBJECTIVES**
${scenarioDetails.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**VALID APPROACHES (Accept Kali AND BlackArch equivalents)**
Content Discovery: ${scenarioDetails.validApproaches.contentDiscovery.join(' | ')}
SQLi Testing: ${scenarioDetails.validApproaches.sqliDetection.join(' | ')}
XSS Testing: ${scenarioDetails.validApproaches.xssTesting.join(' | ')}
IDOR Testing: ${scenarioDetails.validApproaches.idorExploitation.join(' | ')}
SSRF Testing: ${scenarioDetails.validApproaches.ssrfTesting.join(' | ')}
Auth Bypass: ${scenarioDetails.validApproaches.authenticationBypass.join(' | ')}

**PREVIOUS COMMANDS**
${contextHistory || 'None'}

**USER COMMAND TO EXECUTE:** ${cmd}

YOUR RESPONSE MUST INCLUDE 4 SECTIONS:

**1. TOOL OUTPUT** (realistic web server responses, directory listings, SQL errors, etc. - max 25 lines)

**2. COMMAND BREAKDOWN & MENTORSHIP**
Format EXACTLY as:

**Why This Command?**
[1-2 sentences explaining WHY this step is chosen in web app testing]

**Command Breakdown:**
\`${cmd}\`

Breakdown:
- [flag/arg] → [meaning]
- [flag/arg] → [meaning]
...

**Mnemonic:** "[short memory trick for key flags]"

**Alternative Tools:**
- [tool 1]: [when to use instead]
- [tool 2]: [when to use instead]

**What We Learned:**
- [discovery 1]
- [discovery 2]

**Next Best Steps:**
1. [priority 1 with exact bash command]
2. [priority 2 with exact bash command]

**Methodology Note:** [OWASP testing phase: Info Gathering → Config → Auth → Input Validation]

**3. OBJECTIVE PROGRESS**
OBJECTIVE_PROGRESS: [Which objective number (0-${scenarioDetails.objectives.length - 1}) does this advance?]

**4. FLAGS**
[If flag found: FLAG{web_exam_flag_here}]

GRADING INSTRUCTIONS (CRITICAL):
- Grade by INTENT and GOAL SIGNALS, NOT exact command strings
- If wrong tool used, explain WHY it's suboptimal and suggest better alternatives
- Provide tool commentary from reference:
${Object.entries(scenarioDetails.commandCommentary).map(([tool, desc]) => `  * ${tool}: ${desc}`).join('\n')}

CONSTRAINTS:
- Concise but actionable
- Real pentester under time pressure
- Avoid automation dependency - if same tool used repeatedly, suggest alternatives (ffuf vs gobuster, manual curl vs automated scan)
- Tone: practical, direct, encouraging`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an advanced web application penetration testing mentor. Provide realistic outputs AND comprehensive command breakdowns with mnemonics. Grade by methodology, not exact syntax.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      });

      const output = response.choices[0].message.content || 'Command executed';
      
      // Check for flags
      const flagMatch = output.match(/FLAG\{[^}]+\}/);
      if (flagMatch) {
        setSession({
          ...session,
          flagsFound: session.flagsFound + 1,
          commandsUsed: [...session.commandsUsed, cmd],
        });
        toast({
          title: 'Flag Found! 🎯',
          description: flagMatch[0],
        });
      } else {
        setSession({
          ...session,
          commandsUsed: [...session.commandsUsed, cmd],
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

    const report = `# PT1 Web Black-Box Exam Report

## Exam Details
- **Target Domain:** ${scenario?.targetDomain}
- **Target IP:** ${scenario?.targetIP}
- **Duration:** ${Math.floor((Date.now() - session.startTime) / 60000)} minutes
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
- Content Discovery: 15%
- Authentication Testing: 15%
- IDOR Exploitation: 15%
- SQL Injection: 20%
- XSS Testing: 10%
- SSRF Testing: 10%
- Burp Suite Workflow: 10%
- Reporting Quality: 5%

---
*Generated by SeshForge - PT1 Web Black-Box Practice Exam*
`;

    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pt1-web-exam-${Date.now()}.md`;
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
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">PT1 Web Black-Box Practice</h1>
          <p className="text-muted-foreground font-mono text-sm">
            Content discovery, OWASP Top 10, Burp Suite workflows
          </p>
        </div>
      </div>

      {!session?.isActive ? (
        <Card className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dot bg-destructive"></div>
            <div className="terminal-dot bg-chart-3"></div>
            <div className="terminal-dot bg-secondary"></div>
            <span className="ml-2 text-xs text-muted-foreground font-mono">web-exam-setup.sh</span>
          </div>
          
          <CardHeader>
            <CardTitle>Start Web Application Exam</CardTitle>
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
                    SQLi, XSS, IDOR, SSRF, Authentication Bypass, Burp Suite
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Terminal className="w-5 h-5 text-chart-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Difficulty</h4>
                  <p className="text-sm text-muted-foreground">Intermediate - Fewer hints, more branching</p>
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
                  Generating Scenario...
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Start Web Black-Box Exam
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
              <span className="ml-2 text-xs text-muted-foreground font-mono">web-exam-session.log</span>
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
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-mono text-primary">{scenario.targetDomain} ({scenario.targetIP})</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Focus: </span>
                      <span className="font-mono">Web Application Black-Box Testing</span>
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

                {commandHistory.map((entry, index) => {
                  // Parse structured response
                  const toolOutputMatch = entry.output.match(/(?:^|\n)(?:\*\*1\. TOOL OUTPUT\*\*|\*\*TOOL OUTPUT\*\*)[\s\S]*?\n([\s\S]*?)(?=\n\*\*2\. COMMAND BREAKDOWN|\*\*COMMAND BREAKDOWN|\n\*\*Why This Command|\*\*OBJECTIVE_PROGRESS:|$)/i);
                  const mentorGuidanceMatch = entry.output.match(/(?:\*\*2\. COMMAND BREAKDOWN|\*\*COMMAND BREAKDOWN|\*\*Why This Command)([\s\S]*?)(?=\n\*\*3\. OBJECTIVE PROGRESS|\*\*OBJECTIVE_PROGRESS:|$)/i);
                  
                  const hasStructuredOutput = toolOutputMatch || mentorGuidanceMatch;
                  
                  return (
                    <div key={index} className="mb-6">
                      <div className="text-secondary mb-2">$ {entry.command}</div>
                      
                      {hasStructuredOutput ? (
                        <>
                          {/* Tool Output Section */}
                          {toolOutputMatch && (
                            <div className="mb-4 bg-muted/30 rounded-lg p-4 border-l-4 border-muted">
                              <div className="flex items-start gap-2 mb-2">
                                <Terminal className="w-4 h-4 text-chart-3 mt-0.5 flex-shrink-0" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tool Output</span>
                              </div>
                              <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words overflow-x-auto text-muted-foreground">
                                {toolOutputMatch[1].trim()}
                              </pre>
                            </div>
                          )}
                          
                          {/* Mentor Guidance Section */}
                          {mentorGuidanceMatch && (
                            <div className="bg-amber-500/5 border-l-4 border-amber-500/30 rounded-lg p-4">
                              <div className="flex items-start gap-2 mb-3">
                                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Mentor Guidance</span>
                              </div>
                              <div className="prose prose-sm prose-invert max-w-none">
                                <ReactMarkdown
                                  components={{
                                    code: ({ inline, className, children, ...props }: any) => {
                                      const match = /language-(\w+)/.exec(className || '');
                                      return !inline && match ? (
                                        <SyntaxHighlighter
                                          style={vscDarkPlus as any}
                                          language={match[1]}
                                          PreTag="div"
                                          className="rounded-md text-xs"
                                          {...props}
                                        >
                                          {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                      ) : (
                                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                          {children}
                                        </code>
                                      );
                                    },
                                  }}
                                >
                                  {mentorGuidanceMatch[1].trim()}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        // Fallback: display as single block if structure not found
                        <div className="text-muted-foreground mt-1 whitespace-pre-wrap">
                          {entry.output}
                        </div>
                      )}
                    </div>
                  );
                })}

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
                      placeholder="Enter web pentesting command..."
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
