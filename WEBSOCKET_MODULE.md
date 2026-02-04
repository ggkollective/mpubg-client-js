# WebSocket Module Documentation

## Overview
WebSocket 모듈은 PUBG 토너먼트 데이터를 실시간으로 수신하고, 연결 관리 및 재연결 로직을 처리합니다.

**핵심 기능:**
- WebSocket 연결 및 자동 재연결
- 매치 ID 기반 refresh 로직 (재연결 시 refresh 방지)
- 연결 상태 관리 및 콜백

## Modules

### 1. WebSocketClient (`src/shared/websocket-client.ts`)

WebSocket 연결을 관리하는 클라이언트 모듈입니다.

#### Features
- 자동 재연결 (3초 간격)
- 연결 상태 추적 (Disconnected, Connecting, Connected)
- 인증 메시지 자동 전송
- 재연결 플래그 관리

#### Usage
```typescript
import { WebSocketClient, ConnectionStatus } from './shared/websocket-client';

// Create client
const wsClient = new WebSocketClient('localhost:8080', false); // false = ws://, true = wss://

// Set callbacks
wsClient
    .onConnect((succeed, reconnect, message) => {
        console.log(`Connected: ${succeed}, Reconnect: ${reconnect}`);
    })
    .onDisconnect((closedByUser) => {
        console.log(`Disconnected: ${closedByUser ? 'by user' : 'by error'}`);
    })
    .onMessage((data, reconnecting) => {
        console.log(`Message received, reconnecting: ${reconnecting}`);
        // data is the JSON string from server
    })
    .onStatusChange((status) => {
        console.log(`Status changed: ${status}`);
    });

// Connect
wsClient.connect('your-access-token');

// Send message
wsClient.sendMessage(JSON.stringify({ type: 'ping' }));

// Close
wsClient.close();
```

#### Connection Flow
1. `connect(accessToken)` → WebSocket 연결 시작
2. 연결 성공 → 자동으로 `authenticate()` 호출
3. 서버가 code 201 응답 → 인증 성공
4. 서버가 code 200 + data 응답 → 메시지 수신
5. 연결 끊김 → 자동 재연결 (3초 후)

#### Reconnection Logic
- **자동 재연결**: 사용자가 닫지 않은 경우 자동으로 재연결
- **재연결 플래그**: 재연결 후 첫 메시지는 `reconnecting=true`로 전달
- **플래그 초기화**: 첫 메시지 이후 `reconnecting=false`로 변경

### 2. MatchStateManager (`src/shared/match-state-manager.ts`)

매치 상태를 관리하고 refresh 여부를 결정하는 모듈입니다.

#### Features
- 현재 매치 ID 추적
- 매치 ID 변경 감지
- **재연결 시 refresh 방지** (핵심 기능)

#### Usage
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

// Clear state (on disconnect)
matchStateManager.clear();
```

#### Refresh Logic
**Refresh가 필요한 경우:**
- ✅ 매치 ID가 변경되었을 때

**Refresh가 필요하지 않은 경우:**
- ❌ 첫 메시지 수신 시
- ❌ 재연결 후 같은 매치 ID를 받았을 때
- ❌ 같은 매치 ID의 업데이트 메시지

#### Example Scenarios

**Scenario 1: 정상 연결**
```
1. 첫 메시지: matchId=A → shouldRefresh=false (첫 메시지)
2. 두 번째 메시지: matchId=A → shouldRefresh=false (같은 매치)
3. 세 번째 메시지: matchId=A → shouldRefresh=false (같은 매치)
```

**Scenario 2: 재연결 (같은 매치)**
```
1. 연결 중: matchId=A
2. 연결 끊김
3. 재연결 성공
4. 첫 메시지: matchId=A, reconnecting=true → shouldRefresh=false ✓
   (같은 매치이므로 refresh 하지 않음)
```

**Scenario 3: 매치 변경**
```
1. 현재 매치: matchId=A
2. 새 메시지: matchId=B → shouldRefresh=true ✓
   (매치가 변경되었으므로 refresh 필요)
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
            // Clear UI and reload
            console.log('🔄 REFRESH: Match changed');
            clearLeaderboard();
        } else if (reconnecting) {
            // Just reconnected, same match
            console.log('🔌 RECONNECTED: Same match, no refresh');
        } else {
            // Normal update
            console.log('✓ UPDATE: Continue');
        }

        // Update state
        matchStateManager.updateState(message.matchId, message.tournamentId || '');
        
        // Update UI
        updateLeaderboard(message);
    }
});

// Create WebSocket client
const wsClient = new WebSocketClient('your-host', false);

wsClient
    .onMessage((data, reconnecting) => {
        // Enqueue message with reconnecting flag
        dispatcher.enqueue({ reconnecting, data });
    })
    .onDisconnect((closedByUser) => {
        if (!closedByUser) {
            console.log('Connection lost - will auto-reconnect');
        }
    });

// Connect
dispatcher.start();
wsClient.connect('your-access-token');
```

## Testing

### Run Tests
```bash
npm run test-websocket
```

### Test Scenarios
테스트는 다음 시나리오를 검증합니다:

1. **정상 작동**: 여러 메시지 수신 및 처리
2. **재연결 (같은 매치)**: 재연결 후 refresh 되지 않음 확인
3. **매치 변경**: 다른 매치 ID 수신 시 refresh 트리거 확인

### Test Output Example
```
--- Scenario 1: Normal operation (5 messages) ---
📨 Message #1
   Reconnecting: false
   Match ID: present
   ✓ UPDATE: Same match, continue

--- Scenario 2: Disconnect and reconnect (same match) ---
⚠️  Connection lost...
🔌 Reconnecting...
📨 Message #2
   Reconnecting: true
   Match ID: present
   🔌 RECONNECTED: Same match, no refresh

--- Scenario 3: Match ID change ---
📨 Message #3
   Reconnecting: false
   Match ID: present
   🔄 REFRESH: Match ID changed
```

## File Structure
```
mpubg-client-js/
├── src/shared/
│   ├── websocket-client.ts      # WebSocket 클라이언트
│   ├── match-state-manager.ts   # 매치 상태 관리
│   ├── message-dispatcher.ts    # 메시지 디스패처
│   └── data-format.ts           # Protocol Buffer 파싱
├── src/test-websocket.ts        # WebSocket 테스트
└── WEBSOCKET_MODULE.md          # 이 문서
```

## Dependencies
- `ws`: ^8.x - WebSocket 클라이언트 라이브러리
- `@types/ws`: ^8.x - TypeScript 타입 정의

## Next Steps
1. 실제 WebSocket 서버와 연결 테스트
2. UI 컴포넌트와 통합
3. 에러 핸들링 강화
4. 재연결 재시도 횟수 제한 추가

