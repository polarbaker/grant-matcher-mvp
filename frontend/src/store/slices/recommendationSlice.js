import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  recommendations: [],
  loading: false,
  error: null,
};

const recommendationSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {
    fetchRecommendationsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchRecommendationsSuccess: (state, action) => {
      state.loading = false;
      state.recommendations = action.payload;
    },
    fetchRecommendationsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchRecommendationsStart,
  fetchRecommendationsSuccess,
  fetchRecommendationsFailure,
} = recommendationSlice.actions;

export default recommendationSlice.reducer;
