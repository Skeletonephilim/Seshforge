import { FusionAcademyUnit } from '@/types/fusion-academy';

/**
 * UNIT 1: Host Header & Virtual Host Discovery
 * 
 * SEC1: OS & Network Fundamentals, Red Team
 * CEH: Scanning Networks, Enumeration
 * THM: Networking Core Protocols, Nmap Basics, Web Application Basics
 * 
 * Mechanic: HTTP Host header routing, virtual host enumeration
 */

export const unit_host_header_vhost: FusionAcademyUnit = {
  id: 'fusion_001_host_header_vhost',
  title: 'The Hidden Developer Portal',
  
  certification_mapping: {
    sec1: {
      relevance: ['os_network_fundamentals', 'red_team'],
      exam_style: ['artifact_driven', 'scenario_based'],
      description: 'Practical HTTP enumeration, hidden surface discovery, analyst mindset'
    },
    ceh: {
      modules: ['scanning_networks', 'enumeration', 'hacking_web_applications'],
      theory_focus: ['attack_classification', 'methodology_phase'],
      terminology: ['Virtual hosting', 'Host header manipulation', 'Subdomain enumeration', 'Web reconnaissance'],
      description: 'Footprinting phase, web server enumeration, information gathering'
    },
    ceh_practical: {
      skill_tags: ['reconnaissance', 'enumeration', 'web_attack'],
      time_pressure: 15,
      objectives: [
        'Identify web services',
        'Discover hidden vhosts',
        'Access restricted content',
        'Document findings'
      ]
    },
    thm_path_mapping: [
      'networking_core_protocols',
      'nmap_basics',
      'web_application_basics',
      'burp_suite_basics'
    ]
  },
  
  difficulty: 'easy',
  estimated_minutes: 25,
  domain: 'web',
  primary_mechanic: 'Host header routing and virtual host discovery',
  secondary_mechanic: 'HTTP request manipulation',
  fundamentals_covered: [
    'HTTP protocol basics',
    'Virtual hosting concepts',
    'Host header function',
    'Web enumeration methodology'
  ],
  reporting_focus: 'Information disclosure, hidden surface exposure',
  
  brief: `A client's external penetration test revealed a single web server at 172.16.23.142. The server returns a standard corporate homepage. However, reconnaissance suggests the server may host additional virtual hosts not linked from the main site.

Your task: Investigate whether hidden virtual hosts exist and assess whether they expose sensitive functionality.`,
  
  learning_objectives: [
    'Understand how HTTP Host headers control virtual host routing',
    'Recognize when a web server uses virtual hosting',
    'Enumerate virtual hosts using multiple techniques',
    'Articulate security impact of exposed development/admin surfaces',
    'Write a concise pentest finding for information disclosure'
  ],
  
  artifacts: [
    {
      path: '/evidence/nmap.txt',
      type: 'text',
      content: `Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 172.16.23.142
Host is up (0.00024s latency).

PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 8.9p1 Ubuntu 3ubuntu0.1
80/tcp  open  http     Apache httpd 2.4.52 ((Ubuntu))
|_http-title: TechCorp Solutions - Enterprise IT Services
|_http-server-header: Apache/2.4.52 (Ubuntu)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 7.23 seconds`
    },
    {
      path: '/evidence/homepage.html',
      type: 'code',
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TechCorp Solutions - Enterprise IT Services</title>
</head>
<body>
    <header>
        <h1>TechCorp Solutions</h1>
        <p>Your Trusted Partner in Enterprise Technology</p>
    </header>
    <nav>
        <a href="/about">About</a>
        <a href="/services">Services</a>
        <a href="/contact">Contact</a>
    </nav>
    <main>
        <p>Welcome to TechCorp Solutions, delivering excellence since 2005.</p>
    </main>
    <footer>
        <!-- Dev note: staging.techcorp.local ready for UAT -->
        <p>&copy; 2024 TechCorp Solutions. All rights reserved.</p>
    </footer>
</body>
</html>`
    },
    {
      path: '/evidence/curl_default.txt',
      type: 'text',
      content: `$ curl -I http://172.16.23.142/

HTTP/1.1 200 OK
Date: Mon, 18 Mar 2024 14:23:41 GMT
Server: Apache/2.4.52 (Ubuntu)
Last-Modified: Mon, 11 Mar 2024 09:15:33 GMT
Content-Length: 1247
Content-Type: text/html; charset=UTF-8

$ curl http://172.16.23.142/

[Returns homepage.html content]`
    },
    {
      path: '/evidence/notes.txt',
      type: 'text',
      content: `Recon Notes:
- Single IP: 172.16.23.142
- Domain: techcorp.local (DNS not externally resolvable)
- Subdomain hints from OSINT: dev.techcorp.local, staging.techcorp.local mentioned in job postings
- HTML comment in homepage footer references "staging.techcorp.local ready for UAT"
- Apache virtual hosting likely in use (common for multiple sites on one IP)`
    }
  ],
  
  supported_commands: [
    'cat',
    'grep',
    'curl',
    'curl -H',
    'find',
    'strings'
  ],
  
  command_responses: [
    {
      match: /cat.*nmap\.txt/i,
      output: `[Shows nmap.txt content]`
    },
    {
      match: /cat.*homepage\.html/i,
      output: `[Shows homepage.html content with visible HTML comment]`
    },
    {
      match: /grep.*-i.*"staging\|dev"/i,
      output: `homepage.html:        <!-- Dev note: staging.techcorp.local ready for UAT -->
notes.txt:- Subdomain hints from OSINT: dev.techcorp.local, staging.techcorp.local mentioned in job postings
notes.txt:- HTML comment in homepage footer references "staging.techcorp.local ready for UAT"`
    },
    {
      match: /curl.*-H.*"Host:\s*dev\.techcorp\.local"/i,
      output: `HTTP/1.1 200 OK
Date: Mon, 18 Mar 2024 14:28:15 GMT
Server: Apache/2.4.52 (Ubuntu)
Content-Type: text/html; charset=UTF-8

<!DOCTYPE html>
<html>
<head><title>TechCorp Development Portal - Restricted</title></head>
<body>
    <h1>Development Environment</h1>
    <p><strong>⚠️ INTERNAL USE ONLY</strong></p>
    <ul>
        <li><a href="/admin">Admin Dashboard</a></li>
        <li><a href="/debug.php">Debug Console</a></li>
        <li><a href="/api/docs">API Documentation</a></li>
        <li><a href="/db-backup/">Database Backups</a></li>
    </ul>
    <p>Authorized personnel only. All access logged.</p>
</body>
</html>

🎯 SUCCESS: Hidden virtual host discovered!`
    },
    {
      match: /curl.*-H.*"Host:\s*staging\.techcorp\.local"/i,
      output: `HTTP/1.1 200 OK
Date: Mon, 18 Mar 2024 14:29:03 GMT
Server: Apache/2.4.52 (Ubuntu)
Content-Type: text/html; charset=UTF-8

<!DOCTYPE html>
<html>
<head><title>TechCorp Staging - User Acceptance Testing</title></head>
<body>
    <h1>Staging Environment</h1>
    <p>UAT build v2.3.1 - Last deployed: 2024-03-10</p>
    <p>Test credentials: testuser / TestPass2024!</p>
</body>
</html>

🎯 SUCCESS: Staging virtual host discovered!`
    },
    {
      match: /curl.*http:\/\/172\.16\.23\.142.*(?!-H)/i,
      output: `[Returns default homepage - no hidden content visible]

💡 HINT: Web servers can route requests to different content based on the Host header. Try testing known subdomains.`
    }
  ],
  
  expected_flow: [
    'Read nmap output - identify Apache web server on port 80',
    'Review homepage HTML - spot HTML comment mentioning staging.techcorp.local',
    'Read notes.txt - find references to dev.techcorp.local and staging.techcorp.local',
    'Recognize virtual hosting pattern',
    'Test Host header with dev.techcorp.local',
    'Discover hidden developer portal with admin links',
    'Test Host header with staging.techcorp.local',
    'Find staging environment with test credentials',
    'Document security impact',
    'Write finding about exposed internal surfaces'
  ],
  
  key_clues: [
    {
      clue: 'HTML comment: "<!-- Dev note: staging.techcorp.local ready for UAT -->"',
      why_it_matters: 'Developers often leave comments revealing internal infrastructure. This directly names a hidden virtual host.'
    },
    {
      clue: 'Notes mention dev.techcorp.local and staging.techcorp.local from OSINT',
      why_it_matters: 'External reconnaissance (job postings, documentation) can reveal internal naming conventions even when DNS is not public.'
    },
    {
      clue: 'Apache server with single IP but multiple subdomains referenced',
      why_it_matters: 'Classic pattern for virtual hosting - one web server routing to different applications based on Host header.'
    },
    {
      clue: 'Developer portal lists /admin, /debug.php, /db-backup/',
      why_it_matters: 'These are high-value targets for further exploitation - admin panels, debug interfaces, and database backups are critical exposures.'
    }
  ],
  
  common_mistakes: [
    'Only running nmap and stopping - ignoring the HTML source and notes',
    'Trying to brute-force directories on the main site instead of testing virtual hosts',
    'Not reading the HTML comments in homepage source',
    'Assuming single IP = single website',
    'Not testing discovered subdomain names with Host header manipulation',
    'Writing finding as "low severity" when admin panels and backups are exposed'
  ],
  
  hint_ladder: {
    tier_1: 'The HTML source and reconnaissance notes contain explicit references to internal subdomains. Read them carefully.',
    tier_2: 'Web servers can host multiple sites on one IP address using virtual hosting. Try manipulating the HTTP Host header to access different sites.',
    tier_3: 'Use curl -H "Host: dev.techcorp.local" http://172.16.23.142/ and curl -H "Host: staging.techcorp.local" http://172.16.23.142/ to test the discovered subdomain names.'
  },
  
  theory_cards: [
    {
      id: 'theory_vhost_basics',
      trigger: 'first_curl_attempt',
      title: 'Virtual Hosting and the Host Header',
      tabs: {
        what_is_happening: `Virtual hosting allows one web server (one IP address) to serve multiple websites or applications. The server determines which content to serve based on the HTTP Host header in the request.

When you visit http://example.com, your browser automatically sends "Host: example.com" in the HTTP request. The web server reads this header and routes you to the appropriate website.`,
        
        sec1_lens: `In a practical assessment, virtual hosting is significant because:
- Not all virtual hosts may be publicly linked or documented
- Development, staging, and admin portals often exist as separate vhosts
- Discovering hidden vhosts can reveal sensitive functionality
- HTML comments, configuration files, and OSINT often leak vhost names
- This is a common early-stage discovery in real penetration tests`,
        
        ceh_lens: `**CEH Classification**: Footprinting and Reconnaissance → Enumeration

**Attack Methodology**:
1. Footprinting: Gather subdomain names from OSINT, DNS, certificates
2. Enumeration: Test discovered names using Host header manipulation
3. Analysis: Identify sensitive/administrative virtual hosts

**Countermeasures**:
- Remove internal vhost references from public HTML comments
- Implement IP-based access restrictions for dev/staging environments
- Use authentication on all non-public virtual hosts
- Monitor for Host header scanning attempts
- Audit what information is exposed in source code`,
        
        syntax_reflex: `**Testing Virtual Hosts with curl**:

\`\`\`bash
# Default request (no custom Host header)
curl -I http://172.16.23.142/

# Test specific virtual host
curl -H "Host: dev.example.com" http://172.16.23.142/

# View full response with custom Host header
curl -H "Host: staging.example.com" http://172.16.23.142/
\`\`\`

**Flag Breakdown**:
- \`-H\`: Add custom HTTP header
- \`"Host: ..."\`: Override the Host header value
- \`http://[IP]/\`: Connect directly to IP (not DNS)

**Why This Works**:
The web server sees your custom Host header and routes the request to the corresponding virtual host configuration, even though you're connecting to the IP address directly.`
      },
      shown_after: 'discovery',
      related_nodes: ['networking_core_protocols', 'web_application_basics', 'burp_suite_basics']
    }
  ],
  
  countermeasure_mirror: {
    config_fix: `**Apache Configuration**:
Remove or restrict access to development virtual hosts:

\`\`\`apache
<VirtualHost *:80>
    ServerName dev.techcorp.local
    DocumentRoot /var/www/dev
    
    # IP-based access restriction
    <Directory /var/www/dev>
        Require ip 10.0.0.0/8
        Require ip 172.16.0.0/12
    </Directory>
</VirtualHost>
\`\`\`

Or remove the virtual host entirely from public-facing servers.`,
    
    detection_angle: `**Detection Methods**:
- Web application firewall (WAF) logs showing Host header variations
- Apache access logs: unusual Host header values
- SIEM rule: Multiple Host headers tested from single source IP
- Intrusion detection signature: vhost enumeration patterns

**Log Example**:
\`\`\`
172.16.23.142 - - [18/Mar/2024:14:28:15] "GET / HTTP/1.1" 200 - "-" "curl/7.81.0" Host: dev.techcorp.local
172.16.23.142 - - [18/Mar/2024:14:29:03] "GET / HTTP/1.1" 200 - "-" "curl/7.81.0" Host: staging.techcorp.local
\`\`\``,
    
    logging_angle: `**Logging Recommendations**:
1. Log full HTTP headers, not just URI
2. Alert on requests to development virtual hosts from external IPs
3. Track Host header enumeration patterns (multiple different Host values)
4. Monitor access to sensitive paths (/admin, /debug, /backup) on any vhost
5. Correlate with authentication failures or successful admin access`,
    
    hardening_angle: `**Defense-in-Depth Layers**:
1. **Preventive**: Remove dev/staging vhosts from public servers
2. **Preventive**: Implement IP whitelisting for administrative vhosts
3. **Preventive**: Require authentication on all non-public surfaces
4. **Detective**: Log and alert on Host header anomalies
5. **Detective**: Monitor for directory enumeration after vhost discovery
6. **Corrective**: Automated response to block enumeration sources
7. **Deterrent**: Legal notices on restricted access pages`,
    
    remediation_wording: `**Recommended Remediation**:

**Immediate (Critical)**:
1. Remove development and staging virtual hosts from the public-facing web server
2. Implement IP-based access controls restricting dev/staging to internal networks only
3. Remove HTML comments referencing internal infrastructure

**Short-term (High)**:
4. Audit all virtual host configurations for unnecessary exposure
5. Implement mandatory authentication on administrative virtual hosts
6. Review and sanitize all HTML source code for information leakage

**Long-term (Medium)**:
7. Establish secure development infrastructure separate from production
8. Implement automated scanning for information disclosure in source code
9. Deploy web application firewall (WAF) to detect Host header manipulation
10. Train developers on secure coding practices regarding comments and information disclosure`
  },
  
  reporting_task: {
    required_fields: [
      'title',
      'severity',
      'description',
      'impact',
      'evidence',
      'reproduction_steps',
      'remediation'
    ],
    optional_fields: [
      'cvss_score',
      'affected_assets',
      'analyst_reflection'
    ]
  },
  
  expected_finding: {
    title: 'Exposed Development Virtual Hosts and Sensitive Functionality',
    severity: 'high',
    description: `The web server at 172.16.23.142 hosts multiple virtual hosts, including development and staging environments that are accessible from the external network. The development virtual host (dev.techcorp.local) exposes administrative interfaces, debug consoles, API documentation, and database backup directories. The staging environment (staging.techcorp.local) contains test credentials in plain text.`,
    impact: `An external attacker can access internal development and staging environments that should be restricted to authorized personnel. The exposed surfaces include:
- Administrative dashboards that may allow privileged actions
- Debug consoles that could reveal source code, configuration, or enable code execution
- Database backup directories that may contain sensitive data dumps
- Plain-text test credentials that could be reused on other systems

This exposure significantly increases the attack surface and provides multiple potential paths for initial access, privilege escalation, or data exfiltration.`,
    evidence: [
      'HTML comment in homepage source: "<!-- Dev note: staging.techcorp.local ready for UAT -->"',
      'Virtual host dev.techcorp.local accessible with custom Host header',
      'Virtual host staging.techcorp.local accessible with custom Host header',
      'Development portal lists /admin, /debug.php, /api/docs, /db-backup/ endpoints',
      'Staging environment displays test credentials: testuser / TestPass2024!'
    ],
    reproduction_steps: [
      '1. Access http://172.16.23.142/ normally - observe standard corporate homepage',
      '2. Review HTML source and identify staging.techcorp.local reference in comment',
      '3. Execute: curl -H "Host: dev.techcorp.local" http://172.16.23.142/',
      '4. Observe development portal with links to /admin, /debug.php, /db-backup/',
      '5. Execute: curl -H "Host: staging.techcorp.local" http://172.16.23.142/',
      '6. Observe staging environment with exposed test credentials'
    ],
    remediation: `**Immediate Actions**:
1. Remove development and staging virtual hosts from public-facing server immediately
2. Implement IP-based access restrictions limiting dev/staging to internal networks (10.0.0.0/8, 172.16.0.0/12)
3. Remove HTML comments referencing internal infrastructure
4. Rotate test credentials and audit for reuse on production systems

**Long-term Improvements**:
5. Establish physically or logically separate infrastructure for development/staging
6. Require authentication for all administrative and development interfaces
7. Implement automated source code scanning to detect information disclosure
8. Deploy web application firewall to detect Host header manipulation attempts
9. Audit all virtual host configurations quarterly for unnecessary exposure`
  },
  
  knowledge_check: [
    {
      question: 'In the context of web enumeration, what is the primary purpose of the HTTP Host header?',
      options: [
        'To encrypt the connection between client and server',
        'To tell the web server which virtual host to serve content from',
        'To authenticate the user making the request',
        'To specify the port number for the connection'
      ],
      correct_answer: 1,
      explanation: 'The Host header tells the web server which virtual host (website) to serve, allowing multiple sites to share one IP address. This is fundamental to virtual hosting.',
      ceh_module: 'enumeration'
    },
    {
      question: 'Which phase of the CEH methodology does virtual host enumeration belong to?',
      options: [
        'Reconnaissance and Footprinting',
        'Enumeration',
        'Vulnerability Analysis',
        'System Hacking'
      ],
      correct_answer: 1,
      explanation: 'Virtual host enumeration is part of the Enumeration phase, where attackers extract detailed information about services and systems. Footprinting gathers initial information, while enumeration digs deeper into discovered services.',
      ceh_module: 'enumeration'
    },
    {
      question: 'What is the most effective countermeasure to prevent unauthorized access to development virtual hosts?',
      options: [
        'Using longer, more complex passwords',
        'Implementing IP-based access restrictions and removing vhosts from public servers',
        'Enabling HTTPS for all connections',
        'Installing antivirus software on the web server'
      ],
      correct_answer: 1,
      explanation: 'IP-based access restrictions ensure that development virtual hosts are only accessible from trusted internal networks. The best solution is to remove them from public-facing servers entirely. HTTPS and passwords are useful but don\'t prevent discovery of the vhost itself.',
      ceh_module: 'ids_firewall_evasion'
    },
    {
      question: 'Why might an attacker find exposed staging or development environments particularly valuable?',
      options: [
        'They typically have stronger security controls than production',
        'They often contain debug interfaces, test credentials, and less hardening than production',
        'They cannot be monitored by security tools',
        'They are always connected directly to databases'
      ],
      correct_answer: 1,
      explanation: 'Development and staging environments are often less hardened than production, may contain debug interfaces, test credentials, verbose error messages, and backup files. They\'re valuable targets because security is often relaxed for developer convenience.',
      ceh_module: 'hacking_web_applications'
    },
    {
      question: 'What security control category does IP-based access restriction fall under in the context of defense-in-depth?',
      options: [
        'Detective control',
        'Corrective control',
        'Preventive control',
        'Deterrent control'
      ],
      correct_answer: 2,
      explanation: 'IP-based access restrictions are preventive controls - they prevent unauthorized access before it occurs. Detective controls identify incidents after they happen, corrective controls remediate after detection, and deterrent controls discourage attacks.',
      ceh_module: 'ids_firewall_evasion'
    }
  ],
  
  scoring_rubric: {
    completion: 25,
    methodology: 20,
    signal_recognition: 15,
    efficiency: 10,
    reporting: 20,
    theory_understanding: 5,
    reflection: 5
  },
  
  variations: [
    {
      description: 'Admin panel variation',
      changes: {
        'dev.techcorp.local': 'admin.techcorp.local',
        'Development Portal': 'Administrator Portal',
        'debug.php': 'phpinfo.php',
        'db-backup/': 'backups/'
      }
    },
    {
      description: 'API-focused variation',
      changes: {
        'dev.techcorp.local': 'api.techcorp.local',
        'Development Portal': 'API Gateway',
        'admin': 'swagger-ui',
        'debug.php': 'api/v1/debug',
        'db-backup/': 'api/export/'
      }
    },
    {
      description: 'Testing infrastructure variation',
      changes: {
        'dev.techcorp.local': 'test.techcorp.local',
        'Development': 'Testing',
        'staging.techcorp.local': 'qa.techcorp.local',
        'UAT': 'Quality Assurance',
        'testuser': 'qauser',
        'TestPass2024!': 'QApass2024!'
      }
    }
  ],
  
  implementation_notes: {
    trigger_conditions: [
      'User views homepage.html and spots HTML comment',
      'User reads notes.txt with OSINT references',
      'User recognizes virtual hosting pattern',
      'User attempts Host header manipulation'
    ],
    state_changes: {
      vhost_discovered: false,
      admin_panel_found: false,
      credentials_found: false
    },
    command_mappings: {
      'curl -H "Host: dev.techcorp.local"': 'discover_dev_vhost',
      'curl -H "Host: staging.techcorp.local"': 'discover_staging_vhost',
      'grep -i staging': 'find_clue_references'
    },
    completion_criteria: [
      'Both virtual hosts discovered (dev and staging)',
      'Security impact articulated in finding',
      'Evidence listed with reproduction steps',
      'Remediation addresses both immediate and long-term actions'
    ],
    recovery_drill_recommendation: 'http_fundamentals_recovery'
  }
};
