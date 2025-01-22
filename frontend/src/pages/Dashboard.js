import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { fetchDecksStart, fetchDecksSuccess, fetchDecksFailure } from '../store/slices/deckSlice.js';

function Dashboard() {
  const dispatch = useDispatch();
  const { decks, loading, error } = useSelector((state) => state.deck);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchDecks = async () => {
      dispatch(fetchDecksStart());
      try {
        const response = await fetch('http://localhost:3001/api/decks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        dispatch(fetchDecksSuccess(data));
      } catch (error) {
        dispatch(fetchDecksFailure(error.message));
      }
    };

    fetchDecks();
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
        Welcome, {user?.name}!
      </Typography>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Your Grant Decks
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {decks.map((deck) => (
          <Grid item xs={12} sm={6} md={4} key={deck.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{deck.name}</Typography>
                <Typography color="textSecondary">
                  {deck.grants?.length || 0} grants
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Dashboard;
