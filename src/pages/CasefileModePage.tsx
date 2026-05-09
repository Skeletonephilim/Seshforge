import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  FolderOpen, 
  Lightbulb, 
  Terminal, 
  FileText,
  Clock,
  Flag,
  BookOpen,
  CheckCircle2,
  Play,
  AlertTriangle,
  Save,
  ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { CASEFILE_LIBRARY, getCasefileById } from '@/data/casefiles';
import type { Casefile, CasefileSession, CasefileAction, UserFinding, CasefileDifficulty, CasefileCategory } from '@/types/casefile';

export default function CasefileModePage() {
  const { toast } = useToast();
  
  // UI State
  const [selectedCasefile, setSelectedCasefile] = useState<Casefile | null>(null);
  const [activeSession, setActiveSession] = useState<CasefileSession | null>(null);
  const [activePanel, setActivePanel] = useState<'evidence' | 'terminal' | 'notes' | 'findings' | 'hints' | 'theory'>('evidence');
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [showPreAssessment, setShowPreAssessment] = useState(false);
  
  // Session State
  const [commandInput, setCommandInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<Array<{ command: string; output: string }>>([]);
  const [notes, setNotes] = useState('');
  const [userFinding, setUserFinding] = useState<Partial<UserFinding>>({});
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
  
  // Pre-Assessment
  const [preCaseConfidence, setPreCaseConfidence] = useState(3);
  const [preCaseStrategy, setPreCaseStrategy] = useState('');
  const [preCaseExpectation, setPreCaseExpectation] = useState('');
  
  // Filtering
  const [filterDifficulty, setFilterDifficulty] = useState<CasefileDifficulty | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<CasefileCategory | 'all'>('all');
  
  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  useEffect(() => {
    if (!activeSession) return;
    
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [activeSession]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const startCasefile = (casefile: Casefile) => {
    setSelectedCasefile(casefile);
    setShowPreAssessment(true);
  };
  
  const beginInvestigation = () => {
    if (!selectedCasefile) return;
    
    const session: CasefileSession = {
      casefileId: selectedCasefile.id,
      startedAt: new Date().toISOString(),
      currentState: [],
      elapsedSeconds: 0,
      actions: [],
      openedArtifacts: [],
      executedCommands: [],
      hintsUsed: [],
      theoriesViewed: [],
      notes: '',
      markedClues: [],
      reflectionAnswers: {},
      preCaseConfidence,
      preCaseStrategy,
      preCaseExpectation,
      completed: false
    };
    
    setActiveSession(session);
    setShowPreAssessment(false);
    setActivePanel('evidence');
    setElapsedSeconds(0);
    
    toast({
      title: 'Investigation Started',
      description: `${selectedCasefile.title} - ${selectedCasefile.estimatedMinutes} min estimated`
    });
  };
  
  const openArtifact = (path: string) => {
    if (!selectedCasefile || !activeSession) return;
    
    setSelectedArtifact(path);
    
    const action: CasefileAction = {
      type: 'file_open',
      timestamp: new Date().toISOString(),
      content: path
    };
    
    setActiveSession({
      ...activeSession,
      actions: [...activeSession.actions, action],
      openedArtifacts: [...activeSession.openedArtifacts, path]
    });
  };
  
  const executeCommand = () => {
    if (!selectedCasefile || !activeSession || !commandInput.trim()) return;
    
    const cmd = commandInput.trim();
    const response = selectedCasefile.commandResponses.find(r => {
      if (typeof r.match === 'string') {
        return cmd.toLowerCase().includes(r.match.toLowerCase());
      } else {
        return r.match.test(cmd);
      }
    });
    
    const output = response?.output || `Command not recognized or not supported in this case: ${cmd}`;
    
    setTerminalHistory([...terminalHistory, { command: cmd, output }]);
    setCommandInput('');
    
    // Update state
    const newState = [...activeSession.currentState];
    if (response?.stateChange) {
      newState.push(...response.stateChange);
    }
    
    const action: CasefileAction = {
      type: 'command',
      timestamp: new Date().toISOString(),
      content: cmd,
      output,
      stateChanges: response?.stateChange
    };
    
    setActiveSession({
      ...activeSession,
      currentState: newState,
      actions: [...activeSession.actions, action],
      executedCommands: [...activeSession.executedCommands, cmd]
    });
    
    // Check for theory trigger
    if (response?.triggersTheory) {
      const theory = selectedCasefile.theoryCards.find(t => t.id === response.triggersTheory);
      if (theory && !activeSession.theoriesViewed.includes(theory.id)) {
        toast({
          title: '💡 Teaching Moment',
          description: `New concept: ${theory.title}`,
          duration: 5000
        });
      }
    }
    
    // Check success conditions
    const allConditionsMet = selectedCasefile.successConditions.every(c => newState.includes(c));
    if (allConditionsMet && !activeSession.completed) {
      toast({
        title: '🎯 Investigation Complete',
        description: 'All objectives met! Now write your finding and submit reflection.',
        duration: 8000
      });
    }
  };
  
  const useHint = (tier: 1 | 2 | 3) => {
    if (!selectedCasefile || !activeSession) return;
    
    const hint = selectedCasefile.hints.find(h => h.tier === tier);
    if (!hint) return;
    
    if (activeSession.hintsUsed.includes(tier)) {
      toast({
        title: 'Hint Already Used',
        description: 'You have already viewed this hint.',
        variant: 'destructive'
      });
      return;
    }
    
    setActiveSession({
      ...activeSession,
      hintsUsed: [...activeSession.hintsUsed, tier]
    });
    
    toast({
      title: `Hint (Tier ${tier}) - ${hint.pointsCost > 0 ? `-${hint.pointsCost} pts` : 'Free'}`,
      description: hint.text,
      duration: 15000
    });
  };
  
  const submitFinding = () => {
    if (!selectedCasefile || !activeSession) return;
    
    if (!userFinding.title || !userFinding.severity || !userFinding.description) {
      toast({
        title: 'Incomplete Finding',
        description: 'Please complete at least title, severity, and description.',
        variant: 'destructive'
      });
      return;
    }
    
    setActiveSession({
      ...activeSession,
      userFinding: userFinding as UserFinding,
      completedAt: new Date().toISOString(),
      completed: true,
      elapsedSeconds
    });
    
    toast({
      title: 'Finding Submitted',
      description: 'Your investigation is complete! Review your performance and reflection prompts.',
      duration: 5000
    });
  };
  
  const filteredCasefiles = CASEFILE_LIBRARY.filter(c => {
    if (filterDifficulty !== 'all' && c.difficulty !== filterDifficulty) return false;
    if (filterCategory !== 'all' && c.category !== filterCategory) return false;
    return true;
  });
  
  // Render casefile library (no active session)
  if (!activeSession) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-950/30 via-background to-background">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <FolderOpen className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl">Casefile Mode</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Offline investigation engine • Compact replayable micro-boxes • Evidence-based learning
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-muted-foreground">
                  Casefile Mode is an offline-first investigation system built around <strong>real pentest mechanics</strong>, 
                  not CTF gimmicks. Each casefile gives you artifacts, a stateful terminal, progressive hints, contextual theory, 
                  and requires a professional report output.
                </p>
                <p className="text-muted-foreground text-sm">
                  The goal: learn how to <strong>notice clues</strong>, <strong>prioritize evidence</strong>, 
                  <strong>understand mechanics</strong>, <strong>pivot intelligently</strong>, and <strong>write findings</strong> like a real operator.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Library</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty</label>
                  <div className="flex gap-2">
                    <Button
                      variant={filterDifficulty === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterDifficulty('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterDifficulty === 'easy' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterDifficulty('easy')}
                    >
                      Easy
                    </Button>
                    <Button
                      variant={filterDifficulty === 'medium' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterDifficulty('medium')}
                    >
                      Medium
                    </Button>
                    <Button
                      variant={filterDifficulty === 'hard' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterDifficulty('hard')}
                    >
                      Hard
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <div className="flex gap-2">
                    <Button
                      variant={filterCategory === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterCategory('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterCategory === 'web' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterCategory('web')}
                    >
                      Web
                    </Button>
                    <Button
                      variant={filterCategory === 'linux' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterCategory('linux')}
                    >
                      Linux
                    </Button>
                    <Button
                      variant={filterCategory === 'windows' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterCategory('windows')}
                    >
                      Windows
                    </Button>
                    <Button
                      variant={filterCategory === 'ad' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterCategory('ad')}
                    >
                      AD
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Casefile Library */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCasefiles.map((casefile) => (
              <Card key={casefile.id} className="hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => startCasefile(casefile)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{casefile.title}</CardTitle>
                    <Badge variant={casefile.difficulty === 'easy' ? 'secondary' : casefile.difficulty === 'medium' ? 'default' : 'destructive'}>
                      {casefile.difficulty}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 text-xs">
                    <Clock className="h-3 w-3" />
                    {casefile.estimatedMinutes} min
                    <Badge variant="outline" className="ml-2">{casefile.category}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">{casefile.brief}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{casefile.primaryMechanic}</Badge>
                    {casefile.secondaryMechanic && (
                      <Badge variant="outline" className="text-xs">{casefile.secondaryMechanic}</Badge>
                    )}
                  </div>
                  <Button className="w-full" size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Start Investigation
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredCasefiles.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No casefiles match your filters</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Pre-Assessment Modal */}
        {showPreAssessment && selectedCasefile && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Pre-Investigation Assessment</CardTitle>
                <CardDescription>{selectedCasefile.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  <h3>Scenario Brief</h3>
                  <p>{selectedCasefile.brief}</p>
                </div>
                
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">How confident are you with this topic? (1-5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Button
                          key={n}
                          variant={preCaseConfidence === n ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPreCaseConfidence(n)}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">What would your first 3 moves be?</label>
                    <Textarea
                      value={preCaseStrategy}
                      onChange={(e) => setPreCaseStrategy(e.target.value)}
                      placeholder="e.g., Read nmap output, check for open web ports, enumerate directories..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">What do you think the likely weakness is?</label>
                    <Textarea
                      value={preCaseExpectation}
                      onChange={(e) => setPreCaseExpectation(e.target.value)}
                      placeholder="e.g., Exposed credentials, SQL injection, sudo misconfiguration..."
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowPreAssessment(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={beginInvestigation} className="flex-1">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Begin Investigation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }
  
  // Render active investigation workspace
  const artifact = selectedArtifact ? selectedCasefile?.artifacts.find(a => a.path === selectedArtifact) : null;
  const allConditionsMet = selectedCasefile?.successConditions.every(c => activeSession.currentState.includes(c)) || false;
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-4">
        {/* Header */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">{selectedCasefile?.title}</h2>
                <Badge>{selectedCasefile?.difficulty}</Badge>
                <Badge variant="outline">{selectedCasefile?.category}</Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatTime(elapsedSeconds)} / {selectedCasefile?.estimatedMinutes}:00
                </div>
                <Badge variant={allConditionsMet ? 'default' : 'secondary'}>
                  {allConditionsMet ? 'All Objectives Met' : 'In Progress'}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => {
                  setActiveSession(null);
                  setSelectedCasefile(null);
                }}>
                  End Investigation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Investigation Workspace */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - Evidence Tree */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Evidence Tree
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {selectedCasefile?.artifacts.map((artifact) => (
                  <button
                    key={artifact.path}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-muted transition-colors ${selectedArtifact === artifact.path ? 'bg-muted' : ''}`}
                    onClick={() => openArtifact(artifact.path)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      {artifact.path}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Center Panel - Main Content */}
          <Card className="col-span-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant={activePanel === 'evidence' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('evidence')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Evidence
                </Button>
                <Button
                  variant={activePanel === 'terminal' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('terminal')}
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  Terminal
                </Button>
                <Button
                  variant={activePanel === 'theory' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('theory')}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Theory
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activePanel === 'evidence' && (
                <div className="space-y-4">
                  {artifact ? (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{artifact.path}</h3>
                      <pre className="bg-muted p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                        {artifact.content}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-12">Select an artifact from the evidence tree</p>
                  )}
                </div>
              )}
              
              {activePanel === 'terminal' && (
                <div className="space-y-4">
                  <div className="bg-black rounded-lg p-4 min-h-[400px] max-h-[600px] overflow-y-auto font-mono text-sm">
                    {terminalHistory.map((entry, idx) => (
                      <div key={idx} className="mb-4">
                        <div className="text-green-400">$ {entry.command}</div>
                        <pre className="text-gray-300 whitespace-pre-wrap mt-1">{entry.output}</pre>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && executeCommand()}
                      placeholder="Type command... (cat, grep, find, etc.)"
                      className="font-mono"
                    />
                    <Button onClick={executeCommand}>Execute</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported: {selectedCasefile?.supportedCommands.join(', ')}
                  </p>
                </div>
              )}
              
              {activePanel === 'theory' && (
                <div className="space-y-4">
                  {selectedCasefile?.theoryCards.filter(t => activeSession.theoriesViewed.includes(t.id) || activeSession.currentState.some(s => s.includes(t.trigger))).map(theory => (
                    <Card key={theory.id} className="border-amber-500/30">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          {theory.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 prose prose-invert prose-sm max-w-none">
                        <div>
                          <strong>What this is:</strong> {theory.whatThisIs}
                        </div>
                        <div>
                          <strong>Why it matters:</strong> {theory.whyItMatters}
                        </div>
                        <div>
                          <strong>Pentest reflex:</strong> {theory.pentestReflex}
                        </div>
                        <div>
                          <strong>Common misunderstanding:</strong> {theory.commonMisunderstanding}
                        </div>
                        {theory.syntaxExample && (
                          <div>
                            <strong>Syntax example:</strong>
                            <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ fontSize: '0.75rem', padding: '0.75rem', marginTop: '0.5rem' }}>
                              {theory.syntaxExample}
                            </SyntaxHighlighter>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )) || <p className="text-muted-foreground text-center py-12">No theory unlocked yet. Make progress to reveal concepts.</p>}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Right Panel - Operator Console */}
          <Card className="col-span-3">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant={activePanel === 'notes' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('notes')}
                >
                  Notes
                </Button>
                <Button
                  variant={activePanel === 'findings' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('findings')}
                >
                  Finding
                </Button>
                <Button
                  variant={activePanel === 'hints' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActivePanel('hints')}
                >
                  Hints
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activePanel === 'notes' && (
                <div className="space-y-4">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take notes on your investigation..."
                    rows={20}
                    className="font-mono text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => {
                    setActiveSession({ ...activeSession, notes });
                    toast({ title: 'Notes Saved' });
                  }}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Notes
                  </Button>
                </div>
              )}
              
              {activePanel === 'findings' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Finding Title</label>
                    <Input
                      value={userFinding.title || ''}
                      onChange={(e) => setUserFinding({ ...userFinding, title: e.target.value })}
                      placeholder="e.g., Exposed Development Backup"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Severity</label>
                    <Input
                      value={userFinding.severity || ''}
                      onChange={(e) => setUserFinding({ ...userFinding, severity: e.target.value })}
                      placeholder="critical, high, medium, low, info"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={userFinding.description || ''}
                      onChange={(e) => setUserFinding({ ...userFinding, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Impact</label>
                    <Textarea
                      value={userFinding.impact || ''}
                      onChange={(e) => setUserFinding({ ...userFinding, impact: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Remediation</label>
                    <Textarea
                      value={userFinding.remediation || ''}
                      onChange={(e) => setUserFinding({ ...userFinding, remediation: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button onClick={submitFinding} disabled={!allConditionsMet} className="w-full">
                    <Flag className="h-4 w-4 mr-2" />
                    Submit Finding
                  </Button>
                  {!allConditionsMet && (
                    <p className="text-xs text-muted-foreground">Complete all objectives before submitting</p>
                  )}
                </div>
              )}
              
              {activePanel === 'hints' && (
                <div className="space-y-3">
                  {selectedCasefile?.hints.map((hint) => (
                    <Card key={hint.tier} className="border-amber-500/20">
                      <CardContent className="py-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={hint.tier === 1 ? 'secondary' : hint.tier === 2 ? 'default' : 'destructive'}>
                            Tier {hint.tier}
                          </Badge>
                          <Badge variant="outline">{hint.pointsCost > 0 ? `-${hint.pointsCost} pts` : 'Free'}</Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => useHint(hint.tier)}
                          disabled={activeSession.hintsUsed.includes(hint.tier)}
                          className="w-full"
                        >
                          {activeSession.hintsUsed.includes(hint.tier) ? 'Used' : 'Use Hint'}
                        </Button>
                        {activeSession.hintsUsed.includes(hint.tier) && (
                          <p className="text-xs text-muted-foreground mt-2">{hint.text}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
