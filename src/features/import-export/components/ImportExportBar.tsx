"use client";

import React, { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-client";
import { downloadBlob } from "../downloadBlob";
import { ImportResult } from "../types";

interface ImportExportBarProps {
  /** Fetches the current filtered list as a CSV blob. */
  onExport: () => Promise<Blob>;
  exportFilename: string;
  /** Omit to show export-only (no bulk-import support for this entity). */
  onImport?: (file: File) => Promise<ImportResult>;
  /** Called after a successful import so the caller can refetch its list. */
  onImportComplete?: () => void;
}

export function ImportExportBar({ onExport, exportFilename, onImport, onImportComplete }: ImportExportBarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await onExport();
      downloadBlob(blob, exportFilename);
    } catch {
      // Export failures are rare (auth/network) and non-destructive to retry.
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onImport) return;

    setIsImporting(true);
    setImportError(null);
    try {
      const importResult = await onImport(file);
      setResult(importResult);
      if (importResult.created > 0) onImportComplete?.();
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        disabled={isExporting}
        className="gap-2"
        title="Export the current list as CSV"
      >
        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Export
      </Button>

      {onImport && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="gap-2"
            title="Bulk-create records from a CSV file"
          >
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Import
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
        </>
      )}

      <Dialog
        open={result !== null || importError !== null}
        onOpenChange={(open) => {
          if (!open) {
            setResult(null);
            setImportError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import result</DialogTitle>
            <DialogDescription>
              {importError ? "The CSV could not be imported." : "Rows were processed independently — one bad row does not block the rest."}
            </DialogDescription>
          </DialogHeader>

          {importError && (
            <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 text-sm text-red-800 dark:text-red-300">
              <AlertTriangle size={18} className="shrink-0" />
              {importError}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={18} className="shrink-0" />
                {result.created} row{result.created === 1 ? "" : "s"} imported successfully.
              </div>
              {result.failed > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4 text-sm text-amber-800 dark:text-amber-300">
                    <AlertTriangle size={18} className="shrink-0" />
                    {result.failed} row{result.failed === 1 ? "" : "s"} failed.
                  </div>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800">
                    {result.errors.map((e) => (
                      <div key={e.row} className="px-3 py-2 text-xs text-gray-600 dark:text-slate-400">
                        <span className="font-semibold text-gray-800 dark:text-slate-200">Row {e.row}:</span> {e.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setResult(null);
                setImportError(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
