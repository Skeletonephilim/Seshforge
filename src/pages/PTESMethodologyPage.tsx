import { useState } from 'react';
import { DevvAI } from '@devvai/devv-code-backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Circle, Loader2, Terminal, ChevronRight, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface PTESPhase {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  content?: string;
}

const ptesPhases: PTESPhase[] = [
  {
    id: 'reconnaissance',
    name: 'Reconnaissance',
    description: 'Information gathering and OSINT',
    completed: false,
  },
  {
    id: 'scanning',
    name: 'Scanning',
    description: 'Active port and service discovery',
    completed: false,
  },
  {
    id: 'enumeration',
    name: 'Enumeration',
    description: 'Detailed service enumeration',
    completed: false,
  },
  {
    id: 'gaining-access',
    name: 'Gaining Access',
    description: 'Initial exploitation and foothold',
    completed: false,
  },
  {
    id: 'privilege-escalation',
    name: 'Privilege Escalation',
    description: 'Elevating system privileges',
    completed: false,
  },
  {
    id: 'maintaining-access',
    name: 'Maintaining Access',
    description: 'Persistence mechanisms',
    completed: false,
  },
  {
    id: 'covering-tracks',
    name: 'Covering Tracks',
    description: 'Log clearing and cleanup',
    completed: false,
  },
];

export default function PTESMethodologyPage() {
  const [phases, setPhases] = useState<PTESPhase[]>(ptesPhases);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const { toast } = useToast();

  const currentPhase = phases[currentPhaseIndex];
  const progressPercentage = (phases.filter(p => p.completed).length / phases.length) * 100;

  const startPhase = async () => {
    setIsGenerating(true);
    setAiResponse('');

    try {
      const ai = new DevvAI();
      
      const prompt = `You are a professional penetration testing instructor teaching the PTES (Penetration Testing Execution Standard) methodology.

Current Phase: ${currentPhase.name}
Description: ${currentPhase.description}

Generate a comprehensive training module for this phase with:

1. **Overview**: Brief explanation of this phase's purpose in the pentesting lifecycle
2. **Key Commands**: 3-5 essential commands for this phase with full explanations
3. **Practical Scenario**: A realistic scenario to practice
4. **Common Mistakes**: What to avoid during this phase
5. **Quiz Question**: A scenario-based question to test understanding

Format commands in bash code blocks and explain each flag.

Example for Reconnaissance:
\`\`\`bash
nmap -sC -sV -p- -T4 target
\`\`\`
- -sC: Run default NSE scripts
- -sV: Version detection
- -p-: Scan all ports
- -T4: Aggressive timing

Make it practical and focused on real-world pentesting workflows.`;

      const stream = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert penetration tester and cybersecurity instructor. Teach using clear, methodical explanations with practical examples.'
          },
          { role: 'user', content: prompt }
        ],
        stream: true,
        max_tokens: 2000,
        temperature: 0.7,
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          setAiResponse(fullContent);
        }
      }

      // Update phase content
      const updatedPhases = [...phases];
      updatedPhases[currentPhaseIndex].content = fullContent;
      setPhases(updatedPhases);
      
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Failed to Load Phase',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) {
      toast({
        title: 'Answer Required',
        description: 'Please provide an answer before submitting',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const ai = new DevvAI();
      
      const prompt = `Phase: ${currentPhase.name}
User's Answer: ${userAnswer}

Evaluate this answer:
1. Is the methodology correct?
2. Are the commands appropriate for this phase?
3. What could be improved?
4. Provide constructive feedback

Keep feedback concise (3-4 sentences) and encouraging.`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a penetration testing instructor providing feedback on student answers. Be encouraging but point out methodology errors.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const feedback = response.choices[0].message.content || 'No feedback available';
      
      toast({
        title: 'Feedback Received',
        description: 'Check your response below',
      });

      setAiResponse(aiResponse + '\n\n---\n\n## Your Answer Feedback\n\n' + feedback);
      
    } catch (error) {
      console.error('Feedback error:', error);
      toast({
        title: 'Failed to Get Feedback',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const completePhase = () => {
    const updatedPhases = [...phases];
    updatedPhases[currentPhaseIndex].completed = true;
    setPhases(updatedPhases);
    
    if (currentPhaseIndex < phases.length - 1) {
      setCurrentPhaseIndex(currentPhaseIndex + 1);
      setAiResponse('');
      setUserAnswer('');
      toast({
        title: 'Phase Completed!',
        description: `Moving to ${phases[currentPhaseIndex + 1].name}`,
      });
    } else {
      toast({
        title: 'PTES Methodology Mastered!',
        description: 'You have completed all 7 phases',
      });
    }
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Terminal className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">PTES Methodology Engine</h1>
          <p className="text-muted-foreground font-mono text-sm">
            Master the Penetration Testing Execution Standard
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="terminal-window">
        <div className="terminal-header">
          <div className="terminal-dot bg-destructive"></div>
          <div className="terminal-dot bg-chart-3"></div>
          <div className="terminal-dot bg-secondary"></div>
          <span className="ml-2 text-xs text-muted-foreground font-mono">ptes-progress.log</span>
        </div>
        
        <CardHeader>
          <CardTitle>Training Progress</CardTitle>
          <CardDescription>Complete all 7 phases to master PTES methodology</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-mono">Overall Progress</span>
              <span className="font-mono text-primary">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {phases.map((phase, index) => (
              <button
                key={phase.id}
                onClick={() => {
                  setCurrentPhaseIndex(index);
                  setAiResponse(phase.content || '');
                  setUserAnswer('');
                }}
                className={`p-3 rounded-lg border transition-all text-left ${
                  index === currentPhaseIndex
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {phase.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-secondary" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-xs font-mono">{phase.name}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Phase Content */}
        <Card className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dot bg-destructive"></div>
            <div className="terminal-dot bg-chart-3"></div>
            <div className="terminal-dot bg-secondary"></div>
            <span className="ml-2 text-xs text-muted-foreground font-mono">{currentPhase.id}.md</span>
          </div>
          
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Phase {currentPhaseIndex + 1}: {currentPhase.name}
                  {currentPhase.completed && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{currentPhase.description}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {!aiResponse && !isGenerating && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <AlertCircle className="w-16 h-16 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-muted-foreground font-mono">
                    Phase not started yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click "Start Phase" to begin training
                  </p>
                </div>
                <Button onClick={startPhase} className="neon-glow gap-2">
                  <ChevronRight className="w-4 h-4" />
                  Start Phase
                </Button>
              </div>
            )}

            {(aiResponse || isGenerating) && (
              <div className="prose prose-invert prose-sm max-w-none overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const inline = !match;
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus as any}
                          language={match[1]}
                          PreTag="div"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {aiResponse}
                </ReactMarkdown>
                {isGenerating && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1">▋</span>
                )}
              </div>
            )}

            {aiResponse && !isGenerating && (
              <div className="flex gap-2">
                <Button onClick={startPhase} variant="outline" size="sm">
                  Regenerate
                </Button>
                <Button onClick={completePhase} className="neon-glow gap-2" size="sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Mark Complete & Continue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interactive Practice */}
        <Card className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dot bg-destructive"></div>
            <div className="terminal-dot bg-chart-3"></div>
            <div className="terminal-dot bg-secondary"></div>
            <span className="ml-2 text-xs text-muted-foreground font-mono">practice.sh</span>
          </div>
          
          <CardHeader>
            <CardTitle>Your Answer</CardTitle>
            <CardDescription>
              Answer the quiz question or describe your approach
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <textarea
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your methodology or commands here..."
              className="w-full min-h-[300px] p-4 rounded-lg bg-background border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={isGenerating || !aiResponse}
            />

            <Button
              onClick={submitAnswer}
              disabled={isGenerating || !aiResponse || !userAnswer.trim()}
              className="w-full gap-2"
              variant="secondary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting Feedback...
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  Submit for Feedback
                </>
              )}
            </Button>

            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground font-mono">
                <span className="text-secondary">{'>'}</span> Tip: Explain your reasoning, not just commands. 
                Why would you use this approach in this phase?
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
