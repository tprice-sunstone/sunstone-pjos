'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { business_name: businessName } },
      });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error('Signup failed. Please try again.');

      // 2. Create tenant + member via server API (bypasses RLS — no session needed)
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          businessName: businessName.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Business setup failed');
      }

      // 3. Check if we have a session (no email confirmation) or need to wait
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Logged in immediately — go to onboarding
        router.push('/dashboard/onboarding');
      } else {
        // Email confirmation required — show success message
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state — waiting for email confirmation
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface-base">
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-bold text-accent-600 tracking-tight">
              Sunstone
            </h1>
          </div>
          <div className="rounded-xl border border-border-default bg-surface-raised shadow-sm p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-50)] flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-[var(--accent-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-text-primary">
              Check your email
            </h2>
            <p className="text-sm text-text-secondary">
              We sent a confirmation link to <strong>{email}</strong>.
              Click the link to activate your account, then sign in.
            </p>
            <div className="pt-2">
              <Link
                href="/auth/login"
                className="text-sm text-accent-600 hover:text-accent-700 font-medium"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-base">
      <div className="w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-accent-600 tracking-tight">
            Sunstone
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Create your workspace
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-border-default bg-surface-raised shadow-sm p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-error-50 border border-error-500/20 px-4 py-3 text-sm text-error-600">
                {error}
              </div>
            )}

            <Input
              label="Business Name"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="My Jewelry Studio"
              required
              autoFocus
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              helperText="At least 6 characters"
              minLength={6}
              required
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full"
            >
              Create Workspace
            </Button>

            <p className="text-xs text-text-tertiary text-center">
              Start free. No credit card required.
            </p>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="text-accent-600 hover:text-accent-700 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}