import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { DatabasePlayer } from '../../shared/models/player';

interface UnmatchedPlayersDialogProps {
  open: boolean;
  onClose: () => void;
  unmatchedPlayers: DatabasePlayer[];
}

export function UnmatchedPlayersDialog({ 
  open, 
  onClose, 
  unmatchedPlayers 
}: UnmatchedPlayersDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Unmatched In-Game Players</Typography>
          <Typography variant="body2" color="text.secondary">
            ({unmatchedPlayers.length} players)
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          These players exist in the game but were not found in the roster sheet.
          Names are matched case-insensitively with leading/trailing spaces trimmed.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Position</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Bat/Throw</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Power</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Speed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {unmatchedPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 3, fontStyle: 'italic', color: '#666' }}>
                    All in-game players are matched to roster players
                  </TableCell>
                </TableRow>
              ) : (
                unmatchedPlayers.map((player) => (
                  <TableRow key={player.guid} hover>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{player.position}</TableCell>
                    <TableCell>{player.bat}/{player.throw}</TableCell>
                    <TableCell>{player.power}</TableCell>
                    <TableCell>{player.contact}</TableCell>
                    <TableCell>{player.speed}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
