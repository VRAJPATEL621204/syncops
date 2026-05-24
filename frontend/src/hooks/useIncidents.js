import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentAPI } from '@/services/api';
import { toast } from '@/hooks/use-toast';

// Query keys for caching
export const incidentKeys = {
  all: ['incidents'],
  lists: () => [...incidentKeys.all, 'list'],
  list: (filters) => [...incidentKeys.lists(), filters],
  details: () => [...incidentKeys.all, 'detail'],
  detail: (id) => [...incidentKeys.details(), id],
};

// Hook to fetch all incidents (with auto-refetch every 30 seconds)
export function useIncidents(options = {}) {
  return useQuery({
    queryKey: incidentKeys.lists(),
    queryFn: async () => {
      const response = await incidentAPI.getIncidents();
      return response.data.data.incidents || [];
    },
    // Refetch every 30 seconds for real-time updates
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 10000, // Consider data stale after 10 seconds
    ...options,
  });
}

// Hook to fetch a single incident
export function useIncident(id, options = {}) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const response = await incidentAPI.getIncidentById(id);
      return response.data.data.incident;
    },
    enabled: !!id,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    ...options,
  });
}

// Hook to report an incident
export function useReportIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: incidentAPI.reportIncident,
    onSuccess: () => {
      toast({
        title: 'Report Submitted',
        description: 'Your incident report has been submitted for review',
      });
      // Invalidate and refetch incidents
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit report',
        variant: 'destructive',
      });
    },
  });
}

// Hook to approve a report
export function useApproveReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => incidentAPI.approveReport(id, data),
    onSuccess: () => {
      toast({
        title: 'Incident Raised',
        description: 'The incident has been officially raised and room created',
      });
      // Invalidate both incidents and rooms queries
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to raise incident',
        variant: 'destructive',
      });
    },
  });
}

// Hook to reject a report
export function useRejectReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => incidentAPI.rejectReport(id, data),
    onSuccess: () => {
      toast({
        title: 'Report Rejected',
        description: 'The incident report has been rejected',
      });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject report',
        variant: 'destructive',
      });
    },
  });
}

// Hook to create a manual incident
export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: incidentAPI.createManualIncident,
    onSuccess: () => {
      toast({
        title: 'Incident Created',
        description: 'The incident has been created and room initialized',
      });
      queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create incident',
        variant: 'destructive',
      });
    },
  });
}
