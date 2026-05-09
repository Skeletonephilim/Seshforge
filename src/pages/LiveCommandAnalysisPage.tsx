import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Download, RotateCcw, TrendingUp, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DevvAI } from '@devvai/devv-code-backend';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { parseAIJson } from '@/lib/utils';

interface AnalysisResult {
  attackPath: string;
  whatYouDidWell: string[];
  whatYouMissed: string[];
  professionalApproach: string;
  phaseBreakdown: {
    reconnaissance: { quality: string; notes: string };
    scanning: { quality: string; notes: string };
    enumeration: { quality: string; notes: string };
    exploitation: { quality: string; notes: string };
    privilegeEscalation: { quality: string; notes: string };
  };
  improvementSuggestions: string[];
  commandMastery: string[];
  overallAssessment: string;
}

export default function LiveCommandAnalysisPage() {
  const [commandHistory, setCommandHistory] = useState('');
  const [context, setContext] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzeCommands = async () => {
    if (!commandHistory.trim()) {
      toast({
        title: 'No Commands',
        description: 'Please paste your command history',
        variant: 'destructive',
      });
      return;
    }
    
    // Enhanced validation
    const commandCount = commandHistory.split('\n').filter(line => line.trim().length > 0).length;
    if (commandCount < 3) {
      toast({
        title: 'Insufficient Commands',
        description: 'Please provide at least 3 commands for meaningful analysis',
        variant: 'destructive',
      });
      return;
    }
    
    if (commandHistory.length > 50000) {
      toast({
        title: 'Command History Too Long',
        description: 'Please limit your command history to ~30-40 commands (50,000 characters max)',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const ai = new DevvAI();
      
      const systemPrompt = `You are a senior penetration testing instructor analyzing a student's command history from a TryHackMe/HackTheBox engagement.

**STUDENT'S COMMAND HISTORY:**
\`\`\`bash
${commandHistory}
\`\`\`

**CONTEXT (if provided):**
${context || 'No additional context provided'}

**YOUR TASK:**
Perform a comprehensive analysis as if you're a professional red team operator reviewing their work. Reconstruct their attack path, identify what they did well, what they missed, and what a professional pentester would do differently.

**ANALYSIS REQUIREMENTS:**

1. **Attack Path Reconstruction**
   - Narrative reconstruction of their attack from start to finish
   - Identify which pentesting phases they covered
   - Note any logical gaps or jumps in methodology

2. **What They Did Well**
   - List specific commands or approaches that were correct
   - Highlight good methodology decisions
   - Acknowledge proper tool usage

3. **What They Missed**
   - Enumerate opportunities they didn't explore
   - Point out services/ports/directories that weren't properly enumerated
   - Identify potential attack vectors they overlooked

4. **Professional Pentester Approach**
   - Describe the complete workflow a professional would follow
   - Include specific commands with explanations
   - Show the "ideal" attack path for this target

5. **Phase-by-Phase Breakdown**
   For each phase (Reconnaissance, Scanning, Enumeration, Exploitation, Privilege Escalation):
   - Quality: "Excellent" / "Good" / "Adequate" / "Insufficient" / "Missing"
   - Notes: Specific observations about their performance in this phase

6. **Improvement Suggestions**
   - Concrete actionable advice
   - Specific tools or techniques they should learn
   - Common mistakes to avoid

7. **Commands to Master**
   - List essential commands they should practice
   - Include full command syntax with flag explanations
   - Explain when and why to use each command

8. **Overall Assessment**
   - Summary of their skill level
   - Estimated readiness for certifications (PT1, OSCP, etc.)
   - Next steps in their learning journey

**RESPONSE FORMAT (JSON):**
{
  "attackPath": "[Detailed narrative reconstruction of their attack - 3-5 paragraphs explaining what they did step by step]",
  "whatYouDidWell": [
    "Specific thing they did well with explanation",
    "Another good decision they made",
    "Proper tool usage example"
  ],
  "whatYouMissed": [
    "Service/port that wasn't enumerated properly",
    "Attack vector they overlooked",
    "Technique they should have tried"
  ],
  "professionalApproach": "[Complete workflow a professional would follow - include specific commands in markdown code blocks]",
  "phaseBreakdown": {
    "reconnaissance": {
      "quality": "Good",
      "notes": "Detailed observations"
    },
    "scanning": {
      "quality": "Excellent",
      "notes": "Specific feedback"
    },
    "enumeration": {
      "quality": "Adequate",
      "notes": "What could be improved"
    },
    "exploitation": {
      "quality": "Good",
      "notes": "Analysis of approach"
    },
    "privilegeEscalation": {
      "quality": "Insufficient",
      "notes": "Missing steps"
    }
  },
  "improvementSuggestions": [
    "Concrete actionable advice",
    "Specific technique to learn",
    "Methodology improvement"
  ],
  "commandMastery": [
    "nmap -sC -sV -p- target (-sC: default scripts, -sV: version detection, -p-: all ports)",
    "gobuster dir -u http://target -w wordlist.txt -x php,html,txt",
    "sudo -l (check sudo permissions for privesc)"
  ],
  "overallAssessment": "[2-3 paragraphs: skill level, certification readiness, next steps]"
}

Be honest, detailed, and educational. Compare their approach to industry best practices and PTES/OSSTMM methodology.`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [{ role: 'user', content: systemPrompt }],
      });

      const resultText = response.choices[0]?.message?.content || '{}';
      
      // Use parseAIJson directly - it handles extraction and sanitization properly
      const analysisResult = parseAIJson<AnalysisResult>(resultText);

      setAnalysis(analysisResult);

      toast({
        title: 'Analysis Complete',
        description: 'Your attack path has been reconstructed and evaluated',
      });
    } catch (error) {
      console.error('Analysis error:', error);
      
      // Enhanced error logging
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Full analysis error details:', {
        commandHistoryLength: commandHistory.length,
        contextLength: context.length,
        errorMessage,
      });
      
      // User-friendly error messages
      let description = 'Failed to analyze commands. Please check your input and try again.';
      if (errorMessage.includes('JSON')) {
        description = 'Analysis format error. Please simplify your command history and try again.';
      } else if (errorMessage.includes('400')) {
        description = 'Command history too long. Try analyzing fewer commands at once (20-30 commands recommended).';
      } else if (errorMessage.includes('429')) {
        description = 'Rate limit reached. Please wait a moment and try again.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        description = 'Network error. Check your connection and try again.';
      }
      
      toast({
        title: 'Analysis Failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setCommandHistory('');
    setContext('');
  };

  const exportAnalysis = () => {
    if (!analysis) return;

    const markdown = `# Live Command Analysis Report

**Generated:** ${new Date().toLocaleString()}

---

## Attack Path Reconstruction

${analysis.attackPath}

---

## What You Did Well

${analysis.whatYouDidWell.map((item, i) => `${i + 1}. ${item}`).join('\n')}

---

## What You Missed

${analysis.whatYouMissed.map((item, i) => `${i + 1}. ${item}`).join('\n')}

---

## Professional Pentester Approach

${analysis.professionalApproach}

---

## Phase-by-Phase Breakdown

### Reconnaissance
**Quality:** ${analysis.phaseBreakdown.reconnaissance.quality}  
**Notes:** ${analysis.phaseBreakdown.reconnaissance.notes}

### Scanning
**Quality:** ${analysis.phaseBreakdown.scanning.quality}  
**Notes:** ${analysis.phaseBreakdown.scanning.notes}

### Enumeration
**Quality:** ${analysis.phaseBreakdown.enumeration.quality}  
**Notes:** ${analysis.phaseBreakdown.enumeration.notes}

### Exploitation
**Quality:** ${analysis.phaseBreakdown.exploitation.quality}  
**Notes:** ${analysis.phaseBreakdown.exploitation.notes}

### Privilege Escalation
**Quality:** ${analysis.phaseBreakdown.privilegeEscalation.quality}  
**Notes:** ${analysis.phaseBreakdown.privilegeEscalation.notes}

---

## Improvement Suggestions

${analysis.improvementSuggestions.map((item, i) => `${i + 1}. ${item}`).join('\n')}

---

## Commands You Should Master

${analysis.commandMastery.map((cmd, i) => `${i + 1}. \`${cmd}\``).join('\n')}

---

## Overall Assessment

${analysis.overallAssessment}

---

*Generated by SeshForge - Live Command Analysis Engine*
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `command-analysis-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Exported',
      description: 'Analysis exported as Markdown',
    });
  };

  const qualityColors: Record<string, string> = {
    Excellent: 'bg-green-500/20 text-green-500 border-green-500/50',
    Good: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
    Adequate: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
    Insufficient: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
    Missing: 'bg-red-500/20 text-red-500 border-red-500/50',
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Live Command Analysis
            </h1>
            <p className="text-muted-foreground">
              Paste your pentesting commands and get expert feedback on your attack methodology
            </p>
          </div>
          {analysis && (
            <Button onClick={resetAnalysis} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              New Analysis
            </Button>
          )}
        </div>

        {/* Input Section */}
        {!analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Command History
                </CardTitle>
                <CardDescription>
                  Paste the commands you ran during your TryHackMe/HackTheBox engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={commandHistory}
                  onChange={(e) => setCommandHistory(e.target.value)}
                  placeholder={`Example:

nmap -sC -sV -p- 10.10.10.24
gobuster dir -u http://10.10.10.24 -w /usr/share/seclists/Discovery/Web-Content/common.txt
nikto -h http://10.10.10.24
ssh admin@10.10.10.24
sudo -l
find / -perm -u=s -type f 2>/dev/null
...`}
                  className="font-mono text-sm min-h-[400px]"
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Context (Optional)
                  </CardTitle>
                  <CardDescription>
                    Provide any additional context about the target or engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={`Example:

Target: TryHackMe "Basic Pentesting" room
Objective: Find user.txt and root.txt
Services discovered: HTTP, SSH, SMB
Initial access: Found credentials in source code
Privilege escalation: SUID binary exploitation`}
                    className="text-sm min-h-[200px]"
                  />
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10">
                <CardHeader>
                  <CardTitle className="text-sm">What You'll Get</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Complete attack path reconstruction</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Detailed analysis of what you did well</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Identification of missed opportunities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Professional pentester comparison</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Phase-by-phase methodology breakdown</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Actionable improvement suggestions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Command mastery recommendations</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Button onClick={analyzeCommands} disabled={isAnalyzing || !commandHistory.trim()} size="lg" className="w-full">
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Analyzing Attack Path...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyze Commands
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Phase Quality Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(analysis.phaseBreakdown).map(([phase, data]) => (
                <Card key={phase} className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground capitalize">
                      {phase.replace(/([A-Z])/g, ' $1').trim()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={`w-full justify-center ${qualityColors[data.quality] || ''}`}>
                      {data.quality}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Attack Path Reconstruction */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Attack Path Reconstruction
                </CardTitle>
                <CardDescription>How your attack unfolded from start to finish</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{analysis.attackPath}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* What You Did Well / Missed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-green-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-5 w-5" />
                    What You Did Well
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.whatYouDidWell.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-orange-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-500">
                    <AlertCircle className="h-5 w-5" />
                    What You Missed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.whatYouMissed.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Professional Approach */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  How a Professional Would Approach This
                </CardTitle>
                <CardDescription>The complete workflow with industry best practices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      code: ({ inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            {...props}
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
                    {analysis.professionalApproach}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Phase Breakdown */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Phase-by-Phase Breakdown</CardTitle>
                <CardDescription>Detailed analysis of each pentesting phase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analysis.phaseBreakdown).map(([phase, data]) => (
                  <div key={phase} className="p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold capitalize">
                        {phase.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <Badge className={qualityColors[data.quality] || ''}>
                        {data.quality}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{data.notes}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Improvement Suggestions */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Improvement Suggestions
                </CardTitle>
                <CardDescription>Concrete actionable advice to level up your skills</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.improvementSuggestions.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Command Mastery */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Commands You Should Master
                </CardTitle>
                <CardDescription>Essential commands with detailed explanations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 font-mono text-sm">
                  {analysis.commandMastery.map((cmd, i) => (
                    <div key={i} className="bg-muted/30 p-3 rounded-lg">
                      <code className="text-primary">{cmd}</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Overall Assessment */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-purple-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Overall Assessment
                </CardTitle>
                <CardDescription>Your skill level and next steps in your pentesting journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{analysis.overallAssessment}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={exportAnalysis} size="lg">
                <Download className="mr-2 h-5 w-5" />
                Export Analysis (Markdown)
              </Button>
              <Button onClick={resetAnalysis} variant="outline" size="lg">
                <RotateCcw className="mr-2 h-5 w-5" />
                Analyze More Commands
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
