import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseAIJson, extractJsonFromAI, sanitizeAIJson } from '@/lib/utils';
import { testCases, runAllTests, runTestCase } from '@/lib/test-json-parsing';
import { CheckCircle2, XCircle, AlertCircle, Terminal, Zap } from 'lucide-react';

export default function JsonParsingTestPage() {
  const [customInput, setCustomInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [extractionResult, setExtractionResult] = useState<string | null>(null);
  const [allTestsResult, setAllTestsResult] = useState<any>(null);

  const handleCustomTest = () => {
    try {
      const extracted = extractJsonFromAI(customInput);
      setExtractionResult(extracted);
      
      const parsed = parseAIJson(customInput);
      setTestResult({
        success: true,
        data: parsed,
      });
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      setExtractionResult(null);
    }
  };

  const handleRunAllTests = () => {
    const results = runAllTests();
    setAllTestsResult(results);
  };

  const handleRunSingleTest = (testCase: typeof testCases[0]) => {
    const result = runTestCase(testCase);
    setTestResult(result);
    setExtractionResult(extractJsonFromAI(testCase.input));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Terminal className="w-8 h-8 text-destructive" />
          <div>
            <h1 className="text-3xl font-bold">JSON Parsing Test Suite</h1>
            <p className="text-muted-foreground">
              Verify stability of AI response parsing across various formats
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {allTestsResult && (
          <Card className="border-destructive/20 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-destructive" />
                Test Suite Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-3xl font-bold">{allTestsResult.total}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">{allTestsResult.passed}</div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-destructive">{allTestsResult.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {((allTestsResult.passed / allTestsResult.total) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Custom Test */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Test Input</CardTitle>
              <CardDescription>
                Paste any AI response format to test JSON parsing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Paste AI response here (can include markdown, extra text, etc.)"
                className="font-mono text-sm min-h-[200px]"
              />
              <Button onClick={handleCustomTest} className="w-full">
                Test Custom Input
              </Button>

              {/* Custom Test Result */}
              {testResult && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-600">Parse Successful</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-destructive" />
                        <span className="font-semibold text-destructive">Parse Failed</span>
                      </>
                    )}
                  </div>

                  {extractionResult && (
                    <div>
                      <div className="text-sm font-medium mb-2">Extracted JSON:</div>
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                        {extractionResult.substring(0, 300)}
                        {extractionResult.length > 300 ? '...' : ''}
                      </pre>
                    </div>
                  )}

                  {testResult.success && testResult.data && (
                    <div>
                      <div className="text-sm font-medium mb-2">Parsed Object:</div>
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {testResult.error && (
                    <div>
                      <div className="text-sm font-medium mb-2 text-destructive">Error:</div>
                      <div className="bg-destructive/10 p-3 rounded text-sm text-destructive">
                        {testResult.error}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Predefined Test Cases */}
          <Card>
            <CardHeader>
              <CardTitle>Predefined Test Cases</CardTitle>
              <CardDescription>
                Run individual test scenarios or all tests at once
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleRunAllTests} variant="default" className="w-full">
                <Zap className="w-4 h-4 mr-2" />
                Run All Tests ({testCases.length})
              </Button>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {testCases.map((testCase, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{testCase.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Expected: {testCase.shouldPass ? 'Pass ✓' : 'Fail ✗'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunSingleTest(testCase)}
                      >
                        Test
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* All Tests Detailed Results */}
        {allTestsResult && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {allTestsResult.results.map((result: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 border rounded ${
                        result.passed
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                          : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {result.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold">{result.name}</div>
                          {result.error && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Error: {result.error}
                            </div>
                          )}
                          {result.result && (
                            <div className="text-xs mt-2">
                              <Badge variant="outline">
                                {result.result.category || 'N/A'} - {result.result.difficulty || 'N/A'}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Documentation */}
        <Card className="border-amber-500/20 bg-amber-50/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              How to Use This Test Suite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Custom Test:</strong> Paste any AI response format (with markdown, extra text, trailing commas, etc.) to verify parsing works correctly.
            </div>
            <div>
              <strong>Run All Tests:</strong> Executes all predefined test scenarios to ensure comprehensive coverage.
            </div>
            <div>
              <strong>Individual Tests:</strong> Test specific edge cases like markdown code blocks, trailing commas, control characters, etc.
            </div>
            <div className="pt-2 border-t">
              <strong>Test Coverage Includes:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Clean valid JSON</li>
                <li>Markdown code blocks (```json ... ```)</li>
                <li>JSON with surrounding explanatory text</li>
                <li>Trailing commas (invalid JSON syntax)</li>
                <li>Control characters (newlines, tabs)</li>
                <li>Nested braces and complex structures</li>
                <li>Real-world AI response formats</li>
                <li>Malformed and empty responses</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
