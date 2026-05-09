/**
 * Import Report Manager Component
 * Handles professional report import with manual date assignment and persistence
 */

import { useState } from 'react';
import { Upload, Calendar, Tag, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { importDrillReportFromMarkdown, readMarkdownFile } from '@/lib/drill-report-markdown';
import { parseProfessionalReport, type ProfessionalReportMetadata } from '@/lib/professional-report-parser';
import { evaluateReport, evaluationToCertificationUpdate, type ReportEvaluation } from '@/lib/ai-report-evaluator';
import { useCertificationStore } from '@/store/certification-store';
import { useProgressStore } from '@/store/progress-store';

interface ImportReportManagerProps {
  trigger?: React.ReactNode;
}

export function ImportReportManager({ trigger }: ImportReportManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMethod, setImportMethod] = useState<'file' | 'text'>('file');
  const [reportText, setReportText] = useState('');
  const [reportPreview, setReportPreview] = useState<any>(null);
  const [aiEvaluation, setAiEvaluation] = useState<ReportEvaluation | null>(null);
  
  // Manual metadata form
  const [reportTitle, setReportTitle] = useState('');
  const [reportDate, setReportDate] = useState(() => {
    // Default to today in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [reportDomain, setReportDomain] = useState<string>('mixed');
  const [reportTags, setReportTags] = useState('');
  
  const { toast } = useToast();
  const certStore = useCertificationStore();
  const progressStore = useProgressStore();

  const resetForm = () => {
    setReportText('');
    setReportPreview(null);
    setAiEvaluation(null);
    setReportTitle('');
    setReportDate(new Date().toISOString().split('T')[0]);
    setReportDomain('mixed');
    setReportTags('');
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readMarkdownFile(file);
      setReportText(content);
      parseAndPreview(content);
    } catch (error) {
      toast({
        title: 'File Read Error',
        description: 'Failed to read the selected file',
        variant: 'destructive',
      });
    }
  };

  const parseAndPreview = (markdown: string) => {
    try {
      console.log('[IMPORT] Starting flexible import analysis');
      
      // FLEXIBLE STRATEGY: Try all parsers in priority order
      let reportData: any = null;
      let reportType: 'training' | 'professional' | 'external' | 'custom' = 'custom';
      
      // 1. Try training report parser (strict format)
      try {
        reportData = importDrillReportFromMarkdown(markdown);
        if (reportData && (
          reportData.commands.length > 0 ||
          reportData.discoveredInfo.flags.length > 0 ||
          reportData.performance.overallScore > 10
        )) {
          reportType = 'training';
          console.log('[IMPORT] ✅ Training parser successful');
        } else {
          reportData = null; // Insufficient data
        }
      } catch (error) {
        console.log('[IMPORT] Training parser failed:', error);
        reportData = null;
      }
      
      // 2. Try professional report parser (flexible format)
      if (!reportData) {
        console.log('[IMPORT] Trying professional parser');
        try {
          reportData = parseProfessionalReport(markdown);
          if (reportData) {
            reportType = 'professional';
            console.log('[IMPORT] ✅ Professional parser successful');
          }
        } catch (error) {
          console.log('[IMPORT] Professional parser failed:', error);
          reportData = null;
        }
      }
      
      // 3. Final fallback: Accept as custom/external report with minimal extraction
      if (!reportData) {
        console.log('[IMPORT] Using minimal extraction fallback');
        
        // Extract whatever we can from the markdown
        const hasContent = markdown.length >= 100;
        const hasHeader = markdown.match(/^#\s+.+$/m);
        
        if (!hasContent) {
          throw new Error('Report too short - minimum 100 characters required');
        }
        
        reportData = {
          title: hasHeader ? hasHeader[0].replace(/^#\s+/, '') : 'Custom Report',
          targetIP: 'Not specified',
          date: new Date().toISOString(),
          timeSpent: 'Not recorded',
          timeSpentSeconds: 0,
          difficulty: 'intermediate',
          drillType: 'mixed',
          scenario: markdown.substring(0, 500),
          objectives: [],
          discoveredInfo: {
            openPorts: [],
            services: [],
            directories: [],
            credentials: [],
            flags: [],
          },
          commands: [],
          performance: {
            reconScore: 0,
            scanningScore: 0,
            enumerationScore: 0,
            exploitationScore: 0,
            privescScore: 0,
            methodologyScore: 0,
            overallScore: 50, // Default score for custom reports
            timeEfficiency: 'Not tracked',
          },
          strengthsDemonstrated: ['Custom report imported'],
          focusAreas: [],
          feedback: 'Custom professional report',
          certificationReadiness: {
            pt1: {
              weighted_score: 50,
              pass_threshold: 70,
              status: 'approaching_readiness',
            },
          },
          hintsUsed: 0,
          mistakesIdentified: [],
          domainsPracticed: [],
          technicalSkillsUsed: [],
        };
        reportType = 'custom';
        console.log('[IMPORT] ✅ Custom report accepted (minimal extraction)');
      }
      
      // Set form defaults from parsed data
      setReportTitle(reportData.title || '');
      if (reportData.date && reportData.date !== new Date().toISOString()) {
        const parsedDate = new Date(reportData.date);
        if (!isNaN(parsedDate.getTime())) {
          setReportDate(parsedDate.toISOString().split('T')[0]);
        }
      }
      if (reportData.drillType) {
        setReportDomain(reportData.drillType);
      }
      
      setReportPreview({
        ...reportData,
        reportType,
      });
      
      const reportTypeDisplay = {
        training: 'Training',
        professional: 'Professional',
        external: 'External',
        custom: 'Custom/Partial',
      }[reportType] || 'Unknown';
      
      toast({
        title: `✅ ${reportTypeDisplay} Report Accepted`,
        description: `Format recognized - review and customize metadata before importing`,
      });
    } catch (error) {
      console.error('[IMPORT] Parse error:', error);
      
      // Only reject if truly invalid (too short, etc.)
      if (error instanceof Error && error.message.includes('too short')) {
        toast({
          title: 'Import Failed',
          description: error.message,
          variant: 'destructive',
        });
        setReportPreview(null);
      } else {
        // Accept even unparseable reports with manual metadata
        toast({
          title: '⚠️ Minimal Parse',
          description: 'Could not extract structured data, but you can import with custom metadata',
        });
        
        setReportPreview({
          reportType: 'custom',
          title: reportTitle || 'Custom Report',
          raw: markdown,
          scenario: markdown.substring(0, 500),
          discoveredInfo: { openPorts: [], services: [], directories: [], credentials: [], flags: [] },
          commands: [],
          performance: { overallScore: 50, methodologyScore: 0 },
          strengthsDemonstrated: [],
          focusAreas: [],
        });
      }
    }
  };

  const handleImport = async () => {
    if (!reportPreview && !reportText) {
      toast({
        title: 'No Report',
        description: 'Please select a file or paste report text first',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    
    try {
      // PHASE 1: PARSE REPORT (flexible, accepts any format)
      let finalReportData = reportPreview;
      
      // If no preview (custom report), try all parsers again
      if (!finalReportData && reportText) {
        finalReportData = importDrillReportFromMarkdown(reportText);
        
        if (!finalReportData) {
          finalReportData = parseProfessionalReport(reportText);
        }
        
        // Final fallback: create minimal report from text
        if (!finalReportData) {
          const hasHeader = reportText.match(/^#\s+.+$/m);
          finalReportData = {
            title: reportTitle || (hasHeader ? hasHeader[0].replace(/^#\s+/, '') : 'Custom Report'),
            targetIP: 'Not specified',
            date: new Date().toISOString(),
            timeSpent: 'Not recorded',
            timeSpentSeconds: 0,
            difficulty: 'intermediate',
            drillType: reportDomain as any,
            scenario: reportText.substring(0, 500),
            objectives: [],
            discoveredInfo: {
              openPorts: [],
              services: [],
              directories: [],
              credentials: [],
              flags: [],
            },
            commands: [],
            performance: {
              reconScore: 0,
              scanningScore: 0,
              enumerationScore: 0,
              exploitationScore: 0,
              privescScore: 0,
              methodologyScore: 0,
              overallScore: 50,
              timeEfficiency: 'Not tracked',
            },
            strengthsDemonstrated: ['Custom report imported'],
            focusAreas: [],
            feedback: 'Custom professional report',
            certificationReadiness: {
              pt1: {
                weighted_score: 50,
                pass_threshold: 70,
                status: 'approaching_readiness',
              },
            },
            hintsUsed: 0,
            mistakesIdentified: [],
            domainsPracticed: [],
            technicalSkillsUsed: [],
          };
        }
      }
      
      if (!finalReportData) {
        throw new Error('Could not extract any data from report');
      }
      
      // PHASE 2: RUN AI EVALUATION (CRITICAL - this is the new core feature)
      toast({
        title: 'Evaluating Report...',
        description: 'AI is analyzing your report to update statistics and readiness',
      });
      
      console.log('[IMPORT] Starting AI evaluation for statistical analysis');
      
      const evaluation = await evaluateReport(reportText || '', {
        title: reportTitle || finalReportData.title,
        date: reportDate,
        domain: reportDomain,
        existingParsedData: finalReportData,
      });
      
      setAiEvaluation(evaluation);
      
      console.log('[IMPORT] AI evaluation complete:', {
        reportType: evaluation.reportType,
        confidence: evaluation.confidence,
        overallQuality: evaluation.overallQuality,
        statisticalWeight: evaluation.statisticalWeight,
        primaryDomains: evaluation.primaryDomains,
      });
      
      // PHASE 3: APPLY USER METADATA
      const customMetadata: ProfessionalReportMetadata = {
        title: reportTitle || finalReportData.title || 'Imported Report',
        date: new Date().toISOString(),
        customDate: new Date(reportDate + 'T12:00:00Z').toISOString(),
        reportType: evaluation.reportType as any,
        domain: reportDomain as any,
        tags: reportTags ? reportTags.split(',').map(t => t.trim()) : [],
      };
      
      finalReportData.title = customMetadata.title;
      finalReportData.date = customMetadata.customDate!;
      finalReportData.drillType = customMetadata.domain;
      
      console.log('[IMPORT] Importing with metadata:', customMetadata);
      
      // PHASE 4: CHECK FOR DATE CONFLICTS
      const existingSimulation = certStore.simulation_history.find(
        (s) => {
          const existingDate = new Date(s.date).toISOString().split('T')[0];
          const newDate = new Date(finalReportData.date).toISOString().split('T')[0];
          return existingDate === newDate;
        }
      );

      if (existingSimulation) {
        const merge = window.confirm(
          `A report already exists for ${reportDate}.\n\nMerge with existing data or replace?`
        );
        if (!merge) {
          setIsImporting(false);
          return;
        }
      }
      
      // PHASE 5: UPDATE CERTIFICATION READINESS (using AI evaluation + parsed data)
      console.log('[IMPORT] Updating certification tracking with AI-evaluated data');
      
      // Convert AI evaluation to certification update format
      // CRITICAL: Pass custom date so imported reports show with correct historical date
      const certificationUpdate = evaluationToCertificationUpdate(
        evaluation, 
        finalReportData,
        customMetadata.customDate // Use user-selected date
      );
      
      // CRITICAL: Always update statistics if we have AI evaluation
      // This ensures EVERY report affects progression, even partial/external ones
      await certStore.updateAfterSimulation(certificationUpdate);
      
      console.log('[IMPORT] ✅ Certification tracking updated with AI-evaluated statistics');
      
      // PHASE 6: UPDATE TRAINING HOURS (using AI estimate if no parsed data)
      let hoursToAdd = 0;
      
      if (finalReportData.timeSpentSeconds > 0) {
        hoursToAdd = finalReportData.timeSpentSeconds / 3600;
      } else if (evaluation.estimatedDuration > 0) {
        hoursToAdd = evaluation.estimatedDuration;
        console.log('[IMPORT] Using AI-estimated duration:', hoursToAdd, 'hours');
      }
      
      if (hoursToAdd > 0) {
        progressStore.addTrainingHours(hoursToAdd);
        console.log('[IMPORT] Added', hoursToAdd.toFixed(2), 'training hours');
      }
      
      // ✅ CRITICAL FIX: Increment drill counter to match real drills
      // This is why March 6 drill shows "Drills: 1" but imports don't increment it
      // Real drills call progressStore.incrementDrills(), imports must do the same!
      progressStore.incrementDrills(true); // Mark as success since import was valid
      console.log('[IMPORT] ✅ Incremented drill counter (imported reports now counted)');

      // PHASE 7: RELOAD ALL DATA (ensure UI reflects changes)
      await Promise.all([
        progressStore.loadFromDatabase(),
        certStore.loadFromDatabase(),
      ]);

      toast({
        title: '✅ Report Imported & Evaluated',
        description: `${customMetadata.title} analyzed with ${evaluation.confidence}% confidence. Statistics updated!`,
        duration: 5000,
      });

      // Reset and close
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error('[IMPORT] Error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import report',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Report
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Penetration Testing Report</DialogTitle>
            <DialogDescription>
              Import training reports, professional assessments, or external writeups with custom date and metadata
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Import Method Selection */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={importMethod === 'file' ? 'default' : 'outline'}
                onClick={() => setImportMethod('file')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Import File
              </Button>
              <Button
                type="button"
                variant={importMethod === 'text' ? 'default' : 'outline'}
                onClick={() => setImportMethod('text')}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Paste Text
              </Button>
            </div>

            {/* File Upload */}
            {importMethod === 'file' && (
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select Markdown Report (.md)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* Text Paste */}
            {importMethod === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="report-text">Paste Report Markdown</Label>
                <Textarea
                  id="report-text"
                  value={reportText}
                  onChange={(e) => {
                    setReportText(e.target.value);
                    if (e.target.value.length > 100) {
                      parseAndPreview(e.target.value);
                    }
                  }}
                  placeholder="Paste your penetration testing report in Markdown format..."
                  className="min-h-[200px] font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  {reportText.length} characters
                </p>
              </div>
            )}

            {/* Preview Badge */}
            {reportPreview && (
              <div className="space-y-3">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">Report Detected</p>
                        <Badge variant="secondary">
                          {reportPreview.reportType || 'Unknown'} Format
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {reportPreview.commands?.length > 0 && (
                          <p>• {reportPreview.commands.length} commands found</p>
                        )}
                        {reportPreview.discoveredInfo?.flags?.length > 0 && (
                          <p>• {reportPreview.discoveredInfo.flags.length} flags captured</p>
                        )}
                        {reportPreview.discoveredInfo?.credentials?.length > 0 && (
                          <p>• {reportPreview.discoveredInfo.credentials.length} credentials discovered</p>
                        )}
                        {reportPreview.performance?.overallScore > 0 && (
                          <p>• Overall score: {reportPreview.performance.overallScore}%</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* AI Evaluation Preview (if available) */}
                {aiEvaluation && (
                  <div className="border rounded-lg p-4 bg-primary/5 border-primary/20">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">AI</span>
                        </div>
                        <p className="font-semibold text-sm">AI Evaluation Preview</p>
                        <Badge variant="outline" className="text-xs">
                          {aiEvaluation.confidence}% Confidence
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Overall Quality:</span>
                          <span className="ml-1 font-medium">{aiEvaluation.overallQuality}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Statistical Weight:</span>
                          <span className="ml-1 font-medium">{(aiEvaluation.statisticalWeight * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Difficulty:</span>
                          <span className="ml-1 font-medium capitalize">{aiEvaluation.difficultyEstimate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Est. Duration:</span>
                          <span className="ml-1 font-medium">{aiEvaluation.estimatedDuration.toFixed(1)}h</span>
                        </div>
                      </div>
                      
                      {aiEvaluation.primaryDomains.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Primary Domains:</p>
                          <div className="flex flex-wrap gap-1">
                            {aiEvaluation.primaryDomains.map((domain, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {domain.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground italic">
                        This report will automatically update your certification readiness and analytics
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Metadata Form */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                Report Metadata
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="report-title">Report Title</Label>
                <Input
                  id="report-title"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g., Internal Network Assessment 2024"
                />
              </div>

              {/* Date (CRITICAL FEATURE) */}
              <div className="space-y-2">
                <Label htmlFor="report-date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Report Date (when assessment was performed)
                </Label>
                <Input
                  id="report-date"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This date will be used for chronological sorting in your training timeline
                </p>
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <Label htmlFor="report-domain">Primary Domain</Label>
                <Select value={reportDomain} onValueChange={setReportDomain}>
                  <SelectTrigger id="report-domain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web Application</SelectItem>
                    <SelectItem value="network">Network Security</SelectItem>
                    <SelectItem value="ad">Active Directory</SelectItem>
                    <SelectItem value="mixed">Mixed Environment</SelectItem>
                    <SelectItem value="internal">Internal Services</SelectItem>
                    <SelectItem value="linux">Linux Systems</SelectItem>
                    <SelectItem value="windows">Windows Systems</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="report-tags">Tags (comma-separated)</Label>
                <Input
                  id="report-tags"
                  value={reportTags}
                  onChange={(e) => setReportTags(e.target.value)}
                  placeholder="e.g., client-work, TryHackMe, OSCP-prep"
                />
              </div>
            </div>

            {/* Warning about partial reports */}
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Flexible Import</p>
                <p>
                  This system accepts professional reports, training writeups, and partial assessments.
                  Missing sections will be marked as unavailable - you can still import and track progress.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={isImporting || (!reportPreview && !reportText)}
            >
              {isImporting ? (
                'Importing...'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Import Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
