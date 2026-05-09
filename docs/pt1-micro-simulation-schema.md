# PT1 Micro-Simulation Scenario Schema Specification

## Overview
This document defines the JSON schema for PT1 Micro-Simulation scenarios. Each scenario represents a 5-15 minute focused pentesting practice drill aligned with PT1 certification domains.

## File Location
`/src/data/pt1-micro-scenarios.json`

## Schema Structure

### Root Object
```json
{
  "domain_key": [
    { /* scenario object */ }
  ]
}
```

**Domain Keys:**
- `recon_enum` - Reconnaissance & Enumeration
- `web_app` - Web Application Testing
- `network_pentest` - Network Penetration Testing
- `active_directory` - Active Directory
- `exploitation_privesc` - Exploitation & Post-Exploitation
- `reporting_time` - Reporting & Time Management

### Scenario Object Schema

```typescript
interface MicroScenario {
  // Metadata
  id: string;                    // Unique identifier (e.g., "recon-001")
  title: string;                 // Short descriptive title
  difficulty: string;            // "beginner" | "intermediate"
  domain: string;                // Human-readable domain name
  
  // Skills & Objectives
  subskills: string[];           // List of specific skills practiced
  description: string;           // What the scenario teaches
  objectives: string[];          // Specific goals to accomplish
  
  // Target Details
  targetIP: string;              // Target IP address (use 10.10.10.x range)
  openPorts: string[];           // List of open ports with services
  
  // Grading & Validation
  validApproaches: string[];     // Acceptable tool families (not exact commands)
  keyCommands: string[];         // Primary tools/commands for this scenario
  
  // Timing
  timeEstimate: string;          // Expected completion time (e.g., "5-10 minutes")
}
```

## Grading Philosophy

**CRITICAL:** Scenarios are graded by **INTENT and GOAL SIGNALS**, not exact command strings.

### What Gets Validated:
- ✅ Correct **tool family** (e.g., directory fuzzer used)
- ✅ Correct **target** specified
- ✅ Correct **port/protocol** targeted
- ✅ Correct **methodology phase**

### What Does NOT Get Validated:
- ❌ Exact command syntax
- ❌ Specific wordlist paths
- ❌ Flag ordering
- ❌ Tool preferences

### Tool Equivalents Accepted:
```
Directory Fuzzing:    gobuster | ffuf | dirb | feroxbuster | wfuzz
SMB Enumeration:      smbclient | smbmap | crackmapexec | nxc | enum4linux
Password Attacks:     hydra | medusa | ncrack | patator
SQL Injection:        sqlmap | manual curl/Burp testing
Web Proxies:          burpsuite | ZAP | mitmproxy | Caido
AD Tools:             crackmapexec | nxc (NetExec)
Impacket Tools:       All impacket-* variants accepted
```

## Integration with Decision Engine

The micro-simulation page **wraps the existing Decision Engine runtime**. It does NOT create new simulation logic.

### Flow:
1. User selects a micro-scenario from the catalog
2. System generates AI briefing using scenario metadata
3. System calls `decisionStore.startNewSimulation()` with scenario context
4. Navigation redirects to `/decision-engine` page
5. Decision Engine handles all command execution and evaluation
6. Grading uses scenario's `validApproaches` and `keyCommands` for flexibility

### Why This Works:
- ✅ No duplicate simulation code
- ✅ Leverages existing AI prompting system
- ✅ Uses existing evaluation pipeline
- ✅ Persistent state via Decision Engine store
- ✅ Markdown export works automatically

## Adding New Scenarios

### Step 1: Choose Domain
Identify which PT1 domain the scenario fits:
- Reconnaissance/Enumeration
- Web Application Testing
- Network Penetration Testing
- Active Directory
- Exploitation/Post-Exploitation
- Reporting/Time Management

### Step 2: Define Scenario Object
```json
{
  "id": "web-003",
  "title": "Authentication Bypass via JWT Manipulation",
  "difficulty": "intermediate",
  "domain": "Web Application Testing",
  "subskills": ["JWT analysis", "Token manipulation", "Authorization flaws"],
  "description": "Identify and exploit JWT authentication flaws to access privileged functionality",
  "targetIP": "10.10.10.90",
  "openPorts": ["80/tcp HTTP", "443/tcp HTTPS"],
  "objectives": [
    "Intercept JWT token using Burp Suite",
    "Decode and analyze token structure",
    "Modify token claims to escalate privileges",
    "Access admin functionality"
  ],
  "timeEstimate": "10-15 minutes",
  "validApproaches": ["burpsuite", "jwt_tool", "manual base64 decode"],
  "keyCommands": ["burpsuite", "jwt_tool", "curl", "base64"]
}
```

### Step 3: Test Integration
1. Restart development server
2. Navigate to `/pt1-micro-sims`
3. Apply filters to find your scenario
4. Click "Start Micro-Simulation"
5. Verify it redirects to Decision Engine
6. Test that commands are graded flexibly

## Constraints

### DO NOT:
- ❌ Modify Decision Engine core logic (`DecisionEnginePage.tsx`, `decision-engine-store.ts`)
- ❌ Create duplicate simulation handlers
- ❌ Add new database tables for scenarios (use JSON)
- ❌ Grade by exact command strings
- ❌ Invent domains outside PT1 scope

### DO:
- ✅ Accept Kali and BlackArch tool equivalents
- ✅ Grade by methodology and intent
- ✅ Provide detailed failure feedback
- ✅ Store failed attempts in Failure Learning system
- ✅ Keep scenarios aligned with PT1 certification content

## Example Scenarios by Domain

### Reconnaissance & Enumeration
- Network Service Discovery (beginner)
- DNS and Subdomain Enumeration (intermediate)

### Web Application Testing
- Directory and File Discovery (beginner)
- SQL Injection Discovery and Exploitation (intermediate)

### Network Penetration Testing
- SMB Enumeration and Authentication (beginner)
- SSH Credential Brute Force (intermediate)

### Active Directory
- LDAP Enumeration and User Discovery (beginner)
- Kerberoasting Attack (intermediate)

### Exploitation & Post-Exploitation
- Linux SUID Privilege Escalation (beginner)
- Windows Credential Harvesting (intermediate)

### Reporting & Time Management
- Executive Summary Writing (beginner)
- Vulnerability Prioritization Matrix (intermediate)

## Maintenance

**When adding scenarios:**
1. Maintain 2 scenarios per domain (beginner + intermediate)
2. Keep time estimates realistic (5-15 minutes)
3. Align with actual PT1 exam content
4. Test all `validApproaches` for flexibility
5. Update this spec if schema changes

**Current Status:**
- ✅ 12 starter scenarios (2 per domain)
- ✅ Schema defined and documented
- ✅ Integration with Decision Engine verified
- ✅ Flexible grading implemented
