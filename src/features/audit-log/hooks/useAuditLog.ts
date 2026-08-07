import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { auditLogApi, AuditLogQuery } from "../services/auditLogApi";

const AUDIT_LOG_KEY = "audit-log";

export const useAuditLog = (query: AuditLogQuery) => {
  const listQuery = useQuery({
    queryKey: [AUDIT_LOG_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => auditLogApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  return { listQuery };
};
