// window-manager.ts
// 창 생성 및 관리를 담당하는 모듈

import { BrowserWindow } from "electron";
import * as path from "path";
import * as fs from "fs";

// 라이브스탠딩 설정 인터페이스 (config 파일과 동일)
interface LiveStandingConfig {
    panel_height: number;
    panel_title_height: number;
    ranking_width: number;
    logo_width: number;
    team_name_width: number;
    team_name_margin_left: number;
    total_score_width: number;
    total_kill_width: number;
    squad_health_width: number;
    squad_health_height: number;
    spacing: {
        panel_margin: number;
        content_padding: number;
        column_gap: number;
    };
}

// 기본 설정값
const DEFAULT_LIVE_STANDING_CONFIG: LiveStandingConfig = {
    panel_height: 32,
    panel_title_height: 40,
    ranking_width: 30,
    logo_width: 40,
    team_name_width: 60,
    team_name_margin_left: 8,
    total_score_width: 50,
    total_kill_width: 40,
    squad_health_width: 80,
    squad_health_height: 16,
    spacing: {
        panel_margin: 2,
        content_padding: 4,
        column_gap: 2
    }
};

export class WindowManager {
    private mainWindow: BrowserWindow | null = null;
    private liveStandingWindow: BrowserWindow | null = null;
    private liveStandingConfig: LiveStandingConfig = DEFAULT_LIVE_STANDING_CONFIG;

    // 테스트 데이터 스트리밍 관련
    private testDataStreamInterval: NodeJS.Timeout | null = null;
    private testDataLines: string[] = [];
    private currentLineIndex: number = 0;
    private isTestDataStreamActive: boolean = false;

    /**
     * 메인 창 생성
     */
    public createMainWindow(): BrowserWindow {
        this.mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "./preload.js"),
            },
        });

        this.setupMainWindowEvents();
        this.loadMainWindow();

        return this.mainWindow;
    }

    /**
     * 라이브스탠딩 창 크기 계산
     */
    private calculateLiveStandingWindowSize(): { width: number; height: number } {
        const config = this.liveStandingConfig;

        // 너비 계산: 모든 컬럼 너비 + 간격 + 패딩
        const width = config.ranking_width +
                     config.logo_width +
                     config.team_name_width +
                     config.squad_health_width +
                     config.total_score_width +
                     config.total_kill_width +
                     (config.spacing.column_gap * 5) + // 컬럼 간 간격
                     (config.spacing.content_padding * 2) + // 좌우 패딩
                     20; // 추가 여백

        // 높이 계산: LIVE STANDING 타이틀 + 패널 타이틀 + 최대 16개 팀 패널 + 여백
        const maxTeams = 16; // 16개 팀으로 제한
        const mainTitleHeight = 40; // LIVE STANDING 메인 타이틀 높이 (여백 포함)
        const height = mainTitleHeight +
                      config.panel_title_height +
                      (config.panel_height * maxTeams) +
                      (config.spacing.panel_margin * (maxTeams + 1)) +
                      30; // 추가 여백 증가

        return { width, height };
    }

    /**
     * 라이브스탠딩 창 생성
     */
    public createLiveStandingWindow(): BrowserWindow {
        const { width, height } = this.calculateLiveStandingWindowSize();

        this.liveStandingWindow = new BrowserWindow({
            width,
            height,
            minWidth: width,
            minHeight: height,
            maxWidth: width,
            maxHeight: height,
            frame: false, // 태스크바 없음
            transparent: true, // 투명 배경
            alwaysOnTop: true, // 항상 위에
            resizable: true,
            show: true, // 명시적으로 창 표시
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, "./preload.js"),
            },
        });

        this.setupLiveStandingWindowEvents();
        this.loadLiveStandingWindow();

        return this.liveStandingWindow;
    }

    /**
     * 라이브스탠딩 창 토글
     */
    public toggleLiveStandingWindow(): boolean {
        if (this.liveStandingWindow) {
            console.log("Closing livestanding window");
            this.liveStandingWindow.close();
            this.liveStandingWindow = null;
            return false;
        } else {
            console.log("Creating livestanding window");
            this.createLiveStandingWindow();
            return true;
        }
    }

    /**
     * 메인 창 참조 반환
     */
    public getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    /**
     * 라이브스탠딩 창 참조 반환
     */
    public getLiveStandingWindow(): BrowserWindow | null {
        return this.liveStandingWindow;
    }

    /**
     * 라이브스탠딩 설정 업데이트
     */
    public updateLiveStandingConfig(newConfig: Partial<LiveStandingConfig>): void {
        this.liveStandingConfig = { ...this.liveStandingConfig, ...newConfig };

        // 창이 열려있으면 크기 조정
        if (this.liveStandingWindow) {
            const { width, height } = this.calculateLiveStandingWindowSize();
            this.liveStandingWindow.setSize(width, height);
            this.liveStandingWindow.setMinimumSize(width, height);
            this.liveStandingWindow.setMaximumSize(width + 50, height + 50); // 16개 팀 기준으로 최대 크기 제한
        }
    }

    /**
     * 현재 라이브스탠딩 설정 반환
     */
    public getLiveStandingConfig(): LiveStandingConfig {
        return { ...this.liveStandingConfig };
    }

    /**
     * 테스트 데이터 파일 로드
     */
    private loadTestDataFile(): boolean {
        try {
            const testDataPath = path.join(__dirname, "renderer/test-data_smash.txt");
            const fileContent = fs.readFileSync(testDataPath, 'utf-8');
            this.testDataLines = fileContent.split('\n').filter(line => line.trim() !== '');
            this.currentLineIndex = 0;
            console.log(`Loaded ${this.testDataLines.length} lines of test data`);
            return true;
        } catch (error) {
            console.error('Failed to load test data file:', error);
            return false;
        }
    }

    /**
     * 테스트 데이터 스트리밍 시작
     */
    public startTestDataStream(): boolean {
        if (this.isTestDataStreamActive) {
            console.log('Test data stream is already active');
            return false;
        }

        if (!this.loadTestDataFile()) {
            return false;
        }

        this.isTestDataStreamActive = true;
        this.currentLineIndex = 0;

        // 1초마다 한 줄씩 전송
        this.testDataStreamInterval = setInterval(() => {
            if (this.currentLineIndex >= this.testDataLines.length) {
                // 모든 데이터를 전송했으면 처음부터 다시 시작
                this.currentLineIndex = 0;
            }

            const currentLine = this.testDataLines[this.currentLineIndex];
            if (currentLine) {
                this.sendTestDataToLiveStanding(currentLine);
            }
            this.currentLineIndex++;
        }, 1000);

        console.log('Test data stream started');
        return true;
    }

    /**
     * 테스트 데이터 스트리밍 중지
     */
    public stopTestDataStream(): boolean {
        if (!this.isTestDataStreamActive) {
            console.log('Test data stream is not active');
            return false;
        }

        if (this.testDataStreamInterval) {
            clearInterval(this.testDataStreamInterval);
            this.testDataStreamInterval = null;
        }

        this.isTestDataStreamActive = false;
        console.log('Test data stream stopped');
        return true;
    }

    /**
     * 테스트 데이터 스트리밍 상태 반환
     */
    public getTestDataStreamStatus(): { isActive: boolean; currentLine: number; totalLines: number } {
        return {
            isActive: this.isTestDataStreamActive,
            currentLine: this.currentLineIndex,
            totalLines: this.testDataLines.length
        };
    }

    /**
     * 라이브스탠딩 창에 테스트 데이터 전송
     */
    private sendTestDataToLiveStanding(jsonLine: string): void {
        if (!this.liveStandingWindow) {
            console.log('❌ LiveStanding window not available');
            return;
        }

        try {
            const observerData = JSON.parse(jsonLine);

            // 라이브스탠딩 창에 데이터 전송
            console.log(`🚀 Sending observer-data-update to livestanding window`);
            this.liveStandingWindow.webContents.send('observer-data-update', observerData);

            console.log(`✅ Sent test data line ${this.currentLineIndex + 1}/${this.testDataLines.length}`);
        } catch (error) {
            console.error('❌ Failed to parse or send test data:', error);
        }
    }

    /**
     * 모든 창 닫기
     */
    public closeAllWindows(): void {
        if (this.liveStandingWindow) {
            this.liveStandingWindow.close();
            this.liveStandingWindow = null;
        }
        if (this.mainWindow) {
            this.mainWindow.close();
            this.mainWindow = null;
        }
    }

    /**
     * 메인 창 이벤트 설정
     */
    private setupMainWindowEvents(): void {
        if (!this.mainWindow) return;

        // 창이 준비되면 표시
        this.mainWindow.once('ready-to-show', () => {
            console.log("Main window ready to show");
            this.mainWindow!.show();
        });

        // 로드 완료 시 로그
        this.mainWindow.webContents.once('did-finish-load', () => {
            console.log("Main window loaded successfully");
            // 개발 모드에서 개발자 도구 자동 열기
            if (process.env.DEBUG) {
                this.mainWindow!.webContents.openDevTools();
            }
        });

        // 로드 실패 시 로그
        this.mainWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
            console.error("Failed to load page:", errorCode, errorDescription);
        });

        // 메인 창이 닫힐 때 라이브스탠딩 창도 함께 닫기
        this.mainWindow.on("closed", () => {
            if (this.liveStandingWindow) {
                this.liveStandingWindow.close();
                this.liveStandingWindow = null;
            }
            this.mainWindow = null;
        });
    }

    /**
     * 라이브스탠딩 창 이벤트 설정
     */
    private setupLiveStandingWindowEvents(): void {
        if (!this.liveStandingWindow) return;

        // 창이 준비되면 표시
        this.liveStandingWindow.once('ready-to-show', () => {
            console.log("LiveStanding window ready to show");
            this.liveStandingWindow!.show();
        });

        // 로드 완료 시 로그
        this.liveStandingWindow.webContents.once('did-finish-load', () => {
            console.log("LiveStanding window loaded successfully");
        });

        // 로드 실패 시 로그
        this.liveStandingWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => {
            console.error("Failed to load livestanding page:", errorCode, errorDescription);
        });

        // 라이브스탠딩 창이 닫힐 때 참조 제거
        this.liveStandingWindow.on("closed", () => {
            console.log("LiveStanding window closed");
            this.liveStandingWindow = null;
        });
    }

    /**
     * 메인 창 HTML 로드
     */
    private loadMainWindow(): void {
        if (!this.mainWindow) return;

        this.mainWindow.loadFile("dist/renderer/main-window/main-window.html").catch((error) => {
            console.error("Failed to load HTML file:", error);
        });
    }

    /**
     * 라이브스탠딩 창 HTML 로드
     */
    private loadLiveStandingWindow(): void {
        if (!this.liveStandingWindow) return;

        console.log("Loading livestanding.html...");
        this.liveStandingWindow.loadFile("dist/renderer/overlay/livestanding.html").catch((error) => {
            console.error("Failed to load livestanding HTML file:", error);
        });
    }
}
