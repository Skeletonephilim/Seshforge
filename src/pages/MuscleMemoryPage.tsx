import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DevvAI } from '@devvai/devv-code-backend';
import { withAIRetry } from '@/lib/utils';
import { 
  Terminal, 
  Clock, 
  Target, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface MuscleMemoryScenario {
  category: 'Active Directory' | 'Web Applications' | 'Network Enumeration' | 'Privilege Escalation';
  scenario: string;
  objective: string;
  timeLimit: number; // seconds
  constraints: string[];
  optimalCommands: string[];
  alternatives: string[];
  commonMistakes: string[];
}

export default function MuscleMemoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [scenario, setScenario] = useState<MuscleMemoryScenario | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [commands, setCommands] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateScenario = async (category: string) => {
    setIsGenerating(true);
    setEvaluation(null);
    setCommands([]);
    setHintsUsed(0);
    
    try {
      const ai = new DevvAI();
      
      const prompt = `You are a Red Team Training Engine focused on building muscle memory for penetration testing.

Generate a SHORT, REALISTIC attack scenario for: ${category}

CRITICAL FORMAT REQUIREMENTS:
Return ONLY valid JSON with this EXACT structure (no markdown, no code blocks):

{
  "scenario": "1-2 line context (e.g., 'You have access to a Windows domain machine. You suspect Kerberos abuse.')",
  "objective": "Clear actionable goal (e.g., 'Get valid credentials', 'Enumerate domain users', 'Find web admin panel', 'Escalate privileges')",
  "timeLimit": ${category === 'Network Enumeration' ? 180 : category === 'Privilege Escalation' ? 600 : 300},
  "constraints": ["Time limit: ${category === 'Network Enumeration' ? '3 min' : category === 'Privilege Escalation' ? '10 min' : '5 min'}", "Limited tools (optional)"],
  "optimalCommands": ["command1 with full syntax", "command2 with full syntax", "command3 with full syntax"],
  "alternatives": ["alternative approach 1", "alternative approach 2"],
  "commonMistakes": ["mistake 1 to avoid", "mistake 2 to avoid"]
}

SCENARIO GUIDELINES:
- Active Directory: Focus on Kerberos, LDAP, SMB, domain enumeration, lateral movement
- Web Applications: Focus on SQLi, XSS, directory fuzzing, authentication bypass
- Network Enumeration: Focus on nmap, service discovery, port scanning
- Privilege Escalation: Focus on SUID, sudo, kernel exploits, cronjobs

OPTIMAL COMMANDS must be COMPLETE bash commands with full syntax.
NO explanations, just the commands.`;

      const response = await withAIRetry(() => 
        ai.chat.completions.create({
          model: 'kimi-k2-0711-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.9,
          max_tokens: 800,
        })
      );

      const content = response.choices[0]?.message?.content || '{}';
      console.log('[MuscleMemory] AI Response:', content.substring(0, 500));

      // Parse JSON (try multiple extraction methods)
      let scenarioData: any;
      try {
        // Try direct parse first
        scenarioData = JSON.parse(content);
      } catch {
        // Extract JSON from markdown if wrapped
        const jsonMatch = content.match(/```json?\s*({[\s\S]*?})\s*```/) || content.match(/({[\s\S]*})/);
        if (jsonMatch) {
          scenarioData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('No valid JSON found in AI response');
        }
      }

      // Validate required fields
      if (!scenarioData.scenario || !scenarioData.objective || !scenarioData.optimalCommands) {
        throw new Error('Missing required fields in scenario data');
      }

      const newScenario: MuscleMemoryScenario = {
        category: category as any,
        scenario: scenarioData.scenario,
        objective: scenarioData.objective,
        timeLimit: scenarioData.timeLimit || 300,
        constraints: scenarioData.constraints || [],
        optimalCommands: scenarioData.optimalCommands || [],
        alternatives: scenarioData.alternatives || [],
        commonMistakes: scenarioData.commonMistakes || [],
      };

      setScenario(newScenario);
      setTimeRemaining(newScenario.timeLimit);
      setIsActive(true);
      
      toast({
        title: 'Scenario Generated',
        description: `${newScenario.category} - ${formatTime(newScenario.timeLimit)} available`,
        duration: 3000,
      });

      // Focus input
      setTimeout(() => commandInputRef.current?.focus(), 100);

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate scenario',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsActive(false);
    evaluatePerformance();
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCommand.trim() || !isActive) return;

    setCommands(prev => [...prev, currentCommand.trim()]);
    setCurrentCommand('');
    commandInputRef.current?.focus();
  };

  const handleFinish = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    evaluatePerformance();
  };

  const showHint = () => {
    if (!scenario) return;
    
    const hintMessages = [
      `Optimal approach: ${scenario.optimalCommands[0]}`,
      `Alternative: ${scenario.alternatives[0] || 'Try different enumeration methods'}`,
      `Avoid: ${scenario.commonMistakes[0] || 'Missing critical enumeration'}`,
    ];

    toast({
      title: '💡 Hint',
      description: hintMessages[hintsUsed % hintMessages.length],
      duration: 8000,
    });

    setHintsUsed(prev => prev + 1);
  };

  const evaluatePerformance = async () => {
    if (!scenario || commands.length === 0) {
      toast({
        title: 'No Commands',
        description: 'You did not execute any commands.',
        variant: 'destructive',
      });
      return;
    }

    setIsEvaluating(true);

    try {
      const ai = new DevvAI();

      const prompt = `Evaluate this muscle memory training session:

SCENARIO: ${scenario.scenario}
OBJECTIVE: ${scenario.objective}
TIME LIMIT: ${scenario.timeLimit}s
TIME USED: ${scenario.timeLimit - timeRemaining}s

USER COMMANDS:
${commands.map((cmd, i) => `${i + 1}. ${cmd}`).join('\n')}

OPTIMAL COMMANDS:
${scenario.optimalCommands.map((cmd, i) => `${i + 1}. ${cmd}`).join('\n')}

EVALUATE:
1. Correctness (0-100): Did they achieve the objective?
2. Efficiency (0-100): How fast/optimal was the approach?
3. Missed Opportunities: What could have been better?

Return ONLY valid JSON (no markdown):
{
  "correctness": 0-100,
  "efficiency": 0-100,
  "achieved": true/false,
  "missedOpportunities": ["opportunity 1", "opportunity 2"],
  "feedback": "brief actionable feedback",
  "masteredCommands": ["command1", "command2"],
  "needsPractice": ["command1", "command2"]
}`;

      const response = await withAIRetry(() =>
        ai.chat.completions.create({
          model: 'kimi-k2-0711-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 600,
        })
      );

      const content = response.choices[0]?.message?.content || '{}';
      console.log('[MuscleMemory] Evaluation:', content.substring(0, 500));

      let evalData: any;
      try {
        evalData = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/```json?\s*({[\s\S]*?})\s*```/) || content.match(/({[\s\S]*})/);
        if (jsonMatch) {
          evalData = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Failed to parse evaluation');
        }
      }

      setEvaluation(evalData);

    } catch (error) {
      console.error('Evaluation error:', error);
      toast({
        title: 'Evaluation Failed',
        description: 'Could not evaluate performance',
        variant: 'destructive',
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const categories = [
    { name: 'Active Directory', icon: Target, color: 'text-red-500' },
    { name: 'Web Applications', icon: Zap, color: 'text-blue-500' },
    { name: 'Network Enumeration', icon: Terminal, color: 'text-green-500' },
    { name: 'Privilege Escalation', icon: AlertTriangle, color: 'text-amber-500' },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-gradient-primary">Muscle Memory Builder</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Speed, Instinct, Repetition — Build Red Team Reflexes
            </p>
          </div>
          
          <Button variant="outline" onClick={() => navigate('/')}>
            <FileText className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Category Selection */}
      {!scenario && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Card
              key={cat.name}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => !isGenerating && generateScenario(cat.name)}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <cat.icon className={`w-12 h-12 ${cat.color}`} />
                  <h3 className="font-semibold">{cat.name}</h3>
                  <Button size="sm" disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Start Drill
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Scenario */}
      {scenario && !evaluation && (
        <div className="space-y-4">
          {/* Timer & Status */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default">{scenario.category}</Badge>
                  {isActive && (
                    <div className="flex items-center gap-2">
                      <Clock className={`w-5 h-5 ${timeRemaining < 60 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
                      <span className={`text-2xl font-mono font-bold ${timeRemaining < 60 ? 'text-destructive' : ''}`}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={showHint} disabled={!isActive}>
                    💡 Hint
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleFinish}
                    disabled={!isActive || commands.length === 0 || isEvaluating}
                  >
                    {isEvaluating ? 'Evaluating...' : 'Finish & Evaluate'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Details */}
          <Card>
            <CardHeader>
              <CardTitle>Scenario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Context</p>
                <p className="text-base mt-1">{scenario.scenario}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Objective</p>
                <p className="text-base mt-1 text-primary font-semibold">{scenario.objective}</p>
              </div>
              
              {scenario.constraints.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Constraints</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {scenario.constraints.map((c, i) => (
                      <li key={i} className="text-sm">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Command Input */}
          <Card>
            <CardHeader>
              <CardTitle>Action Phase</CardTitle>
              <CardDescription>
                Type commands ONLY. No explanations. Press Enter to execute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCommandSubmit} className="flex gap-2">
                <div className="flex-1 relative">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={commandInputRef}
                    type="text"
                    value={currentCommand}
                    onChange={(e) => setCurrentCommand(e.target.value)}
                    placeholder="$ type command here..."
                    className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded font-mono text-sm"
                    disabled={!isActive}
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={!isActive || !currentCommand.trim()}>
                  Execute
                </Button>
              </form>

              {/* Command History */}
              {commands.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Executed Commands ({commands.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {commands.map((cmd, i) => (
                      <div key={i} className="text-sm font-mono bg-muted/30 px-3 py-1.5 rounded">
                        <span className="text-muted-foreground mr-2">{i + 1}.</span>
                        {cmd}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Evaluation Results */}
      {evaluation && scenario && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {evaluation.achieved ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive" />
                )}
                Evaluation Results
              </CardTitle>
              <CardDescription>
                Time Used: {formatTime(scenario.timeLimit - timeRemaining)} / {formatTime(scenario.timeLimit)} | 
                Hints Used: {hintsUsed} | 
                Commands: {commands.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Correctness</span>
                    <span className="text-sm font-mono">{evaluation.correctness}%</span>
                  </div>
                  <Progress value={evaluation.correctness} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Efficiency</span>
                    <span className="text-sm font-mono">{evaluation.efficiency}%</span>
                  </div>
                  <Progress value={evaluation.efficiency} />
                </div>
              </div>

              {/* Feedback */}
              <div>
                <h3 className="font-semibold mb-2">Feedback</h3>
                <p className="text-sm">{evaluation.feedback}</p>
              </div>

              {/* Optimal Commands */}
              <div>
                <h3 className="font-semibold mb-2">Optimal Command(s)</h3>
                <div className="space-y-2">
                  {scenario.optimalCommands.map((cmd, i) => (
                    <div key={i} className="bg-muted/50 p-3 rounded font-mono text-sm">
                      {cmd}
                    </div>
                  ))}
                </div>
              </div>

              {/* Missed Opportunities */}
              {evaluation.missedOpportunities?.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-amber-500">Missed Opportunities</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {evaluation.missedOpportunities.map((opp: string, i: number) => (
                      <li key={i} className="text-sm">{opp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mastered vs Needs Practice */}
              <div className="grid grid-cols-2 gap-4">
                {evaluation.masteredCommands?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-green-500">Mastered</h3>
                    <ul className="space-y-1">
                      {evaluation.masteredCommands.map((cmd: string, i: number) => (
                        <li key={i} className="text-sm font-mono">✓ {cmd}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {evaluation.needsPractice?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-amber-500">Needs Practice</h3>
                    <ul className="space-y-1">
                      {evaluation.needsPractice.map((cmd: string, i: number) => (
                        <li key={i} className="text-sm font-mono">⚠ {cmd}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button onClick={() => {
                  setScenario(null);
                  setEvaluation(null);
                  setCommands([]);
                  setHintsUsed(0);
                }}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Scenario
                </Button>
                <Button variant="outline" onClick={() => generateScenario(scenario.category)}>
                  Same Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
