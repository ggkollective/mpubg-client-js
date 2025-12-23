import {Team2Data, Player2Data} from './overlay/live_team_panel';

/**
 * 테스트 데이터의 원본 형식 인터페이스
 */
interface MessageData {
    matchId: string;
    tournamentId: string;
    playerStats: PlayerStat[];
    totalPlayerStats: PlayerStat[];
    teamStats: TeamStat[];
    totalTeamStats: TotalTeamStat[];
    refresh?: boolean;
}

interface PlayerStat {
    name: string;
    id: string;
    teamName: string;
    teamId?: string;
    postDataPb?: {
        deathType?: string;
        damageDealt?: number;
        kills?: number;
    };
}

interface TeamStat {
    name: string;
    id: string;
    rank: number;
    totalKills?: number;
}

interface TotalTeamStat {
    name: string;
    team_id: number;
    totalKills: number;
    deaths?: number;
    rank: number;
    totalScore: number;
    matchesJoined?: string;
    placementScore?: number;
    wwcd?: number;
}

/**
 * ObserverMessage2 형식 인터페이스
 */
export interface ObserverMessage2 {
    match_id: Uint8Array;
    tournament_id: string;
    player_stats: Player2Data[];
    total_player_stats: Player2Data[];
    team_stats: Team2Data[];
    total_team_stats: Team2Data[];
    refresh: boolean;
}

/**
 * 테스트 데이터 변환기 클래스
 */
class MessageDataConverter {
    /**
     * 테스트 데이터를 ObserverMessage2 형식으로 변환
     */
    public static convertToObserverMessage2(Data: MessageData): ObserverMessage2 {
        try {
            return {
                match_id: this.stringToUint8Array(Data.matchId),
                tournament_id: Data.tournamentId,
                player_stats: this.convertPlayerStats(Data.playerStats),
                total_player_stats: this.convertPlayerStats(Data.totalPlayerStats),
                team_stats: this.convertTeamStats(Data.teamStats),
                total_team_stats: this.convertTotalTeamStats(Data.totalTeamStats),
                refresh: Data.refresh || false
            };
        } catch (error) {
            console.error('Failed to convert  data:', error);
            throw error;
        }
    }

    /**
     * 문자열을 Uint8Array로 변환
     */
    private static stringToUint8Array(str: string): Uint8Array {
        const encoder = new TextEncoder();
        return encoder.encode(str);
    }

    /**
     * 플레이어 통계 변환
     */
    private static convertPlayerStats(playerStats: PlayerStat[]): Player2Data[] {
        return playerStats.map(player => {
            const telemetry = this.convertPlayerTelemetry(player.postDataPb);
            const postData = this.convertPostData(player.postDataPb);

            // teamId가 없으면 teamName으로 ID 생성
            let teamId = 0;
            if (player.teamId) {
                teamId = parseInt(player.teamId);
            } else if (player.teamName) {
                teamId = this.generateTeamId(player.teamName);
            }

            console.log(`Converting player: ${player.name}, teamName: ${player.teamName}, teamId: ${player.teamId} -> ${teamId}`);

            return {
                name: player.name,
                team_name: player.teamName,
                team_id: teamId,
                post_data_pb: postData,
                telemetry_pb: telemetry,
                mob: undefined
            };
        });
    }

    /**
     * 플레이어 PostData 변환
     */
    private static convertPostData(postDataPb?: PlayerStat['postDataPb']): {
        death_type: string;
        kills: number;
        damage_dealt: number;
    } {
        if (!postDataPb) {
            console.log('No postDataPb, defaulting to alive');
            return {
                death_type: 'alive',
                kills: 0,
                damage_dealt: 0
            };
        }

        const deathType = postDataPb.deathType || 'alive'; // deathType이 없으면 alive로 기본값
        console.log(`Converting postData: deathType=${postDataPb.deathType} -> ${deathType}`);

        return {
            death_type: deathType,
            kills: postDataPb.kills || 0,
            damage_dealt: postDataPb.damageDealt || 0
        };
    }

    /**
     * 플레이어 텔레메트리 데이터 변환
     */
    private static convertPlayerTelemetry(postDataPb?: PlayerStat['postDataPb']): {
        is_alive: boolean;
        is_groggy: boolean
    } {
        if (!postDataPb) {
            return {
                is_alive: true,
                is_groggy: false
            };
        }

        const deathType = postDataPb.deathType || 'alive';

        return {
            is_alive: deathType === 'alive' || deathType === 'groggy',
            is_groggy: deathType === 'groggy'
        };
    }

    /**
     * 팀 통계 변환 (현재 게임 상태)
     */
    private static convertTeamStats(teamStats: TeamStat[]): Team2Data[] {
        return teamStats.map(team => {
            const teamId = parseInt(team.id) || this.generateTeamId(team.name);
            console.log(`Converting team: ${team.name}, id: ${team.id} -> ${teamId}`);

            return {
                name: team.name,
                id: teamId,
                rank: team.rank,
                total_kills: team.totalKills || 0,
                total_score: 0, // 기본값
                eliminated: false, // 기본값
                full_name: team.name,
                kills_per_team: new Map(),
                placement_rank: team.rank,
                region_code: 1, // 기본값 (JP)
                phase_locations: [],
                kill_logs: [],
                mob: undefined
            };
        });
    }

    /**
     * 총 팀 통계 변환 (누적 통계)
     */
    private static convertTotalTeamStats(totalTeamStats: TotalTeamStat[]): Team2Data[] {
        return totalTeamStats.map(team => ({
            name: team.name,
            id: team.team_id || this.generateTeamId(team.name), // team_id가 없으면 이름으로 ID 생성
            total_kills: team.totalKills,
            total_score: team.totalScore,
            rank: team.rank,
            eliminated: (team.deaths || 0) >= 4, // 4명 이상 죽으면 탈락으로 간주
            full_name: team.name,
            kills_per_team: new Map(),
            placement_rank: team.rank,
            region_code: 1, // 기본값 (JP)
            phase_locations: [],
            kill_logs: [],
            mob: undefined
        }));
    }

    /**
     * 팀 이름으로부터 숫자 ID 생성
     */
    private static generateTeamId(teamName: string): number {
        let hash = 0;
        for (let i = 0; i < teamName.length; i++) {
            const char = teamName.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32bit 정수로 변환
        }
        return Math.abs(hash);
    }

    /**
     * JSON 문자열을 파싱하여 ObserverMessage2로 변환
     */
    public static parseAndConvert(jsonString: string): ObserverMessage2 {
        try {
            const Data: MessageData = JSON.parse(jsonString);
            return this.convertToObserverMessage2(Data);
        } catch (error) {
            console.error('Failed to parse JSON string:', error);
            throw new Error(`Invalid JSON format: ${error}`);
        }
    }

    /**
     * 변환된 데이터의 유효성 검사
     */
    public static validateObserverMessage2(data: ObserverMessage2): boolean {
        try {
            console.log('🔍 Validating observer message:', {
                tournament_id: data.tournament_id,
                match_id_type: typeof data.match_id,
                match_id_length: data.match_id?.length,
                total_team_stats_length: data.total_team_stats?.length,
                total_player_stats_length: data.total_player_stats?.length
            });

            // 필수 필드 검사
            if (!data.tournament_id) {
                console.log('❌ Validation failed: missing tournament_id');
                return false;
            }

            if (!data.match_id || !(data.match_id instanceof Uint8Array)) {
                console.log('❌ Validation failed: invalid match_id', typeof data.match_id);
                return false;
            }

            // 배열 필드 검사
            if (!Array.isArray(data.total_team_stats)) {
                console.log('❌ Validation failed: total_team_stats is not array');
                return false;
            }

            if (!Array.isArray(data.total_player_stats)) {
                console.log('❌ Validation failed: total_player_stats is not array');
                return false;
            }

            // 팀 데이터 유효성 검사
            for (const team of data.total_team_stats) {
                if (!team.name || typeof team.id !== 'number' || typeof team.rank !== 'number') {
                    console.log('❌ Validation failed: invalid team data', {
                        name: team.name,
                        id: team.id,
                        id_type: typeof team.id,
                        rank: team.rank,
                        rank_type: typeof team.rank
                    });
                    return false;
                }
            }

            console.log('✅ Validation passed');
            return true;
        } catch (error) {
            console.error('❌ Validation error:', error);
            return false;
        }
    }
}

export { MessageDataConverter };
