import { useState, useEffect, useCallback } from 'react';
import { League } from '../../shared/models/league';

export function useGameFiles(isSaveDirectoryValid: boolean, saveDirectory: string) {
  const [customLeagues, setCustomLeagues] = useState<League[]>([]);

  const loadGameFiles = useCallback(async () => {
    if (isSaveDirectoryValid) {
      const customLeaguesLoaded = await window.electronAPI.loadCustomLeagues(saveDirectory);
      if (customLeaguesLoaded) {
        const customLeagues = await window.electronAPI.readCustomLeagues();
        setCustomLeagues(customLeagues);
      }
    }
  }, [isSaveDirectoryValid, saveDirectory]);

  useEffect(() => {
    loadGameFiles();
  }, [loadGameFiles]);

  const refreshLeagues = useCallback(async () => {
    await loadGameFiles();
  }, [loadGameFiles]);

  return {
    customLeagues,
    refreshLeagues,
  };
}
