/**
 * Post-Exam Analytics Page
 * 
 * CRITICAL: Appears AFTER exam completion (success OR failure)
 * BEFORE environment reset / new scenario generation
 * 
 * User MUST see this page before starting new exam.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Lightbulb,
  ArrowRight,
  Download,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import type { ExamAnalyticsReport, PhaseAnalysis } from '@/lib/exam-analytics-engine';

interface PT1ExamAnalyticsPageProps {
  analyticsReport: ExamAnalyticsReport;
  onReset: () => void;
  onExportReport: () => void;
}

export default function PT1ExamAnalyticsPage({ analyticsReport, onReset, onExportReport }: PT1ExamAnalyticsPageProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Prevent accidental navigation away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'above_pt1':
        return <Badge className="bg-green-500">Above PT1</Badge>;
      case 'pt1_ready':
        return <Badge className="bg-blue-500">PT1 Ready</Badge>;
      case 'intermediate':
        return <Badge variant="secondary">Intermediate</Badge>;
      default:
        return <Badge variant="outline">Beginner</Badge>;
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getProgressColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-amber-500" />
                  PT1 Exam Analytics Report
                </CardTitle>
                <CardDescription className="mt-2">
                  Comprehensive methodology evaluation and improvement roadmap
                </CardDescription>
              </div>
              {getLevelBadge(analyticsReport.level)}
            </div>
          </CardHeader>
        </Card>
        
        {/* Overall Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🧠 Overall Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Score</span>
              <span className={`text-3xl font-bold ${getScoreColor(analyticsReport.overallScore)}`}>
                {analyticsReport.overallScore} / 100
              </span>
            </div>
            <Progress value={analyticsReport.overallScore} className="h-3" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-mono">{analyticsReport.examDuration}min</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commands</p>
                <p className="text-sm font-mono">{analyticsReport.commandsExecuted}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Flags</p>
                <p className="text-sm font-mono">{analyticsReport.flagsCaptured}/2</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hints Used</p>
                <p className="text-sm font-mono">{analyticsReport.hintsUsed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Methodology Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🔍 Methodology Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {analyticsReport.methodologyBreakdown.map((phase) => (
              <div key={phase.phase} className="space-y-3 pb-6 border-b last:border-b-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium capitalize">{phase.phase.replace(/_/g, ' ')}</h3>
                  <Badge variant={phase.score >= 70 ? 'default' : 'secondary'}>
                    {phase.score}/100
                  </Badge>
                </div>
                
                {phase.whatWasDone.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> What Was Done:
                    </p>
                    <ul className="text-sm mt-1 space-y-1">
                      {phase.whatWasDone.map((item, idx) => (
                        <li key={idx} className="text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {phase.whatWasMissed.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> What Was Missed:
                    </p>
                    <ul className="text-sm mt-1 space-y-1">
                      {phase.whatWasMissed.map((item, idx) => (
                        <li key={idx} className="text-muted-foreground">• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {phase.criticalMistake && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                    <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Critical Mistake:
                    </p>
                    <p className="text-sm mt-1">{phase.criticalMistake}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Enumeration Depth Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🧬 Enumeration Depth Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Depth Score</span>
              <span className={`text-xl font-bold ${getScoreColor(analyticsReport.enumerationDepth.score)}`}>
                {analyticsReport.enumerationDepth.score}/100
              </span>
            </div>
            <Progress 
              value={analyticsReport.enumerationDepth.score} 
              className={`h-2 ${getProgressColor(analyticsReport.enumerationDepth.score)}`}
            />
            
            <div className="grid grid-cols-3 gap-2 text-xs mt-4">
              <div className={`p-2 rounded ${analyticsReport.enumerationDepth.stoppedAtFirstFinding ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                {analyticsReport.enumerationDepth.stoppedAtFirstFinding ? '❌' : '✅'} Stopped at first finding
              </div>
              <div className={`p-2 rounded ${analyticsReport.enumerationDepth.exploredMultipleAttackSurfaces ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {analyticsReport.enumerationDepth.exploredMultipleAttackSurfaces ? '✅' : '❌'} Multiple surfaces
              </div>
              <div className={`p-2 rounded ${analyticsReport.enumerationDepth.validatedAssumptions ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {analyticsReport.enumerationDepth.validatedAssumptions ? '✅' : '❌'} Validated assumptions
              </div>
            </div>
            
            {analyticsReport.enumerationDepth.missedOpportunities.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-500 mb-2">Missed Opportunities:</p>
                <ul className="text-sm space-y-1">
                  {analyticsReport.enumerationDepth.missedOpportunities.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Tool Usage & Decision Making */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🛠 Tool Usage Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Tools Used:</p>
                <div className="flex flex-wrap gap-1">
                  {analyticsReport.toolUsage.toolsUsed.map((tool) => (
                    <Badge key={tool} variant="outline" className="text-xs">{tool}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Diversity Score:</p>
                <div className="flex items-center gap-2">
                  <Progress value={analyticsReport.toolUsage.diversity} className="flex-1 h-2" />
                  <span className="text-sm font-mono">{analyticsReport.toolUsage.diversity}/100</span>
                </div>
              </div>
              
              {analyticsReport.toolUsage.overReliance.detected && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded p-2">
                  <p className="text-xs font-medium text-orange-500">⚠️ Over-Reliance Detected</p>
                  <p className="text-xs mt-1">Tool: <span className="font-mono">{analyticsReport.toolUsage.overReliance.tool}</span></p>
                  <p className="text-xs">{analyticsReport.toolUsage.overReliance.reason}</p>
                </div>
              )}
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Manual vs Automated:</span>
                  <Badge variant={analyticsReport.toolUsage.manualVsAutomatedBalance === 'good' ? 'default' : 'secondary'}>
                    {analyticsReport.toolUsage.manualVsAutomatedBalance.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⚖ Decision-Making Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Decision Score</span>
                <span className={`text-xl font-bold ${getScoreColor(analyticsReport.decisionMaking.score)}`}>
                  {analyticsReport.decisionMaking.score}/100
                </span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span>Actions Logical:</span>
                  {analyticsReport.decisionMaking.actionsLogical ? 
                    <Badge variant="outline" className="bg-green-500/10">✅ Yes</Badge> : 
                    <Badge variant="outline" className="bg-red-500/10">❌ No</Badge>
                  }
                </div>
                <div className="flex justify-between items-center">
                  <span>Random/Brute-Force:</span>
                  {analyticsReport.decisionMaking.randomBruteForce ? 
                    <Badge variant="outline" className="bg-red-500/10">❌ Yes</Badge> : 
                    <Badge variant="outline" className="bg-green-500/10">✅ No</Badge>
                  }
                </div>
                <div className="flex justify-between items-center">
                  <span>Pivoted Correctly:</span>
                  {analyticsReport.decisionMaking.pivotsCorrectly ? 
                    <Badge variant="outline" className="bg-green-500/10">✅ Yes</Badge> : 
                    <Badge variant="outline" className="bg-red-500/10">❌ No</Badge>
                  }
                </div>
              </div>
              
              {analyticsReport.decisionMaking.keyDecisionTurningPoint && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 mt-4">
                  <p className="text-xs font-medium text-blue-500">🔑 Key Turning Point:</p>
                  <p className="text-xs mt-1">{analyticsReport.decisionMaking.keyDecisionTurningPoint}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Time Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" /> Time Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Time to Foothold</p>
                <p className="text-lg font-mono">
                  {analyticsReport.timeEfficiency.timeToFoothold !== null 
                    ? `${analyticsReport.timeEfficiency.timeToFoothold}min` 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time to Privesc</p>
                <p className="text-lg font-mono">
                  {analyticsReport.timeEfficiency.timeToPrivesc !== null 
                    ? `${analyticsReport.timeEfficiency.timeToPrivesc}min` 
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Wasted Time</p>
                <p className="text-lg font-mono text-red-500">
                  {analyticsReport.timeEfficiency.timeWastedOnDeadEnds}min
                </p>
              </div>
            </div>
            
            {analyticsReport.timeEfficiency.timeSinks.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-orange-500 mb-2">Time Sinks:</p>
                <ul className="text-sm space-y-1">
                  {analyticsReport.timeEfficiency.timeSinks.map((sink, idx) => (
                    <li key={idx} className="text-muted-foreground">• {sink}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Critical Mistakes */}
        {analyticsReport.criticalMistakes.length > 0 && (
          <Card className="border-red-500/50">
            <CardHeader>
              <CardTitle className="text-lg text-red-500 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Critical Mistakes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analyticsReport.criticalMistakes.map((mistake, idx) => (
                  <li key={idx} className="text-sm bg-red-500/10 border border-red-500/30 rounded p-2">
                    {mistake}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        {/* Anti-Pattern Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🚨 Anti-Pattern Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded border ${analyticsReport.antiPatterns.patternBasedHacking ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className="text-xs font-medium">Pattern-Based Hacking</p>
                <p className="text-sm">{analyticsReport.antiPatterns.patternBasedHacking ? '❌ Detected' : '✅ Not Detected'}</p>
              </div>
              <div className={`p-3 rounded border ${analyticsReport.antiPatterns.shallowEnumeration ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className="text-xs font-medium">Shallow Enumeration</p>
                <p className="text-sm">{analyticsReport.antiPatterns.shallowEnumeration ? '❌ Detected' : '✅ Not Detected'}</p>
              </div>
              <div className={`p-3 rounded border ${analyticsReport.antiPatterns.toolReliance ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className="text-xs font-medium">Tool Reliance</p>
                <p className="text-sm">{analyticsReport.antiPatterns.toolReliance ? '❌ Detected' : '✅ Not Detected'}</p>
              </div>
              <div className={`p-3 rounded border ${analyticsReport.antiPatterns.lackOfValidation ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className="text-xs font-medium">Lack of Validation</p>
                <p className="text-sm">{analyticsReport.antiPatterns.lackOfValidation ? '❌ Detected' : '✅ Not Detected'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* PT1 Readiness */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-lg">📈 PT1 Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall PT1 Readiness</span>
              <span className={`text-2xl font-bold ${getScoreColor(analyticsReport.pt1Readiness.overall)}`}>
                {analyticsReport.pt1Readiness.overall}%
              </span>
            </div>
            <Progress value={analyticsReport.pt1Readiness.overall} className="h-3" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div>
                <p className="text-xs text-muted-foreground">Enumeration</p>
                <p className="text-lg font-mono">{analyticsReport.pt1Readiness.categoryBreakdown.enumeration}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Exploitation</p>
                <p className="text-lg font-mono">{analyticsReport.pt1Readiness.categoryBreakdown.exploitation}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PrivEsc</p>
                <p className="text-lg font-mono">{analyticsReport.pt1Readiness.categoryBreakdown.privesc}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Methodology</p>
                <p className="text-lg font-mono">{analyticsReport.pt1Readiness.categoryBreakdown.methodology}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Top 3 Improvements */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" /> Top 3 Improvements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {analyticsReport.top3Improvements.map((improvement, idx) => (
                <li key={idx} className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded p-3">
                  <Badge className="mt-0.5">{idx + 1}</Badge>
                  <p className="text-sm flex-1">{improvement}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        
        {/* Next Training Recommendation */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" /> Next Training Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Box Type</p>
                <Badge className="mt-1 uppercase">{analyticsReport.nextTrainingRecommendation.boxType}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Skill Focus</p>
                <p className="text-sm font-medium mt-1">{analyticsReport.nextTrainingRecommendation.skillToFocus}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Weakness</p>
                <p className="text-sm font-medium mt-1">{analyticsReport.nextTrainingRecommendation.specificWeakness}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={onExportReport} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Export Full Report
          </Button>
          <Button onClick={onReset} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Start New Exam
          </Button>
        </div>
        
        <p className="text-xs text-center text-muted-foreground">
          Generated: {new Date(analyticsReport.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
