import React, { useState } from 'react';
import { Box, TextField, Typography, Alert, Button, CircularProgress, Stack, useTheme } from '@mui/material';
import { useValidateUrlMutation } from '../../store/services/syncApi';

interface HandshakeFormProps {
  onValidated: (config: { url: string; prefix: string; limit: number }) => void;
}

const HandshakeForm: React.FC<HandshakeFormProps> = ({ onValidated }) => {
  const theme = useTheme();
  const [url, setUrl] = useState('');
  const [prefix, setPrefix] = useState('');
  const [limit, setLimit] = useState(1000);
  const [validateUrl, { isLoading, data }] = useValidateUrlMutation();

  const handleValidate = async () => {
    try {
      const response = await validateUrl({ target_url: url }).unwrap();
      if (response.valid) onValidated({ url, prefix, limit });
    } catch (err) {}
  };

  return (
    <Stack spacing={3} sx={{ mt: theme.spacing(1) }}>
      <Typography variant="body2" color="text.secondary">
        Verify the research repository compatibility to begin the synchronization process.
      </Typography>
      <TextField 
        fullWidth 
        label="API Endpoint URL" 
        variant="outlined"
        value={url} 
        onChange={(e) => setUrl(e.target.value)} 
        disabled={isLoading} 
      />
      <Box sx={{ display: 'flex', gap: theme.spacing(2) }}>
        <TextField 
          sx={{ flex: 1 }} 
          label="Dataset Label" 
          variant="outlined"
          value={prefix} 
          onChange={(e) => setPrefix(e.target.value)} 
          placeholder="e.g. pangaea:" 
          disabled={isLoading} 
        />
        <TextField 
          type="number" 
          label="Limit" 
          variant="outlined"
          value={limit} 
          onChange={(e) => setLimit(Number(e.target.value))} 
          sx={{ width: 140 }} 
          disabled={isLoading} 
        />
      </Box>
      {data && !data.valid && (
        <Alert severity="error" variant="outlined" sx={{ borderRadius: 1 }}>
          {data.message}
        </Alert>
      )}
      <Button 
        variant="contained" 
        onClick={handleValidate} 
        disabled={isLoading || !url || !prefix} 
        size="large" 
        sx={{ 
          py: 1.5, 
          mt: 1,
          alignSelf: 'flex-start', 
          minWidth: 180,
          textTransform: 'none'
        }}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify Connection'}
      </Button>
    </Stack>
  );
};

export default HandshakeForm;
