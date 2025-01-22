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
} from '@mui/material';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveCalendar } from '@nivo/calendar';

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

const AnalyticCard: React.FC<AnalyticCardProps> = ({ title, children, isLoading = false }) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      height: '100%',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
    }}
  >
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    {isLoading ? (
      <Box sx={{ pt: 2 }}>
        <Skeleton variant="rectangular" height={200} />
      </Box>
    ) : (
      children
    )}
  </Paper>
);

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

const isValidDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

export const GrantAnalytics: React.FC<GrantAnalyticsProps> = ({ 
  grants, 
  isLoading = false, 
  error 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const {
    matchScoreDistribution,
    amountDistribution,
    deadlineDistribution,
    totalAmount,
    averageMatchScore,
    sourceDistribution,
    upcomingDeadlines,
    hasValidData
  } = useMemo(() => {
    if (!Array.isArray(grants) || grants.length === 0) {
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
      const matchScoreBuckets = {
        'High Match (80-100%)': 0,
        'Good Match (60-79%)': 0,
        'Moderate Match (40-59%)': 0,
        'Low Match (0-39%)': 0,
      };

      const amountBuckets = {
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

      grants.forEach((grant) => {
        // Validate grant data
        if (
          typeof grant.matchScore !== 'number' ||
          typeof grant.amount !== 'number' ||
          !isValidDate(grant.deadline) ||
          typeof grant.source !== 'string'
        ) {
          return;
        }

        validGrantCount++;

        // Match score distribution
        const score = Math.min(Math.max(grant.matchScore * 100, 0), 100);
        if (score >= 80) matchScoreBuckets['High Match (80-100%)']++;
        else if (score >= 60) matchScoreBuckets['Good Match (60-79%)']++;
        else if (score >= 40) matchScoreBuckets['Moderate Match (40-59%)']++;
        else matchScoreBuckets['Low Match (0-39%)']++;

        // Amount distribution
        const amount = Math.max(grant.amount, 0);
        if (amount < 50000) amountBuckets['0-50k']++;
        else if (amount < 100000) amountBuckets['50k-100k']++;
        else if (amount < 500000) amountBuckets['100k-500k']++;
        else amountBuckets['500k+']++;

        // Deadline distribution
        const deadlineDate = new Date(grant.deadline);
        if (isValidDate(grant.deadline)) {
          const dateStr = deadlineDate.toISOString().split('T')[0];
          deadlines[dateStr] = (deadlines[dateStr] || 0) + 1;

          // Check for upcoming deadlines
          const daysUntilDeadline = Math.ceil(
            (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilDeadline >= 0 && daysUntilDeadline <= 30) {
            upcomingCount++;
          }
        }

        // Source distribution
        const source = grant.source.trim() || 'Unknown';
        sources[source] = (sources[source] || 0) + 1;

        total += amount;
        scoreSum += score;
      });

      return {
        matchScoreDistribution: Object.entries(matchScoreBuckets)
          .filter(([, value]) => value > 0)
          .map(([id, value]) => ({
            id,
            value,
            color: id.includes('High')
              ? theme.palette.success.main
              : id.includes('Good')
              ? theme.palette.primary.main
              : id.includes('Moderate')
              ? theme.palette.warning.main
              : theme.palette.error.main,
          })),
        amountDistribution: Object.entries(amountBuckets)
          .filter(([, count]) => count > 0)
          .map(([range, count]) => ({
            range,
            count,
          })),
        deadlineDistribution: Object.entries(deadlines).map(([date, value]) => ({
          day: date,
          value,
        })),
        sourceDistribution: Object.entries(sources)
          .filter(([, value]) => value > 0)
          .map(([id, value]) => ({
            id,
            value,
            label: id,
          })),
        totalAmount: total,
        averageMatchScore: validGrantCount > 0 ? scoreSum / validGrantCount : 0,
        upcomingDeadlines: upcomingCount,
        hasValidData: validGrantCount > 0
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
  }, [grants, theme.palette]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!hasValidData && !isLoading) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No grant data available for analysis.
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Summary Statistics */}
      <Grid item xs={12}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <AnalyticCard title="Total Available Funding" isLoading={isLoading}>
              <Typography variant="h3" color="primary">
                {formatCurrency(totalAmount)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across {grants.length} grants
              </Typography>
            </AnalyticCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <AnalyticCard title="Average Match Score" isLoading={isLoading}>
              <Typography
                variant="h3"
                color={
                  averageMatchScore >= 80
                    ? 'success.main'
                    : averageMatchScore >= 60
                    ? 'primary.main'
                    : 'warning.main'
                }
              >
                {averageMatchScore.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overall match quality
              </Typography>
            </AnalyticCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <AnalyticCard title="Upcoming Deadlines" isLoading={isLoading}>
              <Typography variant="h3" color="error.main">
                {upcomingDeadlines}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Grants closing in 30 days
              </Typography>
            </AnalyticCard>
          </Grid>
        </Grid>
      </Grid>

      {/* Charts */}
      {!isLoading && hasValidData && (
        <>
          {/* Match Score Distribution */}
          <Grid item xs={12} md={6}>
            <AnalyticCard title="Match Score Distribution">
              <Box sx={{ height: 300 }}>
                <ResponsivePie
                  data={matchScoreDistribution}
                  margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  colors={{ datum: 'data.color' }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  enableArcLinkLabels={!isMobile}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor={theme.palette.text.secondary}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor={{
                    from: 'color',
                    modifiers: [['darker', 2]],
                  }}
                  legends={[
                    {
                      anchor: 'right',
                      direction: 'column',
                      justify: false,
                      translateX: 70,
                      translateY: 0,
                      itemsSpacing: 0,
                      itemWidth: 100,
                      itemHeight: 18,
                      itemTextColor: theme.palette.text.secondary,
                      itemDirection: 'left-to-right',
                      itemOpacity: 1,
                      symbolSize: 18,
                      symbolShape: 'circle',
                    },
                  ]}
                />
              </Box>
            </AnalyticCard>
          </Grid>

          {/* Amount Distribution */}
          <Grid item xs={12} md={6}>
            <AnalyticCard title="Grant Amount Distribution">
              <Box sx={{ height: 300 }}>
                <ResponsiveBar
                  data={amountDistribution}
                  keys={['count']}
                  indexBy="range"
                  margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={theme.palette.primary.main}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Amount Range',
                    legendPosition: 'middle',
                    legendOffset: 40,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Number of Grants',
                    legendPosition: 'middle',
                    legendOffset: -40,
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  role="application"
                />
              </Box>
            </AnalyticCard>
          </Grid>

          {/* Grant Timeline */}
          {deadlineDistribution.length > 0 && (
            <Grid item xs={12}>
              <AnalyticCard title="Grant Deadline Timeline">
                <Box sx={{ height: 200 }}>
                  <ResponsiveCalendar
                    data={deadlineDistribution}
                    from={new Date().toISOString().split('T')[0]}
                    to={
                      new Date(
                        Math.max(
                          ...deadlineDistribution.map((d) => new Date(d.day).getTime())
                        )
                      )
                        .toISOString()
                        .split('T')[0]
                    }
                    emptyColor="#eeeeee"
                    colors={['#61cdbb', '#97e3d5', '#e8c1a0', '#f47560']}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    yearSpacing={40}
                    monthBorderColor="#ffffff"
                    dayBorderWidth={2}
                    dayBorderColor="#ffffff"
                  />
                </Box>
              </AnalyticCard>
            </Grid>
          )}

          {/* Source Distribution */}
          {sourceDistribution.length > 0 && (
            <Grid item xs={12} md={6}>
              <AnalyticCard title="Grants by Source">
                <Box sx={{ height: 300 }}>
                  <ResponsivePie
                    data={sourceDistribution}
                    margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                    innerRadius={0.5}
                    padAngle={0.7}
                    cornerRadius={3}
                    activeOuterRadiusOffset={8}
                    borderWidth={1}
                    borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                    enableArcLinkLabels={!isMobile}
                    arcLinkLabelsSkipAngle={10}
                    arcLinkLabelsTextColor={theme.palette.text.secondary}
                    arcLabelsSkipAngle={10}
                    arcLabelsTextColor={{
                      from: 'color',
                      modifiers: [['darker', 2]],
                    }}
                  />
                </Box>
              </AnalyticCard>
            </Grid>
          )}
        </>
      )}
    </Grid>
  );
};
