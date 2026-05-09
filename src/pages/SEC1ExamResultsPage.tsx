/**
 * SEC1 Exam Results Page - Post-Exam Analytics
 * 
 * Displays comprehensive results before allowing exam reset:
 * - Overall score and performance
 * - Category breakdown
 * - Weak/strong domains
 * - Time efficiency
 * - Actionable recommendations
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Award,
  AlertTriangle,
  RotateCcw,
  Home,
} from 'lucide-react';
import { useSEC1ExamStore } from '@/store/sec1-exam-store';

export default function SEC1ExamResultsPage() {
  const navigate = useNavigate();
  const examStore = useSEC1ExamStore();
  const results = examStore.getExamResults();

  useEffect(() => {
    if (!results) {
      navigate('/sec1-exam');
    }
  }, [results, navigate]);

  if (!results) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreLevel = (score: number): { label: string; variant: string; icon: any } => {
    if (score >= 90) return { label: 'Excellent', variant: 'default', icon: Award };
    if (score >= 75) return { label: 'Good', variant: 'secondary', icon: CheckCircle2 };
    if (score >= 60) return { label: 'Pass', variant: 'outline', icon: Target };
    return { label: 'Needs Improvement', variant: 'destructive', icon: AlertTriangle };
  };

  const scoreLevel = getScoreLevel(results.score);
  const ScoreLevelIcon = scoreLevel.icon;

  const handleRetakeExam = () => {
    examStore.clearExam();
    navigate('/sec1-exam');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="w-12 h-12 text-primary" />
          <h1 className="text-4xl font-bold">SEC1 Exam Results</h1>
        </div>
        <p className="text-muted-foreground">Security Analyst Certification Assessment</p>
      </div>

      {/* Overall Score Card */}
      <Card className="mb-8 border-primary/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ScoreLevelIcon className="w-8 h-8" />
            <CardTitle className="text-3xl">{scoreLevel.label}</CardTitle>
          </div>
          <CardDescription>Your overall performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-12 mb-6">
            <div className="text-center">
              <p className="text-6xl font-bold text-primary">{Math.round(results.score)}%</p>
              <p className="text-sm text-muted-foreground mt-2">Overall Score</p>
            </div>
            
            <Separator orientation="vertical" className="h-24" />
            
            <div className="text-center">
              <p className="text-4xl font-bold">{results.correctAnswers}/{results.totalQuestions}</p>
              <p className="text-sm text-muted-foreground mt-2">Questions Correct</p>
            </div>
          </div>
          
          <Progress value={results.score} className="h-3 mb-4" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-2xl font-bold">{results.correctAnswers}</p>
              </div>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-5 h-5 text-destructive" />
                <p className="text-2xl font-bold">{results.incorrectAnswers}</p>
              </div>
              <p className="text-xs text-muted-foreground">Incorrect</p>
            </div>
            
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold">{formatTime(results.duration)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Category Breakdown
            </CardTitle>
            <CardDescription>Performance by knowledge domain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.categoryScores.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {cat.category.replace('_', ' ')}
                    </span>
                    <Badge variant={cat.percentage >= 70 ? 'default' : cat.percentage >= 50 ? 'secondary' : 'destructive'}>
                      {Math.round(cat.percentage)}%
                    </Badge>
                  </div>
                  <Progress value={cat.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {cat.correct}/{cat.total} questions correct
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weak & Strong Domains */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Domain Analysis
            </CardTitle>
            <CardDescription>Areas for improvement and strengths</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Weak Domains */}
              {results.weakDomains.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-4 h-4 text-destructive" />
                    <p className="text-sm font-medium">Focus Areas (&lt;60%)</p>
                  </div>
                  <div className="space-y-2">
                    {results.weakDomains.map((domain) => (
                      <div
                        key={domain}
                        className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded"
                      >
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-sm capitalize">{domain.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strong Domains */}
              {results.strongDomains.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <p className="text-sm font-medium">Strengths (≥80%)</p>
                  </div>
                  <div className="space-y-2">
                    {results.strongDomains.map((domain) => (
                      <div
                        key={domain}
                        className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm capitalize">{domain.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.weakDomains.length === 0 && results.strongDomains.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No strong or weak domains identified</p>
                  <p className="text-xs">Performance is consistent across all categories</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations Card */}
      <Card className="mb-8 border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Recommendations
          </CardTitle>
          <CardDescription>Next steps for improving your security analyst skills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.score >= 90 ? (
              <>
                <p className="text-sm">
                  ✅ <strong>Excellent performance!</strong> You demonstrate strong security analyst fundamentals across all domains.
                </p>
                <p className="text-sm">
                  📚 Consider advancing to practical exploitation training with PT1 Exam mode or Decision Engine scenarios.
                </p>
                <p className="text-sm">
                  🎯 Focus on real-world incident response and SOC workflows to build hands-on experience.
                </p>
              </>
            ) : results.score >= 75 ? (
              <>
                <p className="text-sm">
                  ✅ <strong>Good performance!</strong> You have solid fundamentals with room for mastery.
                </p>
                <p className="text-sm">
                  📚 Review weak domains: {results.weakDomains.map(d => d.replace('_', ' ')).join(', ') || 'none identified'}
                </p>
                <p className="text-sm">
                  🎯 Practice log analysis and defensive security scenarios to build confidence.
                </p>
              </>
            ) : results.score >= 60 ? (
              <>
                <p className="text-sm">
                  ⚠️ <strong>Passing performance.</strong> Focus on weak areas to build stronger foundations.
                </p>
                <p className="text-sm">
                  📚 Priority topics: {results.weakDomains.map(d => d.replace('_', ' ')).join(', ') || 'general review needed'}
                </p>
                <p className="text-sm">
                  🎯 Retake SEC1 Exam after targeted study to track improvement.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm">
                  🔴 <strong>Needs improvement.</strong> Revisit SEC0/SEC1 fundamentals before certification attempt.
                </p>
                <p className="text-sm">
                  📚 Critical gaps: {results.weakDomains.map(d => d.replace('_', ' ')).join(', ') || 'comprehensive review recommended'}
                </p>
                <p className="text-sm">
                  🎯 Focus on understanding concepts, not memorization. Retake when ready.
                </p>
              </>
            )}
            
            {results.hintsUsed > 5 && (
              <p className="text-sm text-amber-500">
                💡 You used {results.hintsUsed} hints. Try to rely less on guidance during next attempt to test true understanding.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate('/')}
        >
          <Home className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
        
        <Button
          size="lg"
          onClick={handleRetakeExam}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Retake Exam
        </Button>
      </div>
    </div>
  );
}
