import { apiClient } from "@/lib/api-client";
import { Attachment, AttachmentEntityType } from "../types";

export const attachmentApi = {
  getAll: (entityType: AttachmentEntityType, entityId: string) =>
    apiClient.get<Attachment[]>(`/attachments?entityType=${entityType}&entityId=${entityId}`),
  upload: (entityType: AttachmentEntityType, entityId: string, file: File) => {
    const formData = new FormData();
    formData.append("entityType", entityType);
    formData.append("entityId", entityId);
    formData.append("file", file);
    return apiClient.postFormData<Attachment>("/attachments", formData);
  },
  download: (id: string) => apiClient.getBlob(`/attachments/${id}/download`),
  delete: (id: string) => apiClient.delete<void>(`/attachments/${id}`),
};
