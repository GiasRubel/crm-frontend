import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import { searchApi } from "../services/searchApi";

/** Cross-record search for the header search bar. Debounced; skips queries under 2 characters. */
export const useGlobalSearch = (term: string) => {
  const debounced = useDebouncedValue(term, 250);
  const query = debounced.trim();

  return useQuery({
    queryKey: ["global-search", query],
    queryFn: () => searchApi.search(query),
    enabled: query.length >= 2,
  });
};
