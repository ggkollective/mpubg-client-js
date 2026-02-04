/**
 * Match State Manager
 * 
 * Manages match state and determines when to refresh
 * Refresh should only happen when match ID changes, not on reconnection
 */

import { logger } from './logger';

export interface MatchState {
    matchId: Uint8Array | null;
    tournamentId: string;
    lastUpdateTime: number;
}

/**
 * Match State Manager
 * Tracks current match and determines refresh logic
 */
export class MatchStateManager {
    private currentState: MatchState = {
        matchId: null,
        tournamentId: '',
        lastUpdateTime: 0,
    };

    /**
     * Check if refresh is needed based on new match ID
     * Refresh only when match ID changes, not on reconnection
     * 
     * @param newMatchId - New match ID from incoming message
     * @returns true if refresh is needed (match ID changed)
     */
    public shouldRefresh(newMatchId: Uint8Array): boolean {
        // First message ever - no refresh needed
        if (this.currentState.matchId === null) {
            logger.info('First match ID received - no refresh needed');
            return false;
        }

        // Compare match IDs
        const isDifferent = !this.areMatchIdsEqual(this.currentState.matchId, newMatchId);

        if (isDifferent) {
            logger.info('Match ID changed - refresh needed');
            logger.debug(`Old match ID: ${this.matchIdToString(this.currentState.matchId)}`);
            logger.debug(`New match ID: ${this.matchIdToString(newMatchId)}`);
        } else {
            logger.debug('Match ID unchanged - no refresh needed');
        }

        return isDifferent;
    }

    /**
     * Update current match state
     * 
     * @param matchId - Current match ID
     * @param tournamentId - Current tournament ID
     */
    public updateState(matchId: Uint8Array, tournamentId: string): void {
        this.currentState = {
            matchId: new Uint8Array(matchId), // Create a copy
            tournamentId,
            lastUpdateTime: Date.now(),
        };

        logger.debug(`Match state updated: matchId=${this.matchIdToString(matchId)}, tournamentId=${tournamentId}`);
    }

    /**
     * Get current match state
     */
    public getCurrentState(): Readonly<MatchState> {
        return { ...this.currentState };
    }

    /**
     * Clear current state (e.g., on disconnect)
     */
    public clear(): void {
        logger.info('Match state cleared');
        this.currentState = {
            matchId: null,
            tournamentId: '',
            lastUpdateTime: 0,
        };
    }

    /**
     * Compare two match IDs for equality
     */
    private areMatchIdsEqual(id1: Uint8Array, id2: Uint8Array): boolean {
        if (id1.length !== id2.length) {
            return false;
        }

        for (let i = 0; i < id1.length; i++) {
            if (id1[i] !== id2[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Convert match ID to readable string for logging
     */
    private matchIdToString(matchId: Uint8Array): string {
        return Array.from(matchId)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('-');
    }
}

