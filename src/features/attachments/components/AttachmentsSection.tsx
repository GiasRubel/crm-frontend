"use client";

import React, { useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { downloadBlob } from "@/features/import-export/downloadBlob";
import { useAttachments } from "../hooks/useAttachments";
import { attachmentApi } from "../services/attachmentApi";
import { Attachment, AttachmentEntityType } from "../types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRow({ attachment, onDelete, isDeleting }: { attachment: Attachment; onDelete: () => void; isDeleting: boolean }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = await attachmentApi.download(attachment.id);
      downloadBlob(blob, attachment.originalName);
    } catch {
      // Non-destructive to retry; no persistent error state needed here.
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/40">
      <FileText size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{attachment.originalName}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500">
          {formatSize(attachment.size)} · {attachment.uploadedByName ?? "Unknown"} ·{" "}
          {new Date(attachment.createdAt).toLocaleDateString()}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="text-gray-400 hover:text-[#3F51B5] dark:text-slate-500 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
        title="Download"
      >
        {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
        title="Delete"
      >
        {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>
    </div>
  );
}

/**
 * File list + upload for one existing record. Renders nothing when `entityId`
 * is undefined (a record must exist before files can be attached to it) —
 * safe to always embed in create/edit forms.
 */
export function AttachmentsSection({ entityType, entityId }: { entityType: AttachmentEntityType; entityId: string | undefined }) {
  const { listQuery, uploadMutation, deleteMutation } = useAttachments(entityType, entityId);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!entityId) return null;

  const attachments = listQuery.data ?? [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync(file);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3 border-t border-gray-100 dark:border-slate-800 pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
          <Paperclip size={12} />
          Attachments
          {attachments.length > 0 && <span>({attachments.length})</span>}
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 h-7 px-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          Upload
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}

      {listQuery.isLoading ? (
        <Loader2 size={14} className="animate-spin text-gray-400 dark:text-slate-500" />
      ) : attachments.length === 0 ? (
        <p className="text-xs text-gray-400 dark:text-slate-500">No files attached yet.</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((a) => (
            <AttachmentRow key={a.id} attachment={a} onDelete={() => handleDelete(a.id)} isDeleting={deletingId === a.id} />
          ))}
        </div>
      )}
    </div>
  );
}
