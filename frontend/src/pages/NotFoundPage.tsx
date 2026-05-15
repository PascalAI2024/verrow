import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import HomeIcon from '@mui/icons-material/Home'
import { Box,Button,Container,Paper,Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          textAlign: 'center',
          py: 4
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 6,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 4,
            color: 'white',
            width: '100%',
            maxWidth: 600
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 120, mb: 2, opacity: 0.9 }} />
          
          <Typography 
            variant="h1" 
            sx={{ 
              fontSize: { xs: '6rem', md: '8rem' },
              fontWeight: 'bold',
              mb: 1,
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            404
          </Typography>
          
          <Typography 
            variant="h4" 
            sx={{ 
              mb: 2,
              fontWeight: 500
            }}
          >
            Page Not Found
          </Typography>
          
          <Typography 
            variant="body1" 
            sx={{ 
              mb: 4,
              opacity: 0.95,
              fontSize: '1.1rem'
            }}
          >
            Oops! The page you're looking for doesn't exist or has been moved.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': {
                  bgcolor: 'grey.100'
                },
                px: 3,
                py: 1.5
              }}
            >
              Go Back
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)'
                },
                px: 3,
                py: 1.5
              }}
            >
              Home Page
            </Button>
          </Box>
        </Paper>

        <Box sx={{ mt: 4, color: 'text.secondary' }}>
          <Typography variant="body2">
            Lost? Here are some helpful links:
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 2 }}>
            <Button 
              color="primary" 
              onClick={() => navigate('/upload')}
              sx={{ textTransform: 'none' }}
            >
              Upload Data
            </Button>
            <Button 
              color="primary" 
              onClick={() => navigate('/datasets')}
              sx={{ textTransform: 'none' }}
            >
              View Datasets
            </Button>
            <Button 
              color="primary" 
              onClick={() => navigate('/dashboard')}
              sx={{ textTransform: 'none' }}
            >
              Dashboard
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  )
}

export default NotFoundPage
