import { Alert, Box, IconButton, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { ValidationMessage } from '../hooks/usePlayerValidation';

interface ValidationBannerProps {
  validationMessage: ValidationMessage;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function ValidationBanner({ validationMessage, onRefresh, isRefreshing = false }: ValidationBannerProps) {
  if (!validationMessage) {
    return null;
  }

  return (
    <Alert 
      severity={validationMessage.type}
      action={
        <Box display="flex" alignItems="center" gap={1}>
          {isRefreshing ? (
            <CircularProgress size={24} />
          ) : (
            <IconButton
              color="inherit"
              size="small"
              onClick={onRefresh}
              aria-label="refresh validation"
            >
              <RefreshIcon />
            </IconButton>
          )}
        </Box>
      }
    >
      {validationMessage.message}
    </Alert>
  );
}
