import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

interface DeckState {
  deckAnalysis: any | null;
  loading: boolean;
  error: string | null;
  progress: number;
  progressMessage: string;
}

const initialState: DeckState = {
  deckAnalysis: null,
  loading: false,
  error: null,
  progress: 0,
  progressMessage: '',
};

export const uploadDeck = createAsyncThunk(
  'deck/upload',
  async (file: File, { dispatch, rejectWithValue }) => {
    try {
      console.log('Starting file upload:', file.name, 'Size:', file.size);
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/deck-analysis/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.loaded / (progressEvent.total || 1) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
          dispatch(setProgress({ progress, message: `Uploading pitch deck (${progress.toFixed(0)}%)...` }));
        },
        // Add timeout and max content length
        timeout: 30000, // 30 seconds
        maxContentLength: 10 * 1024 * 1024, // 10MB
      });

      console.log('Upload successful, starting analysis');
      
      // Simulate analysis progress (we'll replace this with real streaming updates)
      const steps = [
        { progress: 25, message: 'Extracting text from deck...' },
        { progress: 50, message: 'Analyzing content...' },
        { progress: 75, message: 'Identifying key themes...' },
        { progress: 90, message: 'Matching with grants...' },
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        dispatch(setProgress(step));
      }

      dispatch(setProgress({ progress: 100, message: 'Analysis complete!' }));
      return response.data;
    } catch (error: any) {
      console.error('Upload failed:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to upload pitch deck';
      dispatch(setProgress({ progress: 0, message: `Error: ${errorMessage}` }));
      return rejectWithValue(errorMessage);
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
      state.progress = 0;
      state.progressMessage = '';
    },
    setProgress: (state, action) => {
      state.progress = action.payload.progress;
      state.progressMessage = action.payload.message;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadDeck.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.progress = 0;
        state.progressMessage = 'Preparing upload...';
      })
      .addCase(uploadDeck.fulfilled, (state, action) => {
        state.loading = false;
        state.deckAnalysis = action.payload;
      })
      .addCase(uploadDeck.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.progress = 0;
        state.progressMessage = '';
      });
  },
});

export const { clearDeckAnalysis, setProgress } = deckSlice.actions;
export default deckSlice.reducer;
