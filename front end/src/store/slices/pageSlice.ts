import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Page } from '../../types/api';

interface PagesState {
  pages: Page[];
  currentPage: Page | null;
  loading: boolean;
  error: string | null;
  sidebarCollapsed: boolean;
}

const initialState: PagesState = {
  pages: [],
  currentPage: null,
  loading: false,
  error: null,
  sidebarCollapsed: false,
};

const pagesSlice = createSlice({
  name: 'pages',
  initialState,
  reducers: {
    setPages: (state, action: PayloadAction<Page[]>) => {
      state.pages = action.payload;
    },
    addPage: (state, action: PayloadAction<Page>) => {
      state.pages.push(action.payload);
    },
    updatePage: (state, action: PayloadAction<Page>) => {
      const index = state.pages.findIndex(page => page.id === action.payload.id);
      if (index !== -1) {
        state.pages[index] = action.payload;
      }
      if (state.currentPage?.id === action.payload.id) {
        state.currentPage = action.payload;
      }
    },
    setCurrentPage: (state, action: PayloadAction<Page>) => {
      state.currentPage = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
  },
});

export const {
  setPages,
  addPage,
  updatePage,
  setCurrentPage,
  setLoading,
  setError,
  toggleSidebar,
  setSidebarCollapsed,
} = pagesSlice.actions;

export default pagesSlice.reducer;