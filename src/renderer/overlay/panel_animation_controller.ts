// panel_animation_controller.ts
// 패널 애니메이션 및 위치 관리 컨트롤러

import { currentConfig } from './live-standing-config';
import { Team2Data } from './live_team_panel';

/**
 * 순위 변경 정보 인터페이스
 */
interface RankChange {
    teamName: string;
    fromRank: number;
    toRank: number;
}

/**
 * 패널 애니메이션 컨트롤러 클래스 (CSS 기반 + F1 스타일)
 * WPF 버전의 PanelController 역할을 담당하되, 모든 애니메이션은 CSS로 처리
 * F1 스타일 순위 변경 감지 및 애니메이션 관리도 포함
 */
export class PanelAnimationController {
    private prevPosition: number = -1;
    private currentIndex: number = -1;
    private readonly panelHeight: number;

    constructor(currentIndex: number, panelHeight: number) {
        this.currentIndex = currentIndex;
        this.panelHeight = panelHeight;
    }

    /**
     * Canvas.SetTop 동작 모방 (즉시 위치 설정)
     */
    public setTop(panelElement: HTMLElement, position: number): void {
        panelElement.style.position = 'absolute';
        panelElement.style.top = `${position}px`;
    }

    /**
     * 토글 애니메이션 (초기 표시용, CSS 기반)
     */
    public toggleAnimation(panelElement: HTMLElement, callback?: () => void): void {
        // CSS 클래스를 사용한 페이드인 애니메이션
        panelElement.classList.add('panel-fade-in');

        setTimeout(() => {
            panelElement.classList.add('show');

            setTimeout(() => {
                panelElement.classList.remove('panel-fade-in', 'show');
                if (callback) callback();
            }, 300);
        }, 50);
    }

    /**
     * 인덱스와 위치 설정 및 top 스타일 업데이트
     */
    public setIndexAndPosition(panelElement: HTMLElement, index: number, position: number): void {
        this.prevPosition = this.currentIndex >= 0 ? this.currentIndex * this.panelHeight : -1;
        this.currentIndex = index;

        // top 위치 업데이트 (CSS transition이 적용됨)
        this.setTop(panelElement, position);
    }

    /**
     * 이전 위치 반환
     */
    public get PrevPosition(): number {
        return this.prevPosition;
    }

    /**
     * 모든 패널을 올바른 위치로 즉시 이동 (정적 메서드)
     */
    public static snapToPositions(teams: Team2Data[]): void {
        teams.forEach((team, index) => {
            const panelElement = document.querySelector(`[data-team-name="${team.name}"]`) as HTMLElement;
            if (panelElement) {
                // teams-container 내부에서의 상대 위치이므로 titleOffset 불필요
                const position = index * currentConfig.panel_height;
                panelElement.style.position = 'absolute';
                panelElement.style.top = `${position}px`;
                panelElement.classList.remove('panel-rank-changing', 'rank-up-animation', 'rank-down-animation');
                console.log(`[snapToPositions] Team ${team.name}: index=${index}, position=${position}px`);
            }
        });

        console.log(`[PanelAnimationController] Snapped ${teams.length} teams to positions`);
    }

}
