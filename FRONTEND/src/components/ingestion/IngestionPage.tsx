import React, { useState } from 'react';
import { Container, Stack, Typography, Box, Paper, Stepper, Step, StepLabel, Button, Alert, useTheme } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReplayIcon from '@mui/icons-material/Replay';
import { useNavigate } from 'react-router-dom';
import HandshakeForm from './HandshakeForm';
import SyncControl from './SyncControl';

const steps = ['Connect', 'Import', 'Analyze'];

const IngestionPage: React.FC = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const [config, setConfig] = useState<{ url: string; prefix: string; limit: number; overwrite?: boolean } | null>(null);
	const [activeStep, setActiveStep] = useState(0);

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
						{activeStep === 0 && (
							<HandshakeForm onValidated={(c) => { setConfig(c); setActiveStep(1); }} />
						)}
						{activeStep === 1 && (
							<Box sx={{ width: '100%' }}>
								<SyncControl status={{}} config={config || { url: '', prefix: '', limit: 0 }} />
								<Button 
									sx={{ mt: 3, alignSelf: 'flex-start', textTransform: 'none' }} 
									variant="text" 
									onClick={() => setActiveStep(2)}
								>
									Skip to Dashboard Setup &rarr;
								</Button>
							</Box>
						)}
						{activeStep === 2 && (
							<Stack spacing={3} alignItems="flex-start" sx={{ mt: 2 }}>
								<Alert severity="success" sx={{ width: '100%', borderRadius: 1 }}>
									Successfully initiated import sequence for <b>{config?.prefix}</b>.
								</Alert>
								<Stack direction="row" spacing={2}>
									<Button variant="contained" size="medium" startIcon={<DashboardIcon />} onClick={() => navigate('/')} sx={{ textTransform: 'none' }}>View Dashboard</Button>
									<Button variant="outlined" size="medium" startIcon={<ReplayIcon />} onClick={() => { setConfig(null); setActiveStep(0); }} sx={{ textTransform: 'none' }}>New Import</Button>
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
