import React, { useState } from 'react';
import { Box, TextField, Typography, Alert, Button, CircularProgress, Stack, useTheme, AlertTitle, Checkbox, FormControlLabel, Tooltip } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useValidateUrlMutation } from '../../store/services/syncApi';

// amCharts 5 default series color palette
const PALETTE = [
  '#543CF0', // VESA primary
  '#67b7dc',
  '#6794dc',
  '#8067dc',
  '#ae67dc',
  '#dc67ce',
  '#dc6788',
  '#dc8c67',
  '#dcb967',
  '#67dc94',
];

interface HandshakeFormProps {
  onValidated: (config: { url: string; prefix: string; limit: number; color: string; overwrite?: boolean }) => void;
  isSystemBusy?: boolean;
}

const HandshakeForm: React.FC<HandshakeFormProps> = ({ onValidated, isSystemBusy }) => {
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [prefix, setPrefix] = useState('');
  const [limit, setLimit] = useState(1000);
  const [color, setColor] = useState(PALETTE[0]);
  const [overwrite, setOverwrite] = useState(false);
  const [validateUrl, { isLoading, error }] = useValidateUrlMutation();

  const err = error as any;
  const isConflict = err?.status === 409;
  const errData = err?.data;

  const handleValidate = async () => {
    try {
      const response = await validateUrl({ target_url: url, dataset_id: prefix, overwrite }).unwrap();
      if (response.valid) onValidated({ url, prefix, limit, color, overwrite });
    } catch {
      // Error state is automatically captured by RTK Query's 'error' object
    }
  };

  return (
    <Stack spacing={3} sx={{ mt: theme.spacing(1) }}>
      {isSystemBusy ? (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 1 }}>
          <AlertTitle>System Busy</AlertTitle>
          An import is currently in progress. Please wait for completion or stop the current job.
        </Alert>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Verify the research repository compatibility to begin the synchronization process.
        </Typography>
      )}

      <TextField
        fullWidth
        label="API Endpoint URL"
        variant="outlined"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={isLoading || isSystemBusy}
      />

      <Box sx={{ display: 'flex', gap: theme.spacing(2) }}>
        <TextField
          sx={{ flex: 1 }}
          label="Dataset Label"
          variant="outlined"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="e.g. pangaea:"
          disabled={isLoading || isSystemBusy}
        />
        <TextField
          type="number"
          label="Limit"
          variant="outlined"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          sx={{ width: 140 }}
          disabled={isLoading || isSystemBusy}
        />
      </Box>

      {/* Source colour — drives the accent in ConnectedSources and chart series */}
      <Box>
        <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 1 }}>
          Source Color
        </Typography>
        <Stack direction="row" spacing={1}>
          {PALETTE.map((hex) => (
            <Tooltip key={hex} title={hex} placement="top">
              <Box
                onClick={() => !isSystemBusy && setColor(hex)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: hex,
                  cursor: isSystemBusy ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: color === hex ? `2px solid ${theme.palette.text.primary}` : '2px solid transparent',
                  outlineOffset: 2,
                  transition: 'outline 0.15s',
                }}
              >
                {color === hex && (
                  <CheckIcon sx={{ fontSize: 14, color: '#fff' }} />
                )}
              </Box>
            </Tooltip>
          ))}
        </Stack>
      </Box>

      {isConflict && (
        <Alert severity="warning" variant="outlined" sx={{ borderRadius: 1 }}>
          <AlertTitle>Dataset Already Exists</AlertTitle>
          <Typography variant="body2">
            This dataset label is currently in use. If you continue, the existing data will be permanently overwritten.
          </Typography>
          <FormControlLabel
            control={<Checkbox checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />}
            label="Confirm overwrite"
            sx={{ mt: 1 }}
          />
        </Alert>
      )}

      {error && !isConflict && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{ borderRadius: 1, backgroundColor: 'rgba(211, 47, 47, 0.04)' }}
        >
          <AlertTitle>
            Connection Failed {errData?.originalStatus ? `(Error ${errData.originalStatus})` : (err?.status ? `(Status ${err.status})` : '')}
          </AlertTitle>
          <Typography variant="body2">{errData?.message || errData?.error || 'An unexpected error occurred while verifying the connection.'}</Typography>
          {errData?.reason && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic', opacity: 0.8 }}>
              Reason: {errData.reason}
            </Typography>
          )}
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={handleValidate}
        disabled={isLoading || isSystemBusy || !url || !prefix || (isConflict && !overwrite)}
        size="large"
        sx={{ py: 1.5, mt: 1, alignSelf: 'flex-start', minWidth: 180, textTransform: 'none' }}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify Connection'}
      </Button>
    </Stack>
  );
};

export default HandshakeForm;
