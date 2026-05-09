/**
 * SEC1 Exam Store - Persistent State Management
 * 
 * Handles SEC1 (Security Analyst) certification exam state:
 * - Scenario-based MCQ questions
 * - Progress tracking across scenarios
 * - Answer history and scoring
 * - Hint usage tracking
 * - Post-exam analytics
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Scenario {
  title: string;
  description: string;
  context: string;
  questions: Question[];
}

export interface AnswerRecord {
  scenarioIndex: number;
  questionIndex: number;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  timestamp: number;
}

export interface SEC1ExamSession {
  scenarios: Scenario[];
  currentScenario: number;
  currentQuestion: number;
  answers: AnswerRecord[];
  correctAnswers: number;
  incorrectAnswers: number;
  hintsUsed: number;
  startTime: number;
  completedTime: number | null;
  isActive: boolean;
}

export interface CategoryScore {
  category: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface ExamResults {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  score: number; // percentage
  hintsUsed: number;
  duration: number; // seconds
  categoryScores: CategoryScore[];
  weakDomains: string[];
  strongDomains: string[];
}

interface SEC1ExamStore {
  activeExam: SEC1ExamSession | null;
  
  // Actions
  startExam: (scenarios: Scenario[]) => void;
  answerQuestion: (
    scenarioIndex: number, 
    questionIndex: number, 
    selectedAnswer: number, 
    isCorrect: boolean
  ) => void;
  incrementHints: () => void;
  completeExam: (duration: number) => void;
  clearExam: () => void;
  
  // Queries
  hasActiveExam: () => boolean;
  getExamResults: () => ExamResults | null;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useSEC1ExamStore = create<SEC1ExamStore>()(
  persist(
    (set, get) => ({
      activeExam: null,
      
      startExam: (scenarios) => {
        const newSession: SEC1ExamSession = {
          scenarios,
          currentScenario: 0,
          currentQuestion: 0,
          answers: [],
          correctAnswers: 0,
          incorrectAnswers: 0,
          hintsUsed: 0,
          startTime: Date.now(),
          completedTime: null,
          isActive: true,
        };
        
        set({ activeExam: newSession });
        
        console.log('[SEC1ExamStore] Started new exam:', {
          scenarioCount: scenarios.length,
          totalQuestions: scenarios.reduce((sum, s) => sum + s.questions.length, 0),
        });
      },
      
      answerQuestion: (scenarioIndex, questionIndex, selectedAnswer, isCorrect) => {
        const state = get();
        if (!state.activeExam) return;
        
        const scenario = state.activeExam.scenarios[scenarioIndex];
        const question = scenario.questions[questionIndex];
        
        const answerRecord: AnswerRecord = {
          scenarioIndex,
          questionIndex,
          selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          timestamp: Date.now(),
        };
        
        set({
          activeExam: {
            ...state.activeExam,
            answers: [...state.activeExam.answers, answerRecord],
            correctAnswers: state.activeExam.correctAnswers + (isCorrect ? 1 : 0),
            incorrectAnswers: state.activeExam.incorrectAnswers + (isCorrect ? 0 : 1),
          },
        });
        
        console.log('[SEC1ExamStore] Question answered:', {
          scenario: scenarioIndex + 1,
          question: questionIndex + 1,
          correct: isCorrect,
        });
      },
      
      incrementHints: () => {
        const state = get();
        if (!state.activeExam) return;
        
        set({
          activeExam: {
            ...state.activeExam,
            hintsUsed: state.activeExam.hintsUsed + 1,
          },
        });
      },
      
      completeExam: (duration) => {
        const state = get();
        if (!state.activeExam) return;
        
        set({
          activeExam: {
            ...state.activeExam,
            completedTime: Date.now(),
            isActive: false,
          },
        });
        
        console.log('[SEC1ExamStore] Exam completed:', {
          score: state.activeExam.correctAnswers,
          total: state.activeExam.correctAnswers + state.activeExam.incorrectAnswers,
          duration,
        });
      },
      
      clearExam: () => {
        set({ activeExam: null });
        console.log('[SEC1ExamStore] Exam cleared');
      },
      
      hasActiveExam: () => {
        return get().activeExam !== null && get().activeExam?.isActive === true;
      },
      
      getExamResults: () => {
        const state = get();
        if (!state.activeExam) return null;
        
        const totalQuestions = state.activeExam.scenarios.reduce(
          (sum, s) => sum + s.questions.length, 
          0
        );
        
        const score = (state.activeExam.correctAnswers / totalQuestions) * 100;
        
        // Calculate category scores
        const categoryMap = new Map<string, { correct: number; total: number }>();
        
        state.activeExam.answers.forEach((answer) => {
          const scenario = state.activeExam!.scenarios[answer.scenarioIndex];
          const question = scenario.questions[answer.questionIndex];
          const category = question.category;
          
          if (!categoryMap.has(category)) {
            categoryMap.set(category, { correct: 0, total: 0 });
          }
          
          const stats = categoryMap.get(category)!;
          stats.total += 1;
          if (answer.isCorrect) {
            stats.correct += 1;
          }
        });
        
        const categoryScores: CategoryScore[] = Array.from(categoryMap.entries()).map(
          ([category, stats]) => ({
            category,
            correct: stats.correct,
            total: stats.total,
            percentage: (stats.correct / stats.total) * 100,
          })
        );
        
        categoryScores.sort((a, b) => a.percentage - b.percentage);
        
        const weakDomains = categoryScores
          .filter(c => c.percentage < 60)
          .map(c => c.category);
        
        const strongDomains = categoryScores
          .filter(c => c.percentage >= 80)
          .map(c => c.category);
        
        const duration = state.activeExam.completedTime
          ? Math.floor((state.activeExam.completedTime - state.activeExam.startTime) / 1000)
          : 0;
        
        return {
          totalQuestions,
          correctAnswers: state.activeExam.correctAnswers,
          incorrectAnswers: state.activeExam.incorrectAnswers,
          score,
          hintsUsed: state.activeExam.hintsUsed,
          duration,
          categoryScores,
          weakDomains,
          strongDomains,
        };
      },
    }),
    {
      name: 'seshforge-sec1-exam',
      partialize: (state) => ({ activeExam: state.activeExam }),
    }
  )
);
