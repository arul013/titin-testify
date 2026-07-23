"use client";

import React from "react";
import { Download, MessageSquare } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GeneratedUser } from "./hooks/useUsers";

interface GenerateUsersModalProps {
  open: boolean;
  quantity: number;
  names: string[];
  isGenerating: boolean;
  list: GeneratedUser[] | null;
  onClose: () => void;
  onQuantityChange: (val: number) => void;
  onNameChange: (index: number, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const GenerateUsersModal: React.FC<GenerateUsersModalProps> = ({
  open,
  quantity,
  names,
  isGenerating,
  list,
  onClose,
  onQuantityChange,
  onNameChange,
  onSubmit,
}) => {
  const handleDownloadCSV = () => {
    if (!list || list.length === 0) return;
    const headers = "Nama Lengkap,Username,Password\r\n";
    const rows = list
      .map((u) => `"${u.full_name}","${u.username}","${u.password}"`)
      .join("\r\n");

    // UTF-8 BOM (﻿) agar Microsoft Excel mendeteksi encoding UTF-8 otomatis
    const csvContent = "﻿" + headers + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `kredensial_peserta_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareWA = (u: GeneratedUser) => {
    const appUrl = window.location.origin;
    const text = `Halo *${u.full_name}*,\n\nBerikut kredensial akun ujian CBT Titin Testify Anda:\n\n*Username:* ${u.username}\n*Password:* ${u.password}\n*Link Ujian:* ${appUrl}\n\nSelamat menempuh ujian!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Akun Peserta Ujian (Masal)"
      size={list ? "lg" : "md"}
      closeOnBackdrop={!isGenerating && !list}
    >
      {!list ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            Masukkan nama lengkap peserta ujian di bawah ini. Username dan
            password akan secara otomatis dibuat untuk masing-masing peserta.
          </p>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-semibold text-gray-700">
              Jumlah Peserta
            </label>
            <Input
              inputMode="numeric"
              value={String(quantity)}
              onChange={(e) => {
                const d = e.target.value.replace(/[^0-9]/g, "");
                onQuantityChange(
                  d === "" ? 1 : Math.min(50, Math.max(1, parseInt(d, 10))),
                );
              }}
              required
              disabled={isGenerating}
            />
          </div>

          {/* Dynamic Inputs for Full Names */}
          <div className="flex flex-col gap-3 max-h-62.5 overflow-y-auto border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              Daftar Nama Peserta
            </p>
            {names.map((name, index) => (
              <Input
                key={index}
                type="text"
                placeholder={`Nama Lengkap Peserta ${index + 1}`}
                value={name}
                onChange={(e) => onNameChange(index, e.target.value)}
                required
                disabled={isGenerating}
                className="w-full"
                containerClassName="w-full"
              />
            ))}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-150 pt-4 mt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="font-bold"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isGenerating}
              className="font-bold"
            >
              Mulai Generate
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-sm flex gap-3">
            <div className="w-5 h-5 bg-emerald-500 rounded-full text-white flex items-center justify-center shrink-0 font-bold">
              ✓
            </div>
            <div>
              <p className="font-bold">Generate Akun Sukses!</p>
              <p className="mt-1 text-xs text-emerald-600 leading-relaxed">
                Berhasil membuat <strong>{list.length}</strong> akun peserta
                baru. Silakan unduh daftar kredensial berikut untuk dibagikan.
              </p>
            </div>
          </div>

          {/* Scrollable credentials view */}
          <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-75 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-gray-500 uppercase border-b border-slate-150 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5">Nama Lengkap</th>
                  <th className="px-4 py-2.5">Username</th>
                  <th className="px-4 py-2.5">Password</th>
                  <th className="px-4 py-2.5">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((u, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {u.full_name}
                    </td>
                    <td className="px-4 py-3 text-indigo-600 font-mono">
                      @{u.username}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 bg-slate-50/50 select-all rounded-md">
                      {u.password}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShareWA(u)}
                        className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg flex items-center gap-1 text-xs"
                        leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                      >
                        Kirim WA
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center border-t border-slate-150 pt-4 mt-2">
            <Button
              variant="secondary"
              onClick={handleDownloadCSV}
              className="font-bold gap-2"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Unduh File CSV
            </Button>
            <Button variant="primary" onClick={onClose} className="font-bold">
              Selesai & Tutup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
