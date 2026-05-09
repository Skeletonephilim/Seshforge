/**
 * Universal Exam Session Store with Persistence
 * 
 * Handles state persistence for ALL exam modes:
 * - PT1 Exam Simulator
 * - Web Black-Box Exam
 * - AD + Lateral Movement Exam
 * - Decision Engine timed sessions
 * 
 * CRITICAL: Survives tab switches, refreshes, browser backgrounding
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ReportReviewFeedback } from '@/types/report-review';

// ============================================================================
// Types
// ============================================================================

export type ExamMode = 'PT1' | 'Web' | 'AD' | 'DecisionEngine' | null;
export type PT1Section = 'web_application' | 'network_security' | 'active_directory';

export interface CommandEntry {
  command: string;
  output: string;
  timestamp: string;
}

export interface SectionReport {
  sectionId: PT1Section;
  sectionName: string;
  completedAt: string;
  duration: number; // seconds
  commandHistory: CommandEntry[];
  flagsFound: number;
  hintsUsed: number;
  reportDraft: string;
  evaluation: SectionEvaluation | null;
}

export interface SectionEvaluation {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  methodologyIssues: string[];
  improvementSuggestions: string[];
  generatedAt: string;
}

export interface FinalExamEvaluation {
  sectionScores: Record<PT1Section, number>;
  globalScore: number; // weighted average
  overallStrengths: string[];
  overallWeaknesses: string[];
  actionableFeedback: string[];
  certificationRecommendation: string;
  generatedAt: string;
}

export interface ExamScenario {
  targetIP: string;
  targetDomain?: string;
  domainController?: string;
  difficulty: string;
  description: string;
  openPorts: string[];
  currentPhase?: string;
  currentObjective?: number;
}

export interface ExamSession {
  // Metadata
  mode: ExamMode;
  startTime: number; // Timestamp when exam started
  elapsedSeconds: number; // Total elapsed time (survives refresh)
  timeLimit: number; // Time limit in minutes
  
  // Scenario
  scenario: ExamScenario | null;
  
  // Progress
  commandHistory: CommandEntry[];
  flagsFound: number; // Global flag counter (never reset)
  currentSectionFlags: number; // Flags captured in current section only (reset on section switch)
  hintsUsed: number;
  pointsDeducted: number;
  currentCommand: string;
  
  // State
  isActive: boolean;
  isPaused: boolean;
  
  // Notes & Report
  notes: string;
  reportDraft: string;
  
  // Post-Exam Review
  postExamReview: ReportReviewFeedback | null;
  reviewStatus: 'idle' | 'generating' | 'complete' | 'error';
  reviewError: string | null;
  
  // Section progress (PT1 multi-section)
  currentSection: PT1Section | null;
  completedSections: SectionReport[];
  finalEvaluation: FinalExamEvaluation | null;
  
  // Legacy
  completedSteps: string[];
  sectionProgress: Record<string, any>;
}

interface ExamSessionStore {
  activeExam: ExamSession | null;
  
  // Actions
  startExam: (mode: ExamMode, scenario: ExamScenario, timeLimit: number) => void;
  endExam: () => void;
  pauseExam: () => void;
  resumeExam: () => void;
  
  // Update actions
  addCommand: (command: string, output: string) => void;
  updateElapsedTime: (seconds: number) => void;
  incrementFlags: () => void;
  incrementHints: (pointsCost: number) => void;
  updateCurrentCommand: (command: string) => void;
  updateNotes: (notes: string) => void;
  updateReportDraft: (draft: string) => void;
  
  // Review actions
  setReviewGenerating: () => void;
  setReviewComplete: (review: ReportReviewFeedback) => void;
  setReviewError: (error: string) => void;
  clearReview: () => void;
  
  // PT1 Section Management
  startSection: (section: PT1Section) => void;
  completeSection: (evaluation: SectionEvaluation) => void;
  switchSection: (newSection: PT1Section) => void;
  setFinalEvaluation: (evaluation: FinalExamEvaluation) => void;
  getSectionReport: (section: PT1Section) => SectionReport | null;
  
  // Session management
  getActiveExam: () => ExamSession | null;
  hasActiveExam: () => boolean;
  clearExam: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useExamSessionStore = create<ExamSessionStore>()(
  persist(
    (set, get) => ({
      activeExam: null,
      
      // ========================================================================
      // Core Actions
      // ========================================================================
      
      startExam: (mode, scenario, timeLimit) => {
        const now = Date.now();
        
        const newSession: ExamSession = {
          mode,
          startTime: now,
          elapsedSeconds: 0,
          timeLimit,
          scenario,
          commandHistory: [],
          flagsFound: 0,
          currentSectionFlags: 0,
          hintsUsed: 0,
          pointsDeducted: 0,
          currentCommand: '',
          isActive: true,
          isPaused: false,
          notes: '',
          reportDraft: '',
          postExamReview: null,
          reviewStatus: 'idle',
          reviewError: null,
          currentSection: mode === 'PT1' ? 'web_application' : null,
          completedSections: [],
          finalEvaluation: null,
          completedSteps: [],
          sectionProgress: {},
        };
        
        set({ activeExam: newSession });
        
        console.log('[ExamSessionStore] Started new exam:', {
          mode,
          timeLimit,
          scenario: scenario.targetIP,
        });
      },
      
      endExam: () => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            isActive: false,
          },
        });
        
        console.log('[ExamSessionStore] Exam ended:', {
          mode: session.mode,
          elapsedSeconds: session.elapsedSeconds,
          flagsFound: session.flagsFound,
        });
      },
      
      pauseExam: () => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            isPaused: true,
          },
        });
        
        console.log('[ExamSessionStore] Exam paused');
      },
      
      resumeExam: () => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            isPaused: false,
          },
        });
        
        console.log('[ExamSessionStore] Exam resumed');
      },
      
      // ========================================================================
      // Update Actions
      // ========================================================================
      
      addCommand: (command, output) => {
        const session = get().activeExam;
        if (!session) return;
        
        const newEntry: CommandEntry = {
          command,
          output,
          timestamp: new Date().toISOString(),
        };
        
        set({
          activeExam: {
            ...session,
            commandHistory: [...session.commandHistory, newEntry],
            currentCommand: '', // Clear input after execution
          },
        });
        
        console.log('[ExamSessionStore] Command added:', {
          command: command.substring(0, 50),
          totalCommands: session.commandHistory.length + 1,
        });
      },
      
      updateElapsedTime: (seconds) => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            elapsedSeconds: seconds,
          },
        });
      },
      
      incrementFlags: () => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            flagsFound: session.flagsFound + 1, // Global counter
            currentSectionFlags: session.currentSectionFlags + 1, // Section counter
          },
        });
        
        console.log('[ExamSessionStore] Flag captured:', {
          globalTotal: session.flagsFound + 1,
          sectionTotal: session.currentSectionFlags + 1,
        });
      },
      
      incrementHints: (pointsCost) => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            hintsUsed: session.hintsUsed + 1,
            pointsDeducted: session.pointsDeducted + pointsCost,
          },
        });
        
        console.log('[ExamSessionStore] Hint used:', {
          totalHints: session.hintsUsed + 1,
          totalPoints: session.pointsDeducted + pointsCost,
        });
      },
      
      updateCurrentCommand: (command) => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            currentCommand: command,
          },
        });
      },
      
      updateNotes: (notes) => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            notes,
          },
        });
      },
      
      updateReportDraft: (draft) => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            reportDraft: draft,
          },
        });
      },
      
      // ========================================================================
      // Review Actions
      // ========================================================================
      
      setReviewGenerating: () => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            reviewStatus: 'generating',
            reviewError: null,
          },
        });
      },
      
      setReviewComplete: (review) => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            postExamReview: review,
            reviewStatus: 'complete',
            reviewError: null,
          },
        });
        
        console.log('[ExamSessionStore] Report review generated:', {
          overallScore: review.scores.overall,
        });
      },
      
      setReviewError: (error) => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            reviewStatus: 'error',
            reviewError: error,
          },
        });
      },
      
      clearReview: () => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            postExamReview: null,
            reviewStatus: 'idle',
            reviewError: null,
          },
        });
      },
      
      // ========================================================================
      // PT1 Section Management
      // ========================================================================
      
      startSection: (section) => {
        const session = get().activeExam;
        if (!session || session.mode !== 'PT1') return;
        
        set({
          activeExam: {
            ...session,
            currentSection: section,
            commandHistory: [],
            currentSectionFlags: 0, // Reset section counter only
            hintsUsed: 0,
            reportDraft: '',
            notes: '',
          },
        });
        
        console.log('[ExamSessionStore] Started section:', section);
      },
      
      completeSection: (evaluation) => {
        const session = get().activeExam;
        if (!session || !session.currentSection) return;
        
        const sectionReport: SectionReport = {
          sectionId: session.currentSection,
          sectionName: getSectionName(session.currentSection),
          completedAt: new Date().toISOString(),
          duration: session.elapsedSeconds,
          commandHistory: [...session.commandHistory],
          flagsFound: session.currentSectionFlags, // Use section-specific counter
          hintsUsed: session.hintsUsed,
          reportDraft: session.reportDraft,
          evaluation,
        };
        
        set({
          activeExam: {
            ...session,
            completedSections: [...session.completedSections, sectionReport],
          },
        });
        
        console.log('[ExamSessionStore] Section completed:', {
          section: session.currentSection,
          score: evaluation.score,
        });
      },
      
      switchSection: (newSection) => {
        const session = get().activeExam;
        if (!session || session.mode !== 'PT1') return;
        
        // Reset section-specific state
        set({
          activeExam: {
            ...session,
            currentSection: newSection,
            commandHistory: [],
            currentSectionFlags: 0, // Reset section counter only
            hintsUsed: 0,
            reportDraft: '',
            notes: '',
          },
        });
        
        console.log('[ExamSessionStore] Switched to section:', newSection);
      },
      
      setFinalEvaluation: (evaluation) => {
        const session = get().activeExam;
        if (!session) return;
        
        set({
          activeExam: {
            ...session,
            finalEvaluation: evaluation,
          },
        });
        
        console.log('[ExamSessionStore] Final evaluation set:', {
          globalScore: evaluation.globalScore,
        });
      },
      
      getSectionReport: (section) => {
        const session = get().activeExam;
        if (!session) return null;
        
        return session.completedSections.find(s => s.sectionId === section) || null;
      },
      
      // ========================================================================
      // Session Management
      // ========================================================================
      
      getActiveExam: () => get().activeExam,
      
      hasActiveExam: () => {
        const session = get().activeExam;
        return session !== null && session.isActive;
      },
      
      clearExam: () => {
        set({ activeExam: null });
        console.log('[ExamSessionStore] Exam session cleared');
      },
    }),
    {
      name: 'seshforge-exam-session',
      version: 2, // Incremented to force migration from old 60min hardcoded exams
      
      // Storage configuration
      partialize: (state) => ({
        activeExam: state.activeExam,
      }),
      
      // Merge strategy for hydration
      merge: (persistedState: any, currentState) => {
        const merged = {
          ...currentState,
          ...persistedState,
        };
        
        // Log restoration
        if (persistedState?.activeExam?.isActive) {
          console.log('[ExamSessionStore] Restored active exam:', {
            mode: persistedState.activeExam.mode,
            elapsedSeconds: persistedState.activeExam.elapsedSeconds,
            flagsFound: persistedState.activeExam.flagsFound,
            currentSectionFlags: persistedState.activeExam.currentSectionFlags || 0,
          });
        }
        
        return merged;
      },
    }
  )
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate remaining time based on elapsed seconds and time limit
 */
export const calculateTimeRemaining = (session: ExamSession | null): number => {
  if (!session) return 0;
  
  const totalSeconds = session.timeLimit * 60;
  const remaining = totalSeconds - session.elapsedSeconds;
  
  return Math.max(0, remaining);
};

/**
 * Format seconds to HH:MM:SS
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Auto-save hook - debounced save on state changes
 * Usage: Call this in useEffect with dependencies on exam state
 */
export const useExamAutoSave = (
  updateElapsedTime: (seconds: number) => void,
  startTime: number,
  isActive: boolean
) => {
  useEffect(() => {
    if (!isActive) return;
    
    // Update elapsed time every 5 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      updateElapsedTime(elapsed);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [startTime, isActive, updateElapsedTime]);
};

// ============================================================================
// Browser Event Handlers
// ============================================================================

/**
 * Setup auto-save triggers for browser events
 * Call this once when exam component mounts
 */
export const setupExamPersistenceTriggers = (
  updateElapsedTime: (seconds: number) => void,
  getSession: () => ExamSession | null
) => {
  // Save on visibility change (tab switch)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      const session = getSession();
      if (session && session.isActive) {
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
        updateElapsedTime(elapsed);
        console.log('[ExamSessionStore] Auto-save triggered (visibility change)');
      }
    }
  };
  
  // Save on beforeunload (refresh/close)
  const handleBeforeUnload = () => {
    const session = getSession();
    if (session && session.isActive) {
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      updateElapsedTime(elapsed);
      console.log('[ExamSessionStore] Auto-save triggered (beforeunload)');
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
};

// ============================================================================
// Type Guards
// ============================================================================

export const isExamActive = (session: ExamSession | null): session is ExamSession => {
  return session !== null && session.isActive;
};

export const isExamMode = (mode: string): mode is ExamMode => {
  return ['PT1', 'Web', 'AD', 'DecisionEngine'].includes(mode);
};

export const getSectionName = (section: PT1Section): string => {
  const names: Record<PT1Section, string> = {
    web_application: 'Web Application Testing',
    network_security: 'Network Security Testing',
    active_directory: 'Active Directory Testing',
  };
  return names[section];
};

export const getSectionScenario = (section: PT1Section): string => {
  const scenarios: Record<PT1Section, string> = {
    web_application: 'Assess the security of web applications, identify OWASP Top 10 vulnerabilities, and demonstrate exploitation capabilities.',
    network_security: 'Enumerate network services, identify misconfigurations, and demonstrate network-level exploitation techniques.',
    active_directory: 'Assess Active Directory security, identify privilege escalation paths, and demonstrate domain compromise techniques.',
  };
  return scenarios[section];
};
