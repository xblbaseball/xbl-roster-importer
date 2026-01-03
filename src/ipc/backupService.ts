import { app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';
import { getLeague } from './database/database';
import { BACKUPS_DIRECTORY_NAME } from '../shared/constants';

export interface BackupInfo {
  filename: string;
  leagueGuid: string;
  leagueName: string;
  timestamp: Date;
  filePath: string;
}

export interface LeagueBackups {
  leagueGuid: string;
  leagueName: string;
  backups: BackupInfo[];
}

function getBackupsPath(): string {
  return path.join(app.getPath('temp'), BACKUPS_DIRECTORY_NAME);
}

function getGameFilesPath(): string {
  return path.join(app.getPath('appData'), 'xbl-roster-injector-game-files', 'custom');
}

/**
 * Gets a mapping of league GUIDs to friendly names from processed database files
 * @returns Map of league GUID to league name
 */
async function getLeagueNameMapping(): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();
  
  try {
    const gameFilesDir = getGameFilesPath();
    
    // Check if the directory exists
    try {
      await fs.access(gameFilesDir);
    } catch {
      return mapping; // Return empty map if no processed files exist
    }
    
    const files = await fs.readdir(gameFilesDir);
    const sqliteFiles = files.filter(f => f.toLowerCase().startsWith('league') && f.endsWith('.sqlite'));
    
    for (const file of sqliteFiles) {
      try {
        const dbPath = path.join(gameFilesDir, file);
        const league = getLeague(dbPath);
        
        // Map the filename (without extension) to the league name
        const leagueGuid = path.basename(file, '.sqlite');
        mapping.set(leagueGuid, league.name);
      } catch (err) {
        console.warn(`Could not read league name from ${file}:`, err);
      }
    }
  } catch (err) {
    console.warn('Could not load league name mapping:', err);
  }
  
  return mapping;
}

/**
 * Creates a backup of a league .sav file before modifications
 * @param savFilePath Full path to the .sav file to backup
 * @returns Path to the backup file
 */
export async function createLeagueBackup(savFilePath: string): Promise<string> {
  try {
    const backupsDir = getBackupsPath();
    await fs.mkdir(backupsDir, { recursive: true });

    // Get the league name from the file path (e.g., "League01" from "League01.sav")
    const leagueName = path.basename(savFilePath, '.sav');
    
    // Create timestamp in format: YYYY-MM-DD_HH-mm-ss
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    
    // Backup filename format: LeagueName_2026-01-03_14-30-45.sav
    const backupFilename = `${leagueName}_${timestamp}.sav`;
    const backupPath = path.join(backupsDir, backupFilename);

    // Read the original file and write to backup location
    const fileData = await fs.readFile(savFilePath);
    await fs.writeFile(backupPath, fileData);

    console.log(`Created backup: ${backupPath}`);
    return backupPath;
  } catch (err) {
    throw new Error(`Failed to create backup for ${savFilePath}: ${err}`);
  }
}

/**
 * Gets all available backups grouped by league name
 * @returns Array of league backups
 */
export async function getLeagueBackups(): Promise<LeagueBackups[]> {
  try {
    const backupsDir = getBackupsPath();
    
    // Check if backups directory exists
    try {
      await fs.access(backupsDir);
    } catch {
      // No backups directory exists yet
      return [];
    }

    // Get league name mapping
    const leagueNameMapping = await getLeagueNameMapping();

    const files = await fs.readdir(backupsDir);
    const backupFiles = files.filter(f => f.endsWith('.sav'));

    // Parse backup files and group by league GUID
    const backupsByLeague = new Map<string, BackupInfo[]>();

    for (const file of backupFiles) {
      // Expected format: LeagueGuid_YYYY-MM-DD_HH-mm-ss.sav
      const match = file.match(/^(.+)_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.sav$/);
      
      if (match) {
        const leagueGuid = match[1];
        const timestampStr = match[2];
        
        // Parse timestamp back to Date (stored as UTC in filename)
        const [datePart, timePart] = timestampStr.split('_');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second] = timePart.split('-').map(Number);
        const timestamp = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

        // Get friendly league name or fall back to GUID
        const leagueName = leagueNameMapping.get(leagueGuid) || leagueGuid;

        const backupInfo: BackupInfo = {
          filename: file,
          leagueGuid,
          leagueName,
          timestamp,
          filePath: path.join(backupsDir, file),
        };

        if (!backupsByLeague.has(leagueGuid)) {
          backupsByLeague.set(leagueGuid, []);
        }
        backupsByLeague.get(leagueGuid)!.push(backupInfo);
      }
    }

    // Sort backups by timestamp (newest first) and convert to array
    const result: LeagueBackups[] = [];
    for (const [leagueGuid, backups] of backupsByLeague) {
      backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Use the league name from the first backup (they should all be the same)
      const leagueName = backups[0].leagueName;
      
      result.push({ leagueGuid, leagueName, backups });
    }

    // Sort leagues alphabetically by name
    result.sort((a, b) => a.leagueName.localeCompare(b.leagueName));

    return result;
  } catch (err) {
    throw new Error(`Failed to get league backups: ${err}`);
  }
}

/**
 * Restores a league from a backup file
 * @param backupFilePath Path to the backup file
 * @param saveDirectory The save directory to restore to
 * @returns Path to the restored file
 */
export async function restoreLeagueBackup(backupFilePath: string, saveDirectory: string): Promise<string> {
  try {
    // Get the backup filename and extract league name
    const backupFilename = path.basename(backupFilePath);
    const match = backupFilename.match(/^(.+)_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.sav$/);
    
    if (!match) {
      throw new Error('Invalid backup filename format');
    }

    const leagueName = match[1];
    const restorePath = path.join(saveDirectory, `${leagueName}.sav`);

    // Read the backup file
    const backupData = await fs.readFile(backupFilePath);

    // Delete existing .sav file for this league
    try {
      const saveFiles = await fs.readdir(saveDirectory);
      const filesToDelete = saveFiles.filter(file => {
        const fileName = file.toLowerCase();
        const leagueNameLower = leagueName.toLowerCase();
        return fileName === `${leagueNameLower}.sav`;
      });
      
      for (const file of filesToDelete) {
        const filePath = path.join(saveDirectory, file);
        await fs.unlink(filePath);
        console.log(`Deleted existing file: ${file}`);
      }
    } catch (err) {
      console.warn(`Could not delete existing save file: ${err}`);
    }

    // Write the backup data to the restore location
    await fs.writeFile(restorePath, backupData);

    console.log(`Restored backup to: ${restorePath}`);
    return restorePath;
  } catch (err) {
    throw new Error(`Failed to restore backup: ${err}`);
  }
}
