/**
 * GHOST COMMAND INPUT - MUSCLE MEMORY BUILDER
 * 
 * Terminal input with ghost text suggestions that:
 * - Displays next logical command in grey
 * - User types over it manually (text becomes white)
 * - Context-aware based on phase and discoveries
 * - Keyboard shortcuts: Tab (accept), Ctrl+Space (explain), Enter (execute)
 * - Three modes: Full (with explanation) / Minimal (command only) / Off (exam simulation)
 */

import { useState, useEffect, useRef } from 'react';
import { Terminal, Lightbulb, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface GhostCommandContext {
  phase: string;
  lastCommand: string;
  lastOutput: string;
  discoveredInfo: {
    openPorts?: string[];
    services?: string[];
    directories?: string[];
    credentials?: string[];
    flags?: string[];
  };
  targetIP: string;
}

export type GhostMode = 'full' | 'minimal' | 'off';

interface GhostCommandInputProps {
  context: GhostCommandContext;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  ghostMode?: GhostMode;
  onGhostModeChange?: (mode: GhostMode) => void;
  disabled?: boolean;
  placeholder?: string;
  customGhostSuggestion?: string; // Override automatic suggestions with AI's next step
}

export default function GhostCommandInput({
  context,
  value,
  onChange,
  onSubmit,
  ghostMode = 'full',
  onGhostModeChange,
  disabled = false,
  placeholder = 'Enter pentesting command...',
  customGhostSuggestion,
}: GhostCommandInputProps) {
  const [ghostSuggestion, setGhostSuggestion] = useState('');
  const [ghostExplanation, setGhostExplanation] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate ghost suggestion based on context or use custom override
  useEffect(() => {
    if (ghostMode === 'off' || disabled) {
      setGhostSuggestion('');
      setGhostExplanation('');
      return;
    }

    // Use custom suggestion if provided (from AI's Next Best Steps)
    if (customGhostSuggestion) {
      setGhostSuggestion(customGhostSuggestion);
      setGhostExplanation('From AI mentor\'s recommended next steps');
      console.log('[GhostCommandInput] Using custom ghost suggestion:', customGhostSuggestion);
      return;
    }

    // Otherwise, generate suggestion based on context
    const suggestion = generateGhostSuggestion(context);
    setGhostSuggestion(suggestion.command);
    setGhostExplanation(suggestion.explanation);
  }, [context, ghostMode, disabled, customGhostSuggestion]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && ghostSuggestion && !value) {
      e.preventDefault();
      onChange(ghostSuggestion);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    } else if (e.ctrlKey && e.key === ' ') {
      e.preventDefault();
      setShowExplanation(!showExplanation);
    }
  };

  // Calculate what should be shown in grey vs white
  const ghostRemaining = ghostSuggestion && value.length < ghostSuggestion.length
    ? ghostSuggestion.slice(value.length)
    : '';
  
  // Check if user is typing the suggested command correctly
  const isTypingCorrectly = ghostSuggestion && value === ghostSuggestion.slice(0, value.length);

  return (
    <div className="space-y-2">
      {/* Mode Toggle */}
      {onGhostModeChange && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Muscle Memory Mode:</span>
          <div className="flex gap-1">
            <Button
              variant={ghostMode === 'full' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onGhostModeChange('full')}
              className="text-xs"
            >
              Full
            </Button>
            <Button
              variant={ghostMode === 'minimal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onGhostModeChange('minimal')}
              className="text-xs"
            >
              Minimal
            </Button>
            <Button
              variant={ghostMode === 'off' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onGhostModeChange('off')}
              className="text-xs"
            >
              Off (Exam)
            </Button>
          </div>
        </div>
      )}

      {/* Input Container */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-secondary flex-shrink-0" />
          
          <div className="flex-1 relative">
            {/* Combined text display: typed (white) + remaining ghost (grey) */}
            {ghostMode !== 'off' && ghostSuggestion && (
              <div className="absolute inset-0 pointer-events-none pl-2 pr-4 py-2 font-mono text-sm whitespace-nowrap overflow-hidden flex">
                {/* Typed portion (white) - matches user input */}
                <span className="text-foreground">
                  {value}
                </span>
                {/* Remaining ghost portion (grey) - only if typing correctly */}
                {isTypingCorrectly && ghostRemaining && (
                  <span className="text-muted-foreground/40">
                    {ghostRemaining}
                  </span>
                )}
              </div>
            )}
            
            {/* Actual input (transparent text to allow overlay to show) */}
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={ghostMode === 'off' ? placeholder : ''}
              className="w-full pl-2 pr-4 py-2 rounded-lg bg-background border border-border font-mono text-sm text-transparent caret-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              style={{ caretColor: 'hsl(var(--foreground))' }}
              autoFocus
            />
          </div>

          <Button
            onClick={onSubmit}
            disabled={!value.trim() || disabled}
            size="sm"
            className="gap-1"
          >
            <Terminal className="w-3 h-3" />
            Execute
          </Button>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {ghostMode !== 'off' && ghostSuggestion && (
              <>
                {!value && (
                  <span className="font-mono">
                    <kbd className="px-1 py-0.5 rounded bg-muted">Tab</kbd> to accept suggestion
                  </span>
                )}
                {value && isTypingCorrectly && ghostRemaining && (
                  <span className="text-green-500 font-mono flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Typing correctly - {ghostRemaining.length} chars remaining
                  </span>
                )}
                {value && !isTypingCorrectly && (
                  <span className="text-amber-500 font-mono">
                    ⚠ Deviating from suggestion
                  </span>
                )}
              </>
            )}
            {ghostMode === 'full' && ghostExplanation && (
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Lightbulb className="w-3 h-3" />
                <span>
                  <kbd className="px-1 py-0.5 rounded bg-muted">Ctrl+Space</kbd> for explanation
                </span>
              </button>
            )}
          </div>
          <span className="font-mono">
            <kbd className="px-1 py-0.5 rounded bg-muted">Enter</kbd> to execute
          </span>
        </div>
      </div>

      {/* Explanation Panel */}
      {ghostMode === 'full' && showExplanation && ghostExplanation && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-500 mb-1">Why This Command?</p>
              <p className="text-xs leading-relaxed">{ghostExplanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generate context-aware ghost command suggestion
 */
function generateGhostSuggestion(context: GhostCommandContext): { command: string; explanation: string } {
  const { phase, lastCommand, discoveredInfo, targetIP } = context;

  // Reconnaissance phase
  if (phase === 'reconnaissance' || phase === 'scanning') {
    if (!lastCommand || lastCommand.includes('nmap')) {
      return {
        command: `nmap -sC -sV -Pn -T4 -p- ${targetIP} -oA nmap/full`,
        explanation: 'Comprehensive port scan with version detection and default scripts. -p- scans all 65535 ports. -oA saves output in all formats.',
      };
    }
    if (discoveredInfo.openPorts && discoveredInfo.openPorts.some(p => p.includes('80') || p.includes('443'))) {
      return {
        command: `ffuf -u http://${targetIP}/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt -mc 200,204,301,302,307,401,403`,
        explanation: 'Fast directory fuzzing with ffuf. Looks for hidden endpoints. Status codes: 200 (found), 403 (exists but forbidden), 301 (redirect).',
      };
    }
  }

  // Enumeration phase
  if (phase === 'enumeration') {
    if (discoveredInfo.directories && discoveredInfo.directories.length > 0) {
      const dir = discoveredInfo.directories[0];
      return {
        command: `wget -r -np -nH http://${targetIP}${dir}`,
        explanation: `Download discovered directory contents for offline analysis. -r = recursive, -np = no parent, -nH = no hostname folder.`,
      };
    }
    if (discoveredInfo.openPorts?.some(p => p.includes('445'))) {
      return {
        command: `smbclient -L //${targetIP} -N`,
        explanation: 'Enumerate SMB shares anonymously (-N = no password). Look for readable/writable shares.',
      };
    }
    if (discoveredInfo.openPorts?.some(p => p.includes('22'))) {
      return {
        command: `ssh-audit ${targetIP}`,
        explanation: 'Analyze SSH configuration for weak ciphers, keys, or misconfigurations.',
      };
    }
  }

  // Initial access phase
  if (phase === 'initial_access' || phase === 'exploitation') {
    if (discoveredInfo.credentials && discoveredInfo.credentials.length > 0) {
      const [username, password] = (discoveredInfo.credentials[0] || ':').split(':');
      if (discoveredInfo.openPorts?.some(p => p.includes('22'))) {
        return {
          command: `ssh ${username}@${targetIP}`,
          explanation: `Attempt SSH access with discovered credentials. If successful, you gain initial shell access.`,
        };
      }
    }
  }

  // Privilege escalation phase
  if (phase === 'privilege_escalation') {
    if (!lastCommand.includes('linpeas') && !lastCommand.includes('sudo')) {
      return {
        command: `curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh`,
        explanation: 'Run linpeas automated privilege escalation checker. Identifies SUID binaries, sudo misconfigurations, kernel exploits, etc.',
      };
    }
    return {
      command: `find / -perm -4000 -type f 2>/dev/null`,
      explanation: 'Find all SUID binaries (run as owner, often root). Check GTFOBins for exploitation methods.',
    };
  }

  // Default fallback
  return {
    command: `nmap -sC -sV -Pn ${targetIP}`,
    explanation: 'Start with service enumeration to understand the attack surface.',
  };
}
