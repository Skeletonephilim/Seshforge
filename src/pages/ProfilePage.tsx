import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { table } from '@devvai/devv-code-backend';
import { 
  User, Terminal, Flame, Target, Brain, 
  Save, AlertTriangle, TrendingUp, Book 
} from 'lucide-react';

interface UserProfile {
  profileId: string;
  learningStyle: string;
  philosophy: string;
  primaryEnvironment: string;
  secondaryEnvironment: string;
  shellPreference: string;
  packageManager: string;
  trainingPreference: string;
  primaryGoal: string;
  secondaryGoals: string;
  longTermGoal: string;
  burnoutThreshold: number;
  trainingTimeToday: number;
  lastTrainingDate: string;
  motivationLayer: string;
}

const TABLE_ID = 'ff3k17119szk';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    profileId: 'ulysses_vagabond_hacker',
    learningStyle: 'embodied_learning',
    philosophy: JSON.stringify([
      'autonomy',
      'embodied_knowledge',
      'refusal_of_domination',
      'beauty_in_technical_systems',
      'experimentation_through_failure'
    ]),
    primaryEnvironment: 'linux_mint_blackarch',
    secondaryEnvironment: 'kali_linux',
    shellPreference: 'zsh',
    packageManager: 'pacman',
    trainingPreference: JSON.stringify({
      method: 'hands_on',
      emphasis: [
        'workflow_mastery',
        'failure_based_learning',
        'command_repetition'
      ]
    }),
    primaryGoal: 'PT1',
    secondaryGoals: JSON.stringify(['SEC0', 'SEC1']),
    longTermGoal: 'independent_pentesting',
    burnoutThreshold: 5,
    trainingTimeToday: 0,
    lastTrainingDate: new Date().toISOString(),
    motivationLayer: JSON.stringify({
      core_values: [
        'digital_sovereignty',
        'independent_pentesting',
        'portable_hacking_lab',
        'nomadic_life'
      ],
      philosophy: 'hacking_as_language_exploration'
    })
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await table.getItems(TABLE_ID, {
        query: { _uid: user.uid },
        limit: 1
      });

      if (result.items && result.items.length > 0) {
        setProfile(result.items[0] as UserProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Profile Load Error",
        description: "Using default profile settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      
      // Check if profile exists
      const existing = await table.getItems(TABLE_ID, {
        query: { _uid: user.uid },
        limit: 1
      });

      if (existing.items && existing.items.length > 0) {
        // Update existing profile
        await table.updateItem(TABLE_ID, {
          _uid: user.uid,
          _id: existing.items[0]._id,
          ...profile
        });
      } else {
        // Create new profile
        await table.addItem(TABLE_ID, {
          _uid: user.uid,
          ...profile
        });
      }

      toast({
        title: "Profile Saved",
        description: "Your learning profile has been updated successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Terminal className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 bg-card/30 backdrop-blur">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Learning Profile</h1>
          </div>
          <p className="text-muted-foreground">
            Configure your training environment, learning style, and personal goals
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="learning" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="learning">
              <Brain className="h-4 w-4 mr-2" />
              Learning Style
            </TabsTrigger>
            <TabsTrigger value="environment">
              <Terminal className="h-4 w-4 mr-2" />
              Environment
            </TabsTrigger>
            <TabsTrigger value="goals">
              <Target className="h-4 w-4 mr-2" />
              Goals
            </TabsTrigger>
            <TabsTrigger value="burnout">
              <Flame className="h-4 w-4 mr-2" />
              Burnout
            </TabsTrigger>
          </TabsList>

          {/* Learning Style Tab */}
          <TabsContent value="learning" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Learning Philosophy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your learning profile adapts all training modules to match your preferred learning approach
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="learningStyle">Learning Style</Label>
                  <Select 
                    value={profile.learningStyle} 
                    onValueChange={(value) => updateField('learningStyle', value)}
                  >
                    <SelectTrigger id="learningStyle">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="embodied_learning">Embodied Learning (Muscle Memory)</SelectItem>
                      <SelectItem value="visual_learning">Visual Learning</SelectItem>
                      <SelectItem value="theoretical_learning">Theoretical Learning</SelectItem>
                      <SelectItem value="kinesthetic_learning">Kinesthetic Learning</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Embodied learning emphasizes command-line repetition and workflow mastery
                  </p>
                </div>

                <div>
                  <Label htmlFor="profileId">Profile Identifier</Label>
                  <Input
                    id="profileId"
                    value={profile.profileId}
                    onChange={(e) => updateField('profileId', e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label>Training Emphasis</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['workflow_mastery', 'failure_based_learning', 'command_repetition', 'theory_first'].map(emphasis => (
                      <Card 
                        key={emphasis}
                        className="p-3 cursor-pointer hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Book className="h-4 w-4 text-primary" />
                          <span className="text-sm font-mono">
                            {emphasis.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Core Philosophy</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      'autonomy',
                      'embodied_knowledge',
                      'experimentation_through_failure',
                      'beauty_in_technical_systems'
                    ].map(phil => (
                      <Card key={phil} className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span className="text-sm font-mono">
                            {phil.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Environment Tab */}
          <TabsContent value="environment" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Hardware Environment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure your lab setup so commands are generated for your specific environment
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="primaryEnvironment">Primary Environment</Label>
                  <Select 
                    value={profile.primaryEnvironment} 
                    onValueChange={(value) => updateField('primaryEnvironment', value)}
                  >
                    <SelectTrigger id="primaryEnvironment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linux_mint_blackarch">Linux Mint + BlackArch (distrobox)</SelectItem>
                      <SelectItem value="kali_linux">Kali Linux</SelectItem>
                      <SelectItem value="parrot_os">Parrot OS</SelectItem>
                      <SelectItem value="arch_linux">Arch Linux</SelectItem>
                      <SelectItem value="ubuntu">Ubuntu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="secondaryEnvironment">Secondary Environment (GUI Tools)</Label>
                  <Select 
                    value={profile.secondaryEnvironment} 
                    onValueChange={(value) => updateField('secondaryEnvironment', value)}
                  >
                    <SelectTrigger id="secondaryEnvironment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kali_linux">Kali Linux Laptop</SelectItem>
                      <SelectItem value="parrot_os">Parrot OS</SelectItem>
                      <SelectItem value="windows_wsl">Windows WSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for Burp Suite, Wireshark, and other GUI-heavy tools
                  </p>
                </div>

                <div>
                  <Label htmlFor="shellPreference">Shell Preference</Label>
                  <Select 
                    value={profile.shellPreference} 
                    onValueChange={(value) => updateField('shellPreference', value)}
                  >
                    <SelectTrigger id="shellPreference">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zsh">Zsh</SelectItem>
                      <SelectItem value="bash">Bash</SelectItem>
                      <SelectItem value="fish">Fish</SelectItem>
                      <SelectItem value="sh">Sh</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="packageManager">Package Manager</Label>
                  <Select 
                    value={profile.packageManager} 
                    onValueChange={(value) => updateField('packageManager', value)}
                  >
                    <SelectTrigger id="packageManager">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pacman">Pacman (Arch/BlackArch)</SelectItem>
                      <SelectItem value="apt">APT (Debian/Ubuntu/Kali)</SelectItem>
                      <SelectItem value="dnf">DNF (Fedora)</SelectItem>
                      <SelectItem value="yum">YUM (RHEL/CentOS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Card className="p-4 bg-muted/30">
                  <h4 className="font-semibold mb-2">Environment Entry Command</h4>
                  <code className="text-sm text-primary font-mono">
                    {profile.primaryEnvironment === 'linux_mint_blackarch' 
                      ? 'distrobox enter arch -- zsh'
                      : `${profile.shellPreference}`
                    }
                  </code>
                </Card>
              </div>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Certification Goals</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Define your certification targets to receive personalized training paths
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="primaryGoal">Primary Certification Goal</Label>
                  <Select 
                    value={profile.primaryGoal} 
                    onValueChange={(value) => updateField('primaryGoal', value)}
                  >
                    <SelectTrigger id="primaryGoal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEC0">SEC0 (Security Fundamentals)</SelectItem>
                      <SelectItem value="SEC1">SEC01 (Cyber Security 101)</SelectItem>
                      <SelectItem value="PT1">PT1 (Junior Penetration Tester)</SelectItem>
                      <SelectItem value="PT2">PT2 (Senior Penetration Tester)</SelectItem>
                      <SelectItem value="OSCP">OSCP</SelectItem>
                      <SelectItem value="CEH">CEH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="longTermGoal">Long-Term Goal</Label>
                  <Input
                    id="longTermGoal"
                    value={profile.longTermGoal}
                    onChange={(e) => updateField('longTermGoal', e.target.value)}
                    placeholder="e.g., independent pentesting, red team operator"
                  />
                </div>

                <div>
                  <Label>Motivation & Philosophy</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      'digital_sovereignty',
                      'independent_pentesting',
                      'portable_hacking_lab',
                      'nomadic_life'
                    ].map(motivation => (
                      <Card key={motivation} className="p-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span className="text-sm font-mono">
                            {motivation.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Your personal motivations help the AI align training with your long-term vision
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Burnout Prevention Tab */}
          <TabsContent value="burnout" className="space-y-6">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4">Burnout Prevention</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Set training limits to maintain sustainable learning and prevent burnout
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="burnoutThreshold">Daily Training Limit (hours)</Label>
                  <Input
                    id="burnoutThreshold"
                    type="number"
                    min="1"
                    max="12"
                    value={profile.burnoutThreshold}
                    onChange={(e) => updateField('burnoutThreshold', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll receive a warning when training exceeds this limit
                  </p>
                </div>

                <Card className="p-4 bg-amber-500/10 border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-500 mb-1">Burnout Detection Active</h4>
                      <p className="text-sm text-muted-foreground">
                        When you exceed {profile.burnoutThreshold} hours of training, the system will:
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                        <li>Suggest taking a break</li>
                        <li>Recommend teaching concepts to others</li>
                        <li>Propose documentation in Obsidian</li>
                        <li>Encourage peer discussion</li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        "Teaching reinforces knowledge retention better than continued practice"
                      </p>
                    </div>
                  </div>
                </Card>

                <div>
                  <Label>Training Time Today</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ 
                          width: `${Math.min((profile.trainingTimeToday || 0) / 60 / (profile.burnoutThreshold || 5) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono">
                      {Math.floor((profile.trainingTimeToday || 0) / 60)} / {profile.burnoutThreshold}h
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={saveProfile} 
            disabled={saving}
            size="lg"
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
}
