import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { table } from '@devvai/devv-code-backend';

interface ProgressState {
  modulesCompleted: number;
  labsCompleted: number;
  drillsPracticed: number;
  sec0Readiness: number;
  sec1Readiness: number;
  pt1Readiness: number;
  totalTrainingHours: number;
  dailyStreak: number;
  lastTrainingDate: string | null;
  
  // Performance tracking
  totalAttempts: number; // Total drills/labs/modules attempted
  successfulAttempts: number; // Successfully completed
  todayTrainingHours: number; // Training hours today
  lastSessionDate: string | null; // Date of last training session
  
  // Burnout protection
  burnoutThreshold: number; // Hours per day threshold (default: 6)
  isAtRisk: boolean; // Flag for overtraining
  performanceModifier: number; // 0.0 - 1.0 multiplier based on success rate
  
  // Database sync
  isLoading: boolean;
  isSynced: boolean;
  
  // Actions
  updateProgress: (updates: Partial<ProgressState>) => void;
  incrementDrills: (success?: boolean) => void;
  incrementModules: (success?: boolean) => void;
  incrementLabs: (success?: boolean) => void;
  addTrainingHours: (hours: number) => void;
  updateStreak: () => void;
  calculateReadiness: () => void;
  checkBurnoutRisk: () => void;
  loadFromDatabase: () => Promise<void>;
  syncToDatabase: () => Promise<void>;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      modulesCompleted: 0,
      labsCompleted: 0,
      drillsPracticed: 0,
      sec0Readiness: 0,
      sec1Readiness: 0,
      pt1Readiness: 0,
      totalTrainingHours: 0,
      dailyStreak: 0,
      lastTrainingDate: null,
      
      // Performance tracking
      totalAttempts: 0,
      successfulAttempts: 0,
      todayTrainingHours: 0,
      lastSessionDate: null,
      
      // Burnout protection
      burnoutThreshold: 6,
      isAtRisk: false,
      performanceModifier: 1.0,
      
      // Database sync
      isLoading: false,
      isSynced: false,

      updateProgress: (updates) => {
        set(updates);
        get().syncToDatabase().catch(console.error);
      },

      incrementDrills: (success = true) => {
        const state = get();
        set({
          drillsPracticed: state.drillsPracticed + 1,
          totalAttempts: state.totalAttempts + 1,
          successfulAttempts: success ? state.successfulAttempts + 1 : state.successfulAttempts,
        });
        get().updateStreak();
        get().calculateReadiness();
        get().syncToDatabase().catch(console.error);
      },

      incrementModules: (success = true) => {
        const state = get();
        set({
          modulesCompleted: state.modulesCompleted + 1,
          totalAttempts: state.totalAttempts + 1,
          successfulAttempts: success ? state.successfulAttempts + 1 : state.successfulAttempts,
        });
        get().updateStreak();
        get().calculateReadiness();
        get().syncToDatabase().catch(console.error);
      },

      incrementLabs: (success = true) => {
        const state = get();
        set({
          labsCompleted: state.labsCompleted + 1,
          totalAttempts: state.totalAttempts + 1,
          successfulAttempts: success ? state.successfulAttempts + 1 : state.successfulAttempts,
        });
        get().updateStreak();
        get().calculateReadiness();
        get().syncToDatabase().catch(console.error);
      },

      addTrainingHours: (hours) => {
        const today = new Date().toISOString().split('T')[0];
        const state = get();
        
        // Reset daily hours if new day
        const todayHours = state.lastSessionDate === today 
          ? state.todayTrainingHours + hours 
          : hours;
        
        set({
          totalTrainingHours: state.totalTrainingHours + hours,
          todayTrainingHours: todayHours,
          lastSessionDate: today,
        });
        
        get().checkBurnoutRisk();
        get().updateStreak();
        get().syncToDatabase().catch(console.error);
      },

      updateStreak: () => {
        const today = new Date().toISOString().split('T')[0];
        const last = get().lastTrainingDate;
        
        if (!last) {
          set({ dailyStreak: 1, lastTrainingDate: today });
          return;
        }

        const lastDate = new Date(last);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          set((state) => ({
            dailyStreak: state.dailyStreak + 1,
            lastTrainingDate: today,
          }));
        } else if (diffDays === 0) {
          // Same day, update date only
          set({ lastTrainingDate: today });
        } else {
          // Streak broken
          set({ dailyStreak: 1, lastTrainingDate: today });
        }
      },

      // Calculate certification readiness with performance modifier and burnout protection
      calculateReadiness: () => {
        const state = get();
        
        // Base readiness formula
        const rawScore = 
          (state.modulesCompleted * 10) + 
          (state.labsCompleted * 5) + 
          (state.drillsPracticed * 1) + 
          (state.totalTrainingHours * 2);
        
        // Calculate success rate (performance modifier)
        const successRate = state.totalAttempts > 0 
          ? state.successfulAttempts / state.totalAttempts 
          : 1.0;
        
        // Apply performance modifier (70% old, 30% new for smooth transitions)
        const newModifier = (state.performanceModifier * 0.7) + (successRate * 0.3);
        
        // Apply burnout cap - if overtraining, cap gains at 80% effectiveness
        const burnoutMultiplier = state.isAtRisk ? 0.8 : 1.0;
        
        // Final score with modifiers
        const modifiedScore = rawScore * newModifier * burnoutMultiplier;
        
        // Normalize to 0-100 scale (assume 1000 raw points = 100%)
        const normalizedScore = Math.min(100, Math.round((modifiedScore / 1000) * 100));
        
        // Calculate tiered readiness for different certifications
        // CORRECTED LOGIC: SEC0 (beginner) is EASIEST, PT1 (advanced) is HARDEST
        // SEC0 should show HIGHER percentages (more achievable)
        // PT1 should show LOWER percentages (more demanding)
        const pt1Readiness = normalizedScore; // Most demanding (1:1)
        const sec1Readiness = Math.min(100, Math.round(normalizedScore * 1.4)); // Intermediate (40% easier)
        const sec0Readiness = Math.min(100, Math.round(normalizedScore * 2.0)); // Beginner (2x easier)
        
        set({
          pt1Readiness,
          sec1Readiness,
          sec0Readiness,
          performanceModifier: newModifier,
        });
      },
      
      // Check for burnout risk
      checkBurnoutRisk: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        
        // Reset daily hours if new day
        if (state.lastSessionDate !== today) {
          set({ todayTrainingHours: 0, isAtRisk: false });
          return;
        }
        
        // Check if exceeding threshold
        const isAtRisk = state.todayTrainingHours > state.burnoutThreshold;
        set({ isAtRisk });
      },
      
      // Load progress from database
      loadFromDatabase: async () => {
        set({ isLoading: true });
        try {
          const response = await table.getItems('ff3csua8ncow'); // user_progress table
          
          // Sort by last_updated to get most recent
          const items = response?.items?.sort((a: any, b: any) => {
            const dateA = new Date(a.last_updated || a._created_at || 0).getTime();
            const dateB = new Date(b.last_updated || b._created_at || 0).getTime();
            return dateB - dateA;
          });
          
          if (items && items.length > 0) {
            const latest = items[0];
            
            set({
              modulesCompleted: latest.modules_completed || 0,
              labsCompleted: latest.labs_completed || 0,
              drillsPracticed: latest.drills_practiced || 0,
              totalTrainingHours: latest.total_training_hours || 0,
              totalAttempts: latest.total_attempts || 0,
              successfulAttempts: latest.successful_attempts || 0,
              todayTrainingHours: latest.today_training_hours || 0,
              lastSessionDate: latest.last_session_date || null,
              dailyStreak: latest.daily_streak || 0,
              lastTrainingDate: latest.last_training_date || null,
              performanceModifier: latest.performance_modifier || 1.0,
              isAtRisk: latest.is_at_risk || false,
              sec0Readiness: latest.sec0_readiness || 0,
              sec1Readiness: latest.sec1_readiness || 0,
              pt1Readiness: latest.pt1_readiness || 0,
              isSynced: true,
            });
            
            console.log('[ProgressStore] Loaded from database:', {
              drills: latest.drills_practiced,
              modules: latest.modules_completed,
              labs: latest.labs_completed,
            });
          }
        } catch (error) {
          console.error('[ProgressStore] Failed to load from database:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      // Sync progress to database
      syncToDatabase: async () => {
        const state = get();
        
        try {
          await table.addItem('ff3csua8ncow', {
            modules_completed: state.modulesCompleted,
            labs_completed: state.labsCompleted,
            drills_practiced: state.drillsPracticed,
            total_training_hours: state.totalTrainingHours,
            total_attempts: state.totalAttempts,
            successful_attempts: state.successfulAttempts,
            today_training_hours: state.todayTrainingHours,
            last_session_date: state.lastSessionDate,
            daily_streak: state.dailyStreak,
            last_training_date: state.lastTrainingDate,
            performance_modifier: state.performanceModifier,
            is_at_risk: state.isAtRisk,
            sec0_readiness: state.sec0Readiness,
            sec1_readiness: state.sec1Readiness,
            pt1_readiness: state.pt1Readiness,
            last_updated: new Date().toISOString(),
          });
          
          set({ isSynced: true });
          
          console.log('[ProgressStore] Synced to database:', {
            drills: state.drillsPracticed,
            modules: state.modulesCompleted,
            labs: state.labsCompleted,
          });
        } catch (error) {
          console.error('[ProgressStore] Failed to sync to database:', error);
          set({ isSynced: false });
        }
      },

      resetProgress: async () => {
        // Reset all state to zero
        set({
          modulesCompleted: 0,
          labsCompleted: 0,
          drillsPracticed: 0,
          sec0Readiness: 0,
          sec1Readiness: 0,
          pt1Readiness: 0,
          totalTrainingHours: 0,
          dailyStreak: 0,
          lastTrainingDate: null,
          totalAttempts: 0,
          successfulAttempts: 0,
          todayTrainingHours: 0,
          lastSessionDate: null,
          performanceModifier: 1.0,
          isAtRisk: false,
          isSynced: false,
        });
        
        // Sync to database to persist reset
        await get().syncToDatabase();
        
        // Clear localStorage
        localStorage.removeItem('seshforge-progress');
        
        console.log('[ProgressStore] Complete reset executed');
      },
    }),
    {
      name: 'seshforge-progress',
    }
  )
);
