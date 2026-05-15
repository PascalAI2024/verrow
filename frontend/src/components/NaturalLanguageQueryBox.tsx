import CodeIcon from '@mui/icons-material/Code';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
Alert,
Box,
Button,
Chip,
CircularProgress,
Divider,
IconButton,
Paper,
Table,
TableBody,
TableCell,
TableContainer,
TableHead,
TableRow,
TextField,
Tooltip,
Typography,
} from '@mui/material';
import { useState } from 'react';
import { naturalLanguageQuery,NaturalLanguageQueryResponse } from '../services/api';

const examples = [
  'Show me all businesses in California with more than 100 employees',
  'Find technology companies founded after 2010',
  'List the top 5 businesses by annual revenue',
  'Count the number of businesses in each industry',
  'Show me businesses with missing email addresses',
];

export default function NaturalLanguageQueryBox() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setExplanation(null);
    setSqlQuery(null);

    try {
      const response = await naturalLanguageQuery(query);
      
      if ((response as NaturalLanguageQueryResponse).error) {
          setError((response as NaturalLanguageQueryResponse).error);
      } else {
        setResults(response.results || []);
        setExplanation(response.explanation || null);
        setSqlQuery(response.sqlQuery || null);
      }
    } catch (err) {
      setError('Failed to process your query. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          borderRadius: 2,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2" className="gradient-text" sx={{ fontWeight: 600 }}>
            Ask Your Data
          </Typography>
          <Tooltip title="Plain-English queries run when the live record query bridge is enabled.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Ask a question about your data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ 
                mr: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                }
              }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading || !query.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              sx={{ 
                borderRadius: '8px',
                px: 3,
              }}
            >
              Ask
            </Button>
          </Box>
        </form>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Try asking:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {examples.map((example, index) => (
              <Chip
                key={index}
                label={example}
                onClick={() => handleExampleClick(example)}
                variant="outlined"
                size="small"
                sx={{ 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(58, 123, 213, 0.1)',
                  }
                }}
              />
            ))}
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {explanation && (
          <Box sx={{ mt: 2, mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              {explanation}
            </Alert>
            
            {sqlQuery && (
              <Box>
                <Button
                  startIcon={<CodeIcon />}
                  size="small"
                  onClick={() => setShowSql(!showSql)}
                  sx={{ mb: 1 }}
                >
                  {showSql ? 'Hide SQL Query' : 'Show SQL Query'}
                </Button>
                
                {showSql && (
                  <Paper 
                    sx={{ 
                      p: 2, 
                      backgroundColor: '#f5f5f5',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      overflowX: 'auto',
                    }}
                  >
                    {sqlQuery}
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        )}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {results.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Results ({results.length})
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxHeight: 400, overflowY: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(results[0]).map((key) => (
                      <TableCell key={key} sx={{ fontWeight: 'bold' }}>
                        {key}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((row, rowIndex) => (
                    <TableRow key={rowIndex} hover>
                      {Object.values(row).map((value: any, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {value === null || value === undefined
                            ? '—'
                            : typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        
        {!loading && results.length === 0 && !error && query && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No results found for your query.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
