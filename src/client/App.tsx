import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import iconPng from '../../assets/icon.png';
import { loadPlayersFromSheet } from './services/googleSheets';
import { SheetPlayer, DatabasePlayer } from '../shared/models/player';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import { League, Team } from '../shared/models/league';
import { usePlayerComparison, formatPropertyValue } from './hooks/usePlayerComparison';
import { usePlayerValidation } from './hooks/usePlayerValidation';
import { useTeamValidation } from './hooks/useTeamValidation';
import { useSteamDirectoryValidation } from './hooks/useSteamDirectoryValidation';
import { useGameFiles } from './hooks/useGameFiles';
import { TeamMenuItem } from './components/TeamMenuItem';
import { StatusToolbar } from './components/StatusToolbar';
import { InstructionsAccordion } from './components/InstructionsAccordion';

function App() {

  const {
    saveDirectory,
    setSaveDirectory,
    assetsDirectory,
    setAssetsDirectory,
    steamIdWarning,
    cloudSyncWarning,
    isCloudSyncEnabled,
    isSaveDirectoryValid,
    isAssetsDirectoryValid,
    isCheckingCloudSync,
    recheckCloudSync,
  } = useSteamDirectoryValidation();

  const { builtInLeagues, customLeagues } = useGameFiles(
    isSaveDirectoryValid,
    saveDirectory,
    isAssetsDirectoryValid,
    assetsDirectory
  );

  const [rosterLink, setRosterLink] = useState('');
  const [selectedBuiltInLeague, setSelectedBuiltInLeague] = useState<League | undefined>(undefined);
  const [selectedBuiltInTeam, setSelectedBuiltInTeam] = useState<Team | undefined>(undefined);
  const [customLeague, setCustomLeague] = useState<League | undefined>(undefined);
  const [customTeam, setCustomTeam] = useState<Team | undefined>(undefined);
  const [players, setPlayers] = useState<SheetPlayer[]>([]);
  const [customPlayers, setCustomPlayers] = useState<DatabasePlayer[]>([]);
  const [sheetLastUpdated, setSheetLastUpdated] = useState<Date | null>(null);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [hasAttemptedSheetLoad, setHasAttemptedSheetLoad] = useState(false);
  const [isPlayBallLoading, setIsPlayBallLoading] = useState(false);
  const [playBallSuccess, setPlayBallSuccess] = useState(false);
  const [playBallError, setPlayBallError] = useState<string | null>(null);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);

  const playerComparisons = usePlayerComparison(players, customPlayers);
  const { isPlayerValid, isRosterValid, validationMessage } = usePlayerValidation(players);
  const { duplicateTeamError, isTeamValidationPassed } = useTeamValidation(
    selectedBuiltInLeague,
    selectedBuiltInTeam,
    customTeam
  );

  useEffect(() => {
    if (customLeague) {
      setCustomTeam(undefined);
      setCustomPlayers([]);
    }
  }, [customLeague]);

  useEffect(() => {
    const loadBackupInfo = async () => {
      if (isAssetsDirectoryValid && assetsDirectory) {
        try {
          const backupInfo = await window.electronAPI.getBackupInfo(assetsDirectory);
          setLastBackupDate(backupInfo?.lastBackupDate ? new Date(backupInfo.lastBackupDate) : null);
        } catch (error) {
          console.error('Failed to load backup info:', error);
          setLastBackupDate(null);
        }
      } else {
        setLastBackupDate(null);
      }
    };

    loadBackupInfo();
  }, [isAssetsDirectoryValid, assetsDirectory]);

  useEffect(() => {
    const loadPlayers = async () => {
      if (!rosterLink) {
        setPlayers([]);
        setSheetLastUpdated(null);
        setHasAttemptedSheetLoad(false);
        return;
      }
      
      setIsLoadingSheet(true);
      setHasAttemptedSheetLoad(true);
      
      try {
        const sheetData = await loadPlayersFromSheet(rosterLink);
        setPlayers(sheetData.players);
        setSheetLastUpdated(sheetData.lastUpdated);
      } catch (error) {
        console.error('Failed to load players:', error);
        setPlayers([]);
        setSheetLastUpdated(null);
        // You might want to add error handling state and UI feedback here
      } finally {
        setIsLoadingSheet(false);
      }
    };

    loadPlayers();
  }, [rosterLink]);

  const handleCustomTeamSelected = (team?: Team) => {
    if (team && customLeague) {
      setCustomTeam(team);
      
      const loadCustomTeamPlayers = async () => {
        try {
          const loadedCustomPlayers = await window.electronAPI.loadPlayersByTeam(team.guid, customLeague.databasePath);
          setCustomPlayers(loadedCustomPlayers);
        } catch (error) {
          console.error('Failed to load custom players:', error);
        }
      }

      loadCustomTeamPlayers();
    }
  }

  const handlePlayBall = async () => {
    if (!selectedBuiltInLeague || !selectedBuiltInTeam) {
      console.error('Built-in league and team must be selected');
      return;
    }

    // Reset previous states
    setPlayBallError(null);
    setPlayBallSuccess(false);
    setIsPlayBallLoading(true);

    try {
      // Using custom team mode - update with roster data if available
      if (!customLeague || !customTeam) {
        throw new Error('Custom league and team must be selected when using custom team mode');
      }
      
      // Pass player comparisons if we have roster data loaded
      const playerPairsToPass = (players.length > 0 && customPlayers.length > 0) ? playerComparisons : undefined;
      
      await window.electronAPI.playBall(
        selectedBuiltInTeam.guid,
        customTeam.guid,
        selectedBuiltInLeague.databasePath,
        customLeague.databasePath,
        saveDirectory,
        assetsDirectory,
        playerPairsToPass
      );
      
      console.log('Play Ball completed successfully!');
      setPlayBallSuccess(true);
    } catch (error) {
      console.error('Play Ball failed:', error);
      setPlayBallError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsPlayBallLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!isAssetsDirectoryValid) {
      console.error('Assets directory must be valid to restore backup');
      return;
    }

    // Reset previous states
    setRestoreError(null);
    setRestoreSuccess(false);
    setIsRestoreLoading(true);

    try {
      await window.electronAPI.restoreFromBackup(assetsDirectory);
      console.log('Restore completed successfully!');
      setRestoreSuccess(true);
      
      // Refresh backup info after successful restore
      try {
        const backupInfo = await window.electronAPI.getBackupInfo(assetsDirectory);
        setLastBackupDate(backupInfo?.lastBackupDate ? new Date(backupInfo.lastBackupDate) : null);
      } catch (error) {
        console.error('Failed to refresh backup info after restore:', error);
      }
    } catch (error) {
      console.error('Restore failed:', error);
      setRestoreError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsRestoreLoading(false);
    }
  };

  // Disable Play Ball if any player is not matched or missing required attributes
  const allPlayersMatched = playerComparisons.length === 0 || playerComparisons.every(pc => pc.isMatched);
  const isFormValid = selectedBuiltInLeague && selectedBuiltInTeam && (
    (customLeague && customTeam) ||
    (rosterLink && players.length > 0)
  ) && allPlayersMatched && isRosterValid && isTeamValidationPassed && !isCloudSyncEnabled;

  return (
    <Container sx={{ mt: 4, pb: 8 }}>
      {/* Header Section */}
      <Box display="flex" alignItems="center" justifyContent="center" sx={{ mb: 4 }}>
        <Box 
          component="img" 
          src={iconPng} 
          alt="XBL Logo" 
          sx={{ height: 64, objectFit: 'contain', mr: 3 }} 
        />
        <Box textAlign="center">
          <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#333' }}>
            XBL Roster Importer
          </Typography>
        </Box>
        <Box 
          component="img" 
          src={iconPng} 
          alt="XBL Logo" 
          sx={{ height: 64, objectFit: 'contain', ml: 3 }} 
        />
      </Box>

      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Instructions Section */}
        <InstructionsAccordion />

        <Box display="flex" gap={2}>
          <FormControl fullWidth>
            <InputLabel>Default League to Overwrite</InputLabel>
            <Select
              value={selectedBuiltInLeague?.guid || ''}
              label="League to Override"
              onChange={(e) => setSelectedBuiltInLeague(builtInLeagues.find(l => l.guid === e.target.value) || undefined)}
            >
              {builtInLeagues.map((league) => (
                <MenuItem key={league.guid} value={league.guid}>{league.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Default Team to Overwrite</InputLabel>
            <Select
              value={selectedBuiltInTeam?.guid || ''}
              label="Team to Override"
              onChange={(e) => setSelectedBuiltInTeam(selectedBuiltInLeague?.teams.find(t => t.guid === e.target.value) || undefined)}
            >
              {(selectedBuiltInLeague?.teams || []).map((team) => (
                <MenuItem key={team.guid} value={team.guid}>
                  <TeamMenuItem team={team} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box display="flex" gap={2}>
          <FormControl fullWidth>
            <InputLabel>Custom League</InputLabel>
            <Select
              value={customLeague?.guid || ''}
              label="Custom League"
              onChange={(e) => setCustomLeague(customLeagues.find(l => l.guid === e.target.value) || undefined)}
            >
              {customLeagues.map((league) => (
                <MenuItem key={league.guid} value={league.guid}>{league.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Custom Team</InputLabel>
            <Select
              value={customTeam?.guid || ''}
              label="Custom Team"
              onChange={(e) => handleCustomTeamSelected(customLeague?.teams.find(t => t.guid === e.target.value) || undefined)}
            >
              {(customLeague?.teams || []).map((team) => (
                <MenuItem key={team.guid} value={team.guid}>
                  <TeamMenuItem team={team} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {duplicateTeamError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {duplicateTeamError}
          </Alert>
        )}

        <Box display="flex" alignItems="center" gap={2}>
          <TextField
            fullWidth
            label="Roster Tool Google Sheet Link"
            value={rosterLink}
            onChange={(e) => setRosterLink(e.target.value)}
          />
          {isLoadingSheet ? (
            <CircularProgress size={24} />
          ) : players.length > 0 ? (
            <CheckCircleIcon color="success" />
          ) : hasAttemptedSheetLoad ? (
            <ErrorRoundedIcon color='error' />
          ) : null}
        </Box>

        {sheetLastUpdated && (
          <Box sx={{ fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
            Sheet data loaded on: {sheetLastUpdated.toLocaleString()}
          </Box>
        )}

        {validationMessage && (
          <Alert severity={validationMessage.type}>
            {validationMessage.message}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1 } }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e0e0e0' }}>Roster Player</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e0e0e0' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#e0e0e0' }}>Differences</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingSheet ? (
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={2}>
                      <CircularProgress size={20} />
                      <span>Loading roster data...</span>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : playerComparisons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, fontStyle: 'italic', color: '#666' }}>
                    No roster data loaded
                  </TableCell>
                </TableRow>
              ) : (
                playerComparisons.map((comparison, index) => (
                  <TableRow key={index} sx={{ 
                    bgcolor: !isPlayerValid(comparison.sheetPlayer) ? '#ffebee' : 'inherit' 
                  }}>
                    <TableCell>{comparison.sheetPlayer.name} {comparison.sheetPlayer.position}</TableCell>
                    <TableCell>
                      {comparison.isMatched ? (
                        <Box display="flex" alignItems="center" gap={2}>
                          <div>{`Matched - ${comparison.customPlayer!.name} ${comparison.customPlayer!.position}`}</div>
                          <CheckCircleIcon color="success" />
                        </Box>
                      ) : (
                        <Box display="flex" alignItems="center" gap={2}>
                          <div>Player Not Found</div>
                          <ErrorRoundedIcon color="error" />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {!isPlayerValid(comparison.sheetPlayer) ? (
                        <span style={{ color: '#d32f2f', fontStyle: 'italic' }}>Invalid Roster Player Data</span>
                      ) : comparison.isMatched && comparison.diffs.length > 0 ? (
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          {comparison.diffs.map((diff, diffIndex) => (
                            <Box key={diffIndex} display="flex" flexDirection="column" sx={{ minWidth: '120px', mb: 1 }}>
                              <Box sx={{ fontWeight: 'bold', fontSize: '0.75rem', mb: 0.5 }}>
                                {diff.displayName}
                              </Box>
                              <Box display="flex" gap={1} alignItems="center">
                                <Box display="flex" flexDirection="column" alignItems="center">
                                  <Box sx={{ fontSize: '0.6rem', color: '#666', mb: 0.2 }}>Sheet</Box>
                                  <Chip
                                    label={formatPropertyValue(diff.sheetValue)}
                                    size="small"
                                    sx={{ 
                                      bgcolor: '#e8f5e8', 
                                      color: '#2e7d32',
                                      fontSize: '0.7rem',
                                      height: '24px',
                                      border: '1px solid #4caf50'
                                    }}
                                  />
                                </Box>
                                <span style={{ fontSize: '0.8rem', alignSelf: 'center', marginTop: '12px' }}>→</span>
                                <Box display="flex" flexDirection="column" alignItems="center">
                                  <Box sx={{ fontSize: '0.6rem', color: '#666', mb: 0.2 }}>Game</Box>
                                  <Chip
                                    label={formatPropertyValue(diff.customValue)}
                                    size="small"
                                    sx={{ 
                                      bgcolor: '#fce4ec', 
                                      color: '#d32f2f',
                                      fontSize: '0.7rem',
                                      height: '24px',
                                      border: '1px solid #f44336'
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      ) : comparison.isMatched ? (
                        <span style={{ color: '#4caf50', fontStyle: 'italic' }}>No differences</span>
                      ) : (
                        <span style={{ color: '#757575', fontStyle: 'italic' }}>N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Button
          variant="contained"
          color="primary"
          disabled={!isFormValid || isPlayBallLoading}
          onClick={handlePlayBall}
          fullWidth
          startIcon={isPlayBallLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
        >
          {isPlayBallLoading ? 'Processing...' : 'Play Ball!'}
        </Button>
      </Box>

      {/* Success/Error Notifications */}
      <Snackbar 
        open={playBallSuccess} 
        autoHideDuration={6000} 
        onClose={() => setPlayBallSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setPlayBallSuccess(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Roster imported successfully! You can now launch Super Mega Baseball 4.
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!playBallError} 
        autoHideDuration={8000} 
        onClose={() => setPlayBallError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setPlayBallError(null)} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          Error: {playBallError}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={restoreSuccess} 
        autoHideDuration={6000} 
        onClose={() => setRestoreSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setRestoreSuccess(false)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Backup restored successfully! Original league files have been restored.
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!restoreError} 
        autoHideDuration={8000} 
        onClose={() => setRestoreError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setRestoreError(null)} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          Error: {restoreError}
        </Alert>
      </Snackbar>

      {/* Status Toolbar */}
      <StatusToolbar
        saveDirectory={saveDirectory}
        setSaveDirectory={setSaveDirectory}
        assetsDirectory={assetsDirectory}
        setAssetsDirectory={setAssetsDirectory}
        steamIdWarning={steamIdWarning}
        cloudSyncWarning={cloudSyncWarning}
        isCloudSyncEnabled={isCloudSyncEnabled}
        isSaveDirectoryValid={isSaveDirectoryValid}
        isAssetsDirectoryValid={isAssetsDirectoryValid}
        isCheckingCloudSync={isCheckingCloudSync}
        recheckCloudSync={recheckCloudSync}
        lastBackupDate={lastBackupDate}
        onRestoreBackup={handleRestoreBackup}
        isRestoreLoading={isRestoreLoading}
      />
    </Container>
  );
}

export default App;
