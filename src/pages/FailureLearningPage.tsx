import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth-store";
import { table, DevvAI } from "@devvai/devv-code-backend";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { parseAIJson } from "@/lib/utils";
import {
  AlertTriangle,
  Brain,
  TrendingUp,
  Target,
  BookOpen,
  Zap,
  RefreshCw,
  Download,
  Lightbulb,
  Activity,
  XCircle,
  CheckCircle,
} from "lucide-react";

interface FailurePattern {
  category: string;
  count: number;
  severity: "low" | "medium" | "high" | "critical";
  examples: string[];
  improvement: number; // percentage
}

interface WeaknessArea {
  phase: string;
  score: number;
  failures: number;
  commonMistakes: string[];
  recommendedActions: string[];
}

interface FailureRecord {
  _id: string;
  timestamp: string;
  context: string;
  userAction: string;
  expectedBehavior: string;
  actualOutcome: string;
  category: string;
  phase: string;
  aiAnalysis: string;
  difficulty: string;
  resolved: boolean;
}

interface AdaptiveDrill {
  question: string;
  context: string;
  difficulty: string;
  targetWeakness: string;
  acceptedAnswers: string[];
  explanation: string;
}

export default function FailureLearningPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingDrill, setGeneratingDrill] = useState(false);
  
  const [failurePatterns, setFailurePatterns] = useState<FailurePattern[]>([]);
  const [weaknessAreas, setWeaknessAreas] = useState<WeaknessArea[]>([]);
  const [failureRecords, setFailureRecords] = useState<FailureRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<FailureRecord | null>(null);
  
  const [aiRecommendations, setAiRecommendations] = useState<string>("");
  const [adaptiveDrill, setAdaptiveDrill] = useState<AdaptiveDrill | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [drillFeedback, setDrillFeedback] = useState<string>("");
  
  const [overallImprovement, setOverallImprovement] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadFailureData();
  }, [user, navigate]);

  const loadFailureData = async () => {
    try {
      setLoading(true);

      // Load failure records from database
      const records = await table.getItems("ff3csuab5c74", {
        query: {
          _uid: user!.uid,
        },
        sort: "_id",
        order: "desc",
        limit: 50,
      });

      const failureData = records.items as FailureRecord[];
      setFailureRecords(failureData);

      // Analyze patterns
      await analyzeFailurePatterns(failureData);
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading failure data:", error);
      toast({
        title: "Error",
        description: "Failed to load failure analysis data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const analyzeFailurePatterns = async (records: FailureRecord[]) => {
    if (records.length === 0) {
      setFailurePatterns([]);
      setWeaknessAreas([]);
      return;
    }

    // Group by category
    const categoryMap = new Map<string, number>();
    const phaseMap = new Map<string, { failures: number; mistakes: Set<string> }>();
    
    records.forEach((record) => {
      // Category counting
      categoryMap.set(record.category, (categoryMap.get(record.category) || 0) + 1);
      
      // Phase tracking
      if (!phaseMap.has(record.phase)) {
        phaseMap.set(record.phase, { failures: 0, mistakes: new Set() });
      }
      const phaseData = phaseMap.get(record.phase)!;
      phaseData.failures++;
      phaseData.mistakes.add(record.category);
    });

    // Calculate failure patterns
    const patterns: FailurePattern[] = Array.from(categoryMap.entries()).map(([category, count]) => {
      const categoryRecords = records.filter((r) => r.category === category);
      const recentCount = categoryRecords.filter(
        (r) => Date.now() - new Date(r.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
      ).length;
      const oldCount = count - recentCount;
      const improvement = oldCount > 0 ? ((oldCount - recentCount) / oldCount) * 100 : 0;

      return {
        category,
        count,
        severity: count > 10 ? "critical" : count > 5 ? "high" : count > 2 ? "medium" : "low",
        examples: categoryRecords.slice(0, 3).map((r) => r.userAction),
        improvement: Math.max(0, improvement),
      };
    });

    patterns.sort((a, b) => b.count - a.count);
    setFailurePatterns(patterns);

    // Calculate weakness areas
    const weaknesses: WeaknessArea[] = Array.from(phaseMap.entries()).map(([phase, data]) => {
      const phaseRecords = records.filter((r) => r.phase === phase);
      const resolvedCount = phaseRecords.filter((r) => r.resolved).length;
      const score = phaseRecords.length > 0 ? (resolvedCount / phaseRecords.length) * 100 : 100;

      return {
        phase,
        score: Math.round(score),
        failures: data.failures,
        commonMistakes: Array.from(data.mistakes).slice(0, 5),
        recommendedActions: [], // Will be filled by AI
      };
    });

    weaknesses.sort((a, b) => a.score - b.score);
    setWeaknessAreas(weaknesses);

    // Calculate overall improvement
    const totalFailures = records.length;
    const recentFailures = records.filter(
      (r) => Date.now() - new Date(r.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;
    const oldFailures = totalFailures - recentFailures;
    const improvement = oldFailures > 0 ? ((oldFailures - recentFailures) / oldFailures) * 100 : 0;
    setOverallImprovement(Math.max(0, Math.round(improvement)));

    // Determine current difficulty based on performance
    const avgScore = weaknesses.reduce((sum, w) => sum + w.score, 0) / weaknesses.length;
    if (avgScore >= 80) {
      setCurrentDifficulty("advanced");
    } else if (avgScore >= 60) {
      setCurrentDifficulty("intermediate");
    } else {
      setCurrentDifficulty("beginner");
    }
  };

  const generateAIRecommendations = async () => {
    if (failurePatterns.length === 0 && weaknessAreas.length === 0) {
      toast({
        title: "No Data",
        description: "Complete some training modules to get personalized recommendations",
      });
      return;
    }

    try {
      setAnalyzing(true);

      const patternsText = failurePatterns
        .map((p) => `- ${p.category}: ${p.count} failures (${p.severity} severity)`)
        .join("\n");

      const weaknessText = weaknessAreas
        .map((w) => `- ${w.phase}: ${w.score}% success rate, ${w.failures} failures`)
        .join("\n");

      const prompt = `You are a cybersecurity training AI analyzing a student's failure patterns in pentesting practice.

**Failure Patterns:**
${patternsText}

**Weakness Areas by Phase:**
${weaknessText}

**Current Difficulty Level:** ${currentDifficulty}
**Overall Improvement:** ${overallImprovement}%

Generate a personalized learning recommendation that includes:

1. **Root Cause Analysis**: What fundamental concepts are being missed?
2. **Prioritized Learning Path**: Which skills to focus on first (in order)
3. **Specific Action Items**: Concrete steps to improve (5-7 items)
4. **Resource Recommendations**: What to study or practice
5. **Adaptive Difficulty Advice**: Should difficulty be increased, maintained, or decreased?

Focus on methodology and thought process, not just commands. Be encouraging but realistic.`;

      let fullResponse = "";
      const ai = new DevvAI();
      const stream = await ai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "kimi-k2-0711-preview",
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullResponse += content;
        setAiRecommendations(fullResponse);
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI recommendations",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const generateAdaptiveDrill = async () => {
    if (weaknessAreas.length === 0) {
      toast({
        title: "No Data",
        description: "Complete some training to identify weakness areas",
      });
      return;
    }

    try {
      setGeneratingDrill(true);
      setDrillFeedback("");
      setUserAnswer("");

      const targetWeakness = weaknessAreas[0];

      const prompt = `You are a cybersecurity training AI creating an adaptive drill to address a specific weakness.

**Target Weakness:** ${targetWeakness.phase}
**Success Rate:** ${targetWeakness.score}%
**Common Mistakes:** ${targetWeakness.commonMistakes.join(", ")}
**Student Difficulty Level:** ${currentDifficulty}

Generate a realistic pentesting drill as a JSON object with this EXACT structure:
{
  "question": "Clear scenario-based question",
  "context": "Realistic pentesting scenario with specific details",
  "difficulty": "${currentDifficulty}",
  "targetWeakness": "${targetWeakness.phase}",
  "acceptedAnswers": ["answer1", "answer2", "answer3"],
  "explanation": "Why these approaches work and flag explanations"
}

Requirements:
- Question must be context-driven (provide a realistic scenario)
- Accept MULTIPLE valid command approaches (nmap, gobuster, hydra, etc.)
- Explanation must include flag/argument explanations
- Focus on the ${targetWeakness.phase} phase of pentesting
- Difficulty appropriate for ${currentDifficulty} level

Return ONLY valid JSON, no markdown or extra text.`;

      const ai = new DevvAI();
      const response = await ai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "kimi-k2-0711-preview",
      });

      const content = response.choices[0]?.message?.content || "";
      
      // Extract JSON from response
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/```json\n?/, "").replace(/\n?```$/, "");
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```\n?/, "").replace(/\n?```$/, "");
      }

      const drill = parseAIJson<AdaptiveDrill>(jsonStr);
      setAdaptiveDrill(drill);
    } catch (error) {
      console.error("Error generating adaptive drill:", error);
      toast({
        title: "Error",
        description: "Failed to generate adaptive drill",
        variant: "destructive",
      });
    } finally {
      setGeneratingDrill(false);
    }
  };

  const submitDrillAnswer = async () => {
    if (!adaptiveDrill || !userAnswer.trim()) return;

    try {
      setGeneratingDrill(true);

      const prompt = `You are evaluating a pentesting drill answer.

**Scenario:** ${adaptiveDrill.context}
**Question:** ${adaptiveDrill.question}
**Student Answer:** ${userAnswer}
**Accepted Approaches:** ${adaptiveDrill.acceptedAnswers.join(", ")}

Evaluate if the student's answer is correct (exact match not required - accept valid alternatives).

Respond with:
1. ✅ Correct / ❌ Incorrect
2. Explanation of why the command works (or doesn't)
3. Flag explanations for their command
4. Alternative valid approaches they could use
5. What the next logical step would be after this command

Be specific and educational. Focus on methodology.`;

      let fullFeedback = "";
      const ai = new DevvAI();
      const stream = await ai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "kimi-k2-0711-preview",
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullFeedback += content;
        setDrillFeedback(fullFeedback);
      }

      // Save attempt to database (whether correct or not)
      const isCorrect = fullFeedback.toLowerCase().includes("✅ correct");
      
      if (!isCorrect) {
        // Log failure for future analysis
        await table.addItem("ff3csuab5c74", {
          _uid: user!.uid,
          timestamp: new Date().toISOString(),
          context: adaptiveDrill.context,
          userAction: userAnswer,
          expectedBehavior: adaptiveDrill.acceptedAnswers.join(" OR "),
          actualOutcome: "Incorrect answer provided",
          category: adaptiveDrill.targetWeakness,
          phase: adaptiveDrill.targetWeakness,
          aiAnalysis: fullFeedback,
          difficulty: adaptiveDrill.difficulty,
          resolved: false,
        });
      }
    } catch (error) {
      console.error("Error evaluating drill:", error);
      toast({
        title: "Error",
        description: "Failed to evaluate answer",
        variant: "destructive",
      });
    } finally {
      setGeneratingDrill(false);
    }
  };

  const recordFailure = async (record: Omit<FailureRecord, "_id" | "timestamp">) => {
    try {
      await table.addItem("ff3csuab5c74", {
        _uid: user!.uid,
        ...record,
        timestamp: new Date().toISOString(),
      });
      
      toast({
        title: "Failure Recorded",
        description: "This will help improve your personalized training",
      });
      
      // Reload data
      await loadFailureData();
    } catch (error) {
      console.error("Error recording failure:", error);
    }
  };

  const markResolved = async (recordId: string) => {
    try {
      await table.updateItem("ff3csuab5c74", {
        _uid: user!.uid,
        _id: recordId,
        resolved: true,
      });

      toast({
        title: "Progress!",
        description: "Weakness marked as resolved",
      });

      await loadFailureData();
    } catch (error) {
      console.error("Error marking resolved:", error);
    }
  };

  const exportAnalysis = () => {
    const markdown = `# Failure Analysis Report
Generated: ${new Date().toLocaleDateString()}

## Overall Performance
- **Improvement Rate:** ${overallImprovement}%
- **Current Difficulty:** ${currentDifficulty}
- **Total Failures Tracked:** ${failureRecords.length}

## Failure Patterns
${failurePatterns
  .map(
    (p) => `### ${p.category} (${p.severity.toUpperCase()})
- **Occurrences:** ${p.count}
- **Improvement:** ${p.improvement.toFixed(1)}%
- **Examples:**
${p.examples.map((ex) => `  - \`${ex}\``).join("\n")}
`
  )
  .join("\n")}

## Weakness Areas by Phase
${weaknessAreas
  .map(
    (w) => `### ${w.phase}
- **Success Rate:** ${w.score}%
- **Failures:** ${w.failures}
- **Common Mistakes:** ${w.commonMistakes.join(", ")}
`
  )
  .join("\n")}

## AI Recommendations
${aiRecommendations || "Generate recommendations to see personalized advice."}
`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `failure-analysis-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Failure analysis saved as Markdown",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Analyzing failure patterns...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Failure-Based Learning System
            </h1>
            <p className="text-muted-foreground mt-2">
              Transform mistakes into mastery through adaptive training
            </p>
          </div>
          <Button variant="outline" onClick={exportAnalysis}>
            <Download className="w-4 h-4 mr-2" />
            Export Analysis
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Improvement</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">+{overallImprovement}%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days vs previous</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Difficulty</CardTitle>
            <Target className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize text-blue-400">{currentDifficulty}</div>
            <p className="text-xs text-muted-foreground mt-1">Adaptive scaling enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failure Patterns</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{failurePatterns.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique weakness categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Failures</CardTitle>
            <Activity className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{failureRecords.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Tracked for learning</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">Failure Patterns</TabsTrigger>
          <TabsTrigger value="weaknesses">Weakness Areas</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="adaptive">Adaptive Drill</TabsTrigger>
          <TabsTrigger value="history">Failure History</TabsTrigger>
        </TabsList>

        {/* Failure Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Failure Pattern Analysis
              </CardTitle>
              <CardDescription>
                Recurring mistakes organized by category and severity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {failurePatterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No failure patterns detected yet</p>
                  <p className="text-sm mt-2">Complete training modules to build your learning profile</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {failurePatterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      className="border border-border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{pattern.category}</h3>
                            <Badge variant={getSeverityColor(pattern.severity) as any}>
                              {pattern.severity}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{pattern.count} occurrences</span>
                            {pattern.improvement > 0 && (
                              <span className="text-green-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                +{pattern.improvement.toFixed(0)}% improvement
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Recent Examples:</p>
                        <ul className="space-y-1">
                          {pattern.examples.map((example, i) => (
                            <li key={i} className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weakness Areas Tab */}
        <TabsContent value="weaknesses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                Weakness Areas by Pentesting Phase
              </CardTitle>
              <CardDescription>
                Performance breakdown across pentesting methodology phases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weaknessAreas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No weakness data available yet</p>
                  <p className="text-sm mt-2">Start practicing to identify areas for improvement</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {weaknessAreas.map((weakness, idx) => (
                    <div key={idx} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{weakness.phase}</h3>
                          <p className="text-sm text-muted-foreground">
                            {weakness.failures} failures tracked
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            <span
                              className={
                                weakness.score >= 80
                                  ? "text-green-400"
                                  : weakness.score >= 60
                                  ? "text-amber-400"
                                  : "text-red-400"
                              }
                            >
                              {weakness.score}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">success rate</p>
                        </div>
                      </div>

                      <Progress value={weakness.score} className="h-2" />

                      <div>
                        <p className="text-sm font-medium mb-2">Common Mistakes:</p>
                        <div className="flex flex-wrap gap-2">
                          {weakness.commonMistakes.map((mistake, i) => (
                            <Badge key={i} variant="outline">
                              {mistake}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    AI-Powered Learning Recommendations
                  </CardTitle>
                  <CardDescription>
                    Personalized guidance based on your failure patterns
                  </CardDescription>
                </div>
                <Button
                  onClick={generateAIRecommendations}
                  disabled={analyzing || failurePatterns.length === 0}
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Generate Recommendations
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiRecommendations ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      code: ({ node, inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {aiRecommendations}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Generate Recommendations" to get personalized learning advice</p>
                  {failurePatterns.length === 0 && (
                    <p className="text-sm mt-2">Complete some training first to build your profile</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adaptive Drill Tab */}
        <TabsContent value="adaptive" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Adaptive Difficulty Drill
                  </CardTitle>
                  <CardDescription>
                    Practice drills targeting your specific weaknesses
                  </CardDescription>
                </div>
                <Button
                  onClick={generateAdaptiveDrill}
                  disabled={generatingDrill || weaknessAreas.length === 0}
                >
                  {generatingDrill ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate New Drill
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {adaptiveDrill ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge>{adaptiveDrill.difficulty}</Badge>
                      <Badge variant="outline">{adaptiveDrill.targetWeakness}</Badge>
                    </div>
                    
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Scenario:</p>
                      <p className="font-medium">{adaptiveDrill.context}</p>
                    </div>

                    <div>
                      <p className="font-semibold text-lg mb-2">{adaptiveDrill.question}</p>
                    </div>
                  </div>

                  {!drillFeedback && (
                    <div className="space-y-3">
                      <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Enter your command here..."
                        className="w-full h-24 px-4 py-3 bg-background border border-border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <Button
                        onClick={submitDrillAnswer}
                        disabled={!userAnswer.trim() || generatingDrill}
                        className="w-full"
                      >
                        {generatingDrill ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Evaluating...
                          </>
                        ) : (
                          "Submit Answer"
                        )}
                      </Button>
                    </div>
                  )}

                  {drillFeedback && (
                    <div className="space-y-4">
                      <div className="border-t border-border pt-4">
                        <div className="prose prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              code: ({ node, inline, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || "");
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={oneDark}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, "")}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {drillFeedback}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setDrillFeedback("");
                          setUserAnswer("");
                          generateAdaptiveDrill();
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Next Drill
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Generate New Drill" to start adaptive training</p>
                  {weaknessAreas.length === 0 && (
                    <p className="text-sm mt-2">Complete some training first to identify weaknesses</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failure History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                Failure History Log
              </CardTitle>
              <CardDescription>
                Complete record of tracked failures and learning moments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {failureRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No failure records yet</p>
                  <p className="text-sm mt-2">Your mistakes will be tracked here for learning</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {failureRecords.map((record) => (
                    <div
                      key={record._id}
                      className={`border rounded-lg p-4 space-y-2 cursor-pointer transition-colors ${
                        selectedRecord?._id === record._id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedRecord(selectedRecord?._id === record._id ? null : record)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {record.resolved ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <Badge variant="outline">{record.phase}</Badge>
                            <Badge>{record.category}</Badge>
                          </div>
                          <p className="text-sm font-mono text-muted-foreground">
                            {record.userAction}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {new Date(record.timestamp).toLocaleDateString()}
                        </div>
                      </div>

                      {selectedRecord?._id === record._id && (
                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-1">Context:</p>
                            <p className="text-sm text-muted-foreground">{record.context}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Expected:</p>
                            <p className="text-sm text-muted-foreground">{record.expectedBehavior}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Actual Outcome:</p>
                            <p className="text-sm text-muted-foreground">{record.actualOutcome}</p>
                          </div>
                          {record.aiAnalysis && (
                            <div>
                              <p className="text-sm font-medium mb-1">AI Analysis:</p>
                              <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                {record.aiAnalysis}
                              </div>
                            </div>
                          )}
                          {!record.resolved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                markResolved(record._id);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark as Resolved
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
