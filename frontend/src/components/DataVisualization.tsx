import { closestCenter,DndContext,KeyboardSensor,PointerSensor,useSensor,useSensors } from '@dnd-kit/core';
import { SortableContext,sortableKeyboardCoordinates,useSortable,verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
Add as AddIcon,
Close as CloseIcon,
Download as DownloadIcon,
DragIndicator as DragIcon,
Refresh as RefreshIcon,
Settings as SettingsIcon
} from '@mui/icons-material';
import {
alpha,
Box,
Button,
CircularProgress,
Dialog,
DialogContent,
DialogTitle,
Divider,
FormControl,
FormControlLabel,
FormGroup,
Grid,
IconButton,
InputLabel,
MenuItem,
Paper,
Select,
Slider,
Switch,
TextField,
Tooltip,
Typography,
useTheme
} from '@mui/material';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import {
Bar,
BarChart,
CartesianGrid,
Cell,
LabelList,
Legend,
Line,
LineChart,
Pie,
PieChart,
Tooltip as RechartsTooltip,
ResponsiveContainer,
Scatter,
ScatterChart,
XAxis,
YAxis,
} from 'recharts';
import { getDataAggregate,getDataDistribution,getDataTimeseries } from '../services/api';

interface ChartWidget {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table' | 'metric';
  title: string;
  dataField: string;
  groupBy?: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: any[];
  config: {
    colors?: string[];
    showLegend?: boolean;
    showLabels?: boolean;
    showGrid?: boolean;
    animate?: boolean;
    sortBy?: 'value' | 'label';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
  };
  size: 'small' | 'medium' | 'large' | 'full';
}

interface DataVisualizationProps {
  data: any[];
  fields: Array<{
    name: string;
    label: string;
    dataType: 'string' | 'number' | 'date' | 'boolean';
  }>;
  onRefresh?: () => void;
  filters?: Record<string, any>;
}

const SortableWidget: React.FC<{ 
  widget: ChartWidget; 
  data: any[]; 
  onEdit: () => void; 
  onRemove: () => void;
  filters?: Record<string, any>;
  refreshTrigger?: number;
}> = ({
  widget,
  data,
  onEdit,
  onRemove,
  filters = {},
  refreshTrigger = 0,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id });
  const theme = useTheme();
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'small':
        return { xs: 12, sm: 6, md: 4 };
      case 'medium':
        return { xs: 12, sm: 12, md: 6 };
      case 'large':
        return { xs: 12, sm: 12, md: 8 };
      case 'full':
        return { xs: 12 };
      default:
        return { xs: 12, sm: 6, md: 4 };
    }
  };

  // Move useMemo outside of conditional rendering
  const renderedChart = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return null;
    }
    return renderChart(widget, chartData, theme);
  }, [widget, chartData, theme]);

  // Create a cache key based on widget configuration and filters
  const getCacheKey = useCallback(() => {
    return JSON.stringify({
      widgetId: widget.id,
      type: widget.type,
      field: widget.dataField,
      groupBy: widget.groupBy,
      aggregation: widget.aggregation,
      filters,
      limit: widget.config.limit,
      sortBy: widget.config.sortBy,
      sortOrder: widget.config.sortOrder,
    });
  }, [widget, filters]);

  // Fetch data from API based on widget configuration
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cacheKey = getCacheKey();
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          // Check if cache is fresh (5 minutes)
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            setChartData(parsed.data);
            setLoading(false);
            return;
          }
        } catch {
          // Invalid cache, continue with fetch
        }
      }
      
      try {
        let fetchedData: any[] = [];
        
        // For timeseries charts, check if we have a date field
        if (widget.type === 'line' && widget.groupBy && ['created_at', 'updated_at', 'uploadDate'].includes(widget.groupBy)) {
          const response = await getDataTimeseries({
            field: widget.dataField,
            dateField: widget.groupBy,
            interval: 'day',
            aggregation: widget.aggregation,
            filters,
          });
          
          fetchedData = response.data.map(item => ({
            name: new Date(item.date).toLocaleDateString(),
            value: item.value,
          }));
        } 
        // For distribution charts (histogram)
        else if (widget.type === 'scatter' && widget.aggregation === 'count') {
          const response = await getDataDistribution({
            field: widget.dataField,
            bins: widget.config.limit || 10,
            filters,
          });
          
          fetchedData = response.data.map((item, index) => ({
            x: index,
            y: item.count,
            name: item.range,
          }));
        }
        // For regular aggregate charts
        else if (widget.type !== 'table' && widget.type !== 'metric') {
          const response = await getDataAggregate({
            field: widget.dataField,
            groupBy: widget.groupBy,
            aggregation: widget.aggregation,
            filters,
            limit: widget.config.limit || 10,
            sortBy: widget.config.sortBy || 'value',
            sortOrder: widget.config.sortOrder || 'desc',
          });
          
          fetchedData = response.data;
        }
        // For metric cards
        else if (widget.type === 'metric') {
          const response = await getDataAggregate({
            field: widget.dataField,
            aggregation: widget.aggregation,
            filters,
          });
          
          fetchedData = response.data;
        }
        // For tables, use local data
        else {
          fetchedData = data;
        }
        
        setChartData(fetchedData);
        
        // Cache the fetched data
        const cacheKey = getCacheKey();
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: fetchedData,
          timestamp: Date.now(),
        }));
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
        setError('Failed to load data');
        // Fallback to local data processing
        const localData = aggregateData(data, widget);
        setChartData(localData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [widget, data, filters, getCacheKey, refreshTrigger]);

  return (
    <Grid size={getSizeClass(widget.size)} ref={setNodeRef} style={style}>
      <Paper
        sx={{
          p: 2,
          height: widget.type === 'metric' ? 150 : 400,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          '&:hover .widget-controls': {
            opacity: 1,
          },
        }}
      >
        <Box
          className="widget-controls"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            opacity: 0,
            transition: 'opacity 0.2s',
            display: 'flex',
            gap: 0.5,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1,
          }}
        >
          <IconButton size="small" {...attributes} {...listeners}>
            <DragIcon />
          </IconButton>
          <IconButton size="small" onClick={onEdit}>
            <SettingsIcon />
          </IconButton>
          <IconButton size="small" onClick={onRemove}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography variant="h6" gutterBottom>
          {widget.title}
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? (
            <CircularProgress />
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            renderedChart
          )}
        </Box>
      </Paper>
    </Grid>
  );
};

// Helper function to aggregate data based on widget configuration
interface ChartDatum {
  name: string;
  value: number;
}

const aggregateData = (data: any[], widget: ChartWidget): ChartDatum[] => {
  if (!data || data.length === 0) return [];

  const { dataField, groupBy, aggregation, config } = widget;
  
  // For metric cards, calculate single value
  if (widget.type === 'metric') {
    let value = 0;
    switch (aggregation) {
      case 'count':
        value = data.length;
        break;
      case 'sum':
        value = data.reduce((sum, item) => sum + (Number(item[dataField]) || 0), 0);
        break;
      case 'avg':
        const sum = data.reduce((s, item) => s + (Number(item[dataField]) || 0), 0);
        value = data.length > 0 ? sum / data.length : 0;
        break;
      case 'min':
        value = Math.min(...data.map(item => Number(item[dataField]) || 0));
        break;
      case 'max':
        value = Math.max(...data.map(item => Number(item[dataField]) || 0));
        break;
    }
    return [{ name: dataField, value }];
  }

  // For other charts, group and aggregate data
  const grouped: Record<string, any[]> = {};
  const fieldToGroup = groupBy || dataField;
  
  // Group data
  data.forEach(item => {
    const key = String(item[fieldToGroup] || 'Unknown');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  // Aggregate grouped data
  const aggregated = Object.entries(grouped).map(([name, items]) => {
    let value = 0;
    switch (aggregation) {
      case 'count':
        value = items.length;
        break;
      case 'sum':
        value = items.reduce((sum, item) => sum + (Number(item[dataField]) || 0), 0);
        break;
      case 'avg':
        const sum = items.reduce((s, item) => s + (Number(item[dataField]) || 0), 0);
        value = items.length > 0 ? sum / items.length : 0;
        break;
      case 'min':
        value = Math.min(...items.map(item => Number(item[dataField]) || 0));
        break;
      case 'max':
        value = Math.max(...items.map(item => Number(item[dataField]) || 0));
        break;
    }
    return { name, value };
  });

  // Sort and limit results
  if (config.sortBy === 'value') {
    aggregated.sort((a, b) => 
      config.sortOrder === 'desc' ? b.value - a.value : a.value - b.value
    );
  } else {
    aggregated.sort((a, b) => 
      config.sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
    );
  }

  return aggregated.slice(0, config.limit || 10);
};

const renderChart = (widget: ChartWidget, data: any[], theme: any) => {
  const chartData = aggregateData(data, widget);
  
  // Define colors for charts
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  switch (widget.type) {
    case 'metric':
      const metricValue = chartData[0]?.value || 0;
      return (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold' }}>
            {typeof metricValue === 'number' 
              ? metricValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : metricValue}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {widget.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {widget.aggregation === 'count' ? 'Total count' : `${widget.aggregation} of ${widget.dataField}`}
          </Typography>
        </Box>
      );
    
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            {widget.config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            {widget.config.showLegend && <Legend />}
            <RechartsTooltip />
            <Bar 
              dataKey="value" 
              fill={theme.palette.primary.main}
              animationDuration={widget.config.animate ? 750 : 0}
            >
              {widget.config.showLabels && <LabelList dataKey="value" position="top" />}
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    
    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            {widget.config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis 
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis />
            {widget.config.showLegend && <Legend />}
            <RechartsTooltip />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              dot={{ fill: theme.palette.primary.dark }}
              animationDuration={widget.config.animate ? 750 : 0}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    
    case 'pie':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={widget.config.showLabels ? (entry: any) => `${entry.name}: ${entry.value}` : false}
              outerRadius={80}
              fill={theme.palette.primary.main}
              dataKey="value"
              animationDuration={widget.config.animate ? 750 : 0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {widget.config.showLegend && <Legend />}
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    
    case 'scatter':
      // For scatter plots, we need x,y data pairs
      const scatterData = data.slice(0, 50).map((item, index) => ({
        x: index,
        y: Number(item[widget.dataField]) || 0,
        name: item[widget.groupBy || 'name'] || `Point ${index + 1}`,
      }));
      
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            {widget.config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="x" name="Index" />
            <YAxis dataKey="y" name={widget.dataField} />
            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
            {widget.config.showLegend && <Legend />}
            <Scatter 
              name={widget.title} 
              data={scatterData} 
              fill={theme.palette.primary.main}
              animationDuration={widget.config.animate ? 750 : 0}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );
    
    case 'table':
      // Get table data - show raw records limited by config
      const tableData = data.slice(0, widget.config.limit || 10);
      const columns = widget.groupBy 
        ? [widget.groupBy, widget.dataField]
        : Object.keys(tableData[0] || {}).slice(0, 4);
      
      return (
        <Box sx={{ width: '100%', height: '100%', overflow: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              '& th': {
                backgroundColor: theme.palette.background.paper,
                borderBottom: `2px solid ${theme.palette.divider}`,
                padding: '12px',
                textAlign: 'left',
                fontWeight: 600,
                color: theme.palette.text.primary,
                position: 'sticky',
                top: 0,
                zIndex: 1,
                boxShadow: `0 2px 4px ${alpha(theme.palette.common.black, 0.1)}`,
              },
              '& td': {
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                padding: '10px 12px',
                color: theme.palette.text.secondary,
              },
              '& tr:hover td': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col}>
                      {row[col] !== null && row[col] !== undefined 
                        ? String(row[col]) 
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      );
    
    default:
      return <Typography color="text.secondary">Chart type not implemented</Typography>;
  }
};

const DataVisualization: React.FC<DataVisualizationProps> = ({ data, fields, onRefresh, filters }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [widgets, setWidgets] = useState<ChartWidget[]>([
    {
      id: 'widget-1',
      type: 'metric',
      title: 'Total Records',
      dataField: 'id',
      aggregation: 'count',
      config: {},
      size: 'small',
    },
    {
      id: 'widget-2',
      type: 'bar',
      title: 'Records by Category',
      dataField: 'category',
      aggregation: 'count',
      config: { showLegend: true, animate: true },
      size: 'medium',
    },
    {
      id: 'widget-3',
      type: 'pie',
      title: 'Distribution by Status',
      dataField: 'status',
      aggregation: 'count',
      config: { showLabels: true, animate: true },
      size: 'small',
    },
  ]);

  const [editingWidget, setEditingWidget] = useState<ChartWidget | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dashboardMode, setDashboardMode] = useState<'view' | 'edit'>('view');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = [...items];
        const [removed] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, removed);

        return newItems;
      });
    }
  };

  const addWidget = (widget: ChartWidget) => {
    setWidgets([...widgets, { ...widget, id: `widget-${Date.now()}` }]);
    setAddDialogOpen(false);
  };

  const updateWidget = (widget: ChartWidget) => {
    setWidgets(widgets.map(w => (w.id === widget.id ? widget : w)));
    setEditingWidget(null);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const exportDashboard = () => {
    const dashboardConfig = {
      widgets,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(dashboardConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Data Visualization Dashboard
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={dashboardMode === 'edit'}
                onChange={(e) => setDashboardMode(e.target.checked ? 'edit' : 'view')}
              />
            }
            label="Edit Mode"
          />
          
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setAddDialogOpen(true)}
            disabled={dashboardMode === 'view'}
          >
            Add Widget
          </Button>
          
          <Tooltip title="Refresh data">
            <IconButton onClick={() => {
              sessionStorage.clear(); // Clear cache
              setRefreshTrigger(prev => prev + 1); // Trigger re-render
              if (onRefresh) onRefresh();
            }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Export dashboard">
            <IconButton onClick={exportDashboard}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Widgets Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
          <Grid container spacing={3}>
            {widgets.map(widget => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                data={data}
                onEdit={() => setEditingWidget(widget)}
                onRemove={() => removeWidget(widget.id)}
                filters={filters}
                refreshTrigger={refreshTrigger}
              />
            ))}
          </Grid>
        </SortableContext>
      </DndContext>

      {/* Empty State */}
      {widgets.length === 0 && (
        <Paper sx={{ p: 5, textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No visualizations yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add widgets to start visualizing your data
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add First Widget
          </Button>
        </Paper>
      )}

      {/* Add/Edit Widget Dialog */}
      <Dialog
        open={addDialogOpen || !!editingWidget}
        onClose={() => {
          setAddDialogOpen(false);
          setEditingWidget(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingWidget ? 'Edit Widget' : 'Add New Widget'}
        </DialogTitle>
        <DialogContent>
          <WidgetForm
            widget={editingWidget}
            fields={fields}
            onSave={editingWidget ? updateWidget : addWidget}
            onCancel={() => {
              setAddDialogOpen(false);
              setEditingWidget(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

// Widget Form Component
const WidgetForm: React.FC<{
  widget?: ChartWidget | null;
  fields: any[];
  onSave: (widget: ChartWidget) => void;
  onCancel: () => void;
}> = ({ widget, fields, onSave, onCancel }) => {
  const [formData, setFormData] = useState<ChartWidget>(
    widget || {
      id: '',
      type: 'bar',
      title: '',
      dataField: fields[0]?.name || '',
      aggregation: 'count',
      config: {
        showLegend: true,
        showLabels: true,
        animate: true,
        limit: 10,
      },
      size: 'medium',
    }
  );

  const handleSubmit = () => {
    if (formData.title && formData.dataField) {
      onSave(formData);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
      <TextField
        label="Widget Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        fullWidth
        required
      />

      <FormControl fullWidth>
        <InputLabel>Chart Type</InputLabel>
        <Select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          label="Chart Type"
        >
          <MenuItem value="bar">Bar Chart</MenuItem>
          <MenuItem value="line">Line Chart</MenuItem>
          <MenuItem value="pie">Pie Chart</MenuItem>
          <MenuItem value="scatter">Scatter Plot</MenuItem>
          <MenuItem value="table">Data Table</MenuItem>
          <MenuItem value="metric">Metric Card</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Data Field</InputLabel>
        <Select
          value={formData.dataField}
          onChange={(e) => setFormData({ ...formData, dataField: e.target.value })}
          label="Data Field"
        >
          {fields.map(field => (
            <MenuItem key={field.name} value={field.name}>
              {field.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {formData.type !== 'metric' && (
        <FormControl fullWidth>
          <InputLabel>Group By</InputLabel>
          <Select
            value={formData.groupBy || ''}
            onChange={(e) => setFormData({ ...formData, groupBy: e.target.value })}
            label="Group By"
          >
            <MenuItem value="">None</MenuItem>
            {fields.filter(f => f.dataType === 'string').map(field => (
              <MenuItem key={field.name} value={field.name}>
                {field.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl fullWidth>
        <InputLabel>Aggregation</InputLabel>
        <Select
          value={formData.aggregation}
          onChange={(e) => setFormData({ ...formData, aggregation: e.target.value as any })}
          label="Aggregation"
        >
          <MenuItem value="count">Count</MenuItem>
          <MenuItem value="sum">Sum</MenuItem>
          <MenuItem value="avg">Average</MenuItem>
          <MenuItem value="min">Minimum</MenuItem>
          <MenuItem value="max">Maximum</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Widget Size</InputLabel>
        <Select
          value={formData.size}
          onChange={(e) => setFormData({ ...formData, size: e.target.value as any })}
          label="Widget Size"
        >
          <MenuItem value="small">Small (1/3 width)</MenuItem>
          <MenuItem value="medium">Medium (1/2 width)</MenuItem>
          <MenuItem value="large">Large (2/3 width)</MenuItem>
          <MenuItem value="full">Full Width</MenuItem>
        </Select>
      </FormControl>

      <Divider />

      <Typography variant="subtitle2">Display Options</Typography>

      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={formData.config.showLegend || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, showLegend: e.target.checked },
                })
              }
            />
          }
          label="Show Legend"
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.config.showLabels || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, showLabels: e.target.checked },
                })
              }
            />
          }
          label="Show Labels"
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.config.animate || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, animate: e.target.checked },
                })
              }
            />
          }
          label="Enable Animation"
        />
      </FormGroup>

      <Box>
        <Typography gutterBottom>Limit Results</Typography>
        <Slider
          value={formData.config.limit || 10}
          onChange={(_, value) =>
            setFormData({
              ...formData,
              config: { ...formData.config, limit: value as number },
            })
          }
          min={5}
          max={50}
          step={5}
          marks
          valueLabelDisplay="auto"
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          {widget ? 'Update' : 'Add'} Widget
        </Button>
      </Box>
    </Box>
  );
};

export default DataVisualization;
