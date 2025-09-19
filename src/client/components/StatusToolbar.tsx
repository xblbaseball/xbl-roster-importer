import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Typography,
  Alert,
  Toolbar,
  AppBar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';

interface StatusToolbarProps {
  saveDirectory: string;
  setSaveDirectory: (value: string) => void;
  assetsDirectory: string;
  setAssetsDirectory: (value: string) => void;
  steamIdWarning: string | null;
  cloudSyncWarning: string | null;
  isCloudSyncEnabled: boolean;
  isSaveDirectoryValid: boolean;
  isAssetsDirectoryValid: boolean;
  isCheckingCloudSync: boolean;
  recheckCloudSync: () => void;
  lastBackupDate: Date | null;
  onRestoreBackup: () => void;
  isRestoreLoading: boolean;
}

export function StatusToolbar({
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
  lastBackupDate,
  onRestoreBackup,
  isRestoreLoading,
}: StatusToolbarProps) {
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  // Determine overall system status
  const getSystemStatus = () => {
    if (!isSaveDirectoryValid || !isAssetsDirectoryValid) return 'error';
    if (isCloudSyncEnabled) return 'warning';
    return 'success';
  };

  const getSystemStatusText = () => {
    const status = getSystemStatus();
    if (status === 'error') return 'Configuration Required';
    if (status === 'warning') return 'Cloud Sync Enabled';
    return 'System Ready';
  };

  const getSystemStatusColor = () => {
    const status = getSystemStatus();
    if (status === 'error') return 'error';
    if (status === 'warning') return 'warning';
    return 'success';
  };

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          top: 'auto', 
          bottom: 0,
          bgcolor: 'grey.100',
          borderTop: '1px solid',
          borderColor: 'grey.300',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 48 }}>
          <Box display="flex" alignItems="center" gap={2} width="100%">
            {/* System Status */}
            <Chip
              icon={getSystemStatus() === 'success' ? <CheckCircleIcon /> : <ErrorRoundedIcon />}
              label={getSystemStatusText()}
              color={getSystemStatusColor()}
              size="small"
              variant={getSystemStatus() === 'success' ? 'filled' : 'outlined'}
              onClick={() => setIsConfigDialogOpen(true)}
              sx={{ cursor: 'pointer' }}
            />
            
            {/* Individual status indicators */}
            <Box display="flex" alignItems="center" gap={1}>
              <Tooltip title={`Save Directory: ${isSaveDirectoryValid ? 'Valid' : 'Invalid'}`}>
                <Box display="flex" alignItems="center">
                  {isSaveDirectoryValid ? 
                    <CheckCircleIcon fontSize="small" color="success" /> : 
                    <ErrorRoundedIcon fontSize="small" color="error" />
                  }
                </Box>
              </Tooltip>
              <Tooltip title={`Assets Directory: ${isAssetsDirectoryValid ? 'Valid' : 'Invalid'}`}>
                <Box display="flex" alignItems="center">
                  {isAssetsDirectoryValid ? 
                    <CheckCircleIcon fontSize="small" color="success" /> : 
                    <ErrorRoundedIcon fontSize="small" color="error" />
                  }
                </Box>
              </Tooltip>
              <Tooltip title={`Steam Cloud Sync: ${isCloudSyncEnabled ? 'Enabled - may cause issues' : 'Disabled'}`}>
                <Box display="flex" alignItems="center">
                  {isCloudSyncEnabled ? 
                    <ErrorRoundedIcon fontSize="small" color="error" /> :
                    <CheckCircleIcon fontSize="small" color="success" />
                  }
                </Box>
              </Tooltip>
            </Box>

            {/* Spacer */}
            <Box flex={1} />

            {/* Settings button */}
            <Button
              startIcon={<SettingsIcon />}
              size="small"
              variant="outlined"
              onClick={() => setIsConfigDialogOpen(true)}
              sx={{ color: 'text.primary', borderColor: 'grey.400' }}
            >
              Configure
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Configuration Dialog */}
      <Dialog 
        open={isConfigDialogOpen} 
        onClose={() => setIsConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <SettingsIcon />
              System Configuration
            </Box>
            <IconButton onClick={() => setIsConfigDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} pt={1}>
            <Box display="flex" alignItems="center" gap={2}>
              <TextField
                fullWidth
                label="Save Files Directory"
                value={saveDirectory}
                onChange={(e) => setSaveDirectory(e.target.value)}
                size="small"
              />
              {isSaveDirectoryValid ? <CheckCircleIcon color="success" /> : <ErrorRoundedIcon color='error' />}
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <TextField
                fullWidth
                label="Game Assets Directory"
                value={assetsDirectory}
                onChange={(e) => setAssetsDirectory(e.target.value)}
                size="small"
              />
              {isAssetsDirectoryValid ? <CheckCircleIcon color="success" /> : <ErrorRoundedIcon color='error' />}
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <Button
                variant="outlined"
                color="secondary"
                disabled={!isAssetsDirectoryValid || !isSaveDirectoryValid || isRestoreLoading}
                onClick={onRestoreBackup}
                startIcon={isRestoreLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{ minWidth: '140px', whiteSpace: 'nowrap' }}
                size="small"
              >
                {isRestoreLoading ? 'Restoring...' : 'Restore Backup'}
              </Button>
              <Box display="flex" flexDirection="column">
                <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
                  Restores original 3 default league files from backup
                </Typography>
                {lastBackupDate && (
                  <Typography variant="caption" sx={{ color: '#888', fontSize: '0.75rem' }}>
                    Last backup: {lastBackupDate.toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Box>

            {steamIdWarning && (
              <Alert severity="warning">
                {steamIdWarning}
              </Alert>
            )}

            {cloudSyncWarning && (
              <Alert 
                severity={isCloudSyncEnabled ? "error" : "info"}
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={recheckCloudSync}
                    disabled={isCheckingCloudSync}
                    startIcon={isCheckingCloudSync ? <CircularProgress size={16} color="inherit" /> : undefined}
                    sx={{ alignSelf: 'center' }}
                  >
                    {isCheckingCloudSync ? '' : 'Refresh'}
                  </Button>
                }
              >
                {cloudSyncWarning}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfigDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
