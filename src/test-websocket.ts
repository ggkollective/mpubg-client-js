/**
 * WebSocket Module Test
 * 
 * Tests WebSocket connection, reconnection, and refresh logic
 */

import { logger } from './shared/logger';
import { WebSocketClient, ConnectionStatus } from './shared/websocket-client';
import { MessageDispatcher } from './shared/message-dispatcher';
import { MatchStateManager } from './shared/match-state-manager';
import { dataFormat } from './shared/data-format';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Mock WebSocket Server
 * Simulates server behavior for testing
 */
class MockWebSocketServer {
    private testDataPath: string;
    private testLines: string[] = [];
    private currentLine: number = 0;
    private sendInterval: NodeJS.Timeout | null = null;
    private messageCallback: ((message: string) => void) | null = null;

    constructor(testDataPath?: string) {
        this.testDataPath = testDataPath || path.join(__dirname, 'renderer/test-data_smash.txt');
    }

    public async loadTestData(): Promise<void> {
        logger.info(`Loading test data from: ${this.testDataPath}`);
        const content = fs.readFileSync(this.testDataPath, 'utf-8');
        this.testLines = content.split('\n').filter(line => line.trim().length > 0);
        logger.info(`Loaded ${this.testLines.length} lines of test data`);
    }

    public onMessage(callback: (message: string) => void): void {
        this.messageCallback = callback;
    }

    public start(): void {
        logger.info('Mock server started - sending messages every 1.5 seconds');
        
        this.sendInterval = setInterval(() => {
            if (this.currentLine >= this.testLines.length) {
                logger.info('All test data sent');
                this.stop();
                return;
            }

            const line = this.testLines[this.currentLine];
            this.currentLine++;

            // Wrap in WebSocket message format
            const wsMessage = JSON.stringify({
                code: 200,
                data: line
            });

            if (this.messageCallback) {
                this.messageCallback(wsMessage);
            }

            logger.debug(`Sent line ${this.currentLine}/${this.testLines.length}`);
        }, 1500);
    }

    public stop(): void {
        if (this.sendInterval) {
            clearInterval(this.sendInterval);
            this.sendInterval = null;
        }
        logger.info('Mock server stopped');
    }

    public reset(): void {
        this.currentLine = 0;
        logger.info('Mock server reset');
    }

    public simulateDisconnect(): void {
        logger.warn('Simulating server disconnect...');
        this.stop();
    }

    public simulateReconnect(): void {
        logger.info('Simulating server reconnect...');
        this.start();
    }
}

/**
 * Test WebSocket with refresh logic
 */
async function testWebSocketWithRefresh(): Promise<void> {
    logger.info('============================================================');
    logger.info('Test: WebSocket with Refresh Logic');
    logger.info('============================================================');

    // Initialize data format
    const protoPath = path.join(__dirname, 'renderer/schemes2/message2.proto');
    await dataFormat.initialize(protoPath);
    logger.info('✓ Data format initialized');

    // Create match state manager
    const matchStateManager = new MatchStateManager();
    logger.info('✓ Match state manager created');

    // Create message dispatcher with refresh logic
    const dispatcher = new MessageDispatcher((message, reconnecting) => {
        logger.info('📨 Message received from dispatcher');
        logger.info(`   Reconnecting: ${reconnecting}`);
        logger.info(`   Match ID: ${message.matchId ? Array.from(message.matchId).slice(0, 4).join(',') : 'null'}`);
        logger.info(`   Tournament ID: ${message.tournamentId}`);

        // Check if refresh is needed
        if (message.matchId) {
            const shouldRefresh = matchStateManager.shouldRefresh(message.matchId);
            
            if (shouldRefresh) {
                logger.warn('🔄 REFRESH TRIGGERED - Match ID changed!');
            } else if (reconnecting) {
                logger.info('🔌 Reconnected - but same match, NO REFRESH');
            } else {
                logger.info('✓ Same match - continue updating');
            }

            // Update state
            matchStateManager.updateState(message.matchId, message.tournamentId || '');
        }
    });

    dispatcher.start();
    logger.info('✓ Message dispatcher started');

    // Create mock server
    const mockServer = new MockWebSocketServer();
    await mockServer.loadTestData();

    // Simulate WebSocket messages
    mockServer.onMessage((wsMessage) => {
        try {
            const parsed = JSON.parse(wsMessage);
            if (parsed.code === 200 && parsed.data) {
                dispatcher.enqueue({ reconnecting: false, data: parsed.data });
            }
        } catch (error) {
            logger.error(`Failed to parse message: ${error}`);
        }
    });

    // Test scenario 1: Normal operation
    logger.info('\n--- Scenario 1: Normal operation (5 messages) ---');
    mockServer.start();

    await new Promise(resolve => setTimeout(resolve, 8000)); // Wait for 5 messages
    mockServer.stop();

    logger.info('\n--- Scenario 2: Simulate disconnect and reconnect ---');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate reconnection with same match
    logger.info('Simulating reconnection (same match)...');
    mockServer.reset();
    mockServer.start();

    // First message after reconnect should have reconnecting=true
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Manually enqueue with reconnecting flag
    const reconnectLine = mockServer['testLines'][0];
    dispatcher.enqueue({ reconnecting: true, data: reconnectLine });
    logger.info('Enqueued reconnection message with reconnecting=true');

    await new Promise(resolve => setTimeout(resolve, 3000));
    mockServer.stop();

    logger.info('\n--- Scenario 3: Match ID change (should trigger refresh) ---');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create a fake message with different match ID
    const fakeMessage = {
        matchId: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
        tournamentId: 'different-tournament',
        refresh: true
    };

    const fakeJsonData = JSON.stringify(fakeMessage);
    dispatcher.enqueue({ reconnecting: false, data: fakeJsonData });
    logger.info('Enqueued message with different match ID');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Cleanup
    dispatcher.stop();
    mockServer.stop();

    logger.info('\n✓ WebSocket refresh logic test completed');
}

/**
 * Test reconnection scenarios
 */
async function testReconnectionScenarios(): Promise<void> {
    logger.info('\n============================================================');
    logger.info('Test: Reconnection Scenarios');
    logger.info('============================================================');

    const protoPath = path.join(__dirname, 'renderer/schemes2/message2.proto');
    await dataFormat.initialize(protoPath);

    const matchStateManager = new MatchStateManager();
    let messageCount = 0;

    const dispatcher = new MessageDispatcher((message, reconnecting) => {
        messageCount++;
        logger.info(`\n📨 Message #${messageCount}`);
        logger.info(`   Reconnecting: ${reconnecting}`);
        logger.info(`   Match ID: ${message.matchId ? 'present' : 'null'}`);
        logger.info(`   Tournament ID: ${message.tournamentId}`);

        if (message.matchId) {
            const shouldRefresh = matchStateManager.shouldRefresh(message.matchId);

            if (shouldRefresh) {
                logger.warn('   🔄 REFRESH: Match ID changed');
            } else if (reconnecting) {
                logger.info('   🔌 RECONNECTED: Same match, no refresh');
            } else {
                logger.info('   ✓ UPDATE: Same match, continue');
            }

            matchStateManager.updateState(message.matchId, message.tournamentId || '');
        }
    });

    dispatcher.start();

    // Load test data
    const testDataPath = path.join(__dirname, 'renderer/test-data_smash.txt');
    const content = fs.readFileSync(testDataPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    logger.info(`\nLoaded ${lines.length} test messages\n`);

    // Scenario 1: Initial messages
    logger.info('--- Scenario 1: Initial connection (3 messages) ---');
    for (let i = 0; i < 3; i++) {
        dispatcher.enqueue({ reconnecting: false, data: lines[i] });
        await new Promise(resolve => setTimeout(resolve, 1600));
    }

    // Scenario 2: Disconnect and reconnect (same match)
    logger.info('\n--- Scenario 2: Disconnect and reconnect (same match) ---');
    await new Promise(resolve => setTimeout(resolve, 1000));
    logger.warn('⚠️  Connection lost...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    logger.info('🔌 Reconnecting...');

    // First message after reconnect has reconnecting=true
    dispatcher.enqueue({ reconnecting: true, data: lines[3] });
    await new Promise(resolve => setTimeout(resolve, 1600));

    // Subsequent messages have reconnecting=false
    dispatcher.enqueue({ reconnecting: false, data: lines[4] });
    await new Promise(resolve => setTimeout(resolve, 1600));

    // Cleanup
    dispatcher.stop();
    logger.info('\n✓ Reconnection scenarios test completed');
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
    try {
        await testWebSocketWithRefresh();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await testReconnectionScenarios();

        logger.info('\n============================================================');
        logger.info('All WebSocket Tests Completed Successfully!');
        logger.info('============================================================');
    } catch (error) {
        logger.error('Test failed:', error);
        process.exit(1);
    }
}

// Run tests
runTests();

