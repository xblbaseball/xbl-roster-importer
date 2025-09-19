import { useState, useEffect } from 'react';
import { League } from '../../shared/models/league';

export function useGameFiles(isSaveDirectoryValid: boolean, saveDirectory: string, isAssetsDirectoryValid: boolean, assetsDirectory: string) {
  const [builtInLeagues, setBuiltInLeagues] = useState<League[]>([]);
  const [customLeagues, setCustomLeagues] = useState<League[]>([]);

  useEffect(() => {
    const loadGameFiles = async () => {
      if (isSaveDirectoryValid) {
        const customLeaguesLoaded = await window.electronAPI.loadCustomLeagues(saveDirectory);
        if (customLeaguesLoaded) {
          const customLeagues = await window.electronAPI.readCustomLeagues();
          setCustomLeagues(customLeagues);
        }
      }
      if (isAssetsDirectoryValid) {
        const builtInLeaguesLoaded = await window.electronAPI.loadBuiltInLeagues(assetsDirectory);
        if (builtInLeaguesLoaded) {
          const builtInLeagues = await window.electronAPI.readBuiltInLeagues();
          setBuiltInLeagues(builtInLeagues);
        }
      }
    };

    loadGameFiles();
  }, [isSaveDirectoryValid, isAssetsDirectoryValid, saveDirectory, assetsDirectory]);

  return {
    builtInLeagues,
    customLeagues,
  };
}
