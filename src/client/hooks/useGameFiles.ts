import { useState, useEffect } from 'react';
import { League } from '../../shared/models/league';

export function useGameFiles(isSaveDirectoryValid: boolean, saveDirectory: string) {
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
    };

    loadGameFiles();
  }, [isSaveDirectoryValid, saveDirectory]);

  return {
    customLeagues,
  };
}
