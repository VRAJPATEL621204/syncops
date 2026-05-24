import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomAPI } from '@/services/api';

// Query keys
export const roomKeys = {
  all: ['rooms'],
  lists: () => [...roomKeys.all, 'list'],
  detail: (id) => [...roomKeys.all, 'detail', id],
  messages: (id) => [...roomKeys.all, 'messages', id],
};

// Hook to fetch all rooms (auto-refetch every 30 seconds)
export function useRooms(options = {}) {
  return useQuery({
    queryKey: roomKeys.lists(),
    queryFn: async () => {
      const response = await roomAPI.getRooms();
      return response.data.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 10000,
    ...options,
  });
}

// Hook to fetch room details
export function useRoom(id, options = {}) {
  return useQuery({
    queryKey: roomKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await roomAPI.getRoomById(id);
      return response.data.data.room;
    },
    enabled: !!id,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    ...options,
  });
}

// Hook to fetch room messages
export function useRoomMessages(id, options = {}) {
  return useQuery({
    queryKey: roomKeys.messages(id),
    queryFn: async () => {
      if (!id) return [];
      const response = await roomAPI.getRoomMessages(id);
      return response.data.data.messages || [];
    },
    enabled: !!id,
    refetchInterval: 5000, // Poll messages every 5 seconds for near real-time
    refetchOnWindowFocus: true,
    ...options,
  });
}

// Hook to send message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, content }) => roomAPI.sendMessage(roomId, { content }),
    onSuccess: (_, { roomId }) => {
      // Immediately refetch messages after sending
      queryClient.invalidateQueries({ queryKey: roomKeys.messages(roomId) });
    },
  });
}
