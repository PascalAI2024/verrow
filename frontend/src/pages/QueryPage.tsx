import {
Box,
Grid,
Typography
} from '@mui/material';
import AnomalyDetection from '../components/AnomalyDetection';
import DataCleaningSuggestions from '../components/DataCleaningSuggestions';
import NaturalLanguageQueryBox from '../components/NaturalLanguageQueryBox';

const QueryPage = () => {
  const refreshTrigger = 0;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Record Analysis
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 2 }}>
        Explore queries, anomalies, and cleanup suggestions once processed records are available.
      </Typography>
      
      <NaturalLanguageQueryBox />
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnomalyDetection refreshTrigger={refreshTrigger} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DataCleaningSuggestions refreshTrigger={refreshTrigger} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default QueryPage;
