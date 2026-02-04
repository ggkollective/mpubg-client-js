# Module Implementation Summary

## Overview
Three core modules have been successfully implemented for the mpubg-client-js Electron application:
1. **Logging Module** - Using electron-log
2. **Data Format Module** - Protocol Buffer handling
3. **Message Dispatcher Module** - Queue-based message processing with 1.5s intervals

## 1. Logging Module (`src/shared/logger.ts`)

### Features
- Uses `electron-log` library (v5.4.3)
- Unified logging across Main and Renderer processes
- Automatic log file management
- Multiple log levels: error, warn, info, debug, verbose

### Usage
```typescript
import { logger } from './shared/logger';

logger.info('Information message');
logger.error('Error message', errorObject);
logger.debug('Debug message');
```

### Configuration
- Log files stored in: `{userData}/logs/mpubg.log`
- Max file size: 10MB
- Console log level: debug
- File log level: info

## 2. Data Format Module (`src/shared/data-format.ts`)

### Features
- Protocol Buffer message parsing using protobufjs (v7.5.4)
- Compatible with Python 3.12 + protobuf==6.33.4
- JSON to Protocol Buffer conversion
- Binary encoding/decoding support

### Usage
```typescript
import { dataFormat } from './shared/data-format';

// Initialize
await dataFormat.initialize();

// Parse JSON to ObserverMessage2
const message = dataFormat.parseFromJson(jsonString);

// Encode/Decode binary
const buffer = dataFormat.encode(message);
const decoded = dataFormat.decode(buffer);
```

### Protocol Buffer Schema
- Location: `src/shared/schemes2/message2.proto`
- Main message type: `ObserverMessage2`
- Includes: player stats, team stats, match info

## 3. Message Dispatcher Module (`src/shared/message-dispatcher.ts`)

### Features
- Queue-based message processing
- 100ms timer check interval
- 1.5 second processing interval (matching WPF implementation)
- Automatic deduplication (takes latest if multiple messages in queue)
- Callback-based message delivery

### Usage
```typescript
import { MessageDispatcher } from './shared/message-dispatcher';

// Create dispatcher with callback
const dispatcher = new MessageDispatcher((message, reconnecting) => {
    console.log('Received message:', message);
});

// Start processing
dispatcher.start();

// Enqueue messages
dispatcher.enqueue({ reconnecting: false, data: jsonString });

// Stop processing
dispatcher.stop();
```

### Implementation Details
- Based on WPF `MessageDispatcher.cs` implementation
- Processes messages every 1.5 seconds
- Deduplication: if queue has multiple messages, takes the latest one
- Parses JSON to ObserverMessage2 before callback

## 4. Test Runner Module (`src/shared/test-runner.ts`)

### Features
- Reads test data file line by line
- Feeds data to MessageDispatcher at 1.5s intervals
- Simulates live data streaming
- Based on WPF `OnRunTest` implementation

### Usage
```typescript
import { TestRunner } from './shared/test-runner';

const testRunner = new TestRunner(dispatcher);
await testRunner.start();  // Start playback
testRunner.stop();          // Stop playback
```

### Test Data
- Location: `src/assets/test-data_smash.txt`
- Format: One JSON message per line
- 102 lines of test data
- Contains real PUBG tournament data

## Testing

### Run Tests
```bash
npm run test-modules
```

### Test Results
✅ All modules tested successfully:
- Logger module: ✓
- Data format module: ✓
- Message dispatcher module: ✓
- Full integration test: ✓

### Test Output
- Messages are dequeued every 1.5 seconds
- Each message shows:
  - Match ID
  - Tournament ID
  - Team count (16 teams)
  - Player count (64 players)
  - Refresh flag

## File Structure
```
mpubg-client-js/
├── src/
│   ├── shared/
│   │   ├── logger.ts              # Logging module
│   │   ├── data-format.ts         # Data format module
│   │   ├── message-dispatcher.ts  # Message dispatcher
│   │   ├── test-runner.ts         # Test runner
│   │   ├── proto/                 # Proto utilities
│   │   └── schemes2/              # Proto schemas
│   ├── assets/
│   │   └── test-data_smash.txt    # Test data
│   └── test-modules.ts            # Test script
└── package.json
```

## 5. WebSocket Client Module (`src/shared/websocket-client.ts`)

### Features
- WebSocket 연결 및 자동 재연결 (3초 간격)
- 연결 상태 관리 (Disconnected, Connecting, Connected)
- 인증 메시지 자동 전송
- 재연결 플래그 관리

### Usage
```typescript
import { WebSocketClient, ConnectionStatus } from './shared/websocket-client';

const wsClient = new WebSocketClient('localhost:8080', false);

wsClient
    .onConnect((succeed, reconnect, message) => {
        console.log(`Connected: ${succeed}, Reconnect: ${reconnect}`);
    })
    .onMessage((data, reconnecting) => {
        dispatcher.enqueue({ reconnecting, data });
    })
    .onDisconnect((closedByUser) => {
        if (!closedByUser) console.log('Will auto-reconnect');
    });

wsClient.connect('access-token');
```

### Connection Flow
1. `connect(accessToken)` → WebSocket 연결
2. 연결 성공 → 자동 `authenticate()` 호출
3. 서버 code 201 → 인증 성공
4. 서버 code 200 + data → 메시지 수신
5. 연결 끊김 → 자동 재연결 (3초 후)

## 6. Match State Manager Module (`src/shared/match-state-manager.ts`)

### Features
- 현재 매치 ID 추적
- 매치 ID 변경 감지
- **재연결 시 refresh 방지** (핵심 기능)

### Usage
```typescript
import { MatchStateManager } from './shared/match-state-manager';

const matchStateManager = new MatchStateManager();

// Check if refresh is needed
const shouldRefresh = matchStateManager.shouldRefresh(newMatchId);

if (shouldRefresh) {
    console.log('Match changed - refresh UI');
} else {
    console.log('Same match - update UI');
}

// Update state
matchStateManager.updateState(matchId, tournamentId);
```

### Refresh Logic
**Refresh가 필요한 경우:**
- ✅ 매치 ID가 변경되었을 때

**Refresh가 필요하지 않은 경우:**
- ❌ 첫 메시지 수신 시
- ❌ 재연결 후 같은 매치 ID를 받았을 때
- ❌ 같은 매치 ID의 업데이트 메시지

## Dependencies
- `electron-log`: ^5.4.3 - Logging
- `protobufjs`: ^7.5.4 - Protocol Buffer handling
- `ws`: ^8.x - WebSocket client library
- `@types/ws`: ^8.x - TypeScript type definitions

## Testing

### Run All Tests
```bash
# Test core modules (logger, data format, dispatcher)
npm run test-modules

# Test WebSocket and refresh logic
npm run test-websocket
```

### WebSocket Test Scenarios
1. **정상 작동**: 여러 메시지 수신 및 처리
2. **재연결 (같은 매치)**: 재연결 후 refresh 되지 않음 확인 ✓
3. **매치 변경**: 다른 매치 ID 수신 시 refresh 트리거 확인 ✓

### Test Results
```
--- Scenario 1: Initial connection (3 messages) ---
📨 Message #1
   Reconnecting: false
   ✓ UPDATE: Same match, continue

--- Scenario 2: Disconnect and reconnect (same match) ---
⚠️  Connection lost...
🔌 Reconnecting...
📨 Message #4
   Reconnecting: true
   🔌 RECONNECTED: Same match, no refresh ✓

--- Scenario 3: Match ID change ---
📨 Message #5
   🔄 REFRESH: Match ID changed ✓
```

## Integration Example

```typescript
import { WebSocketClient } from './shared/websocket-client';
import { MessageDispatcher } from './shared/message-dispatcher';
import { MatchStateManager } from './shared/match-state-manager';
import { dataFormat } from './shared/data-format';

// Initialize
await dataFormat.initialize();
const matchStateManager = new MatchStateManager();

// Create dispatcher with refresh logic
const dispatcher = new MessageDispatcher((message, reconnecting) => {
    if (message.matchId) {
        const shouldRefresh = matchStateManager.shouldRefresh(message.matchId);

        if (shouldRefresh) {
            console.log('🔄 REFRESH: Match changed');
            clearLeaderboard();
        } else if (reconnecting) {
            console.log('🔌 RECONNECTED: Same match, no refresh');
        } else {
            console.log('✓ UPDATE: Continue');
        }

        matchStateManager.updateState(message.matchId, message.tournamentId || '');
        updateLeaderboard(message);
    }
});

// Create WebSocket client
const wsClient = new WebSocketClient('your-host', false);

wsClient
    .onMessage((data, reconnecting) => {
        dispatcher.enqueue({ reconnecting, data });
    })
    .onDisconnect((closedByUser) => {
        if (!closedByUser) {
            console.log('Connection lost - will auto-reconnect');
        }
    });

// Start
dispatcher.start();
wsClient.connect('your-access-token');
```

## Next Steps
1. ✅ WebSocket 모듈 구현 완료
2. ✅ Refresh 로직 구현 및 테스트 완료
3. Connect dispatcher to UI components
4. Implement leaderboard updates based on messages
5. Add animation triggers for rank changes, kills, eliminations

