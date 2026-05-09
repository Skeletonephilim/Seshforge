import { useEffect, useState, useMemo } from 'react';
import { useProgressStore } from '@/store/progress-store';
import { useCertificationStore } from '@/store/certification-store';
import { useDrillSessionStore } from '@/store/drill-session-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  Target, 
  Zap, 
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Flame,
  Trophy,
  Download,
  Upload,
} from 'lucide-react';
import { exportDrillReportToMarkdown, downloadMarkdownFile, readMarkdownFile, importDrillReportFromMarkdown, DrillReportData } from '@/lib/drill-report-markdown';
import { useToast } from '@/hooks/use-toast';

// Time period selector
type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all';

interface DailyStats {
  date: string;
  drills: number;
  hours: number;
  score: number;
  simulationsCompleted: number;
}

interface WeeklyStats {
  week: string;
  drills: number;
  modules: number;
  labs: number;
  hours: number;
  avgScore: number;
  streak: number;
}

export default function AnalyticsDashboardPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const progressStore = useProgressStore();
  const certStore = useCertificationStore();
  const drillStore = useDrillSessionStore();

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          progressStore.loadFromDatabase(),
          certStore.loadFromDatabase(),
          drillStore.loadUserSessions(),
        ]);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate time series data for charts
  const timeSeriesData = useMemo(() => {
    const history = certStore.simulation_history || [];
    
    // Group by date
    const dailyData: Record<string, DailyStats> = {};
    
    history.forEach((sim) => {
      const date = sim.date.split('T')[0]; // Get YYYY-MM-DD
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          drills: 0,
          hours: 0,
          score: 0,
          simulationsCompleted: 0,
        };
      }
      
      dailyData[date].simulationsCompleted += 1;
      dailyData[date].score += sim.score;
      dailyData[date].hours += 0.5; // Estimate 30 min per simulation
    });
    
    // Calculate averages
    Object.values(dailyData).forEach((day) => {
      if (day.simulationsCompleted > 0) {
        day.score = Math.round(day.score / day.simulationsCompleted);
      }
    });
    
    return Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [certStore.simulation_history]);

  // Filter data by time period
  const filteredData = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timePeriod) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return timeSeriesData;
    }
    
    return timeSeriesData.filter((d) => new Date(d.date) >= cutoffDate);
  }, [timeSeriesData, timePeriod]);

  // Calculate trends
  const trends = useMemo(() => {
    if (filteredData.length < 2) {
      return { score: 0, hours: 0, drills: 0 };
    }
    
    const halfPoint = Math.floor(filteredData.length / 2);
    const firstHalf = filteredData.slice(0, halfPoint);
    const secondHalf = filteredData.slice(halfPoint);
    
    const avgScore1 = firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length;
    const avgScore2 = secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length;
    
    const avgHours1 = firstHalf.reduce((sum, d) => sum + d.hours, 0) / firstHalf.length;
    const avgHours2 = secondHalf.reduce((sum, d) => sum + d.hours, 0) / secondHalf.length;
    
    const avgDrills1 = firstHalf.reduce((sum, d) => sum + d.simulationsCompleted, 0) / firstHalf.length;
    const avgDrills2 = secondHalf.reduce((sum, d) => sum + d.simulationsCompleted, 0) / secondHalf.length;
    
    return {
      score: ((avgScore2 - avgScore1) / avgScore1) * 100,
      hours: ((avgHours2 - avgHours1) / avgHours1) * 100,
      drills: ((avgDrills2 - avgDrills1) / avgDrills1) * 100,
    };
  }, [filteredData]);

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (trend < -5) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 5) return 'text-green-500';
    if (trend < -5) return 'text-red-500';
    return 'text-muted-foreground';
  };

  // Weekly aggregation
  const weeklyData = useMemo(() => {
    const weeks: Record<string, WeeklyStats> = {};
    
    filteredData.forEach((day) => {
      const date = new Date(day.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          week: weekKey,
          drills: 0,
          modules: 0,
          labs: 0,
          hours: 0,
          avgScore: 0,
          streak: 0,
        };
      }
      
      weeks[weekKey].drills += day.simulationsCompleted;
      weeks[weekKey].hours += day.hours;
      weeks[weekKey].avgScore += day.score;
    });
    
    // Calculate averages
    Object.values(weeks).forEach((week) => {
      const dayCount = filteredData.filter((d) => {
        const date = new Date(d.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0] === week.week;
      }).length;
      
      if (dayCount > 0) {
        week.avgScore = Math.round(week.avgScore / dayCount);
      }
    });
    
    return Object.values(weeks).sort((a, b) => 
      new Date(a.week).getTime() - new Date(b.week).getTime()
    );
  }, [filteredData]);

  // Domain progress over time
  const domainProgress = useMemo(() => {
    return Object.entries(certStore.domain_scores).map(([domain, score]) => ({
      domain: domain.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      score: Math.round(score),
      change: 0, // TODO: Calculate change from previous period
    }));
  }, [certStore.domain_scores]);

  // Import drill report handler
  const importDrillReport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const markdown = await readMarkdownFile(file);
      const reportData = importDrillReportFromMarkdown(markdown);
      
      if (!reportData) {
        toast({
          title: 'Import Failed',
          description: 'Could not parse drill report. Please ensure it\'s a valid SeshForge export.',
          variant: 'destructive',
        });
        return;
      }
      
      // Check for conflicts with existing data
      const existingSimulation = certStore.simulation_history.find(
        s => s.date === reportData.date
      );
      
      if (existingSimulation) {
        const confirmed = window.confirm(
          `A simulation from ${new Date(reportData.date).toLocaleString()} already exists. ` +
          'Import anyway? (This will add to your training history)'
        );
        if (!confirmed) return;
      }
      
      // Restore discovered information and metrics to certification store
      await certStore.updateAfterSimulation({
        difficulty: reportData.difficulty,
        commands: reportData.commands.map(c => ({
          command: c.command,
          phase: c.phase,
          correct: true, // Imported commands assumed completed
        })),
        evaluation: {
          reconScore: reportData.performance.reconScore,
          scanningScore: reportData.performance.scanningScore,
          enumerationScore: reportData.performance.enumerationScore,
          exploitationScore: reportData.performance.exploitationScore,
          privescScore: reportData.performance.privescScore,
          methodologyScore: reportData.performance.methodologyScore,
          overallScore: reportData.performance.overallScore,
        },
        flags_captured: reportData.discoveredInfo.flags.length,
        hints_used: reportData.hintsUsed,
        missed_steps: reportData.mistakesIdentified,
        domains_practiced: reportData.domainsPracticed,
        discovered_info: reportData.discoveredInfo,
      });
      
      // Update progress store with training time
      progressStore.addTrainingHours(reportData.timeSpentSeconds / 3600);
      
      // Reload all data to reflect changes
      await Promise.all([
        progressStore.loadFromDatabase(),
        certStore.loadFromDatabase(),
        drillStore.loadUserSessions(),
      ]);
      
      toast({
        title: 'Report Imported Successfully',
        description: `Restored ${reportData.commands.length} commands, ${reportData.discoveredInfo.credentials.length} credentials, ${reportData.discoveredInfo.flags.length} flags. Analytics updated.`,
      });
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Error',
        description: 'Failed to import drill report. Please check the file format.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Training Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your progress, identify trends, and optimize your pentesting training
          </p>
        </div>
        
        {/* Import Button & Time Period Selector */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".md"
            onChange={importDrillReport}
            className="hidden"
            id="analytics-import-drill-report"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('analytics-import-drill-report')?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import Report
          </Button>
          
          <Button
            variant={timePeriod === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('week')}
          >
            Week
          </Button>
          <Button
            variant={timePeriod === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('month')}
          >
            Month
          </Button>
          <Button
            variant={timePeriod === 'quarter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('quarter')}
          >
            Quarter
          </Button>
          <Button
            variant={timePeriod === 'year' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('year')}
          >
            Year
          </Button>
          <Button
            variant={timePeriod === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimePeriod('all')}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Readiness */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Overall Readiness
              <Trophy className="w-4 h-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{certStore.overall_score}%</div>
            <Progress value={certStore.overall_score} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {certStore.overall_score >= 70 ? 'Advanced' : 
               certStore.overall_score >= 40 ? 'Intermediate' : 'Beginner'}
            </p>
          </CardContent>
        </Card>

        {/* Total Training Hours */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Training Hours
              <Calendar className="w-4 h-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-baseline gap-2">
              {progressStore.totalTrainingHours.toFixed(1)}
              <span className="text-sm font-normal flex items-center gap-1 {getTrendColor(trends.hours)}">
                {getTrendIcon(trends.hours)}
                {Math.abs(trends.hours).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {progressStore.isAtRisk && (
                <span className="flex items-center gap-1 text-orange-500">
                  <AlertTriangle className="w-3 h-3" />
                  Burnout risk detected
                </span>
              )}
              {!progressStore.isAtRisk && 'Healthy training pace'}
            </p>
          </CardContent>
        </Card>

        {/* Completed Simulations */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Simulations
              <Target className="w-4 h-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-baseline gap-2">
              {certStore.completed_simulations}
              <span className="text-sm font-normal flex items-center gap-1 {getTrendColor(trends.drills)}">
                {getTrendIcon(trends.drills)}
                {Math.abs(trends.drills).toFixed(0)}%
              </span>
            </div>
            {/* Removed avg_simulation_score - not meaningful. Use PT1 weighted score instead */}
          </CardContent>
        </Card>

        {/* Daily Streak */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Daily Streak
              <Flame className="w-4 h-4 text-orange-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-baseline gap-2">
              {progressStore.dailyStreak}
              <span className="text-sm font-normal text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {progressStore.dailyStreak >= 7 ? '🔥 On fire!' : 
               progressStore.dailyStreak >= 3 ? 'Keep it up!' : 'Build consistency'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Daily Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Daily Activity
              </CardTitle>
              <CardDescription>
                Simulations completed and average scores over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No training data for selected period</p>
                  <p className="text-sm mt-2">Complete simulations to see your progress</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Simple bar chart visualization */}
                  <div className="space-y-2">
                    {filteredData.slice(-14).map((day) => (
                      <div key={day.date} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {new Date(day.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {day.simulationsCompleted} sims
                            </span>
                            <Badge variant="outline" className="min-w-[60px] justify-center">
                              {day.score}%
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300"
                              style={{ 
                                width: `${Math.min(100, (day.simulationsCompleted / Math.max(...filteredData.map(d => d.simulationsCompleted))) * 100)}%` 
                              }}
                            />
                          </div>
                          <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-300"
                              style={{ width: `${day.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-primary rounded" />
                      <span className="text-sm text-muted-foreground">Activity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded" />
                      <span className="text-sm text-muted-foreground">Score</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Performance Modifier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(progressStore.performanceModifier * 100).toFixed(0)}%
                </div>
                <Progress 
                  value={progressStore.performanceModifier * 100} 
                  className="mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Success rate: {progressStore.totalAttempts > 0 
                    ? Math.round((progressStore.successfulAttempts / progressStore.totalAttempts) * 100)
                    : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {drillStore.totalSessions > 0 
                    ? Math.round((drillStore.completedSessions / drillStore.totalSessions) * 100)
                    : 0}%
                </div>
                <Progress 
                  value={drillStore.totalSessions > 0 
                    ? (drillStore.completedSessions / drillStore.totalSessions) * 100
                    : 0
                  } 
                  className="mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {drillStore.completedSessions} of {drillStore.totalSessions} sessions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Average Session Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(drillStore.averageScore)}%
                </div>
                <Progress 
                  value={drillStore.averageScore} 
                  className="mt-2" 
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Across all completed drills
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Proficiency</CardTitle>
              <CardDescription>
                Your skill level across 8 pentesting certification domains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {domainProgress.map((domain) => (
                  <div key={domain.domain} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{domain.domain}</span>
                      <Badge variant={domain.score >= 70 ? 'default' : domain.score >= 40 ? 'secondary' : 'destructive'}>
                        {domain.score}%
                      </Badge>
                    </div>
                    <Progress value={domain.score} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Focus Areas */}
          {certStore.focus_areas && certStore.focus_areas.length > 0 && (
            <Card className="border-orange-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Focus Areas
                </CardTitle>
                <CardDescription>
                  Domains that need additional practice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {certStore.focus_areas.slice(0, 5).map((focusArea, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Badge variant={focusArea.priority === 'high' ? 'destructive' : 'secondary'}>
                        {focusArea.priority}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{focusArea.domain.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {focusArea.specific_improvement}
                        </p>
                        {focusArea.rationale && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {focusArea.rationale}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Weekly Tab */}
        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Summary</CardTitle>
              <CardDescription>
                Training activity aggregated by week
              </CardDescription>
            </CardHeader>
            <CardContent>
              {weeklyData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No weekly data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {weeklyData.map((week) => (
                    <Card key={week.week} className="border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">
                              Week of {new Date(week.week).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Average score: {week.avgScore}%
                            </p>
                          </div>
                          <Badge variant="outline" className="text-lg">
                            {week.avgScore}%
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Drills</p>
                            <p className="text-2xl font-bold">{week.drills}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Hours</p>
                            <p className="text-2xl font-bold">{week.hours.toFixed(1)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Modules</p>
                            <p className="text-2xl font-bold">{week.modules}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Labs</p>
                            <p className="text-2xl font-bold">{week.labs}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technical Skills</CardTitle>
              <CardDescription>
                Proficiency in specific pentesting tools and techniques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(certStore.technical_skills).map(([skill, score]) => (
                  <div key={skill} className="space-y-2 p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {skill.replace(/_/g, ' ')}
                      </span>
                      <Badge 
                        variant={Math.round(score) >= 70 ? 'default' : 
                                Math.round(score) >= 40 ? 'secondary' : 'destructive'}
                      >
                        {Math.round(score)}%
                      </Badge>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Methodology Efficiency */}
          {certStore.methodology_efficiency && (
            <Card>
              <CardHeader>
                <CardTitle>Methodology Efficiency</CardTitle>
                <CardDescription>
                  How effectively you follow pentesting methodologies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <span className="text-sm font-medium">Proper Tool Usage</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={certStore.methodology_efficiency.proper_tool_usage} 
                        className="w-32" 
                      />
                      <Badge variant="outline">
                        {certStore.methodology_efficiency.proper_tool_usage}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <span className="text-sm font-medium">Unnecessary Commands</span>
                    <Badge variant="destructive">
                      {certStore.methodology_efficiency.unnecessary_commands}
                    </Badge>
                  </div>
                  
                  {certStore.methodology_efficiency.missed_enumeration_steps.length > 0 && (
                    <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <p className="text-sm font-medium mb-2">Missed Enumeration Steps</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {certStore.methodology_efficiency.missed_enumeration_steps.slice(0, 5).map((step, idx) => (
                          <li key={idx}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Recent Simulation History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Simulations</CardTitle>
          <CardDescription>
            Your last 10 completed training sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certStore.simulation_history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No simulation history yet</p>
              <p className="text-sm mt-2">Complete your first simulation to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {certStore.simulation_history.slice(0, 10).map((sim, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={sim.difficulty === 'advanced' ? 'destructive' : 
                                    sim.difficulty === 'intermediate' ? 'secondary' : 'outline'}>
                        {sim.difficulty}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(sim.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {sim.domains_practiced.map((domain, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {domain.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="text-lg font-bold">{sim.score}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Flags</p>
                      <p className="text-lg font-bold">{sim.flags_captured}/2</p>
                    </div>
                    {sim.hints_used > 0 && (
                      <Badge variant="secondary">{sim.hints_used} hints</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
