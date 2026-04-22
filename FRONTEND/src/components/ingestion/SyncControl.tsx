import React from 'react';
import { Box, Button, Typography, LinearProgress, Alert, Stack, Paper, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useStartSyncMutation, useStopSyncMutation } from '../../store/services/syncApi';

interface SyncControlProps {
	config: { url: string; prefix: string; limit: number; overwrite?: boolean };
	status: any;
}

const SyncControl: React.FC<SyncControlProps> = ({ config, status }) => {
	const theme = useTheme();
	const [startSync, { isLoading: isStarting, error }] = useStartSyncMutation();
	const [stopSync, { isLoading: isStopping }] = useStopSyncMutation();

	// Automatically show progress if a sync is already running globally
	const isRunning = status?.status === 'running';
	const totalRecords = status?.total || config.limit || 1;
	const processedRecords = status?.processed || 0;
	const progress = (processedRecords / totalRecords) * 100;

	return (
		<Box sx={{ mt: 1 }}>
			<Stack spacing={3}>
				<Box>
					<Typography variant="h6" gutterBottom>Step 2: Data Import</Typography>
					<Typography variant="body2" color="text.secondary">
						Connected to <b>{config.url}</b>. Ready to process <b>{config.limit}</b> records for the dataset <b>{config.prefix}</b>.
					</Typography>
				</Box>
				
				{isRunning ? (
					<Stack spacing={1}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<Typography variant="body2" fontWeight="medium">Importing Records...</Typography>
							<Typography variant="body2" color="primary">{Math.round(progress)}%</Typography>
						</Box>
						<LinearProgress
							variant="determinate"
							value={progress}
							sx={{
								height: 8,
								borderRadius: 4,
								backgroundColor: theme.palette.grey[200],
							}}
						/>
						<Typography variant="caption" color="text.secondary">
							Processed {processedRecords} of {totalRecords} items.
						</Typography>
						<Button
							variant="outlined"
							color="error"
							startIcon={<StopIcon />}
							size="small"
							onClick={() => stopSync()}
							disabled={isStopping}
							sx={{
								mt: 2,
								alignSelf: 'flex-start',
								textTransform: 'none'
							}}
						>
							{isStopping ? 'Stopping...' : 'Stop Import'}
						</Button>
					</Stack>
				) : (
					<Button
						variant="contained"
						color="primary"
						startIcon={<PlayArrowIcon />}
						size="large"
						onClick={() =>
							startSync({ target_url: config.url, dataset_id: config.prefix, total_limit: config.limit, overwrite: config.overwrite })
						}
						disabled={isStarting}
						sx={{
							py: 1.5,
							alignSelf: 'flex-start',
							minWidth: 180,
							textTransform: 'none'
						}}
					>
						{isStarting ? 'Initializing...' : 'Start Import'}
					</Button>
				)}
				{error && (
					<Alert severity="error" variant="outlined" sx={{ borderRadius: 1 }}>
						Synchronization failed to start. Please check terminal logs.
					</Alert>
				)}
			</Stack>
		</Box>
	);
};

export default SyncControl;
