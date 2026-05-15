import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import SaveIcon from '@mui/icons-material/Save';
import {
Alert,
Box,
Button,
Divider,
FormControl,
FormControlLabel,
Grid,
InputLabel,
MenuItem,
Paper,
Select,
Slider,
Stack,
Switch,
TextField,
Typography
} from '@mui/material';
import React,{ useState } from 'react';

interface LeadFilterProps {
  onFilter: (filters: any) => void;
  onExport: (format: 'csv' | 'json', filters: any) => void;
}

const LeadFilter: React.FC<LeadFilterProps> = ({ onFilter, onExport }) => {
  // Basic filters
  const [businessType, setBusinessType] = useState<'all' | 'business' | 'personal'>('all');
  const [industry, setIndustry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  
  // Advanced filters
  const [employeeRange, setEmployeeRange] = useState<[number, number]>([0, 10000]);
  const [revenueRange, setRevenueRange] = useState<[number, number]>([0, 100]);
  const [yearRange, setYearRange] = useState<[number, number]>([1900, new Date().getFullYear()]);
  
  // Lead quality filters
  const [hasEmail, setHasEmail] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [hasContactName, setHasContactName] = useState(false);
  
  // Collection settings
  const [collectionName, setCollectionName] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  const buildFilters = () => {
    const filters: any = {};
    
    // Basic filters
    if (businessType !== 'all') {
      filters.lead_type = businessType;
    }
    if (industry) filters.industry = industry;
    if (state) filters.state = state;
    if (city) filters.city = city;
    
    // Range filters
    if (employeeRange[0] > 0 || employeeRange[1] < 10000) {
      filters.employee_count_min = employeeRange[0];
      filters.employee_count_max = employeeRange[1];
    }
    if (revenueRange[0] > 0 || revenueRange[1] < 100) {
      filters.annual_revenue_min = revenueRange[0] * 1000000; // Convert to actual values
      filters.annual_revenue_max = revenueRange[1] * 1000000;
    }
    if (yearRange[0] > 1900 || yearRange[1] < new Date().getFullYear()) {
      filters.founded_year_min = yearRange[0];
      filters.founded_year_max = yearRange[1];
    }
    
    // Quality filters
    if (hasEmail) filters.has_email = true;
    if (hasPhone) filters.has_phone = true;
    if (hasWebsite) filters.has_website = true;
    if (hasContactName) filters.has_contact_name = true;
    
    return filters;
  };

  const handleApplyFilters = () => {
    const filters = buildFilters();
    onFilter(filters);
  };

  const handleExport = () => {
    const filters = buildFilters();
    onExport(exportFormat, filters);
  };

  const handleSaveCollection = async () => {
    if (!collectionName) {
      alert('Please enter a collection name');
      return;
    }
    
    try {
      // Save collection logic would go here.
      alert(`Collection "${collectionName}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save collection:', error);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <FilterListIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Lead Filters</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Basic Filters */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Basic Filters
          </Typography>
          
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Lead Type</InputLabel>
              <Select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as any)}
                label="Lead Type"
              >
                <MenuItem value="all">All Leads</MenuItem>
                <MenuItem value="business">Business Leads</MenuItem>
                <MenuItem value="personal">Personal Leads</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              size="small"
              placeholder="e.g., Technology, Healthcare"
            />

            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  size="small"
                  placeholder="e.g., CA, NY"
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  size="small"
                  placeholder="e.g., San Francisco"
                />
              </Grid>
            </Grid>
          </Stack>
        </Grid>

        {/* Advanced Filters */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Advanced Filters
          </Typography>
          
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption">Employee Count Range</Typography>
              <Slider
                value={employeeRange}
                onChange={(e, newValue) => setEmployeeRange(newValue as [number, number])}
                valueLabelDisplay="auto"
                min={0}
                max={10000}
                marks={[
                  { value: 0, label: '0' },
                  { value: 2500, label: '2.5k' },
                  { value: 5000, label: '5k' },
                  { value: 10000, label: '10k+' },
                ]}
              />
            </Box>

            <Box>
              <Typography variant="caption">Annual Revenue (Millions)</Typography>
              <Slider
                value={revenueRange}
                onChange={(e, newValue) => setRevenueRange(newValue as [number, number])}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 25, label: '$25M' },
                  { value: 50, label: '$50M' },
                  { value: 100, label: '$100M+' },
                ]}
              />
            </Box>

            <Box>
              <Typography variant="caption">Founded Year</Typography>
              <Slider
                value={yearRange}
                onChange={(e, newValue) => setYearRange(newValue as [number, number])}
                valueLabelDisplay="auto"
                min={1900}
                max={new Date().getFullYear()}
                marks={[
                  { value: 1900, label: '1900' },
                  { value: 1980, label: '1980' },
                  { value: 2000, label: '2000' },
                  { value: new Date().getFullYear(), label: 'Now' },
                ]}
              />
            </Box>
          </Stack>
        </Grid>

        {/* Lead Quality Filters */}
        <Grid size={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Lead Quality Filters
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={hasEmail}
                  onChange={(e) => setHasEmail(e.target.checked)}
                />
              }
              label="Has Email"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={hasPhone}
                  onChange={(e) => setHasPhone(e.target.checked)}
                />
              }
              label="Has Phone"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={hasWebsite}
                  onChange={(e) => setHasWebsite(e.target.checked)}
                />
              }
              label="Has Website"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={hasContactName}
                  onChange={(e) => setHasContactName(e.target.checked)}
                />
              }
              label="Has Contact Name"
            />
          </Box>
        </Grid>

        {/* Collection Actions */}
        <Grid size={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            Create Collection
          </Typography>
          
          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end' }}>
            <TextField
              label="Collection Name"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              size="small"
              placeholder="e.g., Hot Tech Leads Q1"
              sx={{ flex: 1 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Format</InputLabel>
              <Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                label="Format"
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleApplyFilters}
              startIcon={<FilterListIcon />}
            >
              Apply Filters
            </Button>

            <Button
              variant="outlined"
              onClick={handleExport}
              startIcon={<DownloadIcon />}
            >
              Export
            </Button>

            <Button
              variant="outlined"
              onClick={handleSaveCollection}
              startIcon={<SaveIcon />}
              disabled={!collectionName}
            >
              Save Collection
            </Button>
          </Stack>
        </Grid>
      </Grid>

      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Tip:</strong> Combine filters to shape reusable lead collections, such as "California tech companies with 50+ employees" or "contacts with complete email and phone data".
        </Typography>
      </Alert>
    </Paper>
  );
};

export default LeadFilter;
