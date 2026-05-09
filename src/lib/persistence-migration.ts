/**
 * Persistence Migration System - Phase 1A Critical Bug Fix
 * 
 * Purpose: Eliminate ghost drill data contamination and ensure clean slate
 * 
 * Problem: Stale persisted drill data inflating stats
 * Solution: Versioned migration system with hard reset capability
 */

const CURRENT_PERSISTENCE_VERSION = 2;
const VERSION_KEY = 'seshforge-version';

export interface MigrationResult {
  success: boolean;
  migratedFrom: number | null;
  migratedTo: number;
  message: string;
}

/**
 * Hard delete all existing persisted state
 * WARNING: This is destructive and cannot be undone
 */
export function clearAllPersistedData(): void {
  const keysToRemove = [
    'seshforge-progress',
    'seshforge-drill-sessions',
    'seshforge-decision-engine',
    'seshforge-auth',
    'seshforge-certification',
    VERSION_KEY,
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`[Migration] Cleared: ${key}`);
    } catch (error) {
      console.error(`[Migration] Failed to clear ${key}:`, error);
    }
  });
  
  console.log('[Migration] All persisted data cleared - clean slate achieved');
}

/**
 * Check if migration is needed
 */
export function needsMigration(): boolean {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  
  if (!storedVersion) {
    // First time user OR user with pre-version data
    return hasLegacyData();
  }
  
  const version = parseInt(storedVersion, 10);
  return isNaN(version) || version < CURRENT_PERSISTENCE_VERSION;
}

/**
 * Check if legacy (pre-version) data exists
 */
function hasLegacyData(): boolean {
  // Check if any of the old stores exist
  const legacyKeys = [
    'seshforge-progress',
    'seshforge-drill-sessions',
    'seshforge-certification',
  ];
  
  return legacyKeys.some(key => localStorage.getItem(key) !== null);
}

/**
 * Execute migration from old version to current version
 */
export function migrate(): MigrationResult {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  const oldVersion = storedVersion ? parseInt(storedVersion, 10) : 0;
  
  console.log(`[Migration] Starting migration from v${oldVersion} to v${CURRENT_PERSISTENCE_VERSION}`);
  
  try {
    // Version 0 → 1: Initial migration (clean slate for ghost drill removal)
    if (oldVersion < 1) {
      console.log('[Migration] Executing v0 → v1: Ghost drill removal');
      clearAllPersistedData();
    }
    
    // Version 1 → 2: Enhanced clean slate (if needed for future)
    if (oldVersion < 2) {
      console.log('[Migration] Executing v1 → v2: Evidence-based scoring alignment');
      // For now, v2 just ensures baselines are not displayed
      // This is handled in the stores themselves, no data migration needed
    }
    
    // Set current version
    localStorage.setItem(VERSION_KEY, CURRENT_PERSISTENCE_VERSION.toString());
    
    return {
      success: true,
      migratedFrom: oldVersion,
      migratedTo: CURRENT_PERSISTENCE_VERSION,
      message: `Migration successful: v${oldVersion} → v${CURRENT_PERSISTENCE_VERSION}`,
    };
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    
    return {
      success: false,
      migratedFrom: oldVersion,
      migratedTo: oldVersion,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Force a clean slate reset (admin/debug function)
 * Use with caution - this wipes ALL training data
 */
export function forceCleanSlate(): MigrationResult {
  console.warn('[Migration] FORCE CLEAN SLATE - ALL DATA WILL BE DELETED');
  
  try {
    clearAllPersistedData();
    localStorage.setItem(VERSION_KEY, CURRENT_PERSISTENCE_VERSION.toString());
    
    return {
      success: true,
      migratedFrom: null,
      migratedTo: CURRENT_PERSISTENCE_VERSION,
      message: 'Force clean slate completed - all data erased',
    };
  } catch (error) {
    console.error('[Migration] Force clean slate failed:', error);
    
    return {
      success: false,
      migratedFrom: null,
      migratedTo: CURRENT_PERSISTENCE_VERSION,
      message: `Force clean slate failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get current persistence version
 */
export function getCurrentVersion(): number {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  return storedVersion ? parseInt(storedVersion, 10) : 0;
}

/**
 * Initialize persistence system on app load
 * Call this in main.tsx or App.tsx
 */
export function initializePersistence(): MigrationResult {
  console.log('[Persistence] Initializing persistence system');
  
  if (needsMigration()) {
    console.log('[Persistence] Migration needed - executing...');
    const result = migrate();
    
    if (result.success) {
      console.log(`[Persistence] ${result.message}`);
    } else {
      console.error(`[Persistence] ${result.message}`);
    }
    
    return result;
  }
  
  console.log(`[Persistence] No migration needed - current version: v${CURRENT_PERSISTENCE_VERSION}`);
  
  return {
    success: true,
    migratedFrom: CURRENT_PERSISTENCE_VERSION,
    migratedTo: CURRENT_PERSISTENCE_VERSION,
    message: 'No migration needed',
  };
}

/**
 * Export for admin/debug console access
 */
if (typeof window !== 'undefined') {
  (window as any).__seshforge_persistence = {
    getCurrentVersion,
    needsMigration,
    migrate,
    forceCleanSlate,
    clearAllPersistedData,
  };
  
  console.log('[Persistence] Admin functions available at: window.__seshforge_persistence');
}
