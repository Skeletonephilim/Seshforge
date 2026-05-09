/**
 * PT1 Exam Analytics & Methodology Engine
 * 
 * CRITICAL: This runs AFTER exam completion (success OR failure)
 * BEFORE environment reset / new scenario generation
 * 
 * Purpose:
 * - Evaluate methodology (not just success/failure)
 * - Detect weaknesses in thinking patterns
 * - Provide actionable improvements
 * - Feed into long-term readiness scoring
 */

import { DevvAI } from '@devvai/devv-code-backend';
import { parseAIJson } from './utils';
import type { CommandEntry, ExamSession, ExamScenario } from '@/store/exam-session-store';

// ============================================================================
// Types
// ============================================================================

export interface PhaseAnalysis {
  phase: 'reconnaissance' | 'enumeration' | 'exploitation' | 'privilege_escalation' | 'post_exploitation';
  score: number; // 0-100
  whatWasDone: string[];
  whatWasMissed: string[];
  criticalMistake: string | null;
}

export interface EnumerationDepthAnalysis {
  score: number; // 0-100
  missedOpportunities: string[];
  stoppedAtFirstFinding: boolean;
  exploredMultipleAttackSurfaces: boolean;
  validatedAssumptions: boolean;
}

export interface ToolUsageAnalysis {
  toolsUsed: string[];
  diversity: number; // 0-100
  overReliance: {
    detected: boolean;
    tool?: string;
    reason?: string;
  };
  manualVsAutomatedBalance: 'good' | 'too_automated' | 'too_manual';
  singleToolDependency: boolean;
  automationWithoutUnderstanding: boolean;
}

export interface DecisionMakingAnalysis {
  score: number; // 0-100
  actionsLogical: boolean;
  randomBruteForce: boolean;
  pivotsCorrectly: boolean;
  keyDecisionTurningPoint: string | null;
}

export interface TimeEfficiencyAnalysis {
  score: number; // 0-100
  timeToFoothold: number | null; // minutes
  timeToPrivesc: number | null; // minutes
  timeWastedOnDeadEnds: number; // minutes
  timeSinks: string[];
}

export interface MistakeDetection {
  skippedEnumeration: string[];
  wrongAssumptions: string[];
  ignoredClues: string[];
  tunnelVision: string[];
}

export interface AntiPatternDetection {
  patternBasedHacking: boolean;
  shallowEnumeration: boolean;
  toolReliance: boolean;
  lackOfValidation: boolean;
}

export interface PT1ReadinessScore {
  overall: number; // 0-100
  categoryBreakdown: {
    enumeration: number;
    exploitation: number;
    privesc: number;
    methodology: number;
  };
  level: 'beginner' | 'intermediate' | 'pt1_ready' | 'above_pt1';
}

export interface ExamAnalyticsReport {
  // Overall
  overallScore: number;
  level: 'beginner' | 'intermediate' | 'pt1_ready' | 'above_pt1';
  
  // Detailed analysis
  methodologyBreakdown: PhaseAnalysis[];
  enumerationDepth: EnumerationDepthAnalysis;
  toolUsage: ToolUsageAnalysis;
  decisionMaking: DecisionMakingAnalysis;
  timeEfficiency: TimeEfficiencyAnalysis;
  
  // Issues
  criticalMistakes: string[];
  mistakes: MistakeDetection;
  antiPatterns: AntiPatternDetection;
  
  // Scoring
  pt1Readiness: PT1ReadinessScore;
  
  // Recommendations
  top3Improvements: string[];
  nextTrainingRecommendation: {
    boxType: 'web' | 'ad' | 'mixed' | 'linux' | 'network';
    skillToFocus: string;
    specificWeakness: string;
  };
  
  // Metadata
  examDuration: number; // minutes
  flagsCaptured: number;
  hintsUsed: number;
  commandsExecuted: number;
  generatedAt: string;
}

// ============================================================================
// Main Analysis Function
// ============================================================================

export async function generateExamAnalytics(
  session: ExamSession,
  scenario: ExamScenario,
  success: boolean
): Promise<ExamAnalyticsReport> {
  console.log('[ExamAnalytics] Starting comprehensive analysis...');
  
  // Prepare command history context
  const commandsContext = session.commandHistory
    .map((cmd, idx) => `${idx + 1}. ${cmd.command}\n   Output: ${cmd.output.substring(0, 200)}...`)
    .join('\n\n');
  
  const examDuration = Math.floor(session.elapsedSeconds / 60);
  
  // Build comprehensive AI prompt
  const analysisPrompt = `You are an advanced penetration testing evaluator analyzing a PT1 exam session.

**EXAM CONTEXT:**
- Target: ${scenario.targetIP}
- Difficulty: ${scenario.difficulty}
- Duration: ${examDuration} minutes
- Commands Executed: ${session.commandHistory.length}
- Flags Captured: ${session.flagsFound}
- Hints Used: ${session.hintsUsed}
- Success: ${success ? 'YES' : 'NO'}

**COMMAND HISTORY:**
${commandsContext}

**SERVICES DISCOVERED:**
${scenario.openPorts?.join('\n') || 'Unknown'}

**SCENARIO DESCRIPTION:**
${scenario.description}

---

**YOUR TASK:**
Analyze this exam session and generate a comprehensive analytics report.

**CRITICAL EVALUATION AXES:**

1. **METHODOLOGY PHASES** (evaluate each):
   - Reconnaissance
   - Enumeration
   - Exploitation
   - Privilege Escalation
   - Post-Exploitation
   
   For each phase:
   - Score (0-100)
   - What was done (list actions)
   - What was missed (list opportunities)
   - Critical mistake (if any)

2. **ENUMERATION DEPTH** (CRITICAL):
   - Did user stop at first finding?
   - Did they explore multiple attack surfaces?
   - Did they validate assumptions?
   - Depth Score (0-100)
   - Missed opportunities

3. **TOOL USAGE**:
   - Tools used (list)
   - Tool diversity score (0-100)
   - Over-reliance detected? (tool name + reason)
   - Manual vs automated balance (good/too_automated/too_manual)
   - Single-tool dependency? (yes/no)
   - Automation without understanding? (yes/no)

4. **DECISION-MAKING QUALITY**:
   - Were actions logical? (yes/no)
   - Random/brute-force driven? (yes/no)
   - Pivoted correctly after failure? (yes/no)
   - Decision Score (0-100)
   - Key decision turning point (describe)

5. **TIME EFFICIENCY**:
   - Time to foothold (minutes, null if none)
   - Time to privesc (minutes, null if none)
   - Time wasted on dead ends (minutes)
   - Efficiency Score (0-100)
   - Time sinks (list specific activities)

6. **MISTAKE DETECTION**:
   - Skipped enumeration (list)
   - Wrong assumptions (list)
   - Ignored clues (list)
   - Tunnel vision (list)

7. **ANTI-PATTERN DETECTION**:
   - Pattern-based hacking (yes/no)
   - Shallow enumeration (yes/no)
   - Tool reliance (yes/no)
   - Lack of validation (yes/no)

8. **PT1 READINESS SCORING**:
   - Overall score (0-100)
   - Enumeration (0-100)
   - Exploitation (0-100)
   - PrivEsc (0-100)
   - Methodology (0-100)
   - Level (beginner/intermediate/pt1_ready/above_pt1)

9. **TOP 3 IMPROVEMENTS** (ONLY 3, highest impact):
   1. [most critical improvement]
   2. [second most critical]
   3. [third most critical]

10. **NEXT TRAINING RECOMMENDATION**:
    - Box type (web/ad/mixed/linux/network)
    - Skill to focus on
    - Specific weakness to fix

---

**CRITICAL RULES:**

❌ FORBIDDEN MISTAKES TO IDENTIFY:
- /backup directory reliance
- admin:admin credential guessing
- Single-tool solutions (only gobuster, only sqlmap, only metasploit)
- Stopping after first success
- Not testing credential reuse
- Skipping manual enumeration

✅ METHODOLOGY QUALITY INDICATORS:
- Multi-stage attack chains
- Hypothesis testing
- Validation of findings
- Tool chaining + reasoning
- Internal enumeration after initial access
- Systematic privesc enumeration

⚠️ BE BRUTALLY HONEST:
- If user succeeded but used bad methodology → score MUST reflect that
- Success ≠ competence
- Focus on methodology, not ego
- Highlight growth trajectory

---

**OUTPUT FORMAT (STRICT JSON):**

{
  "overallScore": 0-100,
  "level": "beginner" | "intermediate" | "pt1_ready" | "above_pt1",
  
  "methodologyBreakdown": [
    {
      "phase": "reconnaissance",
      "score": 0-100,
      "whatWasDone": ["action1", "action2"],
      "whatWasMissed": ["missed1", "missed2"],
      "criticalMistake": "mistake description or null"
    }
    // ... repeat for all 5 phases
  ],
  
  "enumerationDepth": {
    "score": 0-100,
    "missedOpportunities": ["opp1", "opp2"],
    "stoppedAtFirstFinding": true/false,
    "exploredMultipleAttackSurfaces": true/false,
    "validatedAssumptions": true/false
  },
  
  "toolUsage": {
    "toolsUsed": ["tool1", "tool2"],
    "diversity": 0-100,
    "overReliance": {
      "detected": true/false,
      "tool": "tool name or null",
      "reason": "reason or null"
    },
    "manualVsAutomatedBalance": "good" | "too_automated" | "too_manual",
    "singleToolDependency": true/false,
    "automationWithoutUnderstanding": true/false
  },
  
  "decisionMaking": {
    "score": 0-100,
    "actionsLogical": true/false,
    "randomBruteForce": true/false,
    "pivotsCorrectly": true/false,
    "keyDecisionTurningPoint": "description or null"
  },
  
  "timeEfficiency": {
    "score": 0-100,
    "timeToFoothold": minutes or null,
    "timeToPrivesc": minutes or null,
    "timeWastedOnDeadEnds": minutes,
    "timeSinks": ["sink1", "sink2"]
  },
  
  "criticalMistakes": ["mistake1", "mistake2"],
  
  "mistakes": {
    "skippedEnumeration": ["item1"],
    "wrongAssumptions": ["assumption1"],
    "ignoredClues": ["clue1"],
    "tunnelVision": ["example1"]
  },
  
  "antiPatterns": {
    "patternBasedHacking": true/false,
    "shallowEnumeration": true/false,
    "toolReliance": true/false,
    "lackOfValidation": true/false
  },
  
  "pt1Readiness": {
    "overall": 0-100,
    "categoryBreakdown": {
      "enumeration": 0-100,
      "exploitation": 0-100,
      "privesc": 0-100,
      "methodology": 0-100
    },
    "level": "beginner" | "intermediate" | "pt1_ready" | "above_pt1"
  },
  
  "top3Improvements": [
    "improvement 1",
    "improvement 2",
    "improvement 3"
  ],
  
  "nextTrainingRecommendation": {
    "boxType": "web" | "ad" | "mixed" | "linux" | "network",
    "skillToFocus": "skill name",
    "specificWeakness": "weakness description"
  }
}

RESPOND WITH ONLY VALID JSON. No markdown, no explanation, no extra text.`;

  try {
    const ai = new DevvAI();
    
    const response = await ai.chat.completions.create({
      model: 'kimi-k2-0711-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert penetration testing evaluator. Respond ONLY with valid JSON.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 3000,
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    console.log('[ExamAnalytics] AI response received:', content.substring(0, 200));
    
    // Parse AI response
    const analysis = parseAIJson(content) as Partial<ExamAnalyticsReport>;
    
    // Build complete report with fallbacks
    const report: ExamAnalyticsReport = {
      overallScore: analysis.overallScore || 0,
      level: analysis.level || 'beginner',
      methodologyBreakdown: analysis.methodologyBreakdown || [],
      enumerationDepth: analysis.enumerationDepth || {
        score: 0,
        missedOpportunities: [],
        stoppedAtFirstFinding: false,
        exploredMultipleAttackSurfaces: false,
        validatedAssumptions: false
      },
      toolUsage: analysis.toolUsage || {
        toolsUsed: [],
        diversity: 0,
        overReliance: { detected: false },
        manualVsAutomatedBalance: 'good',
        singleToolDependency: false,
        automationWithoutUnderstanding: false
      },
      decisionMaking: analysis.decisionMaking || {
        score: 0,
        actionsLogical: false,
        randomBruteForce: false,
        pivotsCorrectly: false,
        keyDecisionTurningPoint: null
      },
      timeEfficiency: analysis.timeEfficiency || {
        score: 0,
        timeToFoothold: null,
        timeToPrivesc: null,
        timeWastedOnDeadEnds: 0,
        timeSinks: []
      },
      criticalMistakes: analysis.criticalMistakes || [],
      mistakes: analysis.mistakes || {
        skippedEnumeration: [],
        wrongAssumptions: [],
        ignoredClues: [],
        tunnelVision: []
      },
      antiPatterns: analysis.antiPatterns || {
        patternBasedHacking: false,
        shallowEnumeration: false,
        toolReliance: false,
        lackOfValidation: false
      },
      pt1Readiness: analysis.pt1Readiness || {
        overall: 0,
        categoryBreakdown: {
          enumeration: 0,
          exploitation: 0,
          privesc: 0,
          methodology: 0
        },
        level: 'beginner'
      },
      top3Improvements: analysis.top3Improvements || [],
      nextTrainingRecommendation: analysis.nextTrainingRecommendation || {
        boxType: 'web',
        skillToFocus: 'enumeration',
        specificWeakness: 'shallow enumeration'
      },
      
      // Metadata
      examDuration,
      flagsCaptured: session.flagsFound,
      hintsUsed: session.hintsUsed,
      commandsExecuted: session.commandHistory.length,
      generatedAt: new Date().toISOString()
    };
    
    console.log('[ExamAnalytics] Analysis complete:', {
      overallScore: report.overallScore,
      level: report.level,
      pt1Readiness: report.pt1Readiness.overall
    });
    
    return report;
    
  } catch (error) {
    console.error('[ExamAnalytics] Analysis generation failed:', error);
    
    // Return fallback report
    return createFallbackReport(session, scenario, success, examDuration);
  }
}

// ============================================================================
// Fallback Report Generator
// ============================================================================

function createFallbackReport(
  session: ExamSession,
  scenario: ExamScenario,
  success: boolean,
  examDuration: number
): ExamAnalyticsReport {
  const commandCount = session.commandHistory.length;
  const flagCount = session.flagsFound;
  
  // Simple heuristic scoring
  let overallScore = 0;
  if (success && flagCount >= 2) overallScore = 70;
  else if (success && flagCount === 1) overallScore = 50;
  else if (commandCount > 10) overallScore = 30;
  else overallScore = 15;
  
  return {
    overallScore,
    level: overallScore >= 70 ? 'pt1_ready' : overallScore >= 50 ? 'intermediate' : 'beginner',
    methodologyBreakdown: [],
    enumerationDepth: {
      score: Math.min(commandCount * 5, 100),
      missedOpportunities: [],
      stoppedAtFirstFinding: commandCount < 10,
      exploredMultipleAttackSurfaces: commandCount >= 15,
      validatedAssumptions: false
    },
    toolUsage: {
      toolsUsed: extractToolsFromCommands(session.commandHistory),
      diversity: 50,
      overReliance: { detected: false },
      manualVsAutomatedBalance: 'good',
      singleToolDependency: false,
      automationWithoutUnderstanding: false
    },
    decisionMaking: {
      score: overallScore,
      actionsLogical: true,
      randomBruteForce: false,
      pivotsCorrectly: success,
      keyDecisionTurningPoint: null
    },
    timeEfficiency: {
      score: examDuration < 60 ? 80 : 50,
      timeToFoothold: null,
      timeToPrivesc: null,
      timeWastedOnDeadEnds: 0,
      timeSinks: []
    },
    criticalMistakes: success ? [] : ['Failed to capture flags - review methodology'],
    mistakes: {
      skippedEnumeration: [],
      wrongAssumptions: [],
      ignoredClues: [],
      tunnelVision: []
    },
    antiPatterns: {
      patternBasedHacking: false,
      shallowEnumeration: commandCount < 10,
      toolReliance: false,
      lackOfValidation: false
    },
    pt1Readiness: {
      overall: overallScore,
      categoryBreakdown: {
        enumeration: Math.min(commandCount * 5, 100),
        exploitation: flagCount > 0 ? 60 : 30,
        privesc: flagCount >= 2 ? 70 : 30,
        methodology: overallScore
      },
      level: overallScore >= 70 ? 'pt1_ready' : overallScore >= 50 ? 'intermediate' : 'beginner'
    },
    top3Improvements: [
      'Complete comprehensive enumeration before exploitation',
      'Test discovered credentials across all services',
      'Document findings systematically'
    ],
    nextTrainingRecommendation: {
      boxType: 'web',
      skillToFocus: 'enumeration depth',
      specificWeakness: 'thorough service enumeration'
    },
    examDuration,
    flagsCaptured: flagCount,
    hintsUsed: session.hintsUsed,
    commandsExecuted: commandCount,
    generatedAt: new Date().toISOString()
  };
}

function extractToolsFromCommands(commands: CommandEntry[]): string[] {
  const tools = new Set<string>();
  const toolPatterns = ['nmap', 'gobuster', 'nikto', 'sqlmap', 'hydra', 'burpsuite', 'metasploit', 'linpeas', 'ssh', 'ftp', 'smbclient', 'enum4linux', 'ffuf', 'feroxbuster'];
  
  commands.forEach(cmd => {
    const command = cmd.command.toLowerCase();
    toolPatterns.forEach(tool => {
      if (command.includes(tool)) {
        tools.add(tool);
      }
    });
  });
  
  return Array.from(tools);
}
