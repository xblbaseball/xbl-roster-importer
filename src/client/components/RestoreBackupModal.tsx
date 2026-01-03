import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RestoreIcon from '@mui/icons-material/Restore';
import HistoryIcon from '@mui/icons-material/History';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import type { BackupInfo, LeagueBackups } from '../../preload';

interface RestoreBackupModalProps {
  open: boolean;
  onClose: () => void;
  saveDirectory: string;
  onRestoreSuccess: () => void;
}

export function RestoreBackupModal({
  open,
  onClose,
  saveDirectory,
  onRestoreSuccess,
}: RestoreBackupModalProps) {
  const [leagueBackups, setLeagueBackups] = useState<LeagueBackups[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadBackups();
    } else {
      // Reset state when modal closes
      setSelectedLeague('');
      setError(null);
      setRestoreSuccess(null);
    }
  }, [open]);

  const loadBackups = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const backups = await window.electronAPI.getLeagueBackups();
      // Convert date strings back to Date objects
      const backupsWithDates: LeagueBackups[] = backups.map(lb => ({
        leagueGuid: lb.leagueGuid,
        leagueName: lb.leagueName,
        backups: lb.backups.map(b => ({
          filename: b.filename,
          leagueGuid: b.leagueGuid,
          leagueName: b.leagueName,
          timestamp: new Date(b.timestamp),
          filePath: b.filePath,
        })),
      }));
      setLeagueBackups(backupsWithDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (backup: BackupInfo) => {
    setIsRestoring(true);
    setError(null);
    setRestoreSuccess(null);

    try {
      await window.electronAPI.restoreLeagueBackup(backup.filePath, saveDirectory);
      setRestoreSuccess(`Successfully restored ${backup.leagueName} from backup created at ${formatTimestamp(backup.timestamp)}`);
      onRestoreSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleOpenBackupsFolder = async () => {
    try {
      await window.electronAPI.openBackupsFolder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open backups folder');
    }
  };

  const selectedLeagueBackups = leagueBackups.find(lb => lb.leagueGuid === selectedLeague)?.backups || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <HistoryIcon />
            Restore From Backup
          </Box>
          <IconButton onClick={onClose} disabled={isRestoring}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} pt={1}>
          {isLoading ? (
            <Box display="flex" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress size={24} />
              <Typography sx={{ ml: 2 }}>Loading backups...</Typography>
            </Box>
          ) : leagueBackups.length === 0 ? (
            <Alert severity="info">
              No backups found. Backups are automatically created each time you run "Play Ball!".
            </Alert>
          ) : (
            <>
              <FormControl fullWidth>
                <InputLabel>Select League</InputLabel>
                <Select
                  value={selectedLeague}
                  label="Select League"
                  onChange={(e) => setSelectedLeague(e.target.value)}
                >
                  {leagueBackups.map((lb) => (
                    <MenuItem key={lb.leagueGuid} value={lb.leagueGuid}>
                      {lb.leagueName} ({lb.backups.length} backup{lb.backups.length !== 1 ? 's' : ''})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedLeague && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Available Backups for {leagueBackups.find(lb => lb.leagueGuid === selectedLeague)?.leagueName}:
                  </Typography>
                  <List sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'grey.50', borderRadius: 1 }}>
                    {selectedLeagueBackups.map((backup, index) => (
                      <ListItem
                        key={backup.filename}
                        divider={index < selectedLeagueBackups.length - 1}
                        sx={{ 
                          '&:hover': { bgcolor: 'grey.100' },
                          pr: 12,
                        }}
                      >
                        <ListItemText
                          primary={formatTimestamp(backup.timestamp)}
                          secondary={backup.filename}
                          primaryTypographyProps={{ fontWeight: 'medium' }}
                          secondaryTypographyProps={{ fontSize: '0.75rem', color: 'text.secondary' }}
                        />
                        <ListItemSecondaryAction>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={isRestoring ? <CircularProgress size={16} /> : <RestoreIcon />}
                            onClick={() => handleRestore(backup)}
                            disabled={isRestoring}
                          >
                            Restore
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {restoreSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {restoreSuccess}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          startIcon={<FolderOpenIcon />}
          onClick={handleOpenBackupsFolder}
          disabled={isRestoring}
        >
          Open Backups Folder
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} disabled={isRestoring}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
