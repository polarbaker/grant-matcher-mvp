import { configureStore } from '@reduxjs/toolkit';
import recommendationReducer from './slices/recommendationSlice';
import deckReducer from './slices/deckSlice';

export const store = configureStore({
  reducer: {
    recommendations: recommendationReducer,
    deck: deckReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
