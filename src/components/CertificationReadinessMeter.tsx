import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle2,
  Activity,
  BarChart3,
  Trophy,
  Flame,
  Zap,
} from 'lucide-react';
import { useCertificationStore, PT1ExamSection } from '@/store/certification-store';

interface CertificationReadinessMeterProps {
  compact?: boolean;
  drillScope?: {
    drillType: 'web' | 'ad' | 'smb' | 'mixed' | 'internal' | 'linux' | 'windows';
    domainsPracticed: string[];
    sectionsPracticed: string[];
  };
}

export default function CertificationReadinessMeter({ compact = false, drillScope }: CertificationReadinessMeterProps) {
  const certStore = useCertificationStore();
  const pt1 = certStore.pt1_readiness ?? {
    weighted_score: 0,
    pass_threshold: 60,
    status: 'not_exam_ready',
    sections: [],
    interpretation: 'Insufficient evidence',
  };
  const completed_simulations = certStore.completed_simulations ?? 0;
  const simulation_history = certStore.simulation_history ?? [];
  
  // Calculate domain-scoped readiness if drill is focused on specific domains
  const isDomainScoped = drillScope && drillScope.sectionsPracticed.length > 0 && drillScope.sectionsPracticed.length < 3;
  const scopedSections = isDomainScoped 
    ? pt1.sections.filter(s => drillScope.sectionsPracticed.includes(s.section))
    : pt1.sections;
  
  // Calculate weighted score for scoped sections only
  const scopedWeightedScore = isDomainScoped && scopedSections.length > 0
    ? Math.round(scopedSections.reduce((sum, s) => sum + (s.score * s.weight / 100), 0) / scopedSections.reduce((sum, s) => sum + (s.weight / 100), 0))
    : pt1.weighted_score;
  
  const displayScore = isDomainScoped ? scopedWeightedScore : pt1.weighted_score;
  const displayStatus = isDomainScoped && scopedWeightedScore >= pt1.pass_threshold ? 'likely_pass' : pt1.status;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 70) return 'default';
    if (score >= 40) return 'secondary';
    return 'destructive';
  };

  const formatSectionName = (section: string) => {
    return section
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusIcon = (status: string) => {
    if (status === 'confident_pass') return Trophy;
    if (status === 'likely_pass') return CheckCircle2;
    if (status === 'approaching_pass' || status === 'approaching_readiness') return Target;
    if (status === 'needs_more_drills') return Activity;
    return AlertTriangle;
  };

  const getStatusColor = (status: string) => {
    if (status === 'confident_pass') return 'text-green-500';
    if (status === 'likely_pass') return 'text-blue-500';
    if (status === 'approaching_pass' || status === 'approaching_readiness') return 'text-yellow-500';
    if (status === 'needs_more_drills') return 'text-orange-500';
    return 'text-red-500';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confident_pass: 'Confident Pass',
      likely_pass: 'Likely Pass',
      approaching_readiness: 'Approaching Readiness',
      approaching_pass: 'Approaching Pass',
      needs_more_drills: 'Needs More Drills',
      insufficient_evidence: 'Insufficient Evidence',
      not_exam_ready: 'Not Exam Ready',
    };
    return labels[status] || status;
  };

  const getSectionStatusDisplay = (status: string, evidenceCount: number) => {
    if (status === 'insufficient_evidence') {
      return `Insufficient evidence (${evidenceCount} drills)`;
    }
    if (status === 'needs_more_drills') {
      return `Needs more drills (${evidenceCount} completed)`;
    }
    return getStatusLabel(status);
  };

  const StatusIcon = getStatusIcon(pt1.status);

  // Calculate trend based on recent simulations
  const recentScores = (simulation_history || []).slice(0, 5).map((s) => s.score);
  const trend = recentScores.length >= 2 
    ? recentScores[0] - recentScores[recentScores.length - 1]
    : 0;

  if (compact) {
    return (
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {isDomainScoped ? (
                <>
                  {drillScope.drillType.toUpperCase()} Readiness
                  <span className="text-xs text-muted-foreground ml-2">
                    ({scopedSections.map(s => formatSectionName(s.section)).join(', ')})
                  </span>
                </>
              ) : (
                'PT1 Exam Readiness'
              )}
            </CardTitle>
            <Badge variant={getScoreBadgeVariant(displayScore)}>
              {displayScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={displayScore} className="h-2" />
          {isDomainScoped && (
            <Alert className="border-amber-500/50 bg-amber-950/10">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <AlertDescription className="text-xs">
                Domain-scoped drill: Shows readiness for {scopedSections.map(s => formatSectionName(s.section)).join(' + ')} only. Complete mixed drills for full PT1 readiness.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon className={`h-4 w-4 ${getStatusColor(displayStatus)}`} />
              <span className="text-muted-foreground">{getStatusLabel(displayStatus)}</span>
            </div>
            <div className="text-muted-foreground">
              Pass: {pt1.pass_threshold}%
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Domain-Scoped Alert (if applicable) */}
      {isDomainScoped && (
        <Alert className="border-amber-500/50 bg-amber-950/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription>
            <strong>Domain-Scoped Drill:</strong> This {drillScope.drillType.toUpperCase()} drill assessed <strong>{scopedSections.map(s => formatSectionName(s.section)).join(' + ')}</strong> only ({scopedSections.reduce((sum, s) => sum + s.weight, 0)}% of PT1 exam).
            <br />
            <span className="text-xs text-muted-foreground mt-1 block">
              Readiness shown below is for assessed sections only. Complete drills across all three PT1 sections for comprehensive exam readiness.
            </span>
          </AlertDescription>
        </Alert>
      )}
      
      {/* PT1 Weighted Readiness Card */}
      <Card className={isDomainScoped ? "border-amber-500/20 bg-gradient-to-br from-background to-amber-950/5" : "border-red-500/20 bg-gradient-to-br from-background to-red-950/5"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <StatusIcon className={`h-6 w-6 ${getStatusColor(displayStatus)}`} />
                {isDomainScoped ? (
                  <>
                    {drillScope.drillType.toUpperCase()} Readiness
                    <Badge variant="outline" className="ml-2 text-xs">
                      {scopedSections.map(s => formatSectionName(s.section)).join(' + ')}
                    </Badge>
                  </>
                ) : (
                  'PT1 Exam Readiness'
                )}
              </CardTitle>
              <CardDescription>
                {isDomainScoped ? (
                  `Scoped to: ${scopedSections.map(s => `${formatSectionName(s.section)} (${s.weight}%)`).join(', ')}`
                ) : (
                  'Section-weighted scoring (Web 40%, Network 36%, AD 24%)'
                )}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className={`text-5xl font-bold ${getScoreColor(displayScore)}`}>
                {displayScore}%
              </div>
              <div className="text-sm text-muted-foreground flex items-center justify-end gap-1 mt-1">
                {trend > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">+{Math.round(trend)}%</span>
                  </>
                ) : trend < 0 ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">{Math.round(trend)}%</span>
                  </>
                ) : (
                  <span>Stable</span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={displayScore} className="h-4" />
          
          {/* Pass Threshold Indicator */}
          <div className="flex items-center justify-between text-sm border-t border-border/40 pt-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pass Threshold:</span>
              <Badge variant="outline">{pt1.pass_threshold}%</Badge>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{completed_simulations} simulations</span>
            </div>
          </div>

          {/* Readiness Interpretation */}
          <Alert className={
            displayStatus === 'confident_pass' || displayStatus === 'likely_pass' 
              ? 'border-green-500/50 bg-green-950/10' 
              : displayStatus === 'approaching_readiness'
              ? 'border-yellow-500/50 bg-yellow-950/10'
              : 'border-red-500/50 bg-red-950/10'
          }>
            <StatusIcon className={`h-4 w-4 ${getStatusColor(displayStatus)}`} />
            <AlertDescription>
              <strong>{getStatusLabel(displayStatus)}:</strong> {isDomainScoped 
                ? `Your performance in ${scopedSections.map(s => formatSectionName(s.section)).join(' + ')} shows ${displayScore >= pt1.pass_threshold ? 'strong competence' : 'developing skills'}. ${displayScore >= pt1.pass_threshold ? 'Continue practicing to maintain proficiency.' : 'Complete more drills to build confidence.'}` 
                : pt1.interpretation}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* PT1 Exam Sections Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isDomainScoped ? 'Assessed Sections' : 'PT1 Exam Sections'}
          </CardTitle>
          <CardDescription>
            {isDomainScoped 
              ? `Sections practiced in this ${drillScope.drillType.toUpperCase()} drill` 
              : 'Performance in each of the three exam sections'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {scopedSections && scopedSections.length > 0 ? (
              scopedSections.map((section) => {
                const sectionIcon = 
                  section.section === 'web_application_testing' ? Zap :
                  section.section === 'network_security_testing' ? Activity :
                  Flame;
                const SectionIcon = sectionIcon;
                
                return (
                  <div key={section.section} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SectionIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {formatSectionName(section.section)}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {section.weight}% of exam
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {section.status === 'insufficient_evidence' || section.status === 'needs_more_drills' ? (
                          <Badge variant="secondary" className="text-xs">
                            {getSectionStatusDisplay(section.status, section.evidence_count)}
                          </Badge>
                        ) : (
                          <>
                            <span className={`font-bold text-sm ${getScoreColor(section.score)}`}>
                              {section.score}%
                            </span>
                            <Badge 
                              variant={
                                section.score >= pt1.pass_threshold ? 'default' : 
                                section.score >= 40 ? 'secondary' : 
                                'destructive'
                              }
                              className="text-xs"
                            >
                              {getStatusLabel(section.status)}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={section.score} 
                      className={`h-2 ${
                        section.status === 'insufficient_evidence' || section.status === 'needs_more_drills'
                          ? 'opacity-40'
                          : ''
                      }`} 
                    />
                    {section.evidence_count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Evidence: {section.evidence_count} drills completed
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                {isDomainScoped 
                  ? 'No sections assessed in this drill scope' 
                  : 'Complete drills to track PT1 exam section readiness'}
              </div>
            )}
            
            {/* Show unassessed sections if domain-scoped */}
            {isDomainScoped && pt1.sections.filter(s => !drillScope.sectionsPracticed.includes(s.section)).length > 0 && (
              <div className="border-t border-border/40 pt-4 mt-4">
                <div className="text-xs text-muted-foreground mb-3">
                  Other PT1 Sections (not assessed in this drill):
                </div>
                <div className="space-y-2">
                  {pt1.sections.filter(s => !drillScope.sectionsPracticed.includes(s.section)).map((section) => (
                    <div key={section.section} className="flex items-center justify-between opacity-50">
                      <span className="text-xs">{formatSectionName(section.section)}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {section.score}% (global)
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Focus Areas - Section-Based */}
      {certStore.focus_areas && certStore.focus_areas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Focus Areas
            </CardTitle>
            <CardDescription>
              PT1 exam sections needing targeted practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {certStore.focus_areas.slice(0, 3).map((area, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-border/40 p-3"
                >
                  <Badge
                    variant={
                      area.priority === 'high'
                        ? 'destructive'
                        : area.priority === 'medium'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="mt-0.5"
                  >
                    {area.priority}
                  </Badge>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="font-medium text-sm">
                        {formatSectionName(area.section)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {area.rationale}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <strong>Practice:</strong> {area.specific_improvement}
                    </div>
                    {area.practice_opportunities && area.practice_opportunities.length > 0 && (
                      <div className="space-y-1">
                        {area.practice_opportunities.map((opp, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="text-primary">•</span>
                            <span>{opp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Training - Section-Based */}
      {certStore.recommended_training && certStore.recommended_training.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Recommended Training
            </CardTitle>
            <CardDescription>
              Drills aligned with PT1 exam sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {certStore.recommended_training.slice(0, 5).map((training, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-border/40 p-3"
                >
                  <Badge
                    variant={
                      training.priority === 'high'
                        ? 'destructive'
                        : training.priority === 'medium'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="mt-0.5"
                  >
                    {training.priority}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {formatSectionName(training.section)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {training.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
