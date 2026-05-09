/**
 * Markdown Import/Export System for Drill Reports
 * Provides portable backup and recovery for training history, analytics, and progression
 */

import { SimulationHistory, CertificationDomain, TechnicalSkill } from '@/store/certification-store';

export interface DrillReportData {
  // Metadata
  title: string;
  targetIP: string;
  date: string;
  timeSpent: string; // Human readable (e.g., "45 minutes")
  timeSpentSeconds: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  drillType?: 'web' | 'ad' | 'smb' | 'mixed' | 'internal' | 'linux' | 'windows';
  
  // Scenario
  scenario: string;
  objectives: string[];
  
  // Discovered Information
  discoveredInfo: {
    openPorts: string[];
    services: string[];
    directories: string[];
    credentials: string[];
    flags: string[];
  };
  
  // Command History
  commands: {
    command: string;
    phase: string;
    timestamp: string;
    output?: string;
  }[];
  
  // Performance Metrics
  performance: {
    reconScore: number;
    scanningScore: number;
    enumerationScore: number;
    exploitationScore: number;
    privescScore: number;
    methodologyScore: number;
    overallScore: number;
    timeEfficiency: string;
  };
  
  // Evaluation
  strengthsDemonstrated: string[];
  focusAreas: string[];
  feedback: string;
  
  // Certification Readiness
  certificationReadiness: {
    pt1: {
      weighted_score: number;
      pass_threshold: number;
      status: string;
    };
  };
  
  // Additional Context
  hintsUsed: number;
  mistakesIdentified: string[];
  domainsPracticed: CertificationDomain[];
  technicalSkillsUsed: TechnicalSkill[];
}

/**
 * Export drill report to Markdown format
 */
export function exportDrillReportToMarkdown(data: DrillReportData): string {
  const markdown = `# Pentesting Simulation Report

## Metadata
- **Report ID**: ${generateReportId(data.date)}
- **Target**: ${data.targetIP}
- **Date**: ${new Date(data.date).toLocaleString()}
- **Duration**: ${data.timeSpent}
- **Difficulty**: ${capitalizeFirst(data.difficulty)}
- **Drill Type**: ${data.drillType || 'mixed'}
- **Domains Assessed**: ${data.domainsPracticed && data.domainsPracticed.length > 0 ? data.domainsPracticed.join(', ') : 'multiple'}
- **Hints Used**: ${data.hintsUsed}

---

## Scenario

${data.scenario}

${data.objectives && data.objectives.length > 0 ? `
### Objectives
${data.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}
` : ''}

---

## Discovered Information

### Open Ports
${data.discoveredInfo.openPorts.length > 0 ? data.discoveredInfo.openPorts.join(', ') : 'None discovered'}

### Services
${data.discoveredInfo.services.length > 0 ? data.discoveredInfo.services.join(', ') : 'None discovered'}

### Directories
${data.discoveredInfo.directories.length > 0 ? data.discoveredInfo.directories.join(', ') : 'None discovered'}

### Credentials Discovered
${data.discoveredInfo.credentials.length > 0 ? data.discoveredInfo.credentials.map(c => `- ${c}`).join('\n') : 'None discovered'}

### Flags Captured
${data.discoveredInfo.flags.length > 0 ? data.discoveredInfo.flags.map(f => `- ${f}`).join('\n') : 'None captured'}

---

## Command History

${data.commands.map((cmd, i) => `
### Command ${i + 1} [${cmd.phase}]
\`\`\`bash
${cmd.command}
\`\`\`
**Time**: ${cmd.timestamp}
${cmd.output ? `
**Output**:
\`\`\`
${cmd.output.substring(0, 500)}${cmd.output.length > 500 ? '...' : ''}
\`\`\`
` : ''}
`).join('\n')}

---

## Performance Metrics

| Metric | Score |
|--------|-------|
| Reconnaissance | ${data.performance.reconScore}% |
| Scanning | ${data.performance.scanningScore}% |
| Enumeration | ${data.performance.enumerationScore}% |
| Exploitation | ${data.performance.exploitationScore}% |
| Privilege Escalation | ${data.performance.privescScore}% |
| Methodology | ${data.performance.methodologyScore}% |
| **Overall Score** | **${data.performance.overallScore}%** |
| Time Efficiency | ${data.performance.timeEfficiency} |

---

## Strengths Demonstrated

${data.strengthsDemonstrated.length > 0 
  ? data.strengthsDemonstrated.map(s => `- ${s}`).join('\n')
  : '- Complete drill to identify demonstrated strengths'}

---

## Focus Areas

${data.focusAreas.length > 0
  ? data.focusAreas.map(f => `- ${f}`).join('\n')
  : '- No specific focus areas identified'}

---

## Evaluation Feedback

${data.feedback}

---

## Certification Readiness Interpretation

### PT1 (TryHackMe Junior Penetration Tester Certification)
- **Weighted Score**: ${data.certificationReadiness.pt1.weighted_score}%
- **Pass Threshold**: ${data.certificationReadiness.pt1.pass_threshold}%
- **Status**: ${data.certificationReadiness.pt1.status.replace(/_/g, ' ')}

---

## Technical Context

### Domains Practiced
${data.domainsPracticed.map(d => `- ${d.replace(/_/g, ' ')}`).join('\n')}

### Technical Skills Applied
${data.technicalSkillsUsed.map(s => `- ${s.replace(/_/g, ' ')}`).join('\n')}

### Mistakes Identified (Learning Opportunities)
${data.mistakesIdentified.length > 0
  ? data.mistakesIdentified.map(m => `- ${m}`).join('\n')
  : '- No major mistakes identified - good methodology adherence!'}

---

## Report Signature

\`\`\`json
{
  "reportId": "${generateReportId(data.date)}",
  "platform": "SeshForge - Lucy's Pentesting Training Dojo",
  "version": "1.0",
  "exportedAt": "${new Date().toISOString()}",
  "timeSpentSeconds": ${data.timeSpentSeconds},
  "commandCount": ${data.commands.length},
  "flagsCaptured": ${data.discoveredInfo.flags.length},
  "credentialsDiscovered": ${data.discoveredInfo.credentials.length},
  "portsDiscovered": ${data.discoveredInfo.openPorts.length},
  "servicesEnumerated": ${data.discoveredInfo.services.length},
  "directoriesFuzzed": ${data.discoveredInfo.directories.length}
}
\`\`\`

---

*Generated by SeshForge Training Platform*
*Exported on ${new Date().toLocaleString()}*
`;

  return markdown;
}

/**
 * Parse Markdown drill report back into structured data
 * FLEXIBLE: Accepts partial reports and extracts whatever data is available
 */
export function importDrillReportFromMarkdown(markdown: string): DrillReportData | null {
  try {
    // Validate input
    if (!markdown || typeof markdown !== 'string') {
      throw new Error('Invalid input: markdown must be a non-empty string');
    }

    console.log('[FLEXIBLE IMPORT] Starting parse of', markdown.length, 'characters');

    // Try to extract report signature JSON (optional for partial reports)
    let signatureMatch = markdown.match(/```json\s*({[\s\S]*?})\s*```\s*\n*---\s*\n*\*Generated by SeshForge/);
    if (!signatureMatch) {
      signatureMatch = markdown.match(/```json\s*({[\s\S]*?})\s*```\s*(?:\n|$)/);
    }
    if (!signatureMatch) {
      const jsonBlocks = [...markdown.matchAll(/```json\s*({[\s\S]*?})\s*```/g)];
      if (jsonBlocks.length > 0) {
        signatureMatch = jsonBlocks[jsonBlocks.length - 1];
      }
    }
    if (!signatureMatch) {
      const plainJsonBlocks = [...markdown.matchAll(/(?:^|\n)(\{[\s\S]*?"platform"\s*:\s*"SeshForge[\s\S]*?\})/gm)];
      if (plainJsonBlocks.length > 0) {
        signatureMatch = plainJsonBlocks[plainJsonBlocks.length - 1];
      }
    }
    
    let signature: any = {};
    if (signatureMatch) {
      try {
        signature = JSON.parse(signatureMatch[1]);
        console.log('[FLEXIBLE IMPORT] Found signature:', signature);
      } catch (jsonError) {
        console.warn('[FLEXIBLE IMPORT] Signature JSON parse failed, continuing without it');
        signature = {};
      }
    } else {
      console.warn('[FLEXIBLE IMPORT] No signature found - treating as partial report');
    }
    
    // Extract metadata with fallbacks (support both drill and PT1 exam formats)
    const targetMatch = markdown.match(/\*\*Target\*\*:\s*(.+)/);
    const dateMatch = markdown.match(/\*\*Date\*\*:\s*(.+)/) || markdown.match(/\*\*Assessment Date\*\*:\s*(.+)/);
    const durationMatch = markdown.match(/\*\*Duration\*\*:\s*(.+)/);
    const difficultyMatch = markdown.match(/\*\*Difficulty\*\*:\s*(\w+)/) || markdown.match(/\*\*Exam Mode\*\*:\s*(.+)/);
    const hintsMatch = markdown.match(/\*\*Hints Used\*\*:\s*(\d+)/);
    
    if (!targetMatch) {
      console.warn('Missing target IP in drill report, using default');
    }
    if (!dateMatch) {
      console.warn('Missing date in drill report, using current date');
    }
    
    // Extract scenario (support both formats)
    const scenarioMatch = markdown.match(/## Scenario\s*\n\s*\n(.+?)(?=\n\n###|---)/s) || 
                         markdown.match(/## Executive Summary\s*\n[\s\S]*?(?=## |$)/s);
    if (!scenarioMatch) {
      console.warn('Missing scenario/summary section in report');
    }
    
    // Extract objectives
    const objectivesSection = markdown.match(/### Objectives\s*\n(.+?)(?=\n\n---)/s);
    const objectives = objectivesSection
      ? objectivesSection[1].split('\n').map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
      : [];
    
    // Extract discovered information (support both drill and PT1 formats)
    const openPortsMatch = markdown.match(/### Open Ports\s*\n(.+?)(?=\n\n###)/s) ||
                          markdown.match(/\*\*Ports Discovered\*\*:\s*(.+?)(?=\n|$)/s);
    const servicesMatch = markdown.match(/### Services\s*\n(.+?)(?=\n\n###)/s) ||
                         markdown.match(/\*\*Services Enumerated\*\*:\s*(.+?)(?=\n|$)/s);
    const directoriesMatch = markdown.match(/### Directories\s*\n(.+?)(?=\n\n###)/s) ||
                            markdown.match(/\*\*Directories Found\*\*:\s*(.+?)(?=\n|$)/s);
    const credentialsMatch = markdown.match(/### Credentials Discovered\s*\n(.+?)(?=\n\n###)/s) ||
                            markdown.match(/\*\*Credentials\*\*:\s*(.+?)(?=\n|$)/s);
    const flagsMatch = markdown.match(/### Flags Captured\s*\n(.+?)(?=\n\n---)/s) ||
                      markdown.match(/\*\*Flags Captured\*\*:\s*(\d+)/s);
    
    const openPorts = openPortsMatch && !openPortsMatch[1].includes('None')
      ? openPortsMatch[1].split(',').map(p => p.trim())
      : [];
    
    const services = servicesMatch && !servicesMatch[1].includes('None')
      ? servicesMatch[1].split(',').map(s => s.trim())
      : [];
    
    const directories = directoriesMatch && !directoriesMatch[1].includes('None')
      ? directoriesMatch[1].split(',').map(d => d.trim())
      : [];
    
    const credentials = credentialsMatch && !credentialsMatch[1].includes('None')
      ? credentialsMatch[1].split('\n').map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean)
      : [];
    
    // Flags: Handle both formats (comma-separated list or number)
    let flags: string[] = [];
    if (flagsMatch) {
      if (flagsMatch[1].includes('\n') || flagsMatch[1].includes(',')) {
        flags = flagsMatch[1].split(/[\n,]/).map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean);
      } else {
        // PT1 format: **Flags Captured:** 1
        const flagCount = parseInt(flagsMatch[1]);
        if (!isNaN(flagCount) && flagCount > 0) {
          flags = Array(flagCount).fill('flag').map((_, i) => `Flag ${i + 1}`);
        }
      }
    }
    
    // Extract commands (support both drill and PT1 formats)
    const drillCommandSections = [...markdown.matchAll(/### Command \d+ \[(.+?)\]\s*```bash\s*(.+?)\s*```\s*\*\*Time\*\*:\s*(.+?)(?=\n\n###|\n\n---)/gs)];
    let commands = drillCommandSections.map(match => ({
      phase: match[1].trim(),
      command: match[2].trim(),
      timestamp: match[3].trim(),
      output: '', // Output is truncated in export, not critical for import
    }));
    
    // PT1 format: **Commands Executed:** 11
    if (commands.length === 0) {
      const commandCountMatch = markdown.match(/\*\*Commands Executed\*\*:\s*(\d+)/);
      if (commandCountMatch) {
        const count = parseInt(commandCountMatch[1]);
        // Generate placeholder commands
        commands = Array(count).fill(null).map((_, i) => ({
          phase: 'unknown',
          command: `command_${i + 1}`,
          timestamp: new Date().toISOString(),
          output: '',
        }));
      }
    }
    
    // Extract performance metrics (support both table and inline formats)
    const perfTable = markdown.match(/\| Metric \| Score \|\s*\n\|.+?\|\s*\n(.+?)(?=\n\n---)/s) ||
                     markdown.match(/## Assessment Metrics[\s\S]*?(?=\n\n##|---)/s);
    const perfLines = perfTable ? perfTable[1].split('\n').filter(Boolean) : [];
    
    const extractScore = (label: string): number => {
      const line = perfLines.find(l => l.includes(label));
      if (!line) return 0;
      const match = line.match(/(\d+)%/);
      return match ? parseInt(match[1]) : 0;
    };
    
    const performance = {
      reconScore: extractScore('Reconnaissance'),
      scanningScore: extractScore('Scanning'),
      enumerationScore: extractScore('Enumeration'),
      exploitationScore: extractScore('Exploitation'),
      privescScore: extractScore('Privilege Escalation'),
      methodologyScore: extractScore('Methodology'),
      overallScore: extractScore('Overall Score'),
      timeEfficiency: perfLines.find(l => l.includes('Time Efficiency'))?.split('|')[2]?.trim() || 'Good',
    };
    
    // FLEXIBLE: Extract strengths (optional)
    const strengthsSection = markdown.match(/## Strengths Demonstrated\s*\n(.+?)(?=\n\n---|\n\n##|$)/s);
    const strengthsDemonstrated = strengthsSection
      ? strengthsSection[1].split('\n').map(line => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
      : [];
    
    // FLEXIBLE: Extract focus areas (optional)
    const focusSection = markdown.match(/## Focus Areas\s*\n(.+?)(?=\n\n---|\n\n##|$)/s);
    const focusAreas = focusSection
      ? focusSection[1].split('\n').map(line => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
      : [];
    
    // FLEXIBLE: Extract feedback (optional)
    const feedbackSection = markdown.match(/## Evaluation Feedback\s*\n(.+?)(?=\n\n---|\n\n##|$)/s);
    const feedback = feedbackSection ? feedbackSection[1].trim() : '';
    
    console.log('[FLEXIBLE IMPORT] Evaluation:', {
      strengthsCount: strengthsDemonstrated.length,
      focusAreasCount: focusAreas.length,
      hasFeedback: feedback.length > 0,
    });
    
    // FLEXIBLE: Extract certification readiness (optional)
    const pt1WeightedMatch = markdown.match(/### PT1.*?\n-\s*\*\*Weighted Score\*\*:\s*(\d+)%/s);
    const pt1ThresholdMatch = markdown.match(/### PT1.*?\n-\s*\*\*Weighted Score\*\*:.*?\n-\s*\*\*Pass Threshold\*\*:\s*(\d+)%/s);
    const pt1StatusMatch = markdown.match(/### PT1.*?\n-\s*\*\*Weighted Score\*\*:.*?\n-\s*\*\*Pass Threshold\*\*:.*?\n-\s*\*\*Status\*\*:\s*(.+?)(?=\n|$)/s);
    
    const certificationReadiness = {
      pt1: {
        weighted_score: pt1WeightedMatch ? parseInt(pt1WeightedMatch[1]) : 0,
        pass_threshold: pt1ThresholdMatch ? parseInt(pt1ThresholdMatch[1]) : 70,
        status: pt1StatusMatch ? pt1StatusMatch[1].trim() : 'not_exam_ready',
      },
    };
    
    // FLEXIBLE: Extract technical context (optional)
    const domainsSection = markdown.match(/### Domains Practiced\s*\n(.+?)(?=\n\n###|\n\n##|---|\n\n\*|$)/s);
    const domainsPracticed = domainsSection
      ? domainsSection[1].split('\n').map(line => 
          line.replace(/^[-*]\s*/, '').trim().replace(/\s+/g, '_')
        ).filter(Boolean) as CertificationDomain[]
      : [];
    
    const skillsSection = markdown.match(/### Technical Skills Applied\s*\n(.+?)(?=\n\n###|\n\n##|---|\n\n\*|$)/s);
    const technicalSkillsUsed = skillsSection
      ? skillsSection[1].split('\n').map(line => 
          line.replace(/^[-*]\s*/, '').trim().replace(/\s+/g, '_')
        ).filter(Boolean) as TechnicalSkill[]
      : [];
    
    const mistakesSection = markdown.match(/### Mistakes Identified.*?\n(.+?)(?=\n\n---|\n\n##|$)/s);
    const mistakesIdentified = mistakesSection
      ? mistakesSection[1].split('\n').map(line => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
      : [];
    
    console.log('[FLEXIBLE IMPORT] Technical context:', {
      domainsCount: domainsPracticed.length,
      skillsCount: technicalSkillsUsed.length,
      mistakesCount: mistakesIdentified.length,
    });
    
    // Build result with all extracted data (partial OK)
    const result = {
      title: `${targetMatch?.[1] || 'Partial Report'} - ${difficultyMatch?.[1] || 'Unknown'} Engagement`,
      targetIP: targetMatch?.[1] || 'Unknown',
      date: dateMatch?.[1] || new Date().toISOString(),
      timeSpent: durationMatch?.[1] || '0 minutes',
      timeSpentSeconds: signature.timeSpentSeconds || 0,
      difficulty: (difficultyMatch?.[1]?.toLowerCase() as any) || 'beginner',
      scenario: scenarioMatch?.[1]?.trim() || '',
      objectives,
      discoveredInfo: {
        openPorts,
        services,
        directories,
        credentials,
        flags,
      },
      commands,
      performance,
      strengthsDemonstrated,
      focusAreas,
      feedback,
      certificationReadiness: {
        pt1: {
          weighted_score: certificationReadiness.pt1?.weighted_score || 0,
          pass_threshold: certificationReadiness.pt1?.pass_threshold || 70,
          status: certificationReadiness.pt1?.status || 'not_exam_ready',
        },
      },
      hintsUsed: hintsMatch ? parseInt(hintsMatch[1]) : 0,
      mistakesIdentified,
      domainsPracticed,
      technicalSkillsUsed,
    };
    
    // Calculate what was successfully extracted
    const extractedFields = {
      metadata: !!(targetMatch || dateMatch || durationMatch || difficultyMatch),
      scenario: !!scenarioMatch,
      discoveredInfo: openPorts.length > 0 || services.length > 0 || directories.length > 0 || credentials.length > 0 || flags.length > 0,
      commands: commands.length > 0,
      performance: performance.overallScore > 0 || performance.methodologyScore > 0,
      evaluation: strengthsDemonstrated.length > 0 || focusAreas.length > 0 || feedback.length > 0,
      technical: domainsPracticed.length > 0 || technicalSkillsUsed.length > 0,
    };
    
    const extractedCount = Object.values(extractedFields).filter(Boolean).length;
    const totalSections = Object.keys(extractedFields).length;
    
    console.log('[FLEXIBLE IMPORT] Successfully parsed:', {
      extractedSections: `${extractedCount}/${totalSections}`,
      details: extractedFields,
      target: result.targetIP,
      commands: result.commands.length,
      flags: result.discoveredInfo.flags.length,
      credentials: result.discoveredInfo.credentials.length,
      ports: result.discoveredInfo.openPorts.length,
      services: result.discoveredInfo.services.length,
      directories: result.discoveredInfo.directories.length,
      overallScore: result.performance.overallScore,
      strengthsCount: result.strengthsDemonstrated.length,
      focusAreasCount: result.focusAreas.length,
    });
    
    // Minimum validation: At least ONE section must be present
    if (extractedCount === 0) {
      throw new Error('No recognizable data found in the provided text. Please ensure the text contains at least one valid section (metadata, scores, discovered info, commands, etc.)');
    }
    
    return result;
  } catch (error) {
    console.error('[FLEXIBLE IMPORT] Parse failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Provide helpful debugging info
    if (typeof markdown === 'string') {
      console.error('[FLEXIBLE IMPORT] Input analysis:', {
        length: markdown.length,
        hasMetadata: markdown.includes('**Target**') || markdown.includes('**Date**') || markdown.includes('**Assessment Date**'),
        hasScenario: markdown.includes('## Scenario') || markdown.includes('## Executive Summary'),
        hasDiscoveredInfo: markdown.includes('## Discovered Information') || markdown.includes('**Flags Captured**'),
        hasPerformance: markdown.includes('## Performance Metrics') || markdown.includes('## Assessment Metrics'),
        hasCommands: markdown.includes('## Command History') || markdown.includes('**Commands Executed**'),
        hasStrengths: markdown.includes('## Strengths') || markdown.includes('## Candidate Report'),
        hasFocusAreas: markdown.includes('## Focus Areas'),
        hasSignature: markdown.includes('## Report Signature') || markdown.includes('*Generated by SeshForge'),
        reportType: markdown.includes('# Penetration Testing Report') ? 'PT1 Exam' : 
                    markdown.includes('# Pentesting Simulation Report') ? 'Drill Report' : 'Unknown',
        firstChars: markdown.substring(0, 300),
        lastChars: markdown.substring(markdown.length - 300),
      });
    }
    
    return null;
  }
}

/**
 * Generate unique report ID
 */
function generateReportId(date: string): string {
  const timestamp = new Date(date).getTime();
  return `SESH-${timestamp.toString(36).toUpperCase()}`;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Download Markdown file to user's device
 */
export function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read Markdown file from user's device
 */
export function readMarkdownFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
