import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitizes AI-generated JSON string by escaping control characters
 * Fixes: "bad control character in string literal" JSON parsing errors
 * 
 * IMPORTANT: JSON.parse() handles newlines in two ways:
 * 1. Inside strings: Must be escaped as \n (the AI should do this)
 * 2. Outside strings (whitespace): Actual newlines are valid
 * 
 * This function handles cases where AI includes UNESCAPED newlines INSIDE string values
 * 
 * @param jsonStr - Raw JSON string from AI response
 * @returns Sanitized JSON string safe for JSON.parse()
 */
export function sanitizeAIJson(jsonStr: string): string {
  // Strategy: Parse char-by-char and only escape control chars inside strings
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (escapeNext) {
      // Keep escaped characters as-is
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      result += char;
      inString = !inString;
      continue;
    }
    
    // If we're inside a string, escape control characters
    if (inString) {
      switch (char) {
        case '\n':
          result += '\\n';
          break;
        case '\r':
          result += '\\r';
          break;
        case '\t':
          result += '\\t';
          break;
        default:
          result += char;
      }
    } else {
      // Outside strings, keep everything as-is (including whitespace newlines)
      result += char;
    }
  }
  
  return result;
}

/**
 * Extracts JSON from AI response text that may contain markdown or extra text
 * Handles both markdown code blocks and plain JSON
 * 
 * @param content - Raw AI response content
 * @returns Extracted JSON string or null if not found
 */
export function extractJsonFromAI(content: string): string | null {
  // Try to extract from markdown code block first (```json ... ```)
  const markdownMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
  if (markdownMatch) {
    return markdownMatch[1].trim();
  }
  
  // Try markdown without language specifier
  const markdownMatch2 = content.match(/```\s*({[\s\S]*?})\s*```/);
  if (markdownMatch2) {
    return markdownMatch2[1].trim();
  }
  
  // Find JSON by balancing braces, but skip braces inside strings
  let braceCount = 0;
  let startIndex = -1;
  let endIndex = -1;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    // Handle escape sequences
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    // Track whether we're inside a string
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    // Only count braces outside of strings
    if (!inString) {
      if (char === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          endIndex = i;
          break;
        }
      }
    }
  }
  
  if (startIndex !== -1 && endIndex !== -1) {
    return content.substring(startIndex, endIndex + 1).trim();
  }
  
  return null;
}

/**
 * Safely parses AI-generated JSON by extracting and sanitizing first
 * 
 * @param content - Raw AI response content (may include markdown or extra text)
 * @returns Parsed JSON object
 * @throws Error if JSON cannot be extracted or parsed
 */
export function parseAIJson<T = any>(content: string): T {
  const jsonStr = extractJsonFromAI(content);
  
  if (!jsonStr) {
    throw new Error('No valid JSON found in AI response');
  }
  
  // Check for obviously invalid JSON patterns
  if (jsonStr.trim() === '{}' || jsonStr.trim() === '{,}') {
    throw new Error('AI returned empty or malformed JSON object');
  }
  
  // Remove trailing commas (common AI mistake)
  let cleanedJson = jsonStr
    .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas before } or ]
    .replace(/,(\s*,)/g, ',')       // Remove duplicate commas
    .replace(/\/\/[^\n]*/g, '')     // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
  
  // Additional cleaning: Remove leading commas after opening brace
  cleanedJson = cleanedJson.replace(/{\s*,/g, '{');
  
  const sanitized = sanitizeAIJson(cleanedJson);
  
  try {
    const parsed = JSON.parse(sanitized);
    
    // Validate that we actually got an object
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Parsed result is not a valid object');
    }
    
    return parsed;
  } catch (parseError) {
    // Enhanced debugging: show character codes near the error
    let debugInfo = {
      original: content.substring(0, 300) + '...',
      extracted: jsonStr.substring(0, 300) + '...',
      cleaned: cleanedJson.substring(0, 300) + '...',
      sanitized: sanitized.substring(0, 300) + '...',
      error: parseError
    };
    
    // If error mentions a column, show chars around that position
    const columnMatch = parseError instanceof Error && parseError.message.match(/column (\d+)/);
    if (columnMatch) {
      const col = parseInt(columnMatch[1]);
      const start = Math.max(0, col - 10);
      const end = Math.min(sanitized.length, col + 10);
      const snippet = sanitized.substring(start, end);
      const charCodes = Array.from(snippet).map(c => `${c}(${c.charCodeAt(0)})`).join(' ');
      debugInfo = { ...debugInfo, columnSnippet: snippet, charCodes } as any;
    }
    
    console.error('Failed to parse AI JSON:', debugInfo);
    throw new Error(`JSON parsing failed: ${parseError}`);
  }
}

/**
 * Sleep utility for retry delays
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts?: number;      // Maximum number of retry attempts (default: 3)
  initialDelayMs?: number;   // Initial delay in milliseconds (default: 1000)
  maxDelayMs?: number;       // Maximum delay in milliseconds (default: 10000)
  backoffMultiplier?: number; // Exponential backoff multiplier (default: 2)
  retryableErrors?: string[]; // Specific error messages to retry (default: all)
}

/**
 * Executes an async function with exponential backoff retry logic
 * 
 * Use cases:
 * - AI API calls that may fail due to rate limits or transient network issues
 * - Database operations that may fail due to temporary connection issues
 * - Any async operation that benefits from automatic retry
 * 
 * @param fn - Async function to execute with retry logic
 * @param config - Retry configuration options
 * @returns Promise resolving to the function result
 * @throws Error if all retry attempts fail
 * 
 * @example
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('/api/generate');
 *     return parseAIJson(await response.text());
 *   },
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    retryableErrors = [] // Empty means retry all errors
  } = config;

  let lastError: Error | unknown;
  let currentDelay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if this error should be retried
      const shouldRetry = retryableErrors.length === 0 || 
        (error instanceof Error && retryableErrors.some(msg => error.message.includes(msg)));
      
      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxAttempts || !shouldRetry) {
        console.error(`Operation failed after ${attempt} attempt(s):`, error);
        throw error;
      }
      
      // Log retry attempt
      console.warn(
        `Attempt ${attempt}/${maxAttempts} failed, retrying in ${currentDelay}ms...`,
        error instanceof Error ? error.message : error
      );
      
      // Wait before retrying with exponential backoff
      await sleep(currentDelay);
      
      // Increase delay for next attempt, capped at maxDelayMs
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  // This should never be reached due to throw in loop, but TypeScript needs it
  throw lastError;
}

/**
 * Wrapper specifically for AI generation calls with retry logic
 * Pre-configured for common AI API transient failures
 * 
 * @param fn - Async function that calls AI API and returns parsed result
 * @param options - Optional retry configuration overrides
 * @returns Promise resolving to the AI response
 * 
 * @example
 * const drill = await withAIRetry(async () => {
 *   const response = await devvAI.generateText({ prompt: '...' });
 *   return parseAIJson<DrillCommand>(response.content);
 * });
 */
export async function withAIRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryConfig> = {}
): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 8000,
    backoffMultiplier: 2,
    retryableErrors: [
      'fetch',
      'network',
      'timeout',
      'rate limit',
      'temporarily unavailable',
      'service unavailable',
      '503',
      '429'
    ],
    ...options
  });
}
