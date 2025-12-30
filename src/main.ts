import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { updateElectronApp } from 'update-electron-app';
import { processSaveFiles, readCustomLeagues, saveCustomLeague } from './ipc/gameFiles';
import { getPlayersByTeamGuid } from './ipc/database/database';
import { updatePlayerAttributes } from "./ipc/database/playerUpdater";

updateElectronApp();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const iconPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'assets', 'icon.png')
    : path.join(__dirname, '../../assets/icon.png');
    
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const SMB4_STEAM_APP_ID = '1487210';

ipcMain.handle('check-directory', (_event, dirPath) => {
  try {
    return fs.existsSync(dirPath);
  } catch (error) {
    console.error('Error checking directory:', error);
    return false;
  }
});

ipcMain.handle('get-username', (_event) => {
  try {
    return process.env.USERNAME || process.env.USER || 'Unknown';
  } catch (error) {
    console.error('Error getting username:', error);
    return 'Unknown';
  }
});

ipcMain.handle('find-steam-ids', (_event, baseDirectory) => {
  try {
    if (!fs.existsSync(baseDirectory)) {
      return { steamIds: [], error: 'Base directory does not exist' };
    }

    const entries = fs.readdirSync(baseDirectory, { withFileTypes: true });
    const steamIds = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    if (steamIds.length === 0) {
      return { steamIds: [], error: 'No Steam ID directories found' };
    }

    if (steamIds.length > 1) {
      return { 
        steamIds, 
        warning: `Multiple Steam ID directories found: ${steamIds.join(', ')}. Using the first one: ${steamIds[0]}` 
      };
    }

    return { steamIds, error: null, warning: null };
  } catch (error) {
    console.error('Error finding Steam IDs:', error);
    return { steamIds: [], error: 'Failed to read directory contents' };
  }
});

ipcMain.handle('check-steam-cloud-sync', (_event, gameSaveSteamId, steamInstallDirectory) => {
  try {
    // The gameSaveSteamId is from the save directory, but we need to find the Steam user ID
    // for the config files. Let's try to find it by checking the Steam userdata directory
    const steamUserdataPath = path.join(steamInstallDirectory, 'userdata');
    
    if (!fs.existsSync(steamUserdataPath)) {
      return { 
        invalidSteamCloudSyncState: true, 
        error: 'Steam installation not found. Please ensure Steam Cloud sync is disabled for Super Mega Baseball 4 before proceeding. To disable: go to Super Mega Baseball 4 > Manage > Properties > General > Steam Cloud' 
      };
    }

    // Get all user directories in Steam userdata
    const userDirs = fs.readdirSync(steamUserdataPath, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    // Try to find a valid sharedconfig.vdf file with the game entry
    for (const userDir of userDirs) {
      try {
        const sharedConfigPath = path.join(steamUserdataPath, userDir, '7', 'remote', 'sharedconfig.vdf');
        
        if (!fs.existsSync(sharedConfigPath)) {
          continue;
        }

        const configContent = fs.readFileSync(sharedConfigPath, 'utf8');
        
        // Look for the specific game section (Super Mega Baseball 4)
        const gameMatch = configContent.match(new RegExp(`"${SMB4_STEAM_APP_ID}"\\s*\\{([^}]*)\\}`));
        
        if (!gameMatch) {
          continue; // Try next user directory
        }

        const gameSection = gameMatch[1];
        const cloudEnabledMatch = gameSection.match(/"cloudenabled"\s*"(\d+)"/);
        
        if (!cloudEnabledMatch) {
          return { 
            invalidSteamCloudSyncState: true, 
            error: 'Cloud sync setting not found for Super Mega Baseball 4. Please manually disable Steam Cloud sync for this game. To disable: go to Super Mega Baseball 4 > Manage > Properties > General > Steam Cloud' 
          };
        }

        const cloudEnabled = cloudEnabledMatch[1] === '1';
        
        if (cloudEnabled) {
          return { 
            invalidSteamCloudSyncState: true, 
            error: 'Steam Cloud sync is enabled for Super Mega Baseball 4. Please disable it before proceeding to avoid save conflicts. To disable: go to Super Mega Baseball 4 > Manage > Properties > General > Steam Cloud' 
          };
        } else {
          return { 
            invalidSteamCloudSyncState: false 
          };
        }
      } catch (dirError) {
        // Continue to next directory if this one fails
        continue;
      }
    }
    
    // If we get here, we didn't find the game in any user config
    return { 
      invalidSteamCloudSyncState: true, 
      error: 'Super Mega Baseball 4 not found in Steam config. Please ensure Steam Cloud sync is disabled for this game before proceeding. To disable: go to Super Mega Baseball 4 > Manage > Properties > General > Steam Cloud' 
    };
  } catch (error) {
    console.error('Error checking Steam cloud sync:', error);
    return { 
      invalidSteamCloudSyncState: true, 
      error: 'Failed to read Steam config files. Please ensure Steam Cloud sync is disabled for Super Mega Baseball 4 before proceeding. To disable: go to Super Mega Baseball 4 > Manage > Properties > General > Steam Cloud' 
    };
  }
});

ipcMain.handle('load-custom-leagues', async (_event, saveDirectory) => {
  await processSaveFiles(saveDirectory);
  return true;
});

ipcMain.handle('read-custom-leagues', async (_event) => {
  return await readCustomLeagues();
});

ipcMain.handle('load-players-by-team', async (_event, teamGuid, databasePath) => {
  return await getPlayersByTeamGuid(databasePath, teamGuid);
});

ipcMain.handle('play-ball', async (_event, teamGuid, databasePath, saveDirectory, playerPairs) => {
  try {
    console.log(`=== PlayBall Operations for custom team ${teamGuid} ===`);
    
    // Convert GUID string to buffer for database operations
    const teamGuidBuffer = Buffer.from(teamGuid.replace(/-/g, ''), 'hex');
    
    // Step 1: Update player attributes in custom database (if roster data provided)
    if (playerPairs && playerPairs.length > 0) {
      await updatePlayerAttributes(teamGuidBuffer, databasePath, playerPairs);
    } else {
      console.log('No player pairs provided, skipping player attribute updates');
    }
    
    // Step 2: Compress and save custom database back to original .sav location
    await saveCustomLeague(databasePath, saveDirectory);
    
    console.log('PlayBall operations completed successfully!');
    return true;
  } catch (error) {
    console.error('Error in play-ball:', error);
    throw error;
  }
});