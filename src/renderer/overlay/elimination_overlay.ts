// elimination_overlay.ts
// 탈락 팀 표시 오버레이 시스템

import { Team2Data } from './live_team_panel';

/**
 * 탈락 오버레이 시스템
 * WPF EliminationOverlay와 동일한 기능 제공
 */
export class EliminationOverlay {
    private readonly element: HTMLElement;
    private queue: Team2Data[] = [];
    private isProcessing: boolean = false;
    private currentDisplayTimeout?: NodeJS.Timeout | undefined;

    constructor() {
        this.element = this.createElement();
        this.setupStyles();
        document.body.appendChild(this.element);
    }

    /**
     * 오버레이 엘리먼트 생성
     */
    private createElement(): HTMLElement {
        const overlay = document.createElement('div');
        overlay.className = 'elimination-overlay-system';
        overlay.style.display = 'none';

        // 메인 컨테이너
        const container = document.createElement('div');
        container.className = 'elimination-container';

        // 헤더
        const header = document.createElement('div');
        header.className = 'elimination-header';
        header.textContent = 'ELIMINATED';

        // 팀 리스트 컨테이너
        const teamList = document.createElement('div');
        teamList.className = 'elimination-team-list';

        // 순위 정보
        const rankInfo = document.createElement('div');
        rankInfo.className = 'elimination-rank-info';

        container.appendChild(header);
        container.appendChild(teamList);
        container.appendChild(rankInfo);
        overlay.appendChild(container);

        return overlay;
    }

    /**
     * 스타일 설정
     */
    private setupStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .elimination-overlay-system {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.8);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.5s ease;
            }

            .elimination-overlay-system.show {
                opacity: 1;
            }

            .elimination-container {
                background: linear-gradient(135deg, rgba(255, 0, 0, 0.9), rgba(128, 0, 0, 0.9));
                border: 3px solid #ff4444;
                border-radius: 15px;
                padding: 30px;
                text-align: center;
                box-shadow: 0 0 30px rgba(255, 68, 68, 0.5);
                max-width: 500px;
                min-width: 300px;
                transform: scale(0.8);
                transition: transform 0.5s ease;
            }

            .elimination-overlay-system.show .elimination-container {
                transform: scale(1);
            }

            .elimination-header {
                font-size: 36px;
                font-weight: bold;
                color: #ffffff;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                margin-bottom: 20px;
                letter-spacing: 3px;
                animation: pulse 2s infinite;
            }

            .elimination-team-list {
                margin: 20px 0;
            }

            .elimination-team-item {
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                padding: 15px;
                margin: 10px 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                animation: slideIn 0.5s ease forwards;
                opacity: 0;
                transform: translateX(-50px);
            }

            .elimination-team-name {
                font-size: 18px;
                font-weight: bold;
                color: #ffffff;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            }

            .elimination-team-rank {
                font-size: 16px;
                color: #ffaa00;
                font-weight: bold;
                background: rgba(255, 170, 0, 0.2);
                padding: 5px 10px;
                border-radius: 15px;
                border: 1px solid #ffaa00;
            }

            .elimination-rank-info {
                font-size: 14px;
                color: #cccccc;
                margin-top: 20px;
                font-style: italic;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }

            @keyframes slideIn {
                0% { opacity: 0; transform: translateX(-50px); }
                100% { opacity: 1; transform: translateX(0); }
            }

            /* 반응형 디자인 */
            @media (max-width: 600px) {
                .elimination-container {
                    margin: 20px;
                    padding: 20px;
                }
                
                .elimination-header {
                    font-size: 28px;
                }
                
                .elimination-team-name {
                    font-size: 16px;
                }
            }
        `;

        if (!document.querySelector('#elimination-overlay-styles')) {
            style.id = 'elimination-overlay-styles';
            document.head.appendChild(style);
        }
    }

    /**
     * 탈락 팀들을 큐에 추가 (WPF Enqueue 메서드)
     */
    public enqueue(eliminatedTeams: Team2Data[], totalTeamCount: number): void {
        if (eliminatedTeams.length === 0) return;

        console.log(`Enqueuing ${eliminatedTeams.length} eliminated teams`);
        
        // 큐에 추가
        this.queue.push(...eliminatedTeams);

        // 처리 중이 아니면 처리 시작
        if (!this.isProcessing) {
            this.processQueue(totalTeamCount);
        }
    }

    /**
     * 큐 처리
     */
    private async processQueue(totalTeamCount: number): Promise<void> {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;

        // 현재 배치의 팀들 가져오기
        const currentBatch = this.queue.splice(0, Math.min(3, this.queue.length)); // 최대 3팀씩 표시
        
        await this.displayEliminatedTeams(currentBatch, totalTeamCount);

        // 다음 배치 처리
        setTimeout(() => {
            this.processQueue(totalTeamCount);
        }, 500);
    }

    /**
     * 탈락 팀들 표시
     */
    private async displayEliminatedTeams(teams: Team2Data[], totalTeamCount: number): Promise<void> {
        return new Promise((resolve) => {
            // 팀 리스트 컨테이너 가져오기
            const teamList = this.element.querySelector('.elimination-team-list') as HTMLElement;
            const rankInfo = this.element.querySelector('.elimination-rank-info') as HTMLElement;

            // 기존 내용 제거
            teamList.innerHTML = '';

            // 팀들을 순위 순으로 정렬 (높은 순위부터)
            teams.sort((a, b) => (b.rank || 0) - (a.rank || 0));

            // 각 팀 아이템 생성
            teams.forEach((team, index) => {
                const teamItem = document.createElement('div');
                teamItem.className = 'elimination-team-item';
                teamItem.style.animationDelay = `${index * 0.2}s`;

                const teamName = document.createElement('div');
                teamName.className = 'elimination-team-name';
                teamName.textContent = team.name;

                const teamRank = document.createElement('div');
                teamRank.className = 'elimination-team-rank';
                teamRank.textContent = `#${team.rank || '?'}`;

                teamItem.appendChild(teamName);
                teamItem.appendChild(teamRank);
                teamList.appendChild(teamItem);
            });

            // 순위 정보 업데이트
            if (teams.length > 0) {
                const highestRank = Math.max(...teams.map(t => t.rank || 0));
                const lowestRank = Math.min(...teams.map(t => t.rank || 0));
                
                if (teams.length === 1) {
                    rankInfo.textContent = `Finished ${highestRank}${this.getOrdinalSuffix(highestRank)} out of ${totalTeamCount} teams`;
                } else {
                    rankInfo.textContent = `Finished ${lowestRank}${this.getOrdinalSuffix(lowestRank)} - ${highestRank}${this.getOrdinalSuffix(highestRank)} out of ${totalTeamCount} teams`;
                }
            }

            // 오버레이 표시
            this.element.style.display = 'flex';
            setTimeout(() => {
                this.element.classList.add('show');
            }, 50);

            // 3초 후 숨기기
            this.currentDisplayTimeout = setTimeout(() => {
                this.hide();
                resolve();
            }, 3000);
        });
    }

    /**
     * 오버레이 숨기기
     */
    private hide(): void {
        this.element.classList.remove('show');
        
        setTimeout(() => {
            this.element.style.display = 'none';
        }, 500);

        if (this.currentDisplayTimeout) {
            clearTimeout(this.currentDisplayTimeout);
            this.currentDisplayTimeout = undefined;
        }
    }

    /**
     * 서수 접미사 반환 (1st, 2nd, 3rd, 4th...)
     */
    private getOrdinalSuffix(num: number): string {
        const j = num % 10;
        const k = num % 100;
        
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    }

    /**
     * 오버레이 제거
     */
    public destroy(): void {
        if (this.currentDisplayTimeout) {
            clearTimeout(this.currentDisplayTimeout);
        }
        
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
