/**
 * Animation Configuration
 * 
 * Centralized animation timing and design parameters.
 * Inspired by sab-f1-ui's theme-based configuration system.
 * 
 * All durations are in milliseconds (ms).
 * All sizes are in pixels (px).
 */

export interface AnimationConfig {
  // Leaderboard row animations
  leaderboard: {
    rowHeightPx: number;
    rowTravelDurationMs: number;           // Duration for row position changes
    rowTravelEasing: string;               // GSAP easing function
    
    // Rank change highlight
    rankChangeHighlightDurationMs: number;
    rankChangeOutlineDurationMs: number;
    rankChangeOutlineThicknessPx: number;
    
    // Kill notification
    killNotificationDurationMs: number;
    killNotificationFadeDurationMs: number;
    killNotificationScaleDurationMs: number;
    
    // Elimination animation
    eliminationDurationMs: number;
    eliminationFadeOutDurationMs: number;
    eliminationSlideOutDurationMs: number;
    
    // Display mode transitions
    fullWidthDurationMs: number;
    fullWidthCloseDelayMs: number;
    
    // Fastest lap indicator
    fastestLapToastDurationMs: number;
  };
  
  // Chyron (info overlay) animations
  chyron: {
    containerFadeAwayDurationMs: number;
    
    // Outline reveal
    outlineClipPathDurationMs: number;
    outlineFadeDurationMs: number;
    
    // Base background
    baseBlackOpacityDurationMs: number;
    baseBlackWidthDurationMs: number;
    baseWipeDurationMs: number;
    baseWipeDelay: number;
    baseColorDurationMs: number;
    baseColorDelayMs: number;
    
    // Position flag
    posFlagBlindsDelayMs: number;
    posFlagBlindsOpenDurationMs: number;
    posFlagWipeDuration: number;
    
    // Team color bar
    teamColorBarDurationMs: number;
    teamColorBarDelayMs: number;
  };
  
  // Colors
  colors: {
    posGainedGreen: string;    // Rank up color
    posLostRed: string;        // Rank down color
    posFastestLap: string;     // Fastest lap color
    killHighlight: string;     // Kill notification color
    eliminationRed: string;    // Elimination color
    black: string;
    white: string;
  };
}

export const animationConfig: AnimationConfig = {
  leaderboard: {
    rowHeightPx: 36.5,
    rowTravelDurationMs: 750,
    rowTravelEasing: 'power2.inOut',
    
    rankChangeHighlightDurationMs: 1000,
    rankChangeOutlineDurationMs: 333,
    rankChangeOutlineThicknessPx: 1.5,
    
    killNotificationDurationMs: 2000,
    killNotificationFadeDurationMs: 500,
    killNotificationScaleDurationMs: 300,
    
    eliminationDurationMs: 3000,
    eliminationFadeOutDurationMs: 800,
    eliminationSlideOutDurationMs: 1000,
    
    fullWidthDurationMs: 750,
    fullWidthCloseDelayMs: 333,
    
    fastestLapToastDurationMs: 500,
  },
  
  chyron: {
    containerFadeAwayDurationMs: 300,
    
    outlineClipPathDurationMs: 500,
    outlineFadeDurationMs: 1167,
    
    baseBlackOpacityDurationMs: 800,
    baseBlackWidthDurationMs: 667,
    baseWipeDurationMs: 400,
    baseWipeDelay: 333,
    baseColorDurationMs: 566,
    baseColorDelayMs: 600,
    
    posFlagBlindsDelayMs: 500,
    posFlagBlindsOpenDurationMs: 100,
    posFlagWipeDuration: 333,
    
    teamColorBarDurationMs: 667,
    teamColorBarDelayMs: 733,
  },
  
  colors: {
    posGainedGreen: '#10ff35',
    posLostRed: '#e40030',
    posFastestLap: '#ae43ca',
    killHighlight: '#f8d500',
    eliminationRed: '#be2c30',
    black: '#000000',
    white: '#ffffff',
  },
};

/**
 * Get animation configuration with optional duration multiplier
 * Useful for debugging (slow-motion mode)
 */
export function getAnimationConfig(durationMultiplier: number = 1.0): AnimationConfig {
  if (durationMultiplier === 1.0) {
    return animationConfig;
  }
  
  // Deep clone and multiply all duration values
  const config = JSON.parse(JSON.stringify(animationConfig)) as AnimationConfig;
  
  // Multiply leaderboard durations
  Object.keys(config.leaderboard).forEach(key => {
    if (key.endsWith('DurationMs') || key.endsWith('DelayMs')) {
      (config.leaderboard as any)[key] *= durationMultiplier;
    }
  });
  
  // Multiply chyron durations
  Object.keys(config.chyron).forEach(key => {
    if (key.endsWith('DurationMs') || key.endsWith('Delay') || key.endsWith('DelayMs')) {
      (config.chyron as any)[key] *= durationMultiplier;
    }
  });
  
  return config;
}

