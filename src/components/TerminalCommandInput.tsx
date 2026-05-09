import { useState, useEffect } from 'react';
import { Terminal, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Common pentesting tools for validation
const VALID_COMMANDS = [
  'nmap', 'gobuster', 'ffuf', 'nikto', 'hydra', 'sqlmap', 'metasploit',
  'msfconsole', 'burpsuite', 'wireshark', 'john', 'hashcat', 'enum4linux',
  'smbclient', 'smbmap', 'crackmapexec', 'responder', 'bloodhound',
  'linpeas', 'winpeas', 'linenum', 'pspy', 'searchsploit', 'exploitdb',
  'nc', 'netcat', 'socat', 'ssh', 'ftp', 'telnet', 'curl', 'wget',
  'dig', 'nslookup', 'dnsrecon', 'dnsenum', 'fierce', 'sublist3r',
  'wfuzz', 'dirb', 'dirbuster', 'wpscan', 'joomscan', 'whatweb',
  'cewl', 'crunch', 'cupp', 'medusa', 'patator', 'thc-hydra',
  'impacket-smbclient', 'impacket-secretsdump', 'mimikatz', 'rubeus',
  'certutil', 'powershell', 'cmd', 'bash', 'sh', 'python', 'python3',
  'perl', 'ruby', 'php', 'gcc', 'javac', 'msfvenom', 'chisel',
  'proxychains', 'sshuttle', 'ligolo', 'plink', 'ngrok', 'tcpdump',
  'tshark', 'ettercap', 'bettercap', 'aircrack-ng', 'reaver', 'wifite',
  'steghide', 'binwalk', 'foremost', 'volatility', 'autopsy', 'sleuthkit',
  'ls', 'cd', 'cat', 'grep', 'find', 'which', 'whereis', 'locate',
  'sudo', 'su', 'chmod', 'chown', 'ps', 'kill', 'pkill', 'systemctl',
  'service', 'netstat', 'ss', 'ifconfig', 'ip', 'iptables', 'ufw',
  'echo', 'printf', 'tee', 'awk', 'sed', 'cut', 'sort', 'uniq',
  'head', 'tail', 'wc', 'diff', 'comm', 'mount', 'umount', 'df', 'du'
];

interface TerminalCommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (command: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showValidation?: boolean;
  expectedContext?: string; // For context-aware validation
  className?: string;
}

type ValidationState = 'valid' | 'invalid' | 'warning' | 'neutral';

export function TerminalCommandInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Enter command...",
  disabled = false,
  showValidation = true,
  expectedContext,
  className
}: TerminalCommandInputProps) {
  const [validationState, setValidationState] = useState<ValidationState>('neutral');
  const [validationMessage, setValidationMessage] = useState('');

  useEffect(() => {
    if (!showValidation || value.trim() === '') {
      setValidationState('neutral');
      setValidationMessage('');
      return;
    }

    validateCommand(value);
  }, [value, showValidation, expectedContext]);

  const validateCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim();
    if (!trimmedCmd) {
      setValidationState('neutral');
      setValidationMessage('');
      return;
    }

    // Extract the base command (first word)
    const baseCommand = trimmedCmd.split(/\s+/)[0].toLowerCase();
    
    // Check if command exists in our valid command list
    const isValidCommand = VALID_COMMANDS.includes(baseCommand);

    if (!isValidCommand) {
      // Check for common typos
      const suggestions = VALID_COMMANDS.filter(cmd => 
        cmd.startsWith(baseCommand.substring(0, 3)) || 
        levenshteinDistance(cmd, baseCommand) <= 2
      );

      if (suggestions.length > 0) {
        setValidationState('invalid');
        setValidationMessage(`Command not recognized. Did you mean: ${suggestions.slice(0, 2).join(', ')}?`);
      } else {
        setValidationState('invalid');
        setValidationMessage('Command not recognized in pentesting toolkit');
      }
      return;
    }

    // Command exists - now check context-aware validation
    if (expectedContext) {
      const contextValidation = validateCommandContext(baseCommand, trimmedCmd, expectedContext);
      setValidationState(contextValidation.state);
      setValidationMessage(contextValidation.message);
    } else {
      // Basic argument validation
      const hasArguments = trimmedCmd.split(/\s+/).length > 1;
      if (!hasArguments && requiresArguments(baseCommand)) {
        setValidationState('warning');
        setValidationMessage(`Valid command, but ${baseCommand} typically requires arguments`);
      } else {
        setValidationState('valid');
        setValidationMessage(`Valid ${baseCommand} command`);
      }
    }
  };

  const validateCommandContext = (
    baseCommand: string, 
    fullCommand: string, 
    context: string
  ): { state: ValidationState; message: string } => {
    const lowerContext = context.toLowerCase();
    
    // Web enumeration context
    if (lowerContext.includes('web') || lowerContext.includes('http') || lowerContext.includes('port 80')) {
      const webTools = ['gobuster', 'ffuf', 'nikto', 'dirb', 'wfuzz', 'wpscan', 'whatweb'];
      if (webTools.includes(baseCommand)) {
        return { state: 'valid', message: `Correct choice for web enumeration` };
      }
      if (baseCommand === 'nmap' && fullCommand.includes('-sV')) {
        return { state: 'valid', message: `Valid service enumeration approach` };
      }
      return { state: 'warning', message: `Consider using web enumeration tools for this context` };
    }

    // Service enumeration context
    if (lowerContext.includes('service') || lowerContext.includes('scan') || lowerContext.includes('port')) {
      if (baseCommand === 'nmap') {
        return { state: 'valid', message: `Correct tool for service enumeration` };
      }
      return { state: 'warning', message: `Port scanning tools like nmap may be more appropriate` };
    }

    // SMB enumeration context
    if (lowerContext.includes('smb') || lowerContext.includes('445')) {
      const smbTools = ['enum4linux', 'smbclient', 'smbmap', 'crackmapexec'];
      if (smbTools.includes(baseCommand)) {
        return { state: 'valid', message: `Correct choice for SMB enumeration` };
      }
      return { state: 'warning', message: `Consider SMB-specific tools for this service` };
    }

    // Password cracking context
    if (lowerContext.includes('password') || lowerContext.includes('hash') || lowerContext.includes('brute')) {
      const crackingTools = ['hydra', 'john', 'hashcat', 'medusa', 'crunch'];
      if (crackingTools.includes(baseCommand)) {
        return { state: 'valid', message: `Appropriate tool for password attacks` };
      }
      return { state: 'warning', message: `Password cracking tools may be more suitable` };
    }

    return { state: 'valid', message: `Valid command syntax` };
  };

  const requiresArguments = (cmd: string): boolean => {
    const requiresArgs = [
      'nmap', 'gobuster', 'ffuf', 'nikto', 'hydra', 'sqlmap',
      'curl', 'wget', 'dig', 'ssh', 'scp', 'ftp'
    ];
    return requiresArgs.includes(cmd);
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  const getInputClasses = () => {
    if (!showValidation || value.trim() === '') {
      return 'border-muted bg-background text-foreground';
    }

    switch (validationState) {
      case 'valid':
        return 'border-green-500/50 bg-green-500/5 text-green-400 focus-visible:ring-green-500/30';
      case 'invalid':
        return 'border-red-500/50 bg-red-500/5 text-red-400 focus-visible:ring-red-500/30';
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/5 text-yellow-400 focus-visible:ring-yellow-500/30';
      default:
        return 'border-muted bg-background text-foreground';
    }
  };

  const getValidationIcon = () => {
    switch (validationState) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Terminal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      e.preventDefault();
      onSubmit(value.trim());
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-primary font-mono text-sm">$</span>
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-14 pr-10 font-mono text-sm transition-all duration-200",
            getInputClasses()
          )}
        />
        {showValidation && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getValidationIcon()}
          </div>
        )}
      </div>

      {showValidation && validationMessage && (
        <Card className={cn(
          "p-3 text-sm border-l-4 transition-all duration-200",
          validationState === 'valid' && "border-l-green-500 bg-green-500/5",
          validationState === 'invalid' && "border-l-red-500 bg-red-500/5",
          validationState === 'warning' && "border-l-yellow-500 bg-yellow-500/5"
        )}>
          <p className={cn(
            "font-mono text-xs",
            validationState === 'valid' && "text-green-400",
            validationState === 'invalid' && "text-red-400",
            validationState === 'warning' && "text-yellow-400"
          )}>
            {validationMessage}
          </p>
        </Card>
      )}
    </div>
  );
}
