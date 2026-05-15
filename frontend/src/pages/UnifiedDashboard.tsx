import {
Assessment as AnalyticsIcon,
Dashboard as DashboardIcon,
Storage as DataIcon,
Download as DownloadIcon,
Description as FileIcon,
Insights as InsightsIcon,
Code as JsonIcon,
MoreVert as MoreIcon,
Refresh as RefreshIcon,
Schedule as ScheduleIcon,
Search as SearchIcon,
Settings as SettingsIcon,
CheckCircle as SuccessIcon,
TrendingUp as TrendingUpIcon,
CloudUpload as UploadIcon,
Warning as WarningIcon,
} from '@mui/icons-material';
import {
Alert,
alpha,
Box,
Button,
Card,
CardContent,
Chip,
Divider,
Fade,
Grid,
IconButton,
LinearProgress,
Menu,
MenuItem,
Paper,
Skeleton,
Snackbar,
Tab,
Tabs,
Typography,
useTheme,
} from '@mui/material';
import React,{ useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdvancedFilter from '../components/AdvancedFilter';
import DataCompleteness from '../components/DataCompleteness';
import DataInsights from '../components/DataInsights';
import DataVisualization from '../components/DataVisualization';
import EmptyState from '../components/EmptyState';
import FileManager from '../components/FileManager';
import PipelineStatusChip from '../components/PipelineStatusChip';
import UnifiedUploader from '../components/UnifiedUploader';
import { BarChart,DonutChart } from '../components/charts';
import { getDashboardStats,getRecentActivities,listFiles,queryData } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const UnifiedDashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalRecords: 0,
    processingFiles: 0,
    failedFiles: 0,
    recentActivity: [],
    byIndustry: { data: [], labels: [] },
    byState: { data: [], labels: [] },
    byYear: { data: [], labels: [] },
    employeeDistribution: { data: [], labels: [] },
    dataCompleteness: [],
  });
  const [data, setData] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportProgress, setExportProgress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      setLoadError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch dashboard stats
      const dashboardStats = await getDashboardStats();
      
      // Fetch file statistics
      const filesResult = await listFiles(1, 1000); // Get up to 1000 files for statistics
      
      // Calculate file statistics
      const totalFiles = filesResult.meta.total;
      const processingFiles = filesResult.files.filter(f => 
        f.status === 'processing' || f.status === 'pending_mapping'
      ).length;
      const failedFiles = filesResult.files.filter(f => f.status === 'failed').length;
      
      // Fetch recent activities from API
      const activitiesResult = await getRecentActivities({ limit: 10 });
      const recentActivity = activitiesResult.data.map(activity => {
        const uploadTime = new Date(activity.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - uploadTime.getTime();
        const minutesAgo = Math.floor(timeDiff / 60000);
        
        let timeString = '';
        if (minutesAgo < 60) {
          timeString = `${minutesAgo} mins ago`;
        } else if (minutesAgo < 1440) {
          const hoursAgo = Math.floor(minutesAgo / 60);
          timeString = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
        } else {
          const daysAgo = Math.floor(minutesAgo / 1440);
          timeString = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
        }
        
        // Map activity actions to user-friendly descriptions
        const actionMap = {
          'upload_started': 'File upload started',
          'upload_completed': 'File uploaded',
          'upload_failed': 'File upload failed',
          'processing_started': 'Processing started',
          'processing_completed': 'Processing completed',
          'processing_failed': 'Processing failed',
          'mapping_confirmed': 'Column mapping confirmed',
          'quality_analysis_completed': 'Quality analysis completed',
          'merge_completed': 'Files merged',
          'export_completed': 'Data exported',
        };
        
        return {
          time: timeString,
          action: actionMap[activity.action] || activity.action,
          file: activity.details?.fileName || activity.entityId || 'Unknown',
          status: activity.status === 'success' ? 'success' : activity.status === 'error' ? 'error' : 'info',
        };
      });
      
      // Fetch sample data for visualization
      const dataResult = await queryData(1, 100);
      
      // Extract fields from data
      if (dataResult.data.length > 0) {
        const sampleRecord = dataResult.data[0];
        const extractedFields = Object.keys(sampleRecord)
          .filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'source_file')
          .map(key => ({
            name: key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
            dataType: typeof sampleRecord[key] === 'number' ? 'number' : 'string',
          }));
        setFields(extractedFields);
      }
      
      // Calculate data completeness for all target columns
      const dataCompleteness = [];
      if (dataResult.data.length > 0) {
        // Define all target columns with their labels
        const targetColumns = [
          { field: 'business_name', label: 'Business Name' },
          { field: 'first_name', label: 'First Name' },
          { field: 'last_name', label: 'Last Name' },
          { field: 'contact_name', label: 'Contact Name' },
          { field: 'contact_title', label: 'Contact Title' },
          { field: 'email', label: 'Email' },
          { field: 'phone', label: 'Phone' },
          { field: 'address', label: 'Address' },
          { field: 'city', label: 'City' },
          { field: 'state', label: 'State' },
          { field: 'zip_code', label: 'Zip Code' },
          { field: 'country', label: 'Country' },
          { field: 'website', label: 'Website' },
          { field: 'industry', label: 'Industry' },
          { field: 'employee_count', label: 'Employee Count' },
          { field: 'annual_revenue', label: 'Annual Revenue' },
          { field: 'founded_year', label: 'Founded Year' },
          { field: 'description', label: 'Description' },
          { field: 'additional_emails', label: 'Additional Emails' },
          { field: 'additional_phones', label: 'Additional Phones' },
        ];
        
        targetColumns.forEach((col) => {
          const nonNullCount = dataResult.data.filter(record => 
            record[col.field] !== null && 
            record[col.field] !== undefined && 
            record[col.field] !== '' &&
            record[col.field] !== 0
          ).length;
          const completenessPercent = Math.round((nonNullCount / dataResult.data.length) * 100);
          
          dataCompleteness.push({
            label: col.label,
            value: completenessPercent,
          });
        });
        
        // Sort by completeness percentage (highest to lowest)
        dataCompleteness.sort((a, b) => b.value - a.value);
      }

      setStats({
        totalFiles,
        totalRecords: dashboardStats.totalRecords,
        processingFiles,
        failedFiles,
        recentActivity,
        byIndustry: dashboardStats.byIndustry || { data: [], labels: [] },
        byState: dashboardStats.byState || { data: [], labels: [] },
        byYear: dashboardStats.byFoundedYear || { data: [], labels: [] },
        employeeDistribution: dashboardStats.byEmployeeCount || { data: [], labels: [] },
        dataCompleteness: dataCompleteness.length > 0 ? dataCompleteness : [],
      });
      
      setData(dataResult.data);
      
      // Trigger refresh for child components
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoadError('Dashboard data is temporarily unavailable.');
      // Set default values on error
      setStats({
        totalFiles: 0,
        totalRecords: 0,
        processingFiles: 0,
        failedFiles: 0,
        recentActivity: [],
        byIndustry: { data: [], labels: [] },
        byState: { data: [], labels: [] },
        byYear: { data: [], labels: [] },
        employeeDistribution: { data: [], labels: [] },
        dataCompleteness: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFileUploadComplete = (completedFiles: any[]) => {
    // Show success notification
    setSnackbar({
      open: true,
      message: `Successfully uploaded ${completedFiles.length} file${completedFiles.length > 1 ? 's' : ''}`,
      severity: 'success',
    });
    
    // Refresh dashboard data immediately
    setTimeout(() => {
      fetchDashboardData();
    }, 1000);
  };

  const handleFilterApply = (filter: any) => {
    setAppliedFilters(filter);
    // Refresh data with new filters
    fetchDashboardData();
  };

  const handleExportDashboard = async (format: 'csv' | 'json') => {
    try {
      setExportProgress(true);
      const dashboardData = {
        exportDate: new Date().toISOString(),
        summary: {
          totalFiles: stats.totalFiles,
          totalRecords: stats.totalRecords,
          processingFiles: stats.processingFiles,
          failedFiles: stats.failedFiles,
        },
        recentActivity: stats.recentActivity,
        dataDistribution: {
          byIndustry: {
            labels: stats.byIndustry.labels,
            values: stats.byIndustry.data,
          },
          byState: {
            labels: stats.byState.labels,
            values: stats.byState.data,
          },
          byFoundingYear: {
            labels: stats.byYear.labels,
            values: stats.byYear.data,
          },
          byEmployeeCount: {
            labels: stats.employeeDistribution.labels,
            values: stats.employeeDistribution.data,
          },
        },
        dataCompleteness: stats.dataCompleteness,
        sampleData: data.slice(0, 100), // Include first 100 records as sample
      };

      if (format === 'json') {
        // Export as JSON
        const jsonString = JSON.stringify(dashboardData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Export as CSV
        const csvRows = [];
        
        // Add header
        csvRows.push('Dashboard Export - ' + new Date().toLocaleString());
        csvRows.push('');
        
        // Summary section
        csvRows.push('SUMMARY');
        csvRows.push('Metric,Value');
        csvRows.push(`Total Files,${dashboardData.summary.totalFiles}`);
        csvRows.push(`Total Records,${dashboardData.summary.totalRecords}`);
        csvRows.push(`Processing Files,${dashboardData.summary.processingFiles}`);
        csvRows.push(`Failed Files,${dashboardData.summary.failedFiles}`);
        csvRows.push('');
        
        // Recent Activity
        csvRows.push('RECENT ACTIVITY');
        csvRows.push('Time,Action,File,Status');
        dashboardData.recentActivity.forEach(activity => {
          csvRows.push(`"${activity.time}","${activity.action}","${activity.file}","${activity.status}"`);
        });
        csvRows.push('');
        
        // Data Distribution - Industry
        if (stats.byIndustry.labels.length > 0) {
          csvRows.push('BUSINESSES BY INDUSTRY');
          csvRows.push('Industry,Count');
          stats.byIndustry.labels.forEach((label, index) => {
            csvRows.push(`"${label}",${stats.byIndustry.data[index]}`);
          });
        }
        csvRows.push('');
        
        // Data Distribution - State
        if (stats.byState.labels.length > 0) {
          csvRows.push('BUSINESSES BY STATE');
          csvRows.push('State,Count');
          stats.byState.labels.forEach((label, index) => {
            csvRows.push(`"${label}",${stats.byState.data[index]}`);
          });
        }
        csvRows.push('');
        
        // Data Completeness
        csvRows.push('DATA COMPLETENESS');
        csvRows.push('Field,Completeness %');
        dashboardData.dataCompleteness.forEach(item => {
          csvRows.push(`"${item.label}",${item.value}`);
        });
        csvRows.push('');
        
        // Sample Data (if available)
        if (data.length > 0) {
          csvRows.push('SAMPLE DATA (First 100 Records)');
          const headers = Object.keys(data[0]).filter(key => key !== 'id');
          csvRows.push(headers.map(h => `"${h}"`).join(','));
          
          data.slice(0, 100).forEach(record => {
            const row = headers.map(header => {
              const value = record[header];
              if (value === null || value === undefined) return '""';
              if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return `"${value}"`;
            });
            csvRows.push(row.join(','));
          });
        }
        
        // Create and download CSV
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      // Close export menu
      setExportMenuAnchor(null);
      setMenuAnchor(null);
      
      // Show success feedback
      setSnackbar({
        open: true,
        message: `Dashboard exported successfully as ${format.toUpperCase()}`,
        severity: 'success',
      });
      setExportProgress(false);
    } catch (error) {
      console.error('Export failed:', error);
      setSnackbar({
        open: true,
        message: 'Failed to export dashboard data. Please try again.',
        severity: 'error',
      });
      setExportProgress(false);
    }
  };

  const statCards = [
    {
      title: 'Total Files',
      value: stats.totalFiles,
      icon: <DataIcon />,
      color: theme.palette.primary.main,
      trend: stats.totalFiles > 0 ? `${stats.totalFiles} uploaded` : 'No files yet',
    },
    {
      title: 'Total Records',
      value: stats.totalRecords.toLocaleString(),
      icon: <TrendingUpIcon />,
      color: theme.palette.success.main,
      trend: stats.totalRecords > 0 ? 'Data processed' : 'No data yet',
    },
    {
      title: 'Processing',
      value: stats.processingFiles,
      icon: <ScheduleIcon />,
      color: theme.palette.info.main,
      badge: stats.processingFiles > 0 ? 'Active' : null,
    },
    {
      title: 'Failed Files',
      value: stats.failedFiles,
      icon: <WarningIcon />,
      color: theme.palette.error.main,
      badge: stats.failedFiles > 0 ? 'Attention' : null,
    },
  ];

  return (
    <Box
      sx={{
        '@keyframes spin': {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg)',
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DashboardIcon /> Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Operations view for uploads, records, quality, and live pipeline health.
            </Typography>
            <PipelineStatusChip />
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setActiveTab(1)}
          >
            Upload Data
          </Button>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreIcon />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={() => navigate('/settings')}>
              <SettingsIcon sx={{ mr: 1 }} /> Settings
            </MenuItem>
            <MenuItem onClick={() => fetchDashboardData(true)} disabled={refreshing}>
              <RefreshIcon sx={{ mr: 1, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> 
              {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
            </MenuItem>
            <Divider />
            <MenuItem onClick={(e) => setExportMenuAnchor(e.currentTarget)}>
              <DownloadIcon sx={{ mr: 1 }} /> Export Dashboard
            </MenuItem>
          </Menu>
          <Menu
            anchorEl={exportMenuAnchor}
            open={Boolean(exportMenuAnchor)}
            onClose={() => setExportMenuAnchor(null)}
          >
            <MenuItem onClick={() => handleExportDashboard('csv')}>
              <FileIcon sx={{ mr: 1 }} /> Export as CSV
            </MenuItem>
            <MenuItem onClick={() => handleExportDashboard('json')}>
              <JsonIcon sx={{ mr: 1 }} /> Export as JSON
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {loadError && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => fetchDashboardData(true)}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Fade in timeout={300 + index * 100}>
              <Card
                sx={{
                  position: 'relative',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
                        {stat.value}
                      </Typography>
                      {stat.trend && (
                        <Typography variant="caption" color="success.main">
                          {stat.trend}
                        </Typography>
                      )}
                    </Box>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: alpha(stat.color, 0.1),
                        color: stat.color,
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Box>
                  {stat.badge && (
                    <Chip
                      label={stat.badge}
                      size="small"
                      color={stat.title === 'Failed Files' ? 'error' : 'info'}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab label="Overview" icon={<DashboardIcon />} iconPosition="start" />
            <Tab label="Upload & Manage" icon={<UploadIcon />} iconPosition="start" />
            <Tab label="Data Explorer" icon={<SearchIcon />} iconPosition="start" />
            <Tab label="Analytics" icon={<AnalyticsIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {/* Recent Activity */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, height: '100%', maxHeight: 400, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom sx={{ flex: '0 0 auto' }}>
                  Recent Activity
                </Typography>
                <Box 
                  sx={{ 
                    mt: 2,
                    flex: '1 1 auto',
                    overflowY: 'auto',
                    maxHeight: 320,
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#888',
                      borderRadius: '3px',
                      '&:hover': {
                        background: '#555',
                      },
                    },
                  }}
                >
                  {stats.recentActivity.length === 0 ? (
                    <EmptyState
                      icon={<ScheduleIcon />}
                      title="No recent activity"
                      description="Uploads and processing updates will appear here as they run."
                      minHeight={240}
                    />
                  ) : (
                    stats.recentActivity.map((activity, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1,
                        px: 1,
                        borderBottom: index < stats.recentActivity.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <Box sx={{ flexShrink: 0 }}>
                        {activity.status === 'success' ? (
                          <SuccessIcon color="success" fontSize="small" />
                        ) : (
                          <WarningIcon color="error" fontSize="small" />
                        )}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                          {activity.action}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {activity.file} - {activity.time}
                        </Typography>
                      </Box>
                    </Box>
                    ))
                  )}
                </Box>
              </Paper>
            </Grid>

            {/* Quick Insights */}
            <Grid size={{ xs: 12, md: 6 }}>
              <DataInsights refreshTrigger={refreshTrigger} />
            </Grid>

            {/* Data Completeness */}
            <Grid size={{ xs: 12, md: 8 }}>
              {stats.dataCompleteness.length > 0 ? (
                <DataCompleteness 
                  items={stats.dataCompleteness}
                />
              ) : (
                <Paper sx={{ p: 3, height: '100%' }}>
                  <EmptyState
                    icon={<InsightsIcon />}
                    title="No completeness data yet"
                    description="Completed records will unlock field coverage and quality signals."
                  />
                </Paper>
              )}
            </Grid>

            {/* File Manager Preview */}
            <Grid size={12}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Your Files</Typography>
                  <Button size="small" onClick={() => setActiveTab(1)}>
                    View All Files
                  </Button>
                </Box>
                <FileManager previewMode={true} previewLimit={5} />
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Upload & Manage Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Batch Upload
                </Typography>
                <UnifiedUploader onUploadComplete={handleFileUploadComplete} />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  File Manager
                </Typography>
                <FileManager multiSelect />
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Data Explorer Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <AdvancedFilter
                fields={fields}
                onApplyFilter={handleFilterApply}
                onClearFilter={() => {}}
              />
            </Grid>
            {data.length > 0 && (
              <Grid size={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Data Preview
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Showing {data.length} records. Use filters above to refine your search.
                  </Alert>
                  {/* Add data table component here */}
                </Paper>
              </Grid>
            )}
            {!loading && data.length === 0 && (
              <Grid size={12}>
                <Paper sx={{ p: 3 }}>
                  <EmptyState
                    icon={<DataIcon />}
                    title="No records to explore"
                    description="Once a CSV finishes processing, the first records will show here."
                    actionLabel="Upload Data"
                    onAction={() => setActiveTab(1)}
                  />
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            {/* Existing Data Visualization */}
            <Grid size={12}>
              <DataVisualization
                data={data}
                fields={fields}
                onRefresh={fetchDashboardData}
                filters={appliedFilters}
              />
            </Grid>
            
            {/* Distribution Charts */}
            <Grid size={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                Data Distribution Analysis
              </Typography>
            </Grid>
            
            {stats.byIndustry.data.length === 0 && stats.byState.data.length === 0 && stats.byYear.data.length === 0 && stats.employeeDistribution.data.length === 0 ? (
              <Grid size={12}>
                <Paper sx={{ p: 3 }}>
                  <EmptyState
                    icon={<AnalyticsIcon />}
                    title="Analytics waiting for processed data"
                    description="Distribution charts populate after records are available."
                    minHeight={220}
                  />
                </Paper>
              </Grid>
            ) : (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ height: 350, p: 2 }} className="card-gradient">
                    <BarChart
                      data={stats.byIndustry.data}
                      labels={stats.byIndustry.labels}
                      title="Businesses by Industry"
                      color="#3a7bd5"
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ height: 350, p: 2 }} className="card-gradient">
                    <DonutChart
                      data={stats.byState.data}
                      labels={stats.byState.labels}
                      title="Businesses by State"
                      colors={['#3a7bd5', '#00d2ff', '#00c9b7', '#4caf50', '#9c27b0']}
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ height: 350, p: 2 }} className="card-gradient">
                    <BarChart
                      data={stats.byYear.data}
                      labels={stats.byYear.labels}
                      title="Businesses by Founding Decade"
                      color="#00c9b7"
                    />
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ height: 350, p: 2 }} className="card-gradient">
                    <BarChart
                      data={stats.employeeDistribution.data}
                      labels={stats.employeeDistribution.labels}
                      title="Employee Count Distribution"
                      color="#00d2ff"
                    />
                  </Paper>
                </Grid>
              </>
            )}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha(theme.palette.background.default, 0.8),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Skeleton variant="rounded" width={220} height={10} sx={{ mb: 2 }} />
            <LinearProgress sx={{ mb: 2, width: 220 }} />
            <Typography>Loading dashboard...</Typography>
          </Paper>
        </Box>
      )}

      {/* Export Progress Overlay */}
      {exportProgress && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha(theme.palette.background.default, 0.8),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <LinearProgress sx={{ mb: 2, width: 200 }} />
            <Typography>Exporting dashboard data...</Typography>
          </Paper>
        </Box>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UnifiedDashboard;
