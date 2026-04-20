import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Typography, 
  Paper, 
  Alert,
  Button,
  CircularProgress,
  Container
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useValidateUrlMutation, useStartSyncMutation } from '../../store/services/syncApi';

interface HandshakeFormProps {
  onValidated: (config: { url: string; prefix: string; limit: number }) => void;
}

const HandshakeForm: React.FC<HandshakeFormProps> = ({ onValidated }) => {
  const [url, setUrl] = useState('');
  const [prefix, setPrefix] = useState('');
  const [limit, setLimit] = useState(1000);
  const [isValidated, setIsValidated] = useState(false);
  
  const [validateUrl, { isLoading: isValidating, error: validateError, data }] = useValidateUrlMutation();
  const [startSync, { isLoading: isStarting, error: startError }] = useStartSyncMutation();

  const handleValidate = async () => {
    if (!url || !prefix) return;
    try {
      const response = await validateUrl({ target_url: url }).unwrap();
      if (response.valid) {
        setIsValidated(true);
        // Trigger the actual sync process once validated
        await startSync({ 
          target_url: url, 
          dataset_id: prefix, 
          total_limit: limit 
        }).unwrap();
        
        onValidated({ url, prefix, limit });
      }
    } catch (err) {
      setIsValidated(false);
    }
  };

  const isLoading = isValidating || isStarting;

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h2" gutterBottom>
          Connect New Data Source
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter the data source details below to verify compatibility with the VESA system
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 3, flexDirection: 'column' }}>
          <TextField
            fullWidth
            label="Data Source Web Address"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setIsValidated(false); }}
            placeholder="https://api.example.com/v1/adapter"
            disabled={isLoading}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              sx={{ flex: 1 }}
              label="Dataset Label"
              helperText="Unique identifier for this collection (e.g., 'pangaea:')"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. pangaea:"
              disabled={isLoading}
            />
            <TextField
              type="number"
              label="Maximum Records to Import"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
              sx={{ width: 170 }}
              disabled={isLoading}
            />
          </Box>
          
          {(data && !data.valid) && <Alert severity="error">Incompatible Data Format: The selected source does not match VESA requirements</Alert>}
          {(validateError || startError) && <Alert severity="error">An error occurred during connection or sync initialization.</Alert>}

          <Button
            variant="contained"
            onClick={handleValidate}
            disabled={isLoading || !url || !prefix}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : (isValidated ? <CheckCircleIcon sx={{ color: '#4caf50' }} /> : null)}
            sx={{ 
              alignSelf: 'flex-start', 
              bgcolor: '#543CF0',
              '&:hover': { bgcolor: '#3619EB' },
              minWidth: 200 
            }}
          >
            {isValidated ? 'Ready to Import' : 'Verify Compatibility'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default HandshakeForm;
