import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
Accordion,
AccordionDetails,
AccordionSummary,
Alert,
Box,
Button,
Chip,
CircularProgress,
Divider,
IconButton,
List,
Paper,
Tooltip,
Typography
} from '@mui/material';
import { useEffect,useState } from 'react';
import { DataAnomaliesResponse,getDataAnomalies } from '../services/api';

interface AnomalyDetectionProps {
  filters?: Record<string, any>;
  refreshTrigger?: number;
}

export default function AnomalyDetection({ filters = {}, refreshTrigger = 0 }: AnomalyDetectionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<DataAnomaliesResponse['anomalies']>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const response = await getDataAnomalies(filters);
      setAnomalies(response.anomalies || []);
      setRecordCount(response.recordCount || 0);
      setMessage(response.message || null);
    } catch (err) {
      setError('Failed to detect anomalies. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [JSON.stringify(filters), refreshTrigger]);

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="h2" className="gradient-text" sx={{ fontWeight: 600 }}>
            Anomaly Detection
          </Typography>
          <Tooltip title="Automatically identifies unusual or outlier values in your data">
            <IconButton size="small" sx={{ ml: 1 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          size="small"
          onClick={fetchAnomalies}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : message ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {message}
        </Alert>
      ) : anomalies.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <Typography color="text.secondary" align="center">
            No anomalies detected in your data.
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Found {anomalies.length} anomalies in {recordCount} records
          </Typography>
          
          <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
            {anomalies.map((anomaly, index) => (
              <Accordion key={index} sx={{ mb: 1, boxShadow: 'none', border: '1px solid rgba(0,0,0,0.1)' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningAmberIcon color="warning" sx={{ mr: 1 }} />
                    <Typography>
                      Record {index + 1}: {anomaly.anomalies.length} anomalies detected
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Anomalous Fields:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {anomaly.anomalies.map((item: any, i: number) => (
                        <Chip
                          key={i}
                          label={`${item.field}: ${item.value}`}
                          color="warning"
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Box>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Record Details:
                    </Typography>
                    <Box sx={{ 
                      p: 1, 
                      backgroundColor: 'rgba(0,0,0,0.03)', 
                      borderRadius: 1,
                      maxHeight: 200,
                      overflowY: 'auto',
                    }}>
                      <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(anomaly.record, null, 2)}
                      </pre>
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </List>
        </>
      )}
    </Paper>
  );
}
