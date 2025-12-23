// Livestanding window TypeScript for Live Standing application

import {LiveTeamPanel, Team2Data, Player2Data} from './live_team_panel';
import {currentConfig, applyCSSVariables} from './live-standing-config';
import {EliminationOverlay} from './elimination_overlay';
import {PanelAnimationController} from './panel_animation_controller';
import {MessageDataConverter} from "@renderer/interface";

// 시간 정보 인터페이스
interface TimeInfo {
    hours: number;
    minutes: number;
    seconds: number;
}

// 세션 상태 인터페이스
interface SessionState {
    startTime: number;
    isRunning: boolean;
}

// ObserverMessage2 인터페이스 (protobuf 스키마 기반)
interface ObserverMessage2 {
    match_id: Uint8Array;
    tournament_id: string;
    player_stats: Player2Data[];
    total_player_stats: Player2Data[];
    team_stats: Team2Data[];
    total_team_stats: Team2Data[];
    refresh: boolean;
}

// 라이브스탠딩 상태
interface LiveStandingState {
    teams: Team2Data[];
    players: Player2Data[];
    lastUpdate: number;
    isConnected: boolean;
}

// 세션 상태
const sessionState: SessionState = {
    startTime: Date.now(),
    isRunning: true
};

// 라이브스탠딩 상태
const liveStandingState: LiveStandingState = {
    teams: [],
    players: [],
    lastUpdate: 0,
    isConnected: false
};

let totalTeamIndexMap: Map<string, LiveTeamPanel> = new Map(); // 팀 이름을 키로 사용
let eliminationOverlay: EliminationOverlay;

// 데이터 처리 큐 시스템
let dataQueue: any[] = []; // FIFO 큐
let isProcessingData: boolean = false;
let dataProcessingInterval: NodeJS.Timeout | null = null;
const queueDelayInSecs = 2; // 큐 딜레이

/**
 * 시간을 HH:MM:SS 형식으로 포맷팅
 */
function formatTime(timeInfo: TimeInfo): string {
    const {hours, minutes, seconds} = timeInfo;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 현재 시간 업데이트
 */
function updateCurrentTime(): void {
    try {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ko-KR');

        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = timeString;
        } else {
            console.warn('Current time element not found');
        }
    } catch (error) {
        console.error('Failed to update current time:', error);
    }
}

/**
 * 경과 시간을 TimeInfo 객체로 변환
 */
function getElapsedTime(startTime: number): TimeInfo {
    const elapsed = Date.now() - startTime;

    return {
        hours: Math.floor(elapsed / 3600000),
        minutes: Math.floor((elapsed % 3600000) / 60000),
        seconds: Math.floor((elapsed % 60000) / 1000)
    };
}

/**
 * 세션 시간 업데이트
 */
function updateSessionTime(): void {
    try {
        if (!sessionState.isRunning) {
            return;
        }

        const timeInfo = getElapsedTime(sessionState.startTime);
        const timeString = formatTime(timeInfo);

        const sessionElement = document.getElementById('sessionTime');
        if (sessionElement) {
            sessionElement.textContent = timeString;
        } else {
            console.warn('Session time element not found');
        }
    } catch (error) {
        console.error('Failed to update session time:', error);
    }
}

/**
 * 세션 재시작
 */
function restartSession(): void {
    sessionState.startTime = Date.now();
    sessionState.isRunning = true;
    console.log('Session restarted');
}

/**
 * 세션 일시정지/재개
 */
function toggleSession(): void {
    sessionState.isRunning = !sessionState.isRunning;
    console.log(`Session ${sessionState.isRunning ? 'resumed' : 'paused'}`);
}

/**
 * 모든 시간 정보 업데이트
 */
function updateAllTimes(): void {
    updateCurrentTime();
    updateSessionTime();
}

/**
 * 타이머 초기화
 */
function initializeTimer(): void {
    // 초기 시간 설정
    updateAllTimes();

    // 1초마다 시간 업데이트
    const intervalId = setInterval(updateAllTimes, 1000);

    console.log('LiveStanding timer initialized');

    // 창이 닫힐 때 타이머 정리 (선택사항)
    window.addEventListener('beforeunload', () => {
        clearInterval(intervalId);
        console.log('Timer cleared');
    });
}

/**
 * 상태 표시기 업데이트 (선택사항)
 */
function updateStatusIndicator(): void {
    const indicator = document.querySelector('.status-indicator') as HTMLElement;
    if (indicator) {
        // 활성 상태를 나타내는 클래스 추가
        indicator.classList.add('active');

        // 깜빡이는 효과 (선택사항)
        setInterval(() => {
            indicator.classList.toggle('pulse');
        }, 2000);
    }
}

/**
 * 라이브스탠딩 데이터 업데이트 (WPF UpdateLeaderboard 방식)
 */
function updateLiveStandingData(observerMessage: ObserverMessage2): void {
    try {
        console.log(`Updating leaderboard: ${observerMessage.team_stats?.length || 0} / ${observerMessage.player_stats?.length || 0} / refresh=${observerMessage.refresh}`);

        if (observerMessage.refresh) {
            clearLeaderboard();
        }

        // 팀 데이터 업데이트
        const teams = observerMessage.team_stats || [];
        const totalTeams = observerMessage.total_team_stats || [];
        const players = observerMessage.player_stats || [];
        const totalPlayers = observerMessage.total_player_stats || [];

        liveStandingState.teams = totalTeams;
        liveStandingState.players = totalPlayers;
        liveStandingState.lastUpdate = Date.now();
        liveStandingState.isConnected = true;

        // 팀 맵 생성 (현재 매치 팀들)
        const teamMap = new Map<string, Team2Data>();
        teams.forEach(team => teamMap.set(team.name, team));

        // 플레이어 맵 생성
        const playersMap = new Map<string, Player2Data[]>();
        players.forEach(player => {
            if (!playersMap.has(player.team_name)) {
                playersMap.set(player.team_name, []);
            }
            playersMap.get(player.team_name)!.push(player);
        });

        // 총 팀들을 랭킹 순으로 정렬 (WPF 로직)
        totalTeams.sort((x, y) => {
            if (x.rank !== y.rank) {
                return x.rank - y.rank;
            }
            return x.name.localeCompare(y.name);
        });

        // UI 업데이트
        updateTotalLeaderboardOnUIThread(totalTeams, teamMap, playersMap, observerMessage.refresh || false);

        console.log(`Updated leaderboard Done: ${teams.length} / ${players.length} / refresh=${observerMessage.refresh}`);
    } catch (error) {
        console.error('Failed to update live standing data:', error);
    }
}

/**
 * 총 리더보드 UI 업데이트 (WPF UpdateTotalLeaderboardOnUIThread 방식)
 */
function updateTotalLeaderboardOnUIThread(
    totalTeams: Team2Data[],
    matchTeamMap: Map<string, Team2Data>,
    playersMap: Map<string, Player2Data[]>,
    refresh: boolean
): void {
    const container = document.querySelector('.teams-container');
    if (!container) {
        console.error('Teams container not found');
        return;
    }

    const eliminatedTeams: Team2Data[] = [];
    let currentIndex = 1;
    let matchEnded = false;

    // 최대 16개 팀만 표시 (F1 스타일)
    const teamsToShow = totalTeams.slice(0, 16);

    teamsToShow.forEach((team) => {
        const matchTeam = matchTeamMap.get(team.name);
        if (!matchTeam) {
            return; // 현재 매치에 참여하지 않는 팀은 건너뛰기
        }

        let panel = totalTeamIndexMap.get(team.name);
        if (!panel) {
            // 새 패널 생성 (data-team-name 속성 추가)
            panel = new LiveTeamPanel(team, [], currentIndex);
            const panelElement = panel.getElement();
            panelElement.setAttribute('data-team-name', team.name); // F1 애니메이션을 위한 식별자

            const leaderboardCanvas = container as HTMLElement;
            leaderboardCanvas.appendChild(panelElement);
            totalTeamIndexMap.set(team.name, panel);
        }

        // 패널 업데이트 (기존 애니메이션 비활성화)
        const justEliminated = panel.updatePanel(team, matchTeam, playersMap, currentIndex, false); // refresh를 false로 설정

        if (justEliminated && !matchEnded) {
            // WPF 로직: if ((int)matchTeam.PlacementRank == 2) matchEnded = true;
            // placement_rank가 2이면 매치 종료 (2등이 탈락하면 1등만 남음)
            if (matchTeam.placement_rank === 2) {
                matchEnded = true;
                console.log('Match ended - 2nd place team eliminated');
            }
            eliminatedTeams.push(matchTeam);
            console.log(`Added eliminated team: ${matchTeam.name} (rank: ${matchTeam.rank})`);
        }

        currentIndex++;
    });

    // WPF 로직: if (matchEnded) return; 매치가 끝나면 탈락 오버레이 처리 안함
    if (matchEnded) {
        console.log('Match ended, skipping elimination overlay');
        return;
    }

    // 탈락 팀이 있으면 오버레이 처리
    if (eliminatedTeams.length > 0) {
        console.log(`Processing ${eliminatedTeams.length} eliminated teams`);

        // WPF 로직: eliminatedTeams.Sort((team, team2) => team2.PlacementRank.CompareTo(team.PlacementRank));
        eliminatedTeams.sort((team1, team2) => {
            return team2.placement_rank - team1.placement_rank; // 높은 순위부터
        });

        // FIXME(Gigone): 탈락 오버레이에 추가
        // if (eliminationOverlay) {
        //     // eliminationOverlay.enqueue(eliminatedTeams, matchTeamMap.size);
        // }
    }

    // F1 스타일 위치 조정 (첫 로드이거나 새로고침인 경우)
    if (refresh || totalTeamIndexMap.size === teamsToShow.length) {
        // 애니메이션 없이 즉시 올바른 위치로 이동 (PanelAnimationController 사용)
        setTimeout(() => {
            PanelAnimationController.snapToPositions(teamsToShow);
        }, 100);
    }
}

/**
 * 리더보드 클리어 (WPF Clear 메서드)
 */
function clearLeaderboard(): void {
    totalTeamIndexMap.clear();

    const container = document.querySelector('.teams-container');
    if (container) {
        // 기존 패널들 모두 제거
        container.innerHTML = '';

        // 타이틀 패널 다시 추가 (필요한 경우)
        // const titlePanel = new LiveTeamPanelTitle();
        // titlePanel.appendTo(container as HTMLElement);
    }

    console.log('[clearLeaderboard] Leaderboard cleared and F1 animations reset');
}

/**
 * 라이브스탠딩 UI 초기화
 */
function initializeLiveStandingUI(): void {
    try {
        console.log('Starting live standing UI initialization...');

        // CSS 변수 적용
        applyCSSVariables(currentConfig);
        console.log('CSS variables applied');

        // 컨테이너 찾기
        const container = document.querySelector('.livestanding-content');
        if (!container) {
            console.error('Livestanding content container not found');
            return;
        }
        console.log('Container found:', container);

        // 팀 컨테이너 확인 (HTML에 이미 있어야 함)
        const teamsContainer = container.querySelector('.teams-container');
        if (!teamsContainer) {
            console.error('Teams container not found in HTML');
            return;
        }
        console.log('Teams container found:', teamsContainer);

        // 기존 팀 패널들만 제거
        teamsContainer.innerHTML = '';
        console.log('Teams container cleared');

        console.log('Live standing UI initialized successfully');
    } catch (error) {
        console.error('Failed to initialize live standing UI:', error);
        console.error('Error details:', error);
    }
}

/**
 * 데이터를 큐에 추가 (즉시 처리하지 않음)
 */
function enqueueObserverData(observerData: any): void {
    // 큐에 데이터 추가 (FIFO)
    dataQueue.push(observerData);
    console.log(`📥 Data enqueued. Queue length: ${dataQueue.length}`);
}

/**
 * 큐에서 데이터를 꺼내서 처리 (X초 간격)
 */
function processDataFromQueue(): void {
    if (dataQueue.length === 0) {
        console.log('📭 Queue is empty, skipping processing');
        return;
    }

    if (isProcessingData) {
        console.log('⏳ Already processing data, skipping');
        return;
    }

    isProcessingData = true;

    // 큐에서 가장 오래된 데이터 꺼내기 (FIFO)
    const observerData = dataQueue.shift();

    console.log(`🔄 Processing data from queue. Remaining in queue: ${dataQueue.length}`);

    try {
        console.log('🔄 Processing observer data:', {
            matchId: observerData.matchId,
            tournamentId: observerData.tournamentId,
            totalTeamStatsLength: observerData.totalTeamStats?.length,
            totalPlayerStatsLength: observerData.totalPlayerStats?.length
        });

        // MessageDataConverter를 사용하여 데이터 변환
        console.log('🔄 Converting data...');
        const observerMessage: ObserverMessage2 = MessageDataConverter.convertToObserverMessage2(observerData);

        console.log('🔄 Converted message:', {
            tournament_id: observerMessage.tournament_id,
            match_id_type: typeof observerMessage.match_id,
            match_id_length: observerMessage.match_id?.length,
            total_team_stats_length: observerMessage.total_team_stats?.length
        });

        // 데이터 유효성 검사
        console.log('🔄 Validating data...');
        if (!MessageDataConverter.validateObserverMessage2(observerMessage)) {
            console.error('❌ Invalid observer message data');
            return;
        }

        // 라이브스탠딩 데이터 업데이트
        console.log('🔄 Updating live standing data...');
        updateLiveStandingData(observerMessage);

        console.log('✅ Observer data processed successfully');

    } catch (error: any) {
        console.error('❌ Failed to process observer data:', error);
        console.error('Error stack:', error.stack);
    } finally {
        // X초 후에 다음 데이터 처리 가능하도록 설정
        setTimeout(() => {
            isProcessingData = false;
            console.log('✅ Data processing cooldown finished');
        }, queueDelayInSecs * 1000);
    }
}

/**
 * 데이터 처리 인터벌 시작
 */
function startDataProcessingInterval(): void {
    if (dataProcessingInterval) {
        clearInterval(dataProcessingInterval);
    }

    // X초마다 큐에서 데이터 처리
    dataProcessingInterval = setInterval(() => {
        processDataFromQueue();
    }, queueDelayInSecs * 1000);
}

/**
 * 데이터 처리 인터벌 중지
 */
function stopDataProcessingInterval(): void {
    if (dataProcessingInterval) {
        clearInterval(dataProcessingInterval);
        dataProcessingInterval = null;
        console.log('⏹️ Data processing interval stopped');
    }
}

/**
 * 실제 ObserverMessage2 데이터 처리 (이제 큐를 통해서만 호출됨)
 */
function handleObserverDataUpdate(observerData: any): void {
    // 데이터를 큐에 추가만 함 (즉시 처리하지 않음)
    enqueueObserverData(observerData);
}

/**
 * 라이브스탠딩 오버레이 DOM 초기화
 */
function initializeLiveStandingDOM(): void {
    try {
        console.log('initializeLiveStandingDOM called');
        console.log('window.api available:', !!(window as any).api);
        console.log('window.api.receive available:', !!((window as any).api && (window as any).api.receive));

        initializeLiveStandingUI();
        initializeTimer();
        updateStatusIndicator();

        // IPC 이벤트 리스너 등록
        if ((window as any).api && (window as any).api.receive) {
            (window as any).api.receive('observer-data-update', (observerData: any) => {
                console.log('🔥 Received observer data update in livestanding:', observerData);
                handleObserverDataUpdate(observerData);
            });
            console.log('✅ IPC event listener registered successfully');
        } else {
            console.warn('❌ api not available, using test data only');
            console.log('Available window properties:', Object.keys(window));
        }

        // 탈락 오버레이 초기화
        eliminationOverlay = new EliminationOverlay();

        // 데이터 처리 인터벌 시작 (X초마다 큐에서 데이터 처리)
        startDataProcessingInterval();
    } catch (error) {
        console.error('Failed to initialize LiveStanding window:', error);
    }
}


// DOM이 로드된 후 실행
console.log('Setting up DOMContentLoaded event listener');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired in livestanding.ts');
    initializeLiveStandingDOM();
});

// 키보드 단축키 (선택사항)
document.addEventListener('keydown', (event: KeyboardEvent) => {
    switch (event.key) {
        case 'r':
        case 'R':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                restartSession();
            }
            break;
        case ' ':
            event.preventDefault();
            toggleSession();
            break;
        case 'Escape':
            // 창 닫기 전 정리
            stopDataProcessingInterval();
            break;
    }
});

// 창이 닫힐 때 정리
window.addEventListener('beforeunload', () => {
    stopDataProcessingInterval();
    console.log('🧹 LiveStanding window cleanup completed');
});
