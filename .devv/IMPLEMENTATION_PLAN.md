# Implementation Plan: Evidence-Based Training System

## Overview
Complete overhaul of the training system to implement:
1. Timestamp-based session tracking (no manual counters)
2. Evidence-based certification readiness (never decreases scores)
3. Strengths-focused feedback (no demotivating 0% displays)
4. Burnout awareness panel (warnings only, no penalties)
5. Persistent training artifacts and reports

## Phase 1: Core Store Updates (certification-store-v2.ts) ✓

**Key Changes:**
- Scores NEVER decrease - only increase or stagnate
- Session-based time tracking (replaces manual counters)
- Evidence-based readiness interpretation (not percentages)
- Demonstrated strengths tracking with confidence scores
- Focus areas with specific practice opportunities
- Burnout warnings without progress penalties

**Critical Principles:**
```typescript
// NEVER DECREASE SCORES
const newScore = Math.max(oldScore, calculatedNewScore);

// EVIDENCE-BASED INTERPRETATION
type ReadinessLevel = 
  | 'foundation_established'        // Not "18%" - you have basics
  | 'developing_consistency'        // Not "25%" - you're building skills
  | 'approaching_readiness'         // Not "35%" - you're exam-ready soon
  | 'exam_capable'                  // Not "65%" - you can pass
  | 'advanced_practitioner';        // Not "80%" - you're proficient

// SESSION-BASED TIME TRACKING
startTrainingSession(type) → sessionId
endTrainingSession(sessionId) → calculates duration from timestamps
calculateTrainingTime() → derives daily/weekly/total from session array
```

## Phase 2: HomePage Updates

**Replace Current Display:**
```tsx
// OLD (DEMOTIVATING):
<p>Current Proficiency: {score}%</p> // Shows "0%" after discoveries!

// NEW (STRENGTHS-FOCUSED):
<div>
  <h4>Demonstrated Strengths</h4>
  {strengths.map(s => (
    <Badge>{s.domain}: {s.evidence[0]}</Badge>
  ))}
  
  <h4>Current Focus Areas</h4>
  {focusAreas.map(f => (
    <div>
      <Badge variant={f.priority}>{f.priority}</Badge>
      <p>{f.specific_improvement}</p>
      <ul>
        {f.practice_opportunities.map(p => <li>{p}</li>)}
      </ul>
    </div>
  ))}
</div>
```

**Certification Readiness Display:**
```tsx
// OLD:
PT1: 18% (Getting started)

// NEW:
PT1: Foundation Established
- Demonstrated: Service enumeration, credential discovery, backup analysis
- Focus Next: Faster pivoting, default credential testing
- Practice: Command Drill (gobuster), PT1 Web Exam, Decision Engine
```

## Phase 3: ProfilePage Burnout Panel

**Timestamp-Based Session Tracking:**
```tsx
<Card>
  <h3>Training Activity</h3>
  
  {/* Derived from session timestamps */}
  <div>
    <Label>Today</Label>
    <p>{formatMinutes(certStore.daily_training_minutes)}</p>
    <p className="text-xs">{certStore.training_sessions.filter(s => 
      s.completed && s.start_time.startsWith(today)
    ).length} sessions completed</p>
  </div>
  
  <div>
    <Label>This Week</Label>
    <p>{formatMinutes(certStore.weekly_training_minutes)}</p>
  </div>
  
  <div>
    <Label>All Time</Label>
    <p>{certStore.total_training_hours.toFixed(1)} hours</p>
  </div>
  
  {/* Burnout Warning (No Penalty) */}
  {certStore.burnout_warning_active && (
    <Alert variant="warning">
      <AlertTriangle />
      <div>
        <p>⚠ Burnout Watch</p>
        <p>You've trained {certStore.daily_training_minutes} minutes today.</p>
        <p>Consider taking a break. Skill growth benefits from recovery.</p>
        <p className="text-xs italic">
          This is guidance only - your progress is preserved.
        </p>
      </div>
    </Alert>
  )}
  
  {/* Session History */}
  <div>
    <h4>Recent Sessions</h4>
    {certStore.training_sessions.slice(-5).reverse().map(s => (
      <div key={s.session_id} className="flex justify-between">
        <span>{s.activity_type}</span>
        <span>{s.duration_minutes}min</span>
        <span>{formatRelativeTime(s.start_time)}</span>
      </div>
    ))}
  </div>
</Card>
```

## Phase 4: Integration Points

**DecisionEnginePage.tsx:**
```typescript
// Start session when simulation begins
useEffect(() => {
  if (simulation && !sessionId) {
    const id = certStore.startTrainingSession('decision_engine');
    setSessionId(id);
  }
}, [simulation]);

// End session when simulation completes
const evaluateSimulation = async () => {
  // ... existing evaluation ...
  
  if (sessionId) {
    certStore.endTrainingSession(sessionId);
  }
  
  await certStore.updateAfterSimulation({
    // ... existing data ...
    duration_minutes: Math.round(elapsedSeconds / 60),
    discovered_info: simulation.discoveredInfo, // ← CRITICAL for strengths
  });
};
```

**CommandDrillPage.tsx:**
```typescript
// Similar session tracking
const sessionId = useRef<string | null>(null);

useEffect(() => {
  sessionId.current = certStore.startTrainingSession('command_drill');
  return () => {
    if (sessionId.current) {
      certStore.endTrainingSession(sessionId.current);
    }
  };
}, []);
```

## Phase 5: Evidence Recording

**Key Insight:** Every discovery is evidence of skill

```typescript
// When user discovers services
if (discovered_info.services.length > 0) {
  certStore.recordDemonstratedStrength(
    'enumeration',
    'service_enumeration',
    `Discovered ${discovered_info.services.length} services`
  );
}

// When user finds credentials
if (discovered_info.credentials.length > 0) {
  certStore.recordDemonstratedStrength(
    'enumeration',
    'credential_hunting',
    `Extracted ${discovered_info.credentials.length} credentials`
  );
}

// When user finds directories
if (discovered_info.directories.length > 0) {
  certStore.recordDemonstratedStrength(
    'web_exploitation',
    'directory_fuzzing',
    `Found ${discovered_info.directories.length} paths`
  );
}
```

**Result:**
- User who discovers 5 services → enumeration strength recorded
- User who finds credentials in backup → credential_hunting strength
- User who captures flags → post_exploitation strength
- **NO MORE "0% proficiency" after real work!**

## Phase 6: Readiness Interpretation Logic

```typescript
// Evidence-based (not just score)
const interpretLevel = (baseScore: number): ReadinessLevel => {
  const hasStrongEvidence = strengthsCount >= 3;
  const hasConsistency = simCount >= 5 && avgScore >= 60;
  const hasDepth = simCount >= 10;
  
  if (baseScore >= 70 && hasDepth && hasConsistency) {
    return 'advanced_practitioner';
  } else if (baseScore >= 60 && hasConsistency) {
    return 'exam_capable';
  } else if (baseScore >= 45 && hasStrongEvidence) {
    return 'approaching_readiness';
  } else if (baseScore >= 25 || simCount >= 3) {
    return 'developing_consistency';
  } else {
    return 'foundation_established';
  }
};
```

**Calibration Example:**

| Evidence | Old Display | New Display |
|----------|-------------|-------------|
| 3 sims, 2 flags, credentials found | PT1: 18% (Getting started) | PT1: Developing consistency |
| 5 sims, avg 68%, 4 strengths | PT1: 35% (Building momentum) | PT1: Approaching readiness |
| 10 sims, avg 75%, 6 strengths | PT1: 65% (Intermediate) | PT1: Exam capable |

## Benefits

**For Users:**
- Never lose progress (scores only go up)
- See evidence of skills (not arbitrary percentages)
- Get specific practice recommendations
- Understand readiness in realistic terms
- Burnout warnings without punishment

**For Learning:**
- Mistakes identify focus areas (not failures)
- Every drill contributes positively
- Strengths-focused motivation
- Evidence-based skill assessment
- Sustainable training pace

**For Platform:**
- Accurate time tracking (timestamps, not counters)
- Rich training history (session artifacts)
- Fair readiness under timed conditions
- No demotivating displays
- Real training mentor behavior

## Migration Strategy

1. Deploy new store (certification-store-v2.ts)
2. Update HomePage to use new store
3. Add session tracking to DecisionEngine/CommandDrill
4. Update ProfilePage burnout panel
5. Update all displays to show strengths instead of percentages
6. Test with real user workflow
7. Document changes in STRUCTURE.md

## Success Criteria

✓ No more "0% proficiency" displays after real work
✓ Training time calculated from session timestamps
✓ Scores never decrease (only stagnate if no improvement)
✓ Burnout warnings present but don't penalize progress
✓ Dashboard shows strengths + focus areas (not just percentages)
✓ Every completed drill contributes positively
✓ Readiness interpretation grounded in evidence
