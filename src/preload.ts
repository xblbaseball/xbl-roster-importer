import { contextBridge, ipcRenderer } from 'electron';
import { League } from './shared/models/league';
import { DatabasePlayer, PlayerComparison } from './shared/models/player';

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
  loadBuiltInLeagues: (assetsDirectory: string) => Promise<boolean>;
  readBuiltInLeagues: () => Promise<League[]>;
  readCustomLeagues: () => Promise<League[]>;
  loadPlayersByTeam: (teamGuid: string, databasePath: string) => Promise<DatabasePlayer[]>;
  playBall: (builtInTeamName: string, customTeamName: string, builtInDbPath: string, customDbPath: string, saveDirectory: string, assetsDirectory: string, playerPairs?: PlayerComparison[]) => Promise<boolean>;
  restoreFromBackup: (assetsDirectory: string) => Promise<boolean>;
  getBackupInfo: (assetsDirectory: string) => Promise<{ lastBackupDate?: Date; backupExists: boolean }>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  checkDirectory: (path: string) => ipcRenderer.invoke('check-directory', path),
  getUsername: () => ipcRenderer.invoke('get-username'),
  findSteamIds: (baseDirectory: string) => ipcRenderer.invoke('find-steam-ids', baseDirectory),
  checkSteamCloudSync: (gameSaveSteamId: string, steamInstallDirectory: string) => ipcRenderer.invoke('check-steam-cloud-sync', gameSaveSteamId, steamInstallDirectory),
  loadCustomLeagues: (saveDirectory: string) => ipcRenderer.invoke('load-custom-leagues', saveDirectory),
  loadBuiltInLeagues: (assetsDirectory: string) => ipcRenderer.invoke('load-built-in-leagues', assetsDirectory),
  readBuiltInLeagues: () => ipcRenderer.invoke('read-built-in-leagues'),
  readCustomLeagues: () => ipcRenderer.invoke('read-custom-leagues'),
  loadPlayersByTeam: (teamGuid: string, databasePath: string) => ipcRenderer.invoke('load-players-by-team', teamGuid, databasePath),
  playBall: (builtInTeamName: string, customTeamName: string, builtInDbPath: string, customDbPath: string, saveDirectory: string, assetsDirectory: string, playerPairs?: PlayerComparison[]) => 
    ipcRenderer.invoke('play-ball', builtInTeamName, customTeamName, builtInDbPath, customDbPath, saveDirectory, assetsDirectory, playerPairs),
  restoreFromBackup: (assetsDirectory: string) => ipcRenderer.invoke('restore-from-backup', assetsDirectory),
  getBackupInfo: (assetsDirectory: string) => ipcRenderer.invoke('get-backup-info', assetsDirectory),
});
