import { Box, Typography } from '@mui/material';
import { Team } from '../../shared/models/league';

interface TeamMenuItemProps {
  team: Team;
}

export const TeamMenuItem = ({ team }: TeamMenuItemProps) => (
  <Box display="flex" alignItems="center" gap={1} width="100%">
    <Typography sx={{ flexGrow: 1 }}>{team.name}</Typography>
    {team.colors && team.colors.length > 0 && (
      <Box display="flex" gap={0.5}>
        {team.colors.slice(0, 5).map((color, index) => (
          <Box
            key={index}
            sx={{
              width: 16,
              height: 16,
              backgroundColor: color,
              borderRadius: 1,
              border: '1px solid #ccc'
            }}
          />
        ))}
      </Box>
    )}
  </Box>
);
