import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudQueueIcon from '@mui/icons-material/CloudQueue'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import StorageIcon from '@mui/icons-material/Storage'
import TableChartIcon from '@mui/icons-material/TableChart'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
Alert,
Box,
Button,
Card,
CardContent,
Chip,
Dialog,
DialogActions,
DialogContent,
DialogContentText,
DialogTitle,
Grid,
Paper,
Snackbar,
Stack,
Typography,
alpha,
useTheme,
} from '@mui/material'
import { useState } from 'react'
import { Link as RouterLink,useNavigate } from 'react-router-dom'
import { APP_VERSION } from '../constants/version'
import { getSpacetimeConfig } from '../spacetime/config'

const workflowCards = [
  {
    title: 'Upload',
    body: 'Stage CSV files through the Rust ingest API and review sample rows before import.',
    icon: <UploadFileIcon />,
    to: '/upload',
  },
  {
    title: 'Map',
    body: 'Turn inconsistent headers into a standard lead schema with human review.',
    icon: <TableChartIcon />,
    to: '/datasets',
  },
  {
    title: 'Explore',
    body: 'Inspect mapped records, quality signals, and operational history from one workbench.',
    icon: <StorageIcon />,
    to: '/data',
  },
  {
    title: 'Analyze',
    body: 'Track file activity, field coverage, and migration status from the dashboard.',
    icon: <DashboardIcon />,
    to: '/dashboard',
  },
]

const implementationStatus = [
  { label: 'Rust upload API', status: 'Ready', ready: true },
  { label: 'CSV preview', status: 'Ready', ready: true },
  { label: 'Mapping suggestions', status: 'Ready', ready: true },
  { label: 'SpacetimeDB reducer bridge', status: 'In progress', ready: false },
]

const HomePage = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const spacetimeConfig = getSpacetimeConfig()
  const [demoDialogOpen, setDemoDialogOpen] = useState(false)
  const [demoSuccess, setDemoSuccess] = useState(false)

  const handleDemoConfirm = () => {
    setDemoDialogOpen(false)

    setTimeout(() => {
      setDemoSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1200)
    }, 600)
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          border: '1px solid',
          borderColor: 'divider',
          background:
            'linear-gradient(135deg, rgba(46, 125, 99, 0.12) 0%, rgba(238, 242, 241, 0.92) 48%, rgba(199, 111, 74, 0.14) 100%)',
        }}
      >
        <Grid container spacing={3} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
              <Chip size="small" label={APP_VERSION} color="primary" />
              <Chip
                size="small"
                icon={<CloudQueueIcon />}
                label={spacetimeConfig.enabled ? 'SpacetimeDB live sync' : 'Rust ingest API'}
                color={spacetimeConfig.enabled ? 'secondary' : 'default'}
                variant={spacetimeConfig.enabled ? 'filled' : 'outlined'}
              />
              <Chip size="small" label="Vite+ toolchain" variant="outlined" />
            </Stack>

            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
              Verrow Workbench
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680, mb: 3 }}>
              Turn raw lead files into mapped, searchable, quality-scored records you can actually trust.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                component={RouterLink}
                to="/upload"
                size="large"
                startIcon={<UploadFileIcon />}
              >
                Upload CSV
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                to="/dashboard"
                size="large"
                startIcon={<DashboardIcon />}
              >
                Open Dashboard
              </Button>
              <Button
                variant="text"
                size="large"
                startIcon={<PlayArrowIcon />}
                onClick={() => setDemoDialogOpen(true)}
              >
                View Workflow
              </Button>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: alpha(theme.palette.background.paper, 0.8),
              }}
            >
              <Stack spacing={2}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Implementation Status
                  </Typography>
                  <RocketLaunchIcon color="primary" />
                </Stack>
                {implementationStatus.map((item) => (
                  <Stack
                    key={item.label}
                    direction="row"
                    spacing={1.5}
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      {item.ready ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <PendingActionsIcon color="warning" fontSize="small" />
                      )}
                      <Typography variant="body2">{item.label}</Typography>
                    </Stack>
                    <Chip
                      size="small"
                      label={item.status}
                      color={item.ready ? 'success' : 'warning'}
                      variant={item.ready ? 'filled' : 'outlined'}
                    />
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {workflowCards.map((item) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={item.title}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'primary.main',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  }}
                >
                  {item.icon}
                </Box>
                <Typography variant="h6">{item.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  {item.body}
                </Typography>
                <Button component={RouterLink} to={item.to} size="small" sx={{ alignSelf: 'flex-start' }}>
                  Open
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <AutoAwesomeIcon color="secondary" />
              <Typography variant="h6">Open Source Stack</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              React 19, Material UI 9, Vite 8, Vite+, Rust Axum, SpacetimeDB, Docker Compose, and generated
              bindings are presented as one coherent open-source stack, with the reducer bridge called out as the next
              server milestone.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}
            >
              {['React', 'Rust', 'SpacetimeDB', 'Vite+', 'Docker'].map((label) => (
                <Chip key={label} label={label} size="small" variant="outlined" />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Dialog open={demoDialogOpen} onClose={() => setDemoDialogOpen(false)}>
        <DialogTitle>View Workflow</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Open the dashboard to review current status, activity, and data surfaces.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDemoDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDemoConfirm} variant="contained" autoFocus>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={demoSuccess} autoHideDuration={3000} onClose={() => setDemoSuccess(false)}>
        <Alert
          onClose={() => setDemoSuccess(false)}
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{ width: '100%' }}
        >
          Opening dashboard.
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default HomePage
