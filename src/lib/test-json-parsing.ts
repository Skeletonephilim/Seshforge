/**
 * JSON Parsing Test Utility
 * 
 * This file contains test cases and utilities to verify the stability
 * of AI JSON parsing across various response formats.
 * 
 * Usage: Import these functions in the browser console or create a test page
 */

import { extractJsonFromAI, sanitizeAIJson, parseAIJson } from '@/lib/utils';

// Test case definitions
export const testCases = [
  {
    name: 'Clean Valid JSON',
    input: `{
  "scenario": "Test scenario",
  "validCommands": ["cmd1", "cmd2"],
  "feedback": "Test feedback",
  "category": "Reconnaissance",
  "difficulty": "easy"
}`,
    shouldPass: true,
  },
  {
    name: 'Markdown Code Block',
    input: `\`\`\`json
{
  "scenario": "Test scenario",
  "validCommands": ["cmd1"],
  "feedback": "Test feedback",
  "category": "Scanning",
  "difficulty": "medium"
}
\`\`\``,
    shouldPass: true,
  },
  {
    name: 'JSON with Surrounding Text',
    input: `Here's your drill in JSON format:

{
  "scenario": "Test scenario",
  "validCommands": ["cmd1"],
  "feedback": "Test feedback",
  "category": "Enumeration",
  "difficulty": "hard"
}

Hope this helps!`,
    shouldPass: true,
  },
  {
    name: 'Trailing Commas',
    input: `{
  "scenario": "Test",
  "validCommands": ["cmd1", "cmd2",],
  "feedback": "Test",
  "category": "Exploitation",
  "difficulty": "easy",
}`,
    shouldPass: true,
  },
  {
    name: 'Control Characters (Newlines)',
    input: `{
  "scenario": "Line 1
Line 2",
  "validCommands": ["cmd"],
  "feedback": "Test
with newlines",
  "category": "Post-Exploitation",
  "difficulty": "medium"
}`,
    shouldPass: true,
  },
  {
    name: 'Nested Braces in Content',
    input: `Some text before {
  "scenario": "Outer { nested } braces",
  "validCommands": ["cmd"],
  "feedback": "Test",
  "category": "Reconnaissance",
  "difficulty": "easy"
} Some text after { extra braces }`,
    shouldPass: true,
  },
  {
    name: 'Combined Issues (Markdown + Newlines + Trailing Commas)',
    input: `Here's your drill:

\`\`\`json
{
  "scenario": "Test with
newlines",
  "validCommands": ["cmd1", "cmd2",],
  "feedback": "Feedback here",
  "category": "Scanning",
  "difficulty": "medium",
}
\`\`\`

Additional explanation text.`,
    shouldPass: true,
  },
  {
    name: 'Empty Response',
    input: `The AI returned an empty response.`,
    shouldPass: false,
  },
  {
    name: 'Malformed JSON (Unclosed Brace)',
    input: `{
  "scenario": "Test",
  "validCommands": ["cmd"],
  "feedback": "Test"`,
    shouldPass: false,
  },
  {
    name: 'Real AI Response (Clean)',
    input: `{
  "scenario": "You're scanning 192.168.1.100 for open web ports. What command scans common HTTP/HTTPS ports?",
  "validCommands": [
    "nmap -p 80,443,8080,8443 192.168.1.100",
    "nmap -p 80,443 192.168.1.100",
    "nmap --top-ports 100 192.168.1.100"
  ],
  "feedback": "**Correct!** Port scanning is essential for identifying services.\\n\\n**Breakdown:**\\n- \`-p\` specifies ports\\n- Multiple ports separated by commas\\n- Always document your findings",
  "category": "Scanning",
  "difficulty": "easy"
}`,
    shouldPass: true,
  },
  {
    name: 'Real AI Response (With Markdown)',
    input: `\`\`\`json
{
  "scenario": "Enumerate directories on http://10.10.10.50. What's your go-to tool?",
  "validCommands": [
    "gobuster dir -u http://10.10.10.50 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt",
    "dirb http://10.10.10.50",
    "ffuf -u http://10.10.10.50/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt"
  ],
  "feedback": "**Directory enumeration** is crucial for discovering hidden content.\\n\\nCommon tools:\\n- \`gobuster\` - Fast, modern\\n- \`dirb\` - Classic, reliable\\n- \`ffuf\` - Flexible fuzzing\\n\\nAlways use quality wordlists like SecLists.",
  "category": "Enumeration",
  "difficulty": "medium"
}
\`\`\``,
    shouldPass: true,
  },
  {
    name: 'Real AI Response (With Text Wrapper)',
    input: `Here's a privilege escalation drill for you:

{
  "scenario": "You have a low-privilege shell on a Linux target. What's the first command to check for easy privesc vectors?",
  "validCommands": [
    "sudo -l",
    "find / -perm -u=s -type f 2>/dev/null",
    "getcap -r / 2>/dev/null"
  ],
  "feedback": "**Always check sudo permissions first!**\\n\\n\`sudo -l\` shows what you can run as root.\\n\`find\` with \`-perm -u=s\` finds SUID binaries.\\n\`getcap\` checks for capability-based privesc.\\n\\nNext: Check \`/etc/crontab\` and writable files.",
  "category": "Privilege Escalation",
  "difficulty": "hard"
}

This drill focuses on Linux privilege escalation fundamentals.`,
    shouldPass: true,
  },
];

/**
 * Run a single test case
 */
export function runTestCase(testCase: typeof testCases[0]): {
  name: string;
  passed: boolean;
  result?: any;
  error?: string;
} {
  try {
    const result = parseAIJson(testCase.input);
    const passed = testCase.shouldPass;
    
    return {
      name: testCase.name,
      passed,
      result: passed ? result : undefined,
    };
  } catch (error) {
    const passed = !testCase.shouldPass;
    
    return {
      name: testCase.name,
      passed,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all test cases and generate report
 */
export function runAllTests(): {
  total: number;
  passed: number;
  failed: number;
  results: ReturnType<typeof runTestCase>[];
} {
  const results = testCases.map(runTestCase);
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

/**
 * Test extraction layer only
 */
export function testExtraction(input: string): {
  extracted: string | null;
  originalLength: number;
  extractedLength: number;
} {
  const extracted = extractJsonFromAI(input);
  
  return {
    extracted,
    originalLength: input.length,
    extractedLength: extracted?.length || 0,
  };
}

/**
 * Test sanitization layer only
 */
export function testSanitization(input: string): {
  original: string;
  sanitized: string;
  changes: number;
} {
  const sanitized = sanitizeAIJson(input);
  
  let changes = 0;
  for (let i = 0; i < Math.min(input.length, sanitized.length); i++) {
    if (input[i] !== sanitized[i]) changes++;
  }
  
  return {
    original: input,
    sanitized,
    changes,
  };
}

/**
 * Pretty print test results
 */
export function printTestResults(results: ReturnType<typeof runAllTests>): void {
  console.log('\n' + '='.repeat(60));
  console.log('JSON PARSING STABILITY TEST RESULTS');
  console.log('='.repeat(60) + '\n');
  
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);
  
  console.log('Individual Test Results:\n');
  
  results.results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${result.name}`);
    
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Browser console test runner
 * 
 * Usage in browser console:
 * 
 * import { runAllTests, printTestResults } from './test-json-parsing-utils';
 * const results = runAllTests();
 * printTestResults(results);
 */
export function quickTest(): void {
  const results = runAllTests();
  printTestResults(results);
  
  if (results.failed > 0) {
    console.error('⚠️ Some tests failed! Review the results above.');
  } else {
    console.log('✅ All tests passed! JSON parsing is stable.');
  }
}

// Export test data for external use
export const testData = {
  testCases,
  runTestCase,
  runAllTests,
  testExtraction,
  testSanitization,
  printTestResults,
  quickTest,
};

export default testData;
