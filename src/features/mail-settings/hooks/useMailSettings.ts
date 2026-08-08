import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mailSettingsApi } from "../services/mailSettingsApi";
import { UpdateMailSettingsDto } from "../types";

const MAIL_SETTINGS_KEY = "mail-settings";

export const useMailSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [MAIL_SETTINGS_KEY],
    queryFn: () => mailSettingsApi.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateMailSettingsDto) => mailSettingsApi.update(dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [MAIL_SETTINGS_KEY] }),
  });

  const testMutation = useMutation({
    mutationFn: (to: string) => mailSettingsApi.sendTest(to),
  });

  return { query, updateMutation, testMutation };
};
