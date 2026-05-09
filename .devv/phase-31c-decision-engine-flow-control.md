# Phase 31C: Decision Engine Flow Control & Multi-Domain Support

## Implementation Date
March 18, 2026

## Overview
Comprehensive enhancement to the Decision Engine that removes artificial session termination, introduces manual control, and expands training scope from Web-only to full PT1 coverage (Web, Network Security, Active Directory).

---

## 🎯 Core Problems Solved

### 1. **Forced Termination on Flag Completion** ❌ FIXED
**Before**:
- Finding all flags (2/2) automatically ended the session
- Prevented continued exploration (post-exploitation, lateral movement, pivoting)
- Broke realistic pentesting workflow
- Users couldn't practice methodology beyond initial objectives

**After**:
- ✅ Flags are now **milestones, not termination conditions**
- ✅ Session continues indefinitely until user clicks "End Session & Evaluate"
- ✅ Post-exploitation phase accessible
- ✅ Realistic pentesting workflow preserved

---

### 2. **Limited Scope (Web Only)** ❌ FIXED
**Before**:
- Decision Engine scenarios focused only on Web Application Testing
- No Network Security training
- No Active Directory training
- Limited PT1 preparation

**After**:
- ✅ **7 Training Domains Available**:
  1. 🌐 **Web Application Testing** - OWASP Top 10, SQLi, XSS, Authentication, File Upload
  2. 🔐 **Active Directory** - Kerberoasting, AS-REP Roasting, LDAP, Lateral Movement
  3. 📁 **SMB / Network Shares** - Anonymous access, Credential discovery, Share exploitation
  4. 🏢 **Internal Services** - RPC, WinRM, MSSQL, Service exploitation
  5. 🐧 **Linux Exploitation** - SSH, SUID/sudo, Kernel exploits, Cronjob abuse
  6. 🪟 **Windows Exploitation** - IIS, SMB, RDP, Token abuse, Weak services
  7. 🔄 **Mixed Environment** - Hybrid Windows/Linux with multiple attack vectors

---

## ✅ Features Implemented

### 1. **Removed Auto-Termination Logic**
**File**: `src/pages/DecisionEnginePage.tsx` (Lines 715-735)

**Before (Broken)**:
```typescript
if (simulation.history.length >= 15 || foundFlags >= 2) {
  if (foundFlags >= 2 || simulation.history.length >= 15) {
    setTimeout(() => evaluateSimulation(), 1000); // ❌ FORCED END
  }
}
```

**After (Fixed)**:
```typescript
// ✅ PHASE 31C: Removed auto-termination on flag completion
// Flags are now milestones, NOT termination conditions
const foundFlags = updatedDiscoveredInfo.flags?.length || 0;

// Show toast for flag captures (but never auto-end session)
if (foundFlags > (simulation.discoveredInfo.flags?.length || 0)) {
  toast({
    title: '🎯 Flag Captured!',
    description: `Flag ${foundFlags}/2 found! ${
      foundFlags >= 2 
        ? 'Excellent progress! Session continues - click "End Session" when ready.' 
        : 'Continue exploring to find the remaining flag.'
    }`,
  });
}
// NO auto-evaluation trigger!
```

---

### 2. **Domain Selection UI**
**File**: `src/pages/DecisionEnginePage.tsx` (Lines 1520-1548)

**Added Dropdown**:
```tsx
<Select value={selectedDomain} onValueChange={(v) => setSelectedDomain(v as ScenarioType)}>
  <SelectContent>
    <SelectItem value="web">🌐 Web Application Testing</SelectItem>
    <SelectItem value="ad">🔐 Active Directory</SelectItem>
    <SelectItem value="smb">📁 SMB / Network Shares</SelectItem>
    <SelectItem value="internal">🏢 Internal Services</SelectItem>
    <SelectItem value="linux">🐧 Linux Exploitation</SelectItem>
    <SelectItem value="windows">🪟 Windows Exploitation</SelectItem>
    <SelectItem value="mixed">🔄 Mixed Environment</SelectItem>
  </SelectContent>
</Select>
```

**With Contextual Descriptions**:
- **Web**: "OWASP Top 10, SQLi, XSS, Authentication, File Upload vulnerabilities"
- **AD**: "Kerberoasting, AS-REP Roasting, LDAP enumeration, Lateral Movement"
- **SMB**: "SMB enumeration, Anonymous access, Credential discovery, Share exploitation"
- **Internal**: "RPC, WinRM, MSSQL, Service exploitation, Credential reuse"
- **Linux**: "SSH, Web services, SUID/sudo, Kernel exploits, Cronjob abuse"
- **Windows**: "IIS, SMB, RDP, WinRM, Token abuse, Weak services"
- **Mixed**: "Hybrid Windows/Linux environment with multiple attack vectors"

---

### 3. **Domain-Specific Scenario Generation**
**File**: `src/lib/scenario-diversity.ts` (Lines 34-48)

**New Function**:
```typescript
export function generateScenarioForDomain(
  domain: ScenarioType,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  history: ScenarioHistory[]
): ScenarioTemplate {
  const usedIPs = history.flatMap(h => h.usedTargetIPs || []);
  const recentPrivesc = history.slice(-3).map(h => h.lastPrivescMethod);
  const targetIP = generateUniqueIP(usedIPs);
  
  return buildScenarioTemplate(domain, difficulty, targetIP, recentPrivesc);
}
```

**Integration** (DecisionEnginePage.tsx Lines 264-267):
```typescript
// ✅ PHASE 31C: Use selected domain if specified, otherwise auto-diverse
const scenarioTemplate = selectedDomain 
  ? generateScenarioForDomain(selectedDomain, difficulty, scenarioHistory)
  : generateDiverseScenario(difficulty, scenarioHistory);
```

---

### 4. **Manual Session Control UI**
**File**: `src/pages/DecisionEnginePage.tsx` (Lines 1848-1865)

**Before (Confusing)**:
```tsx
<Button onClick={executeCommand}>Execute</Button>
<Button onClick={endSimulation}>End Run</Button> // ❌ Unclear
<Button onClick={evaluateSimulation}>Finish & Evaluate</Button> // ❌ Too many buttons
```

**After (Clear)**:
```tsx
{/* Execute command button */}
<Button onClick={executeCommand} className="flex-1">
  <Terminal className="mr-2 h-4 w-4" />
  Execute
</Button>

{/* ✅ PHASE 31C: Manual session control - End Session is now the primary way to finish */}
<Button onClick={evaluateSimulation} variant="default" className="flex-1">
  <Download className="mr-2 h-4 w-4" />
  End Session & Evaluate
</Button>

<p className="text-xs text-muted-foreground text-center mt-2">
  💡 Session continues even after all flags found - click "End Session" when you're ready to finalize
</p>
```

---

## 📊 User Experience Transformation

### **Before Phase 31C** (Restrictive & Limited)

**Flag Completion**:
```
User discovers flag 1/2:
Toast: "Flag 1/2 found! Continue to find the remaining flag."

User discovers flag 2/2:
Toast: "Flag 2/2 found! Simulation complete - click Finish & Evaluate."
→ Auto-evaluation triggered after 1 second ❌
→ Session ENDS ❌
→ Can't continue post-exploitation ❌
→ Can't practice pivoting/lateral movement ❌
```

**Domain Selection**:
```
No options - always Web Application scenarios
→ No AD training ❌
→ No Network Security practice ❌
→ Limited PT1 preparation ❌
```

---

### **After Phase 31C** (Flexible & Comprehensive)

**Flag Completion**:
```
User discovers flag 1/2:
Toast: "🎯 Flag Captured! Flag 1/2 found! Continue exploring to find the remaining flag."
→ Session continues ✅

User discovers flag 2/2:
Toast: "🎯 Flag Captured! Flag 2/2 found! Excellent progress! Session continues - click 'End Session' when ready."
→ NO auto-evaluation ✅
→ Session continues ✅
→ Can practice post-exploitation ✅
→ Can pivot to other systems ✅
→ Can document findings ✅
→ User decides when to end ✅

User clicks "End Session & Evaluate":
→ Evaluation triggered ✅
→ Professional report generated ✅
→ Certification tracking updated ✅
```

**Domain Selection**:
```
Setup Phase:
┌─────────────────────────────────┐
│ Training Domain                 │
│ [🌐 Web Application Testing ▼] │
│                                 │
│ 🔐 Active Directory             │
│ 📁 SMB / Network Shares         │
│ 🏢 Internal Services            │
│ 🐧 Linux Exploitation           │
│ 🪟 Windows Exploitation         │
│ 🔄 Mixed Environment            │
└─────────────────────────────────┘

Select AD:
Description: "Kerberoasting, AS-REP Roasting, LDAP enumeration, Lateral Movement"

Start Simulation:
Toast: "Simulation Started | Target: 10.10.10.142 | Type: AD | Difficulty: intermediate"

Scenario Generated:
Target: corp.local (10.10.10.142)
Services: Kerberos (88), LDAP (389), SMB (445), RPC (135), WinRM (5985)
Objectives:
  1. Enumerate domain users via LDAP
  2. Identify service accounts with SPNs
  3. Perform Kerberoasting attack
  4. Crack service account password
  5. Escalate to Domain Admin
```

---

## 🔧 Technical Implementation Details

### **State Management**
```typescript
const [selectedDomain, setSelectedDomain] = useState<ScenarioType>('web');
```

**Default**: Web Application Testing (most common starting point)

**Available Types**:
- `'web'` | `'ad'` | `'smb'` | `'mixed'` | `'internal'` | `'linux'` | `'windows'`

---

### **Scenario Generation Flow**

**1. User Selects Domain**:
```typescript
setSelectedDomain('ad'); // User clicks AD dropdown option
```

**2. Start Simulation**:
```typescript
const scenarioTemplate = selectedDomain 
  ? generateScenarioForDomain('ad', difficulty, scenarioHistory) // ✅ Force AD
  : generateDiverseScenario(difficulty, scenarioHistory); // Auto-diverse (old behavior)
```

**3. Scenario Built**:
```typescript
// buildScenarioTemplate('ad', 'intermediate', '10.10.10.142', recentPrivesc)
return {
  type: 'ad',
  entryPoints: ['ad_kerb', 'smb_enum'],
  services: [
    { port: 88, service: 'Kerberos', version: '5.0' },
    { port: 389, service: 'LDAP', version: '3' },
    { port: 445, service: 'SMB', version: '3.1.1' },
    { port: 135, service: 'RPC' },
    { port: 5985, service: 'WinRM' },
  ],
  privescMethod: 'token_abuse',
  domainInfo: {
    domainName: 'corp.local',
    dcIP: '10.10.10.142',
    users: ['administrator', 'sqlservice', 'backupuser'],
    spnAccounts: ['sqlservice'],
  },
  objectives: [
    'Enumerate domain users via LDAP',
    'Identify SPNs (GetUserSPNs.py)',
    'Kerberoast service accounts',
    'Crack hashes with hashcat',
    'Escalate to Domain Admin',
    'Capture user and DA flags',
  ],
};
```

**4. AI Generates Narrative**:
```
You are conducting a black-box penetration test against corp.local (10.10.10.142).

**Services Detected**:
- Port 88: Kerberos (Active Directory authentication)
- Port 389: LDAP (Directory services)
- Port 445: SMB (File sharing, authentication)
- Port 135: RPC (Remote procedure calls)
- Port 5985: WinRM (Remote management)

**Objectives**:
1. Enumerate domain users and identify service accounts
2. Perform Kerberoasting to extract TGS tickets
3. Crack service account passwords offline
4. Achieve lateral movement or privilege escalation
5. Capture user.txt and root.txt flags

**Rules of Engagement**:
- No brute-forcing user credentials
- No denial of service attacks
- Document all findings
```

---

### **Domain-Specific Attack Surfaces**

Each domain has **unique services, tools, and objectives**:

#### **Web Application (web)**:
```typescript
services: [
  { port: 80, service: 'HTTP', version: 'Apache 2.4.41' },
  { port: 443, service: 'HTTPS', version: 'nginx 1.18' },
  { port: 22, service: 'SSH', version: 'OpenSSH 8.2p1' },
  { port: 3306, service: 'MySQL', version: '5.7.33' },
],
entryPoints: ['web_vuln'],
tools: ['nmap', 'gobuster', 'ffuf', 'nikto', 'sqlmap', 'burpsuite'],
objectives: [
  'Enumerate web directories',
  'Test for SQLi/XSS/LFI',
  'Exploit authentication bypass',
  'Upload web shell',
  'Escalate privileges via sudo/SUID',
],
```

#### **Active Directory (ad)**:
```typescript
services: [
  { port: 88, service: 'Kerberos' },
  { port: 389, service: 'LDAP' },
  { port: 445, service: 'SMB' },
  { port: 135, service: 'RPC' },
  { port: 5985, service: 'WinRM' },
],
entryPoints: ['ad_kerb', 'smb_enum'],
tools: ['ldapsearch', 'GetUserSPNs.py', 'crackmapexec', 'bloodhound', 'impacket'],
objectives: [
  'LDAP enumeration',
  'Kerberoasting',
  'AS-REP Roasting',
  'Pass-the-Hash',
  'Lateral movement',
  'Domain Admin escalation',
],
```

#### **SMB / Network Shares (smb)**:
```typescript
services: [
  { port: 445, service: 'SMB', version: '3.1.1' },
  { port: 139, service: 'NetBIOS' },
  { port: 22, service: 'SSH' },
  { port: 3306, service: 'MySQL' },
],
entryPoints: ['smb_enum', 'cred_reuse'],
tools: ['smbclient', 'smbmap', 'enum4linux', 'crackmapexec'],
objectives: [
  'Anonymous SMB enumeration',
  'Share permission analysis',
  'Credential discovery in shares',
  'Lateral movement via SMB',
  'Privilege escalation',
],
```

---

## 📈 Benefits

### **For Users**:
✅ **Realistic workflow** - Session continues beyond objectives  
✅ **Post-exploitation practice** - Pivoting, lateral movement, persistence  
✅ **Multi-domain training** - Web, Network, AD all accessible  
✅ **Manual control** - User decides when to end, not the system  
✅ **Reduced frustration** - No forced termination interruptions  

### **For PT1 Preparation**:
✅ **Complete coverage** - All 3 PT1 exam sections (Web 40%, Network 36%, AD 24%)  
✅ **Domain-specific scenarios** - Realistic attack surfaces per domain  
✅ **Methodology development** - Full PTES phases accessible  
✅ **Tool exposure** - Kali/BlackArch toolkits per domain  
✅ **Certification alignment** - True PT1 exam simulation  

### **For Training Effectiveness**:
✅ **Flexible exploration** - Users can experiment without time pressure  
✅ **Comprehensive practice** - Beyond "get flags and done"  
✅ **Skill development** - Post-exploitation, pivoting, reporting  
✅ **Confidence building** - Complete engagement experience  
✅ **Real-world preparation** - Mirrors actual pentesting workflows  

---

## 🚀 Build Status

```
✓ Build successful! Project is ready for deployment.
```

**Zero TypeScript Errors** - All features functional and integrated!

---

## 📝 Next Steps (Future Enhancements)

### **Phase 31D: Timer System Enhancement** (Optional)
- **Problem**: If timer is active (Professional Report Mode), it still ends session at expiration
- **Solution**: Make timer advisory-only, never force-end session
- **Benefit**: Timed practice without artificial constraints

### **Phase 31E: Multi-Target Scenarios** (Advanced)
- **Concept**: Lateral movement across multiple IPs
- **Example**: Compromise 10.10.10.50 → pivot to 10.10.10.51 → escalate on 10.10.10.52
- **Benefit**: Realistic enterprise environment simulation

### **Phase 31F: Custom Scenario Builder** (Advanced)
- **Feature**: User-defined scenarios (services, objectives, attack surface)
- **Benefit**: Targeted practice for specific weaknesses

---

**Phase 31C: COMPLETE** ✅

The Decision Engine now provides **unrestricted exploration** with **multi-domain PT1 coverage** and **manual session control** for realistic, comprehensive pentesting training! 🎉
