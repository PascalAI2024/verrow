import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
Alert,
Box,
Button,
CircularProgress,
Divider,
IconButton,
List,
ListItem,
ListItemIcon,
ListItemText,
Paper,
Tooltip,
Typography,
} from '@mui/material';
import { useEffect,useState } from 'react';
import { getDataInsights } from '../services/api';

interface DataInsightsProps {
  filters?: Record<string, any>;
  refreshTrigger?: number;
}

export default function DataInsights({ filters = {}, refreshTrigger = 0 }: DataInsightsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<Array<{ field: string; insight: string }>>([]);
  const [recordCount, setRecordCount] = useState(0);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getDataInsights(filters);
      
      // Handle both string[] and object[] formats from the analytics API
      let normalizedInsights: Array<{ field: string; insight: string }> = [];
      
      if (Array.isArray(response.insights)) {
        normalizedInsights = response.insights.map((insight: any) => {
          // If it's already an object with field and insight
          if (typeof insight === 'object' && insight !== null) {
            // Check if it has the expected properties
            const hasField = 'field' in insight;
            const hasInsight = 'insight' in insight;
            
            if (hasField || hasInsight) {
              return {
                field: insight.field || 'General',
                insight: insight.insight || (typeof insight === 'object' ? JSON.stringify(insight) : String(insight))
              };
            } else {
              // Object without expected properties - convert to string
              return {
                field: 'General',
                insight: JSON.stringify(insight)
              };
            }
          }
          // If it's a string, convert to object format
          else if (typeof insight === 'string') {
            return {
              field: 'General',
              insight: insight
            };
          }
          // Fallback for any other type
          else {
            return {
              field: 'General',
              insight: String(insight)
            };
          }
        }).filter(insight => 
          insight.insight && 
          insight.insight !== 'undefined' && 
          insight.insight !== '[object Object]' &&
          insight.field !== 'undefined'
        );
      }
      
      setInsights(normalizedInsights);
      setRecordCount(response.recordCount || 0);
    } catch (err) {
      setError('Failed to load insights. Please try again.');
      console.error('Error fetching insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
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
            Data Insights
          </Typography>
          <Tooltip title="Insights are generated from record patterns when live data is available">
            <IconButton size="small" sx={{ ml: 1 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          size="small"
          onClick={fetchInsights}
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
      ) : insights.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <Typography color="text.secondary" align="center">
            Insights will appear after records are processed.
          </Typography>
        </Box>
      ) : (
        <>
          {recordCount > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Based on analysis of {recordCount} records
            </Typography>
          )}
          
          <List sx={{ flexGrow: 1 }}>
            {insights.map((insight, index) => {
              // Validate insight data to prevent displaying "undefined: undefined"
              const field = insight.field || 'General';
              const text = insight.insight || 'No insight available';
              
              return (
                <ListItem key={index} alignItems="flex-start" sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LightbulbIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={`${field}: ${text}`} />
                </ListItem>
              );
            })}
          </List>
        </>
      )}
    </Paper>
  );
}
