import { Box,Button,Stack,Typography } from '@mui/material';
import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  minHeight?: number;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  minHeight = 180,
}) => (
  <Box
    sx={{
      minHeight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      py: 4,
      textAlign: 'center',
    }}
  >
    <Stack spacing={1.5} sx={{ alignItems: 'center', maxWidth: 420 }}>
      {icon && (
        <Box sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: 40 } }}>
          {icon}
        </Box>
      )}
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" size="small" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Stack>
  </Box>
);

export default EmptyState;
