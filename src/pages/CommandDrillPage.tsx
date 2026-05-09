import { useState, useEffect } from 'react';
import { DevvAI } from '@devvai/devv-code-backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Terminal, CheckCircle2, XCircle, Loader2, Zap, RefreshCw, AlertCircle, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { TerminalCommandInput } from '@/components/TerminalCommandInput';
import { parseAIJson, withAIRetry } from '@/lib/utils';
import { useCertificationStore, type CertificationDomain } from '@/store/certification-store';
import { useDrillSessionStore, type PentestingPhase, type FailurePattern } from '@/store/drill-session-store';
import { useProgressStore } from '@/store/progress-store';

interface DrillCommand {
  scenario: string; // Context-based question
  validCommands: string[]; // Multiple valid answers
  feedback: string; // What to show after answering
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface DrillSession {
  totalDrills: number;
  correctAnswers: number;
  startTime: number;
}

const commandTemplates = [
  { category: 'Reconnaissance', tool: 'nmap', difficulty: 'easy' as const },
  { category: 'Reconnaissance', tool: 'whois', difficulty: 'easy' as const },
  { category: 'Scanning', tool: 'nmap', difficulty: 'medium' as const },
  { category: 'Enumeration', tool: 'gobuster', difficulty: 'medium' as const },
  { category: 'Enumeration', tool: 'enum4linux', difficulty: 'medium' as const },
  { category: 'Exploitation', tool: 'msfconsole', difficulty: 'hard' as const },
  { category: 'Privilege Escalation', tool: 'linpeas', difficulty: 'hard' as const },
  { category: 'Brute Force', tool: 'hydra', difficulty: 'medium' as const },
];

// Helper function to map drill categories to pentesting phases
function mapCategoryToPhase(category: string): PentestingPhase {
  const mapping: Record<string, PentestingPhase> = {
    'Reconnaissance': 'reconnaissance',
    'Scanning': 'scanning',
    'Enumeration': 'enumeration',
    'Exploitation': 'exploitation',
    'Privilege Escalation': 'privilege_escalation',
    'Post-Exploitation': 'post_exploitation',
    'Brute Force': 'exploitation', // Map brute force to exploitation phase
  };
  
  return mapping[category] || 'enumeration'; // Default to enumeration
}

export default function CommandDrillPage() {
  const [currentDrill, setCurrentDrill] = useState<DrillCommand | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [session, setSession] = useState<DrillSession>({
    totalDrills: 0,
    correctAnswers: 0,
    startTime: Date.now(),
  });
  const { toast } = useToast();
  
  const certStore = useCertificationStore();
  const progressStore = useProgressStore();
  
  // Persistent session tracking
  const { 
    currentSession,
    startSession, 
    updateSessionState, 
    addFailurePattern,
    resumeLastSession,
  } = useDrillSessionStore();

  // Load cert data on mount
  useEffect(() => {
    certStore.loadFromDatabase();
  }, []);

  useEffect(() => {
    // Try to resume last session or start new one
    resumeLastSession('command_drill').then(restored => {
      if (restored && restored.status === 'in_progress') {
        // Restore state
        setSession({
          totalDrills: restored.currentStep,
          correctAnswers: restored.correctAnswers,
          startTime: new Date(restored.startedAt).getTime(),
        });
        
        toast({
          title: 'Session Restored',
          description: `Resuming from drill ${restored.currentStep + 1}`,
        });
      }
      
      // Generate first drill
      generateNewDrill();
    });
  }, []);

  const generateNewDrill = async () => {
    setIsGenerating(true);
    setShowFeedback(false);
    setUserAnswer('');
    setAiResponse('');

    try {
      const ai = new DevvAI();
      const template = commandTemplates[Math.floor(Math.random() * commandTemplates.length)];
      
      const prompt = `Generate a context-driven penetration testing command drill for learning.

Category: ${template.category}
Primary Tool: ${template.tool}
Difficulty: ${template.difficulty}

**CRITICAL: Respond with ONLY valid JSON. No markdown blocks, no extra text, no trailing commas.**

Provide a JSON response in this EXACT format:
{
  "scenario": "Context-based question that describes a SITUATION (e.g., 'Port scan revealed port 80 (HTTP). How would you enumerate the web service?')",
  "validCommands": ["primary_command", "alternative_command", "another_valid_approach"],
  "feedback": "Markdown-formatted feedback that: Acknowledges multiple approaches, Explains each valid command, Breaks down flags/arguments (e.g., -sC means default scripts, -sV means version detection), Suggests next steps",
  "category": "${template.category}",
  "difficulty": "${template.difficulty}"
}

**RULES:**
1. Scenario must provide CONTEXT (what happened before, what info is available)
2. Include 2-3 valid commands that solve the problem differently
3. Avoid generic questions like "perform enumeration" - be specific about the situation
4. In feedback, explain WHY each approach works and what each flag means
5. ALL text must be on single lines (no actual newlines in JSON strings)

**EXAMPLE (nmap enumeration):**
{
  "scenario": "You're testing a target at 10.10.10.24. You need to discover open ports and running services. What's your first reconnaissance command?",
  "validCommands": [
    "nmap -sC -sV -p- 10.10.10.24",
    "nmap -A -T4 10.10.10.24",
    "nmap -sS -sV -p- 10.10.10.24"
  ],
  "feedback": "**Multiple valid approaches:** nmap -sC -sV -p- 10.10.10.24: -sC means default NSE scripts, -sV means version detection, -p- means scan all 65535 ports. nmap -A -T4 10.10.10.24: -A means aggressive scan (OS, version, scripts, traceroute), -T4 means faster timing. **Next step:** Once ports are discovered, enumerate specific services (e.g., gobuster for HTTP, enum4linux for SMB)",
  "category": "Reconnaissance",
  "difficulty": "easy"
}

Now generate a NEW drill with a different scenario. Respond with ONLY the JSON object.`;

      // Wrap AI generation in retry mechanism with exponential backoff
      const drill = await withAIRetry(async () => {
        const response = await ai.chat.completions.create({
          model: 'kimi-k2-0711-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a penetration testing instructor creating context-driven command drills with multiple valid solutions. Respond with ONLY valid JSON - no markdown code blocks, no trailing commas, no extra text. The JSON must be parseable by JSON.parse().'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.9,
        });

        const content = response.choices[0].message.content || '';
        
        // Log raw response for debugging
        console.log('AI drill generation response:', content.substring(0, 300));
        
        // Extract and parse JSON from response (handles markdown and extra text)
        const parsedDrill = parseAIJson<DrillCommand>(content);
        
        // Validate that all required fields are present
        if (!parsedDrill.scenario || !parsedDrill.validCommands || !parsedDrill.feedback || !parsedDrill.category || !parsedDrill.difficulty) {
          throw new Error('AI response missing required fields');
        }
        
        return parsedDrill;
      });
      
      setCurrentDrill(drill);
      
    } catch (error) {
      console.error('Generation error after all retries:', error);
      
      // Show error to user with retry context
      toast({
        title: 'AI Generation Failed',
        description: 'All retry attempts exhausted. Using fallback drill.',
        variant: 'destructive',
      });
      
      // Fallback drill with context
      setCurrentDrill({
        scenario: 'You\'re testing target 10.10.10.50. You need to discover open ports and services. What\'s your first command?',
        validCommands: [
          'nmap -sC -sV -p- 10.10.10.50',
          'nmap -A -T4 10.10.10.50',
          'nmap -sS -sV 10.10.10.50'
        ],
        feedback: '**Valid approaches:**\n\n`nmap -sC -sV -p- target`\n- `-sC` → default scripts\n- `-sV` → version detection\n- `-p-` → all ports\n\n`nmap -A -T4 target`\n- `-A` → aggressive (OS, version, scripts)\n- `-T4` → faster timing',
        category: 'Reconnaissance',
        difficulty: 'easy',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const checkAnswer = async () => {
    if (!currentDrill || !userAnswer.trim()) return;

    setIsChecking(true);

    try {
      const ai = new DevvAI();

      const validationPrompt = `You are evaluating a student's answer to a pentesting command drill.

**SCENARIO:**
${currentDrill.scenario}

**EXPECTED VALID COMMANDS (any of these are correct):**
${currentDrill.validCommands.map((cmd, i) => `${i + 1}. ${cmd}`).join('\n')}

**STUDENT'S ANSWER:**
${userAnswer}

**YOUR TASK:**
Determine if the student's answer is valid, even if it differs from the expected commands.

**EVALUATION CRITERIA:**
- Does it accomplish the same goal as the expected commands?
- Is it a legitimate pentesting tool/command?
- Is the syntax correct?
- Accept variations in flags/arguments if they serve the same purpose

**CRITICAL: Respond with ONLY valid JSON. No markdown code blocks, no extra text, no trailing commas.**

**RESPONSE FORMAT:**
{
  "isCorrect": true,
  "feedback": "Markdown explanation: If correct acknowledge the answer, explain what it does, break down flags, suggest next steps. If incorrect explain why it's not appropriate for this scenario, show what it actually does, recommend correct approach. If partially correct acknowledge what's right, suggest improvements"
}

Now evaluate the student's answer with constructive feedback. Respond with ONLY the JSON object.`;

      // Wrap AI validation in retry mechanism with exponential backoff
      const evaluation = await withAIRetry(async () => {
        const response = await ai.chat.completions.create({
          model: 'kimi-k2-0711-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a pentesting instructor evaluating student answers. Respond with ONLY valid JSON - no markdown code blocks, no trailing commas, no extra text. The JSON must be parseable by JSON.parse().'
            },
            { role: 'user', content: validationPrompt }
          ],
          max_tokens: 600,
          temperature: 0.7,
        });

        const content = response.choices[0].message.content || '';
        
        // Log raw response for debugging
        console.log('AI validation response:', content.substring(0, 300));
        
        // Extract and parse JSON from response (handles markdown and extra text)
        const parsedEvaluation = parseAIJson<{ isCorrect: boolean; feedback: string }>(content);
        
        // Validate response structure
        if (typeof parsedEvaluation.isCorrect !== 'boolean' || !parsedEvaluation.feedback) {
          throw new Error('AI validation response missing required fields');
        }
        
        return parsedEvaluation;
      });
      
      setAiResponse(evaluation.feedback);
      setShowFeedback(true);

      // Update session state
      const newSession = {
        totalDrills: session.totalDrills + 1,
        correctAnswers: evaluation.isCorrect ? session.correctAnswers + 1 : session.correctAnswers,
        startTime: session.startTime,
      };
      setSession(newSession);

      // Initialize persistent session if not exists
      if (!currentSession) {
        await startSession('command_drill', `drill_${Date.now()}`);
      }

      // Update persistent session state
      await updateSessionState({
        currentStep: newSession.totalDrills,
        correctAnswers: newSession.correctAnswers,
        incorrectAnswers: evaluation.isCorrect ? currentSession?.incorrectAnswers || 0 : (currentSession?.incorrectAnswers || 0) + 1,
        enteredCommands: [
          ...(currentSession?.enteredCommands || []),
          {
            command: userAnswer,
            timestamp: new Date().toISOString(),
            correct: evaluation.isCorrect,
          }
        ],
        aiFeedbackHistory: [
          ...(currentSession?.aiFeedbackHistory || []),
          {
            question: currentDrill.scenario,
            answer: evaluation.feedback,
            timestamp: new Date().toISOString(),
          }
        ],
        timeSpentSeconds: Math.floor((Date.now() - session.startTime) / 1000),
      });

      if (evaluation.isCorrect) {
        toast({
          title: 'Correct! 🎯',
          description: 'Great thinking!',
        });
        
        // ✅ Track drill completion in progress store
        progressStore.incrementDrills(true);
        
        // Update certification tracking for correct answers
        await updateCertificationAfterDrill(currentDrill, true);
      } else {
        // ✅ Track failed drill attempt
        progressStore.incrementDrills(false);
        
        // Track failure pattern for methodology analysis
        const phase = mapCategoryToPhase(currentDrill.category);
        const failurePattern: FailurePattern = {
          phase,
          mistake: `Incorrect command: ${userAnswer}`,
          command: userAnswer,
          timestamp: new Date().toISOString(),
          severity: currentDrill.difficulty === 'hard' ? 'high' : currentDrill.difficulty === 'medium' ? 'medium' : 'low',
        };
        
        await addFailurePattern(failurePattern);
        
        toast({
          title: 'Not Quite',
          description: 'Review the feedback below',
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Checking error after all retries:', error);
      toast({
        title: 'Validation Failed',
        description: 'All retry attempts exhausted. Try submitting again.',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const updateCertificationAfterDrill = async (drill: DrillCommand, isCorrect: boolean) => {
    // Map drill category to certification domains
    const categoryToDomainMap: Record<string, CertificationDomain[]> = {
      'Reconnaissance': ['reconnaissance'],
      'Scanning': ['reconnaissance', 'enumeration'],
      'Enumeration': ['enumeration', 'web_exploitation'],
      'Exploitation': ['web_exploitation', 'network_exploitation'],
      'Privilege Escalation': ['privilege_escalation'],
      'Post-Exploitation': ['post_exploitation'],
      'Brute Force': ['password_attacks'],
    };

    const domains_practiced = categoryToDomainMap[drill.category] || ['enumeration'];

    // Simulate evaluation scores based on drill difficulty and correctness
    const baseScore = isCorrect ? 80 : 40;
    const difficultyBonus = drill.difficulty === 'hard' ? 20 : drill.difficulty === 'medium' ? 10 : 0;
    const score = Math.min(100, baseScore + difficultyBonus);

    const commands = [{
      command: userAnswer,
      phase: mapCategoryToPhase(drill.category),
      correct: isCorrect,
    }];

    const evaluation = {
      reconScore: drill.category === 'Reconnaissance' ? score : 50,
      scanningScore: drill.category === 'Scanning' ? score : 50,
      enumerationScore: drill.category === 'Enumeration' ? score : 50,
      exploitationScore: drill.category === 'Exploitation' ? score : 50,
      privescScore: drill.category === 'Privilege Escalation' ? score : 50,
      methodologyScore: isCorrect ? 70 : 40,
      overallScore: score,
    };

    await certStore.updateAfterSimulation({
      difficulty: drill.difficulty === 'hard' ? 'intermediate' : 'beginner',
      commands,
      evaluation,
      flags_captured: 0,
      hints_used: 0,
      missed_steps: isCorrect ? [] : ['Command incorrect for scenario'],
      domains_practiced,
    });
  };

  const revealAnswer = () => {
    setShowFeedback(true);
    setAiResponse(currentDrill?.feedback || '');
    setSession(prev => ({
      ...prev,
      totalDrills: prev.totalDrills + 1,
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-matrix-green/20 text-matrix-green border-matrix-green/50';
      case 'medium': return 'bg-cyber-blue/20 text-cyber-blue border-cyber-blue/50';
      case 'hard': return 'bg-warning-amber/20 text-warning-amber border-warning-amber/50';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const accuracy = session.totalDrills > 0 
    ? Math.round((session.correctAnswers / session.totalDrills) * 100) 
    : 0;

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-8 h-8 text-cyber-blue" />
        <div>
          <h1 className="text-3xl font-bold">Command Drill Engine</h1>
          <p className="text-muted-foreground text-sm">
            Context-driven drills that accept multiple valid solutions
          </p>
        </div>
      </div>

      {/* Session Stats */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-mono">Session Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-terminal-black/30 border border-matrix-green/30">
              <div className="text-3xl font-bold text-matrix-green font-mono">{session.totalDrills}</div>
              <div className="text-sm text-muted-foreground font-mono">Total Drills</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-terminal-black/30 border border-cyber-blue/30">
              <div className="text-3xl font-bold text-cyber-blue font-mono">{session.correctAnswers}</div>
              <div className="text-sm text-muted-foreground font-mono">Correct Answers</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-terminal-black/30 border border-warning-amber/30">
              <div className="text-3xl font-bold text-warning-amber font-mono">{accuracy}%</div>
              <div className="text-sm text-muted-foreground font-mono">Accuracy</div>
            </div>
          </div>
          
          {session.totalDrills > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-mono text-muted-foreground">Progress</span>
                <span className="font-mono text-cyber-blue">{accuracy}%</span>
              </div>
              <Progress value={accuracy} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Drill */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-matrix-green" />
              Current Drill
            </CardTitle>
            {currentDrill && (
              <div className="flex gap-2">
                <Badge variant="outline" className="font-mono">
                  {currentDrill.category}
                </Badge>
                <Badge className={getDifficultyColor(currentDrill.difficulty)}>
                  {currentDrill.difficulty}
                </Badge>
              </div>
            )}
          </div>
          <CardDescription>
            Multiple valid approaches accepted - think methodology, not memorization
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-cyber-blue animate-spin" />
              <p className="text-muted-foreground font-mono">Generating context-driven drill...</p>
            </div>
          ) : currentDrill ? (
            <>
              {/* Scenario */}
              <div className="p-4 bg-terminal-black/30 rounded-lg border border-matrix-green/30">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-matrix-green mt-0.5" />
                  <p className="text-sm text-muted-foreground font-mono">Scenario:</p>
                </div>
                <p className="font-mono text-foreground text-sm leading-relaxed">
                  {currentDrill.scenario}
                </p>
              </div>

              {/* Command Input with Visual Feedback */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
                  <Terminal className="w-4 h-4" />
                  <span>Your command:</span>
                </div>
                <TerminalCommandInput
                  value={userAnswer}
                  onChange={setUserAnswer}
                  onSubmit={checkAnswer}
                  placeholder="type your command here..."
                  disabled={showFeedback || isChecking}
                  showValidation={!showFeedback}
                  expectedContext={currentDrill.scenario}
                />
              </div>

              {/* Actions */}
              {!showFeedback ? (
                <div className="flex gap-2">
                  <Button
                    onClick={checkAnswer}
                    disabled={!userAnswer.trim() || isChecking}
                    className="flex-1 gap-2"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Check Answer (Enter)
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={revealAnswer}
                    variant="outline"
                  >
                    Reveal
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* AI Feedback */}
                  <div className="p-4 bg-terminal-black/30 border border-cyber-blue/30 rounded-lg">
                    <p className="text-xs text-muted-foreground font-mono mb-3">AI Feedback:</p>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          code: ({ className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !match;
                            return isInline ? (
                              <code className="bg-terminal-black/50 px-1.5 py-0.5 rounded text-matrix-green" {...props}>
                                {children}
                              </code>
                            ) : (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                  margin: 0,
                                  borderRadius: '0.5rem',
                                  fontSize: '0.875rem',
                                }}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            );
                          },
                        }}
                      >
                        {aiResponse}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Next Drill */}
                  <Button
                    onClick={() => {
                      setShowFeedback(false);
                      setUserAnswer('');
                      setAiResponse('');
                      generateNewDrill();
                    }}
                    className="w-full gap-2"
                    variant="secondary"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Next Drill
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <XCircle className="w-16 h-16 text-muted-foreground/50" />
              <p className="text-muted-foreground font-mono">Failed to load drill</p>
              <Button onClick={generateNewDrill} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
