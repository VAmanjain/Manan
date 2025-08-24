import { configureStore } from '@reduxjs/toolkit';
import pagesReducer from './slices/pageSlice';
import editorReducer from './slices/editorSlice';

export const store = configureStore({
  reducer: {
    pages: pagesReducer,
    editor: editorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;