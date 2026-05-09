/**
 * AI-Powered Contextual Import Interpreter
 * Treats imported text as progression evidence, not static documents
 * Interprets content contextually and updates progression accordingly
 */

import { DevvAI } from '@devvai/devv-code-backend';
import { parseAIJson } from './utils';

export type ImportCategory = 'drill' | 'lab' | 'module';

export interface ImportInterpretation {
  // Categorization
  category: ImportCategory;
  confidence: number; // 0-1 confidence in categorization
  
  // Success Assessment
  performanceLevel: 'excellent' | 'good' | 'partial' | 'poor' | 'insufficient_evidence';
  successRating: number; // 0-1 scale
  shouldCount: boolean; // Whether this counts as a completion
  
  // Extracted Evidence
  evidence: {
    ports?: string[];
    services?: string[];
    directories?: string[];
    credentials?: string[];
    flags?: string[];
    commandsExecuted?: number;
    phasesCompleted?: string[];
    mistakesIdentified?: string[];
  };
  
  // Performance Metrics
  scores?: {
    reconnaissance?: number;
    scanning?: number;
    enumeration?: number;
    exploitation?: number;
    privilegeEscalation?: number;
    methodology?: number;
    overall?: number;
  };
  
  // Skill Evidence
  technicalSkills: {
    [key: string]: number; // Skill name -> proficiency delta (0-20)
  };
  
  domains: string[]; // Certification domains practiced
  
  // Time/Duration
  timeSpentHours?: number;
  hasTimestamp: boolean;
  
  // Progression Updates
  progressionUpdates: {
    incrementCount: boolean; // Whether to increment drill/lab/module count
    successModifier: number; // 0-1 multiplier for success rate
    improvementDetected: boolean;
    stagnationDetected: boolean;
    strengthsDemonstrated: string[];
    focusAreas: string[];
  };
  
  // Justification
  reasoning: string;
  interpretationSummary: string;
}

/**
 * Use AI to interpret imported content contextually
 */
export async function interpretImportedContent(
  content: string,
  suggestedCategory?: ImportCategory
): Promise<ImportInterpretation> {
  const ai = new DevvAI();
  
  const systemPrompt = `You are an expert pentesting training assessment AI. Your task is to analyze imported training reports/text and determine:

1. **Category**: Is this a Drill (short focused practice), Lab (hands-on scenario), or Module (learning content)?
2. **Success Level**: Excellent, Good, Partial, Poor, or Insufficient Evidence
3. **Evidence Extraction**: Pull out discovered ports, services, credentials, flags, commands, etc.
4. **Skill Impact**: Which technical skills were demonstrated and how much improvement?
5. **Progression**: Should this count as completion? Is there improvement, stagnation, or mixed results?

CRITICAL RULES:
- Treat content as EVIDENCE for progression updates, not static documents
- Meaningful success = improvement (even partial counts)
- Lack of evidence = no major change (NOT punishment)
- Repeated mistakes should cause stagnation, not regression
- Strengths demonstrated should not be erased by mistakes
- Be FAIR and ENCOURAGING in assessment

Respond with ONLY valid JSON in this exact format:
{
  "category": "drill|lab|module",
  "confidence": 0.95,
  "performanceLevel": "excellent|good|partial|poor|insufficient_evidence",
  "successRating": 0.85,
  "shouldCount": true,
  "evidence": {
    "ports": ["22", "80"],
    "services": ["SSH", "HTTP"],
    "directories": ["/admin", "/backup"],
    "credentials": ["admin:pass"],
    "flags": ["THM{...}"],
    "commandsExecuted": 15,
    "phasesCompleted": ["reconnaissance", "enumeration"],
    "mistakesIdentified": ["Skipped service enumeration"]
  },
  "scores": {
    "reconnaissance": 85,
    "overall": 82
  },
  "technicalSkills": {
    "nmap_mastery": 5,
    "directory_fuzzing": 8,
    "credential_hunting": 3
  },
  "domains": ["reconnaissance", "enumeration", "web_exploitation"],
  "timeSpentHours": 0.75,
  "hasTimestamp": true,
  "progressionUpdates": {
    "incrementCount": true,
    "successModifier": 0.85,
    "improvementDetected": true,
    "stagnationDetected": false,
    "strengthsDemonstrated": ["Thorough reconnaissance", "Effective enumeration"],
    "focusAreas": ["Improve exploitation speed"]
  },
  "reasoning": "This drill shows excellent reconnaissance and enumeration skills with 15 commands executed...",
  "interpretationSummary": "Strong performance with room for improvement in exploitation phase"
}`;

  const userPrompt = `${suggestedCategory ? `SUGGESTED CATEGORY: ${suggestedCategory}\n\n` : ''}IMPORTED CONTENT TO ANALYZE:\n\n${content.substring(0, 8000)}

TASK: Analyze this content and determine its training value. Extract evidence, assess performance, and recommend progression updates.

RESPOND WITH ONLY VALID JSON - NO MARKDOWN, NO EXTRA TEXT.`;

  try {
    const response = await ai.chat.completions.create({
      model: 'kimi-k2-0711-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const aiContent = response.choices[0]?.message?.content || '{}';
    const interpretation = parseAIJson<ImportInterpretation>(aiContent);
    
    // Validate critical fields
    if (!interpretation.category || !interpretation.performanceLevel) {
      throw new Error('AI response missing critical fields');
    }
    
    console.log('[CONTEXTUAL IMPORT] AI Interpretation:', {
      category: interpretation.category,
      performanceLevel: interpretation.performanceLevel,
      successRating: interpretation.successRating,
      shouldCount: interpretation.shouldCount,
      evidenceCount: Object.keys(interpretation.evidence || {}).length,
    });
    
    return interpretation;
  } catch (error) {
    console.error('[CONTEXTUAL IMPORT] AI interpretation failed:', error);
    
    // Fallback: basic heuristic analysis
    return createFallbackInterpretation(content, suggestedCategory);
  }
}

/**
 * Fallback interpretation using heuristic analysis (if AI fails)
 */
function createFallbackInterpretation(
  content: string,
  suggestedCategory?: ImportCategory
): ImportInterpretation {
  const lower = content.toLowerCase();
  
  // Heuristic categorization
  let category: ImportCategory = suggestedCategory || 'drill';
  let confidence = 0.5;
  
  if (!suggestedCategory) {
    if (lower.includes('module') || lower.includes('lesson') || lower.includes('tutorial')) {
      category = 'module';
      confidence = 0.7;
    } else if (lower.includes('lab') || lower.includes('scenario') || lower.includes('hands-on')) {
      category = 'lab';
      confidence = 0.7;
    } else if (lower.includes('drill') || lower.includes('practice') || lower.includes('exercise')) {
      category = 'drill';
      confidence = 0.7;
    }
  } else {
    confidence = 0.8;
  }
  
  // Extract basic evidence
  const ports = content.match(/(?:port[s]?\s*:?\s*|open\s+)(\d+(?:,\s*\d+)*)/gi);
  const credentials = content.match(/[\w]+:[\w@#$%^&*]+/g);
  const flags = content.match(/(?:THM|FLAG|CTF|HTB|OSCP)\{[^}]+\}/gi);
  
  // Assess performance based on evidence
  const hasSignificantEvidence = 
    (ports && ports.length > 0) ||
    (credentials && credentials.length > 0) ||
    (flags && flags.length > 0) ||
    content.length > 500;
  
  const performanceLevel = hasSignificantEvidence ? 'partial' : 'insufficient_evidence';
  const successRating = hasSignificantEvidence ? 0.6 : 0.3;
  
  return {
    category,
    confidence,
    performanceLevel,
    successRating,
    shouldCount: hasSignificantEvidence,
    evidence: {
      ports: ports ? ports.slice(0, 10).map(p => p.match(/\d+/)?.[0] || '').filter(Boolean) : [],
      credentials: credentials ? credentials.slice(0, 5) : [],
      flags: flags ? flags.slice(0, 3) : [],
    },
    scores: {},
    technicalSkills: {},
    domains: [],
    timeSpentHours: undefined,
    hasTimestamp: false,
    progressionUpdates: {
      incrementCount: hasSignificantEvidence,
      successModifier: successRating,
      improvementDetected: hasSignificantEvidence,
      stagnationDetected: false,
      strengthsDemonstrated: [],
      focusAreas: [],
    },
    reasoning: 'Fallback heuristic analysis used due to AI interpretation failure',
    interpretationSummary: hasSignificantEvidence 
      ? 'Basic evidence detected - partial progress'
      : 'Insufficient evidence for meaningful progression update',
  };
}

/**
 * Extract time/duration from content
 */
export function extractTimeInfo(content: string): { hours: number; hasTimestamp: boolean } {
  const lower = content.toLowerCase();
  
  // Look for duration patterns
  const durationPatterns = [
    /duration[:\s]*(\d+)\s*(?:hour|hr|h)/i,
    /time\s*spent[:\s]*(\d+)\s*(?:hour|hr|h)/i,
    /(\d+)\s*(?:hour|hr|h)(?:\s*and\s*)?(\d+)?\s*(?:minute|min|m)?/i,
  ];
  
  for (const pattern of durationPatterns) {
    const match = content.match(pattern);
    if (match) {
      const hours = parseInt(match[1] || '0');
      const minutes = parseInt(match[2] || '0');
      return {
        hours: hours + (minutes / 60),
        hasTimestamp: true,
      };
    }
  }
  
  // Check for timestamp existence
  const hasTimestamp = /\d{4}-\d{2}-\d{2}|\d{2}:\d{2}:\d{2}/.test(content);
  
  return {
    hours: 0,
    hasTimestamp,
  };
}
