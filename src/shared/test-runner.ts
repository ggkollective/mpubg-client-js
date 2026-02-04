/**
 * Test Runner Module
 * Reads test data file and feeds it to MessageDispatcher
 * Based on WPF OnRunTest implementation
 */
import * as fs from 'fs';
import * as path from 'path';
import { MessageDispatcher, EventQueueData } from './message-dispatcher';
import { logger } from './logger';

/**
 * Test Runner
 * Simulates live data by reading test file line by line
 */
export class TestRunner {
    private testThread: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private dispatcher: MessageDispatcher;
    private testDataPath: string;
    private currentLineIndex: number = 0;
    private testDataLines: string[] = [];

    constructor(dispatcher: MessageDispatcher, testDataPath?: string) {
        this.dispatcher = dispatcher;
        // Default test data path (adjust based on build output structure)
        this.testDataPath = testDataPath || path.join(__dirname, 'renderer/test-data_smash.txt');
    }

    /**
     * Start test data streaming
     */
    public async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Test runner already running');
            return;
        }

        try {
            // Read test data file
            logger.info('Loading test data from:', this.testDataPath);
            const fileContent = fs.readFileSync(this.testDataPath, 'utf-8');
            this.testDataLines = fileContent.split('\n').filter(line => line.trim().length > 0);

            logger.info(`Loaded ${this.testDataLines.length} lines of test data`);

            this.isRunning = true;
            this.currentLineIndex = 0;

            // Start dispatcher
            this.dispatcher.start();

            // Start feeding data every 1.5 seconds (like WPF implementation)
            this.testThread = setInterval(() => {
                this.feedNextLine();
            }, 1500);

            logger.info('Test runner started');
        } catch (error) {
            logger.error('Failed to start test runner:', error);
            throw error;
        }
    }

    /**
     * Stop test data streaming
     */
    public stop(): void {
        if (!this.isRunning) {
            logger.warn('Test runner not running');
            return;
        }

        if (this.testThread) {
            clearInterval(this.testThread);
            this.testThread = null;
        }

        this.dispatcher.stop();
        this.dispatcher.clear();
        this.isRunning = false;
        this.currentLineIndex = 0;

        logger.info('Test runner stopped');
    }

    /**
     * Feed next line to dispatcher
     */
    private feedNextLine(): void {
        if (this.currentLineIndex >= this.testDataLines.length) {
            logger.info('Test data playback completed. Stopping...');
            this.stop();
            return;
        }

        const eventData = this.testDataLines[this.currentLineIndex];
        this.currentLineIndex++;

        // Enqueue to dispatcher
        const queueData: EventQueueData = {
            reconnecting: false,
            data: eventData as string,
        };

        this.dispatcher.enqueue(queueData);
        logger.debug(`Fed line ${this.currentLineIndex}/${this.testDataLines.length} to dispatcher`);
    }

    /**
     * Get test runner status
     */
    public getStatus(): { isRunning: boolean; currentLine: number; totalLines: number } {
        return {
            isRunning: this.isRunning,
            currentLine: this.currentLineIndex,
            totalLines: this.testDataLines.length
        };
    }

    /**
     * Reset test runner to beginning
     */
    public reset(): void {
        this.stop();
        this.currentLineIndex = 0;
        this.testDataLines = [];
    }
}

