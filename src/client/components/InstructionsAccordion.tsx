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
          <strong>• Disable Steam Cloud Sync:</strong> Steam → Super Mega Baseball 4 → Properties → General → Steam Cloud (uncheck). You can re-enable this after confirming your import was successful.
          <br /><br />

          <strong>1. Select your custom team</strong>
          <br />
          Choose the league and team from your custom leagues that you want to update. This team's player names should match the names in your roster sheet.
          <br /><br />
          
          <strong>2. Load roster data</strong>
          <br />
          Paste your XBL roster sheet link to load player attributes. The app will update your custom team's player stats based on the spreadsheet data.
          <br />
          <strong>Note:</strong> Your Google Sheet must be shared with "Anyone with the link" for the tool to access it. Go to Share → General access → Anyone with the link.
          <br /><br />
          
          <strong>3. Review the changes</strong>
          <br />
          If you loaded roster data, check the player comparison table to see what attributes will be updated. Green indicates sheet values, red shows current game values that will be changed.
          <br /><br />
          
          <strong>4. Apply changes</strong>
          <br />
          Click "Play Ball!" to save the changes to your custom league. The modified league file will be ready to use the next time Super Mega Baseball 4 is launched.
          <br /><br />
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
