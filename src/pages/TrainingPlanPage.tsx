import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { table, DevvAI } from '@devvai/devv-code-backend';
import ReactMarkdown from 'react-markdown';
import { 
  Calendar, Flame, Target, Clock, TrendingUp, 
  AlertTriangle, BookOpen, Users, FileText, Sparkles,
  Download, CheckCircle2, Play
} from 'lucide-react';

interface TrainingPlan {
  date: string;
  modules: string[];
  drills: string[];
  labs: string[];
  estimatedHours: number;
  difficulty: string;
  focus: string;
  burnoutRisk: boolean;
}

interface UserProfile {
  burnoutThreshold: number;
  trainingTimeToday: number;
  primaryGoal: string;
  learningStyle: string;
}

const PROFILE_TABLE_ID = 'ff3k17119szk';
const PLANS_TABLE_ID = 'ff3csua8ncoy';

export default function TrainingPlanPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [planMarkdown, setPlanMarkdown] = useState('');
  const [savedPlans, setSavedPlans] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load user profile
      const profileResult = await table.getItems(PROFILE_TABLE_ID, {
        query: { _uid: user.uid },
        limit: 1
      });
      if (profileResult.items && profileResult.items.length > 0) {
        setProfile(profileResult.items[0] as UserProfile);
      }

      // Load saved plans
      const plansResult = await table.getItems(PLANS_TABLE_ID, {
        query: { _uid: user.uid },
        limit: 10,
        sort: '_id',
        order: 'desc'
      });
      if (plansResult.items) {
        setSavedPlans(plansResult.items);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async () => {
    if (!user || !profile) {
      toast({
        title: "Profile Required",
        description: "Please set up your profile first",
        variant: "destructive"
      });
      return;
    }

    try {
      setGenerating(true);
      setPlanMarkdown('');

      const today = new Date().toLocaleDateString();
      const trainingHoursToday = (profile.trainingTimeToday || 0) / 60;
      const hoursRemaining = profile.burnoutThreshold - trainingHoursToday;

      const burnoutWarning = hoursRemaining <= 2;

      const prompt = `Generate a personalized daily pentesting training plan for today (${today}).

User Profile:
- Primary Goal: ${profile.primaryGoal}
- Learning Style: ${profile.learningStyle}
- Training Time Today: ${trainingHoursToday.toFixed(1)} hours
- Daily Limit: ${profile.burnoutThreshold} hours
- Hours Remaining: ${hoursRemaining.toFixed(1)} hours

${burnoutWarning ? `
⚠️ BURNOUT RISK DETECTED
User has already trained ${trainingHoursToday.toFixed(1)} hours today. Recommend:
- Light review activities
- Documentation in Obsidian
- Teaching concepts to peers
- Rest and reflection
DO NOT suggest intense drills or new material.
` : ''}

Generate a training plan in Markdown format with these sections:

# Daily Training Plan - ${today}

## 🎯 Focus Area
[Primary skill to develop today]

## ⏱️ Time Allocation
[Breakdown of activities and time]

## 📚 Module Study (Theory)
[1-2 modules to study, with key concepts]

## 💻 Command Drills (Muscle Memory)
[Specific commands to practice repeatedly]

## 🔬 Lab Exercises
[Hands-on scenarios to work through]

## 🎓 Methodology Practice
[PTES phases to focus on]

## 📝 Documentation Tasks
[What to document in Obsidian]

${burnoutWarning ? `
## 🔥 Burnout Prevention
[Active rest suggestions - teaching, writing, discussion]
` : ''}

## ✅ Success Criteria
[How to know the day was productive]

Make recommendations practical, achievable, and aligned with embodied learning philosophy.
Focus on workflow mastery and command-line muscle memory.`;

      let fullResponse = '';

      const ai = new DevvAI();

      const response = await ai.chat.completions.create({
        model: 'kimi-k2-0711-preview',
        messages: [
          { role: 'system', content: 'You are an expert pentesting instructor specializing in PT1 certification preparation. You understand embodied learning and command-line muscle memory training.' },
          { role: 'user', content: prompt }
        ],
        stream: true,
        max_tokens: 2000
      });

      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        setPlanMarkdown(fullResponse);
      }

      // Save the plan
      await table.addItem(PLANS_TABLE_ID, {
        _uid: user.uid,
        date: today,
        plan: fullResponse,
        hoursRemaining,
        burnoutRisk: burnoutWarning,
        completed: false
      });

      toast({
        title: "Training Plan Generated",
        description: "Your personalized plan is ready",
      });

      // Reload saved plans
      loadData();
    } catch (error) {
      console.error('Error generating plan:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate training plan",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const markPlanComplete = async (planId: string) => {
    if (!user) return;
    
    try {
      await table.updateItem(PLANS_TABLE_ID, {
        _uid: user.uid,
        _id: planId,
        completed: true
      });

      toast({
        title: "Plan Completed",
        description: "Great work! Keep up the momentum.",
      });

      loadData();
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const exportMarkdown = () => {
    if (!planMarkdown) return;

    const blob = new Blob([planMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-plan-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Training plan saved as Markdown",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading training data...</p>
        </div>
      </div>
    );
  }

  const trainingHoursToday = profile ? (profile.trainingTimeToday || 0) / 60 : 0;
  const hoursRemaining = profile ? profile.burnoutThreshold - trainingHoursToday : 0;
  const burnoutRisk = hoursRemaining <= 2;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Daily Training Plan</h1>
          </div>
          <p className="text-muted-foreground">
            AI-generated personalized training schedule with burnout prevention
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Burnout Status */}
        {profile && (
          <Card className={`p-6 mb-6 ${burnoutRisk ? 'bg-amber-500/10 border-amber-500/30' : ''}`}>
            <div className="flex items-start gap-4">
              <Flame className={`h-6 w-6 flex-shrink-0 ${burnoutRisk ? 'text-amber-500' : 'text-primary'}`} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  {burnoutRisk ? '⚠️ Burnout Risk Detected' : '✅ Training Status: Healthy'}
                </h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        burnoutRisk ? 'bg-amber-500' : 'bg-primary'
                      }`}
                      style={{ 
                        width: `${Math.min(trainingHoursToday / (profile.burnoutThreshold || 5) * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-mono">
                    {trainingHoursToday.toFixed(1)} / {profile.burnoutThreshold}h
                  </span>
                </div>
                {burnoutRisk ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-amber-500">
                      You've trained {trainingHoursToday.toFixed(1)} hours today. Consider these alternatives:
                    </p>
                    <ul className="space-y-1 ml-4">
                      <li className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Teach pentesting concepts to peers (reinforces learning)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Document your learnings in Obsidian</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>Review previous writeups and notes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Take a break - sustainable learning beats burnout</span>
                      </li>
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {hoursRemaining.toFixed(1)} hours remaining before burnout threshold. Keep up the great work! 🚀
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Plan
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="h-4 w-4 mr-2" />
              Plan History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card className="p-6">
              <div className="text-center space-y-4">
                <Target className="h-12 w-12 text-primary mx-auto" />
                <h3 className="text-xl font-semibold">Generate Today's Training Plan</h3>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Get a personalized training schedule based on your profile, current progress, 
                  and remaining training capacity for today
                </p>
                <Button 
                  onClick={generatePlan}
                  disabled={generating}
                  size="lg"
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {generating ? 'Generating Plan...' : 'Generate Plan'}
                </Button>
              </div>
            </Card>

            {planMarkdown && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Your Training Plan</h3>
                  <Button
                    onClick={exportMarkdown}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>

                <div className="prose prose-invert prose-pre:bg-muted prose-pre:border max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-3xl font-bold mt-6 mb-4 text-primary">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-2xl font-semibold mt-5 mb-3 text-foreground">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xl font-semibold mt-4 mb-2">{children}</h3>,
                      ul: ({ children }) => <ul className="space-y-2 my-4">{children}</ul>,
                      li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                      code: ({ children }) => <code className="text-primary font-mono text-sm bg-muted px-1 py-0.5 rounded">{children}</code>,
                      pre: ({ children }) => <pre className="p-4 rounded-lg overflow-x-auto">{children}</pre>,
                    }}
                  >
                    {planMarkdown}
                  </ReactMarkdown>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {savedPlans.length === 0 ? (
              <Card className="p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No training plans yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate your first plan to start tracking your progress
                </p>
              </Card>
            ) : (
              savedPlans.map((savedPlan) => (
                <Card key={savedPlan._id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{savedPlan.date}</h3>
                      <p className="text-sm text-muted-foreground">
                        {savedPlan.hoursRemaining?.toFixed(1) || 0}h remaining • 
                        {savedPlan.burnoutRisk ? ' ⚠️ Burnout risk' : ' ✅ Healthy'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {savedPlan.completed ? (
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => markPlanComplete(savedPlan._id)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{savedPlan.plan?.substring(0, 200) + '...'}</ReactMarkdown>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
