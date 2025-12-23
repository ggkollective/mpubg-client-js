// ipc-handlers.ts
// IPC 통신 핸들러들을 관리하는 모듈

import { ipcMain } from "electron";
import { WindowManager } from "./window-manager";

export class IpcHandlers {
    private windowManager: WindowManager;

    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager;
    }

    /**
     * 모든 IPC 핸들러 등록
     */
    public registerHandlers(): void {
        this.registerLiveStandingHandlers();
        this.registerTestDataHandlers();
        // 향후 다른 핸들러들도 여기에 추가
    }

    /**
     * 라이브스탠딩 관련 IPC 핸들러 등록
     */
    private registerLiveStandingHandlers(): void {
        // 라이브스탠딩 창 토글 핸들러
        ipcMain.handle("toggle-livestanding", () => {
            return this.windowManager.toggleLiveStandingWindow();
        });

        // 향후 추가될 수 있는 다른 라이브스탠딩 관련 핸들러들
        // ipcMain.handle("get-livestanding-status", () => {
        //     return this.windowManager.getLiveStandingWindow() !== null;
        // });
    }

    /**
     * 테스트 데이터 관련 IPC 핸들러 등록
     */
    private registerTestDataHandlers(): void {
        // 테스트 데이터 스트리밍 시작
        ipcMain.handle("start-test-data-stream", () => {
            return this.windowManager.startTestDataStream();
        });

        // 테스트 데이터 스트리밍 중지
        ipcMain.handle("stop-test-data-stream", () => {
            return this.windowManager.stopTestDataStream();
        });

        // 테스트 데이터 스트리밍 상태 확인
        ipcMain.handle("get-test-data-stream-status", () => {
            return this.windowManager.getTestDataStreamStatus();
        });
    }

    /**
     * 모든 IPC 핸들러 제거
     */
    public removeAllHandlers(): void {
        ipcMain.removeAllListeners("toggle-livestanding");
        ipcMain.removeAllListeners("start-test-data-stream");
        ipcMain.removeAllListeners("stop-test-data-stream");
        ipcMain.removeAllListeners("get-test-data-stream-status");
        // 다른 핸들러들도 여기에 추가
    }
}
