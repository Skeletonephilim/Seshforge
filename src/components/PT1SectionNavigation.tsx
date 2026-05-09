/**
 * PT1 Section Navigation Component
 * 
 * Features:
 * - Three section buttons (Web Application, Network Security, Active Directory)
 * - Completion badges for completed sections
 * - Current section indicator
 * - Switch confirmation modal
 * - Section grades display
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Globe, 
  Network, 
  Server, 
  CheckCircle2, 
  Circle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import type { PT1Section, SectionReport } from '@/store/exam-session-store';

interface PT1SectionNavigationProps {
  currentSection: PT1Section;
  completedSections: SectionReport[];
  onSectionSwitch: (newSection: PT1Section) => void;
  isExamActive: boolean;
}

interface SectionInfo {
  id: PT1Section;
  name: string;
  shortName: string;
  icon: typeof Globe;
  description: string;
  weight: string;
}

const SECTIONS: SectionInfo[] = [
  {
    id: 'web_application',
    name: 'Web Application Testing',
    shortName: 'Web',
    icon: Globe,
    description: 'OWASP Top 10, Burp Suite workflows, content discovery',
    weight: '40%',
  },
  {
    id: 'network_security',
    name: 'Network Security Testing',
    shortName: 'Network',
    icon: Network,
    description: 'Port scanning, service enumeration, exploit development',
    weight: '36%',
  },
  {
    id: 'active_directory',
    name: 'Active Directory Testing',
    shortName: 'AD',
    icon: Server,
    description: 'Kerberoasting, lateral movement, domain compromise',
    weight: '24%',
  },
];

export default function PT1SectionNavigation({
  currentSection,
  completedSections,
  onSectionSwitch,
  isExamActive,
}: PT1SectionNavigationProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetSection, setTargetSection] = useState<PT1Section | null>(null);

  const handleSectionClick = (section: PT1Section) => {
    if (section === currentSection) return; // Already on this section
    if (!isExamActive) return; // Exam not active

    // Show confirmation modal
    setTargetSection(section);
    setShowConfirmModal(true);
  };

  const handleConfirmSwitch = () => {
    if (targetSection) {
      onSectionSwitch(targetSection);
      setShowConfirmModal(false);
      setTargetSection(null);
    }
  };

  const handleCancelSwitch = () => {
    setShowConfirmModal(false);
    setTargetSection(null);
  };

  const getSectionStatus = (sectionId: PT1Section) => {
    const isCompleted = completedSections.some(s => s.sectionId === sectionId);
    const isCurrent = sectionId === currentSection;
    return { isCompleted, isCurrent };
  };

  const getSectionScore = (sectionId: PT1Section) => {
    const report = completedSections.find(s => s.sectionId === sectionId);
    return report?.evaluation?.score;
  };

  const getScoreBadgeVariant = (score?: number) => {
    if (!score) return 'outline';
    if (score >= 85) return 'default'; // Green
    if (score >= 70) return 'secondary'; // Blue
    return 'destructive'; // Red
  };

  const targetSectionInfo = SECTIONS.find(s => s.id === targetSection);

  return (
    <>
      {/* Section Navigation Bar */}
      <Card className="mb-4 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              PT1 Exam Sections
            </h3>
            <Badge variant="outline" className="text-xs">
              {completedSections.length}/3 Completed
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SECTIONS.map((section) => {
              const { isCompleted, isCurrent } = getSectionStatus(section.id);
              const score = getSectionScore(section.id);
              const Icon = section.icon;

              return (
                <Button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  disabled={!isExamActive || isCurrent}
                  variant={isCurrent ? 'default' : 'outline'}
                  className={`
                    h-auto p-3 flex flex-col items-start gap-2
                    ${isCurrent ? 'border-2 border-primary shadow-lg' : ''}
                    ${isCompleted && !isCurrent ? 'border-green-500/50' : ''}
                    transition-all hover:scale-[1.02]
                  `}
                >
                  {/* Header Row */}
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-semibold text-sm">
                        {section.shortName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Current Badge */}
                      {isCurrent && (
                        <Badge 
                          variant="default" 
                          className="text-[10px] px-1.5 py-0.5"
                        >
                          Current
                        </Badge>
                      )}

                      {/* Completion Badge */}
                      {isCompleted && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}

                      {/* Uncompleted Badge */}
                      {!isCompleted && !isCurrent && (
                        <Circle className="h-4 w-4 text-muted-foreground/30" />
                      )}
                    </div>
                  </div>

                  {/* Section Name */}
                  <div className="w-full text-left">
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {section.name}
                    </p>
                  </div>

                  {/* Weight & Score Row */}
                  <div className="w-full flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      Weight: {section.weight}
                    </Badge>

                    {/* Score Badge */}
                    {score !== undefined && (
                      <Badge 
                        variant={getScoreBadgeVariant(score)}
                        className="text-[10px] px-1.5 py-0.5"
                      >
                        Score: {score}%
                      </Badge>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Helper Text */}
          {isExamActive && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Click a section to switch. Current section will be auto-saved.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section Switch Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Switch to {targetSectionInfo?.name}?
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="space-y-2">
                <p className="text-sm">
                  You are about to switch from <strong>Section {getSectionIndex(currentSection)}</strong> to{' '}
                  <strong>Section {targetSection ? getSectionIndex(targetSection) : ''}</strong>.
                </p>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    What happens next:
                  </p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>
                        Current section will be <strong>automatically saved</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-500 flex-shrink-0" />
                      <span>
                        Report and findings will be <strong>preserved</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <TrendingUp className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                      <span>
                        Section evaluation will be <strong>generated</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 mt-0.5 text-orange-500 flex-shrink-0" />
                      <span>
                        New section will start with a <strong>clean slate</strong>
                      </span>
                    </li>
                  </ul>
                </div>

                {targetSectionInfo && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs font-medium mb-1">
                      {targetSectionInfo.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {targetSectionInfo.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]">
                        Weight: {targetSectionInfo.weight} of exam
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelSwitch}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmSwitch}
            >
              Switch Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function to get section index
function getSectionIndex(section: PT1Section): number {
  const mapping: Record<PT1Section, number> = {
    web_application: 1,
    network_security: 2,
    active_directory: 3,
  };
  return mapping[section];
}
