import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ticketApi } from "../services/ticketApi";
import {
  AddCommentDto,
  AssignTicketDto,
  CreateMyTicketDto,
  CreateTicketDto,
  TicketQuery,
  TicketStatus,
  UpdateTicketDto,
} from "../types";

const TICKETS_KEY = "tickets";

/** Staff helpdesk view. */
export const useTickets = (query: TicketQuery) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [TICKETS_KEY] });

  const ticketsQuery = useQuery({
    queryKey: [TICKETS_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => ticketApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: [TICKETS_KEY, "stats"],
    queryFn: () => ticketApi.getStats(),
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: CreateTicketDto) => ticketApi.create(data),
    onSuccess: invalidate,
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTicketDto }) =>
      ticketApi.update(id, data),
    onSuccess: invalidate,
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      ticketApi.setStatus(id, status),
    onSuccess: invalidate,
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddCommentDto }) =>
      ticketApi.addComment(id, data),
    onSuccess: invalidate,
  });

  const assignTicketMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignTicketDto }) =>
      ticketApi.assign(id, data),
    onSuccess: invalidate,
  });

  const deleteTicketMutation = useMutation({
    mutationFn: (id: string) => ticketApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    ticketsQuery,
    statsQuery,
    createTicketMutation,
    updateTicketMutation,
    setStatusMutation,
    addCommentMutation,
    assignTicketMutation,
    deleteTicketMutation,
  };
};

/** Customer-portal view (AppRole.Customer). */
export const useMyTickets = (enabled: boolean) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [TICKETS_KEY] });

  const myTicketsQuery = useQuery({
    queryKey: [TICKETS_KEY, "my"],
    queryFn: () => ticketApi.getMy(),
    enabled,
  });

  const createMyTicketMutation = useMutation({
    mutationFn: (data: CreateMyTicketDto) => ticketApi.createMy(data),
    onSuccess: invalidate,
  });

  const addMyCommentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      ticketApi.addMyComment(id, body),
    onSuccess: invalidate,
  });

  return { myTicketsQuery, createMyTicketMutation, addMyCommentMutation };
};
