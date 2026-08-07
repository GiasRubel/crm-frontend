import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attachmentApi } from "../services/attachmentApi";
import { AttachmentEntityType } from "../types";

const ATTACHMENTS_KEY = "attachments";

/** File list for one record, plus upload/delete mutations. */
export const useAttachments = (entityType: AttachmentEntityType, entityId: string | undefined) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [ATTACHMENTS_KEY, entityType, entityId] });

  const listQuery = useQuery({
    queryKey: [ATTACHMENTS_KEY, entityType, entityId],
    queryFn: () => attachmentApi.getAll(entityType, entityId as string),
    enabled: !!entityId,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentApi.upload(entityType, entityId as string, file),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attachmentApi.delete(id),
    onSuccess: invalidate,
  });

  return { listQuery, uploadMutation, deleteMutation };
};
