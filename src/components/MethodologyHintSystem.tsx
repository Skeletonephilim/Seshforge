import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DevvAI } from '@devvai/devv-code-backend';
import { 
  Lightbulb, 
  BookOpen, 
  Target, 
  AlertTriangle, 
  TrendingUp,
  Zap,
  Loader2,
  Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface HintLevel {
  id: string;
  label: string;
  description: string;
  icon: any;
  pointCost: number;
}

const HINT_LEVELS: HintLevel[] = [
  {
    id: 'strategic',
    label: 'Strategic Hint',
    description: 'High-level methodology guidance - what PHASE should you focus on?',
    icon: Target,
    pointCost: 3,
  },
  {
    id: 'tactical',
    label: 'Tactical Hint',
    description: 'Direction hint - what TYPE of action is needed?',
    icon: TrendingUp,
    pointCost: 5,
  },
  {
    id: 'technical',
    label: 'Technical Hint',
    description: 'Tool/command suggestion - what TOOL category to use?',
    icon: Zap,
    pointCost: 8,
  },
  {
    id: 'specific',
    label: 'Specific Hint',
    description: 'Direct answer - the exact command (use sparingly)',
    icon: AlertTriangle,
    pointCost: 15,
  },
];

interface MethodologyHintSystemProps {
  currentPhase: string;
  recentCommands: string[];
  scenarioContext: string;
  onHintUsed: (level: string, pointsCost: number) => void;
  hintsUsed: number;
  isDisabled?: boolean;
  onTimeExtension?: (minutes: number, pointsCost: number) => void;
}

export default function MethodologyHintSystem({
  currentPhase,
  recentCommands,
  scenarioContext,
  onHintUsed,
  hintsUsed,
  isDisabled = false,
  onTimeExtension,
}: MethodologyHintSystemProps) {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeExtensionsUsed, setTimeExtensionsUsed] = useState({ twoMin: false, fiveMin: false });

  const generateHint = async (level: string) => {
    setIsGenerating(true);
    setSelectedLevel(level);

    try {
      const ai = new DevvAI();
      
      const levelPrompts = {
        strategic: `You are a penetration testing mentor providing STRATEGIC guidance.

**Context:**
Current Phase: ${currentPhase}
Scenario: ${scenarioContext}
Recent Commands: ${recentCommands.slice(-3).join(', ') || 'None yet'}

**Your Task:**
Provide a HIGH-LEVEL strategic hint about what PENTESTING PHASE the student should focus on next.

DO NOT mention specific tools or commands.
DO NOT give away the answer.

Focus on methodology questions like:
- "Have you completed reconnaissance?"
- "What's the next logical phase after scanning?"
- "Are you gathering enough information before attempting exploitation?"

**Format:**
🎯 **Strategic Guidance**

[2-3 sentences about the PHASE they should focus on and WHY]

**Pentesting Methodology Reminder:**
1. Reconnaissance (passive info gathering)
2. Scanning (active port/service discovery)  
3. Enumeration (detailed service analysis)
4. Exploitation (gaining access)
5. Privilege Escalation (gaining root)`,

        tactical: `You are a penetration testing mentor providing TACTICAL guidance.

**Context:**
Current Phase: ${currentPhase}
Scenario: ${scenarioContext}
Recent Commands: ${recentCommands.slice(-3).join(', ') || 'None yet'}

**Your Task:**
Provide a TACTICAL hint about what TYPE of action is needed.

DO NOT mention specific tool names or exact commands.
DO suggest the category or type of technique.

Examples of good tactical hints:
- "You should enumerate the web service more thoroughly"
- "Try brute forcing with a common wordlist"
- "Consider checking for privilege escalation vectors"
- "Look for hidden directories or files"

**Format:**
⚡ **Tactical Direction**

[2-3 sentences about WHAT TYPE of action to take and WHY it's appropriate for this phase]

**Current Phase Context:**
${currentPhase === 'reconnaissance' ? 'Focus on gathering information without alerting the target' : ''}
${currentPhase === 'scanning' ? 'Identify all open ports and running services' : ''}
${currentPhase === 'enumeration' ? 'Extract detailed information from discovered services' : ''}
${currentPhase === 'exploitation' ? 'Leverage discovered vulnerabilities to gain access' : ''}
${currentPhase === 'privilege_escalation' ? 'Find ways to elevate your privileges to root' : ''}`,

        technical: `You are a penetration testing mentor providing TECHNICAL guidance.

**Context:**
Current Phase: ${currentPhase}
Scenario: ${scenarioContext}
Recent Commands: ${recentCommands.slice(-3).join(', ') || 'None yet'}

**Your Task:**
Suggest the CATEGORY of tool to use, but not the exact command.

Examples:
- "Use a port scanner to discover open services"
- "Try a directory brute-forcing tool"
- "Use an enumeration script for this service"
- "Check for SUID binaries with a privilege escalation tool"

**Format:**
🔧 **Technical Suggestion**

[Tool category recommendation and basic usage pattern]

**Why this tool category:**
[Explain why this type of tool is appropriate for the current situation]

**Multiple Approaches:**
[Mention that there are several valid tools in this category - don't mandate one specific tool]`,

        specific: `You are a penetration testing mentor providing a SPECIFIC command suggestion.

**Context:**
Current Phase: ${currentPhase}
Scenario: ${scenarioContext}
Recent Commands: ${recentCommands.slice(-3).join(', ') || 'None yet'}

**Your Task:**
Provide a SPECIFIC command that would be appropriate.

**Format:**
⚠️ **Specific Command Suggestion**

\`\`\`bash
[exact command here]
\`\`\`

**Flag Explanations:**
[Explain what each flag/argument does]

**Why this command:**
[Explain why this specific command is appropriate for this situation]

**Alternative Approaches:**
[Mention 1-2 other valid commands that could achieve similar results]

**Important:** This is a direct answer. Try to figure it out with lighter hints first in the future.`,
      };

      const prompt = levelPrompts[level as keyof typeof levelPrompts];

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert penetration testing instructor who provides hints at different levels of specificity. Your goal is to teach methodology and thinking, not just give answers.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
      });

      const hint = response.choices[0]?.message?.content || 'Unable to generate hint. Please try again.';
      setCurrentHint(hint);

      // Notify parent component
      const hintLevel = HINT_LEVELS.find(h => h.id === level);
      if (hintLevel) {
        onHintUsed(level, hintLevel.pointCost);
      }
    } catch (error) {
      console.error('Hint generation error:', error);
      setCurrentHint('⚠️ Failed to generate hint. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetHint = () => {
    setCurrentHint(null);
    setSelectedLevel(null);
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-warning-amber" />
          Methodology Hint System
          <Badge variant="outline" className="ml-auto">
            {hintsUsed} hints used
          </Badge>
        </CardTitle>
        <CardDescription>
          Get strategic guidance based on pentesting methodology. Choose hint level wisely - higher levels cost more points!
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!currentHint ? (
          <>
            <div className="space-y-3">
              {HINT_LEVELS.map((level) => {
                const Icon = level.icon;
                return (
                  <button
                    key={level.id}
                    onClick={() => generateHint(level.id)}
                    disabled={isDisabled || isGenerating}
                    className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm">{level.label}</h4>
                          <Badge variant={level.pointCost >= 10 ? 'destructive' : 'secondary'}>
                            -{level.pointCost} pts
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{level.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Time Extension Buttons */}
            {onTimeExtension && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Time Extensions (One-time Use)</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (!timeExtensionsUsed.twoMin) {
                        onTimeExtension(2, 3);
                        setTimeExtensionsUsed(prev => ({ ...prev, twoMin: true }));
                      }
                    }}
                    disabled={isDisabled || timeExtensionsUsed.twoMin}
                    className="p-3 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">+2 Minutes</span>
                      <Badge variant="secondary">-3 pts</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {timeExtensionsUsed.twoMin ? 'Already used' : 'Extend time limit'}
                    </p>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!timeExtensionsUsed.fiveMin) {
                        onTimeExtension(5, 5);
                        setTimeExtensionsUsed(prev => ({ ...prev, fiveMin: true }));
                      }
                    }}
                    disabled={isDisabled || timeExtensionsUsed.fiveMin}
                    className="p-3 rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">+5 Minutes</span>
                      <Badge variant="secondary">-5 pts</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {timeExtensionsUsed.fiveMin ? 'Already used' : 'Extend time limit'}
                    </p>
                  </button>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="flex items-center justify-center gap-2 p-4 bg-muted/30 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Generating hint...</span>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-warning-amber/10 border border-warning-amber/30 rounded-lg">
              <BookOpen className="w-4 h-4 text-warning-amber mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-warning-amber mb-1">Hint Strategy:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Start with Strategic hints to understand the phase</li>
                  <li>Use Tactical hints when you know the phase but not the action</li>
                  <li>Use Technical hints when you need tool category guidance</li>
                  <li>Only use Specific hints as a last resort</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  code: ({ className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return isInline ? (
                      <code className="bg-terminal-black/50 px-1.5 py-0.5 rounded text-matrix-green text-xs" {...props}>
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
                          fontSize: '0.8rem',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  },
                }}
              >
                {currentHint}
              </ReactMarkdown>
            </div>

            <div className="flex gap-2">
              <Button onClick={resetHint} variant="outline" className="flex-1">
                Request Another Hint
              </Button>
              <Button onClick={resetHint} className="flex-1">
                Continue Without Hint
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
