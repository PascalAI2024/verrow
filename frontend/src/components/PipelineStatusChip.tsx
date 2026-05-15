import BoltIcon from '@mui/icons-material/Bolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import SyncIcon from '@mui/icons-material/Sync';
import { Chip,Stack,Tooltip } from '@mui/material';
import React from 'react';
import { useSpacetimeConnection } from '../hooks/useSpacetimeConnection';
import { SpacetimeConnectionStatus } from '../spacetime/client';

const liveLabelByStatus: Record<SpacetimeConnectionStatus, string> = {
  disabled: 'Live sync off',
  idle: 'Live sync idle',
  connecting: 'Sync connecting',
  connected: 'SpacetimeDB live',
  reconnecting: 'Sync reconnecting',
  disconnected: 'Sync offline',
  error: 'Sync error',
};

const liveColorByStatus: Record<SpacetimeConnectionStatus, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  disabled: 'default',
  idle: 'default',
  connecting: 'info',
  connected: 'success',
  reconnecting: 'warning',
  disconnected: 'warning',
  error: 'error',
};

const liveIconByStatus = (status: SpacetimeConnectionStatus) => {
  if (status === 'connected') return <CheckCircleIcon />;
  if (status === 'error') return <ErrorOutlineIcon />;
  if (status === 'connecting' || status === 'reconnecting') return <SyncIcon />;
  return <BoltIcon />;
};

interface PipelineStatusChipProps {
  size?: 'small' | 'medium';
}

const PipelineStatusChip: React.FC<PipelineStatusChipProps> = ({
  size = 'small',
}) => {
  const { enabled, status, error } = useSpacetimeConnection(false);
  const liveStatus = enabled ? status : 'disabled';

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <Tooltip title={error?.message || 'SpacetimeDB live subscriptions'}>
        <Chip
          size={size}
          icon={liveIconByStatus(liveStatus)}
          label={liveLabelByStatus[liveStatus]}
          color={liveColorByStatus[liveStatus]}
          variant={liveStatus === 'connected' ? 'filled' : 'outlined'}
        />
      </Tooltip>
    </Stack>
  );
};

export default PipelineStatusChip;
