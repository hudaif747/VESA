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
		<Container maxWidth="md" sx={{ py: theme.spacing(6) }}>
			<Paper 
				elevation={0}
				variant="outlined" 
				sx={{ 
					p: theme.spacing(4), 
					borderRadius: 2, 
					bgcolor: theme.palette.background.paper,
					borderColor: theme.palette.divider 
				}}
			>
				<Stack spacing={4}>
					<Box>
						<Typography variant="h4" gutterBottom>Data Ingestion</Typography>
						<Typography variant="body2" color="text.secondary">Follow the automated steps to populate your visualization environment.</Typography>
					</Box>

					<Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 2 }}>
						{steps.map((label) => (
							<Step key={label}>
								<StepLabel>{label}</StepLabel>
							</Step>
						))}
					</Stepper>

					<Box sx={{ minHeight: 300, display: 'flex', flexDirection: 'column' }}>
						{activeStep === 0 && <HandshakeForm onValidated={(c) => { setConfig(c); setIsResetting(false); }} />}
						{activeStep === 1 && <SyncControl status={status} config={config || { url: '', prefix: status?.current_prefix || '', limit: status?.total || 0 }} />}
						{activeStep === 2 && (
							<Stack spacing={3} alignItems="flex-start" sx={{ mt: 2 }}>
								<Alert severity="success" sx={{ width: '100%', borderRadius: 1 }}>
									Successfully imported <b>{status?.processed}</b> records into <b>{status?.current_prefix}</b>.
								</Alert>
								<Stack direction="row" spacing={2}>
									<Button variant="contained" size="medium" startIcon={<DashboardIcon />} onClick={() => navigate('/')} sx={{ textTransform: 'none' }}>View Dashboard</Button>
									<Button variant="outlined" size="medium" startIcon={<ReplayIcon />} onClick={() => { setConfig(null); setIsResetting(true); }} sx={{ textTransform: 'none' }}>New Import</Button>
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
