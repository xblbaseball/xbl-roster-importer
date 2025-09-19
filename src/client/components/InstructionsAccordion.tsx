import { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';

export function InstructionsAccordion() {
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);

  return (
    <Accordion 
      expanded={isInstructionsExpanded} 
      onChange={(_, expanded) => setIsInstructionsExpanded(expanded)}
      sx={{ 
        mb: 2,
        '&:before': { display: 'none' },
        boxShadow: 1,
        borderRadius: 1,
        overflow: 'hidden'
      }}
    >
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        sx={{ 
          bgcolor: 'grey.50',
          '&:hover': { bgcolor: 'grey.100' },
          minHeight: 56
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <InfoIcon color="action" />
          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Instructions
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ bgcolor: 'grey.25', p: 3 }}>
        <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.6 }}>
          <strong><u>Prerequisites (Recommended):</u></strong>
          <br />
          <strong>• Create a one-time manual backup:</strong> Steam → Super Mega Baseball 4 → Properties → Installed Files → Backup game files
          <br />
          <strong>• Disable Steam Cloud Sync:</strong> Steam → Super Mega Baseball 4 → Properties → General → Steam Cloud (uncheck). You can re-enable this after confirming your import was successful.
          <br /><br />
          
          <strong>1. Select a default team to replace</strong>
          <br />
          Choose which team from the built-in leagues (Super Mega League, Creators Classic, or Legends League) you want to overwrite with your custom team. It's best to choose a team you never use for Pennant Race, Season, or Franchise Mode.
          <br /><br />
          
          <strong>2. Choose your custom team</strong>
          <br />
          Pick the team from your custom league that you want to import into the default team slot. This team's player names should match the names in your roster sheet.
          <br /><br />
          
          <strong>3. Load roster data</strong>
          <br />
          Paste your XBL roster sheet link to automatically update player attributes based on your spreadsheet data.
          <br /><br />
          
          <strong>4. Review the changes</strong>
          <br />
          Check the player comparison table to see what attributes will be updated. Green indicates sheet values, red shows current game values that will be changed.
          <br /><br />
          
          <strong>5. Import your team</strong>
          <br />
          Click "Play Ball!" to complete the import process and replace the selected default team with your custom team and updated player stats. These changes will take effect the next time Super Mega Baseball 4 is launched.
          <br /><br />

          <strong>6. In-game: Copy default league and rename</strong>
          <br />
            After launching the game, go to the main menu and select "Customization". Find the default league containing your imported team and choose "Copy League". Rename the copied league to something like "XBL Season 20 Scrim Roster v4". Use this copy for scrimmages and seasons to avoid accidentally overwriting your imported team.
          <br /><br />
          
          <em>{'Note: The selected default team will be permanently replaced. To preserve the original team, create a copy of the default league before importing. This tool also takes a backup of your default leagues the first time it is used. The defaults can be restored at any time by using Configure > Restore Backup'}</em>
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
