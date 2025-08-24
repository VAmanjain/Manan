import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Block } from '../../types/api';

interface EditorState {
  blocks: Block[];
  loading: boolean;
  error: string | null;
  lastSaved: Date | null;
  isDirty: boolean;
}

const initialState: EditorState = {
  blocks: [],
  loading: false,
  error: null,
  lastSaved: null,
  isDirty: false,
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setBlocks: (state, action: PayloadAction<Block[]>) => {
      state.blocks = action.payload;
      state.isDirty = false;
    },
    addBlock: (state, action: PayloadAction<Block>) => {
      state.blocks.push(action.payload);
      state.isDirty = true;
    },
    updateBlock: (state, action: PayloadAction<Block>) => {
      const index = state.blocks.findIndex(block => block.id === action.payload.id);
      if (index !== -1) {
        state.blocks[index] = action.payload;
        state.isDirty = true;
      }
    },
    deleteBlock: (state, action: PayloadAction<string>) => {
      state.blocks = state.blocks.filter(block => block.id !== action.payload);
      state.isDirty = true;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setLastSaved: (state, action: PayloadAction<Date>) => {
      state.lastSaved = action.payload;
      state.isDirty = false;
    },
    setDirty: (state, action: PayloadAction<boolean>) => {
      state.isDirty = action.payload;
    },
  },
});

export const {
  setBlocks,
  addBlock,
  updateBlock,
  deleteBlock,
  setLoading,
  setError,
  setLastSaved,
  setDirty,
} = editorSlice.actions;

export default editorSlice.reducer;