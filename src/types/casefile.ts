/**
 * Casefile Mode - Complete Type System
 * 
 * Offline investigation engine with artifact-driven micro-boxes
 * Teaching mechanics, methodology, and reporting through realistic engagement fragments
 */

// ============================================
// CORE CASEFILE SCHEMA
// ============================================

export type CasefileDifficulty = 'easy' | 'medium' | 'hard';
export type CasefileCategory = 'web' | 'linux' | 'windows' | 'ad' | 'mixed' | 'enumeration' | 'reporting';
export type MethodologyStage = 'reconnaissance' | 'enumeration' | 'analysis' | 'exploitation' | 'privilege_escalation' | 'reporting';
export type ArtifactType = 'text' | 'code' | 'log' | 'db' | 'pcap' | 'screenshot' | 'json' | 'csv';

export interface CasefileArtifact {
  path: string; // e.g., /evidence/nmap.txt
  type: ArtifactType;
  content: string;
  description?: string;
}

export interface CommandResponse {
  match: string | RegExp; // Command pattern to match
  output: string; // Realistic command output
  stateChange?: string[]; // State flags this command sets
  triggersTheory?: string; // Theory card ID to trigger
}

export interface TheoryCard {
  id: string;
  title: string;
  trigger: string; // What triggers this card (e.g., 'open_env_file')
  whatThisIs: string;
  whyItMatters: string;
  pentestReflex: string;
  commonMisunderstanding: string;
  syntaxExample?: string;
}

export interface HintTier {
  tier: 1 | 2 | 3;
  text: string;
  pointsCost: number;
}

export interface ExpectedFinding {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cvss?: string;
  description: string;
  impact: string;
  evidence: string[];
  reproductionSteps: string[];
  remediation: string;
}

export interface ReflectionPrompt {
  question: string;
  purpose: string; // What this question calibrates
}

export interface ScoringRubric {
  completion: number; // 0-30
  methodology: number; // 0-20
  signalRecognition: number; // 0-15
  efficiency: number; // 0-10
  reporting: number; // 0-20
  reflection: number; // 0-5
  total: number; // Sum of above
}

export interface Casefile {
  id: string;
  title: string;
  
  // Metadata
  difficulty: CasefileDifficulty;
  estimatedMinutes: number;
  category: CasefileCategory;
  subcategories: string[];
  primaryMechanic: string;
  secondaryMechanic?: string;
  methodologyStages: MethodologyStage[];
  
  // Content
  brief: string;
  learningObjectives: string[];
  fundamentalsCovered: string[];
  reportSkillFocus: string;
  
  // Evidence & Actions
  artifacts: CasefileArtifact[];
  supportedCommands: string[];
  commandResponses: CommandResponse[];
  
  // Investigation Flow
  clues: string[];
  expectedFlow: string[];
  commonMistakes: string[];
  
  // Teaching System
  hints: HintTier[];
  theoryCards: TheoryCard[];
  
  // Completion & Evaluation
  successConditions: string[];
  expectedFinding: ExpectedFinding;
  reflectionPrompts: ReflectionPrompt[];
  scoringRubric: ScoringRubric;
  
  // Variations
  variationIdeas: string[];
  
  // Implementation
  implementationNotes?: {
    artifactTriggers?: Record<string, string>;
    stateFlags?: string[];
    uiHints?: string[];
  };
}

// ============================================
// USER SESSION STATE
// ============================================

export interface CasefileAction {
  type: 'command' | 'file_open' | 'note' | 'finding' | 'hint' | 'theory';
  timestamp: string;
  content: string;
  output?: string;
  stateChanges?: string[];
}

export interface UserFinding {
  title: string;
  severity: string;
  description: string;
  impact: string;
  evidence: string[];
  reproductionSteps: string[];
  remediation: string;
}

export interface CasefileSession {
  casefileId: string;
  startedAt: string;
  completedAt?: string;
  
  // State
  currentState: string[]; // Flags like 'found_env_file', 'identified_sqli'
  elapsedSeconds: number;
  
  // Actions
  actions: CasefileAction[];
  openedArtifacts: string[];
  executedCommands: string[];
  
  // Hints & Theory
  hintsUsed: number[];
  theoriesViewed: string[];
  
  // User Work
  notes: string;
  markedClues: string[];
  userFinding?: UserFinding;
  reflectionAnswers: Record<string, string>;
  
  // Pre-case Assessment
  preCaseConfidence: number; // 1-5
  preCaseStrategy: string;
  preCaseExpectation: string;
  
  // Scoring
  score?: ScoringRubric;
  completed: boolean;
}

// ============================================
// EVALUATION SYSTEM
// ============================================

export interface EvaluationResult {
  outcome: 'correct' | 'partial' | 'incorrect';
  whatTheyDidWell: string[];
  whatTheyMissed: string[];
  methodologyAssessment: string;
  reportingAssessment: string;
  calibrationInsight: string;
  score: ScoringRubric;
  recoveryRecommendation: {
    nextCaseType: string;
    reason: string;
  };
  debrief: string;
}

// ============================================
// OPERATOR INSIGHTS (CALIBRATION)
// ============================================

export interface OperatorInsights {
  // Pattern Detection
  mechanicsStrong: string[];
  mechanicsWeak: string[];
  
  // Behavioral Patterns
  rushesToExploitation: boolean;
  overusesFuzzing: boolean;
  underreadsOutputs: boolean;
  missesCredentials: boolean;
  weakImpactPhrasing: boolean;
  ignoresSmallClues: boolean;
  hintReliant: boolean;
  
  // Category Performance
  strongEnumeration: boolean;
  weakChaining: boolean;
  weakReporting: boolean;
  goodWebIntuition: boolean;
  weakPrivesc: boolean;
  
  // Recommendations
  recommendedCases: string[];
  fundamentalsToRecover: string[];
}

// ============================================
// CASEFILE LIBRARY METADATA
// ============================================

export interface CasefileMetadata {
  id: string;
  title: string;
  difficulty: CasefileDifficulty;
  estimatedMinutes: number;
  category: CasefileCategory;
  primaryMechanic: string;
  methodologyStages: MethodologyStage[];
  
  // User Progress
  completed: boolean;
  bestScore?: number;
  attempts: number;
  lastAttemptDate?: string;
}

// ============================================
// FUNDAMENTALS RECOVERY
// ============================================

export interface RecoveryChain {
  id: string;
  mechanicFamily: string;
  description: string;
  cases: [string, string, string]; // [concept, standard, report] case IDs
}

// ============================================
// UI STATE
// ============================================

export interface CasefileUIState {
  activePanel: 'evidence' | 'terminal' | 'notes' | 'findings' | 'hints' | 'methodology' | 'theory';
  selectedArtifact?: string;
  terminalHistory: Array<{ command: string; output: string }>;
  showPreAssessment: boolean;
  showCompletion: boolean;
  showEvaluation: boolean;
}
