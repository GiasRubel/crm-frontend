import { apiClient } from "@/lib/api-client";
import { MailSettings, UpdateMailSettingsDto } from "../types";

export const mailSettingsApi = {
  get: () => apiClient.get<MailSettings>("/mail-settings"),
  update: (dto: UpdateMailSettingsDto) =>
    apiClient.patch<MailSettings>("/mail-settings", dto),
  sendTest: (to: string) =>
    apiClient.post<{ message: string }>("/mail-settings/test", { to }),
};
