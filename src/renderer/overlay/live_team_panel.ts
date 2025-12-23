// live_team_panel.ts
// 개별 팀 패널 컴포넌트

import {currentConfig} from './live-standing-config';
import {PanelAnimationController} from './panel_animation_controller';
import gsap from 'gsap';

/**
 * TeamLocation 인터페이스 (protobuf 스키마 기반)
 */
export interface TeamLocation {
    phase: number;
    x: number;
    y: number;
    z: number;
    eliminated: boolean;
    elapsed_in_sec: number;
}

/**
 * KillLog 인터페이스 (protobuf 스키마 기반)
 */
export interface KillLog {
    victim_name: string;
    killed_at: number;
    x: number;
    y: number;
    z: number;
}

/**
 * MobileTeamTelemetry 인터페이스 (protobuf 스키마 기반)
 */
export interface MobileTeamTelemetry {
    kills_with_grenade: number;
    air_drop_acquisitions: number;
    smoke_grenades_uses: number;
    frag_grenades_uses: number;
    heals: number;
    revives: number;
}

/**
 * Team2 인터페이스 (protobuf 스키마 기반)
 */
export interface Team2Data {
    name: string;
    id: number;
    kills_per_team: { [key: string]: number };
    total_kills: number;
    deaths: number;
    placement_score: number;
    extra_score: number;
    wwcd: number;
    rank: number;
    eliminated_at: number;
    kill_steals: number;
    total_score: number;
    time_survived: number;
    matches_joined: number;
    avg_kills: number;
    avg_score: number;
    avg_time_survived: number;
    damage_dealt: number;
    nb_of_groggied: number;
    nb_of_make_groggy: number;
    revives: number;
    highest_match_total_score: number;
    highest_match_kills: number;
    highest_match_damage_dealt: number;
    highest_match_rank: number;
    latest_match_total_score: number;
    latest_match_kill: number;
    latest_match_rank: number;
    placement_rank: number;
    penalty: number;
    rank_ad: number;
    phase_locations: TeamLocation[];
    landing_location?: TeamLocation;
    total_distance: number;
    last_standing_player: string;
    eliminated: boolean;
    last_eliminated_at: number;
    latest_match_time_survived: number;
    kill_logs: KillLog[];
    mob?: MobileTeamTelemetry;
    full_name: string;
    region_code: number;
}

/**
 * PostDataStats 인터페이스 (protobuf 스키마 기반)
 */
export interface PostDataStats {
    death_type: string;
    assists: number;
    boosts: number;
    damage_dealt: number;
    headshot_kills: number;
    heals: number;
    kill_places: number;
    kill_points: number;
    kill_points_delta: number;
    kill_streaks: number;
    kills: number;
    last_kill_points: number;
    last_win_points: number;
    longest_kill: number;
    most_damage: number;
    revives: number;
    ride_distance: number;
    road_kills: number;
    swim_distance: number;
    team_kill: number;
    time_survived: number;
    vehicle_destroys: number;
    walk_distance: number;
    weapons_acquired: number;
    win_place: number;
    win_points: number;
    win_points_delta: number;
    total_distance: number;
}

/**
 * TelemetryStats 인터페이스 (protobuf 스키마 기반)
 */
export interface TelemetryStats {
    is_groggy: boolean;
    is_alive: boolean;
    killed_by: string;
    assists: number;
    heals: number;
    kills: number;
    total_damage_dealt: number;
    head_damage_dealt: number;
    arm_damage_dealt: number;
    torso_damage_dealt: number;
    pelvis_damage_dealt: number;
    leg_damage_dealt: number;
    total_kill_rank: number;
    total_damage_rank: number;
    killed_at: number;
    nb_of_groggied: number;
    nb_of_headshots: number;
    nb_of_painkillers_use: number;
    nb_of_grenades_use: number;
    nb_of_drink_use: number;
    nb_of_bandage_use: number;
    total_deaths: number;
    total_match_joined: number;
    nb_of_make_groggy: number;
    nb_of_shots: number;
    last_loc_x: number;
    last_loc_y: number;
    last_loc_z: number;
    landing_loc_x: number;
    landing_loc_y: number;
    landing_loc_z: number;
    eliminated_at: number;
    player_killed: string[];
}

/**
 * MobilePlayerTelemetry 인터페이스 (protobuf 스키마 기반)
 */
export interface MobilePlayerTelemetry {
    time_in_bluezone: number;
    damage_taken: number;
    air_drop_acquisitions: number;
    smoke_grenades_uses: number;
    frag_grenades_uses: number;
    kills_with_grenade: number;
    revives: number;
}

/**
 * Player2 인터페이스 (protobuf 스키마 기반)
 */
export interface Player2Data {
    name: string;
    id: string;
    team_name: string;
    team_id: number;
    post_data_pb?: PostDataStats;
    telemetry_pb?: TelemetryStats;
    mob?: MobilePlayerTelemetry;
}

/**
 * 스쿼드 생존 상태
 */
export interface SquadStatus {
    alive: number;
    dead: number;
    groggy: number;
    total: number;
}

/**
 * 라이브 팀 패널 클래스
 */
export class LiveTeamPanel {
    private readonly element: HTMLElement;
    private teamData: Team2Data;
    private squadStatus: SquadStatus;
    private controller: PanelAnimationController;
    private eliminated: boolean = false;
    private inMatch: boolean = true;
    private previousRank: number = -1; // 이전 순위 저장

    constructor(teamData: Team2Data, players: Player2Data[] = [], currentIndex: number = 0) {
        this.teamData = teamData;
        this.squadStatus = this.calculateSquadStatus(players);
        this.controller = new PanelAnimationController(currentIndex, currentConfig.panel_height);
        this.element = this.createElement();
        this.previousRank = teamData.rank; // 초기 순위 저장
    }

    /**
     * 스쿼드 생존 상태 계산
     */
    private calculateSquadStatus(players: Player2Data[]): SquadStatus {
        // team_id로 먼저 매칭 시도
        let teamPlayers = players.filter(p => p.team_id === this.teamData.id);

        // team_id로 매칭이 안되면 team_name으로 매칭 시도
        if (teamPlayers.length === 0) {
            teamPlayers = players.filter(p => p.team_name === this.teamData.name);
            console.log(`[${this.teamData.name}] No players found by team_id (${this.teamData.id}), trying team_name match`);
        }

        console.log(`[${this.teamData.name}] Calculating squad status for ${teamPlayers.length} players`);
        console.log(`[${this.teamData.name}] Team ID: ${this.teamData.id}, Team Name: ${this.teamData.name}`);
        console.log(`[${this.teamData.name}] All players:`, players.map(p => ({
            name: p.name,
            team_id: p.team_id,
            team_name: p.team_name
        })));
        console.log(`[${this.teamData.name}] Matched players:`, teamPlayers.map(p => ({
            name: p.name,
            team_id: p.team_id,
            team_name: p.team_name
        })));

        let alive = 0;
        let dead = 0;
        let groggy = 0;

        teamPlayers.forEach((player, index) => {
            console.log(`[${this.teamData.name}] Player ${index + 1} data:`, {
                name: player.name,
                post_data_pb: player.post_data_pb,
                telemetry_pb: player.telemetry_pb
            });

            // protobuf 스키마의 post_data_pb.death_type 우선 사용
            if (player.post_data_pb?.death_type) {
                switch (player.post_data_pb.death_type) {
                    case "alive":
                        alive++;
                        console.log(`[${this.teamData.name}] Player ${index + 1} (${player.name}): ALIVE (post_data_pb)`);
                        break;
                    case "groggy":
                        groggy++;
                        console.log(`[${this.teamData.name}] Player ${index + 1} (${player.name}): GROGGY (post_data_pb)`);
                        break;
                    default:
                        dead++;
                        console.log(`[${this.teamData.name}] Player ${index + 1} (${player.name}): DEAD (${player.post_data_pb.death_type}) (post_data_pb)`);
                        break;
                }
            } else if (player.telemetry_pb) {
                // telemetry_pb 방식 fallback
                if (player.telemetry_pb.is_alive) {
                    if (player.telemetry_pb.is_groggy) {
                        groggy++;
                        console.log(`[${this.teamData.name}] Player ${index + 1} (${player.name}): GROGGY (telemetry_pb)`);
                    } else {
                        alive++;
                        console.log(`[${this.teamData.name}] Player ${index + 1} (${player.name}): ALIVE (telemetry_pb)`);
                    }
                } else {
                    dead++;
                    console.log(`[${this.teamData.name}] Player ${index + 1} (${player.name}): DEAD (telemetry_pb)`);
                }
            } else {
                // 데이터가 없으면 생존으로 가정
                alive++;
                console.log(`[${this.teamData.name}] Player ${index + 1} (${player.name}): ALIVE (no data - default)`);
            }
        });

        // 플레이어가 없으면 기본값으로 4명 모두 생존으로 설정
        if (teamPlayers.length === 0) {
            console.log(`[${this.teamData.name}] No players found, using default: 4 alive`);
            return {
                alive: 4,
                dead: 0,
                groggy: 0,
                total: 4
            };
        }

        const squadStatus = {
            alive,
            dead,
            groggy,
            total: Math.max(teamPlayers.length, 4) // 최소 4명으로 설정
        };

        console.log(`[${this.teamData.name}] Final squad status:`, squadStatus);
        return squadStatus;
    }

    /**
     * 패널 엘리먼트 생성 (HTML 템플릿 사용)
     */
    private createElement(): HTMLElement {
        // HTML 템플릿에서 복제
        const template = document.getElementById('live-team-panel-template') as HTMLTemplateElement;
        if (!template) {
            console.error('Live team panel template not found');
            return this.createElementFallback();
        }

        const panelElement = template.content.cloneNode(true) as DocumentFragment;
        const panel = panelElement.querySelector('.live-team-panel') as HTMLElement;

        if (!panel) {
            console.error('Panel element not found in template');
            return this.createElementFallback();
        }

        // 데이터 설정
        panel.dataset.teamId = this.teamData.id.toString();

        // 각 요소에 데이터 설정
        this.updatePanelContent(panel);

        // 팀이 탈락했으면 스타일 변경
        if (this.teamData.eliminated) {
            panel.classList.add('eliminated');
        }

        // CSS 스타일 적용
        this.applyStyles();

        return panel;
    }

    /**
     * 템플릿을 찾을 수 없을 때 사용하는 폴백 메서드
     */
    private createElementFallback(): HTMLElement {
        const panelElement = document.createElement('div');
        panelElement.className = 'live-team-panel';
        panelElement.dataset.teamId = this.teamData.id.toString();
        panelElement.innerHTML = `
            <div class="panel-ranking"></div>
            <div class="panel-logo"></div>
            <div class="panel-team-name" title=""></div>
            <div class="panel-squad-health">
                <div class="squad-indicators"></div>
            </div>
            <div class="panel-total-score"></div>
            <div class="panel-total-kill"></div>
        `;

        this.updatePanelContent(panelElement);

        // 팀이 탈락했으면 스타일 변경
        if (this.teamData.eliminated) {
            panelElement.classList.add('eliminated');
        }

        return panelElement;
    }

    /**
     * 패널 내용 업데이트
     */
    private updatePanelContent(panel: HTMLElement): void {
        // 랭킹
        const ranking = panel.querySelector('.panel-ranking') as HTMLElement;
        if (ranking) {
            ranking.textContent = this.teamData.rank.toString();
        }

        // 로고
        const logo = panel.querySelector('.panel-logo') as HTMLElement;
        if (logo) {
            this.loadTeamLogo(logo, this.teamData);
        }

        // 팀 이름
        const teamName = panel.querySelector('.panel-team-name') as HTMLElement;
        if (teamName) {
            teamName.textContent = this.getDisplayTeamName();
            teamName.title = this.teamData.full_name || this.teamData.name;
        }

        // 스쿼드 생존 상태
        const squadHealth = panel.querySelector('.panel-squad-health .squad-indicators') as HTMLElement;
        if (squadHealth) {
            squadHealth.innerHTML = ''; // 기존 내용 제거
            squadHealth.appendChild(this.createSquadHealthIndicators());
        }

        // 총 점수
        const totalScore = panel.querySelector('.panel-total-score') as HTMLElement;
        if (totalScore) {
            totalScore.textContent = Math.round(this.teamData.total_score).toString();
        }

        // 총 킬수
        const totalKill = panel.querySelector('.panel-total-kill') as HTMLElement;
        if (totalKill) {
            totalKill.textContent = Math.round(this.teamData.total_kills).toString();
        }
    }

    /**
     * 팀 로고 로딩 (WPF 스타일)
     */
    private loadTeamLogo(logoElement: HTMLElement, team: Team2Data): void {
        // 지역 코드 기반 로고 사용 여부 확인 (설정에서 가져와야 함)
        const useRegion = false; // 추후 설정에서 가져오기

        if (useRegion) {
            // 지역 기반 로고
            this.loadRegionLogo(logoElement, team);
        } else {
            // 팀별 개별 로고
            this.loadIndividualTeamLogo(logoElement, team);
        }
    }

    /**
     * 지역 기반 로고 로딩
     */
    private loadRegionLogo(logoElement: HTMLElement, team: Team2Data): void {
        const img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';

        // protobuf 스키마의 region_code에 따른 로고
        // region_code가 1이면 JP, 아니면 KR
        if (team.region_code === 1) {
            img.src = './resources/region/jp.png';
            img.alt = 'JP';
        } else {
            img.src = './resources/region/kr.png';
            img.alt = 'KR';
        }

        img.onerror = () => {
            // 로고 로딩 실패 시 텍스트 fallback
            this.setFallbackLogo(logoElement, team);
        };

        logoElement.innerHTML = '';
        logoElement.appendChild(img);
    }

    /**
     * 개별 팀 로고 로딩
     */
    private loadIndividualTeamLogo(logoElement: HTMLElement, team: Team2Data): void {
        const img = document.createElement('img');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';

        // 팀 이름 기반 로고 파일 경로
        img.src = `./logo/${team.name}.png`;
        img.alt = team.name;

        img.onerror = () => {
            // 로고 로딩 실패 시 텍스트 fallback
            this.setFallbackLogo(logoElement, team);
        };

        img.onload = () => {
            console.log(`Successfully loaded logo for team: ${team.name}`);
        };

        logoElement.innerHTML = '';
        logoElement.appendChild(img);
    }

    /**
     * 로고 로딩 실패 시 fallback 텍스트 설정
     */
    private setFallbackLogo(logoElement: HTMLElement, team: Team2Data): void {
        logoElement.innerHTML = '';
        logoElement.textContent = this.getDisplayTeamName();
        logoElement.style.display = 'flex';
        logoElement.style.alignItems = 'center';
        logoElement.style.justifyContent = 'center';
        logoElement.style.fontSize = 'var(--content-font-size)';
        logoElement.style.fontWeight = 'var(--content-font-weight)';
    }

    /**
     * 표시할 팀 이름 가져오기
     */
    private getDisplayTeamName(): string {
        return this.teamData.name
    }

    /**
     * 스쿼드 생존 상태 인디케이터 생성 (템플릿 사용)
     */
    private createSquadHealthIndicators(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'squad-indicators';

        console.log(`[${this.teamData.name}] Creating health indicators:`, this.squadStatus);

        // 스쿼드 인디케이터 템플릿 가져오기
        const indicatorTemplate = document.getElementById('squad-indicator-template') as HTMLTemplateElement;

        for (let i = 0; i < this.squadStatus.total; i++) {
            let indicator: HTMLElement;

            if (indicatorTemplate) {
                // 템플릿에서 복제
                const indicatorFragment = indicatorTemplate.content.cloneNode(true) as DocumentFragment;
                indicator = indicatorFragment.querySelector('.squad-indicator') as HTMLElement;
            } else {
                // 폴백: 직접 생성
                indicator = document.createElement('div');
                indicator.className = 'squad-indicator';
            }

            let indicatorType = '';
            if (i < this.squadStatus.alive) {
                indicator.classList.add('alive');
                indicatorType = 'alive';
                // 강제로 노란색 스타일 적용 (디버깅용)
                indicator.style.backgroundColor = '#FFEB3B';
                indicator.style.boxShadow = '0 0 4px rgba(255, 235, 59, 0.5)';
            } else if (i < this.squadStatus.alive + this.squadStatus.groggy) {
                indicator.classList.add('groggy');
                indicatorType = 'groggy';
                // 강제로 주황색 스타일 적용 (디버깅용)
                indicator.style.backgroundColor = '#FF9800';
                indicator.style.boxShadow = '0 0 4px rgba(255, 152, 0, 0.5)';
            } else {
                indicator.classList.add('dead');
                indicatorType = 'dead';
                // 강제로 빨간색 스타일 적용 (디버깅용)
                indicator.style.backgroundColor = '#F44336';
                indicator.style.opacity = '0.7';
            }

            console.log(`[${this.teamData.name}] Indicator ${i + 1}: ${indicatorType}, classes: ${indicator.className}, style: ${indicator.style.backgroundColor}`);
            container.appendChild(indicator);
        }

        return container;
    }

    /**
     * CSS 스타일 적용
     */
    private applyStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .live-team-panel {
                width: var(--total-panel-width);
                height: var(--panel-height);
                background: var(--panel-background);
                color: var(--text-color);
                font-family: var(--font-family);
                border: none; /* 외곽선 제거 */
                display: flex;
                align-items: center;
                padding: 0 var(--content-padding);
                gap: var(--column-gap);
                box-sizing: border-box;
            }



            .live-team-panel.eliminated {
                opacity: 0.6;
                background: rgba(128, 128, 128, 0.3);
            }

            .panel-ranking {
                width: var(--ranking-width);
                font-size: var(--ranking-font-size);
                font-weight: var(--ranking-font-weight);
                color: var(--ranking-text-color);
                text-align: center;
                text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.8);
                transition: background 0.3s ease, border-color 0.3s ease, opacity 0.3s ease;
            }

            .panel-logo {
                width: var(--logo-width);
                height: calc(var(--panel-height) - 8px);
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid var(--border-color);
                border-radius: 0px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: var(--content-font-size);
                font-weight: var(--content-font-weight);
                text-align: center;
            }

            .panel-team-name {
                width: var(--team-name-width);
                margin-left: var(--team-name-margin-left);
                font-size: var(--content-font-size);
                font-weight: var(--content-font-weight);
                text-align: left;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .panel-squad-health {
                width: var(--squad-health-width);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .squad-indicators {
                display: flex;
                gap: 2px;
                width: 100%;
                justify-content: center;
            }

            .squad-indicator {
                width: var(--squad-indicator-width);
                height: var(--squad-health-height);
                border-radius: 2px;
                border: 1px solid rgba(0, 0, 0, 0.3);
                flex-shrink: 0;
            }

            .squad-indicator.alive {
                background: var(--squad-alive-color);
                box-shadow: 0 0 4px var(--squad-alive-color);
            }

            .squad-indicator.groggy {
                background: var(--squad-groggy-color);
                box-shadow: 0 0 4px var(--squad-groggy-color);
            }

            .squad-indicator.dead {
                background: var(--squad-dead-color);
                box-shadow: 0 0 4px var(--squad-dead-color);
            }

            .panel-total-score {
                width: var(--total-score-width);
                font-size: var(--content-font-size);
                font-weight: var(--content-font-weight);
                text-align: center;
                color: #FFD700;
            }

            .panel-total-kill {
                width: var(--total-kill-width);
                font-size: var(--content-font-size);
                font-weight: var(--content-font-weight);
                text-align: center;
                color: #FF6B6B;
            }
        `;

        // 스타일을 head에 추가 (중복 방지)
        if (!document.querySelector('#live-team-panel-styles')) {
            style.id = 'live-team-panel-styles';
            document.head.appendChild(style);
        }
    }

    /**
     * 팀 데이터 업데이트 (WPF UpdatePanel 메서드 기반)
     */
    public updatePanel(
        team: Team2Data,
        matchTeam: Team2Data,
        playersMap: Map<string, Player2Data[]>,
        currentIndex: number,
        refresh: boolean = false
    ): boolean {
        let eliminated = false;

        // 플레이어 맵에서 팀 플레이어들 가져오기
        const players = playersMap.get(team.name) || [];

        // 모든 플레이어가 사망했는지 확인 (WPF 로직: v.All(player => player.PostDataPb.DeathType != "alive"))
        if (players.length > 0) {
            eliminated = players.every(player => {
                // protobuf 스키마의 post_data_pb.death_type 우선 확인
                if (player.post_data_pb?.death_type) {
                    return player.post_data_pb.death_type !== "alive";
                }
                // fallback: telemetry_pb 데이터 확인
                if (player.telemetry_pb) {
                    return !player.telemetry_pb.is_alive;
                }
                // 데이터가 없으면 생존으로 간주
                return false;
            });
        }

        this.inMatch = players.length !== 0;

        // 팀 데이터 업데이트
        this.teamData = team;
        this.squadStatus = this.calculateSquadStatus(players);

        // 패널 투명도 설정 (매치 참여 여부에 따라)
        this.element.style.opacity = this.inMatch ? '1.0' : '0.3';

        // 랭킹 텍스트 설정
        const rankText = team.total_score === 0 ? '-' : team.rank.toString();

        // 디스플레이 업데이트
        this.updateDisplayElements(team, matchTeam, rankText);

        // 위치 및 애니메이션 처리
        // currentIndex는 1부터 시작하므로 0-based로 변환
        const newPosition = (currentIndex - 1) * currentConfig.panel_height;
        this.handlePositionAndAnimation(currentIndex, newPosition, refresh);

        // 탈락 처리
        return this.handleElimination(eliminated);
    }

    /**
     * 디스플레이 요소들 업데이트
     */
    private updateDisplayElements(team: Team2Data, matchTeam: Team2Data, rankText: string): void {
        // 랭킹 업데이트
        const ranking = this.element.querySelector('.panel-ranking');
        if (ranking) ranking.textContent = rankText;

        // 팀 이름 업데이트
        const teamName = this.element.querySelector('.panel-team-name');
        if (teamName) {
            teamName.textContent = this.getDisplayTeamName();
            (teamName as HTMLElement).title = team.full_name || team.name;
        }

        // 스쿼드 상태 업데이트
        const squadHealth = this.element.querySelector('.panel-squad-health');
        if (squadHealth) {
            console.log(`[${this.teamData.name}] Updating squad health indicators:`, this.squadStatus);
            squadHealth.innerHTML = '';
            const newIndicators = this.createSquadHealthIndicators();
            squadHealth.appendChild(newIndicators);

            // 생성된 인디케이터 확인
            const indicators = newIndicators.querySelectorAll('.squad-indicator');
            console.log(`[${this.teamData.name}] Created ${indicators.length} indicators`);
            indicators.forEach((indicator, index) => {
                const classes = Array.from(indicator.classList);
                console.log(`[${this.teamData.name}] Indicator ${index + 1} classes:`, classes);
            });
        } else {
            console.warn(`[${this.teamData.name}] Squad health container not found!`);
        }

        // 점수 업데이트
        const totalScore = this.element.querySelector('.panel-total-score');
        if (totalScore) totalScore.textContent = Math.round(team.total_score).toString();

        // 킬수 업데이트 (matchTeam에서 가져옴)
        const totalKill = this.element.querySelector('.panel-total-kill');
        if (totalKill) totalKill.textContent = Math.round(matchTeam.total_kills).toString();
    }

    /**
     * 위치 및 애니메이션 처리
     */
    private handlePositionAndAnimation(currentIndex: number, newPosition: number, refresh: boolean): void {
        const isInitialPosition = this.controller.PrevPosition < 0;
        const currentRank = this.teamData.rank;

        if (!isInitialPosition && !refresh) {
            // 순위 변경 감지 (rank 기반)
            if (this.previousRank > 0 && this.previousRank !== currentRank) {
                if (this.previousRank > currentRank) {
                    // 이전 순위가 더 크면 순위 상승 (예: 5위 -> 3위)
                    console.log(`[${this.teamData.name}] Rank up: ${this.previousRank} -> ${currentRank}`);
                    this.playInkwellAnimation('up');
                } else {
                    // 이전 순위가 더 작으면 순위 하락 (예: 3위 -> 5위)
                    console.log(`[${this.teamData.name}] Rank down: ${this.previousRank} -> ${currentRank}`);
                    this.playInkwellAnimation('down');
                }
            }
        } else if (isInitialPosition) {
            // 첫 생성시
            console.log(`[${this.teamData.name}] Initial position: currentIndex=${currentIndex}, rank=${currentRank}`);

            if (refresh) {
                this.controller.toggleAnimation(this.element);
            }
        }

        // 현재 순위를 이전 순위로 저장
        this.previousRank = currentRank;

        // 인덱스와 위치 업데이트 (top 스타일도 함께 업데이트됨)
        this.controller.setIndexAndPosition(this.element, currentIndex, newPosition);
    }

    /**
     * 리니어 채우기 애니메이션 재생 (2단계: 색상 -> 원래 색)
     * @param direction 'up' (녹색) 또는 'down' (빨간색)
     */
    private playInkwellAnimation(direction: 'up' | 'down'): void {
        // 기존 애니메이션 클래스 제거
        this.element.classList.remove('rank-up-inkwell', 'rank-down-inkwell');

        // 방향에 따라 클래스 추가
        const className = direction === 'up' ? 'rank-up-inkwell' : 'rank-down-inkwell';
        this.element.classList.add(className);

        const duration = 0.3;

        // 초기 상태 설정
        this.element.style.setProperty('--inkwell-progress', '0%');
        this.element.style.setProperty('--inkwell-opacity-value', '1');
        this.element.style.setProperty('--inkwell-progress-2', '0%');
        this.element.style.setProperty('--inkwell-display-2', 'none');

        // GSAP 마스터 타임라인 생성
        const masterTimeline = gsap.timeline({
            onComplete: () => {
                // 모든 애니메이션 완료 후 클래스 및 CSS 변수 제거
                this.element.classList.remove(className);
                this.element.style.removeProperty('--inkwell-progress');
                this.element.style.removeProperty('--inkwell-opacity-value');
                this.element.style.removeProperty('--inkwell-progress-2');
                this.element.style.removeProperty('--inkwell-display-2');
            }
        });

        // === 1단계: 색상 리니어 채우기 (녹색 또는 빨간색) ===
        // 왼쪽에서 오른쪽으로 리니어하게 채움
        masterTimeline.to(this.element, {
            '--inkwell-progress': '100%',
            duration: duration,
            ease: 'none' // 리니어 애니메이션
        }, 0);

        // === 2단계: 원래 색 리니어 채우기 (딜레이 후 시작) ===
        const delayBeforeSecondInkwell = direction === 'up' ? 0.6 : 0.3;
        const secondInkwellStart = duration + delayBeforeSecondInkwell;

        // 두 번째 레이어 표시 및 초기 상태 설정
        masterTimeline.set(this.element, {
            '--inkwell-progress-2': '0%',
            '--inkwell-display-2': 'block'
        }, secondInkwellStart);

        // 왼쪽에서 오른쪽으로 리니어하게 채움
        masterTimeline.to(this.element, {
            '--inkwell-progress-2': '100%',
            duration: duration,
            ease: 'none' // 리니어 애니메이션
        }, secondInkwellStart);

        // 애니메이션 완료 후 두 번째 레이어 숨김
        masterTimeline.set(this.element, {
            '--inkwell-display-2': 'none'
        }, secondInkwellStart + duration);
    }

    /**
     * FIXME(Gigone): 탈락 처리
     */
    private handleElimination(eliminated: boolean): boolean {
        let justEliminated = false;

        // WPF 로직: if (inMatch && !_eliminated && eliminated)
        if (this.inMatch && !this.eliminated && eliminated) {
            console.log(`Team ${this.teamData.name} just got eliminated!`);
            this.eliminated = justEliminated = true;
            //
            // // 탈락 애니메이션 실행 (WPF의 EliminationCanvas.Visibility = Visibility.Visible과 동일)
            // this.controller.beginEliminationAnimation(this.element).then(() => {
            //     // 애니메이션 완료 후 처리
            //     this.element.classList.add('eliminated');
            // });
        } else {
            // WPF 로직: EleImageBorder.Opacity = eliminated ? _theme.OpacityOnDead : 0;
            if (eliminated && this.eliminated) {
                // 이미 탈락 처리된 팀의 투명도 설정
                this.element.style.opacity = '0.3';
                this.element.classList.add('eliminated');
            } else if (!eliminated) {
                // 탈락하지 않은 팀
                this.element.style.opacity = '1.0';
                this.element.classList.remove('eliminated');
                // 탈락 상태 리셋 (부활한 경우)
                this.eliminated = false;
            }
        }

        return justEliminated;
    }

    /**
     * 디스플레이 업데이트 (기존 메서드, 하위 호환성)
     */
    private updateDisplay(): void {
        this.updateDisplayElements(this.teamData, this.teamData, this.teamData.rank.toString());
        this.handleElimination(this.teamData.eliminated);
    }

    /**
     * DOM에 패널 추가
     */
    public appendTo(parent: HTMLElement): void {
        parent.appendChild(this.element);
    }

    /**
     * DOM에서 패널 제거
     */
    public remove(): void {
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * 엘리먼트 반환
     */
    public getElement(): HTMLElement {
        return this.element;
    }

    /**
     * 팀 데이터 반환
     */
    public getTeamData(): Team2Data {
        return this.teamData;
    }
}
