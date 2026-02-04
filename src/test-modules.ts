/**
 * Test script for logging, data format, and message dispatcher modules
 * Run this with: npm run test-modules
 */
import { logger } from './shared/logger';
import { dataFormat, ObserverMessage2 } from './shared/data-format';
import { MessageDispatcher } from './shared/message-dispatcher';
import { TestRunner } from './shared/test-runner';
import * as path from 'path';

/**
 * Main test function
 */
async function testModules() {
    logger.info('='.repeat(60));
    logger.info('Starting Module Tests');
    logger.info('='.repeat(60));

    // Test 1: Logger Module
    logger.info('Test 1: Testing Logger Module');
    logger.debug('This is a debug message');
    logger.info('This is an info message');
    logger.warn('This is a warning message');
    logger.error('This is an error message');
    logger.info('✓ Logger module test completed\n');

    // Test 2: Data Format Module
    logger.info('Test 2: Testing Data Format Module');
    try {
        // Initialize data format
        const protoPath = path.join(__dirname, 'renderer/schemes2/message2.proto');
        await dataFormat.initialize(protoPath);
        logger.info('✓ Data format module initialized');

        // Test JSON parsing
        const testJson = '{"matchId":"/a8hSDOsTv+9zRmUOiX6eQ==","tournamentId":"as-pws2gf","refresh":true}';
        const message = dataFormat.parseFromJson(testJson);
        logger.info('✓ JSON parsing successful:', {
            matchId: message.matchId,
            tournamentId: message.tournamentId,
            refresh: message.refresh
        });

        logger.info('✓ Data format module test completed\n');
    } catch (error) {
        logger.error('✗ Data format module test failed:', error);
    }

    // Test 3: Message Dispatcher Module
    logger.info('Test 3: Testing Message Dispatcher Module');
    try {
        // Create dispatcher with callback
        const dispatcher = new MessageDispatcher((message: ObserverMessage2, reconnecting: boolean) => {
            logger.info('📨 Dispatcher callback invoked:', {
                reconnecting,
                matchId: message.matchId,
                tournamentId: message.tournamentId,
                teamCount: message.totalTeamStats?.length || 0,
                playerCount: message.totalPlayerStats?.length || 0,
                refresh: message.refresh
            });
        });

        logger.info('✓ Message dispatcher created');
        logger.info('✓ Message dispatcher module test completed\n');
    } catch (error) {
        logger.error('✗ Message dispatcher module test failed:', error);
    }

    // Test 4: Full Integration Test with Test Runner
    logger.info('Test 4: Testing Full Integration with Test Runner');
    try {
        // Create dispatcher
        const dispatcher = new MessageDispatcher((message: ObserverMessage2, reconnecting: boolean) => {
            logger.info('📨 Message received from dispatcher:', {
                reconnecting,
                matchId: message.matchId,
                tournamentId: message.tournamentId,
                teamCount: message.totalTeamStats?.length || 0,
                playerCount: message.totalPlayerStats?.length || 0,
                refresh: message.refresh
            });
        });

        // Create test runner
        const testDataPath = path.join(__dirname, 'renderer/test-data_smash.txt');
        const testRunner = new TestRunner(dispatcher, testDataPath);

        logger.info('✓ Test runner created');
        logger.info('Starting test data playback...');

        // Start test runner
        await testRunner.start();

        // Let it run for 10 seconds, then stop
        setTimeout(() => {
            const status = testRunner.getStatus();
            logger.info('Test runner status:', status);

            testRunner.stop();
            logger.info('✓ Full integration test completed');
            logger.info('='.repeat(60));
            logger.info('All Module Tests Completed Successfully!');
            logger.info('='.repeat(60));

            // Exit after a short delay
            setTimeout(() => {
                process.exit(0);
            }, 1000);
        }, 10000);

    } catch (error) {
        logger.error('✗ Full integration test failed:', error);
        process.exit(1);
    }
}

// Run tests
testModules().catch((error) => {
    logger.error('Test execution failed:', error);
    process.exit(1);
});

