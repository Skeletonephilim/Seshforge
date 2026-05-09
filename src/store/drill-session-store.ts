import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { table } from '@devvai/devv-code-backend';

// Session types
export type SessionType = 'command_drill' | 'decision_engine' | 'pt1_exam' | 'failure_learning';
export type SessionStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';

// Pentesting phases for weakness tracking
export type PentestingPhase = 
  | 'reconnaissance' 
  | 'scanning' 
  | 'enumeration' 
  | 'exploitation' 
  | 'privilege_escalation' 
  | 'post_exploitation';

// Failure pattern
export interface FailurePattern {
  phase: PentestingPhase;
  mistake: string;
  command: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Methodology weaknesses (0-1 scale, higher is better)
export interface MethodologyWeaknesses {
  reconnaissance: number;
  scanning: number;
  enumeration: number;
  exploitation: number;
  privilege_escalation: number;
  post_exploitation: number;
}

// Complete session state
export interface DrillSessionState {
  // Basic metadata
  sessionType: SessionType;
  drillId: string;
  status: SessionStatus;
  
  // Progress tracking
  currentStep: number;
  totalSteps: number;
  attempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  
  // Session data
  enteredCommands: Array<{ command: string; timestamp: string; correct: boolean }>;
  aiFeedbackHistory: Array<{ question: string; answer: string; timestamp: string }>;
  discoveredIntel: Record<string, any>; // For decision engine
  
  // Analytics
  failurePatterns: FailurePattern[];
  methodologyWeaknesses: MethodologyWeaknesses;
  timeSpentSeconds: number;
  hintsUsed: number;
  score: number;
  
  // Timestamps
  startedAt: string;
  completedAt?: string;
  lastUpdated: string;
}

interface DrillSessionStore {
  // Current session
  currentSession: DrillSessionState | null;
  
  // Session history
  sessionHistory: DrillSessionState[];
  
  // Aggregated statistics
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  overallMethodologyWeaknesses: MethodologyWeaknesses;
  
  // Actions
  startSession: (type: SessionType, drillId: string) => Promise<void>;
  updateSessionState: (updates: Partial<DrillSessionState>) => Promise<void>;
  addFailurePattern: (pattern: FailurePattern) => Promise<void>;
  completeSession: (score: number) => Promise<void>;
  failSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  resumeLastSession: (type: SessionType) => Promise<DrillSessionState | null>;
  saveSessionToDatabase: () => Promise<void>;
  loadUserSessions: () => Promise<void>;
  calculateMethodologyWeaknesses: () => MethodologyWeaknesses;
  getWeaknessHeatmap: () => Array<{ phase: PentestingPhase; score: number; label: string }>;
  clearCurrentSession: () => void;
  resetAllDrillData: () => Promise<void>;
}

export const useDrillSessionStore = create<DrillSessionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSession: null,
      sessionHistory: [],
      totalSessions: 0,
      completedSessions: 0,
      averageScore: 0,
      overallMethodologyWeaknesses: {
        reconnaissance: 0.5,
        scanning: 0.5,
        enumeration: 0.5,
        exploitation: 0.5,
        privilege_escalation: 0.5,
        post_exploitation: 0.5,
      },

      // Start a new session
      startSession: async (type: SessionType, drillId: string) => {
        const now = new Date().toISOString();
        
        const newSession: DrillSessionState = {
          sessionType: type,
          drillId,
          status: 'in_progress',
          currentStep: 0,
          totalSteps: 0,
          attempts: 1,
          correctAnswers: 0,
          incorrectAnswers: 0,
          enteredCommands: [],
          aiFeedbackHistory: [],
          discoveredIntel: {},
          failurePatterns: [],
          methodologyWeaknesses: {
            reconnaissance: 0.5,
            scanning: 0.5,
            enumeration: 0.5,
            exploitation: 0.5,
            privilege_escalation: 0.5,
            post_exploitation: 0.5,
          },
          timeSpentSeconds: 0,
          hintsUsed: 0,
          score: 0,
          startedAt: now,
          lastUpdated: now,
        };

        set({ currentSession: newSession });
        
        // Save to database immediately
        await get().saveSessionToDatabase();
      },

      // Update session state
      updateSessionState: async (updates: Partial<DrillSessionState>) => {
        const { currentSession } = get();
        if (!currentSession) return;

        const updatedSession = {
          ...currentSession,
          ...updates,
          lastUpdated: new Date().toISOString(),
        };

        set({ currentSession: updatedSession });
        
        // Auto-save to database
        await get().saveSessionToDatabase();
      },

      // Add failure pattern
      addFailurePattern: async (pattern: FailurePattern) => {
        const { currentSession } = get();
        if (!currentSession) return;

        const updatedFailures = [...currentSession.failurePatterns, pattern];
        
        // Recalculate methodology weaknesses based on failure patterns
        const weaknesses = get().calculateMethodologyWeaknesses();

        await get().updateSessionState({
          failurePatterns: updatedFailures,
          methodologyWeaknesses: weaknesses,
          incorrectAnswers: currentSession.incorrectAnswers + 1,
        });
      },

      // Complete session
      completeSession: async (score: number) => {
        const { currentSession, sessionHistory } = get();
        if (!currentSession) return;

        const completedSession = {
          ...currentSession,
          status: 'completed' as SessionStatus,
          score,
          completedAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        };

        // Update history
        const newHistory = [...sessionHistory, completedSession];
        
        // Calculate overall statistics
        const completedCount = newHistory.filter(s => s.status === 'completed').length;
        const avgScore = completedCount > 0
          ? newHistory.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.score, 0) / completedCount
          : 0;

        // Calculate overall methodology weaknesses (weighted average)
        const overallWeaknesses = get().calculateMethodologyWeaknesses();

        set({
          currentSession: completedSession,
          sessionHistory: newHistory,
          totalSessions: newHistory.length,
          completedSessions: completedCount,
          averageScore: avgScore,
          overallMethodologyWeaknesses: overallWeaknesses,
        });

        // Save to database
        await get().saveSessionToDatabase();
      },

      // Fail session
      failSession: async () => {
        const { currentSession } = get();
        if (!currentSession) return;

        await get().updateSessionState({
          status: 'failed',
          completedAt: new Date().toISOString(),
        });
      },

      // Load session by ID
      loadSession: async (sessionId: string) => {
        try {
          const response = await table.getItems('ff3qxi5gy7sw', {
            query: {
              _id: sessionId,
            },
            limit: 1,
          });

          if (response.items && response.items.length > 0) {
            const session = parseSessionFromDB(response.items[0]);
            set({ currentSession: session });
          }
        } catch (error) {
          console.error('Failed to load session:', error);
        }
      },

      // Resume last incomplete session of a specific type
      resumeLastSession: async (type: SessionType) => {
        try {
          const response = await table.getItems('ff3qxi5gy7sw', {
            query: {
              status: 'in_progress',
            },
            sort: 'last_updated',
            order: 'desc',
            limit: 20,
          });

          if (response.items && response.items.length > 0) {
            // Find the most recent session of the specified type
            const sessions = response.items
              .map(parseSessionFromDB)
              .filter(s => s.sessionType === type)
              .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

            if (sessions.length > 0) {
              const session = sessions[0];
              set({ currentSession: session });
              return session;
            }
          }
        } catch (error) {
          console.error('Failed to resume session:', error);
        }
        
        return null;
      },

      // Save session to database
      saveSessionToDatabase: async () => {
        const { currentSession } = get();
        if (!currentSession) return;

        try {
          // Safe JSON stringification helper
          const safeStringify = (data: any): string => {
            try {
              return JSON.stringify(data);
            } catch (error) {
              console.warn('Failed to stringify data, using fallback:', error);
              // Fallback: try to stringify a simplified version
              try {
                return JSON.stringify(JSON.parse(JSON.stringify(data)));
              } catch {
                return '{}';
              }
            }
          };

          await table.addItem('ff3qxi5gy7sw', {
            session_type: currentSession.sessionType,
            drill_id: currentSession.drillId,
            status: currentSession.status,
            session_state: safeStringify({
              currentStep: currentSession.currentStep,
              totalSteps: currentSession.totalSteps,
              enteredCommands: currentSession.enteredCommands,
              aiFeedbackHistory: currentSession.aiFeedbackHistory,
              discoveredIntel: currentSession.discoveredIntel,
            }),
            attempts: currentSession.attempts,
            correct_answers: currentSession.correctAnswers,
            incorrect_answers: currentSession.incorrectAnswers,
            failure_patterns: safeStringify(currentSession.failurePatterns),
            methodology_weaknesses: safeStringify(currentSession.methodologyWeaknesses),
            time_spent_seconds: currentSession.timeSpentSeconds,
            hints_used: currentSession.hintsUsed,
            score: currentSession.score,
            started_at: currentSession.startedAt,
            completed_at: currentSession.completedAt || '',
            last_updated: currentSession.lastUpdated,
          });
        } catch (error) {
          console.error('Failed to save session to database:', error);
        }
      },

      // Load all user sessions
      loadUserSessions: async () => {
        try {
          const response = await table.getItems('ff3qxi5gy7sw', {
            sort: 'last_updated',
            order: 'desc',
            limit: 100,
          });

          if (response.items) {
            // Parse sessions with error handling - skip corrupted ones
            const sessions: DrillSessionState[] = [];
            
            for (const item of response.items) {
              try {
                const parsed = parseSessionFromDB(item);
                sessions.push(parsed);
              } catch (error) {
                console.warn('Skipping corrupted drill session:', item._id, error);
                // Continue with other sessions instead of failing completely
              }
            }
            
            // Calculate statistics
            const completedCount = sessions.filter(s => s.status === 'completed').length;
            const avgScore = completedCount > 0
              ? sessions.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.score, 0) / completedCount
              : 0;

            // Calculate overall weaknesses
            const overallWeaknesses = calculateOverallWeaknesses(sessions);

            set({
              sessionHistory: sessions,
              totalSessions: sessions.length,
              completedSessions: completedCount,
              averageScore: avgScore,
              overallMethodologyWeaknesses: overallWeaknesses,
            });
          }
        } catch (error) {
          console.error('Failed to load user sessions:', error);
        }
      },

      // Calculate methodology weaknesses from failure patterns
      calculateMethodologyWeaknesses: () => {
        const { currentSession, sessionHistory } = get();
        
        // Get all sessions including current
        const allSessions = currentSession 
          ? [...sessionHistory, currentSession]
          : sessionHistory;

        return calculateOverallWeaknesses(allSessions);
      },

      // Get weakness heatmap for visualization
      getWeaknessHeatmap: () => {
        const weaknesses = get().overallMethodologyWeaknesses;
        
        // Defensive: ensure weaknesses object exists and has all required properties
        if (!weaknesses || typeof weaknesses !== 'object') {
          return [
            { phase: 'reconnaissance' as PentestingPhase, score: 50, label: 'Reconnaissance' },
            { phase: 'scanning' as PentestingPhase, score: 50, label: 'Scanning' },
            { phase: 'enumeration' as PentestingPhase, score: 50, label: 'Enumeration' },
            { phase: 'exploitation' as PentestingPhase, score: 50, label: 'Exploitation' },
            { phase: 'privilege_escalation' as PentestingPhase, score: 50, label: 'Privilege Escalation' },
            { phase: 'post_exploitation' as PentestingPhase, score: 50, label: 'Post-Exploitation' },
          ];
        }
        
        return [
          { 
            phase: 'reconnaissance' as PentestingPhase, 
            score: Math.round((weaknesses.reconnaissance || 0.5) * 100), 
            label: 'Reconnaissance' 
          },
          { 
            phase: 'scanning' as PentestingPhase, 
            score: Math.round((weaknesses.scanning || 0.5) * 100), 
            label: 'Scanning' 
          },
          { 
            phase: 'enumeration' as PentestingPhase, 
            score: Math.round((weaknesses.enumeration || 0.5) * 100), 
            label: 'Enumeration' 
          },
          { 
            phase: 'exploitation' as PentestingPhase, 
            score: Math.round((weaknesses.exploitation || 0.5) * 100), 
            label: 'Exploitation' 
          },
          { 
            phase: 'privilege_escalation' as PentestingPhase, 
            score: Math.round((weaknesses.privilege_escalation || 0.5) * 100), 
            label: 'Privilege Escalation' 
          },
          { 
            phase: 'post_exploitation' as PentestingPhase, 
            score: Math.round((weaknesses.post_exploitation || 0.5) * 100), 
            label: 'Post-Exploitation' 
          },
        ].sort((a, b) => a.score - b.score); // Sort by weakness (lowest first)
      },

      // Clear current session
      clearCurrentSession: () => {
        set({ currentSession: null });
      },
      
      // Complete reset - erase all drill data
      resetAllDrillData: async () => {
        set({
          currentSession: null,
          sessionHistory: [],
          totalSessions: 0,
          completedSessions: 0,
          averageScore: 0,
          overallMethodologyWeaknesses: {
            reconnaissance: 0.5,
            scanning: 0.5,
            enumeration: 0.5,
            exploitation: 0.5,
            privilege_escalation: 0.5,
            post_exploitation: 0.5,
          },
        });
        
        // Clear localStorage
        localStorage.removeItem('seshforge-drill-sessions');
        
        console.log('[DrillSessionStore] Complete reset executed - all drill data erased');
      },
    }),
    {
      name: 'seshforge-drill-sessions',
      partialize: (state) => ({
        // Only persist essential data to local storage
        sessionHistory: state.sessionHistory.slice(-20), // Keep last 20 sessions
        totalSessions: state.totalSessions,
        completedSessions: state.completedSessions,
        averageScore: state.averageScore,
        overallMethodologyWeaknesses: state.overallMethodologyWeaknesses,
      }),
    }
  )
);

// Helper function to parse session from database format
function parseSessionFromDB(dbItem: any): DrillSessionState {
  // Safe JSON parsing with fallback
  let sessionState = {};
  if (dbItem.session_state) {
    try {
      sessionState = JSON.parse(dbItem.session_state);
    } catch (error) {
      console.warn('Failed to parse session_state for drill session:', dbItem._id, error);
      sessionState = {};
    }
  }
  
  // Safe parsing of failure patterns
  let failurePatterns: FailurePattern[] = [];
  if (dbItem.failure_patterns) {
    try {
      failurePatterns = JSON.parse(dbItem.failure_patterns);
    } catch (error) {
      console.warn('Failed to parse failure_patterns for drill session:', dbItem._id, error);
      failurePatterns = [];
    }
  }
  
  // Safe parsing of methodology weaknesses
  let methodologyWeaknesses: MethodologyWeaknesses = {
    reconnaissance: 0.5,
    scanning: 0.5,
    enumeration: 0.5,
    exploitation: 0.5,
    privilege_escalation: 0.5,
    post_exploitation: 0.5,
  };
  if (dbItem.methodology_weaknesses) {
    try {
      methodologyWeaknesses = JSON.parse(dbItem.methodology_weaknesses);
    } catch (error) {
      console.warn('Failed to parse methodology_weaknesses for drill session:', dbItem._id, error);
      // Keep default values
    }
  }
  
  return {
    sessionType: dbItem.session_type,
    drillId: dbItem.drill_id,
    status: dbItem.status,
    currentStep: (sessionState as any).currentStep || 0,
    totalSteps: (sessionState as any).totalSteps || 0,
    attempts: dbItem.attempts || 1,
    correctAnswers: dbItem.correct_answers || 0,
    incorrectAnswers: dbItem.incorrect_answers || 0,
    enteredCommands: (sessionState as any).enteredCommands || [],
    aiFeedbackHistory: (sessionState as any).aiFeedbackHistory || [],
    discoveredIntel: (sessionState as any).discoveredIntel || {},
    failurePatterns,
    methodologyWeaknesses,
    timeSpentSeconds: dbItem.time_spent_seconds || 0,
    hintsUsed: dbItem.hints_used || 0,
    score: dbItem.score || 0,
    startedAt: dbItem.started_at,
    completedAt: dbItem.completed_at,
    lastUpdated: dbItem.last_updated,
  };
}

// Calculate overall weaknesses from all sessions
function calculateOverallWeaknesses(sessions: DrillSessionState[]): MethodologyWeaknesses {
  if (sessions.length === 0) {
    return {
      reconnaissance: 0.5,
      scanning: 0.5,
      enumeration: 0.5,
      exploitation: 0.5,
      privilege_escalation: 0.5,
      post_exploitation: 0.5,
    };
  }

  // Count failures per phase
  const phaseCounts: Record<PentestingPhase, { failures: number; total: number }> = {
    reconnaissance: { failures: 0, total: 0 },
    scanning: { failures: 0, total: 0 },
    enumeration: { failures: 0, total: 0 },
    exploitation: { failures: 0, total: 0 },
    privilege_escalation: { failures: 0, total: 0 },
    post_exploitation: { failures: 0, total: 0 },
  };

  sessions.forEach(session => {
    session.failurePatterns.forEach(pattern => {
      phaseCounts[pattern.phase].failures++;
      phaseCounts[pattern.phase].total++;
    });
    
    // Also count successful attempts
    const correctAnswers = session.correctAnswers;
    if (correctAnswers > 0) {
      // Distribute success across phases based on session type
      Object.keys(phaseCounts).forEach(phase => {
        phaseCounts[phase as PentestingPhase].total += correctAnswers / 6;
      });
    }
  });

  // Calculate weakness scores (0 = all failures, 1 = no failures)
  const weaknesses: MethodologyWeaknesses = {
    reconnaissance: calculatePhaseScore(phaseCounts.reconnaissance),
    scanning: calculatePhaseScore(phaseCounts.scanning),
    enumeration: calculatePhaseScore(phaseCounts.enumeration),
    exploitation: calculatePhaseScore(phaseCounts.exploitation),
    privilege_escalation: calculatePhaseScore(phaseCounts.privilege_escalation),
    post_exploitation: calculatePhaseScore(phaseCounts.post_exploitation),
  };

  return weaknesses;
}

// Calculate score for a single phase (0-1 scale)
function calculatePhaseScore(phaseData: { failures: number; total: number }): number {
  if (phaseData.total === 0) return 0.5; // No data, assume neutral
  
  const successRate = 1 - (phaseData.failures / phaseData.total);
  return Math.max(0, Math.min(1, successRate)); // Clamp to 0-1
}
