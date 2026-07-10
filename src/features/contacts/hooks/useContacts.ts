import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { contactApi } from "../services/contactApi";
import {
  AddInteractionDto,
  AssignContactDto,
  ContactQuery,
  CreateContactDto,
  UpdateContactDto,
} from "../types";

const CONTACTS_KEY = "contacts";

export const useContacts = (query: ContactQuery) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [CONTACTS_KEY] });
    // Account link counts / summary lists change with contact edits
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  };

  const contactsQuery = useQuery({
    queryKey: [CONTACTS_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => contactApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: [CONTACTS_KEY, "stats"],
    queryFn: () => contactApi.getStats(),
  });

  const createContactMutation = useMutation({
    mutationFn: (data: CreateContactDto) => contactApi.create(data),
    onSuccess: invalidate,
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactDto }) =>
      contactApi.update(id, data),
    onSuccess: invalidate,
  });

  const addInteractionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddInteractionDto }) =>
      contactApi.addInteraction(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [CONTACTS_KEY] }),
  });

  const assignContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignContactDto }) =>
      contactApi.assign(id, data),
    onSuccess: invalidate,
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => contactApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    contactsQuery,
    statsQuery,
    createContactMutation,
    updateContactMutation,
    addInteractionMutation,
    assignContactMutation,
    deleteContactMutation,
  };
};
