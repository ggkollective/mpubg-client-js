# Animation System Documentation

## Overview

The mpubg-client-js animation system is ported from the sab-f1-ui React-based animation architecture. It provides a centralized, modular animation management system using GSAP (GreenSock Animation Platform).

### Key Features

- **Centralized Configuration**: All animation timings and parameters in one place
- **GSAP-Based**: High-performance animations with timeline support
- **Modular Design**: Reusable animation components
- **Type-Safe**: Full TypeScript support
- **Debug Support**: Duration multiplier for slow-motion debugging

## Architecture

### Core Modules

```
src/shared/
├── animation-config.ts      # Centralized timing configuration
├── animation-manager.ts     # GSAP timeline management
├── message-dispatcher.ts    # Message processing (existing)
└── match-state-manager.ts   # Match state tracking (existing)
```

## 1. Animation Configuration (`animation-config.ts`)

### Purpose

Centralized storage for all animation timing parameters, inspired by sab-f1-ui's theme system.

### Structure

```typescript
export interface AnimationConfig {
  leaderboard: {
    rowHeightPx: number;
    rowTravelDurationMs: number;
    rankChangeHighlightDurationMs: number;
    killNotificationDurationMs: number;
    eliminationDurationMs: number;
    // ... more parameters
  };
  chyron: {
    containerFadeAwayDurationMs: number;
    outlineClipPathDurationMs: number;
    // ... more parameters
  };
  colors: {
    posGainedGreen: string;    // Rank up: #10ff35
    posLostRed: string;        // Rank down: #e40030
    posFastestLap: string;     // Fastest lap: #ae43ca
    killHighlight: string;     // Kill: #f8d500
    eliminationRed: string;    // Elimination: #be2c30
  };
}
```

### Usage

```typescript
import { animationConfig, getAnimationConfig } from './shared/animation-config';

// Normal speed
const config = animationConfig;

// Slow-motion (2x slower)
const debugConfig = getAnimationConfig(2.0);
```

## 2. Animation Manager (`animation-manager.ts`)

### Purpose

Manages GSAP timelines and provides high-level animation methods.

### Key Methods

#### Timeline Management

```typescript
// Create timeline
const timeline = animationManager.createTimeline('myAnimation');

// Play timeline
animationManager.playTimeline('myAnimation');

// Kill timeline
animationManager.killTimeline('myAnimation');

// Kill all timelines
animationManager.killAllTimelines();
```

#### Row Position Animation

```typescript
animationManager.animateRowPosition(
  element,
  newPosition,  // 1-based position
  {
    duration: 0.75,  // Optional override
    ease: 'power2.inOut',
    onComplete: () => console.log('Animation complete')
  }
);
```

#### Rank Change Highlight

```typescript
animationManager.animateRankChangeHighlight(
  element,
  isRankUp,  // true = green, false = red
  {
    onComplete: () => console.log('Highlight complete')
  }
);
```

#### Kill Notification

```typescript
animationManager.animateKillNotification(
  element,
  killCount,
  {
    onComplete: () => console.log('Kill notification complete')
  }
);
```

#### Elimination Animation

```typescript
animationManager.animateElimination(
  element,
  {
    onComplete: () => {
      element.remove();  // Remove from DOM
    }
  }
);
```

#### Utility Animations

```typescript
// Fade in
animationManager.animateFadeIn(element, { duration: 0.5 });

// Fade out
animationManager.animateFadeOut(element, { duration: 0.5 });

// Clip-path wipe
animationManager.animateClipPathWipe(
  element,
  'left',  // 'left' | 'right' | 'top' | 'bottom'
  { duration: 0.4 }
);
```

### Singleton Pattern

```typescript
import { animationManager } from './shared/animation-manager';

// Use directly
animationManager.animateRowPosition(element, 5);

// Or get instance with custom duration multiplier
import { AnimationManager } from './shared/animation-manager';
const debugManager = AnimationManager.getInstance(2.0);  // 2x slower
```

## 3. Integration with Existing Modules

### With MessageDispatcher

```typescript
import { MessageDispatcher } from './shared/message-dispatcher';
import { MatchStateManager } from './shared/match-state-manager';
import { animationManager } from './shared/animation-manager';

const matchStateManager = new MatchStateManager();

const dispatcher = new MessageDispatcher((message, reconnecting) => {
  if (!message.matchId) return;
  
  const shouldRefresh = matchStateManager.shouldRefresh(message.matchId);
  
  if (shouldRefresh) {
    // Full refresh - clear and rebuild UI
    logger.info('🔄 REFRESH: Match changed');
    clearLeaderboard();
    buildLeaderboard(message);
  } else {
    // Update - detect changes and animate
    const changes = detectChanges(previousState, message);
    
    // Animate rank changes
    changes.rankChanges.forEach(change => {
      const element = document.getElementById(`row-${change.rowId}`);
      if (element) {
        animationManager.animateRowPosition(element, change.newPosition);
        animationManager.animateRankChangeHighlight(element, change.isRankUp);
      }
    });
    
    // Animate kills
    changes.kills.forEach(kill => {
      const element = document.getElementById(`row-${kill.rowId}`);
      if (element) {
        animationManager.animateKillNotification(element, kill.killCount);
      }
    });
    
    // Animate eliminations
    changes.eliminations.forEach(elim => {
      const element = document.getElementById(`row-${elim.rowId}`);
      if (element) {
        animationManager.animateElimination(element, {
          onComplete: () => element.remove()
        });
      }
    });
  }
  
  matchStateManager.updateState(message.matchId, message.tournamentId || '');
  previousState = message;
});
```

## 4. Animation Patterns

### Pattern 1: Simple Property Animation

```typescript
gsap.to(element, {
  opacity: 1,
  duration: 0.5,
  ease: 'power2.out'
});
```

### Pattern 2: Timeline Sequence

```typescript
const timeline = gsap.timeline();

timeline.to(element, { scale: 1.1, duration: 0.3 });
timeline.to(element, { backgroundColor: '#f8d500', duration: 0.2 }, '<');
timeline.to(element, { scale: 1.0, duration: 0.5 }, '+=1.0');
```

### Pattern 3: Coordinated Multi-Element

```typescript
const timeline = gsap.timeline();

// Element 1: Immediate
timeline.to(element1, { opacity: 1, duration: 0.3 }, 0);

// Element 2: After 0.3s
timeline.to(element2, { x: 100, duration: 0.5 }, 0.3);

// Element 3: After 0.8s
timeline.to(element3, { scale: 1.2, duration: 0.4 }, 0.8);
```

## 5. Next Steps

- [ ] Create leaderboard UI components
- [ ] Implement change detection logic
- [ ] Create test suite for animations
- [ ] Integrate with Renderer process
- [ ] Add IPC events for animation triggers

## References

- **sab-f1-ui Architecture**: `mpubg-client/spec/sab-f1-ui-architecture.md`
- **GSAP Documentation**: https://greensock.com/docs/
- **Module Implementation**: `MODULE_IMPLEMENTATION.md`

