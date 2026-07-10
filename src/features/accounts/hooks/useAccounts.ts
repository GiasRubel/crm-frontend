import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { accountApi } from "../services/accountApi";
import {
  AccountQuery,
  AssignAccountDto,
  CreateAccountDto,
  UpdateAccountDto,
} from "../types";

const ACCOUNTS_KEY = "accounts";

export const useAccounts = (query: AccountQuery) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });

  const accountsQuery = useQuery({
    queryKey: [ACCOUNTS_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => accountApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: [ACCOUNTS_KEY, "stats"],
    queryFn: () => accountApi.getStats(),
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: CreateAccountDto) => accountApi.create(data),
    onSuccess: invalidate,
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountDto }) =>
      accountApi.update(id, data),
    onSuccess: invalidate,
  });

  const assignAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignAccountDto }) =>
      accountApi.assign(id, data),
    onSuccess: invalidate,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => accountApi.delete(id),
    onSuccess: () => {
      invalidate();
      // Deleting an account unlinks its contacts and deals
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });

  return {
    accountsQuery,
    statsQuery,
    createAccountMutation,
    updateAccountMutation,
    assignAccountMutation,
    deleteAccountMutation,
  };
};

/** 360° summary for one account — fetched while the summary dialog is open. */
export const useAccountSummary = (accountId: string | null) =>
  useQuery({
    queryKey: [ACCOUNTS_KEY, "summary", accountId],
    queryFn: () => accountApi.getSummary(accountId!),
    enabled: !!accountId,
  });
