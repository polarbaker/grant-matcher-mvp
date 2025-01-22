import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import deckReducer from './slices/deckSlice.js';
import recommendationReducer from './slices/recommendationSlice.js';

const store = configureStore({
  reducer: {
    auth: authReducer,
    deck: deckReducer,
    recommendations: recommendationReducer,
  },
});

export default store;
