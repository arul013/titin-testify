'use client';

import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  return (
    <header className="h-[64px] border-b border-gray-200/50 bg-white/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 lg:hidden">
      {/* Left side: toggle mobile menu or breadcrumb */}
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-sm font-bold text-gray-800 font-heading tracking-wide uppercase hidden sm:block">
          Titin Testify
        </h2>
      </div>
    </header>
  );
};
