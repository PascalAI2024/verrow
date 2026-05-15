import InsightsIcon from '@mui/icons-material/Insights';
import {
Alert,
Box,
Card,
CardContent,
Chip,
CircularProgress,
LinearProgress,
Paper,
Table,
TableBody,
TableCell,
TableContainer,
TableHead,
TableRow,
Typography,
} from '@mui/material';
import React,{ useEffect,useState } from 'react';
import { DatasetRelationshipsResponse,getDatasetRelationships } from '../services/api';

interface DatasetRelationshipsProps {
  datasetId: string;
}

const DatasetRelationships: React.FC<DatasetRelationshipsProps> = ({ datasetId }) => {
  const [relationships, setRelationships] = useState<DatasetRelationshipsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDatasetRelationships(datasetId);
        setRelationships(data);
      } catch (err) {
        console.error('Failed to fetch relationships:', err);
        setError(err.message || 'Failed to fetch dataset relationships');
      } finally {
        setLoading(false);
      }
    };

    if (datasetId) {
      fetchRelationships();
    }
  }, [datasetId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!relationships || relationships.totalRelationships === 0) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No relationships found for this dataset. Relationships are automatically detected when files with matching columns are added to a dataset.
      </Alert>
    );
  }

  const getRelationshipTypeColor = (type: string): "primary" | "secondary" | "success" | "warning" | "info" | "error" => {
    switch (type) {
      case 'primary_key':
      case 'foreign_key':
        return 'primary';
      case 'email_match':
        return 'secondary';
      case 'phone_match':
        return 'success';
      case 'name_match':
        return 'info';
      case 'location_match':
        return 'warning';
      default:
        return 'default' as any;
    }
  };

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <InsightsIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Relationship Summary</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <Chip 
              label={`${relationships.totalRelationships} Total Relationships`} 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              label={`${relationships.summary.filesInvolved} Files Connected`} 
              color="secondary" 
              variant="outlined" 
            />
            <Chip 
              label={`${(relationships.summary.averageConfidence * 100).toFixed(1)}% Avg Confidence`} 
              color="success" 
              variant="outlined" 
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Relationship Type Distribution
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {relationships.summary.typeDistribution.map((dist) => (
                <Chip
                  key={dist.type}
                  label={`${dist.type}: ${dist.count}`}
                  size="small"
                  color={getRelationshipTypeColor(dist.type)}
                />
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Source File</TableCell>
              <TableCell>Source Column</TableCell>
              <TableCell>Target File</TableCell>
              <TableCell>Target Column</TableCell>
              <TableCell align="right">Confidence</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {relationships.relationships.map((rel) => (
              <TableRow key={rel.id}>
                <TableCell>
                  <Chip 
                    label={rel.relationshipType} 
                    size="small" 
                    color={getRelationshipTypeColor(rel.relationshipType)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap title={rel.source.fileName}>
                    {rel.source.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {rel.source.recordCount.toLocaleString()} records
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {rel.source.column}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap title={rel.target.fileName}>
                    {rel.target.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {rel.target.recordCount.toLocaleString()} records
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {rel.target.column}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Box sx={{ width: 60, mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={rel.confidence * 100} 
                        color={rel.confidence > 0.8 ? 'success' : rel.confidence > 0.6 ? 'warning' : 'error'}
                      />
                    </Box>
                    <Typography variant="body2">
                      {(rel.confidence * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default DatasetRelationships;
