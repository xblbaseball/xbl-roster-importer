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

async function copyTeamLogosAndAttributes(builtInDb: any, builtInTeamGuid: any, customTeamGuid: any): Promise<{ builtInTeamGuid: any, customTeamGuid: any }> {
    // Log initial state - check if teams exist
    console.log(`=== Team Logo and Attribute Copy: ${blobToGuidString(builtInTeamGuid)} ← ${blobToGuidString(customTeamGuid)} ===`);
    
    const builtInTeamCheck = builtInDb.prepare('SELECT GUID, teamName FROM t_teams WHERE GUID = ?').get(builtInTeamGuid);
    const customTeamCheck = builtInDb.prepare('SELECT GUID, teamName FROM custom_db.t_teams WHERE GUID = ?').get(customTeamGuid);
    
    if (!builtInTeamCheck || !customTeamCheck) {
        throw new Error(`Could not find teams with provided GUIDs`);
    }
    
    console.log('Built-in team found:', builtInTeamCheck);
    console.log('Custom team found:', customTeamCheck);
    
    // Get the custom team's full data for name update
    const customTeamData = builtInDb.prepare(`
        SELECT teamName
        FROM custom_db.t_teams 
        WHERE GUID = ?
    `).get(customTeamGuid);
    console.log('Custom team data to copy:', customTeamData);
    
    // Check existing logos before deletion
    const existingLogosCount = builtInDb.prepare(`
        SELECT COUNT(*) as count FROM t_team_logos 
        WHERE teamGUID = ?
    `).get(builtInTeamGuid);
    console.log(`Built-in team ${builtInTeamCheck.teamName} has ${existingLogosCount.count} existing logos`);
    
    const customLogosCount = builtInDb.prepare(`
        SELECT COUNT(*) as count FROM custom_db.t_team_logos 
        WHERE teamGUID = ?
    `).get(customTeamGuid);
    console.log(`Custom team ${customTeamCheck.teamName} has ${customLogosCount.count} logos to copy`);
    
    // Delete existing team logos for the built-in team
    const deleteResult = builtInDb.prepare(`
        DELETE FROM t_team_logos
        WHERE teamGUID = ?
    `).run(builtInTeamGuid);
    console.log(`Deleted ${deleteResult.changes} logo records for ${builtInTeamCheck.teamName}`);
    
    // Delete existing team logo attributes for the built-in team
    const deleteLogoAttrsResult = builtInDb.prepare(`
        DELETE FROM t_team_logo_attributes
        WHERE teamLogoGUID in (
            SELECT GUID
            FROM t_team_logos
            WHERE teamGUID = ?
        )
    `).run(builtInTeamGuid);
    console.log(`Deleted ${deleteLogoAttrsResult.changes} logo attribute records for ${builtInTeamCheck.teamName}`);
    
    // Delete existing team attributes for the built-in team
    const deleteTeamAttrsResult = builtInDb.prepare(`
        DELETE FROM t_team_attributes
        WHERE teamLocalID in (SELECT localID from t_team_local_ids where GUID = ?)
    `).run(builtInTeamGuid);
    console.log(`Deleted ${deleteTeamAttrsResult.changes} team attribute records for ${builtInTeamCheck.teamName}`);
    
    // Update the built-in team's basic information with custom team data
    const updateTeamResult = builtInDb.prepare(`
        UPDATE t_teams 
        SET teamName = ?
        WHERE GUID = ?
    `).run(
        customTeamData.teamName,
        builtInTeamGuid
    );
    console.log(`Updated team info: ${updateTeamResult.changes} record(s) changed`);
    
    // Insert team logos from custom team to built-in team (using INSERT OR REPLACE to handle existing GUIDs)
    // Use built-in team GUID since we deleted all the existing data
    const insertLogosResult = builtInDb.prepare(`
        INSERT OR REPLACE INTO t_team_logos
        SELECT
            l.GUID,
            ? as teamGUID,
            l.logoType,
            l.logoElementType,
            l.logoComponentName,
            l.positionX,
            l.positionY,
            l.rotation,
            l.scale,
            l.mirrored,
            l.font,
            l.fontStyle,
            l.fontStyleAmount,
            l.fontStyleOffset,
            l.fontSpacing,
            l.outlineWidth,
            l.ordering
        FROM custom_db.t_team_logos l
        WHERE l.teamGUID = ?
    `).run(builtInTeamGuid, customTeamGuid);
    console.log(`Inserted ${insertLogosResult.changes} logo records from ${customTeamCheck.teamName} to ${builtInTeamCheck.teamName}`);
    
    // Insert team logo attributes from custom team to built-in team (using INSERT OR REPLACE)
    const insertLogoAttrsResult = builtInDb.prepare(`
        INSERT OR REPLACE INTO t_team_logo_attributes
        SELECT
            teamLogoGUID,
            optionKey,
            colorKey,
            optionValueInt,
            optionValueFloat,
            optionValueText,
            optionType
        FROM custom_db.t_team_logo_attributes
        WHERE teamLogoGUID in (
            SELECT GUID
            FROM custom_db.t_team_logos
            WHERE teamGUID = ?
        )
    `).run(customTeamGuid);
    console.log(`Inserted ${insertLogoAttrsResult.changes} logo attribute records from ${customTeamCheck.teamName}`);
    
    // Insert team attributes from custom team to built-in team (using INSERT OR REPLACE)
    // Use built-in team's local ID since we deleted all the existing data
    const builtInTeamLocalId = builtInDb.prepare(`
        SELECT localID FROM t_team_local_ids WHERE GUID = ?
    `).get(builtInTeamGuid);
    
    const insertTeamAttrsResult = builtInDb.prepare(`
        INSERT OR REPLACE INTO t_team_attributes
        SELECT
            ? as teamLocalID,
            a.optionKey,
            a.colorKey,
            a.optionValueInt,
            a.optionValueFloat,
            a.optionValueText,
            a.optionType
        FROM custom_db.t_team_attributes a
        WHERE a.teamLocalId in (SELECT localID FROM custom_db.t_team_local_ids WHERE GUID = ?)
    `).run(builtInTeamLocalId.localID, customTeamGuid);
    console.log(`Inserted ${insertTeamAttrsResult.changes} team attribute records from ${customTeamCheck.teamName} to ${builtInTeamCheck.teamName}`);
    
    // Verify final state
    const finalLogosCount = builtInDb.prepare(`
        SELECT COUNT(*) as count FROM t_team_logos 
        WHERE teamGUID = ?
    `).get(builtInTeamGuid);
    console.log(`Final: ${customTeamData.teamName} now has ${finalLogosCount.count} logos`);
    
    // Return the team GUIDs for use by other functions
    return { builtInTeamGuid, customTeamGuid };
}

export async function copyTeamData(builtInTeamGuid: any, customTeamGuid: any, builtInDbPath: string, customDbPath: string): Promise<{ builtInTeamGuid: any, customTeamGuid: any }> {
    const builtInDb = new DatabaseSync(builtInDbPath);
    
    // Attach the custom database
    builtInDb.exec(`ATTACH DATABASE '${customDbPath}' AS custom_db`);
    
    // Copy team logos and attributes, and get the team GUIDs
    const teamGuids = await copyTeamLogosAndAttributes(builtInDb, builtInTeamGuid, customTeamGuid);
    
    // Detach the custom database
    builtInDb.exec('DETACH DATABASE custom_db');
    
    return teamGuids;
}

export async function replaceBuiltInTeamPlayers(builtInTeamGuid: any, customTeamGuid: any, builtInDbPath: string, customDbPath: string): Promise<void> {
    console.log(`=== Replacing Built-in Team Players: ${blobToGuidString(builtInTeamGuid)} ← ${blobToGuidString(customTeamGuid)} ===`);
    const builtInDb = new DatabaseSync(builtInDbPath);
    
    try {
        // Attach the custom database
        builtInDb.exec(`ATTACH DATABASE '${customDbPath}' AS custom_db`);
        
        console.log(`Built-in team GUID: ${blobToGuidString(builtInTeamGuid)}`);
        console.log(`Custom team GUID: ${blobToGuidString(customTeamGuid)}`);
        
        // Start transaction for atomicity
        builtInDb.exec('BEGIN TRANSACTION');
        
        // Step 1: Delete all players from built-in team and their related data
        console.log('Step 1: Deleting built-in team players and related data...');
        
        // Delete from tables that reference baseball player local IDs first
        const deleteLocalIdTables = [
            't_baseball_player_colors',
            't_baseball_player_options', 
            't_baseball_player_traits',
            't_fantasy_draft_generated_players',
            't_franchise_news_players',
            't_franchise_pending_available_players',
            't_game_results', // homePitcherLocalID, awayPitcherLocalID
            't_league_available_players',
            't_stats_players'
        ];
        
        for (const tableName of deleteLocalIdTables) {
            let deleteQuery = '';
            if (tableName === 't_game_results') {
                deleteQuery = `DELETE FROM ${tableName} WHERE homePitcherLocalID IN (
                    SELECT lid.localID FROM t_baseball_player_local_ids lid 
                    JOIN t_baseball_players p ON p.GUID = lid.GUID 
                    WHERE p.teamGUID = ?
                ) OR awayPitcherLocalID IN (
                    SELECT lid.localID FROM t_baseball_player_local_ids lid 
                    JOIN t_baseball_players p ON p.GUID = lid.GUID 
                    WHERE p.teamGUID = ?
                )`;
            } else {
                const columnName = tableName === 't_franchise_news_players' ? 'playerLocalID' : 
                                 tableName === 't_stats_players' ? 'baseballPlayerLocalID' : 
                                 'baseballPlayerLocalID';
                deleteQuery = `DELETE FROM ${tableName} WHERE ${columnName} IN (
                    SELECT lid.localID FROM t_baseball_player_local_ids lid 
                    JOIN t_baseball_players p ON p.GUID = lid.GUID 
                    WHERE p.teamGUID = ?
                )`;
            }
            
            const params = tableName === 't_game_results' ? [builtInTeamGuid, builtInTeamGuid] : [builtInTeamGuid];
            const result = builtInDb.prepare(deleteQuery).run(...params);
            console.log(`Deleted ${result.changes} records from ${tableName}`);
        }
        
        // Delete from tables that reference baseball player GUIDs
        const deleteGuidTables = [
            't_batting_orders',
            't_defensive_positions', 
            't_franchise_available_players',
            't_franchise_manager_moment_player_changes',
            't_franchise_player_extensions',
            't_franchise_players_leaving_player_team',
            't_franchise_retired_players',
            't_franchise_training',
            't_franchise_unavailable_players',
            't_pitching_rotations',
            't_salary',
            't_season_pitch_counts',
            't_season_player_condition'
        ];
        
        for (const tableName of deleteGuidTables) {
            const columnName = tableName === 't_season_pitch_counts' ? 'pitcherGUID' : 
                             tableName === 't_pitching_rotations' ? 'pitcherGUID' : 
                             'baseballPlayerGUID';
            const deleteQuery = `DELETE FROM ${tableName} WHERE ${columnName} IN (
                SELECT p.GUID FROM t_baseball_players p WHERE p.teamGUID = ?
            )`;
            const result = builtInDb.prepare(deleteQuery).run(builtInTeamGuid);
            console.log(`  Deleted ${result.changes} records from ${tableName}`);
        }
    
        
        // Delete from t_baseball_player_local_ids
        const deleteLocalIdsResult = builtInDb.prepare(`
            DELETE FROM t_baseball_player_local_ids WHERE GUID IN (
                SELECT p.GUID FROM t_baseball_players p WHERE p.teamGUID = ?
            )
        `).run(builtInTeamGuid);
        console.log(`  Deleted ${deleteLocalIdsResult.changes} records from t_baseball_player_local_ids`);
        
        // Finally delete from t_baseball_players
        const deletePlayersResult = builtInDb.prepare(`
            DELETE FROM t_baseball_players WHERE teamGUID = ?
        `).run(builtInTeamGuid);
        console.log(`  Deleted ${deletePlayersResult.changes} records from t_baseball_players`);
        
        // Step 2: Copy all custom team players and their data to built-in team
        console.log('Step 2: Copying custom team players to built-in team...');
        
        // Copy t_baseball_players (updating teamGUID to built-in team) using INSERT OR REPLACE
        const insertPlayersResult = builtInDb.prepare(`
            INSERT OR REPLACE INTO t_baseball_players 
            SELECT GUID, originalGUID, ?, power, contact, speed, fielding, arm, velocity, junk, accuracy, age
            FROM custom_db.t_baseball_players 
            WHERE teamGUID = ?
        `).run(builtInTeamGuid, customTeamGuid);
        console.log(`  Inserted ${insertPlayersResult.changes} players into t_baseball_players`);
        
        // Copy t_baseball_player_local_ids using INSERT OR REPLACE
        const insertLocalIdsResult = builtInDb.prepare(`
            INSERT OR REPLACE INTO t_baseball_player_local_ids 
            SELECT localID, GUID
            FROM custom_db.t_baseball_player_local_ids 
            WHERE GUID IN (SELECT GUID FROM custom_db.t_baseball_players WHERE teamGUID = ?)
        `).run(customTeamGuid);
        console.log(`  Inserted ${insertLocalIdsResult.changes} records into t_baseball_player_local_ids`);
        
        // Copy t_baseball_player_options using INSERT OR REPLACE
        const insertOptionsResult = builtInDb.prepare(`
            INSERT OR REPLACE INTO t_baseball_player_options 
            SELECT baseballPlayerLocalID, optionKey, optionValue, optionType
            FROM custom_db.t_baseball_player_options 
            WHERE baseballPlayerLocalID IN (
                SELECT lid.localID FROM custom_db.t_baseball_player_local_ids lid 
                JOIN custom_db.t_baseball_players p ON p.GUID = lid.GUID 
                WHERE p.teamGUID = ?
            )
        `).run(customTeamGuid);
        console.log(`  Inserted ${insertOptionsResult.changes} records into t_baseball_player_options`);
        
        // Copy t_baseball_player_traits using INSERT OR REPLACE
        const insertTraitsResult = builtInDb.prepare(`
            INSERT OR REPLACE INTO t_baseball_player_traits 
            SELECT baseballPlayerLocalID, trait, subType
            FROM custom_db.t_baseball_player_traits 
            WHERE baseballPlayerLocalID IN (
                SELECT lid.localID FROM custom_db.t_baseball_player_local_ids lid 
                JOIN custom_db.t_baseball_players p ON p.GUID = lid.GUID 
                WHERE p.teamGUID = ?
            )
        `).run(customTeamGuid);
        console.log(`  Inserted ${insertTraitsResult.changes} records into t_baseball_player_traits`);
        
        // Copy t_baseball_player_colors using INSERT OR REPLACE
        const insertColorsResult = builtInDb.prepare(`
            INSERT OR REPLACE INTO t_baseball_player_colors 
            SELECT baseballPlayerLocalID, colorKey, colorValue, colorType
            FROM custom_db.t_baseball_player_colors 
            WHERE baseballPlayerLocalID IN (
                SELECT lid.localID FROM custom_db.t_baseball_player_local_ids lid 
                JOIN custom_db.t_baseball_players p ON p.GUID = lid.GUID 
                WHERE p.teamGUID = ?
            )
        `).run(customTeamGuid);
        console.log(`  Inserted ${insertColorsResult.changes} records into t_baseball_player_colors`);
        
        // Commit transaction
        builtInDb.exec('COMMIT');
        console.log('Player replacement completed successfully!');
        
    } catch (error) {
        console.error('Error in replaceBuiltInTeamPlayers:', error);
        builtInDb.exec('ROLLBACK');
        throw error;
    } finally {
        builtInDb.exec('DETACH DATABASE custom_db');
    }
}
