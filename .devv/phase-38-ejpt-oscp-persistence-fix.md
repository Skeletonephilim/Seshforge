# Phase 38: eJPT/OSCP Readiness Persistence Fix - Calculate & Update All Certifications

## Critical Bug Identified

**User Report**: "*eJPT and OSCP readiness reset to baseline after every refresh. Imported writeups don't affect these certifications persistently.*"

**Root Cause Discovered**: 
- **Lines 506-645**: PT1 readiness IS calculated in `updateAfterSimulation()`
- **Line 1079**: ONLY `pt1_readiness` is added to `newState` 
- **MISSING**: `ejpt_readiness` and `oscp_readiness` calculations and updates
- **Result**: eJPT/OSCP remain at default baseline values FOREVER

## Persistence Architecture (Confirmed Working)

**Three-Layer Persistence** (verified at lines 375-484):

**Layer 1**: Zustand Persist (`seshforge-certification` localStorage)
- **Loads** ejpt_readiness/oscp_readiness from DB (line 427-429) ✅
- **Saves** ejpt_readiness/oscp_readiness to DB (line 463-465) ✅

**Layer 2**: Database Sync (table `ff424lkp8n40`)
- **Stores** ejpt_readiness/oscp_readiness as JSON strings ✅

**Layer 3**: Component Display
- **Reads** `certStore.ejpt_readiness.weighted_score` (HomePage.tsx line 683) ✅
- **Reads** `certStore.oscp_readiness.weighted_score` (HomePage.tsx line 684) ✅

**Persistence Works** - The problem is NOT persistence, it's **calculation**!

## The Missing Calculations

**What Exists**:
```typescript
// Lines 506-645: PT1 calculation
const updatedPT1Readiness: PT1Readiness = { ... };

// Line 1079: Only PT1 updated
const newState = {
  pt1_readiness: updatedPT1Readiness,  // ✅ Calculated
  ejpt_readiness: ???,                  // ❌ MISSING!
  oscp_readiness: ???,                  // ❌ MISSING!
  // ...
};
```

**What's Needed**:
```typescript
// Calculate eJPT readiness (1.3x difficulty multiplier)
const updatedEJPTReadiness: EJPTReadiness = calculateEJPTReadiness(
  state, evaluation, difficulty, domains_practiced, discovered_info
);

// Calculate OSCP readiness (0.6x difficulty multiplier)
const updatedOSCPReadiness: OSCPReadiness = calculateOSCPReadiness(
  state, evaluation, difficulty, domains_practiced, discovered_info
);

// Line 1079: Update ALL certifications
const newState = {
  ejpt_readiness: updatedEJPTReadiness,  // ✅ NOW CALCULATED
  pt1_readiness: updatedPT1Readiness,    // ✅ Already working
  oscp_readiness: updatedOSCPReadiness,  // ✅ NOW CALCULATED
  // ...
};
```

## Solution Implementation

### Step 1: eJPT Calculation (Foundational - 1.3x Multiplier)

**Section Mapping**:
- `web_application_basics` (40%): web_exploitation, enumeration
- `network_enumeration` (60%): reconnaissance, enumeration, network_exploitation

**Evidence Bonuses** (HIGHER than PT1 due to 1.3x multiplier):
- Services: +4 per service (vs +3 PT1)
- Ports: +3 per port (vs +2 PT1)
- Directories: +3 per directory (vs +2 PT1)
- Credentials: +4 per credential (vs +3 PT1)

**Pass Threshold**: 60% (more forgiving than PT1's 70%)

### Step 2: OSCP Calculation (Advanced - 0.6x Multiplier)

**Section Mapping**:
- `initial_access` (30%): web_exploitation, network_exploitation
- `exploitation` (30%): exploitation, network_exploitation
- `privilege_escalation` (25%): privilege_escalation, lateral_movement
- `advanced_methodology` (15%): post_exploitation, methodology

**Evidence Bonuses** (LOWER than PT1 due to 0.6x multiplier):
- Services: +2 per service (vs +3 PT1)
- Credentials: +2 per credential (vs +3 PT1)
- Directories: +1 per directory (vs +2 PT1)
- Flags: **REQUIRED** for meaningful progress (exploitation proof)

**Pass Threshold**: 70% (same as PT1, but **much harder to reach**)

**Additional Requirements**:
- Strong exploitation evidence (flags, credentials)
- Comprehensive enumeration (services, ports, directories)
- Methodology adherence (proper tool usage)

### Step 3: Update newState Object (Line 1078)

**Before** (BROKEN):
```typescript
const newState = {
  pt1_readiness: updatedPT1Readiness,
  overall_score: Math.round(newOverallScore),
  // ... rest of state
};
```

**After** (FIXED):
```typescript
const newState = {
  ejpt_readiness: updatedEJPTReadiness,  // ✅ ADD
  pt1_readiness: updatedPT1Readiness,
  oscp_readiness: updatedOSCPReadiness,  // ✅ ADD
  overall_score: Math.round(newOverallScore),
  // ... rest of state
};
```

## Expected User Experience After Fix

**Before Fix** (Broken):
```
Import Professional Writeup:
→ AI evaluates: 82% ✅
→ PT1: 35% → 38% ✅ (updates)
→ eJPT: 0% → 0% ❌ (baseline, never changes)
→ OSCP: 0% → 0% ❌ (baseline, never changes)

Refresh page:
→ PT1: 38% ✅ (persists)
→ eJPT: 0% ❌ (still baseline)
→ OSCP: 0% ❌ (still baseline)
```

**After Fix** (Working):
```
Import Professional Writeup:
→ AI evaluates: 82% ✅
→ PT1: 35% → 38% ✅ (1.0x multiplier)
→ eJPT: 0% → 6% ✅ (1.3x multiplier = faster)
→ OSCP: 0% → 2% ✅ (0.6x multiplier = slower)

Refresh page:
→ PT1: 38% ✅ (persists)
→ eJPT: 6% ✅ (persists!)
→ OSCP: 2% ✅ (persists!)

Import Another Writeup:
→ PT1: 38% → 42% ✅
→ eJPT: 6% → 13% ✅ (grows faster)
→ OSCP: 2% → 3% ✅ (grows slower)
```

## Implementation Checklist

- [ ] Create `calculateEJPTReadiness()` function before `updateAfterSimulation()`
- [ ] Create `calculateOSCPReadiness()` function before `updateAfterSimulation()`
- [ ] Add domain-to-eJPT-section mapping
- [ ] Add domain-to-OSCP-section mapping  
- [ ] Call both calculation functions in `updateAfterSimulation()`
- [ ] Add `ejpt_readiness: updatedEJPTReadiness` to newState (line 1078)
- [ ] Add `oscp_readiness: updatedOSCPReadiness` to newState (line 1078)
- [ ] Test with imported writeup
- [ ] Verify persistence after refresh
- [ ] Verify difficulty multipliers work correctly

## Technical Notes

**Difficulty Multipliers Application**:
```typescript
// eJPT (1.3x): Same 80% evaluation → 104 weighted (capped at 100)
const ejptWeight = difficultyWeight * EJPT_DIFFICULTY_MULTIPLIER; // 1.0 * 1.3 = 1.3

// PT1 (1.0x): Same 80% evaluation → 80 weighted
const pt1Weight = difficultyWeight * PT1_DIFFICULTY_MULTIPLIER; // 1.0 * 1.0 = 1.0

// OSCP (0.6x): Same 80% evaluation → 48 weighted
const oscpWeight = difficultyWeight * OSCP_DIFFICULTY_MULTIPLIER; // 1.0 * 0.6 = 0.6
```

**Contextual Scaling** (same for all certifications):
- 0-20%: 0.5x (fast early growth)
- 20-60%: 0.35x (moderate growth)
- 60-85%: 0.25x (slower growth)
- 85-100%: 0.15x (very slow growth)

**Combined Effect**:
- eJPT reaches 60% pass threshold **fastest** (foundational)
- PT1 reaches 70% pass threshold **moderate** pace (intermediate)
- OSCP reaches 70% pass threshold **slowest** (advanced, requires strong evidence)

## Success Criteria

✅ eJPT readiness updates after every drill/simulation/import
✅ OSCP readiness updates after every drill/simulation/import
✅ Both persist across refresh/tab switch/restart
✅ eJPT grows faster than PT1 (1.3x > 1.0x)
✅ OSCP grows slower than PT1 (0.6x < 1.0x)
✅ Imported writeups contribute to ALL three certifications
✅ Console logs show all three calculations
✅ Dashboard displays live eJPT/OSCP values
