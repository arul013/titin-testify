'use client';

import React from 'react';
import { Music, Layers, Edit2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Passage } from './hooks/useQuestions';

interface PassageTableProps {
  passages: Passage[];
  isLoading: boolean;
  currentUserId?: string;
  currentUserRole?: string;
  onManage: (passage: Passage) => void;
  onEdit: (passage: Passage) => void;
  onDelete: (id: string) => void;
}

export const PassageTable: React.FC<PassageTableProps> = ({
  passages,
  isLoading,
  currentUserId,
  currentUserRole,
  onManage,
  onEdit,
  onDelete,
}) => {
  const isSuperAdmin = currentUserRole === 'super_admin';

  return (
    <div className="overflow-x-auto border border-slate-100 rounded-2xl">
      {isLoading ? (
        <div className="py-20 text-center text-slate-500 font-bold">Memuat data passage...</div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Konten / Ringkasan</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Tipe Passage</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Jumlah Pertanyaan</th>
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Status</th>
              {isSuperAdmin && (
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Pembuat</th>
              )}
              <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {passages.length === 0 ? (
              <tr>
                <td
                  colSpan={isSuperAdmin ? 6 : 5}
                  className="py-12 text-center text-sm text-slate-400 font-medium"
                >
                  Belum ada passage induk yang dibuat.
                </td>
              </tr>
            ) : (
              passages.map((p) => {
                const canModify = isSuperAdmin || p.created_by === currentUserId;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-6 max-w-md">
                      <div className="font-semibold text-slate-800 text-sm line-clamp-2 leading-relaxed">
                        {p.content || (
                          <span className="text-indigo-600 font-bold flex items-center gap-1">
                            <Music className="w-3.5 h-3.5" /> Audio Listening Group
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <Badge variant="info" className="font-extrabold uppercase text-xs">{p.type}</Badge>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="font-bold text-slate-700 text-sm bg-slate-100 px-3 py-1 rounded-xl">
                        {p.questions_count} Soal
                      </span>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      <Badge
                        variant={p.status === 'published' ? 'success' : 'neutral'}
                        className="text-[10px] font-extrabold uppercase"
                      >
                        {p.status}
                      </Badge>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-4 px-6 whitespace-nowrap text-xs font-semibold text-slate-600">
                        {p.creator_name || 'Super Admin'}
                      </td>
                    )}
                    <td className="py-4 px-6 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-2.5">
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-8 py-0 font-bold text-xs"
                          onClick={() => onManage(p)}
                        >
                          <Layers className="w-3.5 h-3.5 mr-1" /> Kelola Soal
                        </Button>
                        {canModify && (
                          <>
                            <button
                              onClick={() => onEdit(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50/40 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDelete(p.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
