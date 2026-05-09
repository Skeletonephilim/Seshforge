import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Lightbulb, 
  Clock, 
  Target, 
  AlertCircle,
  CheckCircle2,
  Zap,
  TrendingUp
} from 'lucide-react';

interface MicroSimHintSystemProps {
  scenarioTitle: string;
  domain: string;
  objectives: string[];
  timeEstimateMinutes: number;
  elapsedSeconds: number;
  commandsExecuted: number;
  objectivesCompleted: number;
  totalObjectives: number;
  onHintUsed: (hintText: string, pointsCost: number) => void;
  hintsUsed: number;
}

interface ContextualHint {
  type: 'progress' | 'time' | 'stuck' | 'objective' | 'methodology';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  pointsCost: number;
}

export default function MicroSimHintSystem({
  scenarioTitle,
  domain,
  objectives,
  timeEstimateMinutes,
  elapsedSeconds,
  commandsExecuted,
  objectivesCompleted,
  totalObjectives,
  onHintUsed,
  hintsUsed,
}: MicroSimHintSystemProps) {
  const [contextualHints, setContextualHints] = useState<ContextualHint[]>([]);
  const [shownHintIds, setShownHintIds] = useState<Set<string>>(new Set());

  const timeRemainingSeconds = timeEstimateMinutes * 60 - elapsedSeconds;
  const progressPercentage = (objectivesCompleted / totalObjectives) * 100;
  const expectedProgress = (elapsedSeconds / (timeEstimateMinutes * 60)) * 100;

  // Generate contextual hints based on progress and time
  useEffect(() => {
    const hints: ContextualHint[] = [];

    // Time-based hints
    const timeUsedPercentage = (elapsedSeconds / (timeEstimateMinutes * 60)) * 100;
    
    if (timeUsedPercentage > 50 && progressPercentage < 30 && !shownHintIds.has('slow-progress')) {
      hints.push({
        type: 'time',
        severity: 'warning',
        title: 'Progress Check',
        message: `You're ${Math.round(timeUsedPercentage)}% through time but only ${Math.round(progressPercentage)}% complete. Focus on: ${getNextObjectiveHint(domain, objectivesCompleted, objectives)}`,
        pointsCost: 0, // Free time-based hint
      });
    }

    if (timeUsedPercentage > 75 && progressPercentage < 60 && !shownHintIds.has('critical-time')) {
      hints.push({
        type: 'time',
        severity: 'critical',
        title: '⚠️ Critical Time Pressure',
        message: `Only ${Math.floor(timeRemainingSeconds / 60)} minutes left! Prioritize: ${getCriticalNextStep(domain, objectivesCompleted)}`,
        pointsCost: 0, // Free critical time warning
      });
    }

    // Stuck detection (no progress)
    if (commandsExecuted > 5 && objectivesCompleted === 0 && !shownHintIds.has('stuck-start')) {
      hints.push({
        type: 'stuck',
        severity: 'warning',
        title: 'Getting Started',
        message: `Haven't completed first objective yet. Start with: ${getInitialStepHint(domain)}`,
        pointsCost: 3,
      });
    }

    if (commandsExecuted > 10 && objectivesCompleted < 2 && !shownHintIds.has('stuck-mid')) {
      hints.push({
        type: 'stuck',
        severity: 'warning',
        title: 'Methodology Check',
        message: `Many commands but limited progress. Common mistake: ${getCommonMistake(domain)}`,
        pointsCost: 5,
      });
    }

    // Objective-specific hints
    if (objectivesCompleted < totalObjectives && commandsExecuted > 3) {
      const nextObjectiveHint = getObjectiveSpecificHint(domain, objectivesCompleted, objectives);
      if (nextObjectiveHint && !shownHintIds.has(`objective-${objectivesCompleted}`)) {
        hints.push({
          type: 'objective',
          severity: 'info',
          title: `Next Objective Focus`,
          message: nextObjectiveHint,
          pointsCost: 5,
        });
      }
    }

    // Methodology hints (domain-specific)
    if (commandsExecuted > 2 && !shownHintIds.has('methodology')) {
      hints.push({
        type: 'methodology',
        severity: 'info',
        title: `${domain} Methodology`,
        message: getMethodologyReminder(domain),
        pointsCost: 3,
      });
    }

    setContextualHints(hints);
  }, [elapsedSeconds, commandsExecuted, objectivesCompleted, domain, objectives, timeEstimateMinutes, progressPercentage, totalObjectives, shownHintIds]);

  const useHint = (hint: ContextualHint) => {
    const hintId = `${hint.type}-${hint.title}`;
    setShownHintIds(prev => new Set(prev).add(hintId));
    onHintUsed(hint.message, hint.pointsCost);
  };

  // Helper functions for domain-specific guidance
  function getNextObjectiveHint(domain: string, completed: number, objectives: string[]): string {
    const nextObj = objectives[completed];
    if (!nextObj) return 'Review completed objectives';

    const domainHints: Record<string, string> = {
      'Reconnaissance & Enumeration': 'Start with nmap/masscan for ports, then enumerate services',
      'Web Application Testing': 'Use gobuster/ffuf for directory discovery, then test vulnerabilities',
      'Network Penetration Testing': 'Enumerate SMB/SSH with smbclient/ssh-audit, look for weak auth',
      'Active Directory': 'Start with LDAP enumeration (ldapsearch), then Kerberoasting (GetUserSPNs.py)',
      'Exploitation & Post-Exploitation': 'Check for SUID binaries (find -perm), sudo misconfigs (sudo -l)',
      'Reporting & Time Management': 'Document findings as you go, prioritize critical vulns',
    };

    return domainHints[domain] || 'Follow PTES methodology: recon → scan → enum → exploit';
  }

  function getCriticalNextStep(domain: string, completed: number): string {
    const criticalSteps: Record<string, string> = {
      'Reconnaissance & Enumeration': 'Fast: nmap -sV [target] for quick service enum',
      'Web Application Testing': 'Fast: Check robots.txt, common paths (/admin, /backup), then SQLi',
      'Network Penetration Testing': 'Fast: Test default creds, anonymous SMB/FTP access',
      'Active Directory': 'Fast: ldapsearch for users, GetUserSPNs.py for kerberoasting',
      'Exploitation & Post-Exploitation': 'Fast: sudo -l, find SUID, check cron jobs',
      'Reporting & Time Management': 'Fast: Screenshot critical findings, note CVEs',
    };

    return criticalSteps[domain] || 'Focus on highest impact objective first';
  }

  function getInitialStepHint(domain: string): string {
    const initialSteps: Record<string, string> = {
      'Reconnaissance & Enumeration': 'nmap -sV [target] to discover open ports and services',
      'Web Application Testing': 'Visit the website, check source code, run gobuster for directories',
      'Network Penetration Testing': 'Start with service enumeration: smbclient -L //[target] -N',
      'Active Directory': 'Begin with LDAP: ldapsearch -x -H ldap://[target] -b "dc=domain,dc=local"',
      'Exploitation & Post-Exploitation': 'Check sudo permissions: sudo -l, then search for SUID: find / -perm -4000 2>/dev/null',
      'Reporting & Time Management': 'Create findings template: Vulnerability | Impact | Evidence | Recommendation',
    };

    return initialSteps[domain] || 'Start with reconnaissance: nmap scan to identify attack surface';
  }

  function getCommonMistake(domain: string): string {
    const mistakes: Record<string, string> = {
      'Reconnaissance & Enumeration': 'Scanning too many ports slowly - use -p- only if needed',
      'Web Application Testing': 'Ignoring low-hanging fruit - check robots.txt, .git exposure first',
      'Network Penetration Testing': 'Not testing anonymous access - try null sessions before brute force',
      'Active Directory': 'Skipping Kerberoasting - GetUserSPNs.py finds crackable service accounts',
      'Exploitation & Post-Exploitation': 'Missing obvious sudo/SUID - always run sudo -l and find -perm early',
      'Reporting & Time Management': 'Over-documenting low-severity - focus on criticals/highs first',
    };

    return mistakes[domain] || 'Spending too much time on one attack vector - move laterally';
  }

  function getObjectiveSpecificHint(domain: string, completed: number, objectives: string[]): string | null {
    const nextObj = objectives[completed];
    if (!nextObj) return null;

    // Parse objective for hints
    if (nextObj.includes('port') || nextObj.includes('service')) {
      return 'Use nmap -sV -sC for service version detection and default scripts';
    }
    if (nextObj.includes('director') || nextObj.includes('path')) {
      return 'Try gobuster dir or ffuf with /usr/share/seclists/Discovery/Web-Content/common.txt';
    }
    if (nextObj.includes('SQL') || nextObj.includes('injection')) {
      return 'Test with sqlmap or manual: \' OR 1=1-- in input fields';
    }
    if (nextObj.includes('credential') || nextObj.includes('password')) {
      return 'Check for default creds, weak passwords with hydra, or grep for passwords in configs';
    }
    if (nextObj.includes('privilege') || nextObj.includes('root')) {
      return 'Check sudo -l, SUID binaries, kernel exploits, writable /etc/passwd';
    }
    if (nextObj.includes('flag')) {
      return 'Common flag locations: /root/root.txt, /home/user/user.txt, /var/www/html/flag.txt';
    }

    return null;
  }

  function getMethodologyReminder(domain: string): string {
    const reminders: Record<string, string> = {
      'Reconnaissance & Enumeration': 'PTES Phase 1-2: Passive recon → Active scanning → Service enumeration → Version detection',
      'Web Application Testing': 'OWASP Testing: Info gathering → Config testing → Auth testing → Session mgmt → Input validation',
      'Network Penetration Testing': 'Methodology: Port scan → Service enum → Vulnerability scan → Exploit attempt → Post-exploit',
      'Active Directory': 'AD Attack Path: LDAP enum → User discovery → Kerberoasting → Credential abuse → Lateral movement → DA',
      'Exploitation & Post-Exploitation': 'Privesc Chain: Sudo -l → SUID → Kernel → Cron → Capabilities → Credentials → Writable paths',
      'Reporting & Time Management': 'Structure: Executive summary → Technical findings → Risk ratings → Recommendations → Timeline',
    };

    return reminders[domain] || 'Follow systematic methodology: enumerate fully before exploiting';
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (remainingSeconds: number): string => {
    const percentage = (remainingSeconds / (timeEstimateMinutes * 60)) * 100;
    if (percentage > 50) return 'text-green-500';
    if (percentage > 25) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Time & Progress Overview */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Micro-Sim Progress
            </span>
            <Badge variant={timeRemainingSeconds > 300 ? 'default' : 'destructive'}>
              {formatTime(Math.max(0, timeRemainingSeconds))} left
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Objectives</span>
            <span className="font-mono font-medium">{objectivesCompleted} / {totalObjectives}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Commands</span>
            <span className="font-mono font-medium">{commandsExecuted}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Hints Used</span>
            <span className="font-mono font-medium">{hintsUsed}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Elapsed</span>
            <span className={`font-mono font-medium ${getTimeColor(timeRemainingSeconds)}`}>
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Contextual Hints */}
      {contextualHints.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Smart Hints
          </h3>
          {contextualHints.map((hint, idx) => (
            <Alert 
              key={idx} 
              variant={hint.severity === 'critical' ? 'destructive' : 'default'}
              className={hint.severity === 'critical' ? 'border-red-500' : 'border-yellow-500/50'}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-medium">
                {hint.title}
                {hint.pointsCost > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    -{hint.pointsCost} pts
                  </Badge>
                )}
              </AlertTitle>
              <AlertDescription className="text-xs mt-1">
                {hint.message}
              </AlertDescription>
              {!shownHintIds.has(`${hint.type}-${hint.title}`) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs"
                  onClick={() => useHint(hint)}
                >
                  {hint.pointsCost === 0 ? 'Show Hint (Free)' : `Use Hint (-${hint.pointsCost} pts)`}
                </Button>
              )}
              {shownHintIds.has(`${hint.type}-${hint.title}`) && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Hint used</span>
                </div>
              )}
            </Alert>
          ))}
        </div>
      )}

      {/* Domain Focus Reminder */}
      <Card className="border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Focus Area: {domain}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {getMethodologyReminder(domain)}
          </p>
          {objectives.map((obj, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              {idx < objectivesCompleted ? (
                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <div className="h-3 w-3 rounded-full border border-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <span className={idx < objectivesCompleted ? 'text-muted-foreground line-through' : ''}>
                {obj}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Performance Insight */}
      {elapsedSeconds > 180 && (
        <Card className={progressPercentage >= expectedProgress ? 'border-green-500/30' : 'border-yellow-500/30'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p className={progressPercentage >= expectedProgress ? 'text-green-500' : 'text-yellow-500'}>
              {progressPercentage >= expectedProgress 
                ? `✓ On track - ${Math.round(progressPercentage)}% complete`
                : `△ Behind pace - ${Math.round(progressPercentage)}% complete (expected: ${Math.round(expectedProgress)}%)`
              }
            </p>
            <p className="text-muted-foreground">
              Avg time per objective: {Math.round(elapsedSeconds / Math.max(1, objectivesCompleted))}s
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
