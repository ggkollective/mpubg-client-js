/**
 * 렌더러 프로세스에서 사용할 프로토콜 버퍼 클라이언트
 * 메인 프로세스와 IPC 통신을 통해 프로토콜 버퍼 작업을 수행
 */
export class RendererProtobuf {
    /**
     * 메시지 인코딩 (메인 프로세스에 요청)
     */
    static async encode(messageType: string, data: any): Promise<Uint8Array> {
        if (typeof window !== 'undefined' && (window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            const result = await ipcRenderer.invoke('protobuf-encode', messageType, data);
            return new Uint8Array(result);
        }
        throw new Error('This method can only be used in renderer process');
    }

    /**
     * 메시지 디코딩 (메인 프로세스에 요청)
     */
    static async decode(messageType: string, data: Uint8Array): Promise<any> {
        if (typeof window !== 'undefined' && (window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            return await ipcRenderer.invoke('protobuf-decode', messageType, Array.from(data));
        }
        throw new Error('This method can only be used in renderer process');
    }

    /**
     * JSON 변환 (메인 프로세스에 요청)
     */
    static async toJSON(messageType: string, data: Uint8Array): Promise<any> {
        if (typeof window !== 'undefined' && (window as any).require) {
            const { ipcRenderer } = (window as any).require('electron');
            return await ipcRenderer.invoke('protobuf-to-json', messageType, Array.from(data));
        }
        throw new Error('This method can only be used in renderer process');
    }

    /**
     * ObserverMessage2 생성 및 인코딩 헬퍼
     */
    static async encodeObserverMessage(data: any): Promise<Uint8Array> {
        return await this.encode('ObserverMessage2', data);
    }

    /**
     * ObserverMessage2 디코딩 헬퍼
     */
    static async decodeObserverMessage(data: Uint8Array): Promise<any> {
        return await this.decode('ObserverMessage2', data);
    }

    /**
     * Player2 메시지 인코딩 헬퍼
     */
    static async encodePlayer(data: any): Promise<Uint8Array> {
        return await this.encode('Player2', data);
    }

    /**
     * Player2 메시지 디코딩 헬퍼
     */
    static async decodePlayer(data: Uint8Array): Promise<any> {
        return await this.decode('Player2', data);
    }

    /**
     * Team2 메시지 인코딩 헬퍼
     */
    static async encodeTeam(data: any): Promise<Uint8Array> {
        return await this.encode('Team2', data);
    }

    /**
     * Team2 메시지 디코딩 헬퍼
     */
    static async decodeTeam(data: Uint8Array): Promise<any> {
        return await this.decode('Team2', data);
    }
}

/**
 * 렌더러 프로세스에서 웹소켓 통신을 위한 헬퍼 클래스
 */
export class RendererWebSocketProtobuf {
    private ws: WebSocket | null = null;

    /**
     * 웹소켓 연결
     */
    connect(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                resolve();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };

            this.ws.onmessage = async (event) => {
                try {
                    const buffer = new Uint8Array(event.data);
                    
                    // ObserverMessage2로 디코딩 시도
                    const message = await RendererProtobuf.decodeObserverMessage(buffer);
                    console.log('Received ObserverMessage2:', message);
                    
                    // 커스텀 이벤트 발생
                    window.dispatchEvent(new CustomEvent('protobuf-message', {
                        detail: { type: 'ObserverMessage2', data: message }
                    }));
                } catch (error) {
                    console.error('Failed to decode WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.ws = null;
            };
        });
    }

    /**
     * ObserverMessage2 전송
     */
    async sendObserverMessage(data: any): Promise<void> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket is not connected');
        }

        try {
            const encoded = await RendererProtobuf.encodeObserverMessage(data);
            this.ws.send(encoded);
        } catch (error) {
            console.error('Failed to send ObserverMessage2:', error);
            throw error;
        }
    }

    /**
     * 연결 해제
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * 연결 상태 확인
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

// 전역 객체로 내보내기 (렌더러 프로세스에서 쉽게 사용하기 위해)
if (typeof window !== 'undefined') {
    (window as any).RendererProtobuf = RendererProtobuf;
    (window as any).RendererWebSocketProtobuf = RendererWebSocketProtobuf;
}
