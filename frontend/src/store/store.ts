import { configureStore } from '@reduxjs/toolkit';
import deckReducer from './slices/deckSlice';
import recommendationReducer from './slices/recommendationSlice';

export const store = configureStore({
  reducer: {
    deck: deckReducer,
    recommendations: recommendationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
