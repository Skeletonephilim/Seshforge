# Phase 40: PT1 Exam Target Classification & Methodology Fix

## Problem Identified

**User Report**: "*The PT1 exam is wrong, Active Directory doesn't even show port 88 open. In fact the three parts seem like three separate webapp sections.*"

### Root Cause Analysis

**PT1ExamConfigPage.tsx Lines 33-53**:
```typescript
const prompt = `Generate a realistic PT1 (Junior Penetration Tester) exam scenario in JSON format.

Create a simulated target machine with:
- Target IP (use 10.10.10.x range)
- Difficulty level (intermediate)
- Brief description
- 3-5 realistic open ports with services
- Initial phase set to "reconnaissance"
```

**Critical Flaws**:
1. ❌ **No target classification logic** - AI generates random services
2. ❌ **No AD validation** - AI assumes AD without verifying ports 88/389/445
3. ❌ **No separation** between Linux Web, Mixed, and AD scenarios
4. ❌ **Unrealistic scenarios** - Claims "Active Directory" but shows nginx, Gitea, Tomcat
5. ❌ **Wrong methodology** - Mixes Network + Web exploitation in one section

### Example of Broken Output

**AI Generated**:
```json
{
  "targetIP": "10.10.10.24",
  "description": "Active Directory domain with web services",
  "openPorts": [
    "22/tcp - SSH (OpenSSH 7.4)",
    "80/tcp - HTTP (nginx 1.14.2)",
    "3000/tcp - Gitea 1.12.6",
    "8080/tcp - Apache Tomcat 9.0.31"
  ]
}
```

**Problem**: This is **NOT Active Directory**! It's a **Linux Web/DevOps stack**:
- ✅ SSH (22) → Linux indicator
- ✅ nginx → Web frontend
- ✅ Gitea → Developer platform
- ✅ Tomcat → Java application server
- ❌ **NO Kerberos (88)** → Not AD
- ❌ **NO LDAP (389)** → Not AD
- ❌ **NO SMB (445)** → Not AD

---

## Solution: Three-Tier Scenario Generation System

### Architecture Overview

**STEP 1: Target Type Selection** (Before AI generation)
- Randomly select: `'linux_web'`, `'mixed'`, or `'active_directory'`
- Each type has **explicit port requirements**

**STEP 2: Type-Specific AI Prompt** (Forced constraints)
- Linux Web: MUST include SSH, nginx/Apache, MySQL/PostgreSQL
- Mixed: Web services + SMB/RDP + internal services
- Active Directory: MUST include 88, 389, 445, 135, 5985

**STEP 3: Post-Generation Validation** (Safety check)
- Verify generated ports match selected type
- If mismatch: regenerate OR use fallback template

---

## Implementation Details

### 1. Target Type Templates

**Linux Web/DevOps Stack**:
```typescript
{
  requiredPorts: [22, 80],
  optionalPorts: [443, 3000, 3306, 5432, 8080, 8443],
  serviceExamples: ['SSH', 'nginx/Apache', 'MySQL/PostgreSQL', 'Node.js', 'Tomcat', 'Docker'],
  adPorts: [], // NO AD ports!
  osIndicator: 'Linux'
}
```

**Mixed Environment** (Linux + Windows services):
```typescript
{
  requiredPorts: [22, 80, 445],
  optionalPorts: [139, 3306, 3389, 5985, 8080],
  serviceExamples: ['SSH', 'HTTP', 'SMB', 'MySQL', 'RDP', 'WinRM'],
  adPorts: [], // SMB present but NOT full AD
  osIndicator: 'Mixed (Linux primary + Windows services)'
}
```

**Active Directory Domain**:
```typescript
{
  requiredPorts: [88, 389, 445],
  optionalPorts: [53, 135, 139, 464, 636, 3268, 3269, 5985],
  serviceExamples: ['Kerberos', 'LDAP', 'SMB', 'DNS', 'RPC', 'WinRM'],
  adPorts: [88, 389, 445], // MANDATORY for AD
  osIndicator: 'Windows Server (Active Directory Domain Controller)',
  domainInfo: {
    domainName: 'corp.local',
    dcIP: '10.10.10.10',
    users: ['administrator', 'sqlservice', 'backupuser', 'webadmin'],
    spnAccounts: ['sqlservice', 'webadmin'],
  }
}
```

### 2. Enhanced AI Prompt Structure

**Linux Web Scenario Prompt**:
```typescript
const prompt = `Generate a realistic PT1 exam scenario for a **Linux Web/DevOps target**.

MANDATORY SERVICES (must be included):
- Port 22: SSH (OpenSSH 7.x-8.x on Debian/Ubuntu)
- Port 80: HTTP (nginx 1.14+ OR Apache 2.4+)

OPTIONAL SERVICES (choose 2-3):
- Port 443: HTTPS
- Port 3000: Node.js app / Gitea / Gogs
- Port 3306: MySQL 5.7+
- Port 5432: PostgreSQL
- Port 8080: Tomcat / Jenkins
- Port 8443: HTTPS alt port

CONSTRAINTS:
- OS: Linux (Debian, Ubuntu, CentOS)
- NO Windows services (NO RDP, NO WinRM, NO SMB if possible)
- NO Active Directory ports (NO 88, 389, 636)
- Attack surface: Web vulnerabilities + service exploitation + credential reuse

Respond ONLY with valid JSON:
{
  "targetIP": "10.10.10.x",
  "difficulty": "intermediate",
  "targetType": "linux_web",
  "description": "Linux web server with developer tools and potential misconfigurations",
  "openPorts": [
    "22/tcp - SSH (OpenSSH 8.2p1 Ubuntu)",
    "80/tcp - HTTP (nginx 1.18.0)",
    "3000/tcp - Gitea 1.15.0",
    "8080/tcp - Apache Tomcat 9.0.50"
  ],
  "currentPhase": "reconnaissance",
  "osInfo": "Linux 4.15 (Ubuntu 18.04 LTS)"
}`;
```

**Active Directory Scenario Prompt**:
```typescript
const prompt = `Generate a realistic PT1 exam scenario for an **Active Directory Domain Controller**.

MANDATORY AD SERVICES (must be included):
- Port 88: Kerberos (Microsoft Kerberos 5)
- Port 389: LDAP (Active Directory Lightweight Directory Services)
- Port 445: SMB (Microsoft-DS)

OPTIONAL AD SERVICES (choose 2-3):
- Port 53: DNS (Microsoft DNS)
- Port 135: RPC (Microsoft RPC Endpoint Mapper)
- Port 139: NetBIOS (NetBIOS Session Service)
- Port 464: Kerberos Password Change
- Port 636: LDAPS (LDAP over SSL)
- Port 3268: Global Catalog
- Port 5985: WinRM (Windows Remote Management)

DOMAIN CONFIGURATION:
- Domain name: corp.local / internal.local / company.local
- DC hostname: DC01 / DC-SERVER / ADDC
- Service accounts: sqlservice, webadmin, backupuser (for Kerberoasting)

CONSTRAINTS:
- OS: Windows Server 2016/2019 (Domain Controller)
- NO Linux services (NO SSH, NO nginx)
- Full Active Directory environment
- Attack surface: Kerberoasting, LDAP enumeration, SMB relay, credential abuse

Respond ONLY with valid JSON:
{
  "targetIP": "10.10.10.10",
  "difficulty": "intermediate",
  "targetType": "active_directory",
  "description": "Windows Server 2019 Active Directory Domain Controller (corp.local)",
  "openPorts": [
    "53/tcp - DNS (Microsoft DNS 6.1)",
    "88/tcp - Kerberos (Microsoft Kerberos 5)",
    "135/tcp - RPC (Microsoft RPC Endpoint Mapper)",
    "139/tcp - NetBIOS (NetBIOS Session Service)",
    "389/tcp - LDAP (Active Directory LDAP)",
    "445/tcp - SMB (Microsoft-DS)",
    "3268/tcp - Global Catalog (LDAP)",
    "5985/tcp - WinRM (Microsoft WinRM 2.0)"
  ],
  "currentPhase": "reconnaissance",
  "osInfo": "Windows Server 2019 (Build 17763)",
  "domainInfo": {
    "domainName": "corp.local",
    "dcHostname": "DC01",
    "users": ["administrator", "sqlservice", "webadmin", "backupuser"],
    "spnAccounts": ["sqlservice", "webadmin"]
  }
}`;
```

### 3. Post-Generation Validation

```typescript
function validateScenario(scenario: any, expectedType: 'linux_web' | 'mixed' | 'active_directory'): boolean {
  const ports = scenario.openPorts.map((p: string) => parseInt(p.split('/')[0]));
  
  switch(expectedType) {
    case 'active_directory':
      // MUST have AD triple (88, 389, 445)
      return ports.includes(88) && ports.includes(389) && ports.includes(445);
    
    case 'linux_web':
      // MUST have SSH (22) and HTTP (80 or 443)
      // MUST NOT have AD ports
      return (ports.includes(22) && (ports.includes(80) || ports.includes(443))) &&
             !ports.includes(88) && !ports.includes(389);
    
    case 'mixed':
      // MUST have HTTP AND SMB
      // MAY have SSH
      // MUST NOT have Kerberos (that would be full AD)
      return (ports.includes(80) || ports.includes(443)) && 
             ports.includes(445) && 
             !ports.includes(88);
    
    default:
      return false;
  }
}
```

---

## Benefits

### For Users
- ✅ **Realistic scenarios** - Linux web is Linux web, AD is AD
- ✅ **Correct methodology** - No mixing Network + Web + AD
- ✅ **PT1 alignment** - Matches real exam structure
- ✅ **Clear expectations** - Know what to test based on services

### For Training
- ✅ **Teaches classification** - Identify target type from nmap
- ✅ **Methodology discipline** - Separate Network vs Web vs AD approaches
- ✅ **Evidence-based reasoning** - "I see port 88 → this IS AD"
- ✅ **No false assumptions** - "No port 88 → this is NOT AD"

### For PT1 Certification
- ✅ **Exam-aligned** - Reflects real PT1 structure
- ✅ **Scoring fairness** - Each section tests appropriate skills
- ✅ **Methodology practice** - PTES/OSSTMM-aligned approach
- ✅ **Professional habits** - Think before assuming

---

## Technical Changes Required

### Files to Modify

1. **src/pages/PT1ExamConfigPage.tsx** (Lines 27-91)
   - Add target type selection logic
   - Implement type-specific prompts
   - Add post-generation validation
   - Add fallback templates

2. **src/store/exam-session-store.ts**
   - Add `targetType` field to ExamScenario interface
   - Add `domainInfo` field for AD scenarios

3. **src/pages/PT1ExamSimulatorPage.tsx**
   - Update command execution prompt to respect target type
   - Add target classification display
   - Show domain info for AD scenarios

---

## User Experience Transformation

### Before Fix (Broken)
```
PT1 Exam Started
Target: 10.10.10.24
Services: SSH, nginx, Gitea, Tomcat

Section 1: Network Security Testing
[User tries to do network analysis]

Section 2: Web Application Testing
[User tests web apps]

Section 3: Active Directory Testing ❌
[No AD services present! User confused!]
[Loses points for "not demonstrating AD skills"]
```

### After Fix (Correct)
```
PT1 Exam Started
Target: 10.10.10.24
Target Type: Linux Web/DevOps Stack ✅
Services: SSH, nginx, Gitea, Tomcat
OS: Linux 4.15 (Ubuntu 18.04)

Classification:
✅ SSH (22) → Linux host
✅ nginx (80) → Web frontend
✅ Gitea (3000) → Developer platform
✅ Tomcat (8080) → Java application
❌ NO Kerberos (88) → NOT Active Directory
❌ NO LDAP (389) → NOT Active Directory
❌ NO SMB (445) → NOT AD-joined

Exam Structure Adjusted:
Section 1: Network Security Testing (40%)
- Network exposure analysis
- Service risk classification
- Attack surface mapping

Section 2: Web Application Testing (60%)
- nginx enumeration
- Gitea exploitation
- Tomcat access
- Credential chaining (Gitea → SSH → Tomcat → root)

Section 3: Active Directory Testing (SKIPPED) ✅
Status: NOT APPLICABLE - Target is NOT part of AD environment
Alternative: Focus on Linux privilege escalation instead
```

---

## Next Steps (Phase 40B)

After implementing target classification:

1. **Update AI Mentor Guidance** - Teach target classification methodology
2. **Add Classification Step** - Force users to classify before attacking
3. **Section Weighting** - Adjust scoring based on target type
4. **Fallback Logic** - If AD section but no AD services, skip section gracefully

---

**Phase 40A: Target Classification & Validation System** ✅

The PT1 exam will now generate realistic, methodologically correct scenarios that teach proper target classification and prevent false assumptions about Active Directory environments!
