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

function getBackupDirPath(): string {
    return path.join(app.getPath('appData'), 'xbl-roster-injector-backup');
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

export async function copyBuiltInLeagueDbFiles(assetsDirectory: string) {
    try {
        // Create the temp/builtIn directory
        const tempDir = await createTempDir('builtIn');

        const backupDir = getBackupDirPath();
        await fs.mkdir(backupDir, { recursive: true });

        // Find all league*.sqlite files in the assets directory
        const files = await fs.readdir(assetsDirectory);
        const leagueFiles = files
            .filter(f => f.toLowerCase().startsWith('league') && f.endsWith('.sqlite') && !f.includes('template'))
            .map(f => path.join(assetsDirectory, f));

        if (leagueFiles.length === 0) {
            throw new Error('No league .sqlite files found in the assets directory');
        }

        for (const file of leagueFiles) {
            const fileName = path.basename(file);
            const backupPath = path.join(backupDir, fileName);
            
            try {
                await fs.access(backupPath);
                console.log(`Backup already exists for: ${fileName}`);
            } catch {
                // File doesn't exist in backup, copy it
                await fs.copyFile(file, backupPath);
                console.log(`Created backup for: ${fileName}`);
            }
        }

        // Copy each league file to the temp/builtIn directory
        for (const file of leagueFiles) {
            const fileName = path.basename(file);
            const outPath = path.join(tempDir, fileName);
            await fs.copyFile(file, outPath);
        }

        return tempDir;
    } catch (err) {
        throw new Error(`Failed to copy built-in league files: ${err}`);
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

export async function readBuiltInLeagues(): Promise<League[]> {
    return readLeagues('builtIn');
}

export async function readCustomLeagues(): Promise<League[]> {
    return readLeagues('custom');
}

export async function restoreFromBackup(assetsDirectory: string, saveDirectory: string): Promise<void> {
    try {
        const backupDir = getBackupDirPath();
        
        // Check if backup directory exists
        try {
            await fs.access(backupDir);
        } catch {
            throw new Error('No backup directory found. Backups are created automatically when loading built-in leagues.');
        }

        // Find all sqlite files in the backup directory
        const backupFiles = await fs.readdir(backupDir);
        const leagueBackupFiles = backupFiles
            .filter(f => f.toLowerCase().startsWith('league') && f.endsWith('.sqlite'))
            .map(f => path.join(backupDir, f));

        if (leagueBackupFiles.length === 0) {
            throw new Error('No league backup files found in the backup directory.');
        }

        // Restore each backup file to the assets directory
        for (const backupFile of leagueBackupFiles) {
            const fileName = path.basename(backupFile);
            const assetsFilePath = path.join(assetsDirectory, fileName);
            await fs.copyFile(backupFile, assetsFilePath);
            console.log(`Restored: ${fileName}`);

            // Delete corresponding .sav files from save directory
            const leagueName = path.basename(fileName, '.sqlite');
            try {
                const saveFiles = await fs.readdir(saveDirectory);
                
                const filesToDelete = saveFiles.filter(file => {
                    const fileNameLower = file.toLowerCase();
                    const leagueNameLower = leagueName.toLowerCase();
                    return fileNameLower.startsWith(leagueNameLower) && 
                           (fileNameLower.endsWith('.sav') || fileNameLower.endsWith('.sav.bak') || fileNameLower.endsWith('.hash'));
                });
                
                for (const file of filesToDelete) {
                    const filePath = path.join(saveDirectory, file);
                    await fs.unlink(filePath);
                    console.log(`Deleted save file: ${filePath}`);
                }
            } catch (err) {
                console.warn(`Could not delete save files for ${leagueName}: ${err}`);
                // Continue with restore even if save file deletion fails. They may not exist.
            }
        }

        console.log(`Successfully restored ${leagueBackupFiles.length} league files from backup.`);
    } catch (err) {
        throw new Error(`Failed to restore from backup: ${err}`);
    }
}

export async function getBackupInfo(assetsDirectory: string): Promise<{ lastBackupDate?: Date; backupExists: boolean }> {
    try {
        const backupDir = getBackupDirPath();
        
        // Check if backup directory exists
        try {
            await fs.access(backupDir);
        } catch {
            return { backupExists: false };
        }

        // Find all sqlite files in the backup directory and get their stats
        const backupFiles = await fs.readdir(backupDir);
        const leagueBackupFiles = backupFiles
            .filter(f => f.toLowerCase().startsWith('league') && f.endsWith('.sqlite'))
            .map(f => path.join(backupDir, f));

        if (leagueBackupFiles.length === 0) {
            return { backupExists: false };
        }

        // Get the most recent modification time from all backup files
        let mostRecentDate: Date | undefined;
        for (const backupFile of leagueBackupFiles) {
            const stats = await fs.stat(backupFile);
            if (!mostRecentDate || stats.mtime > mostRecentDate) {
                mostRecentDate = stats.mtime;
            }
        }

        return { 
            backupExists: true, 
            lastBackupDate: mostRecentDate 
        };
    } catch (err) {
        console.error('Error getting backup info:', err);
        return { backupExists: false };
    }
}

export async function handlePlayBallFileOperations(builtInDbPath: string, saveDirectory: string, assetsDirectory: string): Promise<void> {
    // Step 1: Delete league files with extensions .sav, .sav.bak, and .hash for the selected built-in team
    const builtInLeagueName = path.basename(builtInDbPath, '.sqlite');
    const saveFiles = await fs.readdir(saveDirectory);
    
    const filesToDelete = saveFiles.filter(file => {
        const fileName = file.toLowerCase();
        const leagueName = builtInLeagueName.toLowerCase();
        return fileName.startsWith(leagueName) && 
               (fileName.endsWith('.sav') || fileName.endsWith('.sav.bak') || fileName.endsWith('.hash'));
    });
    
    for (const file of filesToDelete) {
        const filePath = path.join(saveDirectory, file);
        await fs.unlink(filePath);
        console.log(`Deleted: ${filePath}`);
    }
    
    // Step 2: Copy the modified sqlite file to overwrite the file in the assets directory
    const assetsFilePath = path.join(assetsDirectory, path.basename(builtInDbPath));
    await fs.copyFile(builtInDbPath, assetsFilePath);
    console.log(`Copied modified database to: ${assetsFilePath}`);
}
