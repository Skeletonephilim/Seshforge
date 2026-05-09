import { useState, useEffect } from 'react';
import { DevvAI } from '@devvai/devv-code-backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Timer, 
  Flag, 
  Terminal, 
  PlayCircle, 
  StopCircle, 
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  FileText,
  Download,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MethodologyHintSystem from '@/components/MethodologyHintSystem';
import GhostCommandInput from '@/components/GhostCommandInput';
import type { GhostMode } from '@/components/GhostCommandInput';
import PostExamReview from '@/components/PostExamReview';
import PT1SectionNavigation from '@/components/PT1SectionNavigation';
import { parseAIJson } from '@/lib/utils';
import { 
  useExamSessionStore, 
  calculateTimeRemaining, 
  formatTime,
  setupExamPersistenceTriggers,
  type ExamScenario as StoreExamScenario,
  type PT1Section,
  type SectionEvaluation,
} from '@/store/exam-session-store';
import { useNavigate } from 'react-router-dom';
import { validateReport, PT1_REPORT_TEMPLATE } from '@/lib/report-validation';
import { generatePostExamReview } from '@/lib/report-review-generator';
import { generateSectionEvaluation } from '@/lib/pt1-section-evaluator';
import { downloadMarkdownFile, generateSectionFilename, getSectionDisplayName } from '@/lib/download-helpers';
import { generateSectionReport } from '@/lib/section-report-generator';

interface ExamScenario {
  targetIP: string;
  difficulty: string;
  description: string;
  openPorts: string[];
  currentPhase: string;
}

interface ExamSession {
  startTime: number;
  timeLimit: number; // in minutes
  commandsUsed: string[];
  hintsUsed: number;
  pointsDeducted: number;
  flagsFound: number;
  isActive: boolean;
}

export default function PT1ExamSimulatorPage() {
  const navigate = useNavigate();
  
  // Zustand store with persistence
  const examStore = useExamSessionStore();
  const { activeExam } = examStore;
  
  // Route guard - redirect if no active exam
  useEffect(() => {
    if (!activeExam || activeExam.mode !== 'PT1') {
      navigate('/pt1-exam-config', { replace: true });
    }
  }, [activeExam, navigate]);
  
  // Initialize report template if empty
  useEffect(() => {
    if (activeExam && activeExam.isActive && !activeExam.reportDraft) {
      examStore.updateReportDraft(PT1_REPORT_TEMPLATE);
    }
  }, [activeExam?.isActive]);
  
  // Local UI state only
  const [isProcessing, setIsProcessing] = useState(false);
  const [ghostMode, setGhostMode] = useState<GhostMode>('full');
  const [dynamicGhostCommand, setDynamicGhostCommand] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [wasRestored, setWasRestored] = useState(false);
  const { toast } = useToast();
  
  // Restore session on mount if exists
  useEffect(() => {
    if (activeExam && activeExam.isActive && activeExam.mode === 'PT1' && !wasRestored) {
      setWasRestored(true);
      
      // Calculate remaining time from stored elapsed seconds
      const remaining = calculateTimeRemaining(activeExam);
      setTimeRemaining(remaining);
      
      toast({
        title: 'Session Restored',
        description: `Exam resumed - ${formatTime(remaining)} remaining`,
        duration: 5000,
      });
      
      console.log('[PT1Exam] Restored session:', {
        elapsedSeconds: activeExam.elapsedSeconds,
        flagsFound: activeExam.flagsFound,
        commandsExecuted: activeExam.commandHistory.length,
      });
    }
  }, []);
  
  // Setup persistence triggers (visibilitychange, beforeunload)
  useEffect(() => {
    if (!activeExam?.isActive) return;
    
    const cleanup = setupExamPersistenceTriggers(
      examStore.updateElapsedTime,
      examStore.getActiveExam
    );
    
    return cleanup;
  }, [activeExam?.isActive]);

  // Timer effect - updates UI and persisted elapsed time
  useEffect(() => {
    if (!activeExam?.isActive) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - activeExam.startTime) / 1000);
      const totalSeconds = activeExam.timeLimit * 60;
      const remaining = totalSeconds - elapsedSeconds;
      
      if (remaining <= 0) {
        endExam(true);
      } else {
        setTimeRemaining(remaining);
        // Update persisted elapsed time every second
        examStore.updateElapsedTime(elapsedSeconds);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExam?.isActive, activeExam?.startTime]);

  // Redirect to config page if no active exam
  const redirectToConfig = () => {
    navigate('/pt1-exam-config');
  };

  const executeCommand = async () => {
    if (!activeExam?.scenario || !activeExam.isActive) return;
    const cmd = activeExam.currentCommand.trim();
    if (!cmd) return;

    setIsProcessing(true);
    const scenario = activeExam.scenario;

    try {
      // Check authentication session before making API calls
      const sessionId = localStorage.getItem('DEVV_CODE_SID');
      if (!sessionId) {
        console.error('[PT1Exam] No authentication session found');
        toast({
          title: 'Authentication Required',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }

      // Initialize AI with proper error handling
      let ai;
      try {
        ai = new DevvAI();
      } catch (initError) {
        console.error('[PT1Exam] DevvAI initialization error:', initError);
        toast({
          title: 'API Error',
          description: 'Failed to initialize AI service. Please check your connection.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }
      
      const contextHistory = activeExam.commandHistory.slice(-3).map(h => 
        `Command: ${h.command}\nOutput: ${h.output}`
      ).join('\n\n');

      const prompt = `You are an advanced penetration testing mentor and red team operator conducting a PT1 certification exam.
Your role is to guide the candidate interactively through realistic pentesting scenarios.

**EXECUTION CONTEXT**
- Target: ${scenario.targetIP}
- Current Phase: ${scenario.currentPhase}
- Open Ports: ${scenario.openPorts.join(', ')}

**PREVIOUS COMMANDS**
${contextHistory || 'None'}

**USER COMMAND TO EXECUTE:** ${cmd}

YOUR RESPONSE MUST INCLUDE 4 SECTIONS:

**1. TOOL OUTPUT** (realistic, max 25 lines)

**2. COMMAND BREAKDOWN & MENTORSHIP**
Format EXACTLY as:

**Why This Command?**
[1-2 sentences explaining WHY this step is chosen in the attack chain]

**Command Breakdown:**
\`${cmd}\`

Breakdown:
- [flag/arg] → [meaning]
- [flag/arg] → [meaning]
...

**Mnemonic:** "[short memory trick for key flags]"

**Alternative Tools:**
- [tool 1]: [when to use]
- [tool 2]: [when to use]

**What We Learned:**
- [discovery 1]
- [discovery 2]

**Next Best Steps:**
1. [priority 1 with bash command]
2. [priority 2 with bash command]

**Methodology Note:** [where in attack chain: recon → enum → exploit → privesc]

**3. PHASE**
PHASE: [reconnaissance/scanning/enumeration/exploitation/privilege_escalation]

**4. FLAGS**
[If flag found: FLAG{pt1_exam_flag_here}]

CONSTRAINTS:
- Concise but actionable
- Real pentester under time pressure
- Avoid automation dependency
- Suggest alternative tools if same tool used repeatedly
- Tone: practical, direct, encouraging`;


      let response;
      try {
        response = await ai.chat.completions.create({
          model: 'kimi-k2-0711-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an advanced penetration testing mentor. Provide realistic outputs AND comprehensive command breakdowns with mnemonics.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.7,
        });
      } catch (apiError: any) {
        console.error('[PT1Exam] API call error:', apiError);
        
        // Enhanced error handling with specific messages
        const errorMessage = apiError.message || 'Unknown error';
        
        if (apiError.message?.includes('401') || apiError.status === 401) {
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please log in again to continue.',
            variant: 'destructive',
          });
          
          // Redirect to login after showing the error
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else if (apiError.message?.includes('429') || apiError.status === 429) {
          toast({
            title: 'Rate Limit Exceeded',
            description: 'Too many requests. Please wait a moment before trying again.',
            variant: 'destructive',
          });
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          toast({
            title: 'Network Error',
            description: 'Unable to connect to the server. Please check your internet connection.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Command Execution Failed',
            description: `Error: ${errorMessage}`,
            variant: 'destructive',
          });
        }
        
        examStore.addCommand(cmd, `Error: ${errorMessage}`);
        setIsProcessing(false);
        return;
      }

      const output = response.choices[0].message.content || 'Command executed';
      
      // Extract phase update
      const phaseMatch = output.match(/PHASE:\s*(\w+)/);
      if (phaseMatch && scenario.currentPhase !== phaseMatch[1]) {
        console.log('[PT1Exam] Phase updated:', phaseMatch[1]);
      }

      // Extract next best step command for dynamic ghost suggestion
      const nextStepsMatch = output.match(/\*\*Next Best Steps:\*\*[\s\S]*?1\.\s*(.+?)(?:\n|```bash\s*(.+?)\s*```)/i);
      if (nextStepsMatch) {
        // Try to extract bash command first (from code block)
        const bashCommand = nextStepsMatch[2];
        if (bashCommand) {
          const cleanCommand = bashCommand.trim();
          setDynamicGhostCommand(cleanCommand);
          console.log('[PT1Exam] Dynamic ghost command extracted (bash):', cleanCommand);
        } else {
          // Otherwise try to extract inline command after "1."
          const inlineMatch = nextStepsMatch[1].match(/`([^`]+)`/);
          if (inlineMatch) {
            const cleanCommand = inlineMatch[1].trim();
            setDynamicGhostCommand(cleanCommand);
            console.log('[PT1Exam] Dynamic ghost command extracted (inline):', cleanCommand);
          }
        }
      }

      // Check for flags
      const flagMatch = output.match(/FLAG\{[^}]+\}/);
      if (flagMatch) {
        examStore.incrementFlags();
        toast({
          title: 'Flag Found! 🎯',
          description: flagMatch[0],
        });
      }

      // Extract output section
      const outputMatch = output.match(/OUTPUT:\s*([\s\S]*?)(?=\n\nPHASE:|$)/);
      const cleanOutput = outputMatch ? outputMatch[1].trim() : output;

      // Add command to persistent history
      examStore.addCommand(cmd, cleanOutput);
    } catch (error) {
      console.error('Command execution error:', error);
      examStore.addCommand(cmd, 'Error: Failed to execute command');
    } finally {
      setIsProcessing(false);
    }
  };

  const requestHint = async () => {
    if (!activeExam?.scenario || !activeExam.isActive) return;
    const scenario = activeExam.scenario;

    setIsProcessing(true);

    try {
      const ai = new DevvAI();
      
      const recentCommands = activeExam.commandHistory.slice(-5).map(h => h.command).join('\n');
      
      const prompt = `User is stuck in pentesting exam.

Current Phase: ${scenario.currentPhase}
Commands used: ${recentCommands || 'None yet'}
Flags found: ${activeExam.flagsFound}

Provide a subtle hint (1-2 sentences) to guide them toward the next step WITHOUT giving away the answer directly.`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful pentesting instructor. Give hints that guide without solving.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      const hint = response.choices[0].message.content || 'Try exploring open ports more thoroughly';
      
      examStore.incrementHints(5); // 5 point deduction

      toast({
        title: 'Hint (-5 points)',
        description: hint,
        duration: 10000,
      });
    } catch (error) {
      console.error('Hint error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const endExam = async (timeExpired: boolean = false) => {
    if (!activeExam) return;

    // MANDATORY REPORT VALIDATION
    if (!activeExam.reportDraft || activeExam.reportDraft.length < 500) {
      toast({
        title: 'Report Incomplete',
        description: 'You must submit a professional report (minimum 500 characters) to complete this exam.',
        variant: 'destructive',
        duration: 10000,
      });
      return;
    }

    setIsProcessing(true);

    try {
      // ✅ STEP 0: Complete current section if exists and not already completed
      if (activeExam.currentSection) {
        const currentSection = activeExam.currentSection;
        
        // Check if current section already completed
        const alreadyCompleted = activeExam.completedSections.some(s => s.sectionId === currentSection);
        
        if (!alreadyCompleted) {
          toast({
            title: 'Finalizing Current Section...',
            description: `Generating evaluation for ${getSectionDisplayName(currentSection)}`,
          });

          const sectionData = {
            sectionId: currentSection,
            commandHistory: activeExam.commandHistory,
            flagsFound: activeExam.currentSectionFlags, // Use section-specific counter
            hintsUsed: activeExam.hintsUsed,
            reportDraft: activeExam.reportDraft,
            duration: activeExam.elapsedSeconds,
            scenario: activeExam.scenario,
          };

          const evaluation = await generateSectionEvaluation(sectionData);
          
          // Complete section in store
          examStore.completeSection(evaluation);
          
          // ✅ AUTO-DOWNLOAD FINAL SECTION REPORT
          try {
            const sectionReport = generateSectionReport(currentSection, evaluation, activeExam);
            const filename = generateSectionFilename(currentSection, activeExam.scenario?.targetIP);
            downloadMarkdownFile(sectionReport, filename);
            
            console.log('[PT1Exam] Final section report auto-downloaded:', filename);
            
            toast({
              title: '✓ Final Section Report Downloaded',
              description: `${getSectionName(currentSection)}: Score ${evaluation.score}%`,
              duration: 5000,
            });
          } catch (downloadError) {
            console.error('[PT1Exam] Final section download failed:', downloadError);
          }
        }
      }

      // Mark exam as ended
      examStore.endExam();
      
      const duration = Math.floor(activeExam.elapsedSeconds / 60);
      
      // GENERATE COMPREHENSIVE MARKDOWN REPORT
      const reportMarkdown = generateFinalReport(activeExam);
      
      // DOWNLOAD COMPREHENSIVE REPORT
      const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PT1-Final-Report-${activeExam.scenario?.targetIP}-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: timeExpired ? '✓ Time Expired - Reports Generated' : '✓ Exam Completed - Reports Generated',
        description: `Duration: ${duration}min | All section reports downloaded`,
        duration: 10000,
      });
      
      // AUTO-GENERATE POST-EXAM REVIEW
      try {
        examStore.setReviewGenerating();
        const review = await generatePostExamReview(activeExam.reportDraft, activeExam);
        examStore.setReviewComplete(review);
        
        toast({
          title: 'Report Review Generated',
          description: `Overall Score: ${review.scores.overall}/10 - Redirecting to Rating Page...`,
        });
        
        // ✅ REDIRECT TO RATING PAGE after short delay
        setTimeout(() => {
          navigate('/pt1-rating');
        }, 2000);
      } catch (error) {
        console.error('Report review generation failed:', error);
        examStore.setReviewError(error instanceof Error ? error.message : 'Unknown error');
        
        // Still redirect to rating page even if review fails
        setTimeout(() => {
          navigate('/pt1-rating');
        }, 2000);
      }
    } catch (error) {
      console.error('End exam error:', error);
      toast({
        title: 'Exam Completion Error',
        description: error instanceof Error ? error.message : 'Failed to complete exam',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // NEW: Section Switch Handler
  const handleSectionSwitch = async (newSection: PT1Section) => {
    if (!activeExam || !activeExam.currentSection) return;

    const currentSection = activeExam.currentSection;
    
    // Prevent switching to same section
    if (currentSection === newSection) {
      toast({
        title: 'Already on this section',
        description: `You are currently working on ${getSectionName(newSection)}`,
      });
      return;
    }

    setIsProcessing(true);

    try {
      // STEP 1: Generate evaluation for current section
      toast({
        title: 'Saving Current Section...',
        description: `Generating evaluation for ${getSectionName(currentSection)}`,
      });

      const sectionData = {
        sectionId: currentSection,
        commandHistory: activeExam.commandHistory,
        flagsFound: activeExam.currentSectionFlags, // Use section-specific counter
        hintsUsed: activeExam.hintsUsed,
        reportDraft: activeExam.reportDraft,
        duration: activeExam.elapsedSeconds,
        scenario: activeExam.scenario,
      };

      const evaluation = await generateSectionEvaluation(sectionData);

      // STEP 2: Complete current section in store
      examStore.completeSection(evaluation);

      // ✅ STEP 2.5: AUTO-DOWNLOAD SECTION REPORT
      try {
        const sectionReport = generateSectionReport(currentSection, evaluation, activeExam);
        const filename = generateSectionFilename(currentSection, activeExam.scenario?.targetIP);
        downloadMarkdownFile(sectionReport, filename);
        
        console.log('[PT1Exam] Section report auto-downloaded:', filename);
        
        toast({
          title: '✓ Section Report Downloaded',
          description: `${getSectionName(currentSection)}: Score ${evaluation.score}% - Report saved to downloads`,
          duration: 7000,
        });
      } catch (downloadError) {
        console.error('[PT1Exam] Section report download failed:', downloadError);
        toast({
          title: 'Section Completed',
          description: `${getSectionName(currentSection)}: Score ${evaluation.score}% (Download failed)`,
          duration: 5000,
        });
      }

      // STEP 3: Switch to new section
      examStore.switchSection(newSection);

      toast({
        title: 'Section Switched',
        description: `Now working on ${getSectionName(newSection)}`,
        duration: 5000,
      });

      console.log('[PT1Exam] Section switched:', {
        from: currentSection,
        to: newSection,
        score: evaluation.score,
      });

    } catch (error) {
      console.error('Section switch error:', error);
      toast({
        title: 'Section Switch Failed',
        description: error instanceof Error ? error.message : 'Failed to switch sections',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to get section display name
  const getSectionName = (section: PT1Section): string => {
    const names: Record<PT1Section, string> = {
      web_application: 'Web Application Testing',
      network_security: 'Network Security Testing',
      active_directory: 'Active Directory Testing',
    };
    return names[section];
  };

  // Note: generateSectionEvaluation is imported from pt1-section-evaluator.ts
  // AI-powered analysis provides comprehensive evaluation with:
  // - Command quality analysis
  // - Tool usage assessment
  // - Methodology adherence checking
  // - Flag capture tracking
  // - Strengths/weaknesses identification

  const generateFinalReport = (exam: any): string => {
    const duration = Math.floor(exam.elapsedSeconds / 60);
    const timestamp = new Date().toISOString();
    
    // Include review if available
    const reviewSection = exam.postExamReview ? `

---

## Professional Report Review

**Overall Score:** ${exam.postExamReview.scores.overall}/10
**Methodology:** ${exam.postExamReview.scores.methodology}/10
**Technical Clarity:** ${exam.postExamReview.scores.technicalClarity}/10
**Professionalism:** ${exam.postExamReview.scores.professionalism}/10
**Completeness:** ${exam.postExamReview.scores.completeness}/10

### Strengths
${exam.postExamReview.strengths.map((s: string) => `- ${s}`).join('\n')}

### Weaknesses
${exam.postExamReview.weaknesses.map((w: string) => `- ${w}`).join('\n')}

### Fastest Improvements
${exam.postExamReview.fastestImprovements.map((i: string, idx: number) => `${idx + 1}. ${i}`).join('\n')}

---

## Improved Professional Version

${exam.postExamReview.improvedProfessionalVersionMarkdown}
` : '';

    return `# Penetration Testing Report

## Executive Summary

**Assessment Date:** ${timestamp.split('T')[0]}
**Target:** ${exam.scenario?.targetIP || 'Unknown'}
**Duration:** ${duration} minutes (${(duration / 60).toFixed(1)} hours)
**Exam Mode:** PT1 Certification Practice
**Flags Captured:** ${exam.flagsFound}
**Commands Executed:** ${exam.commandHistory.length}
**Hints Used:** ${exam.hintsUsed}

---

## Candidate Report

${exam.reportDraft}
${reviewSection}

---

## Technical Evidence

### Command History

${exam.commandHistory.map((entry: any, i: number) => `
**Command ${i + 1}:**
\`\`\`bash
${entry.command}
\`\`\`

**Output:**
\`\`\`
${entry.output.substring(0, 300)}${entry.output.length > 300 ? '...' : ''}
\`\`\`

**Timestamp:** ${entry.timestamp}
`).join('\n---\n')}

---

## Assessment Metrics

- **Duration:** ${duration} minutes
- **Commands Executed:** ${exam.commandHistory.length}
- **Flags Captured:** ${exam.flagsFound}
- **Hints Used:** ${exam.hintsUsed}
- **Points Deducted:** ${exam.pointsDeducted}

---

*Generated by SeshForge PT1 Training Platform*
*This is a practice exam report for certification preparation purposes*
`;
  };

  // Utility functions removed - now imported from store

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Flag className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">PT1 Exam Simulator</h1>
          <p className="text-muted-foreground font-mono text-sm">
            Timed pentesting simulation for certification preparation
          </p>
        </div>
      </div>

      {!activeExam?.isActive ? (
        <Card className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dot bg-destructive"></div>
            <div className="terminal-dot bg-chart-3"></div>
            <div className="terminal-dot bg-secondary"></div>
            <span className="ml-2 text-xs text-muted-foreground font-mono">exam-setup.sh</span>
          </div>
          
          <CardHeader>
            <CardTitle>Configure PT1 Exam</CardTitle>
            <CardDescription>
              You must configure exam duration (3-6 hours) before starting
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Timer className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Configurable Duration</h4>
                  <p className="text-sm text-muted-foreground">Choose 3, 4, 5, or 6 hours based on your preparation level</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Flag className="w-5 h-5 text-secondary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Professional Report Required</h4>
                  <p className="text-sm text-muted-foreground">
                    You MUST submit a complete pentest report to finish the exam
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Terminal className="w-5 h-5 text-chart-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Split-Screen Workspace</h4>
                  <p className="text-sm text-muted-foreground">
                    Live terminal + real-time report editor with auto-save
                  </p>
                </div>
              </div>
            </div>

            {activeExam && !activeExam.isActive && (
              <div className="p-4 bg-secondary/10 border border-secondary rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Previous Exam Results
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Flags: </span>
                    <span className="font-mono">{activeExam.flagsFound}/2</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Commands: </span>
                    <span className="font-mono">{activeExam.commandHistory.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hints: </span>
                    <span className="font-mono">{activeExam.hintsUsed}</span>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={redirectToConfig}
              className="w-full neon-glow"
              size="lg"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              Configure & Start PT1 Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* PT1 Section Navigation */}
          {activeExam.currentSection && (
            <PT1SectionNavigation
              currentSection={activeExam.currentSection}
              completedSections={activeExam.completedSections}
              onSectionSwitch={handleSectionSwitch}
              isExamActive={activeExam.isActive}
            />
          )}

          {/* Exam Header */}
          <Card className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dot bg-destructive"></div>
              <div className="terminal-dot bg-chart-3"></div>
              <div className="terminal-dot bg-secondary"></div>
              <span className="ml-2 text-xs text-muted-foreground font-mono">exam-session.log</span>
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
                  <div className="text-lg font-bold font-mono">{activeExam.currentSectionFlags}/2</div>
                  <div className="text-xs text-muted-foreground">Flags (This Section)</div>
                  <div className="text-xs text-muted-foreground mt-1">Total: {activeExam.flagsFound}</div>
                </div>
                
                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
                  <Terminal className="w-5 h-5 mb-2 text-chart-3" />
                  <div className="text-lg font-bold font-mono">{activeExam.commandHistory.length}</div>
                  <div className="text-xs text-muted-foreground">Commands</div>
                </div>
                
                <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
                  <AlertTriangle className="w-5 h-5 mb-2 text-chart-3" />
                  <div className="text-lg font-bold font-mono">{activeExam.hintsUsed}</div>
                  <div className="text-xs text-muted-foreground">Hints Used</div>
                </div>

                <div className="flex items-center justify-center">
                  <Button
                    onClick={() => endExam(false)}
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    <StopCircle className="w-4 h-4" />
                    End Exam
                  </Button>
                </div>
              </div>

              {activeExam.scenario && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-mono text-primary">{activeExam.scenario.targetIP}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phase: </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {activeExam.scenario.currentPhase}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Difficulty: </span>
                      <span className="font-mono">{activeExam.scenario.difficulty}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terminal Output */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Terminal */}
            <Card className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dot bg-destructive"></div>
                <div className="terminal-dot bg-chart-3"></div>
                <div className="terminal-dot bg-secondary"></div>
                <span className="ml-2 text-xs text-muted-foreground font-mono">root@kali:~#</span>
              </div>
              
              <CardContent className="p-0">
                <div className="p-4 bg-background/95 font-mono text-sm h-[400px] overflow-y-auto custom-scrollbar">
                {activeExam.commandHistory.length === 0 && (
                  <div className="text-muted-foreground">
                    <p>Target: {activeExam.scenario?.targetIP}</p>
                    <p>Description: {activeExam.scenario?.description}</p>
                    <p className="mt-2">Begin your assessment...</p>
                    <p className="mt-4 text-secondary">$ _</p>
                  </div>
                )}

                {activeExam.commandHistory.map((entry, index) => {
                  // Parse structured response
                  const toolOutputMatch = entry.output.match(/(?:^|\n)(?:\*\*1\. TOOL OUTPUT\*\*|\*\*TOOL OUTPUT\*\*)[\s\S]*?\n([\s\S]*?)(?=\n\*\*2\. COMMAND BREAKDOWN|\*\*COMMAND BREAKDOWN|\n\*\*Why This Command|\*\*PHASE:|$)/i);
                  const mentorGuidanceMatch = entry.output.match(/(?:\*\*2\. COMMAND BREAKDOWN|\*\*COMMAND BREAKDOWN|\*\*Why This Command)([\s\S]*?)(?=\n\*\*3\. PHASE|\*\*PHASE:|$)/i);
                  
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
                <GhostCommandInput
                  context={{
                    phase: activeExam.scenario?.currentPhase || 'reconnaissance',
                    lastCommand: activeExam.commandHistory[activeExam.commandHistory.length - 1]?.command || '',
                    lastOutput: activeExam.commandHistory[activeExam.commandHistory.length - 1]?.output || '',
                    discoveredInfo: {
                      openPorts: activeExam.scenario?.openPorts || [],
                      services: [],
                      directories: [],
                      credentials: [],
                      flags: [],
                    },
                    targetIP: activeExam.scenario?.targetIP || '',
                  }}
                  value={activeExam.currentCommand}
                  onChange={(val) => examStore.updateCurrentCommand(val)}
                  onSubmit={executeCommand}
                  ghostMode={ghostMode}
                  onGhostModeChange={setGhostMode}
                  disabled={isProcessing}
                  placeholder="Type your pentesting command manually..."
                  customGhostSuggestion={dynamicGhostCommand}
                />

                <div className="flex justify-end mt-2">
                  <Button
                    onClick={() => endExam(false)}
                    disabled={isProcessing}
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <StopCircle className="w-3 h-3" />
                    End Exam
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: Professional Report Editor */}
          <Card className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dot bg-destructive"></div>
              <div className="terminal-dot bg-chart-3"></div>
              <div className="terminal-dot bg-secondary"></div>
              <span className="ml-2 text-xs text-muted-foreground font-mono">report-draft.md</span>
            </div>
            
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Professional Report (REQUIRED)</span>
                <Badge variant={activeExam.reportDraft.length >= 500 ? 'default' : 'destructive'}>
                  {activeExam.reportDraft.length} / 500 min
                </Badge>
              </CardTitle>
              <CardDescription>
                Live auto-saved markdown editor. Minimum 500 characters required to submit exam.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Textarea
                value={activeExam.reportDraft}
                onChange={(e) => examStore.updateReportDraft(e.target.value)}
                placeholder={`# Executive Summary

Brief overview of assessment findings...

## Scope

- Target: ${activeExam.scenario?.targetIP || '[IP]'}
- Duration: [X hours]

## Methodology

PTES/OSSTMM-aligned approach...

## Findings

### [Vulnerability Name]
- **Severity:** Critical/High/Medium/Low
- **CVSS:** [Score]
- **Description:** 
- **Impact:** 
- **Proof of Concept:**
\`\`\`bash
[command]
\`\`\`
- **Reproduction Steps:**
1. 
2. 
- **Remediation:**

## Attack Narrative

Describe the complete attack path...

## Flags Captured

- User Flag: [flag]
- Root Flag: [flag]

## Conclusion

Summary of security posture and recommendations...`}
                className="h-[350px] font-mono text-sm resize-none"
              />
              
              {activeExam.reportDraft.length < 500 && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-xs text-destructive font-semibold">
                    ⚠️ Report incomplete: {500 - activeExam.reportDraft.length} characters remaining
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You cannot submit the exam without a complete professional report.
                  </p>
                </div>
              )}
              
              {activeExam.reportDraft.length >= 500 && (
                <div className="mt-3 p-3 bg-secondary/10 border border-secondary/30 rounded-lg">
                  <p className="text-xs text-secondary font-semibold">
                    ✓ Report meets minimum requirements
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your report is auto-saved. Markdown will be exported when you end the exam.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* POST-EXAM REVIEW SECTION */}
        {!activeExam.isActive && activeExam.postExamReview && (
          <div className="mt-6 space-y-6">
            <PostExamReview
              review={activeExam.postExamReview}
              onRegenerate={async () => {
                try {
                  examStore.setReviewGenerating();
                  const review = await generatePostExamReview(activeExam.reportDraft, activeExam);
                  examStore.setReviewComplete(review);
                  toast({
                    title: 'Review Regenerated',
                    description: `Overall Score: ${review.scores.overall}/10`,
                  });
                } catch (error) {
                  console.error('Review regeneration failed:', error);
                  examStore.setReviewError(error instanceof Error ? error.message : 'Unknown error');
                  toast({
                    title: 'Regeneration Failed',
                    description: 'Could not regenerate report review',
                    variant: 'destructive',
                  });
                }
              }}
              isGenerating={activeExam.reviewStatus === 'generating'}
            />
          </div>
        )}
        
        {/* REVIEW GENERATION LOADING */}
        {!activeExam.isActive && activeExam.reviewStatus === 'generating' && !activeExam.postExamReview && (
          <Card className="mt-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-sm text-muted-foreground">Generating professional report review...</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* REVIEW GENERATION ERROR */}
        {!activeExam.isActive && activeExam.reviewStatus === 'error' && !activeExam.postExamReview && (
          <Card className="mt-6 border-destructive/30 bg-destructive/5">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <p className="text-sm text-destructive font-semibold">Report review generation failed</p>
                <p className="text-xs text-muted-foreground">{activeExam.reviewError}</p>
                <Button
                  onClick={async () => {
                    try {
                      examStore.setReviewGenerating();
                      const review = await generatePostExamReview(activeExam.reportDraft, activeExam);
                      examStore.setReviewComplete(review);
                      toast({
                        title: 'Review Generated',
                        description: `Overall Score: ${review.scores.overall}/10`,
                      });
                    } catch (error) {
                      examStore.setReviewError(error instanceof Error ? error.message : 'Unknown error');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </>
      )}
    </div>
  );
}
