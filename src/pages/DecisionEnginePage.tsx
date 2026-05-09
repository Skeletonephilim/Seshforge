import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, PlayCircle, Download, RotateCcw, Terminal, TrendingUp, Target, Zap, Clock, Activity, Timer as TimerIcon, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateRealisticIP } from '@/lib/ip-generator';
import { DevvAI } from '@devvai/devv-code-backend';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { exportDrillReportToMarkdown, downloadMarkdownFile, readMarkdownFile, importDrillReportFromMarkdown, DrillReportData } from '@/lib/drill-report-markdown';
import { useCertificationStore, type CertificationDomain } from '@/store/certification-store';
import { useProgressStore } from '@/store/progress-store';
import MethodologyHintSystem from '@/components/MethodologyHintSystem';
import { TerminalCommandInput } from '@/components/TerminalCommandInput';
import { parseAIJson, extractJsonFromAI } from '@/lib/utils';
import CertificationReadinessMeter from '@/components/CertificationReadinessMeter';
import { useDecisionEngineStore } from '@/store/decision-engine-store';
import { useDrillSessionStore, type PentestingPhase } from '@/store/drill-session-store';
import { table } from '@devvai/devv-code-backend';
import { generateDiverseScenario, generateScenarioForDomain, formatScenarioForAI, type ScenarioType } from '@/lib/scenario-diversity';
import { generatePostExamReview } from '@/lib/report-review-generator';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type PentestPhase = 'reconnaissance' | 'scanning' | 'enumeration' | 'initial_access' | 'privilege_escalation' | 'post_exploitation';

interface SimulationState {
  phase: 'setup' | 'running' | 'completed';
  scenario: string;
  targetIP: string;
  currentPentestPhase: PentestPhase;
  history: Array<{
    userCommand: string;
    systemResponse: string;
    timestamp: string;
    phase: PentestPhase;
    executionId?: string;
    integrityWarning?: boolean;
  }>;
  hintsUsed: number;
  pointsDeducted: number;
  discoveredInfo: {
    openPorts?: string[];
    services?: string[];
    directories?: string[];
    credentials?: string[];
    flags?: string[];
  };
  evaluation?: {
    reconScore: number;
    scanningScore: number;
    enumerationScore: number;
    exploitationScore: number;
    privescScore: number;
    methodologyScore: number;
    overallScore: number;
    feedback: string;
    timeEfficiency: string;
  };
}

// Simulation Timer Component
function SimulationTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const interval = setInterval(() => {
      const start = new Date(startTime).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <Badge variant="outline" className="font-mono text-xs">
      <TimerIcon className="w-3 h-3 mr-1" />
      {elapsed}
    </Badge>
  );
}

// Output Integrity Validation - Detects potentially stale/reused outputs
function validateOutputIntegrity(
  command: string, 
  output: string, 
  history: Array<{ userCommand: string; systemResponse: string }>
): boolean {
  // Check 1: Output significantly longer than command (unlikely for cat/echo/simple commands)
  const commandLower = command.toLowerCase();
  const isSimpleCommand = commandLower.startsWith('cat ') || 
                           commandLower.startsWith('echo ') || 
                           commandLower.startsWith('pwd') || 
                           commandLower.startsWith('whoami') || 
                           commandLower.startsWith('id');
  
  if (isSimpleCommand && output.length > 500) {
    // Simple commands shouldn't produce 500+ char outputs
    return true; // Likely stale
  }
  
  // Check 2: Exact match with previous output (smoking gun)
  const lastOutputs = history.slice(-3).map(h => h.systemResponse);
  if (lastOutputs.includes(output)) {
    console.warn('[INTEGRITY] Output exactly matches previous response');
    return true; // Definitely stale
  }
  
  // Check 3: Very high similarity to previous output (>90% overlap)
  for (const prevOutput of lastOutputs) {
    if (prevOutput.length > 100 && output.length > 100) {
      const similarity = calculateSimilarity(output.substring(0, 500), prevOutput.substring(0, 500));
      if (similarity > 0.9) {
        console.warn(`[INTEGRITY] High similarity detected: ${(similarity * 100).toFixed(1)}%`);
        return true; // Very likely stale
      }
    }
  }
  
  // Check 4: Command expects specific output format but got generic response
  if (commandLower.startsWith('cat ') || commandLower.includes('cat ')) {
    // Cat commands should show file content or errors, not tool output like nmap/wget
    if (output.includes('Starting Nmap') || 
        output.includes('Connecting to') || 
        output.includes('Saving to:') ||
        output.includes('tar:') ||
        output.includes('HTTP request sent')) {
      console.warn('[INTEGRITY] Cat command returned tool output instead of file content');
      return true; // Wrong output type
    }
  }
  
  return false; // Output seems legitimate
}

// Calculate similarity between two strings (Jaccard index approximation)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export default function DecisionEnginePage() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [selectedDomain, setSelectedDomain] = useState<ScenarioType>('web'); // Phase 31C: Domain selection
  const [userCommand, setUserCommand] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [importText, setImportText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [professionalReportMode, setProfessionalReportMode] = useState(false);
  const [reportDraft, setReportDraft] = useState('');
  const [timerDuration, setTimerDuration] = useState<number>(30);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const { toast } = useToast();
  const certStore = useCertificationStore();
  const progressStore = useProgressStore();
  const drillStore = useDrillSessionStore();
  
  // Use persistent store for simulation state
  const decisionStore = useDecisionEngineStore();
  const simulation = decisionStore.activeSimulation;

  // Load certification data and restore simulation on mount
  useEffect(() => {
    certStore.loadFromDatabase();
    
    // Check if there's an active simulation to resume
    const activeSimulation = decisionStore.loadSimulation();
    if (activeSimulation && activeSimulation.phase === 'running') {
      toast({
        title: 'Simulation Resumed',
        description: `Continuing ${activeSimulation.targetIP} from ${activeSimulation.currentPentestPhase} phase`,
      });
    }
  }, []);
  
  // Professional Report Mode timer
  useEffect(() => {
    if (!professionalReportMode || !timerStartTime || simulation?.phase !== 'running') return;
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      const remaining = Math.max(0, timerDuration * 60 - elapsed);
      setTimerRemaining(remaining);
      
      // Warning at 5 minutes
      if (remaining === 300) {
        toast({
          title: '⏰ 5 Minutes Remaining',
          description: 'Complete your professional report before time expires',
          duration: 10000,
        });
      }
      
      // Warning at 1 minute
      if (remaining === 60) {
        toast({
          title: '⚠️ 1 Minute Remaining',
          description: 'Finalize your report immediately',
          variant: 'destructive',
          duration: 10000,
        });
      }
      
      // Time expired
      if (remaining === 0) {
        toast({
          title: '⏱️ Time Expired',
          description: 'Drill ended - submitting report',
          variant: 'destructive',
        });
        // Auto-end simulation
        setTimeout(() => {
          if (simulation?.phase === 'running') {
            evaluateSimulation();
          }
        }, 2000);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [professionalReportMode, timerStartTime, timerDuration, simulation?.phase]);

  const difficultyDescriptions = {
    beginner: 'Single vulnerable service, clear attack path, basic privilege escalation',
    intermediate: 'Multiple services, hidden directories, weak credentials, lateral movement',
    advanced: 'Firewall filtering, hidden ports, multi-stage exploitation, advanced privesc',
  };

  const phaseDescriptions: Record<PentestPhase, string> = {
    reconnaissance: 'Gather information about the target (passive)',
    scanning: 'Identify live hosts, open ports, and services',
    enumeration: 'Deep dive into discovered services and directories',
    initial_access: 'Exploit vulnerabilities to gain initial foothold',
    privilege_escalation: 'Escalate privileges to root/SYSTEM',
    post_exploitation: 'Maintain access, cover tracks, document findings',
  };

  const startSimulation = async () => {
    setIsGenerating(true);
    try {
      const ai = new DevvAI();
      
      // Get scenario history to ensure diversity
      const scenarioHistory = decisionStore.scenarioHistory || [];
      
      // ✅ PHASE 31C: Use selected domain if specified, otherwise auto-diverse
      const scenarioTemplate = selectedDomain 
        ? generateScenarioForDomain(selectedDomain, difficulty, scenarioHistory)
        : generateDiverseScenario(difficulty, scenarioHistory);
      
      // Format scenario for AI with all PT1-aligned details
      const scenarioPrompt = formatScenarioForAI(scenarioTemplate, difficulty);
      
      console.log('[SCENARIO DIVERSITY] Generated scenario type:', scenarioTemplate.type);
      console.log('[SCENARIO DIVERSITY] Domain selected by user:', selectedDomain || 'auto');
      console.log('[SCENARIO DIVERSITY] Entry points:', scenarioTemplate.entryPoints);
      console.log('[SCENARIO DIVERSITY] Privesc method:', scenarioTemplate.privescMethod);
      console.log('[SCENARIO DIVERSITY] Services:', scenarioTemplate.services.map(s => `${s.port}:${s.service}`).join(', '));

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [{ role: 'user', content: scenarioPrompt }],
      });

      const scenario = response.choices[0]?.message?.content || 'Failed to generate scenario';
      
      // Extract target IP from scenario or use realistic IP generator
      const ipMatch = scenario.match(/IP:\s*([\d.]+)/);
      const targetIP = ipMatch ? ipMatch[1] : generateRealisticIP();

      // Store scenario in history to track diversity
      const attackPath = scenarioTemplate.entryPoints.map(e => e.toString());
      decisionStore.addScenarioToHistory(
        scenarioTemplate.type,
        attackPath,
        scenarioTemplate.privescMethod,
        targetIP
      );

      decisionStore.startNewSimulation(difficulty, scenario, targetIP, 30, scenarioTemplate.type);

      toast({
        title: 'Simulation Started',
        description: `Target: ${targetIP} | Type: ${scenarioTemplate.type.toUpperCase()} | Difficulty: ${difficulty}`,
      });
      
      // Initialize professional report mode if enabled
      if (professionalReportMode) {
        setTimerStartTime(Date.now());
        setTimerRemaining(timerDuration * 60);
        setReportDraft(`# Professional Drill Report

## Objective

[What was the goal of this ${scenarioTemplate.type} drill?]

## Reconnaissance & Enumeration

[What information was gathered? Which tools were used?]

## Exploitation

[How was initial access achieved? What vulnerabilities were exploited?]

## Privilege Escalation / Impact

[How were privileges escalated? What was the final impact?]

## Evidence

\`\`\`bash
[Key commands executed]
\`\`\`

[Flags captured, credentials found, etc.]

## Remediation

[How could the identified vulnerabilities be fixed?]

## Lessons Learned

[What did you learn from this drill? What would you do differently?]

---

*Report Generated: ${new Date().toISOString()}*
*Drill Type: Decision Engine - ${scenarioTemplate.type}*
*Difficulty: ${difficulty}*
`);
      }
    } catch (error) {
      console.error('Scenario generation error:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate scenario. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const executeCommand = async () => {
    if (!userCommand.trim() || !simulation) return;

    // Sanitize user input to prevent prompt injection and limit length
    const sanitizedCommand = userCommand.trim().substring(0, 500);
    
    // Enhanced validation for ultra-short commands
    if (sanitizedCommand.length < 2) {
      toast({
        title: 'Invalid Command',
        description: 'Command too short. Please enter a valid pentesting command.',
        variant: 'destructive',
      });
      return;
    }

    // Generate unique execution ID to prevent output reuse
    const executionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[COMMAND EXECUTION] ID: ${executionId} | Command: ${sanitizedCommand}`);

    setIsGenerating(true);
    try {
      const ai = new DevvAI();
      
      // Build context from LAST 2 commands only (ultra-minimal for stability)
      const recentHistory = simulation.history.slice(-2);
      const historyContext = recentHistory
        .map((h) => {
          // Aggressively truncate and remove newlines/special chars
          const cmd = h.userCommand.substring(0, 50).replace(/[\n\r\t]/g, ' ');
          const resp = h.systemResponse.substring(0, 80).replace(/[\n\r\t]/g, ' ');
          return `${cmd}: ${resp}`;
        })
        .join(' | ');

      // Ultra-minimal discovered context
      const discoveredSummary = `${simulation.discoveredInfo.openPorts?.length || 0}p ${simulation.discoveredInfo.services?.length || 0}s ${simulation.discoveredInfo.flags?.length || 0}/2f`;

      const systemPrompt = `You are an advanced penetration testing mentor and red team operator.
Your role is to guide the pentester interactively through hacking ${simulation.targetIP}.

EXECUTION CONTEXT:
- Target: ${simulation.targetIP}
- Current Phase: ${simulation.currentPentestPhase}
- Recent Commands: ${historyContext || 'None yet'}
- Discovered: ${discoveredSummary}
- Execution ID: ${executionId}

USER COMMAND TO EXECUTE: ${sanitizedCommand}

YOUR RESPONSE MUST INCLUDE 3 SECTIONS:

1. TOOL OUTPUT (realistic command output, max 25 lines)
2. MENTOR GUIDANCE (your analysis and next steps)
3. TECHNICAL DATA (phase detection and discoveries)

FORMAT EXACTLY AS:

=== TOOL OUTPUT ===
[Generate realistic output for: ${sanitizedCommand}]
[Be specific to THIS command - no reused outputs]
[If cat/grep file: show contents or error, NOT previous tool output]
[If invalid command: show bash error]

=== MENTOR GUIDANCE ===
**Why This Command?**
[1-2 sentences explaining WHY this step is chosen strategically in the attack chain]

**Command Breakdown:**
\`${sanitizedCommand}\`

Breakdown:
- [flag/arg] → [what it does and why it matters]
- [flag/arg] → [meaning]
- [flag/arg] → [purpose]

**Mnemonic:** "[short memory trick for key flags - e.g., 'u = URL, w = words, t = turbo']"

**Analysis:** [What does this output mean? Quick, practical interpretation]

**Assessment:** [Was this move good/useless/suboptimal? Be direct]

**What We Learned:** [Key discoveries: services, versions, creds, attack surface, etc.]

**Next Best Steps (Priority Order):**
1. [Highest priority action with exact command - USE ACTUAL IP: ${simulation.targetIP}]
   \`\`\`bash
   command-here --flags ${simulation.targetIP}
   \`\`\`
2. [Second priority with command - USE ACTUAL IP: ${simulation.targetIP}]
   \`\`\`bash
   alternative-command ${simulation.targetIP}
   \`\`\`
3. [Third option if relevant - USE ACTUAL IP: ${simulation.targetIP}]

**Alternative Tools:** [Suggest relevant alternatives when same tool used repeatedly: nikto, gobuster, ffuf, feroxbuster, smbclient, enum4linux, crackmapexec/nxc, hydra, john, hashcat, searchsploit, linpeas, etc. Goal: avoid automation dependency]

**Methodology Note:** [Brief reminder where we are: recon → enum → exploit → privesc. Stay focused on attack chain]

=== TECHNICAL DATA ===
PHASE: ${simulation.currentPentestPhase}
DISCOVERED: {"openPorts":[],"services":[],"directories":[],"credentials":[],"flags":[]}

CRITICAL RULES - MUST FOLLOW:

0. ALWAYS USE ACTUAL TARGET IP IN COMMANDS:
   - Target IP is: ${simulation.targetIP}
   - NEVER use "TARGET_IP" placeholder - always replace with ${simulation.targetIP}
   - NEVER use generic IPs like "10.10.10.X" - always use ${simulation.targetIP}
   - Every command must include the actual target: ${simulation.targetIP}
   - Examples:
     * CORRECT: nmap -sV ${simulation.targetIP}
     * CORRECT: gobuster dir -u http://${simulation.targetIP}
     * CORRECT: enum4linux -a ${simulation.targetIP}
     * WRONG: nmap -sV TARGET_IP
     * WRONG: enum4linux -a 10.10.10.X

1. TOOL OUTPUT IS GROUND TRUTH (ABSOLUTE PRIORITY):
   - If hydra finds "admin:password123", those ARE the valid credentials
   - NEVER replace discovered credentials with guesses (NO "admin:admin" after hydra found real creds)
   - If tool output says SUCCESS, do NOT later claim it failed
   - If authentication fails AFTER finding creds, investigate WHY:
     * Wrong service (SSH creds on HTTP)
     * Wrong auth method (password vs key-based)
     * Account lockout from previous attempts
     * Username/service mismatch
   - Tool output = absolute truth. Your analysis MUST respect it.

2. NO REPETITION WITHOUT ADAPTATION:
   - If hydra already ran and found creds → DO NOT suggest hydra again
   - If SSH login failed with found creds → investigate root cause, NOT retry same approach
   - If same tool suggested 3+ times → STOP and pivot strategy
   - Adapt based on results:
     * Creds found → validate on all services (SSH, MySQL, web admin)
     * Login failed → analyze why (method? service? lockout?)
     * Enumeration complete → move to exploitation, NOT re-enumerate

3. RESPECT SECURITY MECHANISMS:
   - If page says "3 failed attempts = account lockout" → STOP brute-force immediately
   - Detect rate limiting, lockouts, WAFs → switch to credential discovery:
     * /backup/ files
     * /config.php leaks
     * Database dumps (MySQL 3306)
     * Logic flaws (password reset, token abuse)
   - Brute-force is LAST resort when no other vectors exist

4. CORRECT ATTACK PRIORITIZATION:
   - High-value first: config files > backups > exposed DBs > brute-force
   - Correct order:
     * Found /backup/ → enumerate BEFORE trying login
     * Found config.php → read for DB creds BEFORE hydra
     * MySQL exposed (3306) → try discovered creds BEFORE SSH
   - Recon → Enum → Credential Discovery → Exploitation → PrivEsc
   - Do NOT skip valuable targets for low-probability attacks

5. FAILURE ANALYSIS REQUIRED:
   - When something fails, explain WHY:
     * SSH fails → check: auth method? username validity? service config?
     * Web login fails → check: session handling? CSRF token? parameter encoding?
     * Command fails → check: syntax? permissions? service state?
   - Suggest verification steps:
     * Test creds on other services
     * Check service configuration
     * Verify username/service match
   - Propose alternatives, NOT just "try again"

6. DECISION ENGINE BEHAVIOR:
   - Every suggestion needs reasoning: "Because X discovered → do Y next"
   - Example: "Backup dir found → likely contains source code/DB dumps → enumerate it before login attempts"
   - Example: "Hydra found admin:password → test on ALL services (MySQL 3306, SSH 22, web /admin)"
   - Connect discoveries to next logical step

7. AVOID BRUTE-FORCE OVER-RELIANCE:
   - Prefer information disclosure over guessing
   - Prioritize:
     * File/directory enumeration (configs, backups, .git, .env)
     * Database access (if exposed)
     * Credential reuse (test found creds everywhere)
     * Logic flaws (reset flows, tokens, IDORs)
   - Use brute-force ONLY when:
     * All other vectors exhausted
     * No lockout mechanism detected
     * Limited attempts (3-5 common passwords MAX)

8. TRAIN DECISION-MAKING NOT TOOL SPAM:
   - Every step must reinforce: situation → analysis → correct tool → execution
   - Bad: "Try hydra"
   - Good: "Admin panel found + no lockout mentioned → test common creds (3 attempts max): admin:admin, admin:password, admin:Welcome1"
   - Teach pattern recognition, not blind automation

TONE: Practical, direct, adaptive. Like a senior pentester who learns from results and pivots strategy.

RESPOND NOW.`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [{ role: 'user', content: systemPrompt }],
      });

      const systemResponse = response.choices[0]?.message?.content || 'No response generated';
      
      // Log AI response for debugging
      console.log(`[COMMAND RESPONSE] ID: ${executionId} | Response length: ${systemResponse.length} chars`);
      console.log(`[COMMAND RESPONSE] First 200 chars: ${systemResponse.substring(0, 200)}`);
      
      // Validate output integrity - check if AI returned generic/cached response
      const isLikelyStaleOutput = validateOutputIntegrity(sanitizedCommand, systemResponse, simulation.history);
      if (isLikelyStaleOutput) {
        console.warn(`[OUTPUT INTEGRITY WARNING] Execution ID: ${executionId} - Potential stale output detected`);
        console.warn(`[OUTPUT INTEGRITY] Command: ${sanitizedCommand}`);
        console.warn(`[OUTPUT INTEGRITY] Response snippet: ${systemResponse.substring(0, 300)}`);
      }

      // Extract discovered info from response
      // Try multiple patterns to find DISCOVERED JSON
      let discoveredJsonStr: string | null = null;
      
      // Pattern 1: With code blocks and newline: DISCOVERED:\n```json {...} ```
      let match = systemResponse.match(/DISCOVERED:\s*\n```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
      if (match) {
        discoveredJsonStr = match[1];
      } else {
        // Pattern 2: Without code blocks, with optional newline/space: DISCOVERED: {...}
        // Extract everything after "DISCOVERED:" until end of JSON object
        const afterDiscovered = systemResponse.match(/DISCOVERED:\s*(\{[\s\S]*)/i);
        if (afterDiscovered) {
          // Use parseAIJson's extraction logic to get the full JSON object
          try {
            discoveredJsonStr = extractJsonFromAI(afterDiscovered[1]);
          } catch (e) {
            console.warn('Failed to extract JSON after DISCOVERED:', e);
          }
        }
      }
      
      let updatedDiscoveredInfo = simulation.discoveredInfo;
      
      // Also check for flags in the actual command output (fallback detection)
      const flagPatterns = [
        /THM\{[^}]+\}/g,
        /FLAG\{[^}]+\}/g,
        /CTF\{[^}]+\}/g,
        /HTB\{[^}]+\}/g,
        /OSCP\{[^}]+\}/g
      ];
      
      const detectedFlags: string[] = [];
      flagPatterns.forEach(pattern => {
        const matches = systemResponse.match(pattern);
        if (matches) {
          detectedFlags.push(...matches);
        }
      });
      
      if (discoveredJsonStr) {
        try {
          const newInfo = JSON.parse(discoveredJsonStr);
          
          // Transform complex structures to simple arrays for display
          const transformedInfo = {
            openPorts: newInfo.openPorts || [],
            services: Array.isArray(newInfo.services) 
              ? newInfo.services 
              : (typeof newInfo.services === 'object' ? Object.keys(newInfo.services) : []),
            directories: newInfo.directories || [],
            credentials: Array.isArray(newInfo.credentials)
              ? newInfo.credentials.map((c: any) => typeof c === 'string' ? c : `${c.username || c.service}`)
              : [],
            flags: Array.isArray(newInfo.flags)
              ? newInfo.flags.map((f: any) => typeof f === 'string' ? f : f.value).filter(Boolean)
              : []
          };
          
          // Add fallback-detected flags if AI missed them
          if (detectedFlags.length > 0) {
            transformedInfo.flags = [...new Set([...transformedInfo.flags, ...detectedFlags])];
          }
          
          // Merge with existing info (deduplicate)
          updatedDiscoveredInfo = {
            openPorts: [...new Set([...(simulation.discoveredInfo.openPorts || []), ...transformedInfo.openPorts])],
            services: [...new Set([...(simulation.discoveredInfo.services || []), ...transformedInfo.services])],
            directories: [...new Set([...(simulation.discoveredInfo.directories || []), ...transformedInfo.directories])],
            credentials: [...new Set([...(simulation.discoveredInfo.credentials || []), ...transformedInfo.credentials])],
            flags: [...new Set([...(simulation.discoveredInfo.flags || []), ...transformedInfo.flags])],
          };
        } catch (e) {
          console.error('Failed to parse discovered info:', e);
          console.error('Discovered JSON string:', discoveredJsonStr);
          
          // Fallback: if parsing fails but we detected flags in output, still add them
          if (detectedFlags.length > 0) {
            updatedDiscoveredInfo = {
              ...simulation.discoveredInfo,
              flags: [...new Set([...(simulation.discoveredInfo.flags || []), ...detectedFlags])],
            };
          }
        }
      } else if (detectedFlags.length > 0) {
        // No DISCOVERED JSON found, but flags detected in output - add them anyway
        updatedDiscoveredInfo = {
          ...simulation.discoveredInfo,
          flags: [...new Set([...(simulation.discoveredInfo.flags || []), ...detectedFlags])],
        };
      }

      // Extract current phase from response - NEW FORMAT: "PHASE: enumeration"
      const phaseMatch = systemResponse.match(/PHASE:\s*(scanning|enumeration|initial_access|privilege_escalation|post_exploitation)/i);
      let newPhase = simulation.currentPentestPhase;
      if (phaseMatch) {
        newPhase = phaseMatch[1].toLowerCase() as PentestPhase;
      }

      decisionStore.updateSimulationState({
        currentPentestPhase: newPhase,
        discoveredInfo: updatedDiscoveredInfo,
      });
      
      decisionStore.addCommandToHistory({
        userCommand: sanitizedCommand,
        systemResponse,
        timestamp: new Date().toLocaleTimeString(),
        phase: newPhase,
        executionId, // Add execution ID for integrity tracking
        integrityWarning: isLikelyStaleOutput, // Flag if output seems stale
      });

      setUserCommand('');

      // ===== FINDING COACH: Detect confirmable vulnerabilities =====
      const { detectVulnerabilityEvent, generateFinding, isConfirmedFinding } = await import('@/lib/finding-coach');
      const vulnEvent = detectVulnerabilityEvent(
        sanitizedCommand,
        systemResponse,
        newPhase,
        updatedDiscoveredInfo
      );

      if (vulnEvent && isConfirmedFinding(vulnEvent)) {
        console.log('[FindingCoach] Confirmed vulnerability detected:', vulnEvent.type);
        
        // Generate finding report asynchronously (don't block execution)
        generateFinding(vulnEvent, simulation.targetIP, simulation.history)
          .then(finding => {
            decisionStore.addFinding(finding);
            toast({
              title: '📝 New Finding Generated',
              description: finding.title,
              duration: 3000,
            });
          })
          .catch(err => {
            console.error('[FindingCoach] Failed to generate finding:', err);
          });
      }
      // ===== END FINDING COACH =====

      // ✅ PHASE 31C: Removed auto-termination on flag completion
      // Flags are now milestones, NOT termination conditions
      const foundFlags = updatedDiscoveredInfo.flags?.length || 0;
      
      // Show toast for flag captures (but never auto-end session)
      if (foundFlags > (simulation.discoveredInfo.flags?.length || 0)) {
        toast({
          title: '🎯 Flag Captured!',
          description: `Flag ${foundFlags}/2 found! ${foundFlags >= 2 ? 'Excellent progress! Session continues - click "End Session" when ready.' : 'Continue exploring to find the remaining flag.'}`,
        });
      }
    } catch (error) {
      console.error('Command execution error:', error);
      
      // Detailed error logging for debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Full error details:', {
        command: userCommand.substring(0, 100),
        historyLength: simulation.history.length,
        errorMessage,
      });

      // Provide user-friendly error message based on error type
      let description = 'Failed to execute command. Please try again.';
      if (errorMessage.includes('400')) {
        description = 'Command too complex or prompt too large. Try shortening your command or starting a new simulation.';
      } else if (errorMessage.includes('429')) {
        description = 'Rate limit reached. Please wait a moment and try again.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        description = 'Network error. Check your connection and try again.';
      }

      toast({
        title: 'Execution Failed',
        description,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateSimulation = async () => {
    if (!simulation) return;

    setIsGenerating(true);
    try {
      const ai = new DevvAI();
      const historyContext = simulation.history
        .map((h, i) => `${i + 1}. [${h.phase}] ${h.userCommand}\n   Output: ${h.systemResponse.substring(0, 200)}...`)
        .join('\n\n');

      // Detect which phases were actually practiced
      const phasesUsed = new Set(simulation.history.map(h => h.phase));
      const hasRecon = phasesUsed.has('reconnaissance');
      const hasScanning = phasesUsed.has('scanning');
      const hasEnumeration = phasesUsed.has('enumeration');
      const hasExploitation = phasesUsed.has('initial_access');
      const hasPrivesc = phasesUsed.has('privilege_escalation');
      const hasPostExploit = phasesUsed.has('post_exploitation');

      // Build evaluation criteria based on phases practiced
      const evaluationCriteria: string[] = [];
      if (hasRecon) evaluationCriteria.push('- reconScore: reconnaissance quality');
      if (hasScanning) evaluationCriteria.push('- scanningScore: port/service scanning');
      if (hasEnumeration) evaluationCriteria.push('- enumerationScore: service enumeration depth');
      if (hasExploitation) evaluationCriteria.push('- exploitationScore: exploitation strategy');
      if (hasPrivesc) evaluationCriteria.push('- privescScore: privilege escalation');
      evaluationCriteria.push('- methodologyScore: PTES methodology adherence');
      evaluationCriteria.push('- overallScore: average of practiced phases only');
      evaluationCriteria.push('- timeEfficiency: "Excellent" OR "Good" OR "Needs Improvement"');
      evaluationCriteria.push('- feedback: brief evaluation in plain text (no markdown, no special formatting, just sentences)');

      // Build example JSON with only practiced phases
      const exampleScores: Record<string, any> = {};
      if (hasRecon) exampleScores.reconScore = 85;
      if (hasScanning) exampleScores.scanningScore = 80;
      if (hasEnumeration) exampleScores.enumerationScore = 75;
      if (hasExploitation) exampleScores.exploitationScore = 70;
      if (hasPrivesc) exampleScores.privescScore = 65;
      exampleScores.methodologyScore = 80;
      exampleScores.overallScore = 76;
      exampleScores.timeEfficiency = 'Good';
      exampleScores.feedback = 'You did well with reconnaissance and scanning. Missed opportunities: should have enumerated services more thoroughly. Commands to master: nmap -sV, gobuster dir.';

      // Analyze actual achievements for fair scoring
      const credentials = simulation.discoveredInfo.credentials?.length || 0;
      const flags = simulation.discoveredInfo.flags?.length || 0;
      const services = simulation.discoveredInfo.services?.length || 0;
      const directories = simulation.discoveredInfo.directories?.length || 0;
      
      // Check for key achievements that should be credited
      const hasCredentialDiscovery = credentials > 0;
      const hasSSHAccess = simulation.history.some(h => 
        h.userCommand.toLowerCase().includes('ssh') && 
        h.systemResponse.toLowerCase().includes('welcome') || 
        h.systemResponse.toLowerCase().includes('login') ||
        h.systemResponse.toLowerCase().includes('dave@')
      );
      const hasSMBEnumeration = simulation.history.some(h => 
        h.userCommand.toLowerCase().includes('smbclient') || 
        h.userCommand.toLowerCase().includes('smbmap')
      );
      const hasLocalEnumeration = simulation.history.some(h => 
        h.userCommand.toLowerCase().includes('sudo') || 
        h.userCommand.toLowerCase().includes('find') ||
        h.userCommand.toLowerCase().includes('id') ||
        h.userCommand.toLowerCase().includes('whoami')
      );
      const hasPrivescProgress = hasLocalEnumeration && simulation.history.some(h => 
        h.userCommand.toLowerCase().includes('sudo -l') || 
        h.userCommand.toLowerCase().includes('find') && h.userCommand.includes('perm')
      );

      const evaluationPrompt = `You are evaluating a pentest simulation. Respond with VALID JSON ONLY.

SCENARIO: ${simulation.scenario}
COMMANDS: ${simulation.history.length}
FLAGS: ${flags}/2

PHASES PRACTICED: ${Array.from(phasesUsed).join(', ')}

EVIDENCE OF ACHIEVEMENTS:
- Credentials discovered: ${credentials}
- Services enumerated: ${services}
- Directories found: ${directories}
- SSH access achieved: ${hasSSHAccess ? 'YES' : 'NO'}
- SMB enumeration: ${hasSMBEnumeration ? 'YES' : 'NO'}
- Local enumeration: ${hasLocalEnumeration ? 'YES' : 'NO'}
- Privesc discovery: ${hasPrivescProgress ? 'YES' : 'NO'}

CRITICAL SCORING GUIDANCE:
1. Credential Discovery = HIGH SCORE (80-90% for enumeration if credentials found)
2. SSH Key Discovery + SSH Access = INITIAL ACCESS ACHIEVED (75-85% for exploitation)
3. Local Enumeration (sudo -l, id, find) = GOOD PRIVESC PROGRESS (70-80% even without completion)
4. SMB Enumeration = SOLID RECONNAISSANCE (75-85% for recon if SMB used correctly)
5. No nmap at start = MINOR DEDUCTION ONLY (5-10 points max, not devastating)
6. Adaptive workflow = GOOD METHODOLOGY (should not be heavily penalized)

SCORING FAIRNESS:
- If enumeration found ${credentials} credentials → enumerationScore should be 80-90%
- If SSH access achieved → exploitationScore should be 75-85% (credential-based access counts!)
- If local enumeration performed → privescScore should be 70-80% (discovery counts even without completion)
- If SMB enumeration successful → reconScore should be 75-85%
- DO NOT score exploitation as 0% just because no traditional exploit was used
- DO NOT score privesc as 0% if discovery/enumeration was performed

Evaluate scores (0-100 integers only) for ONLY the phases that were practiced:
${evaluationCriteria.join('\n')}

ABSOLUTELY CRITICAL - RESPONSE FORMAT:
${JSON.stringify(exampleScores)}

RULES:
- ONLY include scores for phases that were actually practiced: ${Array.from(phasesUsed).join(', ')}
- DO NOT include scores for phases that were NOT practiced
- If a phase was not practiced, DO NOT include it in the response JSON at all
- feedback MUST be plain text sentences only (NO markdown headers, NO code blocks, NO special characters)
- feedback MUST NOT contain newlines, tabs, or line breaks
- feedback MUST be under 300 characters
- All scores MUST be integers 0-100
- timeEfficiency MUST be exactly "Excellent", "Good", or "Needs Improvement"
- DO NOT add explanatory text before or after the JSON
- Response must be ONLY the JSON object, nothing else`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [{ role: 'user', content: evaluationPrompt }],
      });

      const evaluationText = response.choices[0]?.message?.content || '{}';
      
      // Log first 500 chars of AI response for debugging
      console.log('[DEBUG] AI Evaluation Response (first 500 chars):', evaluationText.substring(0, 500));
      
      // Use parseAIJson directly - it handles extraction and sanitization properly
      const evaluation = parseAIJson(evaluationText);
      
      // Validate required fields
      if (!evaluation.overallScore || !evaluation.feedback) {
        throw new Error('AI response missing required fields (overallScore or feedback)');
      }

      // Set unpracticed phases to null (will be filtered in UI)
      if (!hasRecon) evaluation.reconScore = null;
      if (!hasScanning) evaluation.scanningScore = null;
      if (!hasEnumeration) evaluation.enumerationScore = null;
      if (!hasExploitation) evaluation.exploitationScore = null;
      if (!hasPrivesc) evaluation.privescScore = null;

      decisionStore.completeSimulation(evaluation);

      // Update certification readiness tracking
      await updateCertificationTracking(simulation, evaluation);

      toast({
        title: 'Simulation Completed',
        description: `Overall Score: ${evaluation.overallScore}% | Certification readiness updated`,
      });
    } catch (error) {
      console.error('Evaluation error:', error);
      toast({
        title: 'Evaluation Failed',
        description: 'Failed to evaluate simulation. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updateCertificationTracking = async (
    sim: SimulationState,
    evaluation: NonNullable<SimulationState['evaluation']>
  ) => {
    // Filter out commands with integrity warnings - these shouldn't impact scoring
    const validCommands = sim.history.filter(h => !h.integrityWarning);
    const commandsWithWarnings = sim.history.filter(h => h.integrityWarning);
    
    if (commandsWithWarnings.length > 0) {
      console.log(`[CERTIFICATION TRACKING] Excluding ${commandsWithWarnings.length} commands with integrity warnings from evaluation`);
      commandsWithWarnings.forEach(cmd => {
        console.log(`  - Excluded: ${cmd.userCommand} (ID: ${cmd.executionId})`);
      });
    }
    
    // Extract command data with phases (only valid commands)
    const commands = validCommands.map((h) => ({
      command: h.userCommand,
      phase: h.phase,
      correct: true, // All valid commands in simulation are treated as attempted
    }));

    // Map phases to domains
    const phaseToDomainMap: Record<PentestPhase, CertificationDomain[]> = {
      reconnaissance: ['reconnaissance'],
      scanning: ['reconnaissance', 'enumeration'],
      enumeration: ['enumeration', 'web_exploitation'],
      initial_access: ['web_exploitation', 'network_exploitation'],
      privilege_escalation: ['privilege_escalation', 'lateral_movement'],
      post_exploitation: ['post_exploitation'],
    };

    const domains_practiced = Array.from(
      new Set(
        validCommands.flatMap((h) => phaseToDomainMap[h.phase] || [])
      )
    );

    // Identify missed enumeration steps (only if phase was practiced)
    const missed_steps: string[] = [];
    if (evaluation.enumerationScore !== null && evaluation.enumerationScore !== undefined && evaluation.enumerationScore < 80) {
      missed_steps.push('Incomplete service enumeration detected');
    }
    if (evaluation.reconScore !== null && evaluation.reconScore !== undefined && evaluation.reconScore < 70) {
      missed_steps.push('Additional reconnaissance could have been performed');
    }
    
    // Add note if commands were excluded
    if (commandsWithWarnings.length > 0) {
      missed_steps.push(`${commandsWithWarnings.length} command(s) excluded due to output integrity issues`);
    }

    // Count flags captured
    const flags_captured = sim.discoveredInfo.flags?.length || 0;

    await certStore.updateAfterSimulation({
      difficulty: simulation.difficulty,
      commands,
      evaluation,
      flags_captured,
      hints_used: sim.hintsUsed,
      missed_steps,
      domains_practiced,
      discovered_info: {
        openPorts: sim.discoveredInfo.openPorts || [],
        services: sim.discoveredInfo.services || [],
        directories: sim.discoveredInfo.directories || [],
        credentials: sim.discoveredInfo.credentials || [],
        flags: sim.discoveredInfo.flags || [],
      },
    });
  };

  const handleHintUsed = (level: string, pointsCost: number) => {
    if (!simulation) return;
    decisionStore.updateSimulationState({
      hintsUsed: simulation.hintsUsed + 1,
      pointsDeducted: simulation.pointsDeducted + pointsCost,
    });
  };

  const endSimulation = async () => {
    if (!simulation || simulation.phase !== 'running') return;

    // Confirm before ending
    const confirmed = window.confirm(
      'End this simulation without evaluation? Progress will NOT be saved to history. Use "Finish & Evaluate" to save progress and get feedback.'
    );
    if (!confirmed) return;

    try {
      // Mark simulation as ended in store (idempotent) - does NOT save to database
      decisionStore.endSimulation();

      toast({
        title: 'Simulation Ended',
        description: 'Simulation ended without saving. Start a new one or use "Finish & Evaluate" to save progress.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error ending simulation:', error);
      toast({
        title: 'End Failed',
        description: 'Could not end simulation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const resetSimulation = () => {
    decisionStore.resetSimulation();
    setUserCommand('');
    toast({
      title: 'Simulation Reset',
      description: 'Ready to start a new simulation',
    });
  };

  const processImportedEngagement = async () => {
    if (!importText.trim()) {
      toast({
        title: 'No Content',
        description: 'Please paste your completed engagement commands',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new DevvAI();
      const analysisPrompt = `You are analyzing a COMPLETED penetration testing engagement. The user has already finished the pentest and captured the flags. Your task is to parse their command history and reconstruct the complete engagement.

**USER'S COMPLETED COMMAND HISTORY:**
\`\`\`
${importText}
\`\`\`

**YOUR TASK:**
1. Parse all commands and identify the full attack path
2. Extract ALL discovered intelligence (ports, services, directories, credentials, flags)
3. Identify which pentesting phase each command belongs to
4. Reconstruct the narrative of what happened at each step
5. Identify the final phase reached (should be post_exploitation if both flags captured)

**RESPONSE FORMAT (JSON):**
CRITICAL: Respond with ONLY valid JSON. No markdown blocks, no extra text.
{
  "targetIP": "10.10.10.24",
  "scenario": "Brief summary of the engagement context and what the target was",
  "finalPhase": "post_exploitation",
  "discoveredInfo": {
    "openPorts": ["22", "80", "3306"],
    "services": ["SSH 7.6p1", "Apache 2.4.29", "MySQL 5.7"],
    "directories": ["/admin", "/backup", "/config"],
    "credentials": ["doc_admin:DocAdm1n2023!", "admin:P@ssw0rd123!"],
    "flags": ["THM{u53r5_4nd_b4ckup5_4r3_k3y}", "THM{r00t_v14_b4ckup5cr1pt_3sc4l4t10n}"]
  },
  "history": [
    {
      "userCommand": "nmap -p- 10.10.10.24",
      "phase": "scanning",
      "timestamp": "3:08 PM",
      "summary": "Discovered 3 open ports: 22 (SSH), 80 (HTTP), 3306 (MySQL)"
    }
  ],
  "hintsUsed": 0,
  "pointsDeducted": 0
}

Extract ALL commands from the user's history and reconstruct what happened. Be comprehensive.`;

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [{ role: 'user', content: analysisPrompt }],
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = parseAIJson<any>(content);

      // Validate required fields
      if (!parsed.targetIP || !parsed.discoveredInfo || !parsed.history) {
        throw new Error('AI response missing required fields');
      }

      // Create simulation state from imported engagement using store
      decisionStore.startNewSimulation(
        'beginner', // Default difficulty, can be inferred from analysis
        parsed.scenario || 'Imported completed penetration test engagement',
        parsed.targetIP,
        30 // Default 30 minutes
      );
      
      // Update with full imported state
      decisionStore.updateSimulationState({
        currentPentestPhase: parsed.finalPhase || 'post_exploitation',
        hintsUsed: parsed.hintsUsed || 0,
        pointsDeducted: parsed.pointsDeducted || 0,
        discoveredInfo: {
          openPorts: parsed.discoveredInfo.openPorts || [],
          services: parsed.discoveredInfo.services || [],
          directories: parsed.discoveredInfo.directories || [],
          credentials: parsed.discoveredInfo.credentials || [],
          flags: parsed.discoveredInfo.flags || [],
        },
      });
      
      // Add all commands to history
      parsed.history.forEach((h: any) => {
        decisionStore.addCommandToHistory({
          userCommand: h.userCommand,
          systemResponse: h.summary || 'Command executed successfully',
          timestamp: h.timestamp || new Date().toLocaleTimeString(),
          phase: h.phase || 'enumeration',
        });
      });

      setImportMode(false);
      setImportText('');

      toast({
        title: 'Engagement Imported',
        description: `Imported ${parsed.history.length} commands from completed pentest`,
      });

      // Auto-evaluate the imported engagement
      setTimeout(() => evaluateSimulation(), 1000);
    } catch (error) {
      console.error('Import processing error:', error);
      toast({
        title: 'Import Failed',
        description: 'Failed to process engagement. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = () => {
    if (!simulation || !simulation.evaluation || isExporting) return;
    
    // Prevent rapid repeated clicks
    setIsExporting(true);
    
    try {
      // Use stores from component scope (already initialized at top level)
      // DO NOT call hooks inside event handlers!
      
      // Calculate time spent
      const startTime = new Date(simulation.startedAt).getTime();
      const endTime = simulation.completedAt ? new Date(simulation.completedAt).getTime() : Date.now();
      const timeSpentSeconds = Math.floor((endTime - startTime) / 1000);
      const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);
      const timeSpent = `${timeSpentMinutes} minutes`;
      
      // Infer domains practiced from command phases
      const phasesUsed = new Set(simulation.history.map(h => h.phase));
      const domainsPracticed: CertificationDomain[] = [];
      
      // Map phases to PT1 domains
      if (phasesUsed.has('reconnaissance')) domainsPracticed.push('reconnaissance');
      if (phasesUsed.has('scanning') || phasesUsed.has('enumeration')) {
        domainsPracticed.push('enumeration');
      }
      if (phasesUsed.has('initial_access')) {
        // Could be web or network exploitation depending on services
        const hasWebServices = simulation.discoveredInfo.services?.some(s => 
          s.toLowerCase().includes('http') || s.toLowerCase().includes('web')
        );
        if (hasWebServices) {
          domainsPracticed.push('web_exploitation');
        } else {
          domainsPracticed.push('network_exploitation');
        }
      }
      if (phasesUsed.has('privilege_escalation')) {
        domainsPracticed.push('privilege_escalation');
      }
      if (phasesUsed.has('post_exploitation')) {
        domainsPracticed.push('post_exploitation');
      }
      
      // Determine drill type from scenario and services
      let drillType = 'mixed';
      const scenarioLower = simulation.scenario.toLowerCase();
      if (scenarioLower.includes('active directory') || scenarioLower.includes('kerberos')) {
        drillType = 'ad';
      } else if (scenarioLower.includes('smb') && !scenarioLower.includes('web')) {
        drillType = 'smb';
      } else if (scenarioLower.includes('web') && !scenarioLower.includes('smb')) {
        drillType = 'web';
      }
      
      // Build drill report data
      const reportData: DrillReportData = {
        title: `${simulation.targetIP} - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Engagement`,
        targetIP: simulation.targetIP,
        date: simulation.startedAt,
        timeSpent,
        timeSpentSeconds,
        difficulty,
        drillType: drillType as any,
        scenario: simulation.scenario,
        objectives: [], // TODO: Extract from scenario or history
        discoveredInfo: {
          openPorts: simulation.discoveredInfo.openPorts || [],
          services: simulation.discoveredInfo.services || [],
          directories: simulation.discoveredInfo.directories || [],
          credentials: simulation.discoveredInfo.credentials || [],
          flags: simulation.discoveredInfo.flags || [],
        },
        commands: simulation.history.map(h => ({
          command: h.userCommand,
          phase: h.phase,
          timestamp: h.timestamp,
          output: h.systemResponse,
        })),
        performance: {
          reconScore: simulation.evaluation.reconScore || 0,
          scanningScore: simulation.evaluation.scanningScore || 0,
          enumerationScore: simulation.evaluation.enumerationScore || 0,
          exploitationScore: simulation.evaluation.exploitationScore || 0,
          privescScore: simulation.evaluation.privescScore || 0,
          methodologyScore: simulation.evaluation.methodologyScore || 0,
          overallScore: simulation.evaluation.overallScore || 0,
          timeEfficiency: simulation.evaluation.timeEfficiency,
        },
        strengthsDemonstrated: [
          simulation.discoveredInfo.credentials?.length ? `Credential Discovery (${simulation.discoveredInfo.credentials.length} found)` : null,
          simulation.discoveredInfo.services?.length ? `Service Enumeration (${simulation.discoveredInfo.services.length} enumerated)` : null,
          simulation.discoveredInfo.directories?.length ? `Directory Fuzzing (${simulation.discoveredInfo.directories.length} discovered)` : null,
          simulation.discoveredInfo.flags?.length === 2 ? 'Complete Flag Capture (user + root)' : null,
          simulation.evaluation.reconScore !== null && simulation.evaluation.reconScore >= 80 ? 'Strong Reconnaissance Methodology' : null,
          simulation.evaluation.enumerationScore !== null && simulation.evaluation.enumerationScore >= 80 ? 'Thorough Enumeration' : null,
          simulation.evaluation.exploitationScore !== null && simulation.evaluation.exploitationScore >= 80 ? 'Effective Exploitation' : null,
          simulation.evaluation.privescScore !== null && simulation.evaluation.privescScore >= 80 ? 'Successful Privilege Escalation' : null,
        ].filter(Boolean) as string[],
        focusAreas: [
          simulation.evaluation.reconScore !== null && simulation.evaluation.reconScore < 60 ? 'Improve reconnaissance thoroughness' : null,
          simulation.evaluation.enumerationScore !== null && simulation.evaluation.enumerationScore < 60 ? 'Practice enumeration techniques' : null,
          simulation.evaluation.exploitationScore !== null && simulation.evaluation.exploitationScore < 60 ? 'Study exploitation methodologies' : null,
          simulation.evaluation.privescScore !== null && simulation.evaluation.privescScore < 60 ? 'Master privilege escalation vectors' : null,
          simulation.evaluation.methodologyScore !== null && simulation.evaluation.methodologyScore < 70 ? 'Follow PTES methodology more closely' : null,
        ].filter(Boolean) as string[],
        feedback: simulation.evaluation.feedback,
        certificationReadiness: {
          pt1: {
            weighted_score: certStore.pt1_readiness.weighted_score,
            pass_threshold: certStore.pt1_readiness.pass_threshold,
            status: certStore.pt1_readiness.status,
          },
        },
        hintsUsed: simulation.hintsUsed,
        mistakesIdentified: [],
        domainsPracticed: domainsPracticed as CertificationDomain[],
        technicalSkillsUsed: [],
      };
    
      const markdown = exportDrillReportToMarkdown(reportData);
      const filename = `pentest-${simulation.targetIP}-${Date.now()}.md`;
      downloadMarkdownFile(markdown, filename);
      
      toast({
        title: 'Report Exported',
        description: `${drillType.toUpperCase()} drill report downloaded (${domainsPracticed.length} domains practiced)`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Could not export report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // Re-enable export button after 1 second
      setTimeout(() => setIsExporting(false), 1000);
    }
  };
  
  const importDrillReport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const markdown = await readMarkdownFile(file);
      const reportData = importDrillReportFromMarkdown(markdown);
      
      if (!reportData) {
        toast({
          title: 'Import Failed',
          description: 'Could not parse drill report. Please ensure it\'s a valid SeshForge export.',
          variant: 'destructive',
        });
        return;
      }
      
      // Check for conflicts with existing data
      const certStore = useCertificationStore.getState();
      const existingSimulation = certStore.simulation_history.find(
        s => s.date === reportData.date
      );
      
      if (existingSimulation) {
        const confirmed = window.confirm(
          `A simulation from ${new Date(reportData.date).toLocaleString()} already exists. ` +
          'Import anyway? (This will add to your training history)'
        );
        if (!confirmed) return;
      }
      
      // Restore discovered information and metrics to certification store
      await certStore.updateAfterSimulation({
        difficulty: reportData.difficulty,
        commands: reportData.commands.map(c => ({
          command: c.command,
          phase: c.phase,
          correct: true, // Imported commands assumed completed
        })),
        evaluation: {
          reconScore: reportData.performance.reconScore,
          scanningScore: reportData.performance.scanningScore,
          enumerationScore: reportData.performance.enumerationScore,
          exploitationScore: reportData.performance.exploitationScore,
          privescScore: reportData.performance.privescScore,
          methodologyScore: reportData.performance.methodologyScore,
          overallScore: reportData.performance.overallScore,
        },
        flags_captured: reportData.discoveredInfo.flags.length,
        hints_used: reportData.hintsUsed,
        missed_steps: reportData.mistakesIdentified,
        domains_practiced: reportData.domainsPracticed,
        discovered_info: reportData.discoveredInfo,
      });
      
      // Update progress store with training time
      const progressStore = useProgressStore.getState();
      progressStore.addTrainingHours(reportData.timeSpentSeconds / 3600);
      
      toast({
        title: 'Report Imported Successfully',
        description: `Restored ${reportData.commands.length} commands, ${reportData.discoveredInfo.credentials.length} credentials, ${reportData.discoveredInfo.flags.length} flags. Analytics updated.`,
      });
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to import drill report. Please check the file format.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Decision-Based Pentesting Engine
            </h1>
            <p className="text-muted-foreground">
              Train real-world penetration testing methodology through interactive decision-making simulations
            </p>
          </div>
          <div className="flex gap-2">
            {simulation && (
              <Button onClick={resetSimulation} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                New Simulation
              </Button>
            )}
            {!simulation && (
              <div>
                <input
                  type="file"
                  accept=".md"
                  onChange={importDrillReport}
                  className="hidden"
                  id="import-drill-report"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('import-drill-report')?.click()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Import Drill Report
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Import Mode Dialog */}
        {!simulation && importMode && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Import Completed Engagement
              </CardTitle>
              <CardDescription>
                Paste your completed penetration test command history below. The AI will parse your commands, extract discovered intelligence, and generate a comprehensive evaluation report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Command History</label>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Paste your full command history here, including:
- All commands you executed (nmap, gobuster, ssh, etc.)
- Tool outputs and discovered information
- Flags you captured
- Any other relevant details

Example:
$ nmap -p- 10.10.10.24
Discovered ports: 22, 80, 3306

$ gobuster dir -u http://10.10.10.24 -w wordlist.txt
Found: /admin, /backup, /config

$ cat /config/database.php
DB_USER: doc_admin
DB_PASS: DocAdm1n2023!

... (continue with all your commands)`}
                  className="min-h-[400px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Include as much detail as possible. The AI will analyze your methodology and generate scores across all pentesting phases.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={processImportedEngagement} disabled={!importText.trim() || isGenerating} className="flex-1">
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing Engagement...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-5 w-5" />
                      Analyze & Evaluate
                    </>
                  )}
                </Button>
                <Button onClick={() => setImportMode(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Phase */}
        {!simulation && !importMode && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Configure Simulation
              </CardTitle>
              <CardDescription>
                Select difficulty level and start a realistic penetration testing engagement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty Level</label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">{difficultyDescriptions[difficulty]}</p>
                </div>

                {/* ✅ PHASE 31C: Domain Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Training Domain</label>
                  <Select value={selectedDomain} onValueChange={(v) => setSelectedDomain(v as ScenarioType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">🌐 Web Application Testing</SelectItem>
                      <SelectItem value="ad">🔐 Active Directory</SelectItem>
                      <SelectItem value="smb">📁 SMB / Network Shares</SelectItem>
                      <SelectItem value="internal">🏢 Internal Services</SelectItem>
                      <SelectItem value="linux">🐧 Linux Exploitation</SelectItem>
                      <SelectItem value="windows">🪟 Windows Exploitation</SelectItem>
                      <SelectItem value="mixed">🔄 Mixed Environment</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {selectedDomain === 'web' && 'OWASP Top 10, SQLi, XSS, Authentication, File Upload vulnerabilities'}
                    {selectedDomain === 'ad' && 'Kerberoasting, AS-REP Roasting, LDAP enumeration, Lateral Movement'}
                    {selectedDomain === 'smb' && 'SMB enumeration, Anonymous access, Credential discovery, Share exploitation'}
                    {selectedDomain === 'internal' && 'RPC, WinRM, MSSQL, Service exploitation, Credential reuse'}
                    {selectedDomain === 'linux' && 'SSH, Web services, SUID/sudo, Kernel exploits, Cronjob abuse'}
                    {selectedDomain === 'windows' && 'IIS, SMB, RDP, WinRM, Token abuse, Weak services'}
                    {selectedDomain === 'mixed' && 'Hybrid Windows/Linux environment with multiple attack vectors'}
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Penetration Testing Methodology
                  </h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {(Object.entries(phaseDescriptions) as [PentestPhase, string][]).map(([phase, desc]) => (
                      <li key={phase}>
                        <span className="font-medium text-foreground capitalize">{phase.replace('_', ' ')}:</span> {desc}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="professional-report-mode"
                        checked={professionalReportMode}
                        onChange={(e) => setProfessionalReportMode(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <label htmlFor="professional-report-mode" className="font-semibold">
                        Enable Professional Report Mode
                      </label>
                    </div>
                  </div>
                  
                  {professionalReportMode && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Timer Duration</label>
                        <Select value={String(timerDuration)} onValueChange={(v) => setTimerDuration(Number(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 minutes</SelectItem>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="20">20 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Live report editor with auto-save</p>
                        <p>• Timer countdown with alerts</p>
                        <p>• Markdown export on completion</p>
                        <p>• Reporting skill tracked for readiness</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={startSimulation} disabled={isGenerating} size="lg" className="flex-1">
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating Scenario...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-5 w-5" />
                      Start Interactive Simulation
                    </>
                  )}
                </Button>
                <Button onClick={() => setImportMode(true)} variant="outline" size="lg" className="flex-1">
                  <Download className="mr-2 h-5 w-5" />
                  Import Completed Engagement
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Running Simulation */}
        {simulation && simulation.phase === 'running' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Terminal */}
            <div className="lg:col-span-2 space-y-4">
              {/* Scenario Card */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Engagement Briefing
                  </CardTitle>
                  <CardDescription className="mt-2">
                    <div className="flex items-center gap-2 text-base font-semibold">
                      <Target className="h-5 w-5 text-primary" />
                      <span className="text-foreground">Target IP:</span>
                      <code className="bg-primary/10 text-primary px-3 py-1 rounded font-mono text-base">
                        {simulation.targetIP}
                      </code>
                    </div>
                  </CardDescription>
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
                      {simulation.scenario}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              {/* Command History */}
              {simulation.history.length > 0 && (
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Command History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                    {simulation.history.map((entry, idx) => (
                      <div key={idx} className="space-y-2 pb-4 border-b border-border last:border-0">
                        <div className="flex items-center justify-between">
                          <code className="text-sm bg-muted px-2 py-1 rounded">$ {entry.userCommand}</code>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {entry.phase.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                            {entry.executionId && (
                              <span className="text-xs text-muted-foreground font-mono">ID: {entry.executionId.slice(-6)}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Integrity Warning */}
                        {entry.integrityWarning && (
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2">
                            <div className="flex items-start gap-2">
                              <Activity className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 space-y-1">
                                <p className="text-xs font-medium text-orange-500">Output Integrity Warning</p>
                                <p className="text-xs text-muted-foreground">
                                  This output may be stale or reused from a previous command. The response might not match what you executed.
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-1 h-7 text-xs"
                                  onClick={() => {
                                    const issue = `Command: ${entry.userCommand}\nExecution ID: ${entry.executionId || 'unknown'}\nTimestamp: ${entry.timestamp}\nIssue: Output desynchronization - response does not match executed command`;
                                    navigator.clipboard.writeText(issue);
                                    toast({
                                      title: 'Mismatch Reported',
                                      description: 'Issue details copied to clipboard. Please share with support.',
                                    });
                                  }}
                                >
                                  Report Output Mismatch
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Parse and display structured response */}
                        {(() => {
                          const response = entry.systemResponse;
                          
                          // Extract sections from formatted response
                          const toolOutputMatch = response.match(/===\s*TOOL OUTPUT\s*===\s*([\s\S]*?)(?====\s*MENTOR GUIDANCE\s*===|$)/i);
                          const mentorGuidanceMatch = response.match(/===\s*MENTOR GUIDANCE\s*===\s*([\s\S]*?)(?====\s*TECHNICAL DATA\s*===|$)/i);
                          
                          const toolOutput = toolOutputMatch ? toolOutputMatch[1].trim() : '';
                          const mentorGuidance = mentorGuidanceMatch ? mentorGuidanceMatch[1].trim() : '';
                          
                          // If structured format not found, display as-is (backward compatibility)
                          if (!toolOutput && !mentorGuidance) {
                            return (
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
                                  {response}
                                </pre>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="space-y-3">
                              {/* Tool Output Section */}
                              {toolOutput && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Terminal className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Command Output</span>
                                  </div>
                                  <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                                    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
                                      {toolOutput}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              
                              {/* Mentor Guidance Section */}
                              {mentorGuidance && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-amber-500" />
                                    <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">AI Mentor Guidance</span>
                                  </div>
                                  <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-lg">
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
                                              <code className="bg-muted/50 px-1 py-0.5 rounded text-xs" {...props}>
                                                {children}
                                              </code>
                                            );
                                          },
                                        }}
                                      >
                                        {mentorGuidance}
                                      </ReactMarkdown>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Command Input */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Execute Command
                  </CardTitle>
                  <CardDescription>Enter your next pentesting command</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <TerminalCommandInput
                      value={userCommand}
                      onChange={setUserCommand}
                      onSubmit={executeCommand}
                      placeholder={`$ your-command-here`}
                      disabled={isGenerating}
                      expectedContext={`Current phase: ${simulation.currentPentestPhase}`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Max 500 characters recommended</span>
                      <span className={userCommand.length > 500 ? 'text-destructive' : ''}>
                        {userCommand.length} / 500
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={executeCommand} disabled={!userCommand.trim() || isGenerating} className="flex-1">
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Terminal className="mr-2 h-4 w-4" />
                          Execute
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* ✅ PHASE 31C: Manual session control - End Session is now the primary way to finish */}
                  <div className="flex gap-2 mt-2">
                    <Button onClick={evaluateSimulation} disabled={isGenerating} variant="default" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      End Session & Evaluate
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    💡 Session continues even after all flags found - click "End Session" when you're ready to finalize
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Current Phase & Timer */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Current Phase</span>
                    <SimulationTimer startTime={simulation.startedAt} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="w-full justify-center py-2 text-center">
                    {simulation.currentPentestPhase.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {phaseDescriptions[simulation.currentPentestPhase]}
                  </p>
                </CardContent>
              </Card>

              {/* Discovered Info */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-sm">Intel Gathered</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Open Ports</p>
                    <p className="text-sm">{simulation.discoveredInfo.openPorts?.join(', ') || 'None yet'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Services</p>
                    <p className="text-sm">{simulation.discoveredInfo.services?.join(', ') || 'None yet'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Directories</p>
                    <p className="text-sm">{simulation.discoveredInfo.directories?.join(', ') || 'None yet'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Credentials</p>
                    <p className="text-sm">{simulation.discoveredInfo.credentials?.join(', ') || 'None yet'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Flags Captured</p>
                    {simulation.discoveredInfo.flags && simulation.discoveredInfo.flags.length > 0 ? (
                      <div className="space-y-1">
                        <Badge variant="default" className="mb-1">
                          {simulation.discoveredInfo.flags.length} / 2
                        </Badge>
                        <div className="space-y-0.5">
                          {simulation.discoveredInfo.flags.map((flag, idx) => (
                            <p key={idx} className="text-xs font-mono bg-muted p-1 rounded">
                              {flag}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="secondary">0 / 2</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Hint System */}
              <MethodologyHintSystem
                scenarioContext={simulation.scenario}
                currentPhase={simulation.currentPentestPhase}
                recentCommands={simulation.history.map(h => h.userCommand)}
                onHintUsed={handleHintUsed}
                hintsUsed={simulation.hintsUsed}
              />

              {/* Finding Coach - Report Tips */}
              {simulation.findings && simulation.findings.length > 0 && (
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-green-500" />
                      <span>Report Tips</span>
                      <Badge variant="outline" className="ml-auto">{simulation.findings.length}</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Confirmed vulnerabilities with reporting guidance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {simulation.findings.map((finding, idx) => (
                      <details key={finding.id} className="group">
                        <summary className="cursor-pointer list-none p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-xs font-medium">Finding {finding.index}:</span>
                              <span className="text-xs truncate">{finding.title}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <Badge 
                                variant={
                                  finding.severity === 'Critical' ? 'destructive' : 
                                  finding.severity === 'High' ? 'destructive' : 
                                  finding.severity === 'Medium' ? 'default' : 
                                  'secondary'
                                }
                                className="text-xs"
                              >
                                {finding.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground group-open:rotate-90 transition-transform">▶</span>
                            </div>
                          </div>
                        </summary>
                        <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border">
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
                                      customStyle={{ fontSize: '0.75rem' }}
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className="bg-muted/50 px-1 py-0.5 rounded text-xs" {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {finding.markdown}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </details>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-sm">Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commands:</span>
                    <span className="font-medium">{simulation.history.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hints Used:</span>
                    <span className="font-medium">{simulation.hintsUsed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Points Deducted:</span>
                    <span className="font-medium text-destructive">-{simulation.pointsDeducted}</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Professional Report Editor */}
              {professionalReportMode && (
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Professional Report</span>
                      {timerRemaining > 0 && (
                        <Badge variant={timerRemaining < 300 ? 'destructive' : 'secondary'}>
                          {Math.floor(timerRemaining / 60)}:{String(timerRemaining % 60).padStart(2, '0')}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={reportDraft}
                      onChange={(e) => setReportDraft(e.target.value)}
                      placeholder="# Professional Drill Report..."
                      className="h-64 font-mono text-xs resize-none"
                    />
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {reportDraft.length} chars | Auto-saved
                      </span>
                      <Badge variant={reportDraft.length >= 300 ? 'default' : 'outline'}>
                        {reportDraft.length >= 300 ? '✓ Complete' : 'Min 300'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Evaluation Results */}
        {simulation && simulation.phase === 'completed' && simulation.evaluation && (
          <div className="space-y-6">
            {/* Score Cards - Only show phases that were practiced */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {simulation.evaluation.reconScore !== null && simulation.evaluation.reconScore !== undefined && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Reconnaissance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{simulation.evaluation.reconScore}%</p>
                  </CardContent>
                </Card>
              )}
              {simulation.evaluation.scanningScore !== null && simulation.evaluation.scanningScore !== undefined && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Scanning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{simulation.evaluation.scanningScore}%</p>
                  </CardContent>
                </Card>
              )}
              {simulation.evaluation.enumerationScore !== null && simulation.evaluation.enumerationScore !== undefined && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Enumeration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{simulation.evaluation.enumerationScore}%</p>
                  </CardContent>
                </Card>
              )}
              {simulation.evaluation.exploitationScore !== null && simulation.evaluation.exploitationScore !== undefined && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Exploitation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{simulation.evaluation.exploitationScore}%</p>
                  </CardContent>
                </Card>
              )}
              {simulation.evaluation.privescScore !== null && simulation.evaluation.privescScore !== undefined && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Privesc</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{simulation.evaluation.privescScore}%</p>
                  </CardContent>
                </Card>
              )}
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Methodology</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{simulation.evaluation.methodologyScore}%</p>
                </CardContent>
              </Card>
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Time Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className="text-sm">{simulation.evaluation.timeEfficiency}</Badge>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-gradient-to-br from-primary/20 to-purple-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Overall Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{simulation.evaluation.overallScore}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Feedback */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Detailed Evaluation & Learning Report
                </CardTitle>
                <CardDescription>
                  Comprehensive analysis of your penetration testing methodology
                </CardDescription>
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
                    {simulation.evaluation.feedback}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Certification Readiness Tracking */}
            {(() => {
              // Calculate drill scope for domain-aware readiness display
              const phasesUsed = new Set(simulation.history.map(h => h.phase));
              const domainsPracticed: string[] = [];
              const sectionsPracticed: string[] = [];
              
              // Map phases to domains
              if (phasesUsed.has('reconnaissance')) domainsPracticed.push('reconnaissance');
              if (phasesUsed.has('scanning') || phasesUsed.has('enumeration')) {
                domainsPracticed.push('enumeration');
              }
              if (phasesUsed.has('initial_access')) {
                const hasWebServices = simulation.discoveredInfo.services?.some(s => 
                  s.toLowerCase().includes('http') || s.toLowerCase().includes('web')
                );
                domainsPracticed.push(hasWebServices ? 'web_exploitation' : 'network_exploitation');
              }
              if (phasesUsed.has('privilege_escalation')) {
                domainsPracticed.push('privilege_escalation');
              }
              if (phasesUsed.has('post_exploitation')) {
                domainsPracticed.push('post_exploitation');
              }
              
              // Map domains to PT1 sections
              const domainToSectionMap: Record<string, string> = {
                reconnaissance: 'network_security_testing',
                enumeration: 'network_security_testing',
                web_exploitation: 'web_application_testing',
                privilege_escalation: 'network_security_testing',
                lateral_movement: 'active_directory_testing',
                password_attacks: 'active_directory_testing',
                network_exploitation: 'network_security_testing',
                post_exploitation: 'active_directory_testing',
              };
              
              domainsPracticed.forEach(domain => {
                const section = domainToSectionMap[domain];
                if (section && !sectionsPracticed.includes(section)) {
                  sectionsPracticed.push(section);
                }
              });
              
              // Determine drill type
              let drillType: 'web' | 'ad' | 'smb' | 'mixed' | 'internal' | 'linux' | 'windows' = 'mixed';
              const scenarioLower = simulation.scenario.toLowerCase();
              if (scenarioLower.includes('active directory') || scenarioLower.includes('kerberos')) {
                drillType = 'ad';
              } else if (scenarioLower.includes('smb') && !scenarioLower.includes('web')) {
                drillType = 'smb';
              } else if (scenarioLower.includes('web') && !scenarioLower.includes('smb')) {
                drillType = 'web';
              } else if (scenarioLower.includes('internal')) {
                drillType = 'internal';
              } else if (scenarioLower.includes('linux')) {
                drillType = 'linux';
              } else if (scenarioLower.includes('windows')) {
                drillType = 'windows';
              }
              
              return (
                <CertificationReadinessMeter 
                  drillScope={{
                    drillType,
                    domainsPracticed,
                    sectionsPracticed,
                  }}
                />
              );
            })()}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={exportReport} size="lg" disabled={isExporting}>
                <Download className="mr-2 h-5 w-5" />
                Export Report (Markdown)
              </Button>
              <Button onClick={resetSimulation} variant="outline" size="lg">
                <RotateCcw className="mr-2 h-5 w-5" />
                New Simulation
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
