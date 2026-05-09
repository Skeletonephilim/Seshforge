/**
 * Download Helper Utilities
 * 
 * Provides functions for downloading files programmatically
 * Used for PT1 section reports and final exam reports
 */

import type { PT1Section } from '@/store/exam-session-store';

/**
 * Downloads a markdown file with the specified content and filename
 */
export function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('[DownloadHelper] Downloaded markdown file:', filename);
}

/**
 * Generates a timestamped filename for PT1 section reports
 */
export function generateSectionFilename(section: PT1Section, targetIP?: string): string {
  const sectionNames: Record<PT1Section, string> = {
    web_application: 'Web-Application-Testing',
    network_security: 'Network-Security-Testing',
    active_directory: 'Active-Directory-Testing',
  };
  
  const sectionName = sectionNames[section];
  const ipSuffix = targetIP ? `-${targetIP.replace(/\./g, '-')}` : '';
  const timestamp = Date.now();
  
  return `PT1-Section-${sectionName}${ipSuffix}-${timestamp}.md`;
}

/**
 * Generates a timestamped filename for final PT1 exam report
 */
export function generateFinalExamFilename(targetIP?: string): string {
  const ipSuffix = targetIP ? `-${targetIP.replace(/\./g, '-')}` : '';
  const timestamp = Date.now();
  
  return `PT1-Final-Exam-Report${ipSuffix}-${timestamp}.md`;
}

/**
 * Gets human-readable section name
 */
export function getSectionDisplayName(section: PT1Section): string {
  const names: Record<PT1Section, string> = {
    web_application: 'Web Application Testing',
    network_security: 'Network Security Testing',
    active_directory: 'Active Directory Testing',
  };
  return names[section];
}
