import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useExamSessionStore, 
  formatTime, 
  getSectionName,
  type PT1Section,
  type SectionReport,
  type FinalExamEvaluation,
} from '@/store/exam-session-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Terminal, 
  Flag, 
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Award,
  FileText,
  Home,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadMarkdownFile, generateSectionFilename } from '@/lib/download-helpers';
import { generateSectionReport } from '@/lib/section-report-generator';

export default function PT1RatingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const examStore = useExamSessionStore();
  const { activeExam } = examStore;
  
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  
  // Redirect if no completed exam
  useEffect(() => {
    if (!activeExam || activeExam.mode !== 'PT1' || activeExam.isActive) {
      toast({
        title: 'No Completed Exam',
        description: 'Please complete a PT1 exam first',
        variant: 'destructive',
      });
      navigate('/pt1-exam-config', { replace: true });
    }
  }, [activeExam, navigate]);
  
  if (!activeExam || activeExam.mode !== 'PT1') {
    return null;
  }
  
  const { completedSections, finalEvaluation, scenario, elapsedSeconds, flagsFound, hintsUsed } = activeExam;
  
  // Calculate overall stats
  const totalDuration = Math.floor(elapsedSeconds / 60); // minutes
  const averageScore = completedSections.length > 0
    ? Math.round(completedSections.reduce((sum, s) => sum + (s.evaluation?.score || 0), 0) / completedSections.length)
    : 0;
  
  // Download individual section report
  const handleDownloadSection = async (section: SectionReport) => {
    try {
      setIsDownloading(section.sectionId);
      
      if (!section.evaluation || !activeExam) {
        toast({
          title: 'Cannot Download',
          description: 'Section evaluation data is missing',
          variant: 'destructive',
        });
        return;
      }
      
      const reportMarkdown = generateSectionReport(
        section.sectionId,
        section.evaluation,
        activeExam
      );
      
      const filename = generateSectionFilename(section.sectionId, scenario?.targetIP || 'unknown');
      downloadMarkdownFile(reportMarkdown, filename);
      
      toast({
        title: 'Section Report Downloaded',
        description: `${section.sectionName} report saved successfully`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not download section report',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(null);
    }
  };
  
  // Get score color/variant
  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 70) return "default"; // green
    if (score >= 50) return "secondary"; // yellow
    return "destructive"; // red
  };
  
  const getScoreColor = (score: number): string => {
    if (score >= 70) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    return "text-red-500";
  };
  
  const getSectionIcon = (section: PT1Section) => {
    switch (section) {
      case 'web_application':
        return '🌐';
      case 'network_security':
        return '🔒';
      case 'active_directory':
        return '🏢';
      default:
        return '📋';
    }
  };
  
  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">PT1 Exam Review & Rating</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive evaluation of your penetration testing performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                examStore.clearExam();
                navigate('/pt1-exam-config');
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Exam
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
        
        {/* Exam Overview Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Exam Summary
              </CardTitle>
              <Badge variant="outline" className="text-base px-4 py-1">
                Target: {scenario?.targetIP || 'Unknown'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(averageScore)}`}>
                  {averageScore}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {totalDuration} min
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Flags Captured</p>
                <p className="text-2xl font-semibold flex items-center gap-1">
                  <Flag className="w-4 h-4 text-muted-foreground" />
                  {flagsFound}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Hints Used</p>
                <p className="text-2xl font-semibold flex items-center gap-1">
                  <Lightbulb className="w-4 h-4 text-muted-foreground" />
                  {hintsUsed}
                </p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Certification Readiness</span>
                <span className={`font-medium ${getScoreColor(averageScore)}`}>
                  {averageScore >= 70 ? 'Likely Pass' : averageScore >= 50 ? 'Needs Improvement' : 'Not Ready'}
                </span>
              </div>
              <Progress value={averageScore} className="h-3" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Separator />
      
      {/* Section Reports */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Section Performance</h2>
        
        {completedSections.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">No Sections Completed</h3>
                  <p className="text-muted-foreground">
                    Complete at least one exam section to see detailed performance metrics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {completedSections.map((section, index) => {
              const evaluation = section.evaluation;
              if (!evaluation) return null;
              
              return (
                <Card key={section.sectionId} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3">
                        <span className="text-2xl">{getSectionIcon(section.sectionId)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            {section.sectionName}
                            <Badge variant={getScoreBadgeVariant(evaluation.score)}>
                              {evaluation.score}%
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-normal mt-1">
                            Completed {new Date(section.completedAt).toLocaleString()}
                          </p>
                        </div>
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadSection(section)}
                        disabled={isDownloading === section.sectionId}
                      >
                        {isDownloading === section.sectionId ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download Report
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="text-lg font-semibold">{Math.floor(section.duration / 60)} min</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Commands</p>
                        <p className="text-lg font-semibold">{section.commandHistory.length}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Flags</p>
                        <p className="text-lg font-semibold">{section.flagsFound}</p>
                      </div>
                    </div>
                    
                    {/* Strengths */}
                    {evaluation.strengths.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          Strengths Demonstrated
                        </h4>
                        <ul className="space-y-1 ml-6">
                          {evaluation.strengths.map((strength, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-green-500 mt-0.5">•</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Weaknesses */}
                    {evaluation.weaknesses.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-orange-600">
                          <TrendingDown className="w-4 h-4" />
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-1 ml-6">
                          {evaluation.weaknesses.map((weakness, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-orange-500 mt-0.5">•</span>
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Missed Opportunities */}
                    {evaluation.missedOpportunities.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-yellow-600">
                          <AlertCircle className="w-4 h-4" />
                          Missed Opportunities
                        </h4>
                        <ul className="space-y-1 ml-6">
                          {evaluation.missedOpportunities.map((missed, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-yellow-500 mt-0.5">•</span>
                              {missed}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Improvement Suggestions */}
                    {evaluation.improvementSuggestions.length > 0 && (
                      <div className="space-y-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <h4 className="font-semibold flex items-center gap-2 text-blue-600">
                          <TrendingUp className="w-4 h-4" />
                          Recommendations for Next Time
                        </h4>
                        <ul className="space-y-1 ml-6">
                          {evaluation.improvementSuggestions.map((suggestion, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Final Evaluation (if available) */}
      {finalEvaluation && (
        <>
          <Separator />
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Overall Evaluation</h2>
            
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Final Assessment
                </CardTitle>
                <CardDescription>
                  Comprehensive evaluation across all three PT1 sections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Section Scores */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Section Scores</h4>
                  <div className="grid gap-3">
                    {Object.entries(finalEvaluation.sectionScores).map(([sectionId, score]) => (
                      <div key={sectionId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className="font-medium">{getSectionName(sectionId as PT1Section)}</span>
                        <Badge variant={getScoreBadgeVariant(score)}>
                          {score}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Global Score */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Weighted Global Score</h4>
                  <div className="flex items-center gap-4">
                    <Progress value={finalEvaluation.globalScore} className="h-4 flex-1" />
                    <span className={`text-2xl font-bold ${getScoreColor(finalEvaluation.globalScore)}`}>
                      {finalEvaluation.globalScore}%
                    </span>
                  </div>
                </div>
                
                {/* Overall Strengths */}
                {finalEvaluation.overallStrengths.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Key Strengths
                    </h4>
                    <ul className="space-y-1 ml-6">
                      {finalEvaluation.overallStrengths.map((strength, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Overall Weaknesses */}
                {finalEvaluation.overallWeaknesses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-orange-600">
                      <TrendingDown className="w-4 h-4" />
                      Areas to Focus On
                    </h4>
                    <ul className="space-y-1 ml-6">
                      {finalEvaluation.overallWeaknesses.map((weakness, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">•</span>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Actionable Feedback */}
                {finalEvaluation.actionableFeedback.length > 0 && (
                  <div className="space-y-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2 text-blue-600">
                      <TrendingUp className="w-4 h-4" />
                      Action Items
                    </h4>
                    <ul className="space-y-1 ml-6">
                      {finalEvaluation.actionableFeedback.map((feedback, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          {feedback}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Certification Recommendation */}
                <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Certification Readiness</h4>
                  <p className="text-sm text-muted-foreground">
                    {finalEvaluation.certificationRecommendation}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      
      {/* Actions */}
      <div className="flex justify-center gap-4 pt-8">
        <Button
          size="lg"
          onClick={() => {
            examStore.clearExam();
            navigate('/pt1-exam-config');
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Start New PT1 Exam
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate('/')}
        >
          <Home className="w-4 h-4 mr-2" />
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
