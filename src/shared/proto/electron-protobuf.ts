import { ProtobufUtils, ProtobufCommunication } from './protobuf-utils';
import { join } from 'path';

// CommonJS에서 __dirname은 전역 변수로 사용 가능
declare const __dirname: string;

/**
 * 일렉트론에서 프로토콜 버퍼를 사용하기 위한 클래스
 */
export class ElectronProtobuf {
    private communication: ProtobufCommunication | null = null;
    private isInitialized: boolean = false;

    /**
     * 프로토콜 버퍼 초기화
     */
    async initialize(protoFilePath?: string): Promise<void> {
        try {
            const defaultProtoPath = join(__dirname, 'renderer/schemes2/message2.proto');
            const protoPath = protoFilePath || defaultProtoPath;

            console.log('Current __dirname:', __dirname);
            console.log('Trying to load proto file from:', protoPath);

            const root = await ProtobufUtils.loadProtoFile(protoPath);
            this.communication = new ProtobufCommunication(root);
            this.isInitialized = true;

            console.log('Electron Protocol Buffer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Electron Protocol Buffer:', error);
            throw error;
        }
    }

    /**
     * 웹소켓 연결 및 프로토콜 버퍼 통신
     */
    createWebSocketConnection(url: string): WebSocket {
        if (!this.communication) {
            throw new Error('Protocol Buffer not initialized');
        }

        const ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const buffer = new Uint8Array(event.data);
                
                // 웹소켓 메시지 디코딩
                const wsMessage = this.communication!.parseMessage('livestanding.WebSocketMessage', buffer);
                console.log('Received WebSocket message:', wsMessage);

                // 페이로드 처리
                if (wsMessage.payload) {
                    // 페이로드 타입에 따라 적절히 디코딩
                    if (wsMessage.type === 'live_update') {
                        const liveUpdate = this.communication!.parseMessage('livestanding.LiveStandingUpdate', wsMessage.payload);
                        console.log('Live update:', liveUpdate);
                    }
                }
            } catch (error) {
                console.error('Failed to decode WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
        };

        return ws;
    }

    /**
     * 웹소켓으로 메시지 전송
     */
    sendWebSocketMessage(ws: WebSocket, messageType: string, data: any): void {
        if (!this.communication) {
            throw new Error('Protocol Buffer not initialized');
        }

        try {
            // 메시지 인코딩
            const payload = this.communication.prepareMessage(messageType, data);

            // 웹소켓 메시지로 래핑
            const wsMessage = {
                type: messageType,
                payload: payload,
                timestamp: Date.now()
            };

            const encodedWsMessage = this.communication.prepareMessage('livestanding.WebSocketMessage', wsMessage);
            
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(encodedWsMessage);
            } else {
                console.error('WebSocket is not open');
            }
        } catch (error) {
            console.error('Failed to send WebSocket message:', error);
        }
    }
}



// 전역 인스턴스
export const electronProtobuf = new ElectronProtobuf();
