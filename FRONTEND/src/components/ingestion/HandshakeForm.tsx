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
    <Stack spacing={4} sx={{ mt: theme.spacing(2) }}>
      <Typography variant="body1" color="text.secondary">Verify the research repository compatibility.</Typography>
      <TextField fullWidth label="Web Address" value={url} onChange={(e) => setUrl(e.target.value)} disabled={isLoading} />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField sx={{ flex: 1 }} label="Dataset Label" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="e.g. pangaea:" disabled={isLoading} />
        <TextField type="number" label="Limit" value={limit} onChange={(e) => setLimit(Number(e.target.value))} sx={{ width: 120 }} disabled={isLoading} />
      </Box>
      {data && !data.valid && <Alert severity="error" sx={{ borderRadius: theme.shape.borderRadius }}>{data.message}</Alert>}
      <Button 
        variant="contained" 
        onClick={handleValidate} 
        disabled={isLoading || !url || !prefix} 
        size="large" 
        sx={{ 
          py: 1.5, 
          alignSelf: 'center', 
          minWidth: 200,
          backgroundColor: theme.palette.primary.main,
          '&:hover': { backgroundColor: theme.palette.primary.dark }
        }}
      >
        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify Connection'}
      </Button>
    </Stack>
  );
};

export default HandshakeForm;
