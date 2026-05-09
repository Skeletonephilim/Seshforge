import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PentestPhase = 'reconnaissance' | 'scanning' | 'enumeration' | 'initial_access' | 'privilege_escalation' | 'post_exploitation';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface FindingCoachItem {
  id: string;
  index: number;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  cvssEstimate: number;
  markdown: string;
  sourceEvidenceIds: string[];
  createdAt: string;
}

export interface DecisionEngineAttemptReport {
  reportMarkdown: string;
  aiProfessionalReportMarkdown: string;
  evaluation: {
    overall: number;
    methodology: number;
    technicalClarity: number;
    professionalism: number;
    completeness: number;
    strengths: string[];
    weaknesses: string[];
    missing: string[];
    splitFindings: string[];
    fastestImprovements: string[];
  };
  generatedAt: string;
}

interface SimulationState {
  phase: 'setup' | 'running' | 'completed';
  scenario: string;
  targetIP: string;
  difficulty: Difficulty;
  currentPentestPhase: PentestPhase;
  selectedDurationMinutes?: number;
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
    reconScore: number | null;
    scanningScore: number | null;
    enumerationScore: number | null;
    exploitationScore: number | null;
    privescScore: number | null;
    methodologyScore: number;
    overallScore: number;
    feedback: string;
    timeEfficiency: string;
  };
  findings: FindingCoachItem[];
  finalReport?: DecisionEngineAttemptReport;
  startedAt: string;
  completedAt?: string;
}

interface ScenarioHistory {
  lastScenarioType: string;
  lastAttackPath: string[];
  lastPrivescMethod: string;
  usedTargetIPs: string[];
  timestamp: string;
}

interface DecisionEngineStore {
  activeSimulation: SimulationState | null;
  scenarioHistory: ScenarioHistory[];
  
  startNewSimulation: (difficulty: Difficulty, scenario: string, targetIP: string, durationMinutes: number, scenarioType?: string) => void;
  addScenarioToHistory: (type: string, attackPath: string[], privescMethod: string, targetIP: string) => void;
  updateSimulationState: (updates: Partial<SimulationState>) => void;
  addCommandToHistory: (command: {
    userCommand: string;
    systemResponse: string;
    timestamp: string;
    phase: PentestPhase;
    executionId?: string;
    integrityWarning?: boolean;
  }) => void;
  updateDiscoveredInfo: (info: Partial<SimulationState['discoveredInfo']>) => void;
  addFinding: (finding: Omit<FindingCoachItem, 'id' | 'index' | 'createdAt'>) => void;
  completeSimulation: (evaluation: SimulationState['evaluation']) => void;
  endSimulation: (reason?: 'timer_expired' | 'user_ended' | 'scenario_complete') => void;
  setFinalReport: (report: DecisionEngineAttemptReport) => void;
  resetSimulation: () => void;
  loadSimulation: () => SimulationState | null;
}

export const useDecisionEngineStore = create<DecisionEngineStore>()(
  persist(
    (set, get) => ({
      activeSimulation: null,
      scenarioHistory: [],

      startNewSimulation: (difficulty, scenario, targetIP, durationMinutes = 30, scenarioType) => {
        set({
          activeSimulation: {
            phase: 'running',
            scenario,
            targetIP,
            difficulty,
            selectedDurationMinutes: durationMinutes,
            currentPentestPhase: 'reconnaissance',
            history: [],
            hintsUsed: 0,
            pointsDeducted: 0,
            discoveredInfo: {},
            findings: [],
            startedAt: new Date().toISOString(),
          },
        });
      },

      addScenarioToHistory: (type, attackPath, privescMethod, targetIP) => {
        const history = get().scenarioHistory;
        set({
          scenarioHistory: [
            ...history.slice(-9),
            {
              lastScenarioType: type,
              lastAttackPath: attackPath,
              lastPrivescMethod: privescMethod,
              usedTargetIPs: [...new Set([...history.flatMap(h => h.usedTargetIPs || []), targetIP])],
              timestamp: new Date().toISOString(),
            },
          ],
        });
      },

      updateSimulationState: (updates) => {
        const current = get().activeSimulation;
        if (!current) return;

        set({
          activeSimulation: {
            ...current,
            ...updates,
          },
        });
      },

      addCommandToHistory: (command) => {
        const current = get().activeSimulation;
        if (!current) return;

        set({
          activeSimulation: {
            ...current,
            history: [...current.history, command],
          },
        });
      },

      updateDiscoveredInfo: (info) => {
        const current = get().activeSimulation;
        if (!current) return;

        set({
          activeSimulation: {
            ...current,
            discoveredInfo: {
              ...current.discoveredInfo,
              ...info,
            },
          },
        });
      },

      addFinding: (finding) => {
        const current = get().activeSimulation;
        if (!current) return;

        const evidenceHash = `${finding.title}-${finding.sourceEvidenceIds.join(',')}`;
        const id = btoa(evidenceHash).substring(0, 12);
        
        if (current.findings.some(f => f.id === id)) {
          console.log('[FindingCoach] Duplicate finding detected, skipping:', finding.title);
          return;
        }

        const newFinding: FindingCoachItem = {
          ...finding,
          id,
          index: current.findings.length + 1,
          createdAt: new Date().toISOString(),
        };

        set({
          activeSimulation: {
            ...current,
            findings: [...current.findings, newFinding],
          },
        });

        console.log('[FindingCoach] New finding added:', newFinding.title);
      },

      completeSimulation: (evaluation) => {
        const current = get().activeSimulation;
        if (!current) return;

        set({
          activeSimulation: {
            ...current,
            phase: 'completed',
            evaluation,
            completedAt: new Date().toISOString(),
          },
        });
      },

      endSimulation: (reason?: 'timer_expired' | 'user_ended' | 'scenario_complete') => {
        const current = get().activeSimulation;
        if (!current || current.phase === 'completed') return;

        set({
          activeSimulation: {
            ...current,
            phase: 'completed',
            completedAt: new Date().toISOString(),
          },
        });
      },

      setFinalReport: (report: DecisionEngineAttemptReport) => {
        const current = get().activeSimulation;
        if (!current) return;

        set({
          activeSimulation: {
            ...current,
            finalReport: report,
          },
        });
      },

      resetSimulation: () => {
        set({ activeSimulation: null });
      },

      loadSimulation: () => {
        return get().activeSimulation;
      },
    }),
    {
      name: 'seshforge-decision-engine',
    }
  )
);
