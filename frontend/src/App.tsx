import { Box,LinearProgress } from '@mui/material'
import { lazy,Suspense } from 'react'
import { Navigate,Route,Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { NotificationProvider } from './contexts/NotificationContext'

const HomePage = lazy(() => import('./pages/HomePage'))
const NewUploadPage = lazy(() => import('./pages/NewUploadPage'))
const DatasetsPage = lazy(() => import('./pages/DatasetsPage'))
const DatasetDetailPage = lazy(() => import('./pages/DatasetDetailPage'))
const MappingPage = lazy(() => import('./pages/MappingPage'))
const ProcessingPage = lazy(() => import('./pages/ProcessingPage'))
const DataPage = lazy(() => import('./pages/DataPage'))
const UnifiedDashboard = lazy(() => import('./pages/UnifiedDashboard'))
const QueryPage = lazy(() => import('./pages/QueryPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const RouteFallback = () => (
  <Box sx={{ pt: 2 }}>
    <LinearProgress />
  </Box>
)

function App() {
  return (
    <NotificationProvider>
      <Box sx={{ height: '100%' }}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="upload" element={<NewUploadPage />} />
              <Route path="datasets" element={<DatasetsPage />} />
              <Route path="datasets/:id" element={<DatasetDetailPage />} />
              <Route path="mapping/:fileId" element={<MappingPage />} />
              <Route path="processing/:jobId" element={<ProcessingPage />} />
              <Route path="data" element={<DataPage />} />
              <Route path="dashboard" element={<UnifiedDashboard />} />
              <Route path="query" element={<QueryPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </Box>
    </NotificationProvider>
  )
}

export default App
