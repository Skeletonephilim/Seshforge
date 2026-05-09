import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ReportReviewFeedback } from '@/types/report-review';
import { getScoreColor, getScoreBand } from '@/types/report-review';

interface PostExamReviewProps {
  review: ReportReviewFeedback;
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export default function PostExamReview({ review, onRegenerate, isGenerating }: PostExamReviewProps) {
  
  const renderScoreBadge = (score: number) => {
    const band = getScoreBand(score);
    const colorClass = getScoreColor(score);
    
    return (
      <Badge variant={band === 'very_weak' || band === 'partial' ? 'destructive' : band === 'strong' || band === 'exceptional' ? 'default' : 'secondary'}>
        {score}/10
      </Badge>
    );
  };
  
  return (
    <div className="space-y-6">
      
      {/* Professional Report Review */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Professional Report Review
            </CardTitle>
            {onRegenerate && (
              <Button
                onClick={onRegenerate}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Regenerate
              </Button>
            )}
          </div>
          <CardDescription>
            Senior operator evaluation of your exam report draft
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          
          {/* Scores Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground mb-1">Overall</span>
              {renderScoreBadge(review.scores.overall)}
            </div>
            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground mb-1">Methodology</span>
              {renderScoreBadge(review.scores.methodology)}
            </div>
            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground mb-1">Technical</span>
              {renderScoreBadge(review.scores.technicalClarity)}
            </div>
            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground mb-1">Professional</span>
              {renderScoreBadge(review.scores.professionalism)}
            </div>
            <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg border border-border">
              <span className="text-xs text-muted-foreground mb-1">Complete</span>
              {renderScoreBadge(review.scores.completeness)}
            </div>
          </div>
          
          {/* Structured Feedback */}
          <div className="grid md:grid-cols-2 gap-4">
            
            {/* Strengths */}
            {review.strengths.length > 0 && (
              <div className="p-4 bg-secondary/10 border border-secondary/30 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-secondary">
                  <CheckCircle2 className="w-4 h-4" />
                  Keep
                </h4>
                <ul className="space-y-1 text-sm">
                  {review.strengths.map((item, i) => (
                    <li key={i} className="text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Weaknesses */}
            {review.weaknesses.length > 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-destructive">
                  <XCircle className="w-4 h-4" />
                  Remove
                </h4>
                <ul className="space-y-1 text-sm">
                  {review.weaknesses.map((item, i) => (
                    <li key={i} className="text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Missing Elements */}
            {review.missingElements.length > 0 && (
              <div className="p-4 bg-chart-3/10 border border-chart-3/30 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-chart-3">
                  <AlertCircle className="w-4 h-4" />
                  Add
                </h4>
                <ul className="space-y-1 text-sm">
                  {review.missingElements.map((item, i) => (
                    <li key={i} className="text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Split Findings */}
            {review.splitFindings.length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-amber-500">
                  <AlertCircle className="w-4 h-4" />
                  Rewrite (Split These)
                </h4>
                <ul className="space-y-1 text-sm">
                  {review.splitFindings.map((item, i) => (
                    <li key={i} className="text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
            
          </div>
          
          {/* Stronger Report Differences */}
          {review.strongerReportWouldDoDifferently.length > 0 && (
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <h4 className="font-semibold text-sm mb-2">How a Stronger Report Does This</h4>
              <ul className="space-y-1 text-sm">
                {review.strongerReportWouldDoDifferently.map((item, i) => (
                  <li key={i} className="text-muted-foreground">• {item}</li>
                ))}
              </ul>
            </div>
          )}
          
        </CardContent>
      </Card>
      
      {/* Improved Professional Version */}
      {review.improvedProfessionalVersionMarkdown && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Improved Professional Version</CardTitle>
            <CardDescription>
              Refined rewrite based on your findings. Evidence-grounded, human-sounding, operator-grade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm prose-invert max-w-none bg-muted/30 p-4 rounded-lg">
              <ReactMarkdown
                components={{
                  code: ({ inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md text-xs"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {review.improvedProfessionalVersionMarkdown}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Methodology Gaps */}
      {review.methodologyGaps.length > 0 && (
        <Card className="border-orange-500/30">
          <CardHeader>
            <CardTitle>Methodology Gaps</CardTitle>
            <CardDescription>
              Missing or weak PTES/OSSTMM methodology elements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {review.methodologyGaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* Fastest Improvements */}
      {review.fastestImprovements.length > 0 && (
        <Card className="border-secondary/30 bg-secondary/5">
          <CardHeader>
            <CardTitle>Fastest Improvements For Next Attempt</CardTitle>
            <CardDescription>
              Top actionable fixes - implement these first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              {review.fastestImprovements.map((item, i) => (
                <li key={i} className="text-muted-foreground">{item}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
      
    </div>
  );
}
