'use client';

import React from 'react';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ClipboardList, Clock, ArrowRight, Award } from 'lucide-react';

export default function UjianPage() {
  const { user } = useAuth();

  // Mock list of active exams
  const exams = [
    {
      id: '1',
      title: 'Ujian Akhir Semester Genap — Bahasa Inggris',
      duration: '90 Menit',
      questionsCount: 40,
      status: 'Belum Dimulai',
      badgeColor: 'warning' as const,
    },
    {
      id: '2',
      title: 'Latihan Ujian Mandiri — Listening & Reading Comprehension',
      duration: '120 Menit',
      questionsCount: 50,
      status: 'Selesai',
      badgeColor: 'success' as const,
      score: 88,
    }
  ];

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white p-8 md:p-10 shadow-xl shadow-indigo-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-6 translate-x-6 w-64 h-64 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10">
          <Badge className="bg-white/20 text-white hover:bg-white/30 border-none px-3 py-1 font-bold text-xs uppercase tracking-wider mb-4">
            Peserta CBT
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold font-heading text-white">
            Selamat Datang, {user?.full_name}!
          </h1>
          <p className="text-indigo-100/90 mt-2 max-w-xl text-sm leading-relaxed">
            Halaman ini adalah lembar dashboard ujian Anda. Pilih ujian aktif yang tersedia di bawah ini untuk memulai.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Ujian Aktif Hari Ini
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <Card
                key={exam.id}
                className="bg-white border border-slate-100 shadow-md shadow-slate-100/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 md:p-8 flex flex-col justify-between h-full rounded-2xl"
                variant="interactive"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <Badge variant={exam.badgeColor}>
                      {exam.status}
                    </Badge>
                    {exam.score !== undefined && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-xl">
                        <Award className="w-3.5 h-3.5" />
                        Nilai: {exam.score}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-slate-800 text-lg leading-snug line-clamp-2 mb-4">
                    {exam.title}
                  </h3>

                  <div className="flex items-center gap-5 text-slate-500 text-xs mb-6">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {exam.duration}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4 text-slate-400" />
                      {exam.questionsCount} Soal
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                  {exam.status === 'Belum Dimulai' ? (
                    <Button
                      variant="primary"
                      className="w-full font-bold shadow-md shadow-indigo-150 active:scale-[0.98] group flex items-center justify-center gap-2"
                    >
                      Mulai Ujian
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled
                      className="w-full font-bold bg-slate-100 text-slate-400 cursor-not-allowed"
                    >
                      Ujian Telah Selesai
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
