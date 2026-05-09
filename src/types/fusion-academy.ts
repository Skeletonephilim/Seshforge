/**
 * Fusion Academy Types
 * 
 * Dual-track certification engine combining:
 * - SEC1: Hands-on practical scenarios
 * - CEH: Structured breadth and terminology
 * - CEH Practical: Timed technical execution
 */

// ============================================================================
// Core Domain Types
// ============================================================================

export type SEC1Domain =
  | 'os_network_fundamentals'
  | 'red_team'
  | 'blue_team'
  | 'investigative_workflow';

export type CEHModule =
  | 'footprinting_reconnaissance'
  | 'scanning_networks'
  | 'enumeration'
  | 'vulnerability_analysis'
  | 'system_hacking'
  | 'malware_threats'
  | 'sniffing'
  | 'social_engineering'
  | 'denial_of_service'
  | 'session_hijacking'
  | 'ids_firewall_evasion'
  | 'hacking_web_servers'
  | 'hacking_web_applications'
  | 'sql_injection'
  | 'hacking_wireless_networks'
  | 'hacking_mobile_platforms'
  | 'iot_ot_hacking'
  | 'cloud_computing'
  | 'cryptography';

export type CEHPracticalSkill =
  | 'reconnaissance'
  | 'scanning'
  | 'enumeration'
  | 'vulnerability_exploitation'
  | 'web_attack'
  | 'service_identification'
  | 'exploitation_logic'
  | 'privilege_escalation'
  | 'lateral_movement'
  | 'data_exfiltration';

export type THMPathModule =
  | 'linux_fundamentals'
  | 'windows_fundamentals'
  | 'active_directory_fundamentals'
  | 'command_line'
  | 'networking_concepts'
  | 'networking_core_protocols'
  | 'secure_protocols'
  | 'wireshark'
  | 'tcpdump'
  | 'nmap_basics'
  | 'cryptography_basics'
  | 'public_key_crypto'
  | 'hashing'
  | 'password_cracking_basics'
  | 'search_skills_recon'
  | 'exploitation_basics'
  | 'metasploit'
  | 'web_application_basics'
  | 'javascript_basics'
  | 'sql_fundamentals'
  | 'burp_suite_basics'
  | 'hydra'
  | 'gobuster'
  | 'shells'
  | 'sqlmap'
  | 'soc_fundamentals'
  | 'digital_forensics_fundamentals'
  | 'incident_response'
  | 'logs'
  | 'siem'
  | 'firewall'
  | 'ids'
  | 'vulnerability_scanners'
  | 'cyberchef'
  | 'capa'
  | 'remnux'
  | 'flarevm'
  | 'owasp_top_10';

export type DomainNodeCategory =
  | 'foundational'
  | 'offensive'
  | 'defensive_investigative'
  | 'extended_ceh_breadth';

// ============================================================================
// Certification Mapping
// ============================================================================

export interface SEC1Mapping {
  relevance: SEC1Domain[];
  exam_style: Array<'artifact_driven' | 'scenario_based' | 'practical_question'>;
  description?: string;
}

export interface CEHMapping {
  modules: CEHModule[];
  theory_focus: Array<'attack_classification' | 'methodology_phase' | 'countermeasure_awareness'>;
  terminology?: string[];
  description?: string;
}

export interface CEHPracticalMapping {
  skill_tags: CEHPracticalSkill[];
  time_pressure?: number; // minutes
  objectives?: string[];
}

export interface CertificationMapping {
  sec1: SEC1Mapping;
  ceh: CEHMapping;
  ceh_practical: CEHPracticalMapping;
  thm_path_mapping: THMPathModule[];
}

// ============================================================================
// Domain Graph
// ============================================================================

export interface DomainNode {
  id: string;
  name: string;
  category: DomainNodeCategory;
  
  // Progress metrics
  confidence: number; // 0-100
  practical_score: number; // 0-100
  theory_score: number; // 0-100
  
  // Activity tracking
  last_touched: string; // ISO date
  attempts: number;
  successes: number;
  
  // Quality metrics
  hint_reliance: number; // 0-100 (lower is better)
  report_quality: number; // 0-100
  
  // Relationships
  prerequisites: string[]; // node IDs
  related_nodes: string[]; // node IDs
  
  // Certification mapping
  sec1_domains: SEC1Domain[];
  ceh_modules: CEHModule[];
  thm_path_modules: THMPathModule[];
}

// ============================================================================
// Theory Cards
// ============================================================================

export interface TheoryCard {
  id: string;
  trigger: string; // What action triggers this card
  title: string;
  
  // Four-tab structure
  tabs: {
    what_is_happening: string; // Plain-language mechanic
    sec1_lens: string; // How this appears in SEC1 practical
    ceh_lens: string; // Attack name, methodology, countermeasure
    syntax_reflex: string; // Concrete commands with flag breakdowns
  };
  
  // Related concepts
  related_nodes: string[]; // Domain node IDs
  prerequisites?: string[];
  
  // Visibility
  shown_after: 'discovery' | 'completion' | 'failure';
}

// ============================================================================
// Countermeasure Mirror
// ============================================================================

export interface CountermeasureMirror {
  config_fix: string;
  detection_angle: string;
  logging_angle: string;
  hardening_angle: string;
  remediation_wording: string;
  
  // CEH-style framing
  defense_in_depth_layers?: string[];
  security_controls?: Array<'preventive' | 'detective' | 'corrective' | 'deterrent'>;
}

// ============================================================================
// Training Modes
// ============================================================================

export type TrainingMode = 'sec1' | 'ceh' | 'ceh_practical' | 'mixed';

export type ExamRhythm = 'explore' | 'cert' | 'pressure';

export interface ModeConfig {
  mode: TrainingMode;
  rhythm: ExamRhythm;
  
  // Mode-specific settings
  show_theory: boolean;
  show_countermeasures: boolean;
  require_report: boolean;
  time_limit?: number; // minutes
  
  // Display toggles
  overlay: 'practical' | 'sec1' | 'ceh' | 'report';
}

// ============================================================================
// Expected Finding Type
// ============================================================================

export interface ExpectedFinding {
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  impact: string;
  evidence: string[];
  reproduction_steps: string[];
  remediation: string;
}

// ============================================================================
// Fusion Academy Unit
// ============================================================================

export interface FusionAcademyUnit {
  id: string;
  title: string;
  
  // Certification mapping
  certification_mapping: CertificationMapping;
  
  // Snapshot
  difficulty: 'easy' | 'medium' | 'hard';
  estimated_minutes: number;
  domain: string;
  primary_mechanic: string;
  secondary_mechanic?: string;
  fundamentals_covered: string[];
  reporting_focus: string;
  
  // Content
  brief: string;
  learning_objectives: string[];
  
  // Evidence pack
  artifacts: Array<{
    path: string;
    type: 'text' | 'code' | 'log' | 'pcap' | 'screenshot' | 'database' | 'archive';
    content: string;
  }>;
  
  // Interaction
  supported_commands: string[];
  command_responses: Array<{
    match: string | RegExp;
    output: string;
    state_change?: Record<string, any>;
  }>;
  
  // Investigation flow
  expected_flow: string[];
  key_clues: Array<{
    clue: string;
    why_it_matters: string;
  }>;
  common_mistakes: string[];
  
  // Hints
  hint_ladder: {
    tier_1: string; // Subtle nudge
    tier_2: string; // Directional
    tier_3: string; // Explicit reveal
  };
  
  // Theory
  theory_cards: TheoryCard[];
  
  // Countermeasures
  countermeasure_mirror: CountermeasureMirror;
  
  // Reporting
  reporting_task: {
    required_fields: string[];
    optional_fields: string[];
  };
  expected_finding: ExpectedFinding;
  
  // Knowledge check (CEH mode)
  knowledge_check?: Array<{
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
    ceh_module: CEHModule;
  }>;
  
  // Scoring
  scoring_rubric: {
    completion: number;
    methodology: number;
    signal_recognition: number;
    efficiency: number;
    reporting: number;
    theory_understanding: number;
    reflection: number;
  };
  
  // Variations
  variations?: Array<{
    description: string;
    changes: Record<string, string>;
  }>;
  
  // Implementation
  implementation_notes: {
    trigger_conditions: string[];
    state_changes: Record<string, any>;
    command_mappings: Record<string, string>;
    completion_criteria: string[];
    recovery_drill_recommendation?: string;
  };
}

// ============================================================================
// User Progress
// ============================================================================

export interface FusionAcademyProgress {
  user_id: string;
  
  // Domain graph state
  domain_nodes: Record<string, DomainNode>;
  
  // Mode preferences
  preferred_mode: TrainingMode;
  preferred_rhythm: ExamRhythm;
  
  // Certification readiness
  sec1_readiness: {
    overall: number; // 0-100
    by_domain: Record<SEC1Domain, number>;
    estimated_exam_date?: string;
  };
  
  ceh_readiness: {
    overall: number; // 0-100
    by_module: Record<CEHModule, number>;
    theory_score: number;
    practical_score: number;
    estimated_exam_date?: string;
  };
  
  // Activity tracking
  units_completed: string[];
  units_in_progress: string[];
  total_training_hours: number;
  
  // Quality metrics
  average_hint_usage: number;
  average_report_quality: number;
  
  // Weaknesses
  weakest_nodes: string[]; // Domain node IDs
  recovery_chains_completed: number;
  
  // Timestamps
  last_training_date: string;
  account_created: string;
}

// ============================================================================
// Session State
// ============================================================================

export interface FusionAcademySession {
  unit_id: string;
  mode_config: ModeConfig;
  
  // Progress
  started_at: string;
  current_step: number;
  completed_steps: string[];
  
  // State
  command_history: Array<{
    command: string;
    output: string;
    timestamp: string;
  }>;
  artifacts_viewed: string[];
  clues_discovered: string[];
  hints_used: number;
  hint_tier_used: 1 | 2 | 3 | null;
  
  // Notes
  user_notes: string;
  draft_finding: Partial<ExpectedFinding>;
  
  // Theory
  theory_cards_shown: string[];
  knowledge_check_answers: Array<{
    question_id: number;
    answer: number;
    correct: boolean;
  }>;
  
  // Scoring
  time_spent_seconds: number;
  efficiency_score: number;
  methodology_score: number;
  
  // Completion
  completed: boolean;
  completed_at?: string;
  final_score?: number;
}

// ============================================================================
// Evaluation
// ============================================================================

export interface FusionAcademyEvaluation {
  session_id: string;
  unit_id: string;
  
  // Outcome
  outcome: 'solved' | 'partial' | 'missed';
  
  // Practical assessment
  practical_assessment: {
    evidence_handling: number; // 0-100
    methodology: number;
    action_sequence: number;
    tool_choice: number;
    signal_recognition: number;
    unnecessary_flailing: number; // Lower is better
  };
  
  // SEC1 readiness insight
  sec1_readiness_insight: {
    scenario_reasoning: string;
    artifact_use: string;
    investigative_discipline: string;
    offensive_defensive_balance: string;
    would_hold_up: boolean;
  };
  
  // CEH readiness insight
  ceh_readiness_insight: {
    terminology: number; // 0-100
    attack_classification: number;
    methodology_naming: number;
    countermeasure_understanding: number;
    breadth_gaps: string[];
  };
  
  // Reporting assessment
  reporting_assessment: {
    title_quality: number; // 0-100
    severity_reasoning: number;
    description_clarity: number;
    impact_realism: number;
    evidence_specificity: number;
    remediation_quality: number;
  };
  
  // Scores
  score_breakdown: {
    practical: number;
    theory: number;
    reporting: number;
    reflection: number;
    total: number;
  };
  
  // Recommendations
  weakest_domain_node: string;
  next_best_action: 'fundamentals_recovery' | 'same_family' | 'report_only' | 'theory_quiz' | 'timed_replay';
  recovery_drill_id?: string;
  
  // Debrief
  debrief: string; // One paragraph, sharp and honest
}

// ============================================================================
// Recovery Chain
// ============================================================================

export interface RecoveryChain {
  id: string;
  triggered_by_unit: string;
  failed_domain_node: string;
  
  steps: Array<{
    type: 'fundamentals_explanation' | 'reduced_practical' | 'reskinned_full' | 'report_rewrite';
    unit_id: string;
    completed: boolean;
  }>;
  
  started_at: string;
  completed_at?: string;
}
