import { Team, League } from "../../shared/models/league";
import { DatabasePlayer, Trait } from "../../shared/models/player";
import { 
    getPlayerPosition,
    getBattingHand,
    getThrowingHand,
    getChemistry,
    getArmAngle,
    getTrait} from "../../shared/models/mappings";
import { blobToGuidString } from "./utils";

const { DatabaseSync } = require('node:sqlite');

function getTeamColors(dbPath: string, teamGuid: string): string[] {
    const database = new DatabaseSync(dbPath);
    
    // Convert GUID string back to blob for the query
    const guidBuffer = Buffer.from(teamGuid.replace(/-/g, ''), 'hex');
    
    // Get team local ID first
    const teamLocalIdResult = database.prepare(`
        SELECT localID FROM t_team_local_ids WHERE GUID = ?
    `).get(guidBuffer);
    
    if (!teamLocalIdResult) {
        return [];
    }
    
    // Get color attributes for colorKeys 0-4
    const colorResults = database.prepare(`
        SELECT colorKey, optionValueInt 
        FROM t_team_attributes 
        WHERE teamLocalID = ? AND colorKey IN (0, 1, 2, 3, 4)
        ORDER BY colorKey
    `).all(teamLocalIdResult.localID);
    
    // Convert decimal color values to hex strings
    return colorResults.map((row: any) => {
        const colorValue = row.optionValueInt;
        // Colors are stored in ARGB format
        const a = (colorValue >>> 24) & 0xFF;
        const r = (colorValue >>> 16) & 0xFF;
        const g = (colorValue >>> 8) & 0xFF;
        const b = colorValue & 0xFF;
        
        // Convert from linear color space to sRGB (game uses linear colors)
        function linearToSRGB(linear: number): number {
            const normalized = linear / 255;
            if (normalized <= 0.0031308) {
                return Math.round(255 * 12.92 * normalized);
            } else {
                return Math.round(255 * (1.055 * Math.pow(normalized, 1/2.4) - 0.055));
            }
        }
        
        const sRGB_R = linearToSRGB(r);
        const sRGB_G = linearToSRGB(g);
        const sRGB_B = linearToSRGB(b);
        
        // Convert to hex format for CSS
        const hex = ((sRGB_R << 16) | (sRGB_G << 8) | sRGB_B).toString(16).padStart(6, '0');
        return `#${hex}`;
    });
}

export function getLeague(dbPath: string): League {
    const database = new DatabaseSync(dbPath);
    
    // Get league info
    const leagueSelect = database.prepare(`SELECT name, GUID FROM t_leagues;`);
    const leagueResult = leagueSelect.get();
    
    // Get teams
    const teamsSelect = database.prepare(`SELECT GUID, teamName FROM t_teams;`);
    const teamsResults = teamsSelect.all();
    
    const teams: Team[] = teamsResults.map((row: any) => {
        const teamGuid = blobToGuidString(row.GUID);
        const colors = getTeamColors(dbPath, teamGuid);
        
        return {
            guid: teamGuid,
            name: row.teamName,
            colors: colors
        };
    });
    
    return {
        guid: blobToGuidString(leagueResult.GUID),
        name: leagueResult.name,
        teams: teams,
        databasePath: dbPath
    };
}

export function getPlayersByTeamGuid(dbPath: string, teamGuid: string): DatabasePlayer[] {
    const database = new DatabaseSync(dbPath);
    
    // Convert GUID string back to blob for the query
    const guidBuffer = Buffer.from(teamGuid.replace(/-/g, ''), 'hex');
    
    const select = database.prepare(`
        SELECT
            p.GUID as Id,
            vbpi.firstName as FirstName,
            vbpi.lastName as LastName,
            p.power as Power,
            p.contact as Contact,
            p.speed as Speed,
            p.fielding as Fielding,
            p.arm as Arm,
            p.velocity as Velocity,
            p.junk as Junk,
            p.accuracy as Accuracy,
            vbpi.primaryPosition as PrimaryPosition,
            secondaryPosition.optionValue as SecondaryPosition,
            vbpi.pitcherRole as PitchPosition,
            batting.optionValue as Batting,
            throwing.optionValue as Throwing,
            chemistry.optionValue as Chemistry,
            fourSeam.optionValue as FourSeam,
            twoSeam.optionValue as TwoSeam,
            SB.optionValue as Screwball,
            CH.optionValue as ChangeUp,
            FK.optionValue as Fork,
            CB.optionValue as Curve,
            SL.optionValue as Slider,
            CF.optionValue as Cutter,
            armAngle.optionValue as ArmAngle,
            CASE
                WHEN COUNT(traits.trait) = 0 THEN NULL
                ELSE json_group_array(json_object('traitId', traits.trait, 'subtypeId', traits.subType))
            END AS Traits
        FROM t_baseball_players p
        INNER JOIN t_baseball_player_local_ids lid
            ON lid.GUID = p.GUID
        INNER JOIN [v_baseball_player_info] vbpi
            ON vbpi.baseballPlayerGUID = lid.GUID
        INNER JOIN t_baseball_player_options batting
            ON batting.baseballPlayerLocalID = lid.localID and batting.optionKey = 5
        INNER JOIN t_baseball_player_options throwing
            ON throwing.baseballPlayerLocalID = lid.localID and throwing.optionKey = 4
        INNER JOIN t_baseball_player_options chemistry
            ON chemistry.baseballPlayerLocalID = lid.localID and chemistry.optionKey = 107
        LEFT JOIN t_baseball_player_options secondaryPosition
            ON secondaryPosition.baseballPlayerLocalID = lid.localID AND secondaryPosition.optionKey = 55
        LEFT JOIN t_baseball_player_options fourSeam
            ON fourSeam.baseballPlayerLocalID = lid.localID and fourSeam.optionKey = 58
        LEFT JOIN t_baseball_player_options twoSeam
            ON twoSeam.baseballPlayerLocalID = lid.localID and twoSeam.optionKey = 59
        LEFT JOIN t_baseball_player_options SB
            ON SB.baseballPlayerLocalID = lid.localID and SB.optionKey = 60
        LEFT JOIN t_baseball_player_options CH
            ON CH.baseballPlayerLocalID = lid.localID and CH.optionKey = 61
        LEFT JOIN t_baseball_player_options FK
            ON FK.baseballPlayerLocalID = lid.localID and FK.optionKey = 62
        LEFT JOIN t_baseball_player_options CB
            ON CB.baseballPlayerLocalID = lid.localID and CB.optionKey = 63
        LEFT JOIN t_baseball_player_options SL
            ON SL.baseballPlayerLocalID = lid.localID and SL.optionKey = 64
        LEFT JOIN t_baseball_player_options CF
            ON CF.baseballPlayerLocalID = lid.localID and CF.optionKey = 65
        LEFT JOIN t_baseball_player_options armAngle
            ON armAngle.baseballPlayerLocalID = lid.localID and armAngle.optionKey = 49
        LEFT JOIN t_baseball_player_traits traits
            ON traits.baseballPlayerLocalID = lid.localID
        WHERE p.teamGUID = ?
        GROUP BY p.GUID, lid.localID
    `);
    
    const results = select.all(guidBuffer);
    
    return results.map((row: any) => {
        // Parse traits if they exist
        let traits: Trait[] = [];
        if (row.Traits) {
            try {
                const parsedTraits = JSON.parse(row.Traits);
                traits = parsedTraits.map((trait: any) => getTrait(trait.traitId, trait.subtypeId));
            } catch (e) {
                console.warn('Failed to parse traits for player:', row.FirstName, row.LastName, e);
            }
        }
        
        const fullName = `${row.FirstName} ${row.LastName}`.trim();
        const position = getPlayerPosition(row.PrimaryPosition, row.PitchPosition);
        const secondaryPosition = getPlayerPosition(row.SecondaryPosition, null);
        
        // Check if this is a pitcher based on position
        const isPitcher = ['SP', 'SP/RP', 'RP', 'CP'].includes(position);
        
        if (isPitcher) {
            return {
                guid: blobToGuidString(row.Id),
                name: fullName,
                position: position,
                bat: getBattingHand(row.Batting),
                throw: getThrowingHand(row.Throwing),
                power: row.Power,
                contact: row.Contact,
                speed: row.Speed,
                field: row.Fielding,
                velocity: row.Velocity,
                junk: row.Junk,
                accuracy: row.Accuracy,
                chemistry: getChemistry(row.Chemistry),
                fourseam: row.FourSeam === 1,
                twoseam: row.TwoSeam === 1,
                cutter: row.Cutter === 1,
                change: row.ChangeUp === 1,
                curve: row.Curve === 1,
                slider: row.Slider === 1,
                fork: row.Fork === 1,
                screw: row.Screwball === 1,
                angle: getArmAngle(row.ArmAngle),
                trait1: traits[0] || '--',
                trait2: traits[1] || '--'
            } as DatabasePlayer;
        } else {
            return {
                guid: blobToGuidString(row.Id),
                name: fullName,
                position: position,
                secondaryPosition: secondaryPosition,
                bat: getBattingHand(row.Batting),
                throw: getThrowingHand(row.Throwing),
                power: row.Power || 0,
                contact: row.Contact || 0,
                speed: row.Speed || 0,
                field: row.Fielding || 0,
                arm: row.Arm || 0,
                chemistry: getChemistry(row.Chemistry),
                trait1: traits[0] || '--',
                trait2: traits[1] || '--'
            } as DatabasePlayer;
        }
    });
}

export function hasPlayedSeasonOrFranchise(dbPath: string) {
    const database = new DatabaseSync(dbPath);
    const select = database.prepare(`
        SELECT (
            (SELECT COUNT(*) FROM t_season_schedule) +
            (SELECT COUNT(*) FROM t_franchise) +
            (SELECT COUNT(*) FROM t_game_results)
        ) as total_count;
    `);
    const result = select.get();
    return +result.total_count > 0;
}
