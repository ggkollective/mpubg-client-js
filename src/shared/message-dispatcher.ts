/**
 * Message Dispatcher Module
 * Processes messages from queue with 1.5 second intervals
 * Based on WPF MessageDispatcher implementation
 */
import { dataFormat, ObserverMessage2 } from './data-format';
import { logger } from './logger';

/**
 * Event queue data structure
 */
export interface EventQueueData {
    reconnecting: boolean;
    data: string;
}

/**
 * Message Dispatcher
 * Dequeues messages every 1.5 seconds and processes them
 */
export class MessageDispatcher {
    private eventQueue: EventQueueData[] = [];
    private intervalTimer: NodeJS.Timeout | null = null;
    private readonly intervalMs: number = 1500;
    private readonly checkIntervalMs: number = 100;
    private latestProcessTime: number = Date.now();
    private onUpdate: ((message: ObserverMessage2, reconnecting: boolean) => void) | null = null;

    constructor(onUpdate?: (message: ObserverMessage2, reconnecting: boolean) => void) {
        this.onUpdate = onUpdate || null;
    }

    /**
     * Start the dispatcher timer
     */
    public start(): void {
        if (this.intervalTimer) {
            logger.warn('MessageDispatcher already started');
            return;
        }

        logger.info('MessageDispatcher started');
        this.latestProcessTime = Date.now();

        // Check every 100ms (like WPF implementation)
        this.intervalTimer = setInterval(() => {
            this.onTimerExpired();
        }, this.checkIntervalMs);
    }

    /**
     * Stop the dispatcher timer
     */
    public stop(): void {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
            logger.info('MessageDispatcher stopped');
        }
    }

    /**
     * Timer callback - processes queue every 1.5 seconds
     */
    private onTimerExpired(): void {
        const now = Date.now();

        // Check if 1.5 seconds have passed since last process
        if (now - this.latestProcessTime < this.intervalMs) {
            return;
        }

        // Try to dequeue
        if (this.eventQueue.length === 0) {
            return;
        }

        let eventData = this.eventQueue.shift()!;

        // Deduplication: if there are more messages, take the latest one
        if (this.eventQueue.length > 0) {
            const eventData2 = this.eventQueue.shift();
            if (eventData2) {
                eventData = eventData2;
            }
        }

        try {
            // Parse JSON to ObserverMessage2
            const observerMessage = dataFormat.parseFromJson(eventData.data);

            logger.info('Dequeued message:', {
                reconnecting: eventData.reconnecting,
                matchId: observerMessage.matchId,
                tournamentId: observerMessage.tournamentId,
                teamCount: observerMessage.totalTeamStats?.length || 0,
                playerCount: observerMessage.totalPlayerStats?.length || 0,
                refresh: observerMessage.refresh
            });

            // Call update callback if provided
            if (this.onUpdate) {
                this.onUpdate(observerMessage, eventData.reconnecting);
            }
        } catch (error) {
            logger.error('Failed to process message:', error);
        }

        this.latestProcessTime = Date.now();
    }

    /**
     * Enqueue a message
     */
    public enqueue(data: EventQueueData): void {
        this.eventQueue.push(data);
        logger.debug(`Message enqueued. Queue size: ${this.eventQueue.length}`);
    }

    /**
     * Clear the queue
     */
    public clear(): void {
        this.eventQueue = [];
        logger.info('Message queue cleared');
    }

    /**
     * Get current queue size
     */
    public getQueueSize(): number {
        return this.eventQueue.length;
    }

    /**
     * Set update callback
     */
    public setOnUpdate(callback: (message: ObserverMessage2, reconnecting: boolean) => void): void {
        this.onUpdate = callback;
    }
}

