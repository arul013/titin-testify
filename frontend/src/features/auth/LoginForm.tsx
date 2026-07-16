'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './hooks/useAuth';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { motion } from 'framer-motion';
import { toast } from '../../components/ui/toast';

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { login } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    let anim: any = null;
    let isMounted = true;
    
    // Load lottie-web dynamically from CDN to prevent bundle bloating
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
    script.async = true;
    script.onload = () => {
      const lottieInstance = (window as any).lottie;
      if (lottieInstance && containerRef.current && isMounted) {
        anim = lottieInstance.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '/login_image.json',
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      isMounted = false;
      if (anim) {
        anim.destroy();
      }
      document.body.removeChild(script);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loggedInUser = await login({ username, password });
      
      if (loggedInUser.force_change_password) {
        router.push('/change-password');
      } else if (loggedInUser.role === 'peserta') {
        router.push('/ujian');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Username atau password salah';
      setError(errMsg);
      setShakeKey((prev) => prev + 1);
      toast.error('Gagal Masuk', {
        description: errMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Hidden SVG defining the brand gradient */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="lottie-indigo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#9333ea" />
          </linearGradient>
        </defs>
      </svg>

      {/* Style override to color lottie body path with the gradient */}
      <style>{`
        .lottie-gradient-svg svg [fill^="#00" i],
        .lottie-gradient-svg svg [fill^="#00" i] path,
        .lottie-gradient-svg svg [fill^="rgb(0" i],
        .lottie-gradient-svg svg [fill^="rgb(0" i] path,
        .lottie-gradient-svg svg [style*="fill: #00" i],
        .lottie-gradient-svg svg [style*="fill: #00" i] path,
        .lottie-gradient-svg svg [style*="fill:#00" i],
        .lottie-gradient-svg svg [style*="fill:#00" i] path,
        .lottie-gradient-svg svg [style*="fill: rgb(0" i],
        .lottie-gradient-svg svg [style*="fill: rgb(0" i] path,
        .lottie-gradient-svg svg [style*="fill:rgb(0" i],
        .lottie-gradient-svg svg [style*="fill:rgb(0" i] path {
          fill: url(#lottie-indigo-gradient) !important;
        }
      `}</style>

      {/* Lottie Animation serving as an character above the card table */}
      <div ref={containerRef} className="w-80 h-64 -mb-[52px] z-20 pointer-events-none relative lottie-gradient-svg" />

      <motion.div
        key={shakeKey}
        animate={shakeKey > 0 ? { x: [0, -10, 10, -10, 10, -5, 5, 0] } : {}}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="w-full"
      >
        <Card className="w-full bg-gradient-to-br from-brand-start to-brand-end border-none shadow-2xl shadow-indigo-600/35 text-white p-8 md:p-10 rounded-3xl" variant="default">
          {/* Brand & Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-white font-heading">Titin Testify</h1>
            <p className="text-sm text-indigo-100/80 mt-1">Silakan masuk untuk memulai ujian Anda</p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs font-semibold text-red-200 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">
                Username <span className="text-red-300">*</span>
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="text-gray-800 focus:ring-2 focus:ring-white/55 focus:border-white transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-1.5">
                Password <span className="text-red-300">*</span>
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-gray-800 focus:ring-2 focus:ring-white/55 focus:border-white transition-all duration-200"
              />
            </div>

            <Button
              type="submit"
              loading={isLoading}
              fullWidth
              variant="primary"
              className="mt-2 font-bold shadow-lg shadow-indigo-950/25 active:scale-[0.98] ring-1 ring-white/20"
            >
              Masuk
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
