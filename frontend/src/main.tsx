import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider,createTheme } from '@mui/material/styles'
import { QueryClient,QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { OptionalSpacetimeProvider } from './spacetime/OptionalSpacetimeProvider.tsx'

const queryClient = new QueryClient()

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d63',
      light: '#6fb09a',
      dark: '#172026',
    },
    secondary: {
      main: '#c76f4a',
      light: '#e29b7c',
      dark: '#8f452b',
    },
    background: {
      default: '#eef2f1',
      paper: '#ffffff',
    },
    error: {
      main: '#e53e3e',
    },
    warning: {
      main: '#c76f4a',
    },
    success: {
      main: '#2e7d63',
    },
    info: {
      main: '#3e4b4b',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <OptionalSpacetimeProvider>
            <App />
          </OptionalSpacetimeProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
