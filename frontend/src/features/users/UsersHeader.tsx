'use client';

import React from 'react';

/** Judul halaman Manajemen User — berdiri sendiri (aksi ada di UsersToolbar). */
export const UsersHeader: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight font-heading">
        Manajemen User
      </h1>
      <p className="text-gray-500 mt-1.5 font-medium">
        Kelola dan generate akun pengguna terdaftar pada sistem CBT Titin Testify.
      </p>
    </div>
  );
};
