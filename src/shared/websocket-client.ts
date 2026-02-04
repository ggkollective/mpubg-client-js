/**
 * WebSocket Client Module
 * 
 * Handles WebSocket connection, reconnection, and message handling
 * Based on WPF WebSocketWrapper.cs implementation
 */

import { logger } from './logger';
import WebSocket from 'ws';

export enum ConnectionStatus {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
}

export interface WebSocketMessage {
    code: number;
    data?: string;
    message?: string;
}

export type OnConnectCallback = (succeed: boolean, reconnect: boolean, message: string) => void;
export type OnDisconnectCallback = (closedByUser: boolean) => void;
export type OnMessageCallback = (data: string, reconnecting: boolean) => void;
export type OnStatusChangeCallback = (status: ConnectionStatus) => void;

/**
 * WebSocket Client
 * Manages connection, reconnection, and message handling
 */
export class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string = '';
    private accessToken: string = '';
    private closedByUser: boolean = false;
    private connected: boolean = false;
    private reconnecting: boolean = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private reconnectDelay: number = 3000; // 3 seconds

    // Callbacks
    private onConnectCallback: OnConnectCallback | null = null;
    private onDisconnectCallback: OnDisconnectCallback | null = null;
    private onMessageCallback: OnMessageCallback | null = null;
    private onStatusChangeCallback: OnStatusChangeCallback | null = null;

    /**
     * Constructor
     * @param host - WebSocket host (e.g., "localhost:8080")
     * @param useSSL - Use wss:// instead of ws://
     */
    constructor(host: string, useSSL: boolean = false) {
        const protocol = useSSL ? 'wss' : 'ws';
        this.url = `${protocol}://${host}/api/v1/broadcast`;
        logger.info(`WebSocketClient initialized: url=${this.url}`);
    }

    /**
     * Set connection callback
     */
    public onConnect(callback: OnConnectCallback): this {
        this.onConnectCallback = callback;
        return this;
    }

    /**
     * Set disconnect callback
     */
    public onDisconnect(callback: OnDisconnectCallback): this {
        this.onDisconnectCallback = callback;
        return this;
    }

    /**
     * Set message callback
     */
    public onMessage(callback: OnMessageCallback): this {
        this.onMessageCallback = callback;
        return this;
    }

    /**
     * Set status change callback
     */
    public onStatusChange(callback: OnStatusChangeCallback): this {
        this.onStatusChangeCallback = callback;
        return this;
    }

    /**
     * Connect to WebSocket server
     */
    public connect(accessToken: string): void {
        this.accessToken = accessToken;
        this.closedByUser = false;
        this.connectAsync(false);
    }

    /**
     * Reconnect to WebSocket server
     */
    public reconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(() => {
            logger.info('Attempting to reconnect...');
            this.connectAsync(true);
        }, this.reconnectDelay);
    }

    /**
     * Send authentication message
     */
    public authenticate(): void {
        const message = JSON.stringify({ access_token: this.accessToken });
        logger.info(`Sending authentication: message=${message}`);
        this.sendMessage(message);
    }

    /**
     * Send message to server
     */
    public sendMessage(message: string): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            logger.error('Cannot send message: WebSocket is not open');
            throw new Error('Connection is not open');
        }

        this.ws.send(message);
    }

    /**
     * Close connection
     */
    public close(): void {
        this.closedByUser = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
        }
    }

    /**
     * Get connection status
     */
    public isConnected(): boolean {
        return this.connected;
    }

    /**
     * Get access token
     */
    public getAccessToken(): string {
        return this.accessToken;
    }

    /**
     * Internal: Connect to WebSocket server
     */
    private connectAsync(reconnect: boolean): void {
        this.reconnecting = reconnect;
        this.updateStatus(ConnectionStatus.Connecting);

        try {
            this.ws = new WebSocket(this.url);

            this.ws.on('open', () => {
                logger.info('WebSocket connection opened');
                this.handleConnect(true, reconnect, 'OK');
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                const message = data.toString();
                this.handleMessage(message);
            });

            this.ws.on('close', () => {
                logger.info('WebSocket connection closed');
                this.handleDisconnect(this.closedByUser);
            });

            this.ws.on('error', (error: Error) => {
                logger.error(`WebSocket error: ${error.message}`);
                this.handleConnect(false, reconnect, error.message);
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to create WebSocket: ${errorMessage}`);
            this.handleConnect(false, reconnect, errorMessage);
        }
    }

    /**
     * Internal: Handle connection event
     */
    private handleConnect(succeed: boolean, reconnect: boolean, message: string): void {
        logger.info(`handleConnect: succeed=${succeed}, reconnect=${reconnect}, message=${message}`);

        if (!succeed) {
            this.handleDisconnect(false);
            return;
        }

        // Automatically authenticate after connection
        this.authenticate();
    }

    /**
     * Internal: Handle disconnect event
     */
    private handleDisconnect(closedByUser: boolean): void {
        logger.info(`handleDisconnect: closedByUser=${closedByUser}`);

        if (this.onDisconnectCallback) {
            this.onDisconnectCallback(closedByUser);
        }

        // Auto-reconnect if not closed by user and was previously connected
        if (this.connected && !closedByUser) {
            this.updateStatus(ConnectionStatus.Connecting);
            this.reconnect();
        } else {
            this.connected = false;
            this.updateStatus(ConnectionStatus.Disconnected);
        }
    }

    /**
     * Internal: Handle incoming message
     */
    private handleMessage(wsMessage: string): void {
        logger.debug(`Received message: ${wsMessage}`);

        try {
            const jsonMessage: WebSocketMessage = JSON.parse(wsMessage);
            const code = jsonMessage.code ?? -1;

            // Code 201: Connection established, need authentication
            if (code === 201) {
                this.handleAuthentication();
                return;
            }

            // Code 200: Normal message with data
            if (code === 200) {
                const eventData = jsonMessage.data ?? '';
                if (!eventData) {
                    logger.warn('Received message with code 200 but no data');
                    return;
                }

                // Pass reconnecting flag to callback
                if (this.onMessageCallback) {
                    this.onMessageCallback(eventData, this.connected && this.reconnecting);
                }

                // Clear reconnecting flag after first message
                if (this.reconnecting) {
                    this.reconnecting = false;
                }
                return;
            }

            // Other codes: Error
            logger.error(`Received error code: ${code}, message: ${jsonMessage.message ?? 'Unknown'}`);
            this.updateStatus(ConnectionStatus.Disconnected);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to parse message: ${errorMessage}, message=${wsMessage}`);
            this.updateStatus(ConnectionStatus.Disconnected);
        }
    }

    /**
     * Internal: Handle authentication success
     */
    private handleAuthentication(): void {
        logger.info(`Authentication successful: token=${this.accessToken}`);
        this.connected = true;
        this.updateStatus(ConnectionStatus.Connected);

        if (this.onConnectCallback) {
            this.onConnectCallback(true, this.reconnecting, 'Authenticated');
        }
    }

    /**
     * Internal: Update connection status
     */
    private updateStatus(status: ConnectionStatus): void {
        if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(status);
        }
    }
}

