import React, { useState, useEffect } from 'react';
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
	const [config, setConfig] = useState<{ url: string; prefix: string; limit: number; overwrite?: boolean } | null>(null);
	const [activeStep, setActiveStep] = useState(0);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [ignoredJobId, setIgnoredJobId] = useState<string | null>(() => localStorage.getItem('ignoredJobId'));

	const { data: syncStatus, isSuccess } = useGetSyncStatusQuery(undefined, { pollingInterval: 2000 });

	useEffect(() => {
		if (isSuccess && syncStatus) {
			const { status, processed, total, current_prefix, error_message, target_url, source_url, job_id } = syncStatus as any;
			const isCompleted = status === 'completed' || (status === 'idle' && processed > 0 && processed === total);
			const isStopped = status === 'idle' && processed > 0 && processed < total;
			const url = target_url || source_url || '';

			if (status === 'running') {
				if (activeStep !== 1) {
					setConfig({ url, prefix: current_prefix, limit: total });
					setActiveStep(1);
				}
				setErrorMsg(null);
			} else if (isCompleted && job_id !== ignoredJobId) {
				if (activeStep !== 2) {
					setConfig({ url, prefix: current_prefix, limit: total });
					setActiveStep(2);
				}
				setErrorMsg(null);
			} else if (isStopped && job_id !== ignoredJobId) {
				if (activeStep !== 1) {
					setConfig({ url, prefix: current_prefix, limit: total });
					setActiveStep(1);
				}
				setErrorMsg(`Synchronization stopped. Processed ${processed} of ${total} records. Please start a New Import.`);
			} else if (status === 'failed') {
				setErrorMsg(error_message || 'The synchronization process failed.');
			}
		}
	}, [isSuccess, syncStatus, activeStep, ignoredJobId]);

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

					{errorMsg && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{errorMsg}
						</Alert>
					)}

					<Box sx={{ minHeight: 300, display: 'flex', flexDirection: 'column' }}>
						{activeStep === 0 && (
							<HandshakeForm 
								onValidated={(c) => { setConfig(c); setActiveStep(1); }} 
								isSystemBusy={syncStatus?.status === 'running'}
							/>
						)}
						{activeStep === 1 && (
							<Box sx={{ width: '100%' }}>
								<SyncControl status={syncStatus || {}} config={config || { url: '', prefix: '', limit: 0 }} />
								<Button 
									sx={{ mt: 3, alignSelf: 'flex-start', textTransform: 'none' }} 
									color="error"
									variant="text" 
									onClick={() => { 
										const currentJobId = (syncStatus as any)?.job_id;
										if (currentJobId) {
											setIgnoredJobId(currentJobId);
											localStorage.setItem('ignoredJobId', currentJobId);
										}
										setConfig(null); 
										setActiveStep(0); 
										setErrorMsg(null);
									}}
								>
									Reset
								</Button>
							</Box>
						)}
						{activeStep === 2 && (
							<Stack spacing={3} alignItems="flex-start" sx={{ mt: 2 }}>
								<Alert severity="success" sx={{ width: '100%', borderRadius: 1 }}>
									Successfully processed {config?.limit} records for <b>{config?.prefix}</b>.
								</Alert>
								<Stack direction="row" spacing={2}>
									<Button variant="contained" size="medium" startIcon={<DashboardIcon />} onClick={() => navigate('/')} sx={{ textTransform: 'none' }}>View Dashboard</Button>
									<Button variant="outlined" size="medium" startIcon={<ReplayIcon />} onClick={() => { 
										const currentJobId = (syncStatus as any)?.job_id;
										if (currentJobId) {
											setIgnoredJobId(currentJobId);
											localStorage.setItem('ignoredJobId', currentJobId);
										}
										setConfig(null); 
										setActiveStep(0); 
										setErrorMsg(null);
									}} sx={{ textTransform: 'none' }}>New Import</Button>
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
