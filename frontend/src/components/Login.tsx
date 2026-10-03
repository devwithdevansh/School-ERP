import React, { useState } from 'react';
import { useApp } from '../store';
import { Lock, Mail, Loader2, GraduationCap, Wallet, CalendarCheck, AlertCircle } from './icons';
import { brand } from '../config/brand';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Login: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Wallet, text: 'Fees, receipts and dues in one place' },
    { icon: GraduationCap, text: 'Students, staff and academics' },
    { icon: CalendarCheck, text: 'Attendance, timetable and results' },
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--color-rail)] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src={brand.logo} alt="" className="h-11 w-11 rounded-xl" />
          <span className="text-lg font-semibold tracking-wide">{brand.productName}</span>
        </div>
        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">{brand.schoolName}</h1>
          <p className="max-w-md text-slate-400">Everything your school runs on, from admissions to fee collection.</p>
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10"><Icon className="h-4 w-4" /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-600">© {new Date().getFullYear()} {brand.productName}</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-[var(--color-canvas)] p-6">
        <div className="w-full max-w-sm space-y-8">
          
          <div className="flex flex-col space-y-2">
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <img src={brand.logo} alt="" className="h-10 w-10 rounded-xl" />
              <span className="font-semibold text-foreground">{brand.productName}</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue to your dashboard.</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email or phone</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.local"
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
