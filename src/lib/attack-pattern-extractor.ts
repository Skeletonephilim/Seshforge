/**
 * REALITY-INSPIRED SCENARIO DISTILLERY
 * 
 * Transforms authorized pentest writeups into abstract attack patterns (Attack DNA)
 * that can be reused to generate new exam scenarios WITHOUT copying exact details.
 * 
 * HARD CONSTRAINTS:
 * - NEVER copy exact machine names, flags, credentials, endpoints, URLs
 * - Extract STRUCTURE and METHODOLOGY ONLY, not content
 * - Output: reusable, randomized, non-identifiable, methodology-driven patterns
 */

import { DevvAI } from '@devvai/devv-code-backend';
import { parseAIJson } from './utils';

/**
 * Attack DNA - Abstract attack pattern extracted from real writeups
 */
export interface AttackDNA {
  // Classification
  category: string; // e.g. 'web_to_linux_privesc', 'ad_lateral_movement', 'api_abuse_chain'
  difficulty: 'beginner' | 'intermediate' | 'pt1_hard' | 'advanced';
  
  // Service Profile (abstract)
  services: string[]; // e.g. ['http', 'ssh', 'smb', 'database']
  
  // Entry Vector Type (NOT exact vuln)
  entry_vector_type: string; // e.g. 'credential_leak_via_hidden_resource', 'auth_logic_flaw', 'injection'
  
  // Enumeration Requirements
  enumeration_requirements: string[]; // e.g. ['directory fuzzing', 'manual browsing', 'file analysis']
  
  // Attack Chain Structure (generalized phases)
  attack_chain_shape: string[]; // e.g. ['surface mapping', 'hidden resource discovery', 'credential extraction', 'ssh access']
  
  // Pivot Logic
  pivot_logic: string[]; // e.g. ['credential reuse', 'multi-step dependency', 'internal enumeration']
  
  // Privilege Escalation Type (generalized)
  privilege_escalation_type: string; // e.g. 'path_hijack', 'suid_abuse', 'token_impersonation'
  
  // Deception Elements
  deception_elements: string[]; // e.g. ['false directory', 'misleading file', 'dead-end credentials']
  
  // Difficulty Factors (0-100 scores)
  difficulty_factors: {
    enumeration_depth: number; // How deep enumeration is required
    deception_level: number; // How many false leads exist
    chain_complexity: number; // How many interdependent steps
  };
  
  // Metadata
  extracted_from?: string; // Optional: source reference (HTB box name, blog URL, etc.)
  extraction_date?: string;
  notes?: string; // Optional: any special considerations
}

/**
 * Extract Attack DNA from writeup text
 */
export async function extractAttackDNA(
  writeupText: string,
  sourceReference?: string
): Promise<AttackDNA> {
  const ai = new DevvAI();
  
  const prompt = `You are an advanced penetration testing pattern extraction engine.

Your role: Transform this pentest writeup into an ABSTRACT ATTACK PATTERN (Attack DNA).

🚨 CRITICAL CONSTRAINTS:
- NEVER copy exact machine names, flags, credentials, endpoints, URLs
- Extract STRUCTURE and METHODOLOGY ONLY, not content
- Generalize all specific details into abstract categories

WRITEUP TEXT:
${writeupText.substring(0, 10000)} ${writeupText.length > 10000 ? '...(truncated)' : ''}

EXTRACTION PROCESS:

1. IDENTIFY SERVICES (abstract):
   Example: "Web (CMS-like)", "SSH", "SMB", "Database" (NOT "WordPress 5.8.1" or "10.10.10.50:3306")

2. IDENTIFY ENTRY VECTOR TYPE (category, not exact vuln):
   Examples: "Auth logic flaw", "File exposure", "Credential leakage", "Injection", "API abuse"
   (NOT "SQLi in login.php?id=1")

3. ATTACK CHAIN STRUCTURE (generalize phases):
   Break into: Recon → Enum → Foothold → Pivot → PrivEsc
   Generalize: "Hidden file exposure via secondary enumeration leading to credential discovery"
   (NOT "/backup/config.php.bak gave creds")

4. ENUMERATION REQUIREMENTS:
   What techniques were REQUIRED? (directory fuzzing, manual browsing, parameter fuzzing, file download + grep, service-specific enum)

5. PIVOT LOGIC:
   Was credential reuse needed? Lateral thinking? Chain dependency?

6. PRIVILEGE ESCALATION TYPE:
   Generalize: "SUID abuse", "Cron misconfig", "PATH hijack", "Capabilities", "Container escape", "Weak service permissions"

7. DECEPTION ELEMENTS:
   Detect: False leads, dead ends, misleading files, fake credentials

8. DIFFICULTY FACTORS:
   Score (0-100): Enumeration depth, Required intuition, Chain length, Deception level

RESPOND WITH ONLY THIS JSON FORMAT:
{
  "category": "web_to_linux_privesc",
  "difficulty": "pt1_hard",
  "services": ["http", "ssh"],
  "entry_vector_type": "credential_leak_via_hidden_resource",
  "enumeration_requirements": [
    "directory fuzzing",
    "manual browsing",
    "file analysis"
  ],
  "attack_chain_shape": [
    "surface mapping",
    "hidden resource discovery",
    "credential extraction",
    "ssh access",
    "local enumeration",
    "privilege escalation"
  ],
  "pivot_logic": [
    "credential reuse",
    "multi-step dependency"
  ],
  "privilege_escalation_type": "path_hijack",
  "deception_elements": [
    "false directory",
    "misleading file",
    "dead-end credentials"
  ],
  "difficulty_factors": {
    "enumeration_depth": 85,
    "deception_level": 80,
    "chain_complexity": 75
  }
}

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations, no extra text.`;

  try {
    const response = await ai.chat.completions.create({
      model: 'kimi-k2-0711-preview',
      messages: [
        { 
          role: 'system', 
          content: 'You are a pentest pattern extraction engine. Extract ONLY abstract structure and methodology from writeups. NEVER copy specific details. Respond ONLY with valid JSON.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.4, // Lower temperature for more consistent extraction
    });

    const content = response.choices[0].message.content || '';
    console.log('[AttackDNA] Raw AI response:', content.substring(0, 200));
    
    const dna = parseAIJson<AttackDNA>(content);
    
    // Add metadata
    dna.extracted_from = sourceReference;
    dna.extraction_date = new Date().toISOString();
    
    // Validate extraction
    validateAttackDNA(dna);
    
    console.log('[AttackDNA] Successfully extracted:', {
      category: dna.category,
      difficulty: dna.difficulty,
      services: dna.services.length,
      chainLength: dna.attack_chain_shape.length,
    });
    
    return dna;
    
  } catch (error) {
    console.error('[AttackDNA] Extraction failed:', error);
    throw new Error(`Failed to extract attack DNA: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate Attack DNA structure and content
 */
function validateAttackDNA(dna: AttackDNA): void {
  // Check for forbidden specific details
  const forbiddenPatterns = [
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP addresses
    /THM\{.*\}/, // THM flags
    /HTB\{.*\}/, // HTB flags
    /FLAG\{.*\}/, // Generic flags
    /admin:admin/, // Specific credentials
    /password123/, // Specific passwords
    /\/backup\/.*\.bak/, // Specific file paths
  ];
  
  const fullJSON = JSON.stringify(dna);
  
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(fullJSON)) {
      throw new Error(`Attack DNA contains forbidden specific detail: ${pattern}`);
    }
  }
  
  // Validate required fields
  if (!dna.category || !dna.difficulty || !dna.services || dna.services.length === 0) {
    throw new Error('Attack DNA missing required fields');
  }
  
  if (!dna.attack_chain_shape || dna.attack_chain_shape.length < 3) {
    throw new Error('Attack chain must have at least 3 phases');
  }
  
  if (!dna.difficulty_factors || 
      dna.difficulty_factors.enumeration_depth < 0 || 
      dna.difficulty_factors.enumeration_depth > 100) {
    throw new Error('Difficulty factors must be between 0-100');
  }
}

/**
 * Batch extract Attack DNA from multiple writeups
 */
export async function batchExtractAttackDNA(
  writeups: Array<{ text: string; source?: string }>
): Promise<AttackDNA[]> {
  const results: AttackDNA[] = [];
  
  for (const writeup of writeups) {
    try {
      const dna = await extractAttackDNA(writeup.text, writeup.source);
      results.push(dna);
      
      // Rate limiting: wait 2 seconds between extractions
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`[AttackDNA] Failed to extract from source: ${writeup.source}`, error);
      // Continue with other writeups
    }
  }
  
  console.log(`[AttackDNA] Batch extraction complete: ${results.length}/${writeups.length} successful`);
  return results;
}

/**
 * Store Attack DNA patterns (for future database persistence)
 */
export interface AttackDNALibrary {
  patterns: AttackDNA[];
  lastUpdated: string;
  version: string;
}

/**
 * Initialize default Attack DNA library with hand-crafted patterns
 */
export function getDefaultAttackDNALibrary(): AttackDNALibrary {
  return {
    patterns: [
      // Pattern 1: Hidden API credential leak
      {
        category: 'web_api_credential_leak',
        difficulty: 'pt1_hard',
        services: ['http', 'ssh'],
        entry_vector_type: 'hidden_api_credential_leak',
        enumeration_requirements: [
          'javascript bundle analysis',
          'api endpoint discovery',
          'parameter fuzzing',
          'manual testing',
        ],
        attack_chain_shape: [
          'web application reconnaissance',
          'javascript source analysis',
          'undocumented api discovery',
          'api abuse for credential extraction',
          'ssh key retrieval',
          'ssh access with key',
          'local privilege escalation',
        ],
        pivot_logic: [
          'javascript analysis reveals hidden endpoints',
          'api provides indirect ssh key access',
        ],
        privilege_escalation_type: 'cron_job_path_hijack',
        deception_elements: [
          'obvious login form is not vulnerable',
          'documented api endpoints have no privile ged access',
          'multiple ssh users but only one has accessible key',
        ],
        difficulty_factors: {
          enumeration_depth: 85,
          deception_level: 75,
          chain_complexity: 80,
        },
        notes: 'Requires manual JavaScript analysis and API fuzzing',
      },
      
      // Pattern 2: SMB lateral movement chain
      {
        category: 'smb_lateral_credential_chain',
        difficulty: 'pt1_hard',
        services: ['http', 'smb', 'ssh'],
        entry_vector_type: 'file_inclusion_to_credential_leak',
        enumeration_requirements: [
          'web directory enumeration',
          'parameter fuzzing for lfi',
          'smb share enumeration',
          'file content analysis',
        ],
        attack_chain_shape: [
          'web application discovery',
          'local file inclusion vulnerability',
          'configuration file extraction',
          'database credential discovery',
          'database enumeration',
          'password hash extraction',
          'offline hash cracking',
          'credential reuse testing',
          'smb access with discovered credentials',
          'script discovery in smb share',
          'secondary credential extraction',
          'privilege escalation',
        ],
        pivot_logic: [
          'lfi provides database access',
          'database contains hashes for different service',
          'cracked credentials work on smb',
          'smb share contains script with admin credentials',
        ],
        privilege_escalation_type: 'sudo_misconfiguration',
        deception_elements: [
          'admin panel exists but sql injection fails',
          'anonymous smb returns shares but most read-only',
          'multiple credentials found but wrong services',
        ],
        difficulty_factors: {
          enumeration_depth: 90,
          deception_level: 85,
          chain_complexity: 88,
        },
        notes: 'Multi-pivot chain requiring credential testing across services',
      },
      
      // Pattern 3: Active Directory Kerberos attack
      {
        category: 'ad_kerberos_dcsync_chain',
        difficulty: 'advanced',
        services: ['ldap', 'kerberos', 'smb', 'winrm'],
        entry_vector_type: 'asrep_roasting_to_dcsync',
        enumeration_requirements: [
          'ldap anonymous enumeration',
          'kerberos pre-auth testing',
          'smb null session',
          'user description field analysis',
        ],
        attack_chain_shape: [
          'ldap user enumeration',
          'identify asrep roastable accounts',
          'extract asrep hashes',
          'offline hash cracking',
          'authenticate as low-priv user',
          'smb share enumeration with creds',
          'script analysis for embedded credentials',
          'bloodhound enumeration',
          'identify dcsync rights',
          'dcsync attack execution',
          'domain admin hash extraction',
        ],
        pivot_logic: [
          'asrep roasting provides initial foothold',
          'smb share contains script with service account creds',
          'service account has dcsync rights (non-obvious)',
        ],
        privilege_escalation_type: 'dcsync_replication_rights',
        deception_elements: [
          'kerberoasting returns hashes with strong passwords',
          'anonymous ldap gives limited user list',
          'winrm accessible but initial credentials insufficient',
          'multiple service accounts are decoys',
        ],
        difficulty_factors: {
          enumeration_depth: 92,
          deception_level: 88,
          chain_complexity: 95,
        },
        notes: 'Requires BloodHound analysis and understanding of AD privilege escalation paths',
      },
    ],
    lastUpdated: new Date().toISOString(),
    version: '1.0.0',
  };
}

/**
 * Export Attack DNA library as JSON for storage/sharing
 */
export function exportAttackDNALibrary(library: AttackDNALibrary): string {
  return JSON.stringify(library, null, 2);
}

/**
 * Import Attack DNA library from JSON
 */
export function importAttackDNALibrary(jsonString: string): AttackDNALibrary {
  try {
    const library = JSON.parse(jsonString) as AttackDNALibrary;
    
    // Validate all patterns
    for (const pattern of library.patterns) {
      validateAttackDNA(pattern);
    }
    
    return library;
  } catch (error) {
    throw new Error(`Failed to import Attack DNA library: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}
