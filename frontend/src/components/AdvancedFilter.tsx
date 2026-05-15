import {
Add as AddIcon,
Clear as ClearIcon,
Code as CodeIcon,
ExpandLess as CollapseIcon,
ContentCopy as CopyIcon,
Delete as DeleteIcon,
ExpandMore as ExpandIcon,
FilterList as FilterIcon,
History as HistoryIcon,
Save as SaveIcon,
Search as SearchIcon,
} from '@mui/icons-material';
import {
Alert,
Autocomplete,
Box,
Button,
Chip,
Collapse,
Fade,
FormControl,
FormControlLabel,
Grid,
IconButton,
InputLabel,
MenuItem,
Paper,
Radio,
RadioGroup,
Select,
TextField,
Tooltip,
Typography
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import React,{ useState } from 'react';

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
  groups: FilterGroup[];
}

interface SavedFilter {
  id: string;
  name: string;
  filter: FilterGroup;
  createdAt: Date;
}

interface AdvancedFilterProps {
  fields: Array<{
    name: string;
    label: string;
    dataType: 'string' | 'number' | 'date' | 'boolean';
    values?: string[]; // For autocomplete
  }>;
  onApplyFilter: (filter: FilterGroup) => void;
  onClearFilter: () => void;
  initialFilter?: FilterGroup;
}

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  fields,
  onApplyFilter,
  onClearFilter,
  initialFilter,
}) => {
  const [filter, setFilter] = useState<FilterGroup>(
    initialFilter || {
      id: 'root',
      logic: 'AND',
      conditions: [],
      groups: [],
    }
  );
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['root']));

  const getOperatorsForType = (dataType: string) => {
    switch (dataType) {
      case 'string':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does Not Contain' },
          { value: 'starts_with', label: 'Starts With' },
          { value: 'ends_with', label: 'Ends With' },
          { value: 'is_empty', label: 'Is Empty' },
          { value: 'is_not_empty', label: 'Is Not Empty' },
        ];
      case 'number':
        return [
          { value: 'equals', label: '=' },
          { value: 'not_equals', label: '≠' },
          { value: 'greater_than', label: '>' },
          { value: 'greater_than_or_equal', label: '≥' },
          { value: 'less_than', label: '<' },
          { value: 'less_than_or_equal', label: '≤' },
          { value: 'between', label: 'Between' },
          { value: 'is_null', label: 'Is Null' },
          { value: 'is_not_null', label: 'Is Not Null' },
        ];
      case 'date':
        return [
          { value: 'equals', label: 'On' },
          { value: 'before', label: 'Before' },
          { value: 'after', label: 'After' },
          { value: 'between', label: 'Between' },
          { value: 'is_null', label: 'Is Empty' },
          { value: 'is_not_null', label: 'Is Not Empty' },
        ];
      case 'boolean':
        return [
          { value: 'is_true', label: 'Is True' },
          { value: 'is_false', label: 'Is False' },
        ];
      default:
        return [];
    }
  };

  const addCondition = (groupId: string) => {
    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: fields[0].name,
      operator: 'equals',
      value: '',
      dataType: fields[0].dataType,
    };

    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: [...group.conditions, newCondition],
        };
      }
      return {
        ...group,
        groups: group.groups.map(updateGroup),
      };
    };

    setFilter(updateGroup(filter));
  };

  const addGroup = (parentGroupId: string) => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      logic: 'AND',
      conditions: [],
      groups: [],
    };

    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === parentGroupId) {
        return {
          ...group,
          groups: [...group.groups, newGroup],
        };
      }
      return {
        ...group,
        groups: group.groups.map(updateGroup),
      };
    };

    setFilter(updateGroup(filter));
    setExpandedGroups(prev => new Set([...prev, newGroup.id]));
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.filter(c => c.id !== conditionId),
        };
      }
      return {
        ...group,
        groups: group.groups.map(updateGroup),
      };
    };

    setFilter(updateGroup(filter));
  };

  const removeGroup = (parentGroupId: string, groupId: string) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === parentGroupId) {
        return {
          ...group,
          groups: group.groups.filter(g => g.id !== groupId),
        };
      }
      return {
        ...group,
        groups: group.groups.map(updateGroup),
      };
    };

    setFilter(updateGroup(filter));
  };

  const updateCondition = (
    groupId: string,
    conditionId: string,
    field: keyof FilterCondition,
    value: any
  ) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          conditions: group.conditions.map(c =>
            c.id === conditionId
              ? {
                  ...c,
                  [field]: value,
                  // Update dataType when field changes
                  ...(field === 'field' && {
                    dataType: fields.find(f => f.name === value)?.dataType || 'string',
                    operator: 'equals',
                    value: '',
                  }),
                }
              : c
          ),
        };
      }
      return {
        ...group,
        groups: group.groups.map(updateGroup),
      };
    };

    setFilter(updateGroup(filter));
  };

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return { ...group, logic };
      }
      return {
        ...group,
        groups: group.groups.map(updateGroup),
      };
    };

    setFilter(updateGroup(filter));
  };

  const generateSQL = (group: FilterGroup): string => {
    const conditions: string[] = [];

    // Process conditions
    group.conditions.forEach(condition => {
      let sql = condition.field;
      
      switch (condition.operator) {
        case 'equals':
          sql += ` = '${condition.value}'`;
          break;
        case 'not_equals':
          sql += ` != '${condition.value}'`;
          break;
        case 'contains':
          sql += ` LIKE '%${condition.value}%'`;
          break;
        case 'starts_with':
          sql += ` LIKE '${condition.value}%'`;
          break;
        case 'ends_with':
          sql += ` LIKE '%${condition.value}'`;
          break;
        case 'greater_than':
          sql += ` > ${condition.value}`;
          break;
        case 'less_than':
          sql += ` < ${condition.value}`;
          break;
        case 'between':
          sql += ` BETWEEN ${condition.value[0]} AND ${condition.value[1]}`;
          break;
        case 'is_null':
          sql += ' IS NULL';
          break;
        case 'is_not_null':
          sql += ' IS NOT NULL';
          break;
        default:
          break;
      }
      
      conditions.push(sql);
    });

    // Process nested groups
    group.groups.forEach(subGroup => {
      const subGroupSQL = generateSQL(subGroup);
      if (subGroupSQL) {
        conditions.push(`(${subGroupSQL})`);
      }
    });

    return conditions.join(` ${group.logic} `);
  };

  const saveFilter = () => {
    if (!filterName.trim()) return;

    const newSavedFilter: SavedFilter = {
      id: `saved-${Date.now()}`,
      name: filterName,
      filter: JSON.parse(JSON.stringify(filter)), // Deep clone
      createdAt: new Date(),
    };

    setSavedFilters([...savedFilters, newSavedFilter]);
    setFilterName('');
  };

  const loadFilter = (savedFilter: SavedFilter) => {
    setFilter(savedFilter.filter);
    setShowSaved(false);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const renderCondition = (
    condition: FilterCondition,
    groupId: string,
    index: number
  ) => {
    const field = fields.find(f => f.name === condition.field);
    const operators = getOperatorsForType(condition.dataType);
    const needsValue = !['is_null', 'is_not_null', 'is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(
      condition.operator
    );

    return (
      <Fade in key={condition.id}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            p: 2,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
          }}
        >
          {index > 0 && (
            <Chip
              label={filter.logic}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Field</InputLabel>
            <Select
              value={condition.field}
              onChange={(e) => updateCondition(groupId, condition.id, 'field', e.target.value)}
              label="Field"
            >
              {fields.map(f => (
                <MenuItem key={f.name} value={f.name}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Operator</InputLabel>
            <Select
              value={condition.operator}
              onChange={(e) => updateCondition(groupId, condition.id, 'operator', e.target.value)}
              label="Operator"
            >
              {operators.map(op => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {needsValue && (
            <>
              {condition.dataType === 'string' && field?.values ? (
                <Autocomplete
                  size="small"
                  options={field.values}
                  value={condition.value}
                  onChange={(_, newValue) =>
                    updateCondition(groupId, condition.id, 'value', newValue || '')
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Value" sx={{ minWidth: 200 }} />
                  )}
                />
              ) : condition.dataType === 'date' ? (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Value"
                    value={condition.value || null}
                    onChange={(newValue) =>
                      updateCondition(groupId, condition.id, 'value', newValue)
                    }
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { minWidth: 200 }
                      }
                    }}
                  />
                </LocalizationProvider>
              ) : condition.operator === 'between' ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    label="From"
                    value={condition.value?.[0] || ''}
                    onChange={(e) =>
                      updateCondition(
                        groupId,
                        condition.id,
                        'value',
                        [e.target.value, condition.value?.[1] || '']
                      )
                    }
                  />
                  <Typography>to</Typography>
                  <TextField
                    size="small"
                    type="number"
                    label="To"
                    value={condition.value?.[1] || ''}
                    onChange={(e) =>
                      updateCondition(
                        groupId,
                        condition.id,
                        'value',
                        [condition.value?.[0] || '', e.target.value]
                      )
                    }
                  />
                </Box>
              ) : (
                <TextField
                  size="small"
                  label="Value"
                  type={condition.dataType === 'number' ? 'number' : 'text'}
                  value={condition.value}
                  onChange={(e) => updateCondition(groupId, condition.id, 'value', e.target.value)}
                  sx={{ minWidth: 200 }}
                />
              )}
            </>
          )}

          <IconButton
            size="small"
            onClick={() => removeCondition(groupId, condition.id)}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Fade>
    );
  };

  const renderFilterGroup = (group: FilterGroup, parentGroupId?: string, depth = 0) => {
    const isExpanded = expandedGroups.has(group.id);

    return (
      <Box
        key={group.id}
        sx={{
          ml: depth > 0 ? 4 : 0,
          mt: depth > 0 ? 2 : 0,
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          backgroundColor: depth % 2 === 0 ? 'background.default' : 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {depth > 0 && (
              <IconButton size="small" onClick={() => toggleGroup(group.id)}>
                {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
              </IconButton>
            )}
            <RadioGroup
              row
              value={group.logic}
              onChange={(e) => updateGroupLogic(group.id, e.target.value as 'AND' | 'OR')}
            >
              <FormControlLabel value="AND" control={<Radio size="small" />} label="AND" />
              <FormControlLabel value="OR" control={<Radio size="small" />} label="OR" />
            </RadioGroup>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => addCondition(group.id)}
            >
              Add Condition
            </Button>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => addGroup(group.id)}
              variant="outlined"
            >
              Add Group
            </Button>
            {parentGroupId && (
              <IconButton
                size="small"
                onClick={() => removeGroup(parentGroupId, group.id)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        <Collapse in={depth === 0 || isExpanded}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.conditions.map((condition, index) =>
              renderCondition(condition, group.id, index)
            )}

            {group.groups.map(subGroup =>
              renderFilterGroup(subGroup, group.id, depth + 1)
            )}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const hasActiveFilters = filter.conditions.length > 0 || filter.groups.length > 0;

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon />
          Advanced Filters
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="View saved filters">
            <IconButton onClick={() => setShowSaved(!showSaved)}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="View SQL">
            <IconButton onClick={() => setShowSQL(!showSQL)}>
              <CodeIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Saved Filters */}
      <Collapse in={showSaved}>
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Saved Filters
          </Typography>
          {savedFilters.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No saved filters yet
            </Typography>
          ) : (
            <Grid container spacing={1}>
              {savedFilters.map(saved => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={saved.id}>
                  <Chip
                    label={saved.name}
                    onClick={() => loadFilter(saved)}
                    onDelete={() => setSavedFilters(savedFilters.filter(f => f.id !== saved.id))}
                    sx={{ width: '100%', justifyContent: 'space-between' }}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Collapse>

      {/* SQL View */}
      <Collapse in={showSQL}>
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <IconButton
              size="small"
              onClick={() => {
                navigator.clipboard.writeText(generateSQL(filter));
              }}
            >
              <CopyIcon />
            </IconButton>
          }
        >
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            WHERE {generateSQL(filter) || '1=1'}
          </Typography>
        </Alert>
      </Collapse>

      {/* Filter Builder */}
      {renderFilterGroup(filter)}

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Filter name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <Button
            size="small"
            startIcon={<SaveIcon />}
            onClick={saveFilter}
            disabled={!filterName.trim() || !hasActiveFilters}
          >
            Save
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={() => {
              setFilter({
                id: 'root',
                logic: 'AND',
                conditions: [],
                groups: [],
              });
              onClearFilter();
            }}
            disabled={!hasActiveFilters}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={() => onApplyFilter(filter)}
            disabled={!hasActiveFilters}
          >
            Apply Filter
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default AdvancedFilter;
