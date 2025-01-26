import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme,
  useMediaQuery,
  Skeleton,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

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

interface GrantAnalyticsProps {
  grants: Grant[];
  isLoading?: boolean;
  error?: string;
}

interface AnalyticCardProps {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
}

const AnalyticCard: React.FC<AnalyticCardProps> = ({ title, children, isLoading = false }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {isLoading ? <Skeleton variant="rectangular" height={200} /> : children}
    </Paper>
  );
};

const GrantAnalytics: React.FC<GrantAnalyticsProps> = ({
  grants,
  isLoading = false,
  error,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    matchScoreDistribution,
    amountDistribution,
    deadlineDistribution,
    sourceDistribution,
    totalAmount,
    averageMatchScore,
    upcomingDeadlines,
    hasValidData
  } = useMemo(() => {
    if (!grants || grants.length === 0) {
      return {
        matchScoreDistribution: [],
        amountDistribution: [],
        deadlineDistribution: [],
        sourceDistribution: [],
        totalAmount: 0,
        averageMatchScore: 0,
        upcomingDeadlines: 0,
        hasValidData: false
      };
    }

    try {
      const matchScoreBuckets: { [key: string]: number } = {
        'High Match (80-100%)': 0,
        'Good Match (60-79%)': 0,
        'Moderate Match (40-59%)': 0,
        'Low Match (0-39%)': 0,
      };

      const amountBuckets: { [key: string]: number } = {
        '0-50k': 0,
        '50k-100k': 0,
        '100k-500k': 0,
        '500k+': 0,
      };

      const deadlines: { [key: string]: number } = {};
      const sources: { [key: string]: number } = {};
      let total = 0;
      let scoreSum = 0;
      let validGrantCount = 0;
      let upcomingCount = 0;

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      grants.forEach((grant) => {
        // Process match scores
        const score = grant.matchScore;
        if (score >= 80) {
          matchScoreBuckets['High Match (80-100%)']++;
        } else if (score >= 60) {
          matchScoreBuckets['Good Match (60-79%)']++;
        } else if (score >= 40) {
          matchScoreBuckets['Moderate Match (40-59%)']++;
        } else {
          matchScoreBuckets['Low Match (0-39%)']++;
        }

        // Process amounts
        const amount = grant.amount;
        if (amount > 0) {
          total += amount;
          if (amount <= 50000) {
            amountBuckets['0-50k']++;
          } else if (amount <= 100000) {
            amountBuckets['50k-100k']++;
          } else if (amount <= 500000) {
            amountBuckets['100k-500k']++;
          } else {
            amountBuckets['500k+']++;
          }
        }

        // Process deadlines
        const deadline = new Date(grant.deadline);
        if (!isNaN(deadline.getTime())) {
          const dateKey = deadline.toISOString().split('T')[0];
          deadlines[dateKey] = (deadlines[dateKey] || 0) + 1;

          if (deadline >= now && deadline <= thirtyDaysFromNow) {
            upcomingCount++;
          }
        }

        // Process sources
        if (grant.source) {
          sources[grant.source] = (sources[grant.source] || 0) + 1;
        }

        // Calculate average match score
        if (!isNaN(score)) {
          validGrantCount++;
          scoreSum += score;
        }
      });

      return {
        matchScoreDistribution: Object.entries(matchScoreBuckets).map(([label, value]) => ({
          label,
          value,
          percentage: (value / grants.length) * 100
        })),
        amountDistribution: Object.entries(amountBuckets).map(([label, value]) => ({
          label,
          value,
          percentage: (value / grants.length) * 100
        })),
        deadlineDistribution: Object.entries(deadlines).map(([date, value]) => ({
          date,
          value,
          percentage: (value / grants.length) * 100
        })),
        sourceDistribution: Object.entries(sources).map(([source, value]) => ({
          source,
          value,
          percentage: (value / grants.length) * 100
        })),
        totalAmount: total,
        averageMatchScore: validGrantCount > 0 ? scoreSum / validGrantCount : 0,
        upcomingDeadlines: upcomingCount,
        hasValidData: true
      };
    } catch (err) {
      console.error('Error processing grant data:', err);
      return {
        matchScoreDistribution: [],
        amountDistribution: [],
        deadlineDistribution: [],
        sourceDistribution: [],
        totalAmount: 0,
        averageMatchScore: 0,
        upcomingDeadlines: 0,
        hasValidData: false
      };
    }
  }, [grants]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, mt: 2 }}>
      <Grid container spacing={3}>
        {/* Summary Statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Summary Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle1">Total Grants</Typography>
                <Typography variant="h4">{grants.length}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle1">Average Match Score</Typography>
                <Typography variant="h4">
                  {averageMatchScore.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle1">Total Amount</Typography>
                <Typography variant="h4">
                  ${totalAmount.toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Match Score Distribution */}
        <Grid item xs={12} md={6}>
          <AnalyticCard title="Match Score Distribution" isLoading={isLoading}>
            <List>
              {matchScoreDistribution.map(({ label, value, percentage }) => (
                <ListItem key={label}>
                  <ListItemText
                    primary={`${label}: ${value} grants (${percentage.toFixed(1)}%)`}
                    secondary={<LinearProgress variant="determinate" value={percentage} />}
                  />
                </ListItem>
              ))}
            </List>
          </AnalyticCard>
        </Grid>

        {/* Grant Amount Distribution */}
        <Grid item xs={12} md={6}>
          <AnalyticCard title="Grant Amount Distribution" isLoading={isLoading}>
            <List>
              {amountDistribution.map(({ label, value, percentage }) => (
                <ListItem key={label}>
                  <ListItemText
                    primary={`${label}: ${value} grants (${percentage.toFixed(1)}%)`}
                    secondary={<LinearProgress variant="determinate" value={percentage} />}
                  />
                </ListItem>
              ))}
            </List>
          </AnalyticCard>
        </Grid>

        {/* Source Distribution */}
        <Grid item xs={12} md={6}>
          <AnalyticCard title="Grants by Source" isLoading={isLoading}>
            <List>
              {sourceDistribution.map(({ source, value, percentage }) => (
                <ListItem key={source}>
                  <ListItemText
                    primary={`${source}: ${value} grants (${percentage.toFixed(1)}%)`}
                    secondary={<LinearProgress variant="determinate" value={percentage} />}
                  />
                </ListItem>
              ))}
            </List>
          </AnalyticCard>
        </Grid>

        {/* Upcoming Deadlines */}
        <Grid item xs={12} md={6}>
          <AnalyticCard title="Upcoming Deadlines (Next 30 Days)" isLoading={isLoading}>
            <Typography variant="h4" align="center" sx={{ my: 4 }}>
              {upcomingDeadlines}
            </Typography>
            <Typography variant="subtitle1" align="center">
              grants with deadlines in the next 30 days
            </Typography>
          </AnalyticCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export { GrantAnalytics };
