# Phase 48: Custom Box Generator - HTB/THM-Inspired Original Scenarios (April 11, 2026)

## **Overview**
Implemented a custom box generator that analyzes HTB/THM boxes (name, writeup, or description) and creates completely original scenarios inspired by their core mechanics, vulnerabilities, and attack chains.

---

## 🎯 **Core Functionality**

### **What It Does**
1. **Analyzes Source Material**: User provides box name, writeup URL, or description
2. **Extracts Mechanics**: AI identifies core vulnerabilities, attack chain logic, technologies, misconfigurations, privesc vectors
3. **Abstracts Patterns**: Converts specifics into underlying mechanics and patterns
4. **Generates Original**: Creates completely new box inspired by those mechanics
5. **Ensures Originality**: NEVER reuses same IPs, directory names, usernames, flags, or exact exploits

### **Input Methods**
Users can provide:
- ✅ **Box Name**: "Lame" (HTB), "Olympus" (THM)
- ✅ **Writeup URL**: Full URL to HTB/THM writeup
- ✅ **Writeup Text**: Paste complete writeup content
- ✅ **Description**: Brief description of vulnerabilities and attack path

---

## 🚫 **Hard Rules (Enforced by AI)**

### **DO NOT Reuse**:
- ❌ Same IP structure (e.g., if source was 10.10.10.10, don't use 10.10.10.11)
- ❌ Same directory names (/backup, /admin, /uploads - if source used them)
- ❌ Same usernames/passwords (admin:admin, root:password)
- ❌ Same flags (THM{flag_here})
- ❌ Same exact exploits (CVE-2019-14287 → must use different vuln)

### **MUST Do**:
- ✅ Mutate logic (LFI → becomes RFI or different file disclosure)
- ✅ Change context (web app → becomes internal service)
- ✅ Recombine vulnerabilities (SQL injection + file upload → becomes exposed API + JWT misconfiguration)
- ✅ Create new realistic paths (maintain realism but different flow)

---

## 🧬 **Transformation Strategy**

### **Pattern Extraction**
```
SOURCE BOX:
- LFI in web app
- /etc/passwd disclosure
- SSH credentials found
- sudo -l shows NOPASSWD entry
- Root via sudo exploit

EXTRACTED PATTERN:
"File disclosure → credential leak → SSH access → sudo misconfiguration → root"
```

### **Pattern Transformation**
```
GENERATED BOX:
- Exposed backup file (.bak)
- Config leak (database.yml)
- API token found
- WinRM remote access
- Token abuse → admin access
```

**Key Changes**:
- LFI → Backup file exposure (different vuln type)
- /etc/passwd → database config (different file)
- SSH → WinRM (different service)
- sudo misconfig → token abuse (different privesc)

---

## 📋 **Output Structure**

### **Generated Box Data**
```json
{
  "title": "Corporate Intranet",
  "difficulty": "medium",
  "description": "Internal corporate web portal with exposed development files",
  "scenario": "Acme Corp's internal employee portal. Multiple services exposed to local network during development phase.",
  "skillsTested": ["Web Enumeration", "Credential Hunting", "API Exploitation", "Windows Privilege Escalation"],
  "technologies": ["IIS 10.0", "ASP.NET Core", "MSSQL 2019", "WinRM"],
  "targetIP": "10.10.11.42",
  "openPorts": [
    "80/tcp - HTTP (IIS 10.0)",
    "1433/tcp - MSSQL (2019)",
    "5985/tcp - WinRM"
  ],
  "attackSurface": "Corporate web portal with database backend and remote management enabled",
  "enumerationPhase": "Check common web paths, look for backup files, inspect source code, enumerate database access",
  "initialFoothold": "Exposed backup file containing application config with hardcoded database credentials. Config includes API token for internal services.",
  "postExploitation": "Enumerate MSSQL database for additional credentials, check WinRM access with found tokens, inspect local users and groups",
  "privilegeEscalation": "Service account token has SeImpersonatePrivilege, enabling RottenPotato/JuicyPotato exploitation for SYSTEM access",
  "flags": {
    "user": "CTF{c0rp0r4t3_1ntr4n3t_pwn3d}",
    "root": "CTF{s3rv1c3_4cc0unt_t0k3n_4bus3}"
  },
  "recommendedTools": ["gobuster", "sqlcmd", "evil-winrm", "JuicyPotato"],
  "objective": "Gain initial access via exposed credentials, escalate to SYSTEM"
}
```

---

## 🎨 **Example Transformations**

### **Example 1: HTB "Lame"**

**Source Box** (Lame):
- Samba 3.0.20
- CVE-2007-2447 (username map script)
- Direct root shell

**AI Analysis**:
- Pattern: Vulnerable SMB service → remote code execution → instant root
- Technology: Samba
- Privesc: None (direct root)

**Generated Box** (NOT Lame):
```
Title: "Legacy Network"
- FTP 2.3.4 (vsftpd)
- CVE-2011-2523 backdoor
- Shell as nobody → kernel exploit → root
```

**Transformation Applied**:
- Samba → FTP (different service)
- Username map script → backdoor trigger (different exploit)
- Direct root → privilege escalation required (more realistic)

---

### **Example 2: THM "Olympus"**

**Source Box** (Olympus):
- SQL injection in login form
- File upload bypass
- SUID binary exploitation

**AI Analysis**:
- Pattern: Web injection → file write → privilege escalation
- Attack chain: SQL → RCE → local exploit

**Generated Box**:
```
Title: "Developer Portal"
- NoSQL injection (MongoDB)
- Exposed Git directory
- Writable systemd service
```

**Transformation Applied**:
- SQL → NoSQL (different injection type)
- File upload → Git exposure (different web vuln)
- SUID binary → systemd abuse (different privesc)

---

## 💡 **Design Philosophy**

### **Quality Standards**
- ✅ Feels like HTB/THM quality (realistic, logical, solvable)
- ✅ Solvable with real methodology (PTES, OWASP, OSSTMM)
- ✅ Trains PT1/eJPT/OSCP mindset (exam-aligned)
- ✅ ORIGINAL and not traceable to source (no plagiarism)
- ✅ Logical flow (no guessy CTF nonsense)

### **Avoided Anti-Patterns**
- ❌ Rabbit holes without purpose
- ❌ Unrealistic exploits (20-step chains with no hints)
- ❌ Trivial one-step RCE (unless justified by scenario)
- ❌ Overused clichés (unless improved)

---

## 🎯 **Training Value**

### **Teaches Methodology**
- **Enumeration**: Systematic service discovery
- **Web Testing**: Directory fuzzing, source code inspection
- **Exploitation**: Credential reuse, API abuse, service exploitation
- **Post-Exploitation**: Lateral movement, token abuse
- **Privilege Escalation**: SUID, sudo, services, kernel, capabilities

### **PT1/eJPT/OSCP Alignment**
- **PT1 Focus**: Web exploitation, network enumeration, privesc
- **eJPT Alignment**: Metasploit, SMB, basic exploits
- **OSCP Prep**: Exploit chaining, manual exploitation, no Metasploit crutches

---

## 📊 **User Experience**

### **Before Feature**:
```
Box Mode: Only random boxes
No customization
Generic scenarios
```

### **After Feature**:
```
Box Mode: Random OR Custom
Custom: Paste HTB writeup
AI: Extracts "LFI → SSH → sudo"
AI: Generates "Config leak → WinRM → token abuse"
User: Gets original box inspired by HTB mechanics

Result: Endless unique practice material!
```

---

## 🚀 **Usage Flow**

### **Step 1: Open Custom Generator**
```
Box Mode → "Create Custom Box" button
```

### **Step 2: Provide Input**
```
User pastes:
"HTB Lame - Samba 3.0.20, CVE-2007-2447, direct root shell"

OR

Full writeup URL:
"https://0xdf.gitlab.io/2020/04/07/htb-lame.html"
```

### **Step 3: AI Analysis**
```
AI extracts:
- Pattern: SMB vuln → RCE → root
- Technologies: Samba
- No privilege escalation

AI transforms:
- SMB → FTP (different service)
- Direct RCE → backdoor + kernel exploit (more realistic)
- Instant root → proper privesc chain
```

### **Step 4: Original Box Generated**
```
Title: "Legacy Network"
Target: 10.10.11.87
Services: FTP 2.3.4, SSH 7.4, Apache 2.4.41
Attack: FTP backdoor → shell → kernel exploit → root

User: "This is completely different but teaches same concepts!"
```

---

## ✅ **Benefits**

### **For Users**:
- ✅ **Endless practice material** - Generate unlimited unique boxes
- ✅ **Learn from HTB/THM** - Analyze top-rated boxes, get inspired versions
- ✅ **No plagiarism concerns** - Completely original scenarios
- ✅ **Methodology-focused** - Same attack patterns, different implementations
- ✅ **Certification prep** - Aligned with PT1/eJPT/OSCP standards

### **For Learning**:
- ✅ **Pattern recognition** - Understand underlying mechanics
- ✅ **Transferable skills** - Same concepts, different contexts
- ✅ **Avoid memorization** - Can't memorize when boxes are unique
- ✅ **Real methodology** - Must use systematic approach every time

### **For Platform**:
- ✅ **Unique value proposition** - Not just random boxes
- ✅ **HTB/THM-inspired quality** - Maintains high standards
- ✅ **Ethical approach** - Inspired by, not copied from
- ✅ **Scalable content** - AI generates infinite variations

---

## 📁 **Files Modified**

1. ✅ **src/pages/BoxModePage.tsx**:
   - Added `showCustomGenerator`, `customBoxInput`, `isGeneratingCustom` state
   - Implemented `generateCustomBox()` function with advanced AI prompt
   - Added Custom Box Generator UI card
   - Pattern extraction and transformation logic
   - Originality enforcement rules

2. ✅ **.devv/phase-48-custom-box-generator.md** - Complete documentation

---

## 🚀 **Build Status**

```
✓ Build successful! Project is ready for deployment.
```

**Zero compilation errors** ✅

---

## 🎓 **AI Prompt Engineering**

### **Key Instructions to AI**
```
ANALYZE THIS SOURCE BOX AND CREATE AN ORIGINAL INSPIRED SCENARIO

CRITICAL RULES:
1. Extract core mechanics
2. DO NOT reuse: IPs, directory names, usernames, flags, exact exploits
3. Mutate logic, change context, recombine vulnerabilities

TRANSFORMATION STRATEGY:
- Extract pattern like: "LFI → creds → SSH → sudo"
- Transform into: different vuln OR entry point, different service, different chaining

Ensure:
- Feels like HTB/THM quality
- Solvable with real methodology
- ORIGINAL and not traceable to source
```

### **Why This Works**
- **Clear constraints** - AI knows exactly what NOT to do
- **Pattern-based thinking** - Focus on mechanics, not specifics
- **Quality standards** - Maintain HTB/THM realism
- **Originality enforcement** - Explicit transformation requirements

---

**Your Box Mode now generates unlimited HTB/THM-quality original boxes inspired by real-world pentesting challenges!** 🎉
