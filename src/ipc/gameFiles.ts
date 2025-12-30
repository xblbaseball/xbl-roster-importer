import { app } from 'electron';
import { promises as fs } from 'fs';
import { League, Team } from '../shared/models/league';
import { getLeague, hasPlayedSeasonOrFranchise } from './database/database';
const zlib = require('zlib');
const path = require('path');
const { promisify } = require('util');
const inflate = promisify(zlib.inflate);

function getGameFilesPath(subdirectory: string): string {
    return path.join(app.getPath('appData'), 'xbl-roster-injector-game-files', subdirectory);
}

async function createTempDir(folder: string) {
    const tempPath = getGameFilesPath(folder);
    await fs.mkdir(tempPath, { recursive: true });
    return tempPath;
}

export async function processFile(filePath: string, outFolder: string) {
    try {
        const tempDir = await createTempDir(outFolder);

        const compressedData = await fs.readFile(filePath);
        
        // Check for DEFLATE header (78 01, 78 9C, or 78 DA)
        if (compressedData[0] === 0x78) {
            const decompressedData = await inflate(compressedData);
            const outPath = path.join(tempDir, path.basename(filePath, '.sav') + '.sqlite');
            await fs.writeFile(outPath, decompressedData);
            return outPath;
        }
        
        throw new Error('File is not in DEFLATE format');
    } catch (err) {
        throw new Error(`Failed to process ${path.basename(filePath)}: ${err}`);
    } 
}

export async function processSaveFiles(saveDirectory: string) {
    const files = await fs.readdir(saveDirectory);
    const leagueFiles = files
        .filter(f => f.toLowerCase().startsWith('league') && f.endsWith('.sav'))
        .map(f => path.join(saveDirectory, f));

    if (leagueFiles.length === 0) {
        throw new Error('No league .sav files found in the selected directory');
    }

    // Process each league file
    for (let i = 0; i < leagueFiles.length; i++) {
        const file = leagueFiles[i];
        const outPath = await processFile(file, 'custom');
    }
}

async function readLeagues(dirName: string): Promise<League[]> {
    try {
        const tempDir = getGameFilesPath(dirName);
        
        // Check if the temp directory exists
        try {
            await fs.access(tempDir);
        } catch {
            throw new Error(`${dirName} leagues not loaded. Please load ${dirName} leagues first.`);
        }

        // Find all sqlite files in the temp directory
        const files = await fs.readdir(tempDir);
        const leagueFiles = files
            .filter(f => f.toLowerCase().startsWith('league') && f.endsWith('.sqlite'))
            .map(f => path.join(tempDir, f));

        if (leagueFiles.length === 0) {
            throw new Error(`No league .sqlite files found in ${dirName} gameFiles directory`);
        }

        const leagues: League[] = [];

        // Process each league file
        for (const file of leagueFiles) {
            try {
                if (!hasPlayedSeasonOrFranchise(file)) {
                    const league = getLeague(file);
                    leagues.push(league);
                }
            } catch (err) {
                console.error(`Failed to read league from ${path.basename(file)}:`, err);
                // Continue with other files instead of failing completely
            }
        }

        return leagues;
    } catch (err) {
        throw new Error(`Failed to read ${dirName} leagues: ${err}`);
    }
}

export async function readCustomLeagues(): Promise<League[]> {
    return readLeagues('custom');
}

export async function saveCustomLeague(databasePath: string, saveDirectory: string): Promise<void> {
    try {
        // Get the league name from the database path
        const leagueName = path.basename(databasePath, '.sqlite');
        const savFilePath = path.join(saveDirectory, `${leagueName}.sav`);
        
        console.log(`Compressing and saving modified database: ${databasePath} → ${savFilePath}`);
        
        // Read the modified database file
        const databaseData = await fs.readFile(databasePath);
        
        // Compress using DEFLATE (zlib default level)
        const deflate = promisify(zlib.deflate);
        const compressedData = await deflate(databaseData);
        
        // Delete existing .sav, .sav.bak, and .hash files for this league
        try {
            const saveFiles = await fs.readdir(saveDirectory);
            const filesToDelete = saveFiles.filter(file => {
                const fileName = file.toLowerCase();
                const leagueNameLower = leagueName.toLowerCase();
                return fileName.startsWith(leagueNameLower) && 
                       (fileName.endsWith('.sav') || fileName.endsWith('.sav.bak') || fileName.endsWith('.hash'));
            });
            
            for (const file of filesToDelete) {
                const filePath = path.join(saveDirectory, file);
                await fs.unlink(filePath);
                console.log(`Deleted existing file: ${file}`);
            }
        } catch (err) {
            console.warn(`Could not delete existing save files: ${err}`);
        }
        
        // Write the compressed data to the .sav file
        await fs.writeFile(savFilePath, compressedData);
        console.log(`Successfully saved custom league to: ${savFilePath}`);
    } catch (err) {
        throw new Error(`Failed to save custom league: ${err}`);
    }
}
