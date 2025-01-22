import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

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
  'recommendations/fetch',
  async (deckAnalysis: any, { getState, rejectWithValue }) => {
    try {
      const { filters } = (getState() as any).recommendations;
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/recommendations/match`,
        {
          deckAnalysis,
          filters,
        }
      );
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch recommendations'
      );
    }
  }
);

export const updateFilters = createAsyncThunk(
  'recommendations/updateFilters',
  async (filters: RecommendationState['filters'], { dispatch }) => {
    dispatch(setFilters(filters));
    return dispatch(fetchRecommendations()).unwrap();
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
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearRecommendations } = recommendationSlice.actions;
export default recommendationSlice.reducer;
