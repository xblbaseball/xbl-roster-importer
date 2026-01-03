import { contextBridge, ipcRenderer } from 'electron';
import { League } from './shared/models/league';
import { DatabasePlayer, PlayerComparison } from './shared/models/player';

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

export interface ElectronAPI {
  checkDirectory: (path: string) => Promise<boolean>;
  getUsername: () => Promise<string>;
  findSteamIds: (baseDirectory: string) => Promise<{
    steamIds: string[];
    error?: string;
    warning?: string;
  }>;
  checkSteamCloudSync: (gameSaveSteamId: string, steamInstallDirectory: string) => Promise<{
    invalidSteamCloudSyncState: boolean;
    error?: string;
  }>;
  loadCustomLeagues: (saveDirectory: string) => Promise<boolean>;
  readCustomLeagues: () => Promise<League[]>;
  loadPlayersByTeam: (teamGuid: string, databasePath: string) => Promise<DatabasePlayer[]>;
  playBall: (teamGuid: string, databasePath: string, saveDirectory: string, playerPairs?: PlayerComparison[]) => Promise<boolean>;
  getLeagueBackups: () => Promise<LeagueBackups[]>;
  restoreLeagueBackup: (backupFilePath: string, saveDirectory: string) => Promise<string>;
  openBackupsFolder: () => Promise<string>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  checkDirectory: (path: string) => ipcRenderer.invoke('check-directory', path),
  getUsername: () => ipcRenderer.invoke('get-username'),
  findSteamIds: (baseDirectory: string) => ipcRenderer.invoke('find-steam-ids', baseDirectory),
  checkSteamCloudSync: (gameSaveSteamId: string, steamInstallDirectory: string) => ipcRenderer.invoke('check-steam-cloud-sync', gameSaveSteamId, steamInstallDirectory),
  loadCustomLeagues: (saveDirectory: string) => ipcRenderer.invoke('load-custom-leagues', saveDirectory),
  readCustomLeagues: () => ipcRenderer.invoke('read-custom-leagues'),
  loadPlayersByTeam: (teamGuid: string, databasePath: string) => ipcRenderer.invoke('load-players-by-team', teamGuid, databasePath),
  playBall: (teamGuid: string, databasePath: string, saveDirectory: string, playerPairs?: PlayerComparison[]) => 
    ipcRenderer.invoke('play-ball', teamGuid, databasePath, saveDirectory, playerPairs),
  getLeagueBackups: () => ipcRenderer.invoke('get-league-backups'),
  restoreLeagueBackup: (backupFilePath: string, saveDirectory: string) => 
    ipcRenderer.invoke('restore-league-backup', backupFilePath, saveDirectory),
  openBackupsFolder: () => ipcRenderer.invoke('open-backups-folder'),
});
