import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { table } from '@devvai/devv-code-backend';

// PT1 Exam Sections (weighted according to real exam structure)
export type PT1ExamSection = 
  | 'web_application_testing'      // 40% of exam
  | 'network_security_testing'     // 36% of exam
  | 'active_directory_testing';    // 24% of exam

// eJPT Exam Sections (foundational offensive security)
export type EJPTExamSection =
  | 'web_application_basics'       // 40% of exam
  | 'network_enumeration';         // 60% of exam

// OSCP Exam Sections (advanced offensive security)
export type OSCPExamSection =
  | 'initial_access'               // 30% of exam (web + network services)
  | 'exploitation'                 // 30% of exam (service exploitation)
  | 'privilege_escalation'         // 25% of exam (Linux + Windows)
  | 'advanced_methodology';        // 15% of exam (pivoting, chaining, AD-like reasoning)

// Legacy domain mapping (kept for backwards compatibility)
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

export interface FailurePoint {
  domain: CertificationDomain;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecommendedTraining {
  section: PT1ExamSection;
  domain?: CertificationDomain;
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
}

export interface MethodologyEfficiency {
  commands_per_phase: Record<string, number>;
  unnecessary_commands: number;
  missed_enumeration_steps: string[];
  proper_tool_usage: number; // 0-100%
}

// Generic Section Readiness (reusable for all certifications)
export interface SectionReadiness<T extends string> {
  section: T;
  score: number; // 0-100 (relative to pass threshold, not theoretical mastery)
  evidence_count: number; // Number of drills/actions demonstrating this skill
  status: 'insufficient_evidence' | 'needs_more_drills' | 'approaching_pass' | 'likely_pass' | 'confident_pass';
  weight: number; // Weight in exam (e.g., 0.40 for 40%)
}

// Generic Certification Readiness (reusable for all certifications)
export interface CertificationReadinessScore<T extends string> {
  weighted_score: number; // 0-100 weighted by section importance
  pass_threshold: number; // Pass threshold for this cert (eJPT: 60%, PT1: 70%, OSCP: 70%)
  status: 'not_exam_ready' | 'approaching_readiness' | 'likely_pass' | 'confident_pass';
  sections: SectionReadiness<T>[];
  interpretation: string; // Human-readable explanation
  difficulty_multiplier: number; // Affects how activity contributes to progress (eJPT: 1.3, PT1: 1.0, OSCP: 0.6)
}

// PT1 Readiness (TryHackMe Junior Penetration Tester)
export type PT1Readiness = CertificationReadinessScore<PT1ExamSection>;

// eJPT Readiness (eLearnSecurity Junior Penetration Tester)
export type EJPTReadiness = CertificationReadinessScore<EJPTExamSection>;

// OSCP Readiness (Offensive Security Certified Professional)
export type OSCPReadiness = CertificationReadinessScore<OSCPExamSection>;

export interface DemonstratedStrength {
  section: PT1ExamSection;
  domain?: CertificationDomain;
  skill?: TechnicalSkill;
  evidence: string[]; // Specific actions that demonstrated this strength
  confidence: number; // 0-100
}

export interface FocusArea {
  section: PT1ExamSection;
  domain: CertificationDomain;
  priority: 'low' | 'medium' | 'high';
  rationale: string;
  specific_improvement: string;
  practice_opportunities: string[];
}

export interface CertificationReadiness {
  // Multi-Certification Readiness System
  ejpt_readiness: EJPTReadiness;
  pt1_readiness: PT1Readiness;
  oscp_readiness: OSCPReadiness;
  
  // Legacy domain scores (kept for backwards compatibility)
  overall_score: number; // Evidence-based score (never decreases, only stagnates)
  domain_scores: Record<CertificationDomain, number>; // Never decreases, only stagnates
  technical_skills: Record<TechnicalSkill, number>; // Never decreases, only stagnates
  
  demonstrated_strengths: DemonstratedStrength[];
  focus_areas: FocusArea[];
  
  failure_points: FailurePoint[];
  methodology_efficiency: MethodologyEfficiency;
  completed_simulations: number;
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
  updateAfterSimulation: (simulationData: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    commands: Array<{ command: string; phase: string; correct: boolean }>;
    evaluation: {
      reconScore: number;
      scanningScore: number;
      enumerationScore: number;
      exploitationScore: number;
      privescScore: number;
      methodologyScore: number;
      overallScore: number;
    };
    flags_captured: number;
    hints_used: number;
    missed_steps: string[];
    domains_practiced: CertificationDomain[];
    discovered_info?: {
      openPorts?: string[];
      services?: string[];
      directories?: string[];
      credentials?: string[];
      flags?: string[];
    };
  }) => Promise<void>;
  addFailurePoint: (failure: Omit<FailurePoint, 'timestamp'>) => void;
  resetReadiness: () => void;
}

// Baseline scores: Users already have prior knowledge from Linux, networking, CTFs, etc.
// These baselines represent existing capability before training in the platform
// CRITICAL: These are STARTING POINTS, not displayed percentages!
// They enable fast early growth (0-20% range gets 1.2x scaling)
const defaultDomainScores: Record<CertificationDomain, number> = {
  reconnaissance: 5,         // Minimal baseline (not displayed as %)
  enumeration: 5,           // Minimal baseline (not displayed as %)
  web_exploitation: 5,      // Minimal baseline (not displayed as %)
  privilege_escalation: 5,  // Minimal baseline (not displayed as %)
  lateral_movement: 3,      // Minimal baseline (not displayed as %)
  password_attacks: 5,      // Minimal baseline (not displayed as %)
  network_exploitation: 5,  // Minimal baseline (not displayed as %)
  post_exploitation: 5,     // Minimal baseline (not displayed as %)
};

// Baseline technical skills: Users have foundational knowledge
// CRITICAL: These are STARTING POINTS, not displayed percentages!
const defaultTechnicalSkills: Record<TechnicalSkill, number> = {
  nmap_mastery: 5,                     // Minimal baseline (not displayed as %)
  service_enumeration: 5,              // Minimal baseline (not displayed as %)
  directory_fuzzing: 3,                // Minimal baseline (not displayed as %)
  sql_injection: 3,                    // Minimal baseline (not displayed as %)
  credential_hunting: 5,               // Minimal baseline (not displayed as %)
  ssh_key_abuse: 5,                    // Minimal baseline (not displayed as %)
  linux_privilege_escalation: 5,       // Minimal baseline (not displayed as %)
  sudo_misconfiguration: 4,            // Minimal baseline (not displayed as %)
  file_upload_exploitation: 2,         // Minimal baseline (not displayed as %)
};

const defaultMethodologyEfficiency: MethodologyEfficiency = {
  commands_per_phase: {},
  unnecessary_commands: 0,
  missed_enumeration_steps: [],
  proper_tool_usage: 0,
};

// Certification Section Weights and Thresholds
const EJPT_SECTION_WEIGHTS: Record<EJPTExamSection, number> = {
  web_application_basics: 0.40,    // 40% of exam
  network_enumeration: 0.60,       // 60% of exam
};

const PT1_SECTION_WEIGHTS: Record<PT1ExamSection, number> = {
  web_application_testing: 0.40,    // 40% of exam
  network_security_testing: 0.36,   // 36% of exam
  active_directory_testing: 0.24,   // 24% of exam
};

const OSCP_SECTION_WEIGHTS: Record<OSCPExamSection, number> = {
  initial_access: 0.30,             // 30% of exam
  exploitation: 0.30,               // 30% of exam
  privilege_escalation: 0.25,       // 25% of exam
  advanced_methodology: 0.15,       // 15% of exam
};

const EJPT_PASS_THRESHOLD = 60; // 60% to pass eJPT exam (more forgiving)
const PT1_PASS_THRESHOLD = 70; // 70% to pass PT1 exam
const OSCP_PASS_THRESHOLD = 70; // 70% to pass OSCP exam (but much harder to reach)

// Difficulty multipliers: how activity contributes to progress
// Higher = easier to gain progress, Lower = harder to gain progress
const EJPT_DIFFICULTY_MULTIPLIER = 1.3;  // Foundational - faster progress
const PT1_DIFFICULTY_MULTIPLIER = 1.0;   // Intermediate - baseline
const OSCP_DIFFICULTY_MULTIPLIER = 0.6;  // Advanced - slower, requires strong evidence

// Map legacy domains to PT1 exam sections
const domainToSectionMap: Record<CertificationDomain, PT1ExamSection> = {
  reconnaissance: 'network_security_testing',
  enumeration: 'network_security_testing',
  web_exploitation: 'web_application_testing',
  privilege_escalation: 'network_security_testing',
  lateral_movement: 'active_directory_testing',
  password_attacks: 'active_directory_testing',
  network_exploitation: 'network_security_testing',
  post_exploitation: 'active_directory_testing',
};

// Default eJPT Readiness (foundational offensive security)
const defaultEJPTReadiness: EJPTReadiness = {
  weighted_score: 0, // NO BASELINE - must be earned through evidence
  pass_threshold: EJPT_PASS_THRESHOLD,
  status: 'not_exam_ready',
  difficulty_multiplier: EJPT_DIFFICULTY_MULTIPLIER,
  sections: [
    {
      section: 'web_application_basics',
      score: 0,  // NO BASELINE - must be earned
      evidence_count: 0,
      status: 'insufficient_evidence',
      weight: 40,
    },
    {
      section: 'network_enumeration',
      score: 0,  // NO BASELINE - must be earned
      evidence_count: 0,
      status: 'insufficient_evidence',
      weight: 60,
    },
  ],
  interpretation: 'No evidence yet. Complete drills to demonstrate foundational offensive security skills for eJPT.',
};

const defaultPT1Readiness: PT1Readiness = {
  weighted_score: 0, // NO BASELINE - must be earned through evidence
  pass_threshold: PT1_PASS_THRESHOLD,
  status: 'not_exam_ready',
  difficulty_multiplier: PT1_DIFFICULTY_MULTIPLIER,
  sections: [
    {
      section: 'web_application_testing',
      score: 0,  // NO BASELINE - must be earned
      evidence_count: 0,
      status: 'insufficient_evidence',
      weight: 40,
    },
    {
      section: 'network_security_testing',
      score: 0,  // NO BASELINE - must be earned
      evidence_count: 0,
      status: 'insufficient_evidence',
      weight: 36,
    },
    {
      section: 'active_directory_testing',
      score: 0,  // NO BASELINE - must be earned
      evidence_count: 0,
      status: 'insufficient_evidence',
      weight: 24,
    },
  ],
  interpretation: 'No evidence yet. Complete drills to demonstrate your skills and build PT1 exam readiness.',
};

// Default OSCP Readiness (advanced offensive security)
const defaultOSCPReadiness: OSCPReadiness = {
  weighted_score: 0, // NO BASELINE - must be earned through evidence
  pass_threshold: OSCP_PASS_THRESHOLD,
  status: 'not_exam_ready',
  difficulty_multiplier: OSCP_DIFFICULTY_MULTIPLIER,
  sections: [
    {
      section: 'initial_access',
      score: 0,  // NO BASELINE - must be earned
      evidence_count: 0,
      status: 'insufficient_evidence',
      weight: 30,
    },
    {
      section: 'exploitation',
      score: 0,  // NO BASELINE - must be earned
      evidence_count: 0,
      status: 'insufficient_evidence',
      weight: 30,
    },
    {
      section: 'privilege_escalation',
      score: 0,  // NO BASELINE - must be earned
      evidence_count: 0,
      status: 'insufficient_evidence',
      weight: 25,
    },
    {
      section: 'advanced_methodology',
      score: 0,  // NO BASELINE - must be earned
      evidence_count: 0,
      status: 'insufficient_evidence',
      weight: 15,
    },
  ],
  interpretation: 'No evidence yet. OSCP requires strong exploitation, privilege escalation, and independent methodology. Build comprehensive pentesting skills through advanced training.',
};

export const useCertificationStore = create<CertificationStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ejpt_readiness: defaultEJPTReadiness,
      pt1_readiness: defaultPT1Readiness,
      oscp_readiness: defaultOSCPReadiness,
      overall_score: 0, // NO BASELINE - must be earned
      domain_scores: defaultDomainScores, // Baselines for scaling, NOT for display
      technical_skills: defaultTechnicalSkills, // Baselines for scaling, NOT for display
      
      demonstrated_strengths: [],
      focus_areas: [],
      
      failure_points: [],
      methodology_efficiency: defaultMethodologyEfficiency,
      completed_simulations: 0,
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
            
            // Load scores from database, but ensure baselines are applied
            const loadedDomainScores = safeParseJSON(latest.domain_scores, {});
            const loadedTechnicalSkills = safeParseJSON(latest.technical_skills, {});
            
            // Merge with baselines: use DB value if > baseline, otherwise use baseline
            const mergedDomainScores = { ...defaultDomainScores };
            Object.keys(defaultDomainScores).forEach(domain => {
              const dbValue = loadedDomainScores[domain] || 0;
              const baseline = defaultDomainScores[domain as CertificationDomain];
              mergedDomainScores[domain as CertificationDomain] = Math.max(dbValue, baseline);
            });
            
            const mergedTechnicalSkills = { ...defaultTechnicalSkills };
            Object.keys(defaultTechnicalSkills).forEach(skill => {
              const dbValue = loadedTechnicalSkills[skill] || 0;
              const baseline = defaultTechnicalSkills[skill as TechnicalSkill];
              mergedTechnicalSkills[skill as TechnicalSkill] = Math.max(dbValue, baseline);
            });
            
            console.log('[CertStore] Merging with baselines:', {
              password_attacks_db: loadedDomainScores['password_attacks'],
              password_attacks_baseline: defaultDomainScores.password_attacks,
              password_attacks_final: mergedDomainScores.password_attacks,
            });
            
            set({
              ejpt_readiness: safeParseJSON(latest.ejpt_readiness, defaultEJPTReadiness),
              pt1_readiness: safeParseJSON(latest.pt1_readiness, defaultPT1Readiness),
              oscp_readiness: safeParseJSON(latest.oscp_readiness, defaultOSCPReadiness),
              overall_score: latest.overall_score || 0,
              domain_scores: mergedDomainScores,
              technical_skills: mergedTechnicalSkills,
              demonstrated_strengths: safeParseJSON(latest.demonstrated_strengths, []),
              focus_areas: safeParseJSON(latest.focus_areas, []),
              failure_points: safeParseJSON(latest.failure_points, []),
              methodology_efficiency: safeParseJSON(latest.methodology_efficiency, defaultMethodologyEfficiency),
              completed_simulations: latest.completed_simulations || 0,
              recommended_training: safeParseJSON(latest.recommended_training, []),
              last_simulation_date: latest.last_simulation_date || null,
              simulation_history: safeParseJSON(latest.simulation_history, []),
              isSynced: true,
            });
            
            console.log('[CertStore] Loaded from database:', {
              completed_simulations: latest.completed_simulations || 0,
              pt1_weighted_score: safeParseJSON(latest.pt1_readiness, defaultPT1Readiness).weighted_score,
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
            ejpt_readiness: JSON.stringify(state.ejpt_readiness),
            pt1_readiness: JSON.stringify(state.pt1_readiness),
            oscp_readiness: JSON.stringify(state.oscp_readiness),
            overall_score: state.overall_score,
            domain_scores: JSON.stringify(state.domain_scores),
            technical_skills: JSON.stringify(state.technical_skills),
            demonstrated_strengths: JSON.stringify(state.demonstrated_strengths),
            focus_areas: JSON.stringify(state.focus_areas),
            failure_points: JSON.stringify(state.failure_points),
            methodology_efficiency: JSON.stringify(state.methodology_efficiency),
            completed_simulations: state.completed_simulations,
            recommended_training: JSON.stringify(state.recommended_training),
            last_simulation_date: state.last_simulation_date || new Date().toISOString(),
            simulation_history: JSON.stringify(state.simulation_history),
          });
          
          set({ isSynced: true });
        } catch (error) {
          console.error('Failed to sync certification readiness:', error);
          set({ isSynced: false });
        }
      },

      updateAfterSimulation: async (simulationData) => {
        // Get current state (don't reload from DB - it would overwrite in-memory changes)
        const state = get();
        
        console.log('[CertStore] Before update:', {
          completed_simulations: state.completed_simulations,
          pt1_weighted_score: state.pt1_readiness.weighted_score,
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
        } = simulationData;

        // Weight factor based on difficulty (shared across all certifications)
        const difficultyWeight = {
          beginner: 1.0,
          intermediate: 1.5,
          advanced: 2.0,
        }[difficulty];

        // ========================================
        // STEP 1A: Update eJPT Section Scores
        // ========================================
        
        const updatedEJPTSections = [...state.ejpt_readiness.sections];
        
        // Map domains to eJPT sections
        const ejptSectionEvidenceCounts: Record<EJPTExamSection, number> = {
          web_application_basics: 0,
          network_enumeration: 0,
        };
        
        const domainToEJPTSectionMap: Record<CertificationDomain, EJPTExamSection> = {
          reconnaissance: 'network_enumeration',
          enumeration: 'network_enumeration',
          web_exploitation: 'web_application_basics',
          privilege_escalation: 'network_enumeration',
          lateral_movement: 'network_enumeration',
          password_attacks: 'network_enumeration',
          network_exploitation: 'network_enumeration',
          post_exploitation: 'network_enumeration',
        };
        
        domains_practiced.forEach(domain => {
          const section = domainToEJPTSectionMap[domain];
          ejptSectionEvidenceCounts[section]++;
        });
        
        // eJPT section score mapping (foundational focus)
        const ejptSectionScoreMap: Record<EJPTExamSection, number[]> = {
          web_application_basics: [evaluation.enumerationScore, evaluation.exploitationScore],
          network_enumeration: [evaluation.reconScore, evaluation.scanningScore, evaluation.enumerationScore],
        };
        
        // eJPT difficulty multiplier: 1.3x (faster progress)
        const ejptDifficultyWeight = difficultyWeight * EJPT_DIFFICULTY_MULTIPLIER;
        
        updatedEJPTSections.forEach((section, idx) => {
          const sectionType = section.section;
          const oldScore = section.score;
          const oldEvidenceCount = section.evidence_count;
          
          const relevantScores = ejptSectionScoreMap[sectionType];
          const avgScore = relevantScores.reduce((sum, s) => sum + s, 0) / relevantScores.length;
          const weightedScore = avgScore * ejptDifficultyWeight;  // 1.3x multiplier!
          
          // Evidence bonuses (HIGHER than PT1)
          const discoveredEvidence = simulationData.discovered_info || {};
          let evidenceBonus = 0;
          
          if (sectionType === 'web_application_basics') {
            evidenceBonus += (discoveredEvidence.directories?.length || 0) * 3;  // +3 vs PT1's +2
            evidenceBonus += (discoveredEvidence.credentials?.length || 0) * 4;  // +4 vs PT1's +3
          } else if (sectionType === 'network_enumeration') {
            evidenceBonus += (discoveredEvidence.services?.length || 0) * 4;  // +4 vs PT1's +3
            evidenceBonus += (discoveredEvidence.openPorts?.length || 0) * 3;  // +3 vs PT1's +2
          }
          
          const finalScore = Math.min(100, weightedScore + evidenceBonus);
          
          // Same contextual scaling as PT1
          const scalingFactor = oldScore < 20 ? 0.5 : oldScore < 60 ? 0.35 : oldScore < 85 ? 0.25 : 0.15;
          const delta = Math.max(1, (finalScore - oldScore) * scalingFactor);
          const newScore = Math.min(100, Math.max(oldScore, oldScore + delta));
          
          const newEvidenceCount = oldEvidenceCount + ejptSectionEvidenceCounts[sectionType];
          
          let status: SectionReadiness<EJPTExamSection>['status'];
          if (newEvidenceCount < 3) {
            status = 'insufficient_evidence';
          } else if (newScore < 40) {
            status = 'needs_more_drills';
          } else if (newScore < EJPT_PASS_THRESHOLD) {
            status = 'approaching_pass';
          } else if (newScore < 80) {
            status = 'likely_pass';
          } else {
            status = 'confident_pass';
          }
          
          updatedEJPTSections[idx] = {
            ...section,
            score: Math.round(newScore),
            evidence_count: newEvidenceCount,
            status,
          };
        });
        
        const ejptWeightedScore = updatedEJPTSections.reduce((sum, section) => {
          return sum + (section.score * EJPT_SECTION_WEIGHTS[section.section]);
        }, 0);
        
        let ejptStatus: EJPTReadiness['status'];
        if (ejptWeightedScore < 30) {
          ejptStatus = 'not_exam_ready';
        } else if (ejptWeightedScore < EJPT_PASS_THRESHOLD) {
          ejptStatus = 'approaching_readiness';
        } else if (ejptWeightedScore < 70) {
          ejptStatus = 'likely_pass';
        } else {
          ejptStatus = 'confident_pass';
        }
        
        let ejptInterpretation = '';
        if (ejptStatus === 'not_exam_ready') {
          ejptInterpretation = `Building foundation (${Math.round(ejptWeightedScore)}% vs ${EJPT_PASS_THRESHOLD}% pass threshold). Focus on web and network basics. eJPT progress increases faster with foundational successes (1.3x multiplier).`;
        } else if (ejptStatus === 'approaching_readiness') {
          ejptInterpretation = `Approaching eJPT readiness (${Math.round(ejptWeightedScore)}% vs ${EJPT_PASS_THRESHOLD}% pass threshold). Continue practicing basic offensive security skills.`;
        } else if (ejptStatus === 'likely_pass') {
          ejptInterpretation = `eJPT exam-ready (${Math.round(ejptWeightedScore)}%). Solid foundational offensive security skills. Consider scheduling your eJPT exam.`;
        } else {
          ejptInterpretation = `Confident eJPT pass readiness (${Math.round(ejptWeightedScore)}%). Strong foundational skills in web and network security. Schedule your eJPT exam!`;
        }
        
        const updatedEJPTReadiness: EJPTReadiness = {
          weighted_score: Math.round(ejptWeightedScore),
          pass_threshold: EJPT_PASS_THRESHOLD,
          status: ejptStatus,
          difficulty_multiplier: EJPT_DIFFICULTY_MULTIPLIER,
          sections: updatedEJPTSections,
          interpretation: ejptInterpretation,
        };
        
        // ========================================
        // STEP 1B: Update PT1 Section Scores
        // ========================================
        
        const updatedSections = [...state.pt1_readiness.sections];
        
        // Map domains practiced to PT1 sections and increment evidence
        const sectionEvidenceCounts: Record<PT1ExamSection, number> = {
          web_application_testing: 0,
          network_security_testing: 0,
          active_directory_testing: 0,
        };
        
        domains_practiced.forEach(domain => {
          const section = domainToSectionMap[domain];
          sectionEvidenceCounts[section]++;
        });
        
        // Map evaluation scores to sections
        const sectionScoreMap: Record<PT1ExamSection, number[]> = {
          web_application_testing: [evaluation.enumerationScore, evaluation.exploitationScore],
          network_security_testing: [evaluation.reconScore, evaluation.scanningScore, evaluation.enumerationScore],
          active_directory_testing: [evaluation.privescScore, evaluation.methodologyScore],
        };
        
        updatedSections.forEach((section, idx) => {
          const sectionType = section.section;
          const oldScore = section.score;
          const oldEvidenceCount = section.evidence_count;
          
          // Calculate new score from evaluation
          const relevantScores = sectionScoreMap[sectionType];
          const avgScore = relevantScores.reduce((sum, s) => sum + s, 0) / relevantScores.length;
          const weightedScore = avgScore * difficultyWeight;
          
          // Add evidence-based bonuses
          const discoveredEvidence = simulationData.discovered_info || {};
          let evidenceBonus = 0;
          
          if (sectionType === 'web_application_testing') {
            // Web: directories, SQL injection, credentials
            evidenceBonus += (discoveredEvidence.directories?.length || 0) * 2;
            evidenceBonus += (discoveredEvidence.credentials?.length || 0) * 3;
          } else if (sectionType === 'network_security_testing') {
            // Network: services, ports, enumeration
            evidenceBonus += (discoveredEvidence.services?.length || 0) * 3;
            evidenceBonus += (discoveredEvidence.openPorts?.length || 0) * 2;
          } else if (sectionType === 'active_directory_testing') {
            // AD: lateral movement, credentials
            evidenceBonus += (discoveredEvidence.credentials?.length || 0) * 5;
          }
          
          const finalScore = Math.min(100, weightedScore + evidenceBonus);
          
          // CONTEXTUAL SCALING: Diminishing returns based on current level
          // 0-20%: faster growth (learning fundamentals)
          // 20-60%: moderate growth (building competence)
          // 60-85%: slower growth (approaching mastery)
          // 85-100%: very slow growth (requires consistent excellence)
          
          const scalingFactor = oldScore < 20 ? 0.5 :   // Fast growth
                                oldScore < 60 ? 0.35 :  // Moderate growth
                                oldScore < 85 ? 0.25 :  // Slower growth
                                0.15;                   // Very slow growth
          
          // Apply scaling with visible progression minimum (+1% for any meaningful work)
          const delta = Math.max(1, (finalScore - oldScore) * scalingFactor);
          const newScore = Math.min(100, Math.max(oldScore, oldScore + delta));
          
          const newEvidenceCount = oldEvidenceCount + sectionEvidenceCounts[sectionType];
          
          // Determine status based on score and evidence
          let status: SectionReadiness<PT1ExamSection>['status'];
          if (newEvidenceCount < 3) {
            status = 'insufficient_evidence';
          } else if (newScore < 50) {
            status = 'needs_more_drills';
          } else if (newScore < PT1_PASS_THRESHOLD) {
            status = 'approaching_pass';
          } else if (newScore < 85) {
            status = 'likely_pass';
          } else {
            status = 'confident_pass';
          }
          
          updatedSections[idx] = {
            ...section,
            score: Math.round(newScore),
            evidence_count: newEvidenceCount,
            status,
          };
        });
        
        // Calculate weighted score (40% Web, 36% Network, 24% AD)
        const newWeightedScore = updatedSections.reduce((sum, section) => {
          return sum + (section.score * PT1_SECTION_WEIGHTS[section.section]);
        }, 0);
        
        // Determine overall PT1 status
        let pt1Status: PT1Readiness['status'];
        if (newWeightedScore < 40) {
          pt1Status = 'not_exam_ready';
        } else if (newWeightedScore < PT1_PASS_THRESHOLD) {
          pt1Status = 'approaching_readiness';
        } else if (newWeightedScore < 75) {
          pt1Status = 'likely_pass';
        } else {
          pt1Status = 'confident_pass';
        }
        
        // Generate interpretation (100% = PT1 ready, not expert mastery)
        let interpretation = '';
        const gapToPass = PT1_PASS_THRESHOLD - newWeightedScore;
        
        if (pt1Status === 'not_exam_ready') {
          const weakestSection = updatedSections.sort((a, b) => a.score - b.score)[0];
          interpretation = `Building foundation (${Math.round(newWeightedScore)}% vs ${PT1_PASS_THRESHOLD}% PT1 pass threshold). Focus on ${weakestSection.section.replace(/_/g, ' ')} (${weakestSection.score}%). Complete more drills in weak sections to demonstrate capability.`;
        } else if (pt1Status === 'approaching_readiness') {
          interpretation = `Approaching PT1 readiness (${Math.round(newWeightedScore)}% vs ${PT1_PASS_THRESHOLD}% pass threshold). ${Math.round(Math.abs(gapToPass))}% from likely pass. Continue targeted practice in weak sections. Score reflects foundational competence, not mastery.`;
        } else if (pt1Status === 'likely_pass') {
          interpretation = `PT1 exam-ready (${Math.round(newWeightedScore)}% weighted score). Solid foundational skills demonstrated across all sections. 100% represents PT1 readiness, not expert mastery. Consider scheduling your exam.`;
        } else {
          interpretation = `Confident PT1 pass readiness (${Math.round(newWeightedScore)}% weighted score). Strong foundational competence across all three exam sections. Remember: 100% = PT1 ready, not OSCP/expert level. Schedule your exam!`;
        }
        
        const updatedPT1Readiness: PT1Readiness = {
          weighted_score: Math.round(newWeightedScore),
          pass_threshold: PT1_PASS_THRESHOLD,
          status: pt1Status,
          difficulty_multiplier: PT1_DIFFICULTY_MULTIPLIER,
          sections: updatedSections,
          interpretation,
        };

        // ========================================
        // STEP 1C: Update OSCP Section Scores
        // ========================================
        
        const updatedOSCPSections = [...state.oscp_readiness.sections];
        
        // Map domains to OSCP sections
        const oscpSectionEvidenceCounts: Record<OSCPExamSection, number> = {
          initial_access: 0,
          exploitation: 0,
          privilege_escalation: 0,
          advanced_methodology: 0,
        };
        
        const domainToOSCPSectionMap: Record<CertificationDomain, OSCPExamSection> = {
          reconnaissance: 'initial_access',
          enumeration: 'initial_access',
          web_exploitation: 'initial_access',
          privilege_escalation: 'privilege_escalation',
          lateral_movement: 'privilege_escalation',
          password_attacks: 'exploitation',
          network_exploitation: 'exploitation',
          post_exploitation: 'advanced_methodology',
        };
        
        domains_practiced.forEach(domain => {
          const section = domainToOSCPSectionMap[domain];
          oscpSectionEvidenceCounts[section]++;
        });
        
        // OSCP section score mapping (advanced requirements)
        const oscpSectionScoreMap: Record<OSCPExamSection, number[]> = {
          initial_access: [evaluation.reconScore, evaluation.enumerationScore],
          exploitation: [evaluation.exploitationScore, evaluation.methodologyScore],
          privilege_escalation: [evaluation.privescScore],
          advanced_methodology: [evaluation.methodologyScore, evaluation.privescScore],
        };
        
        // OSCP difficulty multiplier: 0.6x (slower progress - requires strong evidence)
        const oscpDifficultyWeight = difficultyWeight * OSCP_DIFFICULTY_MULTIPLIER;
        
        updatedOSCPSections.forEach((section, idx) => {
          const sectionType = section.section;
          const oldScore = section.score;
          const oldEvidenceCount = section.evidence_count;
          
          const relevantScores = oscpSectionScoreMap[sectionType];
          const avgScore = relevantScores.reduce((sum, s) => sum + s, 0) / relevantScores.length;
          const weightedScore = avgScore * oscpDifficultyWeight;  // 0.6x multiplier!
          
          // Evidence bonuses (LOWER than PT1, requires strong evidence)
          const discoveredEvidence = simulationData.discovered_info || {};
          let evidenceBonus = 0;
          
          if (sectionType === 'initial_access') {
            evidenceBonus += (discoveredEvidence.directories?.length || 0) * 1;  // +1 vs PT1's +2
            evidenceBonus += (discoveredEvidence.services?.length || 0) * 2;  // +2 vs PT1's +3
          } else if (sectionType === 'exploitation') {
            evidenceBonus += (discoveredEvidence.credentials?.length || 0) * 2;  // +2 vs PT1's +3
            // OSCP requires exploitation PROOF (flags are critical)
            evidenceBonus += (discoveredEvidence.flags?.length || 0) * 5;  // Strong weight on flags
          } else if (sectionType === 'privilege_escalation') {
            evidenceBonus += (discoveredEvidence.flags?.length || 0) * 8;  // Flags essential for privesc
          } else if (sectionType === 'advanced_methodology') {
            evidenceBonus += (discoveredEvidence.credentials?.length || 0) * 3;
            evidenceBonus += (discoveredEvidence.flags?.length || 0) * 5;
          }
          
          const finalScore = Math.min(100, weightedScore + evidenceBonus);
          
          // Same contextual scaling
          const scalingFactor = oldScore < 20 ? 0.5 : oldScore < 60 ? 0.35 : oldScore < 85 ? 0.25 : 0.15;
          const delta = Math.max(1, (finalScore - oldScore) * scalingFactor);
          const newScore = Math.min(100, Math.max(oldScore, oldScore + delta));
          
          const newEvidenceCount = oldEvidenceCount + oscpSectionEvidenceCounts[sectionType];
          
          let status: SectionReadiness<OSCPExamSection>['status'];
          if (newEvidenceCount < 5) {  // Higher evidence requirement
            status = 'insufficient_evidence';
          } else if (newScore < 50) {
            status = 'needs_more_drills';
          } else if (newScore < OSCP_PASS_THRESHOLD) {
            status = 'approaching_pass';
          } else if (newScore < 85) {
            status = 'likely_pass';
          } else {
            status = 'confident_pass';
          }
          
          updatedOSCPSections[idx] = {
            ...section,
            score: Math.round(newScore),
            evidence_count: newEvidenceCount,
            status,
          };
        });
        
        const oscpWeightedScore = updatedOSCPSections.reduce((sum, section) => {
          return sum + (section.score * OSCP_SECTION_WEIGHTS[section.section]);
        }, 0);
        
        let oscpStatus: OSCPReadiness['status'];
        if (oscpWeightedScore < 40) {
          oscpStatus = 'not_exam_ready';
        } else if (oscpWeightedScore < OSCP_PASS_THRESHOLD) {
          oscpStatus = 'approaching_readiness';
        } else if (oscpWeightedScore < 75) {
          oscpStatus = 'likely_pass';
        } else {
          oscpStatus = 'confident_pass';
        }
        
        let oscpInterpretation = '';
        if (oscpStatus === 'not_exam_ready') {
          oscpInterpretation = `Building OSCP foundation (${Math.round(oscpWeightedScore)}% vs ${OSCP_PASS_THRESHOLD}% pass threshold). OSCP requires strong exploitation, privilege escalation, and methodology. Progress increases slowly (0.6x multiplier) - requires comprehensive evidence.`;
        } else if (oscpStatus === 'approaching_readiness') {
          oscpInterpretation = `Approaching OSCP readiness (${Math.round(oscpWeightedScore)}% vs ${OSCP_PASS_THRESHOLD}% pass threshold). Continue advanced training with focus on exploitation and privesc chains.`;
        } else if (oscpStatus === 'likely_pass') {
          oscpInterpretation = `OSCP exam-ready (${Math.round(oscpWeightedScore)}%). Strong advanced offensive security skills demonstrated. OSCP 70% threshold is significantly harder than PT1. Consider scheduling when consistently above 70%.`;
        } else {
          oscpInterpretation = `Confident OSCP pass readiness (${Math.round(oscpWeightedScore)}%). Excellent advanced skills in exploitation, privilege escalation, and methodology. Schedule your OSCP exam!`;
        }
        
        const updatedOSCPReadiness: OSCPReadiness = {
          weighted_score: Math.round(oscpWeightedScore),
          pass_threshold: OSCP_PASS_THRESHOLD,
          status: oscpStatus,
          difficulty_multiplier: OSCP_DIFFICULTY_MULTIPLIER,
          sections: updatedOSCPSections,
          interpretation: oscpInterpretation,
        };
        
        // ========================================
        // STEP 2: Update Legacy Domain Scores (backwards compatibility)
        // ========================================
        
        const updatedDomainScores = { ...state.domain_scores };
        
        // Map evaluation scores to domains
        const domainMapping: Partial<Record<keyof typeof evaluation, CertificationDomain[]>> = {
          reconScore: ['reconnaissance', 'network_exploitation'],
          scanningScore: ['reconnaissance', 'enumeration'],
          enumerationScore: ['enumeration', 'web_exploitation'],
          exploitationScore: ['web_exploitation', 'network_exploitation'],
          privescScore: ['privilege_escalation', 'lateral_movement'],
          methodologyScore: ['post_exploitation'],
        };

        // Update domain scores using weighted average (70% old + 30% new)
        Object.entries(evaluation).forEach(([key, score]) => {
          const mappedKey = key as keyof typeof evaluation;
          const domains = domainMapping[mappedKey] || [];
          
          domains.forEach((domain) => {
            const oldScore = updatedDomainScores[domain];
            const weightedScore = score * difficultyWeight;
            
            // CONTEXTUAL SCALING with visible progression
            const scalingFactor = oldScore < 20 ? 0.5 :
                                  oldScore < 60 ? 0.35 :
                                  oldScore < 85 ? 0.25 : 0.15;
            
            const delta = Math.max(1, (weightedScore - oldScore) * scalingFactor);
            const newScore = Math.min(100, Math.max(oldScore, oldScore + delta));
            updatedDomainScores[domain] = Math.round(newScore);
          });
        });
        
        // Evidence-based bonuses for legacy domains with contextual scaling
        const discoveredEvidence = simulationData.discovered_info || {};
        
        if (discoveredEvidence.credentials && discoveredEvidence.credentials.length > 0) {
          const credCount = discoveredEvidence.credentials.length;
          // ENHANCED: Much larger bonus to match domain proficiency
          const baseBonus = Math.min(25, credCount * 5) * difficultyWeight;
          
          // Apply to enumeration
          const enumScaling = updatedDomainScores['enumeration'] < 20 ? 1.2 :
                             updatedDomainScores['enumeration'] < 60 ? 1.0 :
                             updatedDomainScores['enumeration'] < 85 ? 0.7 : 0.4;
          updatedDomainScores['enumeration'] = Math.min(100, 
            Math.round(updatedDomainScores['enumeration'] + (baseBonus * enumScaling)));
          
          // Apply to password_attacks
          const passScaling = updatedDomainScores['password_attacks'] < 20 ? 1.2 :
                             updatedDomainScores['password_attacks'] < 60 ? 1.0 :
                             updatedDomainScores['password_attacks'] < 85 ? 0.7 : 0.4;
          updatedDomainScores['password_attacks'] = Math.min(100,
            Math.round(updatedDomainScores['password_attacks'] + (baseBonus * passScaling)));
          
          console.log(`[CertStore] Credential evidence: ${credCount} found → enumeration +${Math.round(baseBonus * enumScaling)}, password_attacks +${Math.round(baseBonus * passScaling)}`);
        }
        
        if (discoveredEvidence.services && discoveredEvidence.services.length > 0) {
          const serviceCount = discoveredEvidence.services.length;
          // ENHANCED: Larger bonus to match reconnaissance domain mastery
          const baseBonus = Math.min(20, serviceCount * 3) * difficultyWeight;
          
          // Apply with scaling
          const reconScaling = updatedDomainScores['reconnaissance'] < 20 ? 1.2 :
                              updatedDomainScores['reconnaissance'] < 60 ? 1.0 :
                              updatedDomainScores['reconnaissance'] < 85 ? 0.7 : 0.4;
          updatedDomainScores['reconnaissance'] = Math.min(100,
            Math.round(updatedDomainScores['reconnaissance'] + (baseBonus * reconScaling)));
          
          const enumScaling = updatedDomainScores['enumeration'] < 20 ? 1.2 :
                             updatedDomainScores['enumeration'] < 60 ? 1.0 :
                             updatedDomainScores['enumeration'] < 85 ? 0.7 : 0.4;
          updatedDomainScores['enumeration'] = Math.min(100,
            Math.round(updatedDomainScores['enumeration'] + (baseBonus * enumScaling)));
          
          console.log(`[CertStore] Service evidence: ${serviceCount} found → reconnaissance +${Math.round(baseBonus * reconScaling)}, enumeration +${Math.round(baseBonus * enumScaling)}`);
        }
        
        if (discoveredEvidence.directories && discoveredEvidence.directories.length > 0) {
          const dirCount = discoveredEvidence.directories.length;
          // ENHANCED: Larger bonus to match web_exploitation domain mastery
          const baseBonus = Math.min(20, dirCount * 3) * difficultyWeight;
          
          const webScaling = updatedDomainScores['web_exploitation'] < 20 ? 1.2 :
                            updatedDomainScores['web_exploitation'] < 60 ? 1.0 :
                            updatedDomainScores['web_exploitation'] < 85 ? 0.7 : 0.4;
          updatedDomainScores['web_exploitation'] = Math.min(100,
            Math.round(updatedDomainScores['web_exploitation'] + (baseBonus * webScaling)));
          
          console.log(`[CertStore] Directory evidence: ${dirCount} found → web_exploitation +${Math.round(baseBonus * webScaling)}`);
        }
        
        if (discoveredEvidence.flags && discoveredEvidence.flags.length > 0) {
          const flagCount = discoveredEvidence.flags.length;
          // ENHANCED: Much larger bonus for flag capture (major achievement)
          const baseBonus = flagCount * 15 * difficultyWeight;  // 15 instead of 8
          
          const privScaling = updatedDomainScores['privilege_escalation'] < 20 ? 1.2 :
                             updatedDomainScores['privilege_escalation'] < 60 ? 1.0 :
                             updatedDomainScores['privilege_escalation'] < 85 ? 0.7 : 0.4;
          updatedDomainScores['privilege_escalation'] = Math.min(100,
            Math.round(updatedDomainScores['privilege_escalation'] + (baseBonus * privScaling)));
          
          const webScaling = updatedDomainScores['web_exploitation'] < 20 ? 1.2 :
                            updatedDomainScores['web_exploitation'] < 60 ? 1.0 :
                            updatedDomainScores['web_exploitation'] < 85 ? 0.7 : 0.4;
          updatedDomainScores['web_exploitation'] = Math.min(100,
            Math.round(updatedDomainScores['web_exploitation'] + (baseBonus * webScaling)));
          
          // ALSO update lateral_movement for flag capture (demonstrates movement to flags)
          const latScaling = updatedDomainScores['lateral_movement'] < 20 ? 1.2 :
                            updatedDomainScores['lateral_movement'] < 60 ? 1.0 :
                            updatedDomainScores['lateral_movement'] < 85 ? 0.7 : 0.4;
          updatedDomainScores['lateral_movement'] = Math.min(100,
            Math.round(updatedDomainScores['lateral_movement'] + (baseBonus * 0.6 * latScaling)));
          
          console.log(`[CertStore] Flag evidence: ${flagCount} captured → privilege_escalation +${Math.round(baseBonus * privScaling)}, web_exploitation +${Math.round(baseBonus * webScaling)}, lateral_movement +${Math.round(baseBonus * 0.6 * latScaling)}`);
        }

        // Update technical skills
        const updatedTechnicalSkills = { ...state.technical_skills };
        
        // ========================================
        // EVIDENCE-BASED SKILL UPDATES (PRIMARY)
        // ========================================
        
        // Credentials discovered → credential hunting + password attacks
        if (discoveredEvidence.credentials && discoveredEvidence.credentials.length > 0) {
          const credCount = discoveredEvidence.credentials.length;
          // ENHANCED: Much larger base bonus to match domain proficiency
          const baseBonus = Math.min(25, credCount * 5) * difficultyWeight;
          
          // Apply contextual scaling
          const credScaling = updatedTechnicalSkills['credential_hunting'] < 20 ? 1.2 :
                             updatedTechnicalSkills['credential_hunting'] < 60 ? 1.0 :
                             updatedTechnicalSkills['credential_hunting'] < 85 ? 0.7 : 0.4;
          
          const scaledBonus = Math.max(1, baseBonus * credScaling);
          updatedTechnicalSkills['credential_hunting'] = Math.min(100, 
            Math.round(updatedTechnicalSkills['credential_hunting'] + scaledBonus)
          );
          
          console.log(`[CertStore] Evidence-based skill update: credential_hunting +${Math.round(scaledBonus)} (${credCount} credentials found, scaling: ${credScaling.toFixed(2)}x)`);
        }
        
        // Services enumerated → service enumeration + nmap mastery
        if (discoveredEvidence.services && discoveredEvidence.services.length > 0) {
          const serviceCount = discoveredEvidence.services.length;
          // ENHANCED: Much larger bonus to match reconnaissance/enumeration domain mastery
          const baseBonus = Math.min(20, serviceCount * 3) * difficultyWeight;
          
          // Apply contextual scaling to both skills
          const svcScaling = updatedTechnicalSkills['service_enumeration'] < 20 ? 1.2 :
                            updatedTechnicalSkills['service_enumeration'] < 60 ? 1.0 :
                            updatedTechnicalSkills['service_enumeration'] < 85 ? 0.7 : 0.4;
          const nmapScaling = updatedTechnicalSkills['nmap_mastery'] < 20 ? 1.2 :
                             updatedTechnicalSkills['nmap_mastery'] < 60 ? 1.0 :
                             updatedTechnicalSkills['nmap_mastery'] < 85 ? 0.7 : 0.4;
          
          const svcBonus = Math.max(1, baseBonus * svcScaling);
          const nmapBonus = Math.max(1, baseBonus * 0.85 * nmapScaling);  // 85% instead of 70%
          
          updatedTechnicalSkills['service_enumeration'] = Math.min(100,
            Math.round(updatedTechnicalSkills['service_enumeration'] + svcBonus)
          );
          updatedTechnicalSkills['nmap_mastery'] = Math.min(100,
            Math.round(updatedTechnicalSkills['nmap_mastery'] + nmapBonus)
          );
          
          console.log(`[CertStore] Evidence-based skill update: service_enumeration +${Math.round(svcBonus)}, nmap_mastery +${Math.round(nmapBonus)} (${serviceCount} services)`);
        }
        
        // Directories found → directory fuzzing
        if (discoveredEvidence.directories && discoveredEvidence.directories.length > 0) {
          const dirCount = discoveredEvidence.directories.length;
          // ENHANCED: Larger bonus to match web_exploitation domain mastery
          const baseBonus = Math.min(20, dirCount * 3) * difficultyWeight;
          
          const dirScaling = updatedTechnicalSkills['directory_fuzzing'] < 20 ? 1.2 :
                            updatedTechnicalSkills['directory_fuzzing'] < 60 ? 1.0 :
                            updatedTechnicalSkills['directory_fuzzing'] < 85 ? 0.7 : 0.4;
          
          const scaledBonus = Math.max(1, baseBonus * dirScaling);
          updatedTechnicalSkills['directory_fuzzing'] = Math.min(100,
            Math.round(updatedTechnicalSkills['directory_fuzzing'] + scaledBonus)
          );
          
          console.log(`[CertStore] Evidence-based skill update: directory_fuzzing +${Math.round(scaledBonus)} (${dirCount} directories)`);
        }
        
        // Flags captured → privilege escalation + exploitation + sudo skills
        if (discoveredEvidence.flags && discoveredEvidence.flags.length > 0) {
          const flagCount = discoveredEvidence.flags.length;
          // ENHANCED: Larger bonus for flag capture (major achievement)
          const baseBonus = flagCount * 15 * difficultyWeight;  // 15 instead of 8
          
          const privScaling = updatedTechnicalSkills['linux_privilege_escalation'] < 20 ? 1.2 :
                             updatedTechnicalSkills['linux_privilege_escalation'] < 60 ? 1.0 :
                             updatedTechnicalSkills['linux_privilege_escalation'] < 85 ? 0.7 : 0.4;
          const sudoScaling = updatedTechnicalSkills['sudo_misconfiguration'] < 20 ? 1.2 :
                             updatedTechnicalSkills['sudo_misconfiguration'] < 60 ? 1.0 :
                             updatedTechnicalSkills['sudo_misconfiguration'] < 85 ? 0.7 : 0.4;
          
          const privBonus = Math.max(1, baseBonus * privScaling);
          const sudoBonus = Math.max(1, baseBonus * 0.7 * sudoScaling);
          
          updatedTechnicalSkills['linux_privilege_escalation'] = Math.min(100,
            Math.round(updatedTechnicalSkills['linux_privilege_escalation'] + privBonus)
          );
          updatedTechnicalSkills['sudo_misconfiguration'] = Math.min(100,
            Math.round(updatedTechnicalSkills['sudo_misconfiguration'] + sudoBonus)
          );
          
          console.log(`[CertStore] Evidence-based skill update: linux_privilege_escalation +${Math.round(privBonus)}, sudo_misconfiguration +${Math.round(sudoBonus)} (${flagCount} flags)`);
        }
        
        // Open ports discovered → nmap mastery
        if (discoveredEvidence.openPorts && discoveredEvidence.openPorts.length > 0) {
          const portCount = discoveredEvidence.openPorts.length;
          // ENHANCED: Larger bonus for port discovery
          const baseBonus = Math.min(15, portCount * 2.5) * difficultyWeight;
          
          const nmapScaling = updatedTechnicalSkills['nmap_mastery'] < 20 ? 1.2 :
                             updatedTechnicalSkills['nmap_mastery'] < 60 ? 1.0 :
                             updatedTechnicalSkills['nmap_mastery'] < 85 ? 0.7 : 0.4;
          
          const scaledBonus = Math.max(1, baseBonus * nmapScaling);
          updatedTechnicalSkills['nmap_mastery'] = Math.min(100,
            Math.round(updatedTechnicalSkills['nmap_mastery'] + scaledBonus)
          );
          
          console.log(`[CertStore] Evidence-based skill update: nmap_mastery +${Math.round(scaledBonus)} (${portCount} ports)`);
        }
        
        // ========================================
        // COMMAND-BASED SKILL UPDATES (SECONDARY)
        // ========================================
        
        // Command pattern matching still applies for specific tools
        if (Array.isArray(commands) && commands.length > 0) {
          commands.forEach(({ command, correct }) => {
            const skillMapping: Record<string, TechnicalSkill[]> = {
              nmap: ['nmap_mastery', 'service_enumeration'],
              gobuster: ['directory_fuzzing'],
              dirb: ['directory_fuzzing'],
              ffuf: ['directory_fuzzing'],
              feroxbuster: ['directory_fuzzing'],
              nikto: ['service_enumeration'],
              'sql': ['sql_injection'],
              sqlmap: ['sql_injection'],
              'find.*cred': ['credential_hunting'],
              'grep.*pass': ['credential_hunting'],
              'cat.*cred': ['credential_hunting'],
              'cat.*pass': ['credential_hunting'],
              'ssh.*id_rsa': ['ssh_key_abuse'],
              'ssh -i': ['ssh_key_abuse'],
              'sudo -l': ['sudo_misconfiguration', 'linux_privilege_escalation'],
              'find.*-perm': ['linux_privilege_escalation'],
              'find.*suid': ['linux_privilege_escalation'],
              linpeas: ['linux_privilege_escalation'],
              linprivesc: ['linux_privilege_escalation'],
              'curl.*upload': ['file_upload_exploitation'],
              'wget.*upload': ['file_upload_exploitation'],
              hydra: ['credential_hunting'],
              john: ['credential_hunting'],
              hashcat: ['credential_hunting'],
              crackmapexec: ['credential_hunting'],
              nxc: ['credential_hunting'],
              smbclient: ['credential_hunting'],
              enum4linux: ['credential_hunting'],
              smbmap: ['credential_hunting'],
            };

            Object.entries(skillMapping).forEach(([pattern, skills]) => {
              if (new RegExp(pattern, 'i').test(command)) {
                skills.forEach((skill) => {
                  // ENHANCED: Larger increments for command usage (5 instead of 2)
                  const increment = correct ? 5 * difficultyWeight : 1;
                  updatedTechnicalSkills[skill] = Math.min(100, updatedTechnicalSkills[skill] + increment);
                });
              }
            });
          });
        }
        
        // ========================================
        // PROPORTIONAL TECHNICAL SKILL ALIGNMENT
        // ========================================
        
        // If domains are at 100%, boost related technical skills proportionally
        // This ensures technical skills reflect domain mastery
        
        if (updatedDomainScores['reconnaissance'] >= 95 || updatedDomainScores['enumeration'] >= 95) {
          // Reconnaissance/Enumeration mastery → boost nmap/service enum
          const domainAvg = (updatedDomainScores['reconnaissance'] + updatedDomainScores['enumeration']) / 2;
          const targetSkillLevel = domainAvg * 0.9;  // Technical skills should be ~90% of domain
          
          if (updatedTechnicalSkills['nmap_mastery'] < targetSkillLevel) {
            const boost = Math.min(10, (targetSkillLevel - updatedTechnicalSkills['nmap_mastery']) * 0.3);
            updatedTechnicalSkills['nmap_mastery'] = Math.min(100, updatedTechnicalSkills['nmap_mastery'] + boost);
            console.log(`[CertStore] Proportional alignment: nmap_mastery +${Math.round(boost)} (recon/enum mastery)`);
          }
          
          if (updatedTechnicalSkills['service_enumeration'] < targetSkillLevel) {
            const boost = Math.min(10, (targetSkillLevel - updatedTechnicalSkills['service_enumeration']) * 0.3);
            updatedTechnicalSkills['service_enumeration'] = Math.min(100, updatedTechnicalSkills['service_enumeration'] + boost);
            console.log(`[CertStore] Proportional alignment: service_enumeration +${Math.round(boost)} (recon/enum mastery)`);
          }
        }
        
        if (updatedDomainScores['web_exploitation'] >= 95) {
          // Web exploitation mastery → boost directory fuzzing
          const targetSkillLevel = updatedDomainScores['web_exploitation'] * 0.9;
          
          if (updatedTechnicalSkills['directory_fuzzing'] < targetSkillLevel) {
            const boost = Math.min(10, (targetSkillLevel - updatedTechnicalSkills['directory_fuzzing']) * 0.3);
            updatedTechnicalSkills['directory_fuzzing'] = Math.min(100, updatedTechnicalSkills['directory_fuzzing'] + boost);
            console.log(`[CertStore] Proportional alignment: directory_fuzzing +${Math.round(boost)} (web mastery)`);
          }
        }
        
        if (updatedDomainScores['privilege_escalation'] >= 95 || updatedDomainScores['post_exploitation'] >= 80) {
          // Privesc mastery → boost linux_privilege_escalation
          const domainAvg = (updatedDomainScores['privilege_escalation'] + updatedDomainScores['post_exploitation']) / 2;
          const targetSkillLevel = domainAvg * 0.85;
          
          if (updatedTechnicalSkills['linux_privilege_escalation'] < targetSkillLevel) {
            const boost = Math.min(10, (targetSkillLevel - updatedTechnicalSkills['linux_privilege_escalation']) * 0.3);
            updatedTechnicalSkills['linux_privilege_escalation'] = Math.min(100, updatedTechnicalSkills['linux_privilege_escalation'] + boost);
            console.log(`[CertStore] Proportional alignment: linux_privilege_escalation +${Math.round(boost)} (privesc mastery)`);
          }
          
          if (updatedTechnicalSkills['sudo_misconfiguration'] < targetSkillLevel) {
            const boost = Math.min(8, (targetSkillLevel - updatedTechnicalSkills['sudo_misconfiguration']) * 0.25);
            updatedTechnicalSkills['sudo_misconfiguration'] = Math.min(100, updatedTechnicalSkills['sudo_misconfiguration'] + boost);
            console.log(`[CertStore] Proportional alignment: sudo_misconfiguration +${Math.round(boost)} (privesc mastery)`);
          }
        }

        // Calculate legacy overall score
        const domainValues = Object.values(updatedDomainScores);
        const newOverallScore = domainValues.reduce((sum, score) => sum + score, 0) / domainValues.length;

        // ========================================
        // STEP 3: Generate Focus Areas & Recommendations
        // ========================================
        
        const newFocusAreas: FocusArea[] = [];
        const recommendedTraining: RecommendedTraining[] = [];
        
        // Identify weak PT1 sections
        updatedSections.forEach(section => {
          if (section.status === 'insufficient_evidence' || section.status === 'needs_more_drills') {
            const relatedDomains = Object.entries(domainToSectionMap)
              .filter(([, sec]) => sec === section.section)
              .map(([domain]) => domain as CertificationDomain);
            
            const weakestDomain = relatedDomains.sort((a, b) => 
              updatedDomainScores[a] - updatedDomainScores[b]
            )[0];
            
            newFocusAreas.push({
              section: section.section,
              domain: weakestDomain,
              priority: section.status === 'insufficient_evidence' ? 'high' : 'medium',
              rationale: section.status === 'insufficient_evidence' 
                ? `Insufficient evidence in ${section.section.replace(/_/g, ' ')}`
                : `Below pass threshold (${section.score}% vs ${PT1_PASS_THRESHOLD}%)`,
              specific_improvement: `Complete ${section.section === 'web_application_testing' ? 'Web Black-Box' : section.section === 'active_directory_testing' ? 'AD + Lateral Movement' : 'Network Security'} drills`,
              practice_opportunities: [
                section.section === 'web_application_testing' ? 'PT1 Web Black-Box Exam' : 
                section.section === 'active_directory_testing' ? 'PT1 AD Exam' : 
                'PT1 Micro-Sims: Network Discovery',
                `Command Drills: ${weakestDomain.replace(/_/g, ' ')}`,
              ],
            });
            
            recommendedTraining.push({
              section: section.section,
              domain: weakestDomain,
              priority: section.status === 'insufficient_evidence' ? 'high' : 'medium',
              description: section.status === 'insufficient_evidence'
                ? `Insufficient evidence - complete drills in ${section.section.replace(/_/g, ' ')}`
                : `Below pass threshold (${section.score}%) - focus on ${weakestDomain.replace(/_/g, ' ')}`,
            });
          }
        });

        // Add failure points
        const newFailurePoints: FailurePoint[] = missed_steps.map((step) => ({
          domain: 'enumeration' as CertificationDomain,
          description: step,
          timestamp: new Date().toISOString(),
          severity: 'medium' as const,
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
          unnecessary_commands: totalCommands - correctCommands,
          missed_enumeration_steps: missed_steps,
          proper_tool_usage: Math.round(properToolUsage),
        };

        // Add to simulation history
        // CRITICAL: Use custom date if provided (for imported reports), otherwise current date
        const newSimulationEntry: SimulationHistory = {
          date: (simulationData as any).customDate || new Date().toISOString(),
          difficulty,
          score: evaluation.overallScore,
          domains_practiced,
          flags_captured,
          hints_used,
        };

        const updatedHistory = [newSimulationEntry, ...state.simulation_history].slice(0, 20);

        // Update state
        const newState = {
          ejpt_readiness: updatedEJPTReadiness,
          pt1_readiness: updatedPT1Readiness,
          oscp_readiness: updatedOSCPReadiness,
          overall_score: Math.round(newOverallScore),
          domain_scores: updatedDomainScores,
          technical_skills: updatedTechnicalSkills,
          demonstrated_strengths: state.demonstrated_strengths,
          focus_areas: newFocusAreas,
          failure_points: [...newFailurePoints, ...state.failure_points].slice(0, 50),
          methodology_efficiency: updatedMethodologyEfficiency,
          completed_simulations: state.completed_simulations + 1,
          recommended_training: recommendedTraining.slice(0, 10),
          last_simulation_date: new Date().toISOString(),
          simulation_history: updatedHistory,
          isSynced: false,
        };
        
        set(newState);
        
        console.log('[CertStore] After update:', {
          completed_simulations: newState.completed_simulations,
          ejpt_weighted_score: newState.ejpt_readiness.weighted_score,
          pt1_weighted_score: newState.pt1_readiness.weighted_score,
          oscp_weighted_score: newState.oscp_readiness.weighted_score,
          ejpt_status: newState.ejpt_readiness.status,
          pt1_status: newState.pt1_readiness.status,
          oscp_status: newState.oscp_readiness.status,
        });

        // Sync to database
        await get().syncToDatabase();
      },

      addFailurePoint: (failure) => {
        const state = get();
        const newFailure: FailurePoint = {
          ...failure,
          timestamp: new Date().toISOString(),
        };
        
        set({
          failure_points: [newFailure, ...state.failure_points].slice(0, 50),
          isSynced: false,
        });
      },

      resetReadiness: async () => {
        // Reset to true zero - no baselines, no stale data
        set({
          ejpt_readiness: defaultEJPTReadiness,
          pt1_readiness: defaultPT1Readiness,
          oscp_readiness: defaultOSCPReadiness,
          overall_score: 0,
          domain_scores: defaultDomainScores,
          technical_skills: defaultTechnicalSkills,
          demonstrated_strengths: [],
          focus_areas: [],
          failure_points: [],
          methodology_efficiency: defaultMethodologyEfficiency,
          completed_simulations: 0,
          recommended_training: [],
          last_simulation_date: null,
          simulation_history: [],
          isSynced: false,
        });
        
        // Sync to database to persist reset
        await get().syncToDatabase();
        
        // Clear localStorage
        localStorage.removeItem('seshforge-certification');
        
        console.log('[CertStore] Complete reset executed - true zero state');
      },
    }),
    {
      name: 'seshforge-certification',
    }
  )
);
