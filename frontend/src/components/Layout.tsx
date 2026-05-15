import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CloseIcon from '@mui/icons-material/Close'
import DashboardIcon from '@mui/icons-material/Dashboard'
import FolderIcon from '@mui/icons-material/Folder'
import HomeIcon from '@mui/icons-material/Home'
import MenuIcon from '@mui/icons-material/Menu'
import SettingsIcon from '@mui/icons-material/Settings'
import StorageIcon from '@mui/icons-material/Storage'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
AppBar,
Box,
Button,
Container,
Divider,
Drawer,
IconButton,
List,
ListItemButton,
ListItemIcon,
ListItemText,
Toolbar,
Typography,
useMediaQuery,
useTheme
} from '@mui/material'
import { useState } from 'react'
import { Outlet,Link as RouterLink,useLocation } from 'react-router-dom'
import { APP_VERSION } from '../constants/version'

const Layout = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navItems = [
    { text: 'Home', path: '/', icon: <HomeIcon /> },
    { text: 'Upload', path: '/upload', icon: <UploadFileIcon /> },
    { text: 'Datasets', path: '/datasets', icon: <FolderIcon /> },
    { text: 'Data', path: '/data', icon: <StorageIcon /> },
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { text: 'Analysis', path: '/query', icon: <AutoFixHighIcon /> },
    { text: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  ]

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen)
  }

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.svg" alt="Verrow Logo" style={{ height: 32, marginRight: 8 }} />
          <Box sx={{ position: 'relative' }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                textShadow: '0 0 1px rgba(255,255,255,0.7), 0 0 2px rgba(255,255,255,0.7)',
                position: 'relative',
                paddingRight: '40px' // Make room for the version tag
              }}
            >
              Verrow
            </Typography>
            <Typography
              component="span"
              variant="caption"
              sx={{
                position: 'absolute',
                top: '50%',
                right: 0,
                transform: 'translateY(-50%)',
                fontWeight: 500,
                color: 'white',
                backgroundColor: 'secondary.main',
                padding: '1px 4px',
                borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                fontSize: '0.7rem'
              }}
            >
              {APP_VERSION}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={toggleDrawer}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.text}
            component={RouterLink}
            to={item.path}
            selected={isActive(item.path)}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.18)',
                },
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={toggleDrawer}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img src="/logo.svg" alt="Verrow Logo" style={{ height: 40, marginRight: 12 }} />
            <Box sx={{ position: 'relative', display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                fontWeight: 600,
                color: 'primary.main',
                textShadow: '0 0 1px rgba(255,255,255,0.7), 0 0 2px rgba(255,255,255,0.7)',
                  position: 'relative',
                  paddingRight: '40px' // Make room for the version tag
                }}
              >
                Verrow
              </Typography>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  position: 'absolute',
                  top: '50%',
                  right: 0,
                  transform: 'translateY(-50%)',
                fontWeight: 500,
                color: 'white',
                backgroundColor: 'secondary.main',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  fontSize: '0.7rem'
                }}
              >
                {APP_VERSION}
              </Typography>
            </Box>
          </Box>
          {!isMobile && navItems.map((item) => (
            <Button
              key={item.text}
              color="inherit"
              component={RouterLink}
              to={item.path}
              sx={{
                mx: 1,
                backgroundColor: isActive(item.path) ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive(item.path)
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'rgba(255, 255, 255, 0.08)',
                },
              }}
              startIcon={item.icon}
            >
              {item.text}
            </Button>
          ))}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        {drawer}
      </Drawer>

      <Container sx={{ flexGrow: 1, py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}

export default Layout
