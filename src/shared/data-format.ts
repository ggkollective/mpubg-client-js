/**
 * Data Format Module
 * Handles Protocol Buffer message parsing and encoding
 * Compatible with Python 3.12 + protobuf==6.33.4
 */
import protobuf from 'protobufjs';
import path from 'path';
import { logger } from './logger';

/**
 * Protocol Buffer message types
 */
export interface ObserverMessage2 {
    matchId?: Uint8Array | string;
    tournamentId?: string;
    playerStats?: any[];
    totalPlayerStats?: any[];
    teamStats?: any[];
    totalTeamStats?: any[];
    refresh?: boolean;
}

/**
 * Data Format Manager
 */
export class DataFormat {
    private static instance: DataFormat;
    private root: protobuf.Root | null = null;
    private ObserverMessage2Type: protobuf.Type | null = null;
    private isInitialized: boolean = false;

    private constructor() {}

    public static getInstance(): DataFormat {
        if (!DataFormat.instance) {
            DataFormat.instance = new DataFormat();
        }
        return DataFormat.instance;
    }

    /**
     * Initialize Protocol Buffer schema
     */
    public async initialize(protoPath?: string): Promise<void> {
        try {
            // Default proto file path (adjust based on build output structure)
            const defaultProtoPath = path.join(__dirname, 'renderer/schemes2/message2.proto');
            const schemaPath = protoPath || defaultProtoPath;

            logger.info('Loading proto file from:', schemaPath);

            // Load proto file
            this.root = await protobuf.load(schemaPath);

            // Get ObserverMessage2 type
            this.ObserverMessage2Type = this.root.lookupType('ObserverMessage2');

            this.isInitialized = true;
            logger.info('Protocol Buffer schema initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Protocol Buffer schema:', error);
            throw error;
        }
    }

    /**
     * Parse JSON string to ObserverMessage2
     * This is compatible with the WPF implementation using JsonParser
     */
    public parseFromJson(jsonString: string): ObserverMessage2 {
        if (!this.isInitialized || !this.ObserverMessage2Type) {
            throw new Error('DataFormat not initialized. Call initialize() first.');
        }

        try {
            // Parse JSON string
            const jsonObject = JSON.parse(jsonString);

            // Verify the message
            const errMsg = this.ObserverMessage2Type.verify(jsonObject);
            if (errMsg) {
                logger.warn('Message verification warning:', errMsg);
            }

            // Create message from JSON
            const message = this.ObserverMessage2Type.fromObject(jsonObject);

            return message as unknown as ObserverMessage2;
        } catch (error) {
            logger.error('Failed to parse JSON to ObserverMessage2:', error);
            throw error;
        }
    }

    /**
     * Encode ObserverMessage2 to binary
     */
    public encode(message: ObserverMessage2): Uint8Array {
        if (!this.isInitialized || !this.ObserverMessage2Type) {
            throw new Error('DataFormat not initialized. Call initialize() first.');
        }

        try {
            const errMsg = this.ObserverMessage2Type.verify(message);
            if (errMsg) {
                throw new Error(`Message verification failed: ${errMsg}`);
            }

            const protoMessage = this.ObserverMessage2Type.create(message);
            const buffer = this.ObserverMessage2Type.encode(protoMessage).finish();

            return buffer;
        } catch (error) {
            logger.error('Failed to encode ObserverMessage2:', error);
            throw error;
        }
    }

    /**
     * Decode binary to ObserverMessage2
     */
    public decode(buffer: Uint8Array): ObserverMessage2 {
        if (!this.isInitialized || !this.ObserverMessage2Type) {
            throw new Error('DataFormat not initialized. Call initialize() first.');
        }

        try {
            const message = this.ObserverMessage2Type.decode(buffer);
            return this.ObserverMessage2Type.toObject(message) as ObserverMessage2;
        } catch (error) {
            logger.error('Failed to decode ObserverMessage2:', error);
            throw error;
        }
    }

    /**
     * Convert ObserverMessage2 to JSON string
     */
    public toJson(message: ObserverMessage2): string {
        try {
            return JSON.stringify(message, null, 2);
        } catch (error) {
            logger.error('Failed to convert ObserverMessage2 to JSON:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const dataFormat = DataFormat.getInstance();

