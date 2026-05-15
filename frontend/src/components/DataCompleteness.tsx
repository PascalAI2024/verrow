import {
Box,
Card,
CardContent,
Typography,
} from '@mui/material';
import React from 'react';

// Type for individual completeness items
export interface CompletenessItem {
  label: string;
  value: number; // 0-100 percentage
}

// Props for the DataCompleteness component
export interface DataCompletenessProps {
  title?: string;
  items: CompletenessItem[];
  className?: string;
}

// Helper component for linear progress with label
const LinearProgressWithLabel: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  // Determine color based on completeness percentage
  const getProgressColor = (value: number) => {
    if (value >= 80) return '#4caf50'; // Green for high completeness
    if (value >= 50) return '#ff9800'; // Orange for medium completeness
    return '#f44336'; // Red for low completeness
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75, px: 1 }}>
      <Box sx={{ width: 140, minWidth: 140, mr: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
          {label}
        </Typography>
      </Box>
      <Box sx={{ width: '100%', mr: 2 }}>
        <Box
          sx={{
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${getProgressColor(value)} ${value}%, #e0e0e0 ${value}%)`,
            transition: 'background 0.5s ease-in-out',
          }}
        />
      </Box>
      <Box sx={{ minWidth: 45 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            fontWeight: 500,
            fontSize: '0.875rem',
            color: getProgressColor(value)
          }}
        >
          {`${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>
  );
};

// Main DataCompleteness component
const DataCompleteness: React.FC<DataCompletenessProps> = ({ 
  title = 'Data Completeness',
  items,
  className = 'card-gradient'
}) => {
  // Calculate average completeness
  const averageCompleteness = items.length > 0
    ? Math.round(items.reduce((sum, item) => sum + item.value, 0) / items.length)
    : 0;

  return (
    <Card className={className} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1, flex: '0 0 auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
          <Typography 
            variant="h5" 
            gutterBottom 
            className="gradient-text" 
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontStyle: 'italic' }}
          >
            Average: {averageCompleteness}%
          </Typography>
        </Box>
        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ display: 'block', mb: 1 }}
        >
          * Based on sample of first 100 records
        </Typography>
      </CardContent>
      
      <Box 
        sx={{ 
          flex: '1 1 auto',
          overflowY: 'auto',
          maxHeight: 280, // Fixed maximum height for the scrollable area
          px: 2,
          pb: 2,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '3px',
            '&:hover': {
              background: '#555',
            },
          },
        }}
      >
        {items.length > 0 ? (
          items.map((item, index) => (
            <LinearProgressWithLabel 
              key={index}
              value={item.value} 
              label={item.label} 
            />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
            No completeness data available
          </Typography>
        )}
      </Box>
    </Card>
  );
};

export default DataCompleteness;