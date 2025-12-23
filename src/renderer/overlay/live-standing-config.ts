// live-standing-config.ts
// 라이브스탠딩 패널의 설정 가능한 값들을 관리하는 설정 파일

/**
 * 라이브스탠딩 패널 설정 인터페이스
 */
export interface LiveStandingConfig {
    // 패널 크기 설정
    panel_height: number;
    panel_title_height: number;
    column_header_height: number; // 컬럼 헤더 높이 (TEAM, ALIVE 등)

    // 각 컬럼 너비 설정
    ranking_width: number;
    logo_width: number;
    team_name_width: number;
    team_name_margin_left: number; // 팀 이름 왼쪽 마진
    total_score_width: number;
    total_kill_width: number;

    // 스쿼드 생존 여부 표시 설정
    squad_health_width: number; // 전체 컨테이너 너비
    squad_health_height: number;
    squad_indicator_width: number; // 개별 인디케이터 너비
    squad_health_color: {
        alive: string;
        dead: string;
        groggy: string;
    };

    // 색상 설정
    colors: {
        background: string;
        text: string;
        border: string;
        header_background: string;
        panel_background: string;
        ranking_text: string;
    };

    // 폰트 설정
    fonts: {
        family: string;
        size: {
            title: number;
            header: number;
            content: number;
            ranking: number;
        };
        weight: {
            title: string;
            header: string;
            content: string;
            ranking: string;
        };
    };

    // 간격 설정
    spacing: {
        content_padding: number;
        column_gap: number;
    };
}

/**
 * 기본 설정값
 */
export const DEFAULT_CONFIG: LiveStandingConfig = {
    // 패널 크기 설정
    panel_height: 32,
    panel_title_height: 40,
    column_header_height: 32, // 컬럼 헤더 높이 (팀 패널과 동일하게 설정)

    // 각 컬럼 너비 설정
    ranking_width: 30,
    logo_width: 40,
    team_name_width: 60,
    team_name_margin_left: 8, // 팀 이름 왼쪽 마진
    total_score_width: 50,
    total_kill_width: 40,

    // 스쿼드 생존 여부 표시 설정
    squad_health_width: 60, // 전체 컨테이너 너비
    squad_health_height: 16,
    squad_indicator_width: 12, // 개별 인디케이터 너비
    squad_health_color: {
        alive: '#FFEB3B',    // 노란색 - 생존
        dead: '#F44336',     // 빨간색 - 사망
        groggy: '#FF9800'    // 주황색 - 기절
    },

    // 색상 설정
    colors: {
        background: 'transparent',
        text: '#FFFFFF',
        border: 'rgba(255, 255, 255, 0.3)',
        header_background: 'rgba(76, 175, 80, 0.8)',
        panel_background: 'rgba(0, 0, 0, 0.6)',
        ranking_text: '#FFD700'
    },

    // 폰트 설정
    fonts: {
        family: 'Arial, sans-serif',
        size: {
            title: 16,
            header: 12,
            content: 11,
            ranking: 14
        },
        weight: {
            title: 'bold',
            header: 'bold',
            content: 'normal',
            ranking: 'bold'
        }
    },

    // 간격 설정
    spacing: {
        content_padding: 4,
        column_gap: 2
    }
};

/**
 * 현재 설정값 (런타임에서 변경 가능)
 */
export let currentConfig: LiveStandingConfig = {...DEFAULT_CONFIG};

/**
 * 설정값 업데이트
 */
export function updateConfig(newConfig: Partial<LiveStandingConfig>): void {
    currentConfig = {...currentConfig, ...newConfig};
}

/**
 * 설정값 초기화
 */
export function resetConfig(): void {
    currentConfig = {...DEFAULT_CONFIG};
}

/**
 * 전체 패널 너비 계산
 */
export function calculateTotalPanelWidth(config: LiveStandingConfig = currentConfig): number {
    return config.ranking_width +
        config.logo_width +
        config.team_name_width +
        config.team_name_margin_left + // 팀 이름 왼쪽 마진 추가
        config.squad_health_width +
        config.total_score_width +
        config.total_kill_width +
        (config.spacing.column_gap * 5) + // 컬럼 간 간격
        config.spacing.content_padding; // 왼쪽 패딩만 (오른쪽 패딩 제거)
}

/**
 * 설정값을 CSS 변수로 변환
 */
export function configToCSSVariables(config: LiveStandingConfig = currentConfig): Record<string, string> {
    return {
        '--panel-height': `${config.panel_height}px`,
        '--panel-title-height': `${config.panel_title_height}px`,
        '--column-header-height': `${config.column_header_height}px`,
        '--ranking-width': `${config.ranking_width}px`,
        '--logo-width': `${config.logo_width}px`,
        '--team-name-width': `${config.team_name_width}px`,
        '--team-name-margin-left': `${config.team_name_margin_left}px`,
        '--squad-health-width': `${config.squad_health_width}px`,
        '--squad-health-height': `${config.squad_health_height}px`,
        '--squad-indicator-width': `${config.squad_indicator_width}px`,
        '--total-score-width': `${config.total_score_width}px`,
        '--total-kill-width': `${config.total_kill_width}px`,
        '--squad-alive-color': config.squad_health_color.alive,
        '--squad-dead-color': config.squad_health_color.dead,
        '--squad-groggy-color': config.squad_health_color.groggy,
        '--background-color': config.colors.background,
        '--text-color': config.colors.text,
        '--border-color': config.colors.border,
        '--header-background': config.colors.header_background,
        '--panel-background': config.colors.panel_background,
        '--ranking-text-color': config.colors.ranking_text,
        '--font-family': config.fonts.family,
        '--title-font-size': `${config.fonts.size.title}px`,
        '--header-font-size': `${config.fonts.size.header}px`,
        '--content-font-size': `${config.fonts.size.content}px`,
        '--ranking-font-size': `${config.fonts.size.ranking}px`,
        '--title-font-weight': config.fonts.weight.title,
        '--header-font-weight': config.fonts.weight.header,
        '--content-font-weight': config.fonts.weight.content,
        '--ranking-font-weight': config.fonts.weight.ranking,
        '--content-padding': `${config.spacing.content_padding}px`,
        '--column-gap': `${config.spacing.column_gap}px`,
        '--total-panel-width': `${calculateTotalPanelWidth(config)}px`
    };
}

/**
 * CSS 변수를 DOM에 적용
 */
export function applyCSSVariables(config: LiveStandingConfig = currentConfig): void {
    const cssVars = configToCSSVariables(config);
    const root = document.documentElement;

    Object.entries(cssVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });
}
