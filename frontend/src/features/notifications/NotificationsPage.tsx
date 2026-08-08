"use client";

import { useRouter } from "next/navigation";
import {
  Bell,
  ClipboardList,
  CalendarClock,
  AlarmClock,
  Award,
  CheckCheck,
  MessageSquarePlus,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/cn";
import {
  useNotifications,
  type AppNotification,
} from "@/features/notifications/useNotifications";

const META: Record<string, { icon: React.ReactNode; tone: string }> = {
  exam_assigned: {
    icon: <ClipboardList className="h-5 w-5" />,
    tone: "bg-brand/10 text-brand",
  },
  exam_opening: {
    icon: <CalendarClock className="h-5 w-5" />,
    tone: "bg-blue-50 text-blue-600",
  },
  exam_closing: {
    icon: <AlarmClock className="h-5 w-5" />,
    tone: "bg-amber-50 text-amber-600",
  },
  result_ready: {
    icon: <Award className="h-5 w-5" />,
    tone: "bg-emerald-50 text-emerald-600",
  },
  feedback_created: {
    icon: <MessageSquarePlus className="h-5 w-5" />,
    tone: "bg-brand/10 text-brand",
  },
  feedback_status_changed: {
    icon: <RefreshCw className="h-5 w-5" />,
    tone: "bg-amber-50 text-amber-600",
  },
  feedback_commented: {
    icon: <MessageSquare className="h-5 w-5" />,
    tone: "bg-blue-50 text-blue-600",
  },
};

function relTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
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

export function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, markRead, markAllRead } =
    useNotifications();

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead(n.id);
    if (n.entity_type === "feedback") {
      router.push(n.entity_id ? `/masukan/${n.entity_id}` : "/masukan");
    } else if (n.type === "result_ready" && n.entity_id) {
      router.push(`/ujian/hasil/${n.entity_id}`);
    } else {
      router.push("/ujian");
    }
  };

  return (
    <PageContainer
      className="space-y-6 pb-16"
      header={
        <PageHeader
          icon={<Bell />}
          title="Notifikasi"
          subtitle="Pemberitahuan ujian yang ditugaskan, pengingat jadwal, dan hasil penilaian."
          actions={
            unreadCount > 0 ? (
              <Button
                variant="secondary"
                className="font-bold"
                leftIcon={<CheckCheck className="h-4 w-4" />}
                onClick={markAllRead}
              >
                Tandai semua dibaca
              </Button>
            ) : undefined
          }
        />
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="Belum ada notifikasi"
          description="Pemberitahuan tentang ujian & hasil akan muncul di sini."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((n) => {
            const meta = META[n.type] ?? {
              icon: <Bell className="h-5 w-5" />,
              tone: "bg-slate-100 text-slate-500",
            };
            const unread = !n.read_at;
            return (
              <Card
                key={n.id}
                variant="interactive"
                onClick={() => open(n)}
                className={cn(
                  "flex cursor-pointer items-start gap-3.5 rounded-2xl p-4 transition-shadow hover:shadow-md",
                  unread && "bg-brand/3 ring-1 ring-brand/10",
                )}
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
                    meta.tone,
                  )}
                >
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3
                      className={cn(
                        "text-sm text-slate-800",
                        unread ? "font-extrabold" : "font-bold",
                      )}
                    >
                      {n.title}
                    </h3>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {relTime(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">
                      {n.body}
                    </p>
                  )}
                </div>
                {unread && (
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
