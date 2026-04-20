import React, { useState, useMemo } from 'react';
import { Container, Stack, Typography, Box, Paper, Stepper, Step, StepLabel, Button, Alert, useTheme } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReplayIcon from '@mui/icons-material/Replay';
import { useNavigate } from 'react-router-dom';
import HandshakeForm from './HandshakeForm';
import SyncControl from './SyncControl';
import { useGetSyncStatusQuery } from '../../store/services/syncApi';

const steps = ['Connect', 'Import', 'Analyze'];

const IngestionPage: React.FC = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const [config, setConfig] = useState<{ url: string; prefix: string; limit: number } | null>(null);
	const [isResetting, setIsResetting] = useState(false);

	const { data: status } = useGetSyncStatusQuery(undefined, { 
		pollingInterval: 2000,
	});

	const isComplete = status?.status === 'idle' && status.processed > 0 && status.processed >= (status.total || 0);

	const activeStep = useMemo(() => {
		if (isComplete && !isResetting) return 2;
		if (config || status?.status === 'running') return 1;
		return 0;
	}, [isComplete, config, status, isResetting]);

	return (
		<Container maxWidth="md" sx={{ py: 8 }}>
			<Paper 
				variant="outlined" 
				sx={{ 
					p: 5, 
					borderRadius: 3, 
					bgcolor: theme.palette.background.paper,
					borderColor: theme.palette.divider 
				}}
			>
				<Stack spacing={5}>
					<Box sx={{ textAlign: 'center' }}>
						<Typography variant="h1" color="primary">Data Ingestion</Typography>
						<Typography variant="body1" color="text.secondary">Follow the steps to populate your environment.</Typography>
					</Box>

					<Stepper activeStep={activeStep} alternativeLabel>
						{steps.map((label) => (
							<Step key={label}>
								<StepLabel StepIconProps={{ sx: { '&.Mui-active': { color: theme.palette.primary.main } } }}>
									{label}
								</StepLabel>
							</Step>
						))}
					</Stepper>

					<Box sx={{ minHeight: 250, display: 'flex', flexDirection: 'column', justifyContent: 'center', mt: theme.spacing(2) }}>
						{activeStep === 0 && <HandshakeForm onValidated={(c) => { setConfig(c); setIsResetting(false); }} />}
						{activeStep === 1 && <SyncControl status={status} config={config || { url: '', prefix: status?.current_prefix || '', limit: status?.total || 0 }} />}
						{activeStep === 2 && (
							<Stack spacing={4} alignItems="center">
								<Alert severity="success" variant="filled" sx={{ width: '100%' }}>
									Successfully imported <b>{status?.processed}</b> records into <b>{status?.current_prefix}</b>.
								</Alert>
								<Stack direction="row" spacing={2}>
									<Button variant="contained" color="success" size="large" startIcon={<DashboardIcon />} onClick={() => navigate('/')}>View Dashboard</Button>
									<Button variant="outlined" startIcon={<ReplayIcon />} onClick={() => { setConfig(null); setIsResetting(true); }}>New Import</Button>
								</Stack>
							</Stack>
						)}
					</Box>
				</Stack>
			</Paper>
		</Container>
	);
};

export default IngestionPage;
