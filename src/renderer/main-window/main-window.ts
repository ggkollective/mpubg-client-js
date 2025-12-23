// Main window TypeScript for Live Standing application

// 앱 상태 인터페이스
interface AppState {
    liveStandingOpen: boolean;
    testDataStreamActive: boolean;
}

// 테스트 데이터 상태 인터페이스
interface TestDataStatus {
    isActive: boolean;
    currentLine: number;
    totalLines: number;
}

// 앱 상태
const appState: AppState = {
    liveStandingOpen: false,
    testDataStreamActive: false
};

/**
 * 토글 버튼 상태 업데이트
 */
function updateToggleButton(button: HTMLButtonElement, isOpen: boolean): void {
    if (isOpen) {
        button.textContent = '오버레이 창 닫기';
        button.classList.add('active');
    } else {
        button.textContent = '오버레이 창 열기';
        button.classList.remove('active');
    }
}

/**
 * 라이브스탠딩 토글 처리
 */
async function handleLiveStandingToggle(button: HTMLButtonElement): Promise<void> {
    try {
        if (!window.api || !window.api.invoke) {
            throw new Error('window.api.invoke is not defined');
        }

        // IPC를 통해 메인 프로세스에 토글 요청
        const isOpen: boolean = await window.api.invoke('toggle-livestanding');

        // 상태 업데이트
        appState.liveStandingOpen = isOpen;
        updateToggleButton(button, isOpen);

        console.log(`LiveStanding window ${isOpen ? 'opened' : 'closed'}`);
    } catch (error) {
        console.error('Failed to toggle LiveStanding window:', error);
    }
}

/**
 * 테스트 데이터 시작 처리
 */
async function handleTestDataStart(startButton: HTMLButtonElement, stopButton: HTMLButtonElement): Promise<void> {
    try {
        if (!window.api || !window.api.invoke) {
            throw new Error('window.api.invoke is not defined');
        }

        const result: boolean = await window.api.invoke('start-test-data-stream');

        if (result) {
            appState.testDataStreamActive = true;
            startButton.disabled = true;
            stopButton.disabled = false;

            const statusElement = document.getElementById('testStatus') as HTMLSpanElement;
            if (statusElement) {
                statusElement.textContent = '실행 중';
            }

            console.log('Test data stream started');
        } else {
            alert('테스트 데이터 파일을 로드할 수 없습니다.');
        }
    } catch (error) {
        console.error('Failed to start test data stream:', error);
        alert('테스트 데이터 시작에 실패했습니다.');
    }
}

/**
 * 테스트 데이터 중지 처리
 */
async function handleTestDataStop(startButton: HTMLButtonElement, stopButton: HTMLButtonElement): Promise<void> {
    try {
        if (!window.api || !window.api.invoke) {
            throw new Error('window.api.invoke is not defined');
        }

        const result: boolean = await window.api.invoke('stop-test-data-stream');

        if (result) {
            appState.testDataStreamActive = false;
            startButton.disabled = false;
            stopButton.disabled = true;

            const statusElement = document.getElementById('testStatus') as HTMLSpanElement;
            if (statusElement) {
                statusElement.textContent = '중지됨';
            }

            console.log('Test data stream stopped');
        }
    } catch (error) {
        console.error('Failed to stop test data stream:', error);
        alert('테스트 데이터 중지에 실패했습니다.');
    }
}

/**
 * 테스트 데이터 상태 업데이트
 */
async function updateTestDataStatus(): Promise<void> {
    try {
        if (!window.api || !window.api.invoke) {
            return;
        }

        const status: TestDataStatus = await window.api.invoke('get-test-data-stream-status');

        const progressElement = document.getElementById('testProgress') as HTMLSpanElement;
        if (progressElement) {
            progressElement.textContent = `${status.currentLine}/${status.totalLines}`;
        }

        // 상태가 변경되었으면 UI 업데이트
        if (status.isActive !== appState.testDataStreamActive) {
            appState.testDataStreamActive = status.isActive;

            const startButton = document.getElementById('startTestData') as HTMLButtonElement;
            const stopButton = document.getElementById('stopTestData') as HTMLButtonElement;
            const statusElement = document.getElementById('testStatus') as HTMLSpanElement;

            if (startButton && stopButton && statusElement) {
                startButton.disabled = status.isActive;
                stopButton.disabled = !status.isActive;
                statusElement.textContent = status.isActive ? '실행 중' : '중지됨';
            }
        }
    } catch (error) {
        console.error('Failed to update test data status:', error);
    }
}

/**
 * 메인 윈도우 DOM 초기화
 */
function initializeMainWindowDOM(): void {
    // 라이브스탠딩 토글 버튼
    const toggleButton = document.getElementById('toggleLiveStanding') as HTMLButtonElement;

    if (!toggleButton) {
        console.error('Toggle button not found');
        return;
    }

    // 초기 상태 설정
    updateToggleButton(toggleButton, appState.liveStandingOpen);

    // 클릭 이벤트 리스너 등록
    toggleButton.addEventListener('click', () => {
        console.log('Toggle button clicked!');
        handleLiveStandingToggle(toggleButton).then(r => {});
    });

    // 테스트 데이터 버튼들
    const startTestButton = document.getElementById('startTestData') as HTMLButtonElement;
    const stopTestButton = document.getElementById('stopTestData') as HTMLButtonElement;

    if (startTestButton && stopTestButton) {
        // 테스트 데이터 시작 버튼
        startTestButton.addEventListener('click', () => {
            console.log('Start test data button clicked!');
            handleTestDataStart(startTestButton, stopTestButton).then(r => {});
        });

        // 테스트 데이터 중지 버튼
        stopTestButton.addEventListener('click', () => {
            console.log('Stop test data button clicked!');
            handleTestDataStop(startTestButton, stopTestButton).then(r => {});
        });

        // 초기 테스트 데이터 상태 확인
        updateTestDataStatus().then(r => {});

        // 1초마다 상태 업데이트
        setInterval(updateTestDataStatus, 1000);
    } else {
        console.error('Test data buttons not found');
    }

    console.log('Main window initialized');
}

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', initializeMainWindowDOM);
