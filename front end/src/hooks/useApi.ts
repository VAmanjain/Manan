import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import  api  from '../lib/api';
import type { 
  Page, 
  Block, 
  CreatePageInput, 
  UpdatePageInput, 
  CreateBlockInput, 
  UpdateBlockInput,
  User 
} from '../types/api';
import useApi from '../lib/api';

// Type mapping between BlockNote and API
const BLOCKNOTE_TO_API_TYPE_MAP: Record<string, string> = {
  'paragraph': 'TEXT',
  'heading': 'HEADING',
  'bulletListItem': 'BULLETED_LIST',
  'numberedListItem': 'NUMBERED_LIST',
  'checkListItem': 'CHECKLIST',
  'table': 'TABLE',
  'image': 'IMAGE',
  'video': 'EMBED',
  'audio': 'EMBED',
  'file': 'FILE',
  'codeBlock': 'CODE',
  'divider': 'DIVIDER',
  'quote': 'QUOTE',
  'callout': 'CALL_OUT',
};

const API_TO_BLOCKNOTE_TYPE_MAP: Record<string, string> = {
  'TEXT': 'paragraph',
  'HEADING': 'heading',
  'BULLETED_LIST': 'bulletListItem',
  'NUMBERED_LIST': 'numberedListItem',
  'CHECKLIST': 'checkListItem',
  'TODO': 'checkListItem',
  'TABLE': 'table',
  'IMAGE': 'image',
  'EMBED': 'video',
  'FILE': 'file',
  'CODE': 'codeBlock',
  'DIVIDER': 'divider',
  'QUOTE': 'quote',
  'CALL_OUT': 'callout',
};

// Helper functions for type conversion
export const mapBlockNoteTypeToAPI = (blockNoteType: string): string => {
  return BLOCKNOTE_TO_API_TYPE_MAP[blockNoteType] || 'TEXT';
};

export const mapAPITypeToBlockNote = (apiType: string): string => {
  return API_TO_BLOCKNOTE_TYPE_MAP[apiType] || 'paragraph';
};

// Helper to check if block content has changed
export const hasBlockChanged = (existingBlock: Block, newBlock: any): boolean => {
  return (
    JSON.stringify(existingBlock.content) !== JSON.stringify(newBlock.content) ||
    JSON.stringify(existingBlock.properties) !== JSON.stringify(newBlock.props) ||
    existingBlock.type !== mapBlockNoteTypeToAPI(newBlock.type)
  );
};

// User hooks

export const useUser = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const response = await api.get<User>('/auth/me', {
          headers: {
            "Cache-Control": "no-cache",
          }
        });
        return response.data;
      } catch (error) {
        console.error("Failed to fetch user", error);
        throw error; // Re-throw so React Query can handle it
      }
    },
  });
};
// Page hooks
export const usePages = () => {
  const api = useApi();
  return useQuery({
    queryKey: ['pages'],
    queryFn: async () => {
      const response = await api.get<Page[]>('/pages/user');
      return response.data;
    },
  });
};

export const usePage = (pageId: string) => {
  const api = useApi();
  return useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      const response = await api.get<{data: Page}>(`/pages/${pageId}`);
      return response.data.data;
    },
    enabled: !!pageId,
  });
};

export const useCreatePage = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: async (data: CreatePageInput) => {
      const response = await api.post<Page>('/pages', data);
      return response.data;
    },
    onSuccess: (newPage) => {
      queryClient.setQueryData(['pages'], (oldData: Page[] = []) => [
        ...oldData,
        newPage,
      ]);
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
    onError: (error) => {
      console.error('Failed to create page:', error);
    },
  });
};

export const useDeletePage = () => {
  const queryClient = useQueryClient();
const api = useApi();
  return useMutation({
    mutationFn: async (pageId: string) => {
      await api.delete(`/pages/${pageId}`);
      return pageId;
    },
    onSuccess: (deletedPageId) => {
      queryClient.setQueryData(['pages'], (oldData: Page[] = []) =>
        oldData.filter((page) => page.id !== deletedPageId)
      );
    },
    onError: (error) => {
      console.error('Failed to delete page:', error);
    },
  });
};

export const useUpdatePage = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePageInput }) => {
      const response = await api.patch<Page>(`/pages/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedPage) => {
      queryClient.setQueryData(['page', updatedPage.id], updatedPage);
      queryClient.setQueryData(['pages'], (oldData: Page[] = []) =>
        oldData.map((page) => (page.id === updatedPage.id ? updatedPage : page))
      );
    },
    onError: (error) => {
      console.error('Failed to update page:', error);
    },
  });
};

// Block hooks with improved type mapping
export const useBlocks = (pageId: string) => {
  const api = useApi();
  return useQuery({
    queryKey: ['blocks', pageId],
    queryFn: async () => {
      const response = await api.get<Block[]>(`/blocks/${pageId}/blocks`);
      // Convert API types to BlockNote types
      const blocksWithMappedTypes = response.data.map(block => ({
        ...block,
        type: mapAPITypeToBlockNote(block.type)
      }));
      return blocksWithMappedTypes;
    },
    enabled: !!pageId,
  });
};

export const useCreateBlock = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: async (data: CreateBlockInput) => {
      console.log('Sending to API:', data);
      const response = await api.post<Block>('/blocks', data);
      
      // Convert the response back to BlockNote format
      const blockWithMappedType = {
        ...response.data,
        type: mapAPITypeToBlockNote(response.data.type)
      };
      
      return blockWithMappedType;
    },
    onSuccess: (newBlock) => {
      queryClient.setQueryData(['blocks', newBlock.pageId], (oldData: Block[] = []) => {
        // Check if block already exists to prevent duplicates
        const existingBlockIndex = oldData.findIndex(block => block.id === newBlock.id);
        if (existingBlockIndex !== -1) {
          // Update existing block
          const updatedData = [...oldData];
          updatedData[existingBlockIndex] = newBlock;
          return updatedData;
        }
        // Add new block
        return [...oldData, newBlock];
      });
    },
    onError: (error) => {
      console.error('Failed to create block:', error);
    },
  });
};

export const useUpdateBlock = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: string; 
      data: UpdateBlockInput;
    }) => {
      const response = await api.patch<Block>(`/blocks/${id}`, data);
      
      // Convert the response back to BlockNote format
      const blockWithMappedType = {
        ...response.data,
        type: mapAPITypeToBlockNote(response.data.type)
      };
      
      return blockWithMappedType;
    },
    onSuccess: (updatedBlock) => {
      queryClient.setQueryData(['blocks', updatedBlock.pageId], (oldData: Block[] = []) =>
        oldData?.map((block) => (block.id === updatedBlock.id ? updatedBlock : block)) || []
      );
    },
    onError: (error) => {
      console.error('Failed to update block:', error);
    },
  });
};

export const useDeleteBlock = () => {
  const queryClient = useQueryClient();
  const api = useApi();
  return useMutation({
    mutationFn: async ({ blockId, pageId }: { blockId: string; pageId: string }) => {
      await api.delete(`/blocks/${blockId}`);
      return { blockId, pageId };
    },
    onSuccess: ({ blockId, pageId }) => {
      queryClient.setQueryData(['blocks', pageId], (oldData: Block[] = []) =>
        oldData.filter(block => block.id !== blockId)
      );
    },
    onError: (error) => {
      console.error('Failed to delete block:', error);
    },
  });
};
