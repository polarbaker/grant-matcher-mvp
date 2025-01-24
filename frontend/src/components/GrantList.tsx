import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  LinearProgress,
  Divider,
  CircularProgress,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SearchIcon from '@mui/icons-material/Search';
import { GrantAnalytics } from './GrantAnalytics';

interface Grant {
  id: string;
  name: string;
  description: string;
  amount: number;
  deadline: string;
  matchScore: number;
  matchReasons: string[];
  source: string;
  url: string;
}

interface GrantListProps {
  grants: Grant[];
  isLoading?: boolean;
  error?: string;
  emptyMessage: string;
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const MatchScore = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  textAlign: 'center',
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));

const MatchReason = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: theme.palette.primary.light,
  color: theme.palette.primary.contrastText,
  '& .MuiChip-label': {
    fontWeight: 500,
  },
}));

const FilterBar = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));

export const GrantList: React.FC<GrantListProps> = ({ 
  grants,
  isLoading = false,
  error,
  emptyMessage
}) => {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<'matchScore' | 'amount' | 'deadline'>('matchScore');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [minAmount, setMinAmount] = React.useState<number>(0);
  const [maxAmount, setMaxAmount] = React.useState<number>(1000000);
  const [searchTerm, setSearchTerm] = React.useState('');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const deadline = new Date(dateString);
    const today = new Date();
    const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      formatted: deadline.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      daysLeft: daysUntil,
    };
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'primary';
    return 'warning';
  };

  const filteredAndSortedGrants = React.useMemo(() => {
    return grants
      .filter((grant) => {
        const matchesSearch = searchTerm === '' || 
          grant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grant.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grant.source.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesAmount = grant.amount >= minAmount && grant.amount <= maxAmount;

        return matchesSearch && matchesAmount;
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'matchScore':
            comparison = b.matchScore - a.matchScore;
            break;
          case 'amount':
            comparison = b.amount - a.amount;
            break;
          case 'deadline':
            comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            break;
        }

        return sortOrder === 'desc' ? comparison : -comparison;
      });
  }, [grants, sortBy, sortOrder, minAmount, maxAmount, searchTerm]);

  if (!grants || grants.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 8,
          px: 3,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Grants Found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Available Grants
      </Typography>
      
      {/* Analytics Dashboard */}
      <Box sx={{ mb: 4 }}>
        <GrantAnalytics 
          grants={filteredAndSortedGrants} 
          isLoading={isLoading}
          error={error}
        />
      </Box>
      
      {/* Filter Bar */}
      <FilterBar>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search grants"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort by</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                label="Sort by"
              >
                <MenuItem value="matchScore">Match Score</MenuItem>
                <MenuItem value="amount">Amount</MenuItem>
                <MenuItem value="deadline">Deadline</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Order</InputLabel>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                label="Order"
              >
                <MenuItem value="desc">Highest First</MenuItem>
                <MenuItem value="asc">Lowest First</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Amount Range
          </Typography>
          <Slider
            value={[minAmount, maxAmount]}
            onChange={(_event: Event, value: number | number[], _activeThumb: number) => {
              if (Array.isArray(value)) {
                setMinAmount(value[0]);
                setMaxAmount(value[1]);
              }
            }}
            valueLabelDisplay="auto"
            min={0}
            max={1000000}
            step={10000}
            valueLabelFormat={(value) => formatAmount(value)}
          />
        </Box>
      </FilterBar>

      {filteredAndSortedGrants.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            backgroundColor: 'background.paper',
            borderRadius: 1,
          }}
        >
          <Typography variant="body1" color="text.secondary">
            No grants match your current filters
          </Typography>
        </Box>
      ) : (
        filteredAndSortedGrants.map((grant) => {
          const { formatted: deadlineFormatted, daysLeft } = formatDate(grant.deadline);
          const isExpanded = expandedId === grant.id;

          return (
            <StyledCard 
              key={grant.id} 
              variant="outlined"
              onClick={() => setExpandedId(isExpanded ? null : grant.id)}
              sx={{ cursor: 'pointer' }}
            >
              <CardContent sx={{ position: 'relative' }}>
                <MatchScore>
                  <CircularProgress
                    variant="determinate"
                    value={grant.matchScore * 100}
                    color={getMatchScoreColor(grant.matchScore)}
                    size={48}
                    thickness={4}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="h6" color={getMatchScoreColor(grant.matchScore)}>
                    {Math.round(grant.matchScore * 100)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Match Score
                  </Typography>
                </MatchScore>

                <Box sx={{ pr: 12 }}>
                  <Typography variant="h6" gutterBottom>
                    {grant.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {grant.description}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={3}
                    alignItems="center"
                    sx={{ mb: 2, mt: 2 }}
                  >
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Amount
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <AttachMoneyIcon color="primary" />
                        <Typography variant="h6" color="primary">
                          {formatAmount(grant.amount)}
                        </Typography>
                      </Stack>
                    </Box>

                    <Divider orientation="vertical" flexItem />

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Deadline
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <CalendarTodayIcon color={daysLeft < 30 ? "error" : "primary"} />
                        <Box>
                          <Typography variant="body1">
                            {deadlineFormatted}
                          </Typography>
                          <Typography variant="caption" color={daysLeft < 30 ? "error" : "text.secondary"}>
                            {daysLeft} days left
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Divider orientation="vertical" flexItem />

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Source
                      </Typography>
                      <Typography variant="body1">
                        {grant.source}
                      </Typography>
                    </Box>
                  </Stack>

                  {isExpanded && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Why this matches your profile:
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        {grant.matchReasons.map((reason, index) => (
                          <MatchReason
                            key={index}
                            label={reason}
                            size="small"
                          />
                        ))}
                      </Box>
                      <Button
                        variant="contained"
                        color="primary"
                        href={grant.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 2 }}
                      >
                        Apply Now
                      </Button>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </StyledCard>
          );
        })
      )}
    </Box>
  );
};
