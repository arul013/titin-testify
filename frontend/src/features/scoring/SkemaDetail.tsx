'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gauge, Calculator, Lock, Sparkles, Info } from 'lucide-react';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useTestTypes } from '@/features/test-types/useTestTypes';

const digits = (v: string) => v.replace(/[^0-9]/g, '');

interface ItpResult {
  score: number;
  converted: { listening: number; structure_we: number; reading: number };
}

const MAX = { listening: 50, structure_we: 40, reading: 50 };

function clampField(field: keyof typeof MAX, raw: string): string {
  const d = digits(raw);
  if (d === '') return '';
  return String(Math.min(MAX[field], Number(d)));
}

interface SkemaDetailProps {
  code: string;
}

/** Halaman skema penilaian untuk satu jenis tes. Untuk ITP: info + kalkulator. */
export function SkemaDetail({ code }: SkemaDetailProps) {
  const router = useRouter();
  const { testTypes, isLoading } = useTestTypes();

  const testType = testTypes.find((t) => t.code === code) ?? null;
  const invalid = !isLoading && (!testType || testType.status !== 'active');

  // Redirect ke gerbang bila jenis tes tak valid / tak aktif.
  useEffect(() => {
    if (invalid) router.replace('/skema-penilaian');
  }, [invalid, router]);

  const backToGate = () => router.push('/skema-penilaian');

  if (isLoading || !testType || testType.status !== 'active') {
    return (
      <PageContainer
        className="space-y-6"
        header={<PageHeader icon={<Gauge />} title="Skema Penilaian" onBack={backToGate} backLabel="Semua Jenis Tes" />}
      >
        <Card className="p-6 rounded-3xl">
          <Skeleton className="h-6 w-40 mb-3" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </Card>
      </PageContainer>
    );
  }

  const isItp = testType.code === 'itp';

  return (
    <PageContainer
      className="space-y-6"
      header={
        <PageHeader
          icon={<Gauge />}
          title={`Skema Penilaian — ${testType.name}`}
          subtitle="Cara ujian jenis tes ini dinilai — ditentukan otomatis oleh mode ujian (Tes Lengkap / Latihan)."
          onBack={backToGate}
          backLabel="Semua Jenis Tes"
        />
      }
    >
      {/* Cara penilaian */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-6 rounded-3xl flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-800">Tes Lengkap</h3>
              <p className="text-xs text-slate-400">Komposisi resmi & terkunci</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {isItp ? (
              <>
                Memakai <strong>tabel konversi resmi TOEFL ITP</strong> → skor <strong>217–677</strong>.
              </>
            ) : (
              <>
                Skor resmi jenis tes ini <strong>belum tersedia</strong> — sementara memakai{' '}
                <strong>Nilai 0–100</strong>.
              </>
            )}
          </p>
        </Card>

        <Card className="p-6 rounded-3xl flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-800">Latihan</h3>
              <p className="text-xs text-slate-400">Komposisi bebas</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Memakai <strong>Nilai 0–100</strong> = (jawaban benar ÷ total soal) × 100, dibulatkan.
          </p>
        </Card>
      </div>

      {/* Kalkulator TOEFL ITP (hanya untuk ITP) */}
      {isItp && <ItpCalculator />}
    </PageContainer>
  );
}

function ItpCalculator() {
  const [listening, setListening] = useState('');
  const [structureWe, setStructureWe] = useState('');
  const [reading, setReading] = useState('');
  const [result, setResult] = useState<ItpResult | null>(null);
  const [computing, setComputing] = useState(false);

  const hitung = async () => {
    setComputing(true);
    try {
      const res = await api.request<ItpResult>('/api/scoring/toefl-itp', {
        method: 'POST',
        body: JSON.stringify({
          listening: Number(listening || 0),
          structure_we: Number(structureWe || 0),
          reading: Number(reading || 0),
        }),
      });
      setResult(res);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menghitung skor.'));
    } finally {
      setComputing(false);
    }
  };

  const rows: { key: keyof typeof MAX; label: string; value: string; set: (v: string) => void }[] = [
    { key: 'listening', label: 'Listening', value: listening, set: setListening },
    { key: 'structure_we', label: 'Structure & Written Expression', value: structureWe, set: setStructureWe },
    { key: 'reading', label: 'Reading', value: reading, set: setReading },
  ];

  return (
    <Card className="p-6 md:p-7 rounded-3xl flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-brand" />
        <h2 className="text-base font-extrabold text-slate-800">Kalkulator Skor TOEFL ITP</h2>
      </div>
      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3 leading-relaxed">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
        <span>
          Masukkan jumlah jawaban <strong>benar</strong> per grup. Structure &amp; Written Expression
          digabung (maks 40). Skor akhir = (jumlah konversi × 10) ÷ 3.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rows.map((r) => (
          <Input
            key={r.key}
            label={`${r.label} (0–${MAX[r.key]})`}
            inputMode="numeric"
            value={r.value}
            onChange={(e) => r.set(clampField(r.key, e.target.value))}
            placeholder="0"
          />
        ))}
      </div>

      <Button
        variant="primary"
        onClick={hitung}
        loading={computing}
        leftIcon={<Calculator className="w-4 h-4" />}
        className="self-start font-bold"
      >
        Hitung Skor
      </Button>

      {result && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Listening', conv: result.converted.listening },
              { label: 'Structure & WE', conv: result.converted.structure_we },
              { label: 'Reading', conv: result.converted.reading },
            ].map((g) => (
              <div key={g.label} className="rounded-xl bg-white border border-slate-100 p-3 text-center">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{g.label}</p>
                <p className="text-2xl font-extrabold text-brand tabular-nums mt-0.5">{g.conv}</p>
                <p className="text-[10px] text-slate-400">konversi</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200/60 pt-4">
            <span className="text-sm font-bold text-slate-600">Skor TOEFL ITP</span>
            <span className="text-3xl font-extrabold text-slate-800 tabular-nums">{result.score}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
