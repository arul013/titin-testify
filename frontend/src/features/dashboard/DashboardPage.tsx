"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Library,
  Users,
  Hourglass,
  ShieldAlert,
  BarChart3,
  Plus,
  ChevronRight,
  SquarePen,
  CheckCircle2,
  TrendingUp,
  History,
  UserCog,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/src/lib/cn";
import { useDashboard, type DashboardSummary } from "./useDashboard";

/** Delay masuk berjenjang (stagger) untuk animasi fade-up. */
const stagger = (i: number): React.CSSProperties => ({
  animationDelay: `${i * 70}ms`,
});

// ─── Kartu KPI ───────────────────────────────────────────────
type Tone = { chip: string; glow: string };
const TONES: Record<string, Tone> = {
  brand: { chip: "bg-brand/10 text-brand", glow: "bg-brand/20" },
  blue: { chip: "bg-blue-50 text-blue-600", glow: "bg-blue-300/30" },
  emerald: {
    chip: "bg-emerald-50 text-emerald-600",
    glow: "bg-emerald-300/30",
  },
  amber: { chip: "bg-amber-50 text-amber-600", glow: "bg-amber-300/30" },
  slate: { chip: "bg-slate-100 text-slate-500", glow: "bg-slate-300/20" },
};

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "brand",
  index,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: keyof typeof TONES;
  index: number;
  onClick?: () => void;
}) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={stagger(index)}
      className={cn(
        "group animate-fade-up relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 text-left shadow-sm shadow-slate-200/40 transition-all duration-300",
        onClick
          ? "cursor-pointer hover:-translate-y-1 hover:border-brand/20 hover:shadow-xl hover:shadow-slate-200/70"
          : "cursor-default",
      )}
    >
      {/* glow halus saat hover */}
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100",
          t.glow,
        )}
      />
      <div className="relative flex items-start justify-between">
        <span
          className={cn(
            "grid h-11 w-11 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105",
            t.chip,
          )}
        >
          {icon}
        </span>
        {onClick && (
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
        )}
      </div>
      <p className="relative mt-4 text-3xl font-extrabold tabular-nums leading-none text-slate-900">
        {value}
      </p>
      <p className="relative mt-1.5 text-sm font-bold text-slate-600">
        {label}
      </p>
      {sub && <p className="relative mt-0.5 text-xs text-slate-400">{sub}</p>}
    </button>
  );
}

// ─── Halaman ─────────────────────────────────────────────────
export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const router = useRouter();

  if (!user) return null;

  const firstName = user.full_name?.split(" ")[0] || user.full_name;

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="animate-fade-up flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">
            <Sparkles className="h-3 w-3" /> {user.role.replace("_", " ")}
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">
            Halo,{" "}
            <span className="bg-linear-to-r from-brand-start to-brand-end bg-clip-text text-transparent">
              {firstName}
            </span>
            <span className="text-slate-300"> 👋</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Ringkasan aktivitas CBT yang kamu kelola.
          </p>
        </div>
      </div>

      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <Sections
          data={data}
          isSuper={user.role === "super_admin"}
          router={router}
        />
      )}
    </div>
  );
}

function Sections({
  data,
  isSuper,
  router,
}: {
  data: DashboardSummary;
  isSuper: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const go = (path: string) => () => router.push(path);

  return (
    <>
      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          icon={<ClipboardCheck className="h-5.5 w-5.5" />}
          label="Ujian"
          value={data.exams.total}
          sub={`${data.exams.published} tayang · ${data.exams.draft} draf`}
          onClick={go("/manajemen-ujian")}
        />
        <StatCard
          index={1}
          tone="blue"
          icon={<Library className="h-5.5 w-5.5" />}
          label="Bank Soal"
          value={data.questions.total}
          sub={`${data.questions.published} tayang · ${data.passages_total} materi`}
          onClick={go("/bank-soal")}
        />
        <StatCard
          index={2}
          tone="emerald"
          icon={<Users className="h-5.5 w-5.5" />}
          label="Peserta & Grup"
          value={data.participants_total}
          sub={`${data.groups_total} grup/kelas`}
        />
        <StatCard
          index={3}
          tone={data.pending_grading > 0 ? "amber" : "slate"}
          icon={<Hourglass className="h-5.5 w-5.5" />}
          label="Menunggu Penilaian"
          value={data.pending_grading}
          sub={data.pending_grading > 0 ? "Perlu dinilai" : "Tak ada antrean"}
          onClick={data.pending_grading > 0 ? go("/penilaian") : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Ujian aktif */}
        <section
          style={stagger(4)}
          className="animate-fade-up rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40 lg:col-span-2"
        >
          <header className="mb-5 flex items-center justify-between">
            <h3 className="font-heading text-lg font-extrabold text-slate-900">
              Ujian Aktif
            </h3>
            <button
              onClick={go("/manajemen-ujian")}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand transition-colors hover:text-brand-end"
            >
              Semua ujian <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </header>
          {data.active_exams.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-8 w-8" />}
              title="Belum ada ujian tayang"
              description="Ujian yang sedang tayang akan muncul di sini beserta progres pesertanya."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.active_exams.map((e) => {
                const pct =
                  e.participants > 0
                    ? Math.round((e.submitted / e.participants) * 100)
                    : 0;
                return (
                  <button
                    key={e.exam_id}
                    onClick={() =>
                      router.push(`/manajemen-ujian/${e.exam_id}/hasil`)
                    }
                    className="group flex items-center gap-4 rounded-2xl border border-slate-100 p-4 text-left transition-all duration-200 hover:border-brand/25 hover:bg-slate-50/70 hover:shadow-sm"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                      <ClipboardCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="truncate font-bold text-slate-800">
                          {e.title}
                        </h4>
                        {e.avg_score != null && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                            <TrendingUp className="h-3 w-3" />{" "}
                            {Math.round(e.avg_score)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-brand-start to-brand-end transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">
                          {e.submitted}/{e.participants}
                        </span>
                      </div>
                    </div>
                    <BarChart3 className="h-4.5 w-4.5 shrink-0 text-slate-300 transition-colors group-hover:text-brand" />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Perlu tindakan + aksi cepat */}
        <div className="flex flex-col gap-5">
          <section
            style={stagger(5)}
            className="animate-fade-up rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40"
          >
            <h3 className="mb-4 font-heading text-lg font-extrabold text-slate-900">
              Perlu Tindakan
            </h3>
            <div className="flex flex-col gap-2.5">
              {data.pending_grading > 0 && (
                <ActionItem
                  icon={<SquarePen className="h-4 w-4" />}
                  tone="bg-amber-50 text-amber-600"
                  title={`${data.pending_grading} jawaban menunggu dinilai`}
                  onClick={go("/penilaian")}
                />
              )}
              {data.flagged_attempts > 0 && (
                <ActionItem
                  icon={<ShieldAlert className="h-4 w-4" />}
                  tone="bg-red-50 text-red-500"
                  title={`${data.flagged_attempts} percobaan berpelanggaran`}
                  onClick={go("/manajemen-ujian")}
                />
              )}
              {data.pending_grading === 0 && data.flagged_attempts === 0 && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50/70 px-4 py-3.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4.5 w-4.5" /> Semua beres — tak ada
                  yang perlu ditindak.
                </div>
              )}
            </div>
          </section>

          <section
            style={stagger(6)}
            className="animate-fade-up rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40"
          >
            <h3 className="mb-4 font-heading text-lg font-extrabold text-slate-900">
              Aksi Cepat
            </h3>
            <div className="flex flex-col gap-1">
              <QuickLink
                icon={<Plus className="h-4 w-4" />}
                label="Buat Ujian"
                onClick={go("/manajemen-ujian")}
              />
              <QuickLink
                icon={<Library className="h-4 w-4" />}
                label="Bank Soal"
                onClick={go("/bank-soal")}
              />
              <QuickLink
                icon={<SquarePen className="h-4 w-4" />}
                label="Penilaian"
                onClick={go("/penilaian")}
              />
              {isSuper && (
                <QuickLink
                  icon={<Users className="h-4 w-4" />}
                  label="Manajemen User"
                  onClick={go("/users")}
                />
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Super Admin */}
      {isSuper && data.users && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <UsersCard users={data.users} onManage={go("/users")} />
          <AuditCard items={data.audit_recent ?? []} />
        </div>
      )}
    </>
  );
}

function UsersCard({
  users,
  onManage,
}: {
  users: NonNullable<DashboardSummary["users"]>;
  onManage: () => void;
}) {
  const activePct =
    users.total > 0 ? Math.round((users.active / users.total) * 100) : 0;
  return (
    <section
      style={stagger(7)}
      className="animate-fade-up rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40"
    >
      <header className="mb-4 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-heading text-lg font-extrabold text-slate-900">
          <UserCog className="h-5 w-5 text-brand" /> Pengguna
        </h3>
        <button
          onClick={onManage}
          className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-end"
        >
          Kelola <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </header>
      <div className="flex items-end gap-2">
        <p className="text-4xl font-extrabold tabular-nums leading-none text-slate-900">
          {users.total}
        </p>
        <p className="pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          total akun
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
          <p className="text-lg font-extrabold tabular-nums text-slate-800">
            {users.admins}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">Admin</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
          <p className="text-lg font-extrabold tabular-nums text-slate-800">
            {users.participants}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">Peserta</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
          <span className="text-emerald-600">{users.active} aktif</span>
          <span className="text-slate-400">{users.inactive} nonaktif</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${activePct}%` }}
          />
        </div>
      </div>
    </section>
  );
}

// action → warna titik + label ramah
const ACTION_META: Record<string, { dot: string }> = {
  create: { dot: "bg-emerald-500" },
  update: { dot: "bg-amber-500" },
  delete: { dot: "bg-red-500" },
  publish: { dot: "bg-blue-500" },
  unpublish: { dot: "bg-slate-400" },
  duplicate: { dot: "bg-violet-500" },
  reset: { dot: "bg-orange-500" },
};
function actionDot(action: string): string {
  const key = Object.keys(ACTION_META).find((k) => action.includes(k));
  return key ? ACTION_META[key].dot : "bg-slate-300";
}

function auditRelTime(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function AuditCard({
  items,
}: {
  items: NonNullable<DashboardSummary["audit_recent"]>;
}) {
  return (
    <section
      style={stagger(8)}
      className="animate-fade-up rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/40 lg:col-span-2"
    >
      <h3 className="mb-4 inline-flex items-center gap-2 font-heading text-lg font-extrabold text-slate-900">
        <History className="h-5 w-5 text-brand" /> Aktivitas Sistem
      </h3>
      {items.length === 0 ? (
        <EmptyState
          icon={<History className="h-8 w-8" />}
          title="Belum ada aktivitas"
          description="Aksi admin (buat/ubah/hapus) akan tercatat di sini."
        />
      ) : (
        <ol className="relative flex flex-col">
          {/* garis penghubung */}
          <span
            className="absolute left-1.25 top-2 bottom-2 w-px bg-slate-100"
            aria-hidden
          />
          {items.map((a, i) => (
            <li
              key={i}
              className="relative flex items-start gap-3.5 py-2.5 pl-0"
            >
              <span
                className={cn(
                  "relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white",
                  actionDot(a.action),
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">
                  {a.summary || a.action}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="font-bold text-slate-500">
                    {a.actor_name || "Sistem"}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    · {a.action}
                  </span>
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-slate-400">
                {auditRelTime(a.created_at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ActionItem({
  icon,
  tone,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition-all duration-200 hover:border-brand/25 hover:bg-slate-50/70"
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          tone,
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold text-slate-700">
        {title}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
    </button>
  );
}

function QuickLink({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-brand"
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-brand/10 group-hover:text-brand">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight className="h-4 w-4 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );
}
