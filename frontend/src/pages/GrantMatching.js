import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  fetchRecommendationsStart,
  fetchRecommendationsSuccess,
  fetchRecommendationsFailure,
} from '../store/slices/recommendationSlice.js';

function GrantMatching() {
  const dispatch = useDispatch();
  const { recommendations, loading, error } = useSelector(
    (state) => state.recommendations
  );

  useEffect(() => {
    const fetchRecommendations = async () => {
      dispatch(fetchRecommendationsStart());
      try {
        const response = await fetch('http://localhost:3003/api/recommendations', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        dispatch(fetchRecommendationsSuccess(data));
      } catch (error) {
        dispatch(fetchRecommendationsFailure(error.message));
      }
    };

    fetchRecommendations();
  }, [dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Grant Recommendations
      </Typography>
      <Stack spacing={2} sx={{ mt: 4 }}>
        {recommendations.map((grant) => (
          <Card key={grant.id}>
            <CardContent>
              <Typography variant="h6">{grant.title}</Typography>
              <Typography color="textSecondary" sx={{ mb: 2 }}>
                {grant.organization}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {grant.description}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                href={grant.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Grant
              </Button>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

export default GrantMatching;
