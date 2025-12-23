// app-initializer.ts
// 앱 초기화 로직을 담당하는 모듈

import { app } from "electron";
import { electronProtobuf } from "../shared/proto/electron-protobuf";
import { WindowManager } from "./window-manager";
import { IpcHandlers } from "./ipc-handlers";

export class AppInitializer {
    private windowManager: WindowManager;
    private ipcHandlers: IpcHandlers;

    constructor() {
        this.windowManager = new WindowManager();
        this.ipcHandlers = new IpcHandlers(this.windowManager);
    }

    /**
     * 앱 초기화
     */
    public async initialize(): Promise<void> {
        await this.initializeProtocolBuffer();
        this.setupAppEvents();
        this.ipcHandlers.registerHandlers();
    }

    /**
     * 앱이 준비되었을 때 실행되는 로직
     */
    public async onAppReady(): Promise<void> {
        await this.initialize();
        this.windowManager.createMainWindow();
    }

    /**
     * 프로토콜 버퍼 초기화
     */
    private async initializeProtocolBuffer(): Promise<void> {
        try {
            await electronProtobuf.initialize();
            console.log("Protocol Buffer initialized successfully");
        } catch (error) {
            console.error("Failed to initialize Protocol Buffer:", error);
        }
    }

    /**
     * 앱 이벤트 설정
     */
    private setupAppEvents(): void {
        // 모든 창이 닫혔을 때
        app.on('window-all-closed', () => {
            // macOS가 아닌 경우 앱 종료
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        // macOS에서 앱이 활성화될 때
        app.on('activate', () => {
            // 열린 창이 없으면 메인 창 생성
            if (this.windowManager.getMainWindow() === null) {
                this.windowManager.createMainWindow();
            }
        });

        // 앱이 종료되기 전
        app.on('before-quit', () => {
            this.cleanup();
        });
    }

    /**
     * 앱 종료 시 정리 작업
     */
    private cleanup(): void {
        this.ipcHandlers.removeAllHandlers();
        this.windowManager.closeAllWindows();
        console.log("App cleanup completed");
    }

    /**
     * WindowManager 인스턴스 반환
     */
    public getWindowManager(): WindowManager {
        return this.windowManager;
    }

    /**
     * IpcHandlers 인스턴스 반환
     */
    public getIpcHandlers(): IpcHandlers {
        return this.ipcHandlers;
    }
}
