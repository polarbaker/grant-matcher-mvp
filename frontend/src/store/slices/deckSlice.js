import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  decks: [],
  currentDeck: null,
  loading: false,
  error: null,
};

const deckSlice = createSlice({
  name: 'deck',
  initialState,
  reducers: {
    fetchDecksStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchDecksSuccess: (state, action) => {
      state.loading = false;
      state.decks = action.payload;
    },
    fetchDecksFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    setCurrentDeck: (state, action) => {
      state.currentDeck = action.payload;
    },
  },
});

export const { fetchDecksStart, fetchDecksSuccess, fetchDecksFailure, setCurrentDeck } = deckSlice.actions;
export default deckSlice.reducer;
