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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WorkIcon from '@mui/icons-material/Work';

interface Grant {
  id: string;
  title: string;
  organization: string;
  description: string;
  amount: {
    min: number;
    max: number;
    currency: string;
  };
  deadline: string;
  matchScore: number;
  matchReason: string;
  categories: string[];
  applicationUrl: string;
}

interface GrantListProps {
  grants: Grant[];
  emptyMessage: string;
}

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
  },
}));

const MatchScore = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  textAlign: 'center',
}));

export const GrantList: React.FC<GrantListProps> = ({ grants, emptyMessage }) => {
  const formatAmount = (amount: Grant['amount']) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: amount.currency,
      maximumFractionDigits: 0,
    });

    if (amount.min === amount.max) {
      return formatter.format(amount.max);
    }

    return `${formatter.format(amount.min)} - ${formatter.format(amount.max)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (grants.length === 0) {
    return (
      <Box
        sx={{
          textAlign: 'center',
          py: 4,
          color: 'text.secondary',
        }}
      >
        <Typography variant="body1">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {grants.map((grant) => (
        <StyledCard key={grant.id} variant="outlined">
          <CardContent sx={{ position: 'relative' }}>
            <MatchScore>
              <Typography variant="h6" color="primary">
                {Math.round(grant.matchScore * 100)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Match
              </Typography>
              <LinearProgress
                variant="determinate"
                value={grant.matchScore * 100}
                sx={{ mt: 1, width: 60 }}
              />
            </MatchScore>

            <Typography variant="h6" gutterBottom>
              {grant.title}
            </Typography>

            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WorkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {grant.organization}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AttachMoneyIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {formatAmount(grant.amount)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Due: {formatDate(grant.deadline)}
                </Typography>
              </Box>
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {grant.description}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 2 }}
            >
              {grant.categories.map((category) => (
                <Chip
                  key={category}
                  label={category}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mt: 2 }}>
              <Typography
                variant="body2"
                color="primary"
                sx={{ fontStyle: 'italic', mb: 2 }}
              >
                {grant.matchReason}
              </Typography>

              <Button
                variant="contained"
                color="primary"
                href={grant.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Apply Now
              </Button>
            </Box>
          </CardContent>
        </StyledCard>
      ))}
    </Box>
  );
};
