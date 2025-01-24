import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';
import { RootState } from '../';

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

interface RecommendationState {
  recommendations: Grant[];
  loading: boolean;
  error: string | null;
  filters: {
    minAmount?: number;
    maxAmount?: number;
    categories?: string[];
  };
}

const initialState: RecommendationState = {
  recommendations: [],
  loading: false,
  error: null,
  filters: {},
};

export const fetchRecommendations = createAsyncThunk(
  'recommendations/fetchRecommendations',
  async (deckAnalysis: any, { getState }) => {
    const { filters } = (getState() as RootState).recommendations;
    const response = await api.post('/recommendations', { deckAnalysis, filters });
    return response.data;
  }
);

const recommendationSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    clearRecommendations: (state) => {
      state.recommendations = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecommendations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendations = action.payload;
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch recommendations';
      });
  },
});

export const { setFilters, clearRecommendations } = recommendationSlice.actions;
export default recommendationSlice.reducer;
