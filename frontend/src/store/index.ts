import { configureStore } from '@reduxjs/toolkit';
import recommendationReducer from './slices/recommendationSlice';
import deckReducer from './slices/deckSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    recommendations: recommendationReducer,
    deck: deckReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
