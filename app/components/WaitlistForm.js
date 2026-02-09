'use client';

import { useState } from 'react';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong.');
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-green-400">
        <CheckCircle size={20} />
        <span className="text-sm font-medium">You&apos;re on the list! We&apos;ll be in touch.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); setStatus('idle'); }}
        placeholder="you@company.com"
        className="flex-1 px-4 py-2.5 rounded-lg bg-[#111] border border-[rgba(255,255,255,0.1)] text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-brand transition-colors"
        disabled={status === 'submitting'}
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
      >
        {status === 'submitting' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            Join Waitlist
            <ArrowRight size={16} />
          </>
        )}
      </button>
      {errorMsg && <p className="text-red-400 text-xs sm:col-span-2">{errorMsg}</p>}
    </form>
  );
}
