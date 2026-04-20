import React from 'react';
import { Box, Button, Typography, LinearProgress, Alert, Stack, Paper, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useStartSyncMutation } from '../../store/services/syncApi';

interface SyncControlProps {
	config: { url: string; prefix: string; limit: number };
	status: any;
}

const SyncControl: React.FC<SyncControlProps> = ({ config, status }) => {
	const theme = useTheme();
	const [startSync, { isLoading: isStarting, error }] = useStartSyncMutation();

	const isRunning = status?.status === 'running';
	const progress = (status?.processed || 0) / (status?.total || 1) * 100;

	return (
		<Paper variant="outlined" sx={{ p: 4, borderRadius: 2, bgcolor: theme.palette.background.paper }}>
			<Stack spacing={3}>
				<Typography variant="h2">2. Data Import</Typography>
				<Typography variant="body1">
					Connected to <b>{config.url}</b>. Ready to import <b>{config.limit}</b> records biosocially.
				</Typography>
				{isRunning ? (
					<Box sx={{ px: 2 }}>
						<Typography variant="h3" color="primary" sx={{ mb: 2 }}>
							Import Progress: {Math.round(progress)}%
						</Typography>
						<LinearProgress
							variant="determinate"
							value={progress}
							sx={{
								height: 10,
								borderRadius: 5,
								backgroundColor: theme.palette.divider,
							}}
						/>
					</Box>
				) : (
					<Button
						variant="contained"
						color="secondary"
						startIcon={<PlayArrowIcon />}
						size="large"
						onClick={() =>
							startSync({ target_url: config.url, dataset_id: config.prefix, total_limit: config.limit })
						}
						disabled={isStarting}
						sx={{
							py: 1.5,
							alignSelf: 'center',
							px: 6,
							boxShadow: theme.shadows[2],
						}}
					>
						{isStarting ? 'Initializing...' : 'Start Import'}
					</Button>
				)}
				{error && (
					<Alert severity="error" sx={{ mt: theme.spacing(2) }}>
						Synchronization failed to start.
					</Alert>
				)}
			</Stack>
		</Paper>
	);
};

export default SyncControl;
