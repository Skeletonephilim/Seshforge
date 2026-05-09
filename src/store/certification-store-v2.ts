import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { table } from '@devvai/devv-code-backend';

// Domain skill categories aligned with major certifications (PT1, OSCP, eJPT, PNPT)
export type CertificationDomain = 
  | 'reconnaissance'
  | 'enumeration'
  | 'web_exploitation'
  | 'privilege_escalation'
  | 'lateral_movement'
  | 'password_attacks'
  | 'network_exploitation'
  | 'post_exploitation';

// Technical skills that map to certification requirements
export type TechnicalSkill = 
  | 'nmap_mastery'
  | 'service_enumeration'
  | 'directory_fuzzing'
  | 'sql_injection'
  | 'credential_hunting'
  | 'ssh_key_abuse'
  | 'linux_privilege_escalation'
  | 'sudo_misconfiguration'
  | 'file_upload_exploitation';

// Evidence-based readiness interpretation (not percentages)
export type ReadinessLevel = 
  | 'foundation_established'
  | 'developing_consistency'
  | 'approaching_readiness'
  | 'exam_capable'
  | 'advanced_practitioner';

export interface DemonstratedStrength {
  domain: CertificationDomain;
  skill?: TechnicalSkill;
  evidence: string[]; // Specific actions that demonstrated this strength
  first_demonstrated: string; // ISO timestamp
  last_demonstrated: string; // ISO timestamp
  confidence: number; // 0-100, based on repetition and success rate
}

export interface FocusArea {
  domain: CertificationDomain;
  priority: 'low' | 'medium' | 'high';
  rationale: string;
  specific_improvement: string;
  practice_opportunities: string[]; // Suggested drills/exercises
}

export interface FailurePoint {
  domain: CertificationDomain;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean; // Set to true when user demonstrates improvement
}

export interface RecommendedTraining {
  domain: CertificationDomain;
  skill?: TechnicalSkill;
  priority: 'low' | 'medium' | 'high';
  description: string;
}

export interface SimulationHistory {
  date: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  score: number;
  domains_practiced: CertificationDomain[];
  flags_captured: number;
  hints_used: number;
  duration_minutes: number;
}

export interface MethodologyEfficiency {
  commands_per_phase: Record<string, number>;
  unnecessary_commands: number;
  missed_enumeration_steps: string[];
  proper_tool_usage: number; // 0-100%
}

// Session-based training time tracking
export interface TrainingSession {
  session_id: string;
  start_time: string; // ISO timestamp
  end_time: string; // ISO timestamp
  duration_minutes: number;
  activity_type: 'command_drill' | 'decision_engine' | 'pt1_exam' | 'module' | 'lab';
  completed: boolean;
}

export interface CertificationReadiness {
  // SCORES NEVER DECREASE - ONLY STAGNATE
  overall_score: number; // Evidence-based score (monotonically increasing or stable)
  domain_scores: Record<CertificationDomain, number>; // Never decreases
  technical_skills: Record<TechnicalSkill, number>; // Never decreases
  
  // Evidence-based interpretation (replaces demotivating percentages)
  readiness_interpretation: {
    sec0: ReadinessLevel;
    sec1: ReadinessLevel;
    pt1: ReadinessLevel;
  };
  
  // Strengths-focused feedback
  demonstrated_strengths: DemonstratedStrength[];
  focus_areas: FocusArea[];
  
  // Session-based time tracking
  training_sessions: TrainingSession[];
  daily_training_minutes: number; // Calculated from today's sessions
  weekly_training_minutes: number; // Calculated from this week's sessions
  total_training_hours: number; // Lifetime total
  
  // Burnout tracking (warning only, never penalizes)
  burnout_threshold_minutes: number; // Daily limit (default: 360 = 6 hours)
  burnout_warning_active: boolean;
  last_burnout_warning: string | null;
  
  // Historical tracking
  failure_points: FailurePoint[];
  methodology_efficiency: MethodologyEfficiency;
  completed_simulations: number;
  avg_simulation_score: number;
  recommended_training: RecommendedTraining[];
  last_simulation_date: string | null;
  simulation_history: SimulationHistory[];
}

interface CertificationStore extends CertificationReadiness {
  // Database sync
  isLoading: boolean;
  isSynced: boolean;
  
  // Actions
  loadFromDatabase: () => Promise<void>;
  syncToDatabase: () => Promise<void>;
  
  // Session tracking (replaces manual time counters)
  startTrainingSession: (activityType: TrainingSession['activity_type']) => string;
  endTrainingSession: (sessionId: string) => void;
  calculateTrainingTime: () => void;
  checkBurnoutStatus: () => void;
  
  // Evidence-based updates (scores never decrease)
  updateAfterSimulation: (simulationData: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    commands: Array<{ command: string; phase: string; correct: boolean }>;
    evaluation: {
      reconScore: number;
      scanningScore: number;
      enumerationScore: number;
      exploitScore: number;
      privescScore: number;
      methodologyScore: number;
      overallScore: number;
    };
    flags_captured: number;
    hints_used: number;
    missed_steps: string[];
    domains_practiced: CertificationDomain[];
    duration_minutes: number;
    discovered_info?: {
      openPorts?: any[];
      services?: any[];
      directories?: any[];
      credentials?: any[];
      flags?: any[];
    };
  }) => Promise<void>;
  
  // Evidence tracking
  recordDemonstratedStrength: (domain: CertificationDomain, skill: TechnicalSkill | undefined, evidence: string) => void;
  updateFocusAreas: () => void;
  calculateReadinessInterpretation: () => void;
  
  addFailurePoint: (failure: Omit<FailurePoint, 'timestamp' | 'resolved'>) => void;
  resolveFailurePoint: (index: number) => void;
  resetReadiness: () => void;
}

const defaultDomainScores: Record<CertificationDomain, number> = {
  reconnaissance: 0,
  enumeration: 0,
  web_exploitation: 0,
  privilege_escalation: 0,
  lateral_movement: 0,
  password_attacks: 0,
  network_exploitation: 0,
  post_exploitation: 0,
};

const defaultTechnicalSkills: Record<TechnicalSkill, number> = {
  nmap_mastery: 0,
  service_enumeration: 0,
  directory_fuzzing: 0,
  sql_injection: 0,
  credential_hunting: 0,
  ssh_key_abuse: 0,
  linux_privilege_escalation: 0,
  sudo_misconfiguration: 0,
  file_upload_exploitation: 0,
};

const defaultMethodologyEfficiency: MethodologyEfficiency = {
  commands_per_phase: {},
  unnecessary_commands: 0,
  missed_enumeration_steps: [],
  proper_tool_usage: 0,
};

export const useCertificationStore = create<CertificationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      overall_score: 0,
      domain_scores: defaultDomainScores,
      technical_skills: defaultTechnicalSkills,
      
      readiness_interpretation: {
        sec0: 'foundation_established',
        sec1: 'foundation_established',
        pt1: 'foundation_established',
      },
      
      demonstrated_strengths: [],
      focus_areas: [],
      
      training_sessions: [],
      daily_training_minutes: 0,
      weekly_training_minutes: 0,
      total_training_hours: 0,
      
      burnout_threshold_minutes: 360, // 6 hours default
      burnout_warning_active: false,
      last_burnout_warning: null,
      
      failure_points: [],
      methodology_efficiency: defaultMethodologyEfficiency,
      completed_simulations: 0,
      avg_simulation_score: 0,
      recommended_training: [],
      last_simulation_date: null,
      simulation_history: [],
      isLoading: false,
      isSynced: false,

      loadFromDatabase: async () => {
        set({ isLoading: true });
        try {
          const response = await table.getItems('ff424lkp8n40');
          
          // Sort by last_updated descending to get the most recent record
          const items = response?.items?.sort((a: any, b: any) => {
            const dateA = new Date(a.last_updated || a._created_at || 0).getTime();
            const dateB = new Date(b.last_updated || b._created_at || 0).getTime();
            return dateB - dateA;
          });
          
          if (items && items.length > 0) {
            const latest = items[0];
            
            // Safe JSON parsing with fallbacks
            const safeParseJSON = (jsonString: string | undefined | null, fallback: any) => {
              if (!jsonString) return fallback;
              try {
                return JSON.parse(jsonString);
              } catch (error) {
                console.warn('Failed to parse JSON, using fallback:', error);
                return fallback;
              }
            };
            
            set({
              overall_score: latest.overall_score || 0,
              domain_scores: safeParseJSON(latest.domain_scores, defaultDomainScores),
              technical_skills: safeParseJSON(latest.technical_skills, defaultTechnicalSkills),
              readiness_interpretation: safeParseJSON(latest.readiness_interpretation, {
                sec0: 'foundation_established',
                sec1: 'foundation_established',
                pt1: 'foundation_established',
              }),
              demonstrated_strengths: safeParseJSON(latest.demonstrated_strengths, []),
              focus_areas: safeParseJSON(latest.focus_areas, []),
              training_sessions: safeParseJSON(latest.training_sessions, []),
              total_training_hours: latest.total_training_hours || 0,
              burnout_threshold_minutes: latest.burnout_threshold_minutes || 360,
              failure_points: safeParseJSON(latest.failure_points, []),
              methodology_efficiency: safeParseJSON(latest.methodology_efficiency, defaultMethodologyEfficiency),
              completed_simulations: latest.completed_simulations || 0,
              avg_simulation_score: latest.avg_simulation_score || 0,
              recommended_training: safeParseJSON(latest.recommended_training, []),
              last_simulation_date: latest.last_simulation_date || null,
              simulation_history: safeParseJSON(latest.simulation_history, []),
              isSynced: true,
            });
            
            // Calculate current training time from sessions
            get().calculateTrainingTime();
            get().checkBurnoutStatus();
            
            console.log('[CertStore] Loaded from database:', {
              completed_simulations: latest.completed_simulations || 0,
              overall_score: latest.overall_score || 0,
              strengths: safeParseJSON(latest.demonstrated_strengths, []).length,
            });
          } else {
            console.log('[CertStore] No data in database, starting fresh');
          }
        } catch (error) {
          console.error('Failed to load certification readiness:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      syncToDatabase: async () => {
        try {
          const state = get();
          
          await table.addItem('ff424lkp8n40', {
            overall_score: state.overall_score,
            domain_scores: JSON.stringify(state.domain_scores),
            technical_skills: JSON.stringify(state.technical_skills),
            readiness_interpretation: JSON.stringify(state.readiness_interpretation),
            demonstrated_strengths: JSON.stringify(state.demonstrated_strengths),
            focus_areas: JSON.stringify(state.focus_areas),
            training_sessions: JSON.stringify(state.training_sessions),
            total_training_hours: state.total_training_hours,
            burnout_threshold_minutes: state.burnout_threshold_minutes,
            failure_points: JSON.stringify(state.failure_points),
            methodology_efficiency: JSON.stringify(state.methodology_efficiency),
            completed_simulations: state.completed_simulations,
            avg_simulation_score: state.avg_simulation_score,
            recommended_training: JSON.stringify(state.recommended_training),
            last_simulation_date: state.last_simulation_date || new Date().toISOString(),
            simulation_history: JSON.stringify(state.simulation_history),
            last_updated: new Date().toISOString(),
          });
          
          set({ isSynced: true });
          console.log('[CertStore] Synced to database');
        } catch (error) {
          console.error('Failed to sync certification readiness:', error);
          set({ isSynced: false });
        }
      },

      // Session-based time tracking (replaces manual counters)
      startTrainingSession: (activityType) => {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session: TrainingSession = {
          session_id: sessionId,
          start_time: new Date().toISOString(),
          end_time: '',
          duration_minutes: 0,
          activity_type: activityType,
          completed: false,
        };
        
        const state = get();
        set({
          training_sessions: [...state.training_sessions, session],
          isSynced: false,
        });
        
        console.log('[CertStore] Started training session:', sessionId);
        return sessionId;
      },

      endTrainingSession: (sessionId) => {
        const state = get();
        const updatedSessions = state.training_sessions.map((session) => {
          if (session.session_id === sessionId && !session.completed) {
            const endTime = new Date();
            const startTime = new Date(session.start_time);
            const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
            
            return {
              ...session,
              end_time: endTime.toISOString(),
              duration_minutes: durationMinutes,
              completed: true,
            };
          }
          return session;
        });
        
        set({ training_sessions: updatedSessions, isSynced: false });
        
        // Recalculate training time and check burnout
        get().calculateTrainingTime();
        get().checkBurnoutStatus();
        get().syncToDatabase();
        
        console.log('[CertStore] Ended training session:', sessionId);
      },

      calculateTrainingTime: () => {
        const state = get();
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        
        // Calculate daily training (today only)
        const dailyMinutes = state.training_sessions
          .filter((s) => s.completed && s.start_time.startsWith(today))
          .reduce((sum, s) => sum + s.duration_minutes, 0);
        
        // Calculate weekly training (last 7 days)
        const weeklyMinutes = state.training_sessions
          .filter((s) => {
            if (!s.completed) return false;
            const sessionDate = new Date(s.start_time);
            return sessionDate >= thisWeekStart;
          })
          .reduce((sum, s) => sum + s.duration_minutes, 0);
        
        // Calculate total hours (all time)
        const totalMinutes = state.training_sessions
          .filter((s) => s.completed)
          .reduce((sum, s) => sum + s.duration_minutes, 0);
        const totalHours = totalMinutes / 60;
        
        set({
          daily_training_minutes: dailyMinutes,
          weekly_training_minutes: weeklyMinutes,
          total_training_hours: Number(totalHours.toFixed(1)),
        });
        
        console.log('[CertStore] Training time calculated:', {
          daily: `${dailyMinutes}min`,
          weekly: `${weeklyMinutes}min`,
          total: `${totalHours.toFixed(1)}hrs`,
        });
      },

      checkBurnoutStatus: () => {
        const state = get();
        const dailyMinutes = state.daily_training_minutes;
        const threshold = state.burnout_threshold_minutes;
        
        if (dailyMinutes >= threshold) {
          set({
            burnout_warning_active: true,
            last_burnout_warning: new Date().toISOString(),
          });
          console.log('[CertStore] Burnout warning activated:', `${dailyMinutes}min / ${threshold}min`);
        } else {
          set({ burnout_warning_active: false });
        }
      },

      // CRITICAL: Scores NEVER decrease - only increase or stagnate
      updateAfterSimulation: async (simulationData) => {
        // CRITICAL: Reload from database first
        await get().loadFromDatabase();
        const state = get();
        
        console.log('[CertStore] Before update:', {
          completed_simulations: state.completed_simulations,
          overall_score: state.overall_score,
        });
        
        const {
          difficulty,
          commands,
          evaluation,
          flags_captured,
          hints_used,
          missed_steps,
          domains_practiced,
          duration_minutes,
          discovered_info,
        } = simulationData;

        // Update domain scores - NEVER decrease, only increase or stay same
        const updatedDomainScores = { ...state.domain_scores };
        
        const domainMapping: Partial<Record<keyof typeof evaluation, CertificationDomain[]>> = {
          reconScore: ['reconnaissance', 'network_exploitation'],
          scanningScore: ['reconnaissance', 'enumeration'],
          enumerationScore: ['enumeration', 'web_exploitation'],
          exploitScore: ['web_exploitation', 'network_exploitation'],
          privescScore: ['privilege_escalation', 'lateral_movement'],
          methodologyScore: ['post_exploitation'],
        };

        // Weight factor based on difficulty
        const difficultyWeight = {
          beginner: 1.0,
          intermediate: 1.5,
          advanced: 2.0,
        }[difficulty];

        // Update domain scores - ONLY INCREASE
        Object.entries(evaluation).forEach(([key, score]) => {
          const mappedKey = key as keyof typeof evaluation;
          const domains = domainMapping[mappedKey] || [];
          
          domains.forEach((domain) => {
            const oldScore = updatedDomainScores[domain];
            const weightedScore = score * difficultyWeight;
            // CRITICAL: Math.max ensures score never decreases
            const newScore = Math.max(oldScore, oldScore * 0.7 + weightedScore * 0.3);
            updatedDomainScores[domain] = Math.min(100, newScore);
          });
        });

        // Update technical skills - ONLY INCREASE
        const updatedTechnicalSkills = { ...state.technical_skills };
        
        commands.forEach(({ command, correct }) => {
          const skillMapping: Record<string, TechnicalSkill[]> = {
            nmap: ['nmap_mastery', 'service_enumeration'],
            gobuster: ['directory_fuzzing'],
            dirb: ['directory_fuzzing'],
            ffuf: ['directory_fuzzing'],
            nikto: ['service_enumeration'],
            'sql': ['sql_injection'],
            sqlmap: ['sql_injection'],
            'find.*cred': ['credential_hunting'],
            'grep.*pass': ['credential_hunting'],
            'cat.*config': ['credential_hunting'],
            'ssh.*id_rsa': ['ssh_key_abuse'],
            'sudo -l': ['sudo_misconfiguration', 'linux_privilege_escalation'],
            'find.*-perm': ['linux_privilege_escalation'],
            linpeas: ['linux_privilege_escalation'],
            'curl.*upload': ['file_upload_exploitation'],
            'wget.*upload': ['file_upload_exploitation'],
          };

          Object.entries(skillMapping).forEach(([pattern, skills]) => {
            if (new RegExp(pattern, 'i').test(command)) {
              skills.forEach((skill) => {
                const increment = correct ? 3 * difficultyWeight : 1; // Even incorrect attempts add small progress
                updatedTechnicalSkills[skill] = Math.min(100, updatedTechnicalSkills[skill] + increment);
              });
            }
          });
        });

        // Record demonstrated strengths from discovered info
        if (discovered_info) {
          if (discovered_info.services && discovered_info.services.length > 0) {
            get().recordDemonstratedStrength(
              'enumeration',
              'service_enumeration',
              `Discovered ${discovered_info.services.length} services`
            );
          }
          if (discovered_info.directories && discovered_info.directories.length > 0) {
            get().recordDemonstratedStrength(
              'web_exploitation',
              'directory_fuzzing',
              `Found ${discovered_info.directories.length} directories/paths`
            );
          }
          if (discovered_info.credentials && discovered_info.credentials.length > 0) {
            get().recordDemonstratedStrength(
              'enumeration',
              'credential_hunting',
              `Extracted ${discovered_info.credentials.length} credentials`
            );
          }
          if (flags_captured > 0) {
            get().recordDemonstratedStrength(
              'post_exploitation',
              undefined,
              `Captured ${flags_captured} flag(s)`
            );
          }
        }

        // Calculate new overall score - MONOTONICALLY INCREASING
        const domainValues = Object.values(updatedDomainScores);
        const newOverallScore = domainValues.reduce((sum, score) => sum + score, 0) / domainValues.length;
        // CRITICAL: Never decrease overall score
        const finalOverallScore = Math.max(state.overall_score, Math.round(newOverallScore));

        // Generate recommended training
        const recommendedTraining: RecommendedTraining[] = [];
        
        Object.entries(updatedDomainScores).forEach(([domain, score]) => {
          if (score < 60) {
            recommendedTraining.push({
              domain: domain as CertificationDomain,
              priority: score < 30 ? 'high' : score < 45 ? 'medium' : 'low',
              description: `Practice ${domain.replace('_', ' ')}`,
            });
          }
        });

        // Add failure points for missed steps (but don't decrease scores)
        const newFailurePoints: FailurePoint[] = missed_steps.map((step) => ({
          domain: 'enumeration' as CertificationDomain,
          description: step,
          timestamp: new Date().toISOString(),
          severity: 'medium' as const,
          resolved: false,
        }));

        // Update methodology efficiency
        const commandsPerPhase: Record<string, number> = {};
        commands.forEach(({ phase }) => {
          commandsPerPhase[phase] = (commandsPerPhase[phase] || 0) + 1;
        });

        const totalCommands = commands.length;
        const correctCommands = commands.filter((c) => c.correct).length;
        const properToolUsage = totalCommands > 0 ? (correctCommands / totalCommands) * 100 : 0;

        const updatedMethodologyEfficiency: MethodologyEfficiency = {
          commands_per_phase: commandsPerPhase,
          unnecessary_commands: Math.max(0, totalCommands - correctCommands),
          missed_enumeration_steps: missed_steps,
          proper_tool_usage: Math.round(properToolUsage),
        };

        // Add to simulation history
        const newSimulationEntry: SimulationHistory = {
          date: new Date().toISOString(),
          difficulty,
          score: evaluation.overallScore,
          domains_practiced,
          flags_captured,
          hints_used,
          duration_minutes,
        };

        const updatedHistory = [newSimulationEntry, ...state.simulation_history].slice(0, 20);

        // Calculate new average simulation score
        const newAvgScore =
          (state.avg_simulation_score * state.completed_simulations + evaluation.overallScore) /
          (state.completed_simulations + 1);

        // Update state
        const newState = {
          overall_score: finalOverallScore, // NEVER DECREASES
          domain_scores: updatedDomainScores, // NEVER DECREASE
          technical_skills: updatedTechnicalSkills, // NEVER DECREASE
          failure_points: [...newFailurePoints, ...state.failure_points].slice(0, 50),
          methodology_efficiency: updatedMethodologyEfficiency,
          completed_simulations: state.completed_simulations + 1,
          avg_simulation_score: Math.round(newAvgScore),
          recommended_training: recommendedTraining.slice(0, 10),
          last_simulation_date: new Date().toISOString(),
          simulation_history: updatedHistory,
          isSynced: false,
        };
        
        set(newState);
        
        // Update focus areas and readiness interpretation
        get().updateFocusAreas();
        get().calculateReadinessInterpretation();
        
        console.log('[CertStore] After update:', {
          completed_simulations: newState.completed_simulations,
          overall_score: newState.overall_score,
          demonstrated_strengths: state.demonstrated_strengths.length,
        });

        // Sync to database
        await get().syncToDatabase();
      },

      recordDemonstratedStrength: (domain, skill, evidence) => {
        const state = get();
        const existing = state.demonstrated_strengths.find(
          (s) => s.domain === domain && s.skill === skill
        );
        
        if (existing) {
          // Update existing strength
          const updated = state.demonstrated_strengths.map((s) => {
            if (s.domain === domain && s.skill === skill) {
              return {
                ...s,
                evidence: [...s.evidence, evidence].slice(-10), // Keep last 10 evidence items
                last_demonstrated: new Date().toISOString(),
                confidence: Math.min(100, s.confidence + 5), // Increase confidence
              };
            }
            return s;
          });
          set({ demonstrated_strengths: updated });
        } else {
          // Add new strength
          const newStrength: DemonstratedStrength = {
            domain,
            skill,
            evidence: [evidence],
            first_demonstrated: new Date().toISOString(),
            last_demonstrated: new Date().toISOString(),
            confidence: 40, // Initial confidence
          };
          set({ demonstrated_strengths: [...state.demonstrated_strengths, newStrength] });
        }
        
        console.log('[CertStore] Recorded strength:', { domain, skill, evidence });
      },

      updateFocusAreas: () => {
        const state = get();
        const focusAreas: FocusArea[] = [];
        
        // Find domains with lowest scores
        const sortedDomains = Object.entries(state.domain_scores)
          .sort(([, a], [, b]) => a - b)
          .slice(0, 3); // Top 3 weakest areas
        
        sortedDomains.forEach(([domain, score]) => {
          const priority = score < 30 ? 'high' : score < 50 ? 'medium' : 'low';
          
          // Domain-specific practice opportunities
          const practiceMap: Record<CertificationDomain, string[]> = {
            reconnaissance: [
              'Command Drill: nmap service enumeration',
              'PT1 Micro-Sim: Network Discovery',
              'PT1 Exam: Full engagement with reconnaissance focus',
            ],
            enumeration: [
              'Command Drill: gobuster directory fuzzing',
              'PT1 Micro-Sim: Directory Discovery',
              'PT1 Web Black-Box Exam',
            ],
            web_exploitation: [
              'PT1 Web Black-Box Exam',
              'PT1 Micro-Sim: SQL Injection Discovery',
              'Decision Engine: Web application scenarios',
            ],
            privilege_escalation: [
              'Command Drill: linpeas enumeration',
              'PT1 Micro-Sim: SUID Privilege Escalation',
              'PT1 Exam: Focus on post-exploitation',
            ],
            lateral_movement: [
              'PT1 AD Exam',
              'Decision Engine: Active Directory scenarios',
              'PT1 Micro-Sim: Kerberoasting',
            ],
            password_attacks: [
              'Command Drill: hydra brute forcing',
              'PT1 Micro-Sim: SSH Credential Brute Force',
              'PT1 AD Exam: Credential abuse',
            ],
            network_exploitation: [
              'PT1 Micro-Sim: SMB Enumeration',
              'Decision Engine: Network pentesting',
              'Command Drill: SMB/FTP enumeration',
            ],
            post_exploitation: [
              'Decision Engine: Full engagements',
              'PT1 Exam Simulator',
              'PT1 Micro-Sim: Credential Harvesting',
            ],
          };
          
          focusAreas.push({
            domain: domain as CertificationDomain,
            priority,
            rationale: `Build consistency in ${domain.replace('_', ' ')} workflows`,
            specific_improvement: `Practice systematic approach to ${domain.replace('_', ' ')}`,
            practice_opportunities: practiceMap[domain as CertificationDomain] || [],
          });
        });
        
        set({ focus_areas: focusAreas });
      },

      calculateReadinessInterpretation: () => {
        const state = get();
        const overallScore = state.overall_score;
        const simCount = state.completed_simulations;
        const avgScore = state.avg_simulation_score;
        const strengthsCount = state.demonstrated_strengths.filter((s) => s.confidence > 60).length;
        
        // Evidence-based interpretation (not just score)
        const interpretLevel = (baseScore: number): ReadinessLevel => {
          // Consider multiple factors
          const hasStrongEvidence = strengthsCount >= 3;
          const hasConsistency = simCount >= 5 && avgScore >= 60;
          const hasDepth = simCount >= 10;
          
          if (baseScore >= 70 && hasDepth && hasConsistency) {
            return 'advanced_practitioner';
          } else if (baseScore >= 60 && hasConsistency) {
            return 'exam_capable';
          } else if (baseScore >= 45 && hasStrongEvidence) {
            return 'approaching_readiness';
          } else if (baseScore >= 25 || simCount >= 3) {
            return 'developing_consistency';
          } else {
            return 'foundation_established';
          }
        };
        
        set({
          readiness_interpretation: {
            sec0: interpretLevel(overallScore * 0.5), // SEC0 is 50% of PT1
            sec1: interpretLevel(overallScore * 0.7), // SEC1 is 70% of PT1
            pt1: interpretLevel(overallScore), // PT1 is full score
          },
        });
      },

      addFailurePoint: (failure) => {
        const state = get();
        const newFailure: FailurePoint = {
          ...failure,
          timestamp: new Date().toISOString(),
          resolved: false,
        };
        
        set({
          failure_points: [newFailure, ...state.failure_points].slice(0, 50),
          isSynced: false,
        });
      },

      resolveFailurePoint: (index) => {
        const state = get();
        const updated = [...state.failure_points];
        if (updated[index]) {
          updated[index] = { ...updated[index], resolved: true };
          set({ failure_points: updated, isSynced: false });
        }
      },

      resetReadiness: () => {
        set({
          overall_score: 0,
          domain_scores: defaultDomainScores,
          technical_skills: defaultTechnicalSkills,
          readiness_interpretation: {
            sec0: 'foundation_established',
            sec1: 'foundation_established',
            pt1: 'foundation_established',
          },
          demonstrated_strengths: [],
          focus_areas: [],
          training_sessions: [],
          daily_training_minutes: 0,
          weekly_training_minutes: 0,
          total_training_hours: 0,
          burnout_warning_active: false,
          last_burnout_warning: null,
          failure_points: [],
          methodology_efficiency: defaultMethodologyEfficiency,
          completed_simulations: 0,
          avg_simulation_score: 0,
          recommended_training: [],
          last_simulation_date: null,
          simulation_history: [],
          isSynced: false,
        });
      },
    }),
    {
      name: 'seshforge-certification-v2',
    }
  )
);
