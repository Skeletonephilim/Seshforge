/**
 * PT1 End-of-Exam Report Review Types
 * 
 * Post-exam professional report evaluation system
 */

export interface ReportReviewScores {
  overall: number; // 0-10
  methodology: number; // 0-10
  technicalClarity: number; // 0-10
  professionalism: number; // 0-10
  completeness: number; // 0-10
}

export interface ReportReviewFeedback {
  scores: ReportReviewScores;
  
  // Categorized feedback
  strengths: string[];
  weaknesses: string[];
  missingElements: string[];
  splitFindings: string[];
  unprofessionalPhrasing: string[];
  strongerReportWouldDoDifferently: string[];
  
  // Structured analysis
  methodologyGaps: string[];
  fastestImprovements: string[];
  
  // Improved version
  improvedProfessionalVersionMarkdown: string;
  
  // Metadata
  generatedAt: string;
}

export interface PT1PostExamReviewState {
  review: ReportReviewFeedback | null;
  reviewStatus: 'idle' | 'generating' | 'complete' | 'error';
  reviewError: string | null;
}

export interface PostExamReviewCacheKey {
  examAttemptId: string;
  reportHash: string;
  evidenceHash: string;
}

// Scoring interpretation
export const SCORE_BANDS = {
  'very_weak': { min: 0, max: 3 },
  'partial': { min: 4, max: 5 },
  'competent': { min: 6, max: 7 },
  'strong': { min: 8, max: 9 },
  'exceptional': { min: 10, max: 10 },
} as const;

export function getScoreBand(score: number): keyof typeof SCORE_BANDS {
  if (score <= 3) return 'very_weak';
  if (score <= 5) return 'partial';
  if (score <= 7) return 'competent';
  if (score <= 9) return 'strong';
  return 'exceptional';
}

export function getScoreColor(score: number): string {
  const band = getScoreBand(score);
  switch (band) {
    case 'very_weak': return 'text-destructive';
    case 'partial': return 'text-orange-500';
    case 'competent': return 'text-chart-3';
    case 'strong': return 'text-secondary';
    case 'exceptional': return 'text-primary';
  }
}
