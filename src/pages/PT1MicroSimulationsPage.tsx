import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DevvAI } from '@devvai/devv-code-backend';
import { 
  Target, 
  PlayCircle, 
  Clock, 
  TrendingUp,
  BookOpen,
  Shield,
  Network,
  Database,
  Lock,
  FileText,
  Filter
} from 'lucide-react';
import { useDecisionEngineStore } from '@/store/decision-engine-store';
import scenarios from '@/data/pt1-micro-scenarios.json';
import { parseAIJson } from '@/lib/utils';

type Domain = 'all' | 'recon_enum' | 'web_app' | 'network_pentest' | 'active_directory' | 'exploitation_privesc' | 'reporting_time';
type Difficulty = 'all' | 'beginner' | 'intermediate';

interface MicroScenario {
  id: string;
  title: string;
  difficulty: string;
  domain: string;
  domainKey?: string; // Added to track which domain category it belongs to
  subskills: string[];
  description: string;
  targetIP: string;
  openPorts: string[];
  objectives: string[];
  timeEstimate: string;
  validApproaches: string[];
  keyCommands: string[];
}

export default function PT1MicroSimulationsPage() {
  const [domainFilter, setDomainFilter] = useState<Domain>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty>('all');
  const [isStarting, setIsStarting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const decisionStore = useDecisionEngineStore();

  // Check if there's an active simulation from Decision Engine
  const hasActiveSimulation = decisionStore.activeSimulation?.phase === 'running';

  const domainConfig = {
    recon_enum: {
      label: 'Recon & Enumeration',
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    web_app: {
      label: 'Web Application Testing',
      icon: Shield,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    network_pentest: {
      label: 'Network Penetration Testing',
      icon: Network,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    active_directory: {
      label: 'Active Directory',
      icon: Database,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    exploitation_privesc: {
      label: 'Exploitation & Post-Exploitation',
      icon: Lock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    reporting_time: {
      label: 'Reporting & Time Management',
      icon: FileText,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
  };

  // Flatten scenarios into array
  const allScenarios: MicroScenario[] = Object.entries(scenarios).flatMap(([domain, scenarioList]) =>
    (scenarioList as MicroScenario[]).map((s) => ({ ...s, domainKey: domain }))
  );

  // Apply filters
  const filteredScenarios = allScenarios.filter((scenario) => {
    const matchesDomain = domainFilter === 'all' || scenario.domainKey === domainFilter;
    const matchesDifficulty = difficultyFilter === 'all' || scenario.difficulty === difficultyFilter;
    return matchesDomain && matchesDifficulty;
  });

  const startMicroSimulation = async (scenario: MicroScenario) => {
    setIsStarting(true);
    try {
      const ai = new DevvAI();

      // Generate contextualized scenario using Decision Engine format
      const systemPrompt = `You are an AI pentest simulation engine. Generate a PT1-focused micro-simulation for this specific scenario:

**Domain:** ${scenario.domain}
**Title:** ${scenario.title}
**Target IP:** ${scenario.targetIP}
**Open Ports:** ${scenario.openPorts.join(', ')}
**Objectives:**
${scenario.objectives.map((obj) => `- ${obj}`).join('\n')}

**Key Commands to Accept:**
${scenario.keyCommands.join(', ')}

**Valid Approaches:**
${scenario.validApproaches.join(', ')}

**IMPORTANT GRADING INSTRUCTIONS:**
- DO NOT require exact command strings
- Grade by INTENT and GOAL SIGNALS (correct port, protocol, tool family, target specified)
- Accept Kali AND BlackArch equivalents:
  * SMB: smbclient, smbmap, crackmapexec, netexec (nxc), enum4linux
  * Web fuzzing: gobuster, dirb, ffuf, feroxbuster, wfuzz
  * Password attacks: hydra, medusa, ncrack, patator
  * Impacket tools: All impacket-* variants (secretsdump.py, GetUserSPNs.py, etc.)
- If user uses the WRONG tool or approach, provide detailed feedback on WHY it's suboptimal
- Store ALL failed attempts with: command, reason, better alternatives
- Focus on teaching methodology over exact syntax

Generate a realistic engagement briefing in this format:

**TARGET INFORMATION**
- IP: ${scenario.targetIP}
- Difficulty: ${scenario.difficulty}
- Domain: ${scenario.domain}

**ENGAGEMENT CONTEXT**
[Brief realistic context for this specific scenario - make it feel like a real engagement slice]

**YOUR MISSION**
You must complete the following objectives:
${scenario.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

**TIME LIMIT:** ${scenario.timeEstimate}

**READY?**
What is your first command? Think about the methodology for ${scenario.domain}.`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [{ role: 'user', content: systemPrompt }],
      });

      const generatedScenario = response.choices[0]?.message?.content || 'Failed to generate scenario';

      // Start simulation using Decision Engine store with "beginner" difficulty for micro-sims
      // Parse time estimate from string like "5-10min" to number
      const parsedTime = scenario.timeEstimate 
        ? parseInt(scenario.timeEstimate.split('-')[1] || '15', 10) 
        : 15;

      decisionStore.startNewSimulation(
        scenario.difficulty as 'beginner' | 'intermediate',
        generatedScenario,
        scenario.targetIP,
        parsedTime
      );

      toast({
        title: 'Micro-Simulation Started',
        description: `${scenario.title} - ${scenario.timeEstimate}`,
      });

      // Navigate to Decision Engine page which handles the simulation
      navigate('/decision-engine');
    } catch (error) {
      console.error('Micro-simulation start error:', error);
      toast({
        title: 'Failed to Start',
        description: 'Could not initialize micro-simulation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            PT1 Micro-Simulations
          </h1>
          <p className="text-muted-foreground">
            Short, focused pentesting scenarios (5–15 min) powered by the Decision Engine. Practice specific PT1 domains without the full exam time commitment.
          </p>
        </div>

        {/* Active Simulation Warning */}
        {hasActiveSimulation && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <PlayCircle className="h-5 w-5" />
                Active Simulation Detected
              </CardTitle>
              <CardDescription>
                You have an active simulation in progress. Complete or reset it before starting a new micro-simulation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/decision-engine')} className="w-full">
                Continue Active Simulation
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Domain</label>
              <Select value={domainFilter} onValueChange={(v) => setDomainFilter(v as Domain)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  <SelectItem value="recon_enum">Recon & Enumeration</SelectItem>
                  <SelectItem value="web_app">Web Application Testing</SelectItem>
                  <SelectItem value="network_pentest">Network Penetration Testing</SelectItem>
                  <SelectItem value="active_directory">Active Directory</SelectItem>
                  <SelectItem value="exploitation_privesc">Exploitation & Post-Exploitation</SelectItem>
                  <SelectItem value="reporting_time">Reporting & Time Management</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficultyFilter} onValueChange={(v) => setDifficultyFilter(v as Difficulty)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Scenarios</p>
                  <p className="text-2xl font-bold">{allScenarios.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Filtered</p>
                  <p className="text-2xl font-bold">{filteredScenarios.length}</p>
                </div>
                <Filter className="h-8 w-8 text-secondary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">10 min</p>
                </div>
                <Clock className="h-8 w-8 text-chart-3" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scenario Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredScenarios.map((scenario: any) => {
            const domainCfg = domainConfig[scenario.domainKey as keyof typeof domainConfig];
            const Icon = domainCfg.icon;

            return (
              <Card key={scenario.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${domainCfg.bgColor}`}>
                        <Icon className={`h-5 w-5 ${domainCfg.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{scenario.title}</CardTitle>
                        <CardDescription className="mt-1">{scenario.domain}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={scenario.difficulty === 'beginner' ? 'secondary' : 'default'}>
                      {scenario.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{scenario.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{scenario.timeEstimate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      <span>Target: {scenario.targetIP}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Objectives:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {scenario.objectives.map((obj: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {scenario.subskills.slice(0, 3).map((skill: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <Button
                    onClick={() => startMicroSimulation(scenario)}
                    disabled={isStarting || hasActiveSimulation}
                    className="w-full"
                  >
                    {isStarting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start Micro-Simulation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredScenarios.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No scenarios match your filters. Try adjusting them.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
