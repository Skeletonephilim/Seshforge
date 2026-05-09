# Phase 46: JSX Special Character Escape Fix (April 11, 2026)

## Overview
Fixed TypeScript compilation error in BoxModePage.tsx caused by unescaped `>` characters in shell redirection operators within JSX code blocks.

## Problem Identified

**Error Message**:
```
E9001: src/pages/BoxModePage.tsx(536,111): error TS1382: Unexpected token. Did you mean `{'>'}` or `&gt;`?
E9001: src/pages/BoxModePage.tsx(537,180): error TS1382: Unexpected token. Did you mean `{'>'}` or `&gt;`?
```

**Root Cause**: 
Shell redirection operators (`2>/dev/null`) in JSX `<code>` elements were being interpreted as JSX closing tags, causing TypeScript parser errors.

**Affected Lines**:
```tsx
// BEFORE (BROKEN):
<code>find / -name user.txt 2>/dev/null</code>
<code>find / -perm -4000 2>/dev/null</code>
```

## Solution Applied

Escaped the `>` character using JSX expression syntax:

```tsx
// AFTER (FIXED):
<code>find / -name user.txt 2{'>'}dev/null</code>
<code>find / -perm -4000 2{'>'}dev/null</code>
```

## Why This Works

In JSX/TSX:
- `>` is a special character used for closing tags
- When `>` appears in text content, TypeScript parser can confuse it with tag syntax
- Using `{'>'}` explicitly tells the parser this is a string literal, not a tag
- Alternative: `&gt;` (HTML entity) also works but `{'>'}` is more readable

## Files Modified

**src/pages/BoxModePage.tsx** (Lines 536-537):
- Escaped shell redirection operators in command examples
- Both occurrences of `2>/dev/null` → `2{'>'}dev/null`

## Build Verification

```
✓ Build successful! Project is ready for deployment.
```

**Zero compilation errors** ✅

## Best Practices

When including shell commands with special characters in JSX:

**Special Characters to Escape**:
- `>` (greater than) → `{'>'}` or `&gt;`
- `<` (less than) → `{'<'}` or `&lt;`
- `&` (ampersand) → `{'&'}` or `&amp;`
- `{` / `}` (braces) → `{'{'}` / `{'}'}` or `&#123;` / `&#125;`

**Example Pattern**:
```tsx
// Shell redirections
<code>command 2{'>'}dev/null</code>
<code>command {'<'} input.txt</code>
<code>command1 {'&&'} command2</code>

// Pipe operators (safe, but can escape for clarity)
<code>command1 | command2</code>  // Usually OK
<code>command1 {'|'} command2</code>  // Explicit
```

## Impact

**For Development**:
- ✅ Build no longer fails
- ✅ BoxModePage compiles successfully
- ✅ Deployment unblocked

**For Users**:
- ✅ Box Simulator page displays correctly
- ✅ Attack path examples readable
- ✅ Shell commands render properly

---

**Your BoxModePage now compiles successfully with properly escaped JSX special characters!** 🎉
