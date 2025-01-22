import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

interface DeckState {
  deckAnalysis: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: DeckState = {
  deckAnalysis: null,
  loading: false,
  error: null,
};

export const uploadDeck = createAsyncThunk(
  'deck/upload',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/deck-analysis/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to upload pitch deck'
      );
    }
  }
);

const deckSlice = createSlice({
  name: 'deck',
  initialState,
  reducers: {
    clearDeckAnalysis: (state) => {
      state.deckAnalysis = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadDeck.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadDeck.fulfilled, (state, action) => {
        state.loading = false;
        state.deckAnalysis = action.payload;
      })
      .addCase(uploadDeck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearDeckAnalysis } = deckSlice.actions;
export default deckSlice.reducer;
