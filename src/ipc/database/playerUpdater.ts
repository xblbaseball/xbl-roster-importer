import { DatabasePlayer, PlayerComparison } from "../../shared/models/player";
import { 
    getBattingHandInt, 
    getThrowingHandInt, 
    getArmAngleInt, 
    isPitcherPosition,
    getTraitIds,
    getChemistryInt,
    getPositionInt,
    getPitchPositionInt,
    getOptionType,
    OPTION_KEYS
} from "../../shared/models/mappings";

const { DatabaseSync } = require('node:sqlite');

export interface PlayerUpdateStatements {
    updatePlayer: any;
    updatePlayerOption: any;
    deleteTraits: any;
    insertTrait: any;
}

export function createPlayerUpdateStatements(db: any): PlayerUpdateStatements {
    // Prepare update statement for player attributes (power, contact, speed, fielding, arm, velocity, junk, accuracy)
    const updatePlayer = db.prepare(`
        UPDATE t_baseball_players 
        SET power = ?, contact = ?, speed = ?, fielding = ?, arm = ?, velocity = ?, junk = ?, accuracy = ? 
        WHERE GUID = ?
    `);
    
    // Generic upsert statement for all player options (can be reused for multiple option types)
    const updatePlayerOption = db.prepare(`
        INSERT INTO t_baseball_player_options (baseballPlayerLocalID, optionKey, optionValue, optionType)
        VALUES (
            (SELECT localID FROM t_baseball_player_local_ids WHERE GUID = ?),
            ?, ?, ?
        )
        ON CONFLICT (baseballPlayerLocalID, optionKey) 
        DO UPDATE SET optionValue = excluded.optionValue, optionType = excluded.optionType
    `);

    // Prepare delete statement for traits
    const deleteTraits = db.prepare(`
        DELETE FROM t_baseball_player_traits 
        WHERE baseballPlayerLocalID = (
            SELECT localID FROM t_baseball_player_local_ids WHERE GUID = ?
        )
    `);

    // Prepare insert statement for traits
    const insertTrait = db.prepare(`
        INSERT INTO t_baseball_player_traits (baseballPlayerLocalID, trait, subType)
        VALUES (
            (SELECT localID FROM t_baseball_player_local_ids WHERE GUID = ?),
            ?, ?
        )
    `);

    return {
        updatePlayer,
        updatePlayerOption,
        deleteTraits,
        insertTrait,
    };
}

export function validatePlayerData(rosterPlayer: any, isPitcher: boolean): boolean {
    // Validate common fields
    if (!rosterPlayer.name || 
        typeof rosterPlayer.power !== 'number' || 
        typeof rosterPlayer.contact !== 'number' || 
        typeof rosterPlayer.speed !== 'number' ||
        typeof rosterPlayer.field !== 'number' || 
        !rosterPlayer.bat || 
        !rosterPlayer.throw) {
        return false;
    }
    
    if (isPitcher) {
        // Validate pitcher-specific fields
        return typeof rosterPlayer.velocity === 'number' && 
               typeof rosterPlayer.junk === 'number' &&
               typeof rosterPlayer.accuracy === 'number' &&
               typeof rosterPlayer.angle === 'string';
    } else {
        // Validate position player-specific fields
        return typeof rosterPlayer.arm === 'number';
    }
}

export function updatePlayerTraits(
    statements: PlayerUpdateStatements,
    rosterPlayer: any,
    customPlayerGuidBuffer: Buffer,
    customPlayer: DatabasePlayer
): string[] {
    const warnings: string[] = [];
    
    try {
        // Delete existing traits
        const deleteResult = statements.deleteTraits.run(customPlayerGuidBuffer);
        console.log(`Deleted ${deleteResult.changes} existing traits for ${customPlayer.name}`);
        
        // Insert new traits
        const traits = [rosterPlayer.trait1, rosterPlayer.trait2].filter(trait => trait && trait !== '--');
        
        for (const trait of traits) {
            const traitIds = getTraitIds(trait);
            if (traitIds) {
                const insertResult = statements.insertTrait.run(
                    customPlayerGuidBuffer,
                    traitIds.traitId,
                    traitIds.subtypeId
                );
                
                if (insertResult.changes === 0) {
                    warnings.push(`Failed to insert trait ${trait} for ${customPlayer.name}`);
                }
            } else {
                warnings.push(`Invalid trait ${trait} for ${customPlayer.name}`);
            }
        }
        
    } catch (error) {
        warnings.push(`Error updating traits for ${customPlayer.name}: ${error}`);
    }
    
    return warnings;
}

export function updatePitcherPitchTypes(
    statements: PlayerUpdateStatements,
    rosterPlayer: any,
    customPlayerGuidBuffer: Buffer,
    customPlayer: DatabasePlayer
): string[] {
    const warnings: string[] = [];
    
    const pitchTypes = [
        { key: 'fourseam', optionKey: OPTION_KEYS.FOUR_SEAM, displayName: '4-Seam' },
        { key: 'twoseam', optionKey: OPTION_KEYS.TWO_SEAM, displayName: '2-Seam' },
        { key: 'cutter', optionKey: OPTION_KEYS.CUTTER, displayName: 'Cutter' },
        { key: 'change', optionKey: OPTION_KEYS.CHANGEUP, displayName: 'Changeup' },
        { key: 'curve', optionKey: OPTION_KEYS.CURVEBALL, displayName: 'Curveball' },
        { key: 'slider', optionKey: OPTION_KEYS.SLIDER, displayName: 'Slider' },
        { key: 'fork', optionKey: OPTION_KEYS.FORK, displayName: 'Fork' },
        { key: 'screw', optionKey: OPTION_KEYS.SCREWBALL, displayName: 'Screwball' }
    ];
    
    for (const pitchType of pitchTypes) {
        const rosterValue = rosterPlayer[pitchType.key];
        if (typeof rosterValue === 'boolean') {
            const pitchValue = rosterValue ? 1 : 0;
            
            const result = statements.updatePlayerOption.run(
                customPlayerGuidBuffer,
                pitchType.optionKey,
                pitchValue,
                getOptionType(pitchType.optionKey)
            );
            
            if (result.changes === 0) {
                warnings.push(`Failed to update ${pitchType.displayName} for pitcher ${customPlayer.name}`);
            }
        }
    }
    
    return warnings;
}

export function updatePitcherAttributes(
    statements: PlayerUpdateStatements,
    rosterPlayer: any,
    customPlayerGuidBuffer: Buffer,
    customPlayer: DatabasePlayer
): { success: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    console.log(`Updating pitcher ${customPlayer.name}:`);
    console.log(`  Attributes: power ${customPlayer.power} → ${rosterPlayer.power}, contact ${customPlayer.contact} → ${rosterPlayer.contact}, speed ${customPlayer.speed} → ${rosterPlayer.speed}, fielding ${(customPlayer as any).field || 0} → ${rosterPlayer.field}`);
    console.log(`  Pitching: velocity ${(customPlayer as any).velocity || 0} → ${rosterPlayer.velocity}, junk ${(customPlayer as any).junk || 0} → ${rosterPlayer.junk}, accuracy ${(customPlayer as any).accuracy || 0} → ${rosterPlayer.accuracy}, angle ${(customPlayer as any).angle || 'Mid'} → ${rosterPlayer.angle}`);
    console.log(`  Position: primary ${customPlayer.position} → P (1), role ${customPlayer.position} → ${rosterPlayer.position}`);
    console.log(`  Hands: bat ${customPlayer.bat} → ${rosterPlayer.bat}, throw ${customPlayer.throw} → ${rosterPlayer.throw}, chemistry ${customPlayer.chemistry} → ${rosterPlayer.chemistry}`);
    console.log(`  Pitches: 4F ${(customPlayer as any).fourseam || false} → ${rosterPlayer.fourseam || false}, 2F ${(customPlayer as any).twoseam || false} → ${rosterPlayer.twoseam || false}, CF ${(customPlayer as any).cutter || false} → ${rosterPlayer.cutter || false}, CH ${(customPlayer as any).change || false} → ${rosterPlayer.change || false}, CB ${(customPlayer as any).curve || false} → ${rosterPlayer.curve || false}, SL ${(customPlayer as any).slider || false} → ${rosterPlayer.slider || false}, FK ${(customPlayer as any).fork || false} → ${rosterPlayer.fork || false}, SB ${(customPlayer as any).screw || false} → ${rosterPlayer.screw || false}`);
    console.log(`  Traits: trait1 ${customPlayer.trait1} → ${rosterPlayer.trait1 || '--'}, trait2 ${customPlayer.trait2} → ${rosterPlayer.trait2 || '--'}`);
    
    // Update main player attributes
    const result = statements.updatePlayer.run(
        rosterPlayer.power,
        rosterPlayer.contact, 
        rosterPlayer.speed,
        rosterPlayer.field,
        0, // arm (not used for pitchers)
        rosterPlayer.velocity,
        rosterPlayer.junk,
        rosterPlayer.accuracy,
        customPlayerGuidBuffer
    );
    
    if (result.changes === 0) {
        return { success: false, warnings };
    }

    // Update arm angle for pitcher
    const armAngleInt = getArmAngleInt(rosterPlayer.angle);
    const angleResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.ARM_ANGLE,
        armAngleInt,
        getOptionType(OPTION_KEYS.ARM_ANGLE)
    );
    
    if (angleResult.changes === 0) {
        warnings.push(`Failed to update arm angle for pitcher ${customPlayer.name}`);
    }
    
    // Update batting hand
    const battingInt = getBattingHandInt(rosterPlayer.bat);
    const battingResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.BATTING_HAND,
        battingInt,
        getOptionType(OPTION_KEYS.BATTING_HAND)
    );
    
    if (battingResult.changes === 0) {
        warnings.push(`Failed to update batting hand for pitcher ${customPlayer.name}`);
    }
    
    // Update throwing hand
    const throwingInt = getThrowingHandInt(rosterPlayer.throw);
    const throwingResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.THROWING_HAND,
        throwingInt,
        getOptionType(OPTION_KEYS.THROWING_HAND)
    );
    
    if (throwingResult.changes === 0) {
        warnings.push(`Failed to update throwing hand for pitcher ${customPlayer.name}`);
    }
    
    // Update chemistry
    const chemistryInt = getChemistryInt(rosterPlayer.chemistry);
    const chemistryResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.CHEMISTRY,
        chemistryInt,
        getOptionType(OPTION_KEYS.CHEMISTRY)
    );
    
    if (chemistryResult.changes === 0) {
        warnings.push(`Failed to update chemistry for pitcher ${customPlayer.name}`);
    }
    
    // Update primary position for pitcher (should always be 1 for "P")
    const primaryPositionInt = 1; // All pitchers have primary position "P" which is 1
    const primaryPositionResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.PRIMARY_POSITION,
        primaryPositionInt,
        getOptionType(OPTION_KEYS.PRIMARY_POSITION)
    );

    if (primaryPositionResult.changes === 0) {
        warnings.push(`Failed to update primary position for pitcher ${customPlayer.name}`);
    }

    // Update pitch position (pitcher role) for pitcher - only if it's a valid pitcher position
    const pitchPositionInt = getPitchPositionInt(rosterPlayer.position);
    console.log(`  Pitch position: ${rosterPlayer.position} → ${pitchPositionInt} (type: ${typeof pitchPositionInt})`);
    console.log(`  customPlayerGuidBuffer type: ${typeof customPlayerGuidBuffer}, isBuffer: ${Buffer.isBuffer(customPlayerGuidBuffer)}`);
    console.log(`  OPTION_KEYS.PITCH_POSITION: ${OPTION_KEYS.PITCH_POSITION} (type: ${typeof OPTION_KEYS.PITCH_POSITION})`);
    
    if (pitchPositionInt > 0) {
        const pitchPositionResult = statements.updatePlayerOption.run(
            customPlayerGuidBuffer,
            OPTION_KEYS.PITCH_POSITION,
            pitchPositionInt,
            getOptionType(OPTION_KEYS.PITCH_POSITION)
        );

        if (pitchPositionResult.changes === 0) {
            warnings.push(`Failed to update pitch position for pitcher ${customPlayer.name}`);
        }
    } else {
        console.log(`  Skipping pitch position update - not a valid pitcher position`);
    }
    
    // Update pitch types
    const pitchTypeWarnings = updatePitcherPitchTypes(statements, rosterPlayer, customPlayerGuidBuffer, customPlayer);
    warnings.push(...pitchTypeWarnings);
    
    // Update traits
    const traitWarnings = updatePlayerTraits(statements, rosterPlayer, customPlayerGuidBuffer, customPlayer);
    warnings.push(...traitWarnings);
    
    return { success: true, warnings };
}

export function updatePositionPlayerAttributes(
    statements: PlayerUpdateStatements,
    rosterPlayer: any,
    customPlayerGuidBuffer: Buffer,
    customPlayer: DatabasePlayer
): { success: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    console.log(`Updating position player ${customPlayer.name}:`);
    console.log(`  Attributes: power ${customPlayer.power} → ${rosterPlayer.power}, contact ${customPlayer.contact} → ${rosterPlayer.contact}, speed ${customPlayer.speed} → ${rosterPlayer.speed}, fielding ${(customPlayer as any).field || 0} → ${rosterPlayer.field}, arm ${(customPlayer as any).arm || 0} → ${rosterPlayer.arm}`);
    console.log(`  Position: primary ${customPlayer.position} → ${rosterPlayer.position}, secondary ${(customPlayer as any).secondaryPosition || '-'} → ${rosterPlayer.secondaryPosition || '-'}`);
    console.log(`  Hands/Chemistry: bat ${customPlayer.bat} → ${rosterPlayer.bat}, throw ${customPlayer.throw} → ${rosterPlayer.throw}, chemistry ${customPlayer.chemistry} → ${rosterPlayer.chemistry}`);
    console.log(`  Traits: trait1 ${customPlayer.trait1} → ${rosterPlayer.trait1 || '--'}, trait2 ${customPlayer.trait2} → ${rosterPlayer.trait2 || '--'}`);
    
    // Update main player attributes
    const result = statements.updatePlayer.run(
        rosterPlayer.power,
        rosterPlayer.contact, 
        rosterPlayer.speed,
        rosterPlayer.field,
        rosterPlayer.arm,
        0, // velocity (not used for position players)
        0, // junk (not used for position players)
        0, // accuracy (not used for position players)
        customPlayerGuidBuffer
    );
    
    if (result.changes === 0) {
        return { success: false, warnings };
    }
    
    // Update batting hand
    const battingInt = getBattingHandInt(rosterPlayer.bat);
    const battingResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.BATTING_HAND,
        battingInt,
        getOptionType(OPTION_KEYS.BATTING_HAND)
    );
    
    if (battingResult.changes === 0) {
        warnings.push(`Failed to update batting hand for position player ${customPlayer.name}`);
    }
    
    // Update throwing hand
    const throwingInt = getThrowingHandInt(rosterPlayer.throw);
    const throwingResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.THROWING_HAND,
        throwingInt,
        getOptionType(OPTION_KEYS.THROWING_HAND)
    );
    
    if (throwingResult.changes === 0) {
        warnings.push(`Failed to update throwing hand for position player ${customPlayer.name}`);
    }
    
    // Update chemistry
    const chemistryInt = getChemistryInt(rosterPlayer.chemistry);
    const chemistryResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.CHEMISTRY,
        chemistryInt,
        getOptionType(OPTION_KEYS.CHEMISTRY)
    );
    
    if (chemistryResult.changes === 0) {
        warnings.push(`Failed to update chemistry for position player ${customPlayer.name}`);
    }

    // Update primary position
    const primaryPositionInt = getPositionInt(rosterPlayer.position);
    const primaryPositionResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.PRIMARY_POSITION,
        primaryPositionInt,
        getOptionType(OPTION_KEYS.PRIMARY_POSITION)
    );

    if (primaryPositionResult.changes === 0) {
        warnings.push(`Failed to update primary position for position player ${customPlayer.name}`);
    }

    // Update secondary position
    const secondaryPositionInt = getPositionInt(rosterPlayer.secondaryPosition);
    const secondaryPositionResult = statements.updatePlayerOption.run(
        customPlayerGuidBuffer,
        OPTION_KEYS.SECONDARY_POSITION,
        secondaryPositionInt,
        getOptionType(OPTION_KEYS.SECONDARY_POSITION)
    );
    
    if (secondaryPositionResult.changes === 0) {
        warnings.push(`Failed to update secondary position for position player ${customPlayer.name}`);
    }
    
    // Update traits
    const traitWarnings = updatePlayerTraits(statements, rosterPlayer, customPlayerGuidBuffer, customPlayer);
    warnings.push(...traitWarnings);
    
    return { success: true, warnings };
}

export async function updateCustomPlayerAttributes(customTeamGuid: any, customDbPath: string, playerPairs: PlayerComparison[]): Promise<void> {
    console.log(`=== Updating Player Attributes for team GUID: ${customTeamGuid.toString('hex').toUpperCase().replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')} ===`);
    const customDb = new DatabaseSync(customDbPath);
    
    try {
        // Validate input
        if (!playerPairs || playerPairs.length === 0) {
            console.log('No player pairs provided, skipping attribute updates');
            return;
        }
        
        const statements = createPlayerUpdateStatements(customDb);
        
        let updatedCount = 0;
        let notFoundCount = 0;
        
        // For each player pair that is matched, update the custom player with roster attributes
        for (const pair of playerPairs) {
            // Skip if not matched or no custom player
            if (!pair.isMatched || !pair.customPlayer || !pair.sheetPlayer) {
                continue;
            }
            
            const rosterPlayer = pair.sheetPlayer;
            const customPlayer = pair.customPlayer;
            
            // Check if this is a pitcher or position player
            const isPitcher = isPitcherPosition(rosterPlayer.position);
            
            // Validate roster player data
            if (!validatePlayerData(rosterPlayer, isPitcher)) {
                console.warn(`Invalid roster player data:`, rosterPlayer);
                continue;
            }
            
            // Convert the string GUID back to buffer for the database operation
            const customPlayerGuidBuffer = Buffer.from((customPlayer as DatabasePlayer).guid.replace(/-/g, ''), 'hex');
            
            let updateResult;
            if (isPitcher) {
                updateResult = updatePitcherAttributes(statements, rosterPlayer, customPlayerGuidBuffer, customPlayer);
            } else {
                updateResult = updatePositionPlayerAttributes(statements, rosterPlayer, customPlayerGuidBuffer, customPlayer);
            }
            
            if (updateResult.success) {
                updatedCount++;
                updateResult.warnings.forEach(warning => console.warn(warning));
            } else {
                console.warn(`Failed to update ${isPitcher ? 'pitcher' : 'position player'} ${customPlayer.name} - no rows affected`);
                notFoundCount++;
            }
        }
        
        console.log(`Successfully updated ${updatedCount} players, ${notFoundCount} updates failed`);
        
    } catch (error) {
        console.error('Error in updatePlayerAttributes:', error);
        throw error;
    } finally {
        customDb.close();
    }
}
