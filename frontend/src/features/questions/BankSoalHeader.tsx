'use client';

import React from 'react';

/** Judul halaman Bank Soal — berdiri sendiri (aksi ada di BankSoalToolbar). */
export const BankSoalHeader: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-heading">
        Bank Soal
      </h1>
      <p className="text-gray-500 mt-1.5 font-medium">
        Tempat mengelola semua soal ujian — baik soal yang berdiri sendiri maupun soal
        yang berbagi teks bacaan atau audio yang sama.
      </p>
    </div>
  );
};
