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
  const [error, setError] = useState<string | undefined>(undefined);

  const handleDeckUpload = async (file: File) => {
    try {
      setError(undefined);
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
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 4
          }}
        >
          Grant Matching Dashboard
        </Typography>

        <Grid container spacing={4}>
          {/* Upload Section */}
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 4,
                background: 'linear-gradient(45deg, #f3f4f6 30%, #ffffff 90%)',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <Typography 
                variant="h5" 
                gutterBottom
                sx={{ fontWeight: 'medium' }}
              >
                Start Your Grant Journey
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                Upload your pitch deck and let our AI find the perfect grants for your project
              </Typography>
              <DeckUpload
                onUpload={handleDeckUpload}
                isLoading={deckLoading}
                error={error}
              />
            </Paper>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12}>
            <Grid container spacing={4}>
              {/* Matching Summary */}
              {deckAnalysis && (
                <Grid item xs={12} md={4}>
                  <Box sx={{ position: 'sticky', top: 24 }}>
                    <MatchingSummary analysis={deckAnalysis} />
                  </Box>
                </Grid>
              )}

              {/* Grant Recommendations */}
              <Grid item xs={12} md={deckAnalysis ? 8 : 12}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography 
                        variant="h5" 
                        gutterBottom
                        sx={{ fontWeight: 'medium' }}
                      >
                        Recommended Grants
                      </Typography>
                      {!recommendationsLoading && recommendations.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          Found {recommendations.length} matching grants for your project
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {recommendationsLoading ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 300,
                        py: 8,
                      }}
                    >
                      <CircularProgress size={48} sx={{ mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        Analyzing your pitch deck and finding matching grants...
                      </Typography>
                    </Box>
                  ) : (
                    <GrantList
                      grants={recommendations}
                      emptyMessage={
                        deckAnalysis
                          ? "We couldn't find any grants matching your profile. Try adjusting your pitch deck or check back later for new opportunities."
                          : "Upload your pitch deck to discover grants that match your project's needs."
                      }
                    />
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
