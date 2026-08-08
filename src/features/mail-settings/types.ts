export interface MailSettings {
  enabled: boolean;
  host?: string;
  port?: number;
  secure: boolean;
  user?: string;
  hasPassword: boolean;
  fromAddress?: string;
  fromName?: string;
  updatedAt?: string;
}

export interface UpdateMailSettingsDto {
  enabled?: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  /** Omit or leave blank to keep the currently saved password. */
  pass?: string;
  fromAddress?: string;
  fromName?: string;
}
