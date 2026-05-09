import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';
import { useProgressStore } from '@/store/progress-store';
import { useDrillSessionStore } from '@/store/drill-session-store';
import { useCertificationStore } from '@/store/certification-store';
import { readMarkdownFile, importDrillReportFromMarkdown } from '@/lib/drill-report-markdown';
import { interpretImportedContent, extractTimeInfo, ImportCategory } from '@/lib/contextual-import-interpreter';
import { ImportReportManager } from '@/components/ImportReportManager';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MethodologyHeatmap } from '@/components/MethodologyHeatmap';
import {
  Terminal,
  BookOpen,
  FlaskConical,
  Target,
  TrendingUp,
  Zap,
  Award,
  Calendar,
  Clock,
  Flame,
  FileText,
  Map,
  Flag,
  Brain,
  AlertTriangle,
  Trophy,
  Upload,
  Trash2,
  History,
} from 'lucide-react';

export default function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const progressStore = useProgressStore();
  const {
    modulesCompleted,
    labsCompleted,
    drillsPracticed,
    sec0Readiness,
    sec1Readiness,
    pt1Readiness,
    totalTrainingHours,
    dailyStreak,
  } = progressStore;
  
  const { loadUserSessions, totalSessions, completedSessions } = useDrillSessionStore();
  const certStore = useCertificationStore();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [showManualImport, setShowManualImport] = useState(false);
  const [manualMarkdownText, setManualMarkdownText] = useState('');
  
  // NEW: Category-specific import states
  const [activeImportCategory, setActiveImportCategory] = useState<ImportCategory | null>(null);
  const [wasJustImported, setWasJustImported] = useState(false);
  const [showCategoryImport, setShowCategoryImport] = useState<{
    drill: boolean;
    lab: boolean;
    module: boolean;
  }>({
    drill: false,
    lab: false,
    module: false,
  });
  const [categoryImportText, setCategoryImportText] = useState<{
    drill: string;
    lab: string;
    module: string;
  }>({
    drill: '',
    lab: '',
    module: '',
  });


  useEffect(() => {
    // Load progress from database
    useProgressStore.getState().loadFromDatabase();
    
    // Update streak on page load
    useProgressStore.getState().updateStreak();
    
    // Load certification readiness from database
    certStore.loadFromDatabase().catch((error) => {
      console.warn('Failed to load certification data, continuing with defaults:', error);
    });
    
    // Load drill session history for heatmap (non-blocking)
    loadUserSessions().catch((error) => {
      console.warn('Failed to load drill sessions, continuing with defaults:', error);
      // Don't crash the page - just log the error
    });
  }, [loadUserSessions]);

  // Complete reset handler
  const handleCompleteReset = async () => {
    const firstConfirm = window.confirm(
      '⚠️ WARNING: This will permanently erase ALL training data:\n\n' +
      '• All drills, modules, labs\n' +
      '• All training hours and streaks\n' +
      '• All certification readiness scores\n' +
      '• All drill session history\n' +
      '• All progress tracking\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Are you absolutely sure you want to reset everything?'
    );
    
    if (!firstConfirm) return;
    
    const verification = prompt('Type "RESET" (in all caps) to confirm complete data erasure:');
    
    if (verification !== 'RESET') {
      toast({
        title: 'Reset Cancelled',
        description: 'Data was not modified.',
      });
      return;
    }
    
    try {
      // Reset all stores
      await progressStore.resetProgress();
      await useDrillSessionStore.getState().resetAllDrillData();
      await certStore.resetReadiness();
      
      // Clear training data localStorage keys (NOT auth!)
      const keysToRemove = [
        'seshforge-progress',
        'seshforge-drill-sessions',
        'seshforge-certification',
        'seshforge-decision-engine',
      ];
      
      console.log('[RESET] Clearing training data localStorage keys (auth preserved)');
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`[RESET] Removed ${key}`);
        } catch (e) {
          console.warn(`Failed to remove ${key}:`, e);
        }
      });
      
      console.log('[RESET] Auth preserved - user stays logged in');
      
      // Reload fresh data from database
      await Promise.all([
        progressStore.loadFromDatabase(),
        certStore.loadFromDatabase(),
      ]);
      
      toast({
        title: '✅ Complete Reset Successful',
        description: 'All training data erased. Stats reset to zero. You remain logged in.',
        duration: 5000,
      });
      
      // Auto-refresh page after 1.5 seconds (user stays logged in)
      setTimeout(() => {
        console.log('[RESET] Refreshing page - user will remain authenticated');
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Reset error:', error);
      toast({
        title: 'Reset Failed',
        description: 'Could not complete reset operation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Shared import logic (used by both file upload and manual text import)
  const processImportedMarkdown = async (markdown: string) => {
    const reportData = importDrillReportFromMarkdown(markdown);

    if (!reportData) {
      throw new Error('Failed to parse any recognizable data from the text');
    }

    // Show preview of what was extracted
    const extractedSummary = [];
    if (reportData.targetIP && reportData.targetIP !== 'Unknown') extractedSummary.push(`Target: ${reportData.targetIP}`);
    if (reportData.commands.length > 0) extractedSummary.push(`${reportData.commands.length} commands`);
    if (reportData.discoveredInfo.flags.length > 0) extractedSummary.push(`${reportData.discoveredInfo.flags.length} flags`);
    if (reportData.discoveredInfo.credentials.length > 0) extractedSummary.push(`${reportData.discoveredInfo.credentials.length} credentials`);
    if (reportData.discoveredInfo.openPorts.length > 0) extractedSummary.push(`${reportData.discoveredInfo.openPorts.length} ports`);
    if (reportData.discoveredInfo.services.length > 0) extractedSummary.push(`${reportData.discoveredInfo.services.length} services`);
    if (reportData.discoveredInfo.directories.length > 0) extractedSummary.push(`${reportData.discoveredInfo.directories.length} directories`);
    if (reportData.performance.overallScore > 0) extractedSummary.push(`Score: ${reportData.performance.overallScore}%`);
    if (reportData.strengthsDemonstrated.length > 0) extractedSummary.push(`${reportData.strengthsDemonstrated.length} strengths`);
    if (reportData.focusAreas.length > 0) extractedSummary.push(`${reportData.focusAreas.length} focus areas`);

    // Show confirmation with preview
    const confirmed = window.confirm(
      `Found partial/complete report data:\n\n${extractedSummary.join('\n')}\n\nImport this data and update your progress?`
    );
    
    if (!confirmed) {
      throw new Error('Import cancelled by user');
    }

    // Check for conflicting date (only if we have a date)
    if (reportData.date && reportData.date !== new Date().toISOString()) {
      const existingSimulation = certStore.simulation_history.find(
        (s) => s.date === reportData.date
      );

      if (existingSimulation) {
        const mergeConfirmed = window.confirm(
          'A simulation from this date already exists. Merge the imported data with existing records?'
        );
        if (!mergeConfirmed) {
          throw new Error('Import cancelled by user');
        }
      }
    }

    // Restore certification tracking from imported report
    // Only update fields that have data
    const updateData: any = {
      difficulty: reportData.difficulty,
    };

    // Add commands if present
    if (reportData.commands.length > 0) {
      updateData.commands = reportData.commands.map((cmd) => ({
        command: cmd.command,
        phase: cmd.phase,
        correct: true,
      }));
    }

    // Add evaluation if scores present
    if (reportData.performance.overallScore > 0 || reportData.performance.methodologyScore > 0) {
      updateData.evaluation = {
        reconScore: reportData.performance.reconScore,
        scanningScore: reportData.performance.scanningScore,
        enumerationScore: reportData.performance.enumerationScore,
        exploitationScore: reportData.performance.exploitationScore,
        privescScore: reportData.performance.privescScore,
        methodologyScore: reportData.performance.methodologyScore,
        overallScore: reportData.performance.overallScore,
      };
    }

    // Add discovered info if present
    const hasDiscoveredInfo = 
      reportData.discoveredInfo.openPorts.length > 0 ||
      reportData.discoveredInfo.services.length > 0 ||
      reportData.discoveredInfo.directories.length > 0 ||
      reportData.discoveredInfo.credentials.length > 0 ||
      reportData.discoveredInfo.flags.length > 0;

    if (hasDiscoveredInfo) {
      updateData.discovered_info = reportData.discoveredInfo;
      updateData.flags_captured = reportData.discoveredInfo.flags.length;
    }

    // Add other optional fields
    updateData.hints_used = reportData.hintsUsed;
    if (reportData.mistakesIdentified.length > 0) {
      updateData.missed_steps = reportData.mistakesIdentified;
    }
    if (reportData.domainsPracticed.length > 0) {
      updateData.domains_practiced = reportData.domainsPracticed;
    }

    await certStore.updateAfterSimulation(updateData);

    // Update training hours if present
    if (reportData.timeSpentSeconds > 0) {
      useProgressStore.getState().addTrainingHours(reportData.timeSpentSeconds / 3600);
    }

    // CRITICAL: Force immediate sync to database to persist changes
    console.log('[Manual Import] Ensuring database sync completes...');
    await certStore.syncToDatabase();
    await useProgressStore.getState().syncToDatabase();
    console.log('[Manual Import] Database sync complete - data is now permanent');

    toast({
      title: 'Report Imported Successfully',
      description: extractedSummary.length > 0 
        ? `Imported: ${extractedSummary.slice(0, 3).join(', ')}${extractedSummary.length > 3 ? ', ...' : ''}. Dashboard updated.`
        : 'Partial data imported. Dashboard updated.',
    });

    // DO NOT reload from database - it would overwrite the just-updated Zustand state!
    // Set flag to prevent reload on next render
    setWasJustImported(true);
  };

  // Import drill report from .md file to restore certification tracking
  const handleImportReport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const markdown = await readMarkdownFile(file);
      await processImportedMarkdown(markdown);
    } catch (error) {
      console.error('Import error:', error);
      
      if (error instanceof Error && error.message.includes('cancelled by user')) {
        setIsImporting(false);
        return; // Don't show error toast for user cancellation
      }
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Failed to parse report. ';
      
      if (error instanceof Error) {
        if (error.message.includes('No recognizable data')) {
          errorMessage += 'The file does not contain any recognizable drill report data. Please ensure you are importing text with at least one valid section (metadata, scores, discovered info, commands, etc.).';
        } else if (error.message.includes('corrupted signature')) {
          errorMessage += 'The report file is corrupted. Try exporting it again from the Decision Engine.';
        } else if (error.message.includes('non-empty string')) {
          errorMessage += 'The file appears to be empty or unreadable.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Unknown error occurred.';
      }
      
      toast({
        title: 'Import Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Manual markdown text import handler
  const handleManualImportReport = async () => {
    if (!manualMarkdownText.trim()) {
      toast({
        title: 'No Content',
        description: 'Please paste report text into the text area.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    try {
      await processImportedMarkdown(manualMarkdownText);
      
      // Clear the textarea on success
      setManualMarkdownText('');
      setShowManualImport(false);
    } catch (error) {
      console.error('Manual import error:', error);
      
      if (error instanceof Error && error.message.includes('cancelled by user')) {
        setIsImporting(false);
        return; // Don't show error toast for user cancellation
      }
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Failed to parse report. ';
      
      if (error instanceof Error) {
        if (error.message.includes('No recognizable data')) {
          errorMessage += 'The text does not contain any recognizable drill report data. Try pasting text with sections like:\n• Performance scores\n• Discovered ports/services\n• Credentials or flags\n• Command history';
        } else if (error.message.includes('corrupted signature')) {
          errorMessage += 'The report data is corrupted. Try copying the markdown again from the Decision Engine.';
        } else if (error.message.includes('non-empty string')) {
          errorMessage += 'The pasted content appears to be empty or invalid.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Unknown error occurred.';
      }
      
      toast({
        title: 'Manual Import Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * NEW: Contextual category-specific import
   * Interprets content using AI, applies progression updates
   */
  const handleContextualImport = async (category: ImportCategory, content: string) => {
    if (!content.trim()) {
      toast({
        title: 'No Content',
        description: 'Please paste content to import',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setActiveImportCategory(category);

    try {
      console.log(`[CONTEXTUAL IMPORT] Starting ${category} import, content length: ${content.length}`);

      // Step 1: AI interprets the content contextually
      const interpretation = await interpretImportedContent(content, category);

      console.log('[CONTEXTUAL IMPORT] Interpretation complete:', {
        category: interpretation.category,
        performanceLevel: interpretation.performanceLevel,
        shouldCount: interpretation.shouldCount,
        confidence: interpretation.confidence,
      });

      // Step 2: Show preview of interpretation
      const summaryLines = [
        `Category: ${interpretation.category.toUpperCase()}`,
        `Performance: ${interpretation.performanceLevel}`,
        `Confidence: ${Math.round(interpretation.confidence * 100)}%`,
      ];

      if (interpretation.evidence) {
        const evidence = interpretation.evidence;
        if (evidence.ports && evidence.ports.length > 0) 
          summaryLines.push(`Evidence: ${evidence.ports.length} ports`);
        if (evidence.services && evidence.services.length > 0) 
          summaryLines.push(`        ${evidence.services.length} services`);
        if (evidence.credentials && evidence.credentials.length > 0) 
          summaryLines.push(`        ${evidence.credentials.length} credentials`);
        if (evidence.flags && evidence.flags.length > 0) 
          summaryLines.push(`        ${evidence.flags.length} flags`);
      }

      if (interpretation.scores?.overall) {
        summaryLines.push(`Score: ${interpretation.scores.overall}%`);
      }

      if (interpretation.timeSpentHours) {
        summaryLines.push(`Time: ${interpretation.timeSpentHours.toFixed(1)} hours`);
      }

      summaryLines.push('');
      summaryLines.push(`Assessment: ${interpretation.interpretationSummary}`);

      const confirmed = window.confirm(
        `AI Interpretation Results:\n\n${summaryLines.join('\n')}\n\n${interpretation.shouldCount ? 'This will update your progression.' : 'Insufficient evidence for major progression update.'}\n\nContinue with import?`
      );

      if (!confirmed) {
        throw new Error('Import cancelled by user');
      }

      // Step 3: Apply progression updates based on interpretation
      const { progressionUpdates, evidence, scores, technicalSkills, domains } = interpretation;

      // Update count based on category and assessment
      if (progressionUpdates.incrementCount && interpretation.shouldCount) {
        const success = interpretation.successRating > 0.5;
        
        switch (interpretation.category) {
          case 'drill':
            progressStore.incrementDrills(success);
            console.log('[CONTEXTUAL IMPORT] Incremented drills (success:', success, ')');
            break;
          case 'lab':
            progressStore.incrementLabs(success);
            console.log('[CONTEXTUAL IMPORT] Incremented labs (success:', success, ')');
            break;
          case 'module':
            progressStore.incrementModules(success);
            console.log('[CONTEXTUAL IMPORT] Incremented modules (success:', success, ')');
            break;
        }
      }

      // Update training hours if present
      if (interpretation.timeSpentHours && interpretation.timeSpentHours > 0) {
        progressStore.addTrainingHours(interpretation.timeSpentHours);
        console.log('[CONTEXTUAL IMPORT] Added training hours:', interpretation.timeSpentHours);
      }

      // Update certification tracking if ANY evidence present (not just improvement)
      // Evidence-based scoring means ANY discovered info should update skills
      const hasEvidence = evidence && Object.keys(evidence).some(k => {
        const val = evidence[k as keyof typeof evidence];
        return (Array.isArray(val) && val.length > 0) || (typeof val === 'number' && val > 0);
      });
      
      const hasScores = scores && Object.keys(scores).some(k => {
        const val = scores[k as keyof typeof scores];
        return typeof val === 'number' && val > 0;
      });
      
      if (hasEvidence || hasScores) {
        // Normalize all fields with safe defaults
        const updateData: any = {
          difficulty: interpretation.performanceLevel === 'excellent' ? 'advanced' :
                     interpretation.performanceLevel === 'good' ? 'intermediate' : 'beginner',
          commands: [],
          evaluation: {
            reconScore: scores.reconnaissance || 0,
            scanningScore: scores.scanning || 0,
            enumerationScore: scores.enumeration || 0,
            exploitationScore: scores.exploitation || 0,
            privescScore: scores.privilegeEscalation || 0,
            methodologyScore: scores.methodology || 0,
            overallScore: scores.overall || 0,
          },
          flags_captured: 0,
          hints_used: 0,
          missed_steps: [],
          domains_practiced: [],
          discovered_info: {
            openPorts: [],
            services: [],
            directories: [],
            credentials: [],
            flags: [],
          },
        };

        // Add evidence if present
        if (evidence && Object.keys(evidence).filter(k => {
          const val = evidence[k as keyof typeof evidence];
          return Array.isArray(val) && val.length > 0;
        }).length > 0) {
          updateData.discovered_info = {
            openPorts: evidence.ports || [],
            services: evidence.services || [],
            directories: evidence.directories || [],
            credentials: evidence.credentials || [],
            flags: evidence.flags || [],
          };
          updateData.flags_captured = evidence.flags?.length || 0;
        }

        // Add commands if tracked
        if (evidence?.commandsExecuted && evidence.commandsExecuted > 0) {
          const phases = evidence.phasesCompleted || ['reconnaissance'];
          updateData.commands = Array(evidence.commandsExecuted).fill(null).map((_, i) => ({
            command: `imported_command_${i + 1}`,
            phase: phases[i % phases.length] || 'reconnaissance',
            correct: true,
          }));
        }

        // Add progression context
        if (progressionUpdates.strengthsDemonstrated.length > 0) {
          // Store strengths in missed_steps (inverted - these are what went right)
          updateData.evaluation.feedback = progressionUpdates.strengthsDemonstrated.join('; ');
        }

        // Add domains (CRITICAL: Always ensure this is an array)
        if (Array.isArray(domains) && domains.length > 0) {
          // Map domain strings to CertificationDomain type
          const validDomains = domains.filter(d => 
            ['reconnaissance', 'enumeration', 'web_exploitation', 'privilege_escalation', 
             'lateral_movement', 'password_attacks', 'network_exploitation', 'post_exploitation'].includes(d)
          );
          updateData.domains_practiced = validDomains;
        }
        
        // If no domains, infer from scores
        if (updateData.domains_practiced.length === 0) {
          const inferredDomains: string[] = [];
          if (scores.reconnaissance && scores.reconnaissance > 0) inferredDomains.push('reconnaissance');
          if (scores.enumeration && scores.enumeration > 0) inferredDomains.push('enumeration');
          if (scores.exploitation && scores.exploitation > 0) inferredDomains.push('web_exploitation');
          if (scores.privilegeEscalation && scores.privilegeEscalation > 0) inferredDomains.push('privilege_escalation');
          updateData.domains_practiced = inferredDomains;
        }
        
        console.log('[CONTEXTUAL IMPORT] Calling updateAfterSimulation with:', {
          difficulty: updateData.difficulty,
          commandsCount: updateData.commands.length,
          domainsCount: updateData.domains_practiced.length,
          domains: updateData.domains_practiced,
          hasEvaluation: updateData.evaluation.overallScore > 0,
          hasDiscoveredInfo: Object.values(updateData.discovered_info).some(arr => Array.isArray(arr) && arr.length > 0),
        });

        try {
          await certStore.updateAfterSimulation(updateData);
          console.log('[CONTEXTUAL IMPORT] Updated certification tracking successfully');
          
          // CRITICAL: Wait for database sync to complete before any potential reload
          // The syncToDatabase() inside updateAfterSimulation is async, we need to ensure it finishes
          console.log('[CONTEXTUAL IMPORT] Ensuring database sync completes...');
          
          // Force immediate sync to database to persist changes
          await certStore.syncToDatabase();
          await progressStore.syncToDatabase();
          
          console.log('[CONTEXTUAL IMPORT] Database sync complete - data is now permanent');
          
          // DO NOT call loadFromDatabase() here - it would overwrite the just-updated state!
          // The Zustand state is already correct and persist middleware has synced to localStorage
          
        } catch (updateError) {
          console.error('[CONTEXTUAL IMPORT] updateAfterSimulation failed:', updateError);
          console.error('[CONTEXTUAL IMPORT] Update data that caused error:', JSON.stringify(updateData, null, 2));
          
          // Re-throw with more context
          throw new Error(`Failed to update certification tracking: ${updateError instanceof Error ? updateError.message : String(updateError)}`);
        }
      }

      // Success toast with summary
      const updatesSummary = [];
      if (progressionUpdates.incrementCount) {
        updatesSummary.push(`${interpretation.category} count updated`);
      }
      if (interpretation.timeSpentHours) {
        updatesSummary.push(`${interpretation.timeSpentHours.toFixed(1)}h added`);
      }
      if (progressionUpdates.improvementDetected) {
        updatesSummary.push('skills improved');
      }
      if (progressionUpdates.stagnationDetected) {
        updatesSummary.push('stagnation noted');
      }

      toast({
        title: `${category.toUpperCase()} Import Successful`,
        description: updatesSummary.length > 0 
          ? updatesSummary.join(', ')
          : interpretation.interpretationSummary,
      });

      // Set flag to prevent unnecessary database reload on next render/mount
      setWasJustImported(true);

      // Clear the input and hide section
      setCategoryImportText(prev => ({ ...prev, [category]: '' }));
      setShowCategoryImport(prev => ({ ...prev, [category]: false }));

    } catch (error) {
      console.error('[CONTEXTUAL IMPORT] Error:', error);
      
      if (error instanceof Error && error.message.includes('cancelled by user')) {
        setIsImporting(false);
        setActiveImportCategory(null);
        return;
      }

      toast({
        title: `${category.toUpperCase()} Import Failed`,
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      setActiveImportCategory(null);
    }
  };

  // Use new certification store if available, otherwise fall back to legacy progress store
  // SEC0 is EASIEST (2x easier than PT1), SEC1 is intermediate (1.4x easier), PT1 is hardest
  // eJPT is foundational (offensive focus), OSCP is expert (advanced exploitation)
  const actualPT1Readiness = certStore.overall_score > 0 ? certStore.overall_score : pt1Readiness;
  const actualSEC1Readiness = certStore.overall_score > 0 ? Math.round(certStore.overall_score * 1.4) : sec1Readiness;
  const actualSEC0Readiness = certStore.overall_score > 0 ? Math.round(certStore.overall_score * 2.0) : sec0Readiness;
  
  // NEW: eJPT and OSCP readiness from certification store
  const actualEJPTReadiness = certStore.ejpt_readiness?.weighted_score || 0;
  const actualOSCPReadiness = certStore.oscp_readiness?.weighted_score || 0;
  
  const certifications = [
    // FOUNDATIONAL LEVEL (Green) - Entry-level certifications
    {
      name: 'SEC0',
      fullName: 'Security Fundamentals',
      level: 'Foundational',
      readiness: actualSEC0Readiness,
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      explanation: 'TryHackMe beginner security certification covering basic security concepts.',
    },
    {
      name: 'SEC01',
      fullName: 'Cyber Security 101',
      level: 'Foundational',
      readiness: actualSEC1Readiness,
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      explanation: 'Introductory cybersecurity knowledge covering basic concepts, threats, and defensive fundamentals.',
    },
    // INTERMEDIATE LEVEL (Orange) - Practical offensive security
    {
      name: 'eJPT',
      fullName: 'Junior Pentester',
      level: 'Intermediate',
      readiness: actualEJPTReadiness,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
      explanation: 'Foundational offensive security certification focused on web and network exploitation basics. No Active Directory requirement. Progress increases faster with basic successes.',
    },
    {
      name: 'PT1',
      fullName: 'Junior Penetration Tester',
      level: 'Intermediate',
      readiness: actualPT1Readiness,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/20',
      primary: true,
      explanation: 'Intermediate practical pentesting across Web, Network, and Active Directory with methodology emphasis. Balanced coverage required.',
    },
    // ADVANCED LEVEL (Red) - Expert offensive security
    {
      name: 'OSCP',
      fullName: 'Advanced Penetration Tester',
      level: 'Advanced',
      readiness: actualOSCPReadiness,
      color: 'text-red-500',
      bgColor: 'bg-red-500/20',
      explanation: 'Advanced hands-on penetration testing requiring strong exploitation, privilege escalation, and independent reasoning. Progress increases slowly and requires comprehensive evidence.',
    },
  ];

  const allApps = [
    // Training Drills
    {
      title: 'PT1 Micro-Sims',
      description: 'Quick 5-15min practice drills',
      icon: Zap,
      color: 'text-chart-3',
      category: 'Training Drills',
      path: '/pt1-micro-sims',
    },
    {
      title: 'Muscle Memory',
      description: 'Build red team reflexes',
      icon: Zap,
      color: 'text-red-500',
      category: 'Training Drills',
      path: '/muscle-memory',
    },
    {
      title: 'Box Mode',
      description: 'No VPN required boxes',
      icon: Terminal,
      color: 'text-cyan-500',
      category: 'Training Drills',
      path: '/box-mode',
    },
    {
      title: 'Wireless Pentesting',
      description: 'WiFi hacking with aircrack-ng',
      icon: Zap,
      color: 'text-cyan-400',
      category: 'Training Drills',
      path: '/wireless-pentest',
    },
    // Interactive Training
    {
      title: 'Decision Engine',
      description: 'Interactive pentest simulations',
      icon: Brain,
      color: 'text-cyber-blue',
      category: 'Interactive Training',
      path: '/decision-engine',
    },
    {
      title: 'Live Analysis',
      description: 'Get expert command feedback',
      icon: TrendingUp,
      color: 'text-purple-400',
      category: 'Interactive Training',
      path: '/live-analysis',
    },
    {
      title: 'PTES Methodology',
      description: 'Master pentesting workflow',
      icon: Map,
      color: 'text-primary',
      category: 'Interactive Training',
      path: '/ptes-methodology',
    },
    {
      title: 'Failure Learning',
      description: 'Learn from mistakes',
      icon: AlertTriangle,
      color: 'text-amber-400',
      category: 'Interactive Training',
      path: '/failure-learning',
    },
    // Exams
    {
      title: 'PT1 Exam + Hard Mode',
      description: 'Certification practice',
      icon: Flag,
      color: 'text-chart-4',
      category: 'Exams',
      path: '/pt1-exam',
    },
    {
      title: 'SEC1 Exam',
      description: 'Security analyst training',
      icon: BookOpen,
      color: 'text-blue-400',
      category: 'Exams',
      path: '/sec1-exam',
    },
    {
      title: 'Web Black-Box',
      description: 'SQLi/XSS/IDOR practice (90min)',
      icon: Trophy,
      color: 'text-green-400',
      category: 'Exams',
      path: '/pt1-web-exam',
    },
    {
      title: 'AD + Lateral',
      description: 'Kerberoasting & domain (90min)',
      icon: Trophy,
      color: 'text-red-400',
      category: 'Exams',
      path: '/pt1-ad-exam',
    },
    // Progress & Tools
    {
      title: 'Training Plan',
      description: 'AI-generated daily schedules',
      icon: Calendar,
      color: 'text-primary',
      category: 'Progress & Tools',
      path: '/training-plan',
    },
    {
      title: 'Analytics',
      description: 'Track your progress & trends',
      icon: TrendingUp,
      color: 'text-chart-1',
      category: 'Progress & Tools',
      path: '/analytics',
    },
    {
      title: 'Profile',
      description: 'Learning style & preferences',
      icon: Target,
      color: 'text-secondary',
      category: 'Progress & Tools',
      path: '/profile',
    },
  ];

  const stats = [
    { label: 'Modules', value: modulesCompleted, icon: BookOpen, color: 'text-secondary' },
    { label: 'Labs', value: labsCompleted, icon: FlaskConical, color: 'text-primary' },
    { label: 'Drills', value: drillsPracticed, icon: Terminal, color: 'text-chart-3' },
    { label: 'Hours', value: totalTrainingHours.toFixed(1), icon: Clock, color: 'text-chart-4' },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Support Me Button */}
      <div className="flex justify-end">
        <a
          href="https://buymeacoffee.com/seshforge"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex flex-col items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            <div className="text-3xl group-hover:scale-110 transition-transform duration-200">
              ☕
            </div>
            <span className="text-sm font-semibold text-amber-500">Support Me</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            The app is 100% free but you can
          </span>
        </a>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-gradient-primary">SeshForge</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, <span className="text-foreground font-mono">{user?.email || 'Operator'}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {dailyStreak > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-chart-3/20 border border-chart-3/30 rounded-lg">
                <Flame className="w-5 h-5 text-chart-3" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-chart-3">{dailyStreak}</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </div>
            )}
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleCompleteReset}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Reset All Data
            </Button>
          </div>
        </div>
      </div>

      {/* All Training Apps - Organized by Category (MOVED TO TOP) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Training Arsenal
          </h2>
          <p className="text-sm text-muted-foreground">
            {allApps.length} total apps across {[...new Set(allApps.map(a => a.category))].length} categories
          </p>
        </div>

        {/* Category Sections */}
        {[...new Set(allApps.map(app => app.category))].map((category) => (
          <div key={category} className="space-y-3">
            <h3 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <span className="h-px flex-1 bg-border"></span>
              <span>{category}</span>
              <span className="h-px flex-1 bg-border"></span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allApps
                .filter(app => app.category === category)
                .map((app) => (
                  <Button
                    key={app.title}
                    variant="outline"
                    className="h-auto p-6 flex-col items-start gap-3 neon-glow hover:bg-card transition-all duration-200"
                    onClick={() => navigate(app.path)}
                  >
                    <app.icon className={`w-8 h-8 ${app.color}`} />
                    <div className="text-left space-y-1">
                      <div className="font-semibold text-foreground">{app.title}</div>
                      <div className="text-xs text-muted-foreground font-normal">{app.description}</div>
                    </div>
                  </Button>
                ))
              }
            </div>
          </div>
        ))}
      </div>

      {/* Stats Overview with Category-Specific Import */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          // Map stats to categories
          const categoryMap: { [key: string]: ImportCategory } = {
            'Modules': 'module',
            'Labs': 'lab',
            'Drills': 'drill',
          };
          const category = categoryMap[stat.label];
          
          return (
            <Card key={stat.label} className="terminal-window">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-mono">{stat.label}</p>
                      <p className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color} opacity-50`} />
                  </div>
                  
                  {/* Category-specific import button */}
                  {category && (
                    <div className="pt-2 border-t border-border/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setShowCategoryImport(prev => ({ ...prev, [category]: !prev[category] }))}
                        disabled={isImporting}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        {showCategoryImport[category] ? 'Hide' : 'Import Text'}
                      </Button>
                      
                      {/* Collapsible import section */}
                      {showCategoryImport[category] && (
                        <div className="mt-2 space-y-2">
                          <textarea
                            value={categoryImportText[category]}
                            onChange={(e) => setCategoryImportText(prev => ({ ...prev, [category]: e.target.value }))}
                            placeholder={`Paste ${stat.label.toLowerCase()} report, writeup, or training text here...\n\nThe AI will analyze it and update your progress accordingly.`}
                            className="w-full h-32 p-2 text-xs font-mono bg-background/50 border border-input rounded resize-y"
                            disabled={isImporting}
                          />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{categoryImportText[category].length} chars</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCategoryImportText(prev => ({ ...prev, [category]: '' }));
                                  setShowCategoryImport(prev => ({ ...prev, [category]: false }));
                                }}
                                disabled={isImporting}
                                className="h-6 px-2"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleContextualImport(category, categoryImportText[category])}
                                disabled={isImporting || !categoryImportText[category].trim()}
                                className="h-6 px-2"
                              >
                                {isImporting && activeImportCategory === category ? 'Analyzing...' : 'Import'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Certification Readiness */}
      <Card className="terminal-window">
        <div className="terminal-header">
          <div className="terminal-dot bg-secondary"></div>
          <div className="terminal-dot bg-primary"></div>
          <div className="terminal-dot bg-chart-3"></div>
          <span className="ml-2 text-xs text-muted-foreground font-mono">certification_status.sh</span>
        </div>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-red-500" />
              <CardTitle>Certification Readiness Tracking</CardTitle>
            </div>
            {/* Import Button for Certification Recovery */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".md"
                onChange={handleImportReport}
                className="hidden"
                id="cert-import-file"
                disabled={isImporting}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('cert-import-file')?.click()}
                disabled={isImporting}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import File'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualImport(!showManualImport)}
                disabled={isImporting}
              >
                <FileText className="w-4 h-4 mr-2" />
                {showManualImport ? 'Hide' : 'Paste Text'}
              </Button>
              <ImportReportManager 
                trigger={
                  <Button variant="default" size="sm">
                    <History className="w-4 h-4 mr-2" />
                    Professional
                  </Button>
                }
              />
            </div>
          </div>
          <CardDescription>Live tracking of your pentesting skills across all domains</CardDescription>
        </CardHeader>
        
        {/* Manual Text Import Section */}
        {showManualImport && (
          <div className="px-6 pb-4 space-y-3 border-b border-border/40 bg-muted/30">
            <div className="space-y-2">
              <label htmlFor="manual-import-textarea" className="text-sm font-medium text-foreground">
                Import Report Text
              </label>
              <p className="text-xs text-muted-foreground">
                Paste the complete markdown (.md) report content below. This is a workaround for file upload issues.
              </p>
            </div>
            <textarea
              id="manual-import-textarea"
              value={manualMarkdownText}
              onChange={(e) => setManualMarkdownText(e.target.value)}
              placeholder="Paste your exported drill report markdown here...&#10;&#10;Example:&#10;# Pentesting Simulation Report&#10;&#10;## Metadata&#10;- **Report ID**: abc123&#10;..."
              className="w-full h-48 p-3 text-sm font-mono bg-background border border-input rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={isImporting}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {manualMarkdownText.length > 0 
                  ? `${manualMarkdownText.length} characters` 
                  : 'No content yet'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setManualMarkdownText('');
                    setShowManualImport(false);
                  }}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleManualImportReport}
                  disabled={isImporting || !manualMarkdownText.trim()}
                >
                  {isImporting ? 'Parsing...' : 'Parse Report'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <CardContent className="space-y-6">
          {/* Temporarily disabled to prevent rendering errors */}
          {/* <CertificationReadinessMeter compact /> */}
          
          <div className="space-y-4">
            {certStore.completed_simulations > 0 ? (
              <>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">Overall Certification Readiness</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold font-mono text-chart-3">{certStore.overall_score}%</span>
                      <span className="text-xs text-muted-foreground">
                        {certStore.overall_score < 30 ? 'Beginner' : 
                         certStore.overall_score < 60 ? 'Intermediate' : 
                         certStore.overall_score < 80 ? 'Advanced' : 'Expert'}
                      </span>
                    </div>
                    <Progress value={certStore.overall_score} className="h-2" />
                  </div>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">PT1 Exam Readiness</p>
                  <div className="space-y-3">
                    {/* PT1 Weighted Score */}
                    {certStore.pt1_readiness && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Weighted Score:</span>
                          <Badge variant={
                            certStore.pt1_readiness.weighted_score >= 85 ? 'default' :
                            certStore.pt1_readiness.weighted_score >= 70 ? 'secondary' :
                            'destructive'
                          }>
                            {certStore.pt1_readiness.weighted_score > 0 
                              ? `${certStore.pt1_readiness.weighted_score}%` 
                              : 'Insufficient evidence'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Pass Threshold:</span>
                          <span className="text-xs font-mono">{certStore.pt1_readiness.pass_threshold}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 border-t border-border/30 pt-2">
                          {certStore.pt1_readiness.interpretation}
                        </div>
                      </div>
                    )}
                    
                    {/* Focus Areas */}
                    {certStore.focus_areas.length > 0 && certStore.focus_areas[0] && (
                      <div className="border-l-2 border-destructive pl-3 mt-3">
                        <p className="text-xs font-medium text-destructive mb-1">
                          Primary Focus: {certStore.focus_areas[0].section.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {certStore.focus_areas[0].rationale}
                        </p>
                      </div>
                    )}
                    
                    {/* Specific Training Recommendations */}
                    {certStore.recommended_training.length > 0 ? (
                      <div className="space-y-2 mt-3">
                        {certStore.recommended_training.slice(0, 2).map((rec, idx) => (
                          <div key={idx} className="bg-terminal-black/30 p-2 rounded border border-border/30">
                            <div className="flex items-start gap-2 mb-1">
                              <Badge 
                                variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'} 
                                className="text-[10px] px-1.5 py-0"
                              >
                                {rec.priority}
                              </Badge>
                              <p className="text-xs font-medium flex-1">{rec.domain.replace(/_/g, ' ')}</p>
                            </div>
                            <p className="text-xs text-muted-foreground pl-2">{rec.description}</p>
                            {/* Specific drill recommendations based on domain */}
                            <div className="mt-2 pl-2 space-y-1">
                              <p className="text-[10px] text-primary font-mono">Suggested Drills:</p>
                              {rec.domain === 'reconnaissance' && (
                                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                  <li>• Command Drill: nmap service enumeration</li>
                                  <li>• PT1 Micro-Sim: Network Discovery</li>
                                </ul>
                              )}
                              {rec.domain === 'enumeration' && (
                                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                  <li>• Command Drill: gobuster directory fuzzing</li>
                                  <li>• PT1 Micro-Sim: Directory Discovery</li>
                                </ul>
                              )}
                              {rec.domain === 'web_exploitation' && (
                                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                  <li>• PT1 Web Black-Box Exam (OWASP Top 10)</li>
                                  <li>• PT1 Micro-Sim: SQL Injection</li>
                                </ul>
                              )}
                              {rec.domain === 'privilege_escalation' && (
                                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                  <li>• Command Drill: linpeas enumeration</li>
                                  <li>• PT1 Micro-Sim: SUID Privilege Escalation</li>
                                </ul>
                              )}
                              {rec.domain === 'lateral_movement' && (
                                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                  <li>• PT1 AD Exam (Lateral Movement)</li>
                                  <li>• Decision Engine: AD scenarios</li>
                                </ul>
                              )}
                              {rec.domain === 'password_attacks' && (
                                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                  <li>• Command Drill: hydra brute force</li>
                                  <li>• PT1 Micro-Sim: SSH Brute Force</li>
                                </ul>
                              )}
                              {rec.domain === 'network_exploitation' && (
                                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                  <li>• PT1 Micro-Sim: SMB Enumeration</li>
                                  <li>• Decision Engine: network scenarios</li>
                                </ul>
                              )}
                              {rec.domain === 'post_exploitation' && (
                                <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                  <li>• Decision Engine: full engagements</li>
                                  <li>• PT1 Exam Simulator</li>
                                </ul>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Complete simulations to get personalized recommendations
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  <p className="font-mono">Certification tracking integrates with all training modes:</p>
                  <p className="font-mono mt-1">• Decision Engine simulations update domain scores</p>
                  <p className="font-mono">• Command Drills improve technical skills</p>
                  <p className="font-mono">• PT1 Exams provide comprehensive assessment</p>
                </div>
                
                {totalSessions > 0 && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">Training Activity</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Sessions:</span>
                        <span className="font-mono">{totalSessions}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="font-mono">{completedSessions}</span>
                      </div>
                      {totalSessions > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Completion Rate:</span>
                          <span className="font-mono">{Math.round((completedSessions / totalSessions) * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="pt-4 border-t border-border/40">
            <h3 className="text-sm font-medium mb-4">Traditional Certification Progress</h3>
            
            {/* Group certifications by level */}
            {['Foundational', 'Intermediate', 'Advanced'].map((level) => {
              const certsInLevel = certifications.filter(c => c.level === level);
              if (certsInLevel.length === 0) return null;
              
              return (
                <div key={level} className="mb-6">
                  <p className="text-xs text-muted-foreground font-mono mb-3">{level} Level</p>
                  
                  {certsInLevel.map((cert) => (
                    <div key={cert.name} className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`cert-badge ${cert.color}`}>
                            {cert.name}
                          </span>
                          <span className="text-sm text-muted-foreground">{cert.fullName}</span>
                          {cert.primary && (
                            <Target className="w-4 h-4 text-chart-3" />
                          )}
                        </div>
                        <span className={`text-2xl font-bold font-mono ${cert.color}`}>
                          {cert.readiness}%
                        </span>
                      </div>
                      <Progress value={cert.readiness} className="h-2" />
                      
                      {/* Explanation text */}
                      {cert.explanation && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {cert.explanation}
                        </p>
                      )}
                      
                      {/* Status message */}
                      {cert.readiness < 70 && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {cert.readiness < 30
                            ? '> Getting started - continue training'
                            : cert.readiness < 70
                            ? '> Building momentum - keep going'
                            : '> Almost ready - final preparations'}
                        </p>
                      )}
                      {cert.readiness >= 70 && (
                        <p className="text-xs text-secondary font-mono flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Ready for certification exam
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Methodology Weakness Heatmap */}
      {/* Temporarily disabled - caused rendering errors */}
      {/* {(totalSessions > 0 || completedSessions > 0) && (
        <MethodologyHeatmap />
      )} */}

      {/* Getting Started Guide */}
      {modulesCompleted === 0 && labsCompleted === 0 && drillsPracticed === 0 && (
        <Card className="terminal-window border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" />
              Getting Started
            </CardTitle>
            <CardDescription>Begin your journey to PT1 certification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-start gap-3">
                <span className="text-secondary font-bold">1.</span>
                <div>
                  <span className="text-foreground">Generate your first module</span>
                  <p className="text-muted-foreground text-xs mt-1">
                    Start with reconnaissance or scanning fundamentals
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold">2.</span>
                <div>
                  <span className="text-foreground">Practice command drills</span>
                  <p className="text-muted-foreground text-xs mt-1">
                    Build muscle memory with nmap, gobuster, and core tools
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-chart-3 font-bold">3.</span>
                <div>
                  <span className="text-foreground">Complete lab simulations</span>
                  <p className="text-muted-foreground text-xs mt-1">
                    Apply your knowledge in realistic pentesting scenarios
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-md">
              <p className="text-xs text-muted-foreground font-mono">
                <span className="text-primary">{'>'}</span> Philosophy: Embodied learning through practice, not memorization
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical Skills Stats */}
      {(certStore.completed_simulations > 0 || certStore.overall_score > 10) && (
        <Card className="terminal-window border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Technical Skills Proficiency
            </CardTitle>
            <CardDescription>
              Evidence-based breakdown from completed drills and simulations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Domain Scores */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Pentesting Domains
                </h3>
                {Object.entries(certStore.domain_scores).map(([domain, score]) => {
                  // Only show domains with evidence (score > baseline of 10)
                  const hasEvidence = Math.round(score) > 10;
                  if (!hasEvidence) return null;
                  
                  return (
                    <div key={domain} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium capitalize">
                          {domain.replace(/_/g, ' ')}
                        </span>
                        <Badge 
                          variant={Math.round(score) >= 70 ? 'default' : 
                                  Math.round(score) >= 40 ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {Math.round(score)}%
                        </Badge>
                      </div>
                      <Progress value={score} className="h-1.5" />
                    </div>
                  );
                })}
                {Object.values(certStore.domain_scores).every(s => Math.round(s) <= 10) && (
                  <p className="text-xs text-muted-foreground italic">
                    No domain evidence yet. Complete drills to build proficiency.
                  </p>
                )}
              </div>

              {/* Technical Skills */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Tool Mastery
                </h3>
                {Object.entries(certStore.technical_skills).map(([skill, score]) => {
                  // Only show skills with evidence (score > baseline of 10)
                  const hasEvidence = Math.round(score) > 10;
                  if (!hasEvidence) return null;
                  
                  return (
                    <div key={skill} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium capitalize">
                          {skill.replace(/_/g, ' ')}
                        </span>
                        <Badge 
                          variant={Math.round(score) >= 70 ? 'default' : 
                                  Math.round(score) >= 40 ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {Math.round(score)}%
                        </Badge>
                      </div>
                      <Progress value={score} className="h-1.5" />
                    </div>
                  );
                })}
                {Object.values(certStore.technical_skills).every(s => Math.round(s) <= 10) && (
                  <p className="text-xs text-muted-foreground italic">
                    No tool evidence yet. Complete drills to demonstrate mastery.
                  </p>
                )}
              </div>

              {/* PT1 Section Readiness */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  PT1 Exam Sections
                </h3>
                {certStore.pt1_readiness.sections.map((section) => (
                  <div key={section.section} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium capitalize">
                        {section.section.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant={section.status === 'likely_pass' || section.status === 'confident_pass' ? 'default' : 
                                  section.status === 'approaching_pass' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {section.score > 0 
                            ? `${Math.round(section.score)}%` 
                            : section.evidence_count > 0 
                              ? 'Needs more drills'
                              : 'No evidence'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">({Math.round(section.weight * 100)}% of exam)</span>
                      </div>
                    </div>
                    {section.score > 0 && <Progress value={section.score} className="h-1.5" />}
                    <p className="text-xs text-muted-foreground">
                      {section.evidence_count > 0 
                        ? `${section.evidence_count} drills completed` 
                        : 'Complete drills to build evidence'}
                    </p>
                  </div>
                ))}
                
                {/* Overall PT1 Readiness - MOVED HERE FROM ABOVE */}
                <div className="pt-3 mt-3 border-t border-border">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">PT1 Weighted Score</span>
                      <Badge 
                        variant={
                          certStore.pt1_readiness.weighted_score >= 85 ? 'default' :
                          certStore.pt1_readiness.weighted_score >= 70 ? 'secondary' :
                          'outline'
                        } 
                        className="text-sm"
                      >
                        {certStore.pt1_readiness.weighted_score > 0 
                          ? `${Math.round(certStore.pt1_readiness.weighted_score)}%` 
                          : 'Insufficient evidence'}
                      </Badge>
                    </div>
                    {certStore.pt1_readiness.weighted_score > 0 && (
                      <Progress value={certStore.pt1_readiness.weighted_score} className="h-2" />
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Pass Threshold</span>
                      <span className="font-mono">{certStore.pt1_readiness.pass_threshold}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      {certStore.pt1_readiness.interpretation}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Link to Analytics */}
            <div className="mt-6 pt-4 border-t border-border/40">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/analytics')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Full Analytics Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
