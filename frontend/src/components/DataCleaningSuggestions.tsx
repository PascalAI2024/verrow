import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import CodeIcon from '@mui/icons-material/Code';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
Alert,
Box,
Button,
Card,
CardContent,
Chip,
CircularProgress,
Divider,
Grid,
IconButton,
Paper,
Tooltip,
Typography,
} from '@mui/material';
import { useEffect,useState } from 'react';
import { DataCleaningSuggestionsResponse,getDataCleaningSuggestions } from '../services/api';

interface DataCleaningSuggestionsProps {
  filters?: Record<string, any>;
  refreshTrigger?: number;
}

export default function DataCleaningSuggestions({ filters = {}, refreshTrigger = 0 }: DataCleaningSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [suggestions, setSuggestions] = useState<DataCleaningSuggestionsResponse['suggestions']>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const response = await getDataCleaningSuggestions(filters);
      setSuggestions(response.suggestions || []);
      setRecordCount(response.recordCount || 0);
      setMessage(response.message || null);
    } catch (err) {
      setError('Failed to generate cleaning suggestions. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
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
            Data Cleaning Suggestions
          </Typography>
          <Tooltip title="Suggestions are generated from record quality patterns when live data is available">
            <IconButton size="small" sx={{ ml: 1 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          size="small"
          onClick={fetchSuggestions}
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
      ) : suggestions.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <Typography color="text.secondary" align="center">
            No cleaning suggestions available.
          </Typography>
        </Box>
      ) : (
        <>
          {recordCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Based on analysis of {recordCount} records
            </Typography>
          )}
          
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <Grid container spacing={2}>
              {suggestions.map((suggestion, index) => (
                <Grid size={12} key={index}>
                  <Card variant="outlined" sx={{ mb: 1 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                        <CleaningServicesIcon color="primary" sx={{ mr: 1, mt: 0.5 }} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {suggestion.field}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {suggestion.issue}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Suggestion:</strong> {suggestion.suggestion}
                      </Typography>
                      
                      {suggestion.regex && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CodeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Chip 
                            label={suggestion.regex} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontFamily: 'monospace' }}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}
    </Paper>
  );
}
