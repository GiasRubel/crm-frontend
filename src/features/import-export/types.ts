export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  created: number;
  failed: number;
  errors: ImportRowError[];
}
