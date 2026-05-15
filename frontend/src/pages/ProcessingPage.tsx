import {
Alert,
Box,
Button,
LinearProgress,
Paper,
Typography,
} from '@mui/material'
import { useEffect,useState } from 'react'
import { useNavigate,useParams } from 'react-router-dom'
import { getJobStatus,JobStatus } from '../services/api'

const ProcessingPage = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (!jobId) return
    
    const fetchJobStatus = async () => {
      try {
        const status = await getJobStatus(jobId)
        setJobStatus(status)
        
        if (status.status === 'completed' || status.status === 'failed' || status.step === 'spacetime-bridge-pending') {
          return
        }
        
        // Otherwise, continue polling
        setTimeout(fetchJobStatus, 2000)
      } catch (err) {
        setError('Failed to fetch job status. Please try again.')
        console.error(err)
      }
    }
    
    fetchJobStatus()
  }, [jobId])
  
  const getStatusText = () => {
    if (!jobStatus) return 'Initializing...'
    
    switch (jobStatus.status) {
      case 'completed':
        return 'Processing completed successfully!'
      case 'failed':
        return 'Processing failed. Please try again.'
      case 'processing':
        if (jobStatus.step === 'spacetime-bridge-pending') {
          return 'Waiting for live record storage'
        }
        return 'Processing data...'
      case 'waiting':
        return 'Waiting to start processing...'
      default:
        return `Status: ${jobStatus.status}`
    }
  }
  
  const handleViewData = () => {
    navigate('/data')
  }
  
  const handleUploadAnother = () => {
    navigate('/upload')
  }
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Processing Data
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 2 }}>
        Verrow is preparing the upload for mapping and live record storage.
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 4, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          {getStatusText()}
        </Typography>
        {jobStatus?.message && (
          <Typography variant="body2" color="text.secondary">
            {jobStatus.message}
          </Typography>
        )}
        
        <Box sx={{ mt: 3, mb: 3 }}>
          <LinearProgress
            variant="determinate"
            value={jobStatus?.progress || 0}
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'right' }}>
            {jobStatus?.progress || 0}%
          </Typography>
        </Box>
        
        {jobStatus?.status === 'completed' && (
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="contained" onClick={handleViewData}>
              View Processed Data
            </Button>
            <Button variant="outlined" onClick={handleUploadAnother}>
              Upload Another File
            </Button>
          </Box>
        )}

        {jobStatus?.step === 'spacetime-bridge-pending' && (
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button variant="contained" onClick={() => navigate('/dashboard')}>
              View Dashboard
            </Button>
            <Button variant="outlined" onClick={handleUploadAnother}>
              Upload Another File
            </Button>
          </Box>
        )}
        
        {jobStatus?.status === 'failed' && (
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <Button variant="contained" onClick={handleUploadAnother}>
              Try Again
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

export default ProcessingPage
