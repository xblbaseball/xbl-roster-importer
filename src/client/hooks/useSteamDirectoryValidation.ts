import { useState, useEffect, useCallback } from 'react';

export const useSteamDirectoryValidation = () => {
  const [saveDirectory, setSaveDirectory] = useState('');
  const [steamInstallDirectory, setSteamInstallDirectory] = useState('C:\\Program Files (x86)\\Steam');
  const [steamIdWarning, setSteamIdWarning] = useState<string | null>(null);
  const [cloudSyncWarning, setCloudSyncWarning] = useState<string | null>(null);
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState(false);
  const [isSaveDirectoryValid, setIsSaveDirectoryValid] = useState(false);
  const [isSteamInstallDirectoryValid, setIsSteamInstallDirectoryValid] = useState(false);
  const [isCheckingCloudSync, setIsCheckingCloudSync] = useState(false);
  const [cloudSyncOverride, setCloudSyncOverride] = useState(false);

  // Function to check cloud sync status
  const checkCloudSyncStatus = useCallback(async (steamId: string) => {
    setIsCheckingCloudSync(true);
    try {
      const cloudSyncResult = await window.electronAPI.checkSteamCloudSync(steamId, steamInstallDirectory);
      
      if (cloudSyncResult.invalidSteamCloudSyncState) {
        setIsCloudSyncEnabled(true);
        setCloudSyncWarning(cloudSyncResult.error || 'Invalid Steam Cloud sync state detected. Please ensure Steam Cloud sync is disabled for Super Mega Baseball 4 before proceeding.');
      } else {
        setIsCloudSyncEnabled(false);
        setCloudSyncWarning(null);
      }
    } catch (cloudError) {
      console.error('Error checking Steam cloud sync:', cloudError);
      setCloudSyncWarning('Unable to check Steam cloud sync status. Please ensure Steam Cloud sync is disabled for Super Mega Baseball 4 before proceeding.');
      setIsCloudSyncEnabled(true); // Assume invalid state if check fails
    } finally {
      setIsCheckingCloudSync(false);
    }
  }, [steamInstallDirectory]);

  const recheckCloudSync = useCallback(async () => {
    try {
      const username = await window.electronAPI.getUsername();
      const baseDirectory = `C:\\Users\\${username}\\AppData\\Local\\Metalhead\\Super Mega Baseball 4`;
      const result = await window.electronAPI.findSteamIds(baseDirectory);
      
      if (result.steamIds.length > 0) {
        await checkCloudSyncStatus(result.steamIds[0]);
      }
    } catch (error) {
      console.error('Error rechecking cloud sync:', error);
    }
  }, [checkCloudSyncStatus]);

  // Effect to find Steam ID and check cloud sync
  useEffect(() => {
    const findSteamId = async () => {
      try {
        const username = await window.electronAPI.getUsername();
        const baseDirectory = `C:\\Users\\${username}\\AppData\\Local\\Metalhead\\Super Mega Baseball 4`;
        const result = await window.electronAPI.findSteamIds(baseDirectory);
        
        if (result.error) {
          console.warn('Steam ID detection failed:', result.error);
          return;
        }
        
        if (result.warning) {
          setSteamIdWarning(result.warning);
        } else {
          setSteamIdWarning(null);
        }
        
        if (result.steamIds.length > 0) {
          setSaveDirectory(`${baseDirectory}\\${result.steamIds[0]}`);
          
          // Check Steam cloud sync status
          await checkCloudSyncStatus(result.steamIds[0]);
        }
      } catch (error) {
        console.error('Error detecting Steam ID:', error);
      }
    };

    findSteamId();
  }, []);

  // Effect to validate directories
  useEffect(() => {
    const checkDirectories = async () => {
      const [saveValid, steamValid] = await Promise.all([
        window.electronAPI.checkDirectory(saveDirectory),
        window.electronAPI.checkDirectory(steamInstallDirectory)
      ]);
      setIsSaveDirectoryValid(saveValid);
      setIsSteamInstallDirectoryValid(steamValid);
    };

    checkDirectories();
  }, [saveDirectory, steamInstallDirectory]);

  return {
    saveDirectory,
    setSaveDirectory,
    steamInstallDirectory,
    setSteamInstallDirectory,
    steamIdWarning,
    cloudSyncWarning,
    isCloudSyncEnabled,
    isSaveDirectoryValid,
    isSteamInstallDirectoryValid,
    isCheckingCloudSync,
    recheckCloudSync,
    cloudSyncOverride,
    setCloudSyncOverride,
  };
};
