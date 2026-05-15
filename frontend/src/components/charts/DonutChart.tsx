import { Box,Typography } from '@mui/material';

interface DonutChartProps {
  data: number[];
  labels: string[];
  title: string;
  colors?: string[];
}

const DonutChart = ({ 
  data, 
  labels, 
  title, 
  colors = ['#1976d2', '#dc004e', '#ff9800', '#4caf50', '#9c27b0'] 
}: DonutChartProps) => {
  const total = data.reduce((sum, value) => sum + value, 0);
  let startAngle = 0;

  return (
    <Box sx={{ height: '100%', p: 2 }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 40px)' }}>
        <Box sx={{ position: 'relative', width: 150, height: 150 }}>
          {data.map((value, index) => {
            const angle = (value / total) * 360;
            const slice = (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: `conic-gradient(
                    ${colors[index % colors.length]} ${startAngle}deg,
                    ${colors[index % colors.length]} ${startAngle + angle}deg,
                    transparent ${startAngle + angle}deg
                  )`,
                  clipPath: 'circle(50%)',
                  transition: 'all 1s ease-in-out',
                }}
              />
            );
            startAngle += angle;
            return slice;
          })}
          <Box
            sx={{
              position: 'absolute',
              top: '25%',
              left: '25%',
              width: '50%',
              height: '50%',
              borderRadius: '50%',
              backgroundColor: 'background.paper',
            }}
          />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', mt: 2 }}>
        {labels.map((label, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mx: 1, mb: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                backgroundColor: colors[index % colors.length],
                mr: 0.5,
                borderRadius: 1,
              }}
            />
            <Typography variant="caption">{label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default DonutChart;