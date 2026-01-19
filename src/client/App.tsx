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
  Tooltip,
} from '@mui/material';
import iconPng from '../../assets/icon.png';
import { loadPlayersFromSheet } from './services/googleSheets';
import { SheetPlayer, DatabasePlayer } from '../shared/models/player';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import { League, Team } from '../shared/models/league';
import { usePlayerComparison, formatPropertyValue } from './hooks/usePlayerComparison';
import { usePlayerValidation } from './hooks/usePlayerValidation';
import { useSteamDirectoryValidation } from './hooks/useSteamDirectoryValidation';
import { useGameFiles } from './hooks/useGameFiles';
import { TeamMenuItem } from './components/TeamMenuItem';
import { StatusToolbar } from './components/StatusToolbar';
import { InstructionsAccordion } from './components/InstructionsAccordion';
import { ValidationBanner } from './components/ValidationBanner';
import { UnmatchedPlayersDialog } from './components/UnmatchedPlayersDialog';

function App() {

  const {
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
  } = useSteamDirectoryValidation();

  const { customLeagues, refreshLeagues } = useGameFiles(
    isSaveDirectoryValid,
    saveDirectory
  );

  const [rosterLink, setRosterLink] = useState('');
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
  const [isRefreshingLeague, setIsRefreshingLeague] = useState(false);
  const [unmatchedDialogOpen, setUnmatchedDialogOpen] = useState(false);

  const { comparisons: playerComparisons, unmatchedCustomPlayers } = usePlayerComparison(players, customPlayers);

  const { isPlayerValid, isRosterValid, validationMessage } = usePlayerValidation(players);

  useEffect(() => {
    if (customLeague) {
      setCustomTeam(undefined);
      setCustomPlayers([]);
    }
  }, [customLeague]);

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

  const handleRefreshValidation = async () => {
    if (!customTeam || !customLeague) {
      return;
    }

    setIsRefreshingLeague(true);
    setIsLoadingSheet(true);
    setHasAttemptedSheetLoad(true);
    
    try {
      // Reload both custom team players and roster sheet data
      const [loadedCustomPlayers, sheetData] = await Promise.all([
        window.electronAPI.loadPlayersByTeam(customTeam.guid, customLeague.databasePath),
        rosterLink ? loadPlayersFromSheet(rosterLink) : Promise.resolve({ players: [], lastUpdated: null })
      ]);
      
      setCustomPlayers(loadedCustomPlayers);
      
      if (rosterLink && sheetData) {
        setPlayers(sheetData.players);
        setSheetLastUpdated(sheetData.lastUpdated);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshingLeague(false);
      setIsLoadingSheet(false);
    }
  }

  const handlePlayBall = async () => {
    if (!customLeague || !customTeam) {
      console.error('Custom league and team must be selected');
      return;
    }

    // Reset previous states
    setPlayBallError(null);
    setPlayBallSuccess(false);
    setIsPlayBallLoading(true);

    try {
      // Pass player comparisons if we have roster data loaded
      const playerPairsToPass = (players.length > 0 && customPlayers.length > 0) ? playerComparisons : undefined;
      
      await window.electronAPI.playBall(
        customTeam.guid,
        customLeague.databasePath,
        saveDirectory,
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

  // Disable Play Ball if any player is not matched or missing required attributes
  const allPlayersMatched = playerComparisons.length === 0 || playerComparisons.every(pc => pc.isMatched);
  const isFormValid = customLeague && customTeam && allPlayersMatched && isRosterValid && (!isCloudSyncEnabled || cloudSyncOverride);

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

        {/* League and Team Selection */}
        <Box display="flex" flexDirection="row" gap={3}>
          <FormControl fullWidth>
            <InputLabel>Select League</InputLabel>
            <Select
              value={customLeague?.guid || ''}
              label="Select League"
              onChange={(e) => setCustomLeague(customLeagues.find(l => l.guid === e.target.value) || undefined)}
            >
              {customLeagues.map((league) => (
                <MenuItem key={league.guid} value={league.guid}>{league.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Select Team</InputLabel>
            <Select
              value={customTeam?.guid || ''}
              label="Select Team"
              disabled={!customLeague}
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
            <Tooltip title="Failed to load sheet. Make sure the Google Sheet is shared with 'Anyone with the link' (Share → General access → Anyone with the link)" arrow>
              <ErrorRoundedIcon color='error' />
            </Tooltip>
          ) : null}
        </Box>

        {sheetLastUpdated && (
          <Box sx={{ fontSize: '0.875rem', color: '#666', fontStyle: 'italic' }}>
            Sheet data loaded on: {sheetLastUpdated.toLocaleString()}
          </Box>
        )}

        <ValidationBanner 
          validationMessage={validationMessage}
          onRefresh={handleRefreshValidation}
          isRefreshing={isRefreshingLeague}
        />

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
                      {!customTeam ? (
                        <span style={{ color: '#757575', fontStyle: 'italic' }}>Select a team to match players</span>
                      ) : comparison.isMatched ? (
                        <Box display="flex" alignItems="center" gap={2}>
                          <div>{`Matched - ${comparison.customPlayer!.name} ${comparison.customPlayer!.position}`}</div>
                          <CheckCircleIcon color="success" />
                        </Box>
                      ) : (
                        <Box display="flex" alignItems="center" gap={2}>
                          <div>Player Not Found</div>
                          <ErrorRoundedIcon color="error" />
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setUnmatchedDialogOpen(true)}
                            sx={{ ml: 1, textTransform: 'none', fontSize: '0.75rem' }}
                          >
                            View Unmatched
                          </Button>
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

      {/* Status Toolbar */}
      <StatusToolbar
        saveDirectory={saveDirectory}
        setSaveDirectory={setSaveDirectory}
        steamInstallDirectory={steamInstallDirectory}
        setSteamInstallDirectory={setSteamInstallDirectory}
        steamIdWarning={steamIdWarning}
        cloudSyncWarning={cloudSyncWarning}
        isCloudSyncEnabled={isCloudSyncEnabled}
        isSaveDirectoryValid={isSaveDirectoryValid}
        isSteamInstallDirectoryValid={isSteamInstallDirectoryValid}
        isCheckingCloudSync={isCheckingCloudSync}
        recheckCloudSync={recheckCloudSync}
        cloudSyncOverride={cloudSyncOverride}
        setCloudSyncOverride={setCloudSyncOverride}
        onRestoreSuccess={refreshLeagues}
      />

      {/* Unmatched Players Dialog */}
      <UnmatchedPlayersDialog
        open={unmatchedDialogOpen}
        onClose={() => setUnmatchedDialogOpen(false)}
        unmatchedPlayers={unmatchedCustomPlayers}
      />
    </Container>
  );
}

export default App;
