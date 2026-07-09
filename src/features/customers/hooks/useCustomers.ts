import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { customerApi } from "../services/customerApi";
import {
  AssignCustomerDto,
  CreateCustomerDto,
  CustomerQuery,
  UpdateCustomerDto,
} from "../types";

const CUSTOMERS_KEY = "customers";

/** Debounce a fast-changing value (e.g. the search input) before it hits the API. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export const useCustomers = (query: CustomerQuery) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });

  const customersQuery = useQuery({
    queryKey: [CUSTOMERS_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => customerApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: [CUSTOMERS_KEY, "stats"],
    queryFn: () => customerApi.getStats(),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: CreateCustomerDto) => customerApi.create(data),
    onSuccess: invalidate,
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerDto }) =>
      customerApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => customerApi.delete(id),
    onSuccess: invalidate,
  });

  const assignCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignCustomerDto }) =>
      customerApi.assign(id, data),
    onSuccess: () => {
      invalidate();
      // Team customer counts change with routing
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (id: string) => customerApi.resendInvitation(id),
  });

  return {
    customersQuery,
    statsQuery,
    createCustomerMutation,
    updateCustomerMutation,
    deleteCustomerMutation,
    assignCustomerMutation,
    resendInvitationMutation,
  };
};
