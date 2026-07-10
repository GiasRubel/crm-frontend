import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { kbApi } from "../services/kbApi";
import { CreateKbArticleDto, KbQuery, UpdateKbArticleDto } from "../types";

const KB_KEY = "kb";

export const useKb = (query: KbQuery) => {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [KB_KEY] });

  const articlesQuery = useQuery({
    queryKey: [KB_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => kbApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: [KB_KEY, "stats"],
    queryFn: () => kbApi.getStats(),
  });

  const createArticleMutation = useMutation({
    mutationFn: (data: CreateKbArticleDto) => kbApi.create(data),
    onSuccess: invalidate,
  });

  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKbArticleDto }) =>
      kbApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id: string) => kbApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    articlesQuery,
    statsQuery,
    createArticleMutation,
    updateArticleMutation,
    deleteArticleMutation,
  };
};
