/**
 * CONTEXT-AWARE DIRECTORY GENERATION ENGINE
 * 
 * Eliminates low-effort enumeration patterns (/backup, /admin, /test)
 * Generates directories based on:
 * - Technology stack detected
 * - Application context
 * - Real-world misconfigurations
 */

export interface TechnologyStack {
  webServer?: 'apache' | 'nginx' | 'iis' | 'tomcat' | 'jetty';
  framework?: 'wordpress' | 'laravel' | 'express' | 'django' | 'flask' | 'rails' | 'spring';
  cms?: 'wordpress' | 'joomla' | 'drupal' | 'custom';
  language?: 'php' | 'python' | 'node' | 'java' | 'ruby' | 'asp.net';
  database?: 'mysql' | 'postgresql' | 'mongodb' | 'mssql';
}

export interface DirectoryGenerationContext {
  stack: TechnologyStack;
  headers: Record<string, string>;
  htmlComments: string[];
  jsFiles: string[];
  errorMessages: string[];
}

// FORBIDDEN LOW-EFFORT DIRECTORIES
const FORBIDDEN_GENERIC = [
  '/backup',
  '/old',
  '/test',
  '/dev',
  '/admin',
  '/temp',
  '/tmp',
  '/.git', // Unless framework-specific
];

/**
 * WordPress-specific realistic directories
 */
const WORDPRESS_DIRECTORIES = [
  '/wp-content/uploads/2023/',
  '/wp-content/uploads/2024/',
  '/wp-content/themes/twentytwentythree/',
  '/wp-content/plugins/contact-form-7/',
  '/wp-json/wp/v2/users',
  '/xmlrpc.php',
  '/wp-admin/admin-ajax.php',
  '/wp-includes/js/',
  '/.wp-config.php.swp', // Backup file from vim
  '/wp-content/debug.log',
];

/**
 * Tomcat-specific realistic directories
 */
const TOMCAT_DIRECTORIES = [
  '/manager/html',
  '/host-manager/html',
  '/manager/text',
  '/docs/api/',
  '/examples/servlets/',
  '/WEB-INF/web.xml', // Via LFI or misconfig
  '/META-INF/context.xml',
  '/.war', // Backup deployment
  '/status/',
];

/**
 * Laravel/PHP Framework directories
 */
const LARAVEL_DIRECTORIES = [
  '/api/v1/internal/',
  '/api/v2/admin/',
  '/.env',
  '/.env.backup',
  '/storage/logs/',
  '/storage/app/public/',
  '/vendor/composer/',
  '/public/uploads/',
  '/config/database.php',
];

/**
 * Django/Flask Python directories
 */
const PYTHON_DIRECTORIES = [
  '/api/v1/internal/',
  '/admin/debug/',
  '/static/js/bundle.js',
  '/media/uploads/',
  '/.env',
  '/requirements.txt',
  '/debug/logs/',
  '/exports/users.csv',
  '/auth/reset',
];

/**
 * Express/Node.js directories
 */
const NODE_DIRECTORIES = [
  '/api/v1/internal/',
  '/api/graphql',
  '/debug/logs/',
  '/.env',
  '/package.json',
  '/node_modules/.bin/',
  '/uploads/',
  '/public/js/bundle.js',
];

/**
 * Custom application directories (context-derived)
 */
const CUSTOM_APP_DIRECTORIES = [
  '/api/v1/users/',
  '/api/v2/admin/',
  '/debug/logs/',
  '/exports/data.csv',
  '/auth/reset?token=',
  '/internal/docs/',
  '/developer/api/',
  '/config.json',
  '/settings.php',
];

/**
 * Backup directories (ONLY if contextually justified)
 */
function generateContextualBackups(stack: TechnologyStack): string[] {
  const backups: string[] = [];
  
  if (stack.database === 'mysql') {
    backups.push(
      '/db_backup_2024.sql',
      '/database_dump.sql.gz',
      '/mysqldump_latest.sql'
    );
  }
  
  if (stack.framework === 'wordpress') {
    backups.push(
      '/wp-config.php.bak',
      '/wp-config.php~',
      '/wp-config.old.php'
    );
  }
  
  if (stack.language === 'php') {
    backups.push(
      '/config.php.bak',
      '/settings.php.old',
      '/db_config.php~'
    );
  }
  
  if (stack.webServer === 'apache' || stack.webServer === 'nginx') {
    backups.push(
      '/site.tar.gz',
      '/website_backup.zip',
      '/public_html.tar'
    );
  }
  
  return backups;
}

/**
 * Detect technology stack from context clues
 */
export function detectTechnologyStack(context: DirectoryGenerationContext): TechnologyStack {
  const stack: TechnologyStack = {};
  
  // Detect web server
  const serverHeader = context.headers['server']?.toLowerCase() || '';
  if (serverHeader.includes('apache')) stack.webServer = 'apache';
  else if (serverHeader.includes('nginx')) stack.webServer = 'nginx';
  else if (serverHeader.includes('iis')) stack.webServer = 'iis';
  else if (serverHeader.includes('tomcat')) stack.webServer = 'tomcat';
  
  // Detect framework from headers
  const xPoweredBy = context.headers['x-powered-by']?.toLowerCase() || '';
  if (xPoweredBy.includes('php')) stack.language = 'php';
  else if (xPoweredBy.includes('express')) {
    stack.framework = 'express';
    stack.language = 'node';
  }
  
  // Detect from HTML comments
  const commentsStr = context.htmlComments.join(' ').toLowerCase();
  if (commentsStr.includes('wordpress')) {
    stack.cms = 'wordpress';
    stack.framework = 'wordpress';
  }
  
  // Detect from JS files
  for (const jsFile of context.jsFiles) {
    if (jsFile.includes('wp-includes')) {
      stack.cms = 'wordpress';
      stack.framework = 'wordpress';
    }
    if (jsFile.includes('laravel')) stack.framework = 'laravel';
    if (jsFile.includes('django')) stack.framework = 'django';
  }
  
  // Detect from error messages
  for (const error of context.errorMessages) {
    if (error.includes('WordPress')) stack.cms = 'wordpress';
    if (error.includes('Laravel')) stack.framework = 'laravel';
    if (error.includes('Tomcat')) stack.webServer = 'tomcat';
    if (error.includes('Django')) stack.framework = 'django';
  }
  
  return stack;
}

/**
 * Generate realistic directories based on detected stack
 */
export function generateContextAwareDirectories(
  context: DirectoryGenerationContext,
  count: number = 10
): string[] {
  const stack = detectTechnologyStack(context);
  const directories: string[] = [];
  
  console.log('[DirectoryGen] Detected stack:', stack);
  
  // WordPress-specific
  if (stack.cms === 'wordpress' || stack.framework === 'wordpress') {
    const wpDirs = [...WORDPRESS_DIRECTORIES];
    while (directories.length < count && wpDirs.length > 0) {
      const randomIndex = Math.floor(Math.random() * wpDirs.length);
      directories.push(wpDirs.splice(randomIndex, 1)[0]);
    }
  }
  
  // Tomcat-specific
  else if (stack.webServer === 'tomcat') {
    const tomcatDirs = [...TOMCAT_DIRECTORIES];
    while (directories.length < count && tomcatDirs.length > 0) {
      const randomIndex = Math.floor(Math.random() * tomcatDirs.length);
      directories.push(tomcatDirs.splice(randomIndex, 1)[0]);
    }
  }
  
  // Laravel-specific
  else if (stack.framework === 'laravel') {
    const laravelDirs = [...LARAVEL_DIRECTORIES];
    while (directories.length < count && laravelDirs.length > 0) {
      const randomIndex = Math.floor(Math.random() * laravelDirs.length);
      directories.push(laravelDirs.splice(randomIndex, 1)[0]);
    }
  }
  
  // Django/Flask
  else if (stack.framework === 'django' || stack.framework === 'flask') {
    const pythonDirs = [...PYTHON_DIRECTORIES];
    while (directories.length < count && pythonDirs.length > 0) {
      const randomIndex = Math.floor(Math.random() * pythonDirs.length);
      directories.push(pythonDirs.splice(randomIndex, 1)[0]);
    }
  }
  
  // Express/Node
  else if (stack.framework === 'express' || stack.language === 'node') {
    const nodeDirs = [...NODE_DIRECTORIES];
    while (directories.length < count && nodeDirs.length > 0) {
      const randomIndex = Math.floor(Math.random() * nodeDirs.length);
      directories.push(nodeDirs.splice(randomIndex, 1)[0]);
    }
  }
  
  // Custom app (fallback)
  else {
    const customDirs = [...CUSTOM_APP_DIRECTORIES];
    while (directories.length < count && customDirs.length > 0) {
      const randomIndex = Math.floor(Math.random() * customDirs.length);
      directories.push(customDirs.splice(randomIndex, 1)[0]);
    }
  }
  
  // Add contextual backups (2-3 max)
  const contextualBackups = generateContextualBackups(stack);
  const numBackups = Math.min(2, Math.floor(Math.random() * 3));
  for (let i = 0; i < numBackups && contextualBackups.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * contextualBackups.length);
    directories.push(contextualBackups.splice(randomIndex, 1)[0]);
  }
  
  // Validate no forbidden generic directories
  const filtered = directories.filter(dir => {
    for (const forbidden of FORBIDDEN_GENERIC) {
      if (dir === forbidden) {
        console.warn(`[DirectoryGen] REJECTED forbidden directory: ${dir}`);
        return false;
      }
    }
    return true;
  });
  
  console.log(`[DirectoryGen] Generated ${filtered.length} context-aware directories`);
  return filtered.slice(0, count);
}

/**
 * Format directory list for AI prompt inclusion
 */
export function formatDirectoriesForPrompt(directories: string[]): string {
  return directories.map(dir => `- ${dir}`).join('\n');
}

/**
 * Validate that no generic fallback directories exist
 */
export function validateNoGenericDirectories(directories: string[]): boolean {
  for (const dir of directories) {
    for (const forbidden of FORBIDDEN_GENERIC) {
      if (dir === forbidden) return false;
    }
  }
  return true;
}
