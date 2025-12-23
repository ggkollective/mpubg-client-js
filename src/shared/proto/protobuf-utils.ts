import protobuf from 'protobufjs';

/**
 * Protocol Buffer 유틸리티 클래스
 * 서버의 protobuf 5.29.3과 호환되는 JavaScript 클라이언트
 */
export class ProtobufUtils {
    private static loadedRoots: Map<string, protobuf.Root> = new Map();

    /**
     * .proto 파일을 로드합니다
     * @param protoFilePath .proto 파일 경로
     * @returns protobuf.Root 객체
     */
    static async loadProtoFile(protoFilePath: string): Promise<protobuf.Root> {
        if (this.loadedRoots.has(protoFilePath)) {
            return this.loadedRoots.get(protoFilePath)!;
        }

        try {
            const root = await protobuf.load(protoFilePath);
            this.loadedRoots.set(protoFilePath, root);
            return root;
        } catch (error) {
            console.error(`Failed to load proto file: ${protoFilePath}`, error);
            throw error;
        }
    }

    /**
     * JSON 스키마에서 protobuf 타입을 로드합니다
     * @param jsonSchema JSON 스키마 객체
     * @returns protobuf.Root 객체
     */
    static loadFromJSON(jsonSchema: any): protobuf.Root {
        return protobuf.Root.fromJSON(jsonSchema);
    }

    /**
     * 메시지를 인코딩합니다
     * @param root protobuf.Root 객체
     * @param messageTypeName 메시지 타입 이름
     * @param data 인코딩할 데이터
     * @returns 인코딩된 Uint8Array
     */
    static encodeMessage(root: protobuf.Root, messageTypeName: string, data: any): Uint8Array {
        try {
            const MessageType = root.lookupType(messageTypeName);
            const message = MessageType.create(data);
            return MessageType.encode(message).finish();
        } catch (error) {
            console.error(`Failed to encode message: ${messageTypeName}`, error);
            throw error;
        }
    }

    /**
     * 메시지를 디코딩합니다
     * @param root protobuf.Root 객체
     * @param messageTypeName 메시지 타입 이름
     * @param buffer 디코딩할 버퍼
     * @returns 디코딩된 객체
     */
    static decodeMessage(root: protobuf.Root, messageTypeName: string, buffer: Uint8Array): any {
        try {
            const MessageType = root.lookupType(messageTypeName);
            return MessageType.decode(buffer);
        } catch (error) {
            console.error(`Failed to decode message: ${messageTypeName}`, error);
            throw error;
        }
    }

    /**
     * 메시지를 검증합니다
     * @param root protobuf.Root 객체
     * @param messageTypeName 메시지 타입 이름
     * @param data 검증할 데이터
     * @returns 검증 결과 (null이면 유효)
     */
    static verifyMessage(root: protobuf.Root, messageTypeName: string, data: any): string | null {
        try {
            const MessageType = root.lookupType(messageTypeName);
            return MessageType.verify(data);
        } catch (error) {
            console.error(`Failed to verify message: ${messageTypeName}`, error);
            throw error;
        }
    }

    /**
     * 메시지를 JSON으로 변환합니다
     * @param root protobuf.Root 객체
     * @param messageTypeName 메시지 타입 이름
     * @param buffer 변환할 버퍼
     * @returns JSON 객체
     */
    static toJSON(root: protobuf.Root, messageTypeName: string, buffer: Uint8Array): any {
        const decoded = this.decodeMessage(root, messageTypeName, buffer);
        const MessageType = root.lookupType(messageTypeName);
        return MessageType.toObject(decoded, {
            longs: String,
            enums: String,
            bytes: String,
        });
    }

    /**
     * JSON에서 메시지를 생성합니다
     * @param root protobuf.Root 객체
     * @param messageTypeName 메시지 타입 이름
     * @param jsonData JSON 데이터
     * @returns 인코딩된 Uint8Array
     */
    static fromJSON(root: protobuf.Root, messageTypeName: string, jsonData: any): Uint8Array {
        const MessageType = root.lookupType(messageTypeName);
        const message = MessageType.fromObject(jsonData);
        return MessageType.encode(message).finish();
    }
}

/**
 * 웹소켓이나 HTTP 통신을 위한 프로토콜 버퍼 헬퍼
 */
export class ProtobufCommunication {
    private root: protobuf.Root;

    constructor(root: protobuf.Root) {
        this.root = root;
    }

    /**
     * 서버로 보낼 메시지를 준비합니다
     * @param messageType 메시지 타입
     * @param data 데이터
     * @returns 인코딩된 바이너리 데이터
     */
    prepareMessage(messageType: string, data: any): Uint8Array {
        return ProtobufUtils.encodeMessage(this.root, messageType, data);
    }

    /**
     * 서버에서 받은 메시지를 파싱합니다
     * @param messageType 메시지 타입
     * @param buffer 받은 바이너리 데이터
     * @returns 파싱된 객체
     */
    parseMessage(messageType: string, buffer: Uint8Array): any {
        return ProtobufUtils.decodeMessage(this.root, messageType, buffer);
    }

    /**
     * 메시지를 JSON으로 변환합니다 (디버깅용)
     * @param messageType 메시지 타입
     * @param buffer 바이너리 데이터
     * @returns JSON 객체
     */
    toJSON(messageType: string, buffer: Uint8Array): any {
        return ProtobufUtils.toJSON(this.root, messageType, buffer);
    }
}
