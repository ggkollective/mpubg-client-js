/**
 * Animation Manager
 * 
 * Manages GSAP timelines for coordinated animations.
 * Provides a centralized system for creating, playing, and managing animations.
 * 
 * Inspired by sab-f1-ui's animation coordination patterns.
 */

import gsap from 'gsap';
import { logger } from './logger';
import { getAnimationConfig, AnimationConfig } from './animation-config';

export interface AnimationOptions {
  duration?: number;
  delay?: number;
  ease?: string;
  onComplete?: () => void;
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
}

export interface RankChangeData {
  rowId: string;
  oldPosition: number;
  newPosition: number;
  isRankUp: boolean;
}

export interface KillData {
  rowId: string;
  killCount: number;
}

export interface EliminationData {
  rowId: string;
  teamName: string;
}

/**
 * AnimationManager class
 * 
 * Singleton pattern for managing all animations in the application.
 */
export class AnimationManager {
  private static instance: AnimationManager;
  private timelines: Map<string, gsap.core.Timeline>;
  private config: AnimationConfig;
  private durationMultiplier: number;

  private constructor(durationMultiplier: number = 1.0) {
    this.timelines = new Map();
    this.durationMultiplier = durationMultiplier;
    this.config = getAnimationConfig(durationMultiplier);
    logger.info('AnimationManager initialized');
  }

  public static getInstance(durationMultiplier: number = 1.0): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager(durationMultiplier);
    }
    return AnimationManager.instance;
  }

  /**
   * Get current duration multiplier
   */
  public getDurationMultiplier(): number {
    return this.durationMultiplier;
  }

  /**
   * Set duration multiplier for debugging (slow-motion mode)
   */
  public setDurationMultiplier(multiplier: number): void {
    this.durationMultiplier = multiplier;
    this.config = getAnimationConfig(multiplier);
    logger.info(`Animation duration multiplier set to ${multiplier}`);
  }

  /**
   * Create a new timeline
   */
  public createTimeline(id: string, options?: gsap.TimelineVars): gsap.core.Timeline {
    if (this.timelines.has(id)) {
      logger.warn(`Timeline '${id}' already exists. Killing existing timeline.`);
      this.killTimeline(id);
    }

    const timeline = gsap.timeline(options);
    this.timelines.set(id, timeline);
    logger.debug(`Timeline '${id}' created`);
    return timeline;
  }

  /**
   * Get existing timeline
   */
  public getTimeline(id: string): gsap.core.Timeline | undefined {
    return this.timelines.get(id);
  }

  /**
   * Play timeline
   */
  public playTimeline(id: string): void {
    const timeline = this.timelines.get(id);
    if (timeline) {
      timeline.play();
      logger.debug(`Timeline '${id}' playing`);
    } else {
      logger.warn(`Timeline '${id}' not found`);
    }
  }

  /**
   * Pause timeline
   */
  public pauseTimeline(id: string): void {
    const timeline = this.timelines.get(id);
    if (timeline) {
      timeline.pause();
      logger.debug(`Timeline '${id}' paused`);
    }
  }

  /**
   * Kill timeline and remove from map
   */
  public killTimeline(id: string): void {
    const timeline = this.timelines.get(id);
    if (timeline) {
      timeline.kill();
      this.timelines.delete(id);
      logger.debug(`Timeline '${id}' killed`);
    }
  }

  /**
   * Kill all timelines
   */
  public killAllTimelines(): void {
    this.timelines.forEach((timeline, id) => {
      timeline.kill();
      logger.debug(`Timeline '${id}' killed`);
    });
    this.timelines.clear();
    logger.info('All timelines killed');
  }

  /**
   * Animate row position change
   */
  public animateRowPosition(
    element: HTMLElement,
    newPosition: number,
    options?: AnimationOptions
  ): gsap.core.Tween {
    const topPx = (newPosition - 1) * this.config.leaderboard.rowHeightPx;

    const tweenVars: gsap.TweenVars = {
      top: `${topPx}px`,
      duration: options?.duration ?? this.config.leaderboard.rowTravelDurationMs / 1000,
      ease: options?.ease ?? this.config.leaderboard.rowTravelEasing,
      delay: options?.delay ?? 0,
    };

    if (options?.onComplete) tweenVars.onComplete = options.onComplete;
    if (options?.onStart) tweenVars.onStart = options.onStart;

    return gsap.to(element, tweenVars);
  }

  /**
   * Animate rank change highlight
   */
  public animateRankChangeHighlight(
    element: HTMLElement,
    isRankUp: boolean,
    options?: AnimationOptions
  ): gsap.core.Timeline {
    const color = isRankUp ? this.config.colors.posGainedGreen : this.config.colors.posLostRed;
    const timelineId = `rankChange-${Date.now()}`;
    
    const timeline = this.createTimeline(timelineId);
    
    // Show colored outline
    timeline.to(element, {
      outlineColor: color,
      outlineWidth: `${this.config.leaderboard.rankChangeOutlineThicknessPx}px`,
      outlineStyle: 'solid',
      duration: this.config.leaderboard.rankChangeOutlineDurationMs / 1000,
      ease: 'power2.out',
    });
    
    // Fade out outline
    timeline.to(element, {
      outlineColor: 'transparent',
      duration: this.config.leaderboard.rankChangeHighlightDurationMs / 1000,
      ease: 'power2.in',
      onComplete: () => {
        element.style.outline = 'none';
        this.killTimeline(timelineId);
        options?.onComplete?.();
      },
    }, `+=${this.config.leaderboard.rankChangeHighlightDurationMs / 1000}`);
    
    return timeline;
  }

  /**
   * Animate kill notification
   */
  public animateKillNotification(
    element: HTMLElement,
    _killCount: number,  // Reserved for future use (e.g., display kill count)
    options?: AnimationOptions
  ): gsap.core.Timeline {
    const timelineId = `killNotification-${Date.now()}`;
    const timeline = this.createTimeline(timelineId);

    // Scale up + highlight
    timeline.to(element, {
      scale: 1.1,
      backgroundColor: this.config.colors.killHighlight,
      duration: this.config.leaderboard.killNotificationScaleDurationMs / 1000,
      ease: 'back.out(1.7)',
    });

    // Hold
    timeline.to(element, {
      duration: (this.config.leaderboard.killNotificationDurationMs -
                 this.config.leaderboard.killNotificationScaleDurationMs -
                 this.config.leaderboard.killNotificationFadeDurationMs) / 1000,
    });

    // Scale down + fade
    timeline.to(element, {
      scale: 1.0,
      backgroundColor: 'transparent',
      duration: this.config.leaderboard.killNotificationFadeDurationMs / 1000,
      ease: 'power2.in',
      onComplete: () => {
        this.killTimeline(timelineId);
        options?.onComplete?.();
      },
    });

    return timeline;
  }

  /**
   * Animate elimination
   */
  public animateElimination(
    element: HTMLElement,
    options?: AnimationOptions
  ): gsap.core.Timeline {
    const timelineId = `elimination-${Date.now()}`;
    const timeline = this.createTimeline(timelineId);

    // Flash red
    timeline.to(element, {
      backgroundColor: this.config.colors.eliminationRed,
      duration: 0.2,
      ease: 'power2.out',
    });

    // Hold
    timeline.to(element, {
      duration: (this.config.leaderboard.eliminationDurationMs -
                 this.config.leaderboard.eliminationFadeOutDurationMs -
                 this.config.leaderboard.eliminationSlideOutDurationMs) / 1000,
    });

    // Fade out + slide out
    timeline.to(element, {
      opacity: 0,
      x: -100,
      duration: this.config.leaderboard.eliminationFadeOutDurationMs / 1000,
      ease: 'power2.in',
      onComplete: () => {
        element.style.display = 'none';
        this.killTimeline(timelineId);
        options?.onComplete?.();
      },
    });

    return timeline;
  }

  /**
   * Animate fade in
   */
  public animateFadeIn(
    element: HTMLElement,
    options?: AnimationOptions
  ): gsap.core.Tween {
    const tweenVars: gsap.TweenVars = {
      opacity: 1,
      duration: options?.duration ?? 0.5,
      ease: options?.ease ?? 'power2.out',
      delay: options?.delay ?? 0,
    };

    if (options?.onComplete) tweenVars.onComplete = options.onComplete;
    if (options?.onStart) tweenVars.onStart = options.onStart;

    return gsap.to(element, tweenVars);
  }

  /**
   * Animate fade out
   */
  public animateFadeOut(
    element: HTMLElement,
    options?: AnimationOptions
  ): gsap.core.Tween {
    const tweenVars: gsap.TweenVars = {
      opacity: 0,
      duration: options?.duration ?? 0.5,
      ease: options?.ease ?? 'power2.in',
      delay: options?.delay ?? 0,
    };

    if (options?.onComplete) tweenVars.onComplete = options.onComplete;
    if (options?.onStart) tweenVars.onStart = options.onStart;

    return gsap.to(element, tweenVars);
  }

  /**
   * Animate clip-path wipe
   */
  public animateClipPathWipe(
    element: HTMLElement,
    direction: 'left' | 'right' | 'top' | 'bottom',
    options?: AnimationOptions
  ): gsap.core.Tween {
    const clipPaths = {
      left: {
        from: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
        to: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
      },
      right: {
        from: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
        to: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
      },
      top: {
        from: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
        to: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
      },
      bottom: {
        from: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)',
        to: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
      },
    };

    element.style.clipPath = clipPaths[direction].from;

    const tweenVars: gsap.TweenVars = {
      clipPath: clipPaths[direction].to,
      duration: options?.duration ?? 0.5,
      ease: options?.ease ?? 'power2.inOut',
      delay: options?.delay ?? 0,
    };

    if (options?.onComplete) tweenVars.onComplete = options.onComplete;
    if (options?.onStart) tweenVars.onStart = options.onStart;

    return gsap.to(element, tweenVars);
  }

  /**
   * Get animation configuration
   */
  public getConfig(): AnimationConfig {
    return this.config;
  }
}

// Export singleton instance
export const animationManager = AnimationManager.getInstance();
