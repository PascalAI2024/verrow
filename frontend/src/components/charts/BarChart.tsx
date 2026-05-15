import { Box,Typography } from '@mui/material';

interface BarChartProps {
  data: number[];
  labels: string[];
  title: string;
  color?: string;
}

const BarChart = ({ data, labels, title, color = '#1976d2' }: BarChartProps) => {
  const max = Math.max(...data);

  return (
    <Box sx={{ height: '100%', p: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' }}>
        <Box sx={{ display: 'flex', height: '100%', alignItems: 'flex-end', mt: 2 }}>
          {data.map((value, index) => (
            <Box
              key={index}
              sx={{
                flex: 1,
                mx: 0.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: `${(value / max) * 100}%`,
                  backgroundColor: color,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  transition: 'height 1s ease-in-out',
                  minHeight: 10,
                }}
              />
              <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', fontSize: '0.7rem' }}>
                {labels[index]}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default BarChart;
