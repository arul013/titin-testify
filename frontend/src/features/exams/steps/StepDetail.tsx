'use client';

import React from 'react';
import { Input, Textarea } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { ClockTimePicker } from '@/components/ui/clock-time-picker';
import { CalendarClock, AlertTriangle, Repeat, Gauge, ShieldAlert } from 'lucide-react';
import type { ExamAntiCheat } from '@/features/exams/hooks/useExams';

interface StepDetailProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  duration: string;
  setDuration: (v: string) => void;
  /** Jenis tes + mode → menentukan metode skor & unit nilai kelulusan. */
  testTypeCode: string;
  examMode: 'full' | 'custom';
  passingValue: string;
  setPassingValue: (v: string) => void;
  showReview: boolean;
  setShowReview: (v: boolean) => void;
  allowRetake: boolean;
  setAllowRetake: (v: boolean) => void;
  antiCheat: ExamAntiCheat;
  setAntiCheat: (v: ExamAntiCheat) => void;
  scheduled: boolean;
  setScheduled: (v: boolean) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  startTime: string;
  setStartTime: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  /** Mode terbatas (ujian sudah dikerjakan): kunci durasi/kelulusan/waktu-mulai/retake. */
  locked?: boolean;
}

const digits = (v: string) => v.replace(/[^0-9]/g, '');

/** Waktu mulai (WIB) dianggap "sudah lewat" bila > 5 menit di masa lalu. */
function isStartInPast(date: string, time: string): boolean {
  if (!date) return false;
  const d = new Date(`${date}T${time || '00:00'}:00+07:00`);
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now() - 5 * 60 * 1000;
}

const fieldLabel = 'mb-1.5 block text-sm font-medium text-gray-700';

export const StepDetail: React.FC<StepDetailProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  duration,
  setDuration,
  testTypeCode,
  examMode,
  passingValue,
  setPassingValue,
  showReview,
  setShowReview,
  allowRetake,
  setAllowRetake,
  antiCheat,
  setAntiCheat,
  scheduled,
  setScheduled,
  startDate,
  setStartDate,
  startTime,
  setStartTime,
  endDate,
  setEndDate,
  endTime,
  setEndTime,
  locked = false,
}) => {
  const pastWarning = scheduled && isStartInPast(startDate, startTime);

  // Skor otomatis: Tes Lengkap ITP → skor resmi; selain itu → Nilai 0–100.
  const isOfficialItp = examMode === 'full' && testTypeCode === 'itp';
  const scoringMethod = isOfficialItp ? 'Skor Resmi TOEFL ITP (217–677)' : 'Nilai 0–100';
  const scoringDesc = isOfficialItp
    ? 'Skor dihitung otomatis dengan tabel konversi resmi TOEFL ITP.'
    : 'Skor = (jawaban benar ÷ total soal) × 100, dibulatkan.';
  const passingLabel = isOfficialItp
    ? 'Nilai Kelulusan (skor TOEFL) — opsional'
    : 'Nilai Kelulusan (0–100) — opsional';
  const passingPlaceholder = isOfficialItp ? 'mis. 500' : 'mis. 70';

  return (
    <div className="flex flex-col gap-6">
      {/* Nama + waktu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Input
          label="Nama Ujian"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="mis. Simulasi TOEFL — Structure & Written Expression"
        />
        <Input
          label="Total Waktu (menit)"
          required
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(digits(e.target.value))}
          placeholder="60"
          disabled={locked}
          hint={locked ? 'Terkunci — ujian sudah dikerjakan.' : undefined}
        />
      </div>

      {/* Metode penilaian (otomatis) + nilai kelulusan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <span className={fieldLabel}>Metode Penilaian</span>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-brand shrink-0" />
            <span className="text-sm font-semibold text-slate-700">{scoringMethod}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">{scoringDesc}</p>
        </div>
        <Input
          label={passingLabel}
          inputMode="numeric"
          value={passingValue}
          onChange={(e) => setPassingValue(digits(e.target.value))}
          placeholder={passingPlaceholder}
          disabled={locked}
          hint={locked ? 'Terkunci — ujian sudah dikerjakan.' : 'Kosongkan bila tak memakai ambang lulus.'}
        />
      </div>

      <Textarea
        label="Deskripsi (opsional)"
        rows={3}
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        placeholder="Catatan singkat tentang ujian ini…"
      />

      {/* Jadwal (opsional, WIB) */}
      <div className="border border-slate-200/70 rounded-2xl p-5 bg-white shadow-sm shadow-slate-100/60 flex flex-col gap-4">
        <Checkbox
          checked={scheduled}
          onChange={setScheduled}
          disabled={locked}
          label={
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
              <CalendarClock className="w-4 h-4 text-indigo-600" /> Tetapkan jadwal ujian (WIB)
            </span>
          }
          description="Bila tidak dicentang, ujian bisa diakses kapan saja setelah ditayangkan."
        />

        {scheduled && (
          <div className="flex flex-col gap-4 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
              <div className={locked ? 'pointer-events-none opacity-60' : ''}>
                <span className={fieldLabel}>
                  Waktu Mulai (WIB){locked && <span className="ml-1 text-[11px] font-normal text-slate-400">· terkunci</span>}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={startDate} onChange={setStartDate} placeholder="Tanggal" />
                  <ClockTimePicker value={startTime} onChange={setStartTime} placeholder="Jam" />
                </div>
              </div>
              <div>
                <span className={fieldLabel}>
                  Waktu Selesai (WIB, opsional)
                  {locked && <span className="ml-1 text-[11px] font-normal text-emerald-600">· hanya bisa diperpanjang</span>}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <DatePicker value={endDate} onChange={setEndDate} placeholder="Tanggal" />
                  <ClockTimePicker value={endTime} onChange={setEndTime} placeholder="Jam" />
                </div>
              </div>
            </div>

            {pastWarning && (
              <div className="flex gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Waktu mulai sudah lewat. Masih bisa disimpan sebagai draf, tapi saat
                  <strong> Tayangkan</strong> waktu mulai tidak boleh lebih dari 5 menit yang lalu.
                </span>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Semua waktu dihitung dalam <strong>WIB (GMT+7)</strong>, tidak tergantung lokasi admin
              maupun peserta.
            </p>
          </div>
        )}
      </div>

      {/* Opsi pengerjaan (tanpa pengacakan — ujian deterministik) */}
      <div className="border border-slate-200/70 rounded-2xl p-5 bg-white shadow-sm shadow-slate-100/60 flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Repeat className="w-4 h-4 text-indigo-600" /> Opsi Pengerjaan
        </p>
        <Checkbox
          checked={allowRetake}
          onChange={setAllowRetake}
          disabled={locked}
          label="Izinkan mengerjakan ulang"
          description="Bila mati, peserta hanya bisa mengerjakan sekali."
        />
        <Checkbox
          checked={showReview}
          onChange={setShowReview}
          label="Tampilkan pembahasan & kunci jawaban setelah selesai"
          description={
            isOfficialItp
              ? 'Hati-hati: untuk Tes Lengkap resmi, membuka kunci berisiko bocor (soal peserta sama).'
              : 'Peserta bisa melihat jawaban benar + pembahasan di Riwayat setelah mengumpulkan.'
          }
        />
      </div>

      {/* M8: Anti-cheat (opt-in) */}
      <div className="border border-slate-200/70 rounded-2xl p-5 bg-white shadow-sm shadow-slate-100/60 flex flex-col gap-4">
        <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-indigo-600" /> Pengawasan Integritas (Anti-Cheat)
        </p>
        <p className="-mt-2 text-xs text-slate-400">
          Opsional. Langkah aktif akan diumumkan ke peserta di layar pra-ujian. Deteksi bersifat bantuan
          (bukan jaminan mutlak) dan tercatat untuk peninjauan.
        </p>
        <Checkbox
          checked={!!antiCheat.track_focus}
          onChange={(v) => setAntiCheat({ ...antiCheat, track_focus: v })}
          label="Pantau perpindahan tab / keluar layar ujian"
          description="Mendeteksi peserta berpindah tab atau aplikasi lain."
        />
        {antiCheat.track_focus && (
          <div className="ml-7">
            <Checkbox
              checked={antiCheat.on_focus_loss === 'submit'}
              onChange={(v) =>
                setAntiCheat({ ...antiCheat, on_focus_loss: v ? 'submit' : 'warn', focus_strikes: 1 })
              }
              label="Kumpulkan ujian otomatis setelah 1 peringatan"
              description="Pelanggaran pertama → peringatan; pelanggaran kedua → ujian dikumpulkan. Bila mati, hanya diperingatkan & dicatat."
            />
          </div>
        )}
        <Checkbox
          checked={!!antiCheat.require_fullscreen}
          onChange={(v) => setAntiCheat({ ...antiCheat, require_fullscreen: v })}
          label="Wajib mode layar penuh"
          description="Ujian harus dikerjakan dalam layar penuh; keluar akan diperingatkan."
        />
        <Checkbox
          checked={!!antiCheat.block_copy_paste}
          onChange={(v) => setAntiCheat({ ...antiCheat, block_copy_paste: v })}
          label="Blokir salin / tempel & klik-kanan"
          description="Seleksi teks untuk membaca tetap diizinkan."
        />
        <Checkbox
          checked={!!antiCheat.detect_multi_screen}
          onChange={(v) => setAntiCheat({ ...antiCheat, detect_multi_screen: v })}
          label="Larang layar / monitor ganda"
          description="Deteksi layar kedua saat mulai (perlu izin browser; tak 100%)."
        />
        <Checkbox
          checked={!!antiCheat.single_session}
          onChange={(v) => setAntiCheat({ ...antiCheat, single_session: v })}
          label="Satu sesi aktif"
          description="Bila ujian dibuka di perangkat/tab lain, sesi sebelumnya dikunci."
        />

        {(antiCheat.track_focus || antiCheat.require_fullscreen) && (
          <div className="border-t border-slate-100 pt-4">
            <label className={fieldLabel}>Auto-kumpul setelah sekian pelanggaran (opsional)</label>
            <Input
              value={antiCheat.max_violations ? String(antiCheat.max_violations) : ''}
              inputMode="numeric"
              placeholder="mis. 3 — kosongkan untuk mematikan"
              className="max-w-xs"
              onChange={(e) => {
                const n = Number(digits(e.target.value).slice(0, 3));
                setAntiCheat({ ...antiCheat, max_violations: n });
              }}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Ujian dikumpulkan otomatis bila total pelanggaran serius (keluar layar/fullscreen)
              mencapai angka ini. Kosong/0 = mati.
            </p>
          </div>
        )}

        {/* M8.4: kamera pengawasan */}
        <div className="border-t border-slate-100 pt-4">
          <Checkbox
            checked={!!antiCheat.camera_capture?.enabled}
            onChange={(v) =>
              setAntiCheat({
                ...antiCheat,
                camera_capture: { ...(antiCheat.camera_capture ?? {}), enabled: v },
              })
            }
            label="Kamera pengawasan (foto berkala)"
            description="Peserta wajib mengaktifkan kamera; foto diambil berkala (bukan rekam video) untuk verifikasi integritas. Butuh persetujuan peserta + penyimpanan (R2)."
          />
          {antiCheat.camera_capture?.enabled && (
            <div className="ml-7 mt-3">
              <label className={fieldLabel}>Interval foto (detik)</label>
              <Input
                value={String(antiCheat.camera_capture?.interval_sec ?? 60)}
                inputMode="numeric"
                placeholder="60"
                className="max-w-xs"
                onChange={(e) => {
                  const n = Number(digits(e.target.value).slice(0, 3)) || 60;
                  setAntiCheat({
                    ...antiCheat,
                    camera_capture: { ...(antiCheat.camera_capture ?? {}), enabled: true, interval_sec: n },
                  });
                }}
              />
              <p className="mt-1.5 text-xs text-slate-400">Antara 15–600 detik. Default 60.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
