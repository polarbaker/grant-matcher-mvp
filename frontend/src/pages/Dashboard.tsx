import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';
import { DeckUpload } from '../components/DeckUpload';
import { GrantList } from '../components/GrantList';
import { MatchingSummary } from '../components/MatchingSummary';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchRecommendations } from '../store/slices/recommendationSlice';
import { uploadDeck } from '../store/slices/deckSlice';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { recommendations, loading: recommendationsLoading } = useAppSelector(
    (state) => state.recommendations
  );
  const { deckAnalysis, loading: deckLoading } = useAppSelector(
    (state) => state.deck
  );
  const [error, setError] = useState<string | null>(null);

  const handleDeckUpload = async (file: File) => {
    try {
      setError(null);
      await dispatch(uploadDeck(file)).unwrap();
    } catch (err) {
      setError('Failed to upload pitch deck. Please try again.');
    }
  };

  useEffect(() => {
    if (deckAnalysis) {
      dispatch(fetchRecommendations(deckAnalysis));
    }
  }, [deckAnalysis, dispatch]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Grant Matching Dashboard
        </Typography>

        <Grid container spacing={4}>
          {/* Upload Section */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Upload Your Pitch Deck
              </Typography>
              <DeckUpload
                onUpload={handleDeckUpload}
                isLoading={deckLoading}
                error={error}
              />
            </Paper>
          </Grid>

          {/* Matching Summary */}
          {deckAnalysis && (
            <Grid item xs={12} md={4}>
              <MatchingSummary analysis={deckAnalysis} />
            </Grid>
          )}

          {/* Grant Recommendations */}
          <Grid item xs={12} md={deckAnalysis ? 8 : 12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recommended Grants
              </Typography>
              {recommendationsLoading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 200,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <GrantList
                  grants={recommendations}
                  emptyMessage={
                    deckAnalysis
                      ? 'No matching grants found. Try uploading a different pitch deck.'
                      : 'Upload your pitch deck to see matching grants.'
                  }
                />
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
