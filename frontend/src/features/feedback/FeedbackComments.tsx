"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { useFeedbackComments } from "./useFeedbackComments";

function relTime(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  itemId: string;
  /** Sinkronkan comment_count di kartu/daftar. */
  onCountChange: (delta: number) => void;
}

export const FeedbackComments: React.FC<Props> = ({
  itemId,
  onCountChange,
}) => {
  const { comments, isLoading, addComment, deleteComment } =
    useFeedbackComments(itemId);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSend = async () => {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      await addComment(text);
      onCountChange(1);
      setBody("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal mengirim komentar."));
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteComment(id);
      onCountChange(-1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal menghapus komentar."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="border-t border-slate-100 pt-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <MessageSquare className="w-3.5 h-3.5" /> Diskusi
      </h4>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-400 mb-3">
          Belum ada komentar. Mulai diskusi di bawah.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5 mb-3">
          {comments.map((c) => (
            <li
              key={c.id}
              className="group rounded-xl bg-slate-50 border border-slate-200/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[10px] font-bold text-brand">
                    {(c.author_name || "A").charAt(0).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-slate-700 truncate">
                    {c.author_name || "Admin"}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {relTime(c.created_at)}
                  </span>
                </div>
                {c.can_delete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    title="Hapus komentar"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap wrap-break-word">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={body}
          placeholder="Tulis komentar…"
          className="text-sm"
          containerClassName="flex-1"
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setBody(e.target.value)
          }
        />
        <Button
          onClick={handleSend}
          loading={sending}
          disabled={!body.trim()}
          leftIcon={<Send className="w-4 h-4" />}
        >
          Kirim
        </Button>
      </div>
    </div>
  );
};
