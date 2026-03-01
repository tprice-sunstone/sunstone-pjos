'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TenantProvider, useTenant } from '@/hooks/use-tenant';
import { ThemeProvider } from '@/components/themeprovider';
import { THEMES } from '@/lib/themes';
import { applyTheme } from '@/lib/theme';
import { getThemeById } from '@/lib/themes';
import { Button, Input } from '@/components/ui';

// ============================================================================
// Constants
// ============================================================================

const TOTAL_STEPS = 9; // 0-8

const BUSINESS_TYPES = [
  { value: 'permanent_jewelry', label: 'Permanent Jewelry', icon: '💎' },
  { value: 'salon_spa', label: 'Salon / Spa', icon: '✨' },
  { value: 'boutique', label: 'Boutique', icon: '🛍' },
  { value: 'popup_vendor', label: 'Pop-up Vendor', icon: '🎪' },
  { value: 'other', label: 'Other', icon: '🏪' },
];

const EXPERIENCE_LEVELS = [
  { value: 'just_starting', label: 'Just starting' },
  { value: 'less_than_1', label: 'Less than 1 year' },
  { value: '1_to_3', label: '1-3 years' },
  { value: '3_plus', label: '3+ years' },
];

const KITS = [
  {
    id: 'momentum',
    name: 'Momentum',
    tagline: 'Great for beginners',
    chains: 7,
    jumpRings: 50,
    connectors: false,
  },
  {
    id: 'dream',
    name: 'Dream',
    tagline: 'Most popular',
    chains: 9,
    jumpRings: 100,
    connectors: true,
  },
  {
    id: 'legacy',
    name: 'Legacy',
    tagline: 'Full collection',
    chains: 15,
    jumpRings: 200,
    connectors: true,
  },
];

const PRICING_OPTIONS = [
  {
    id: 'by_type',
    label: 'By product type',
    description: 'Set a flat price for bracelets, anklets, etc.',
  },
  {
    id: 'by_metal',
    label: 'By metal',
    description: 'Different prices for silver vs gold-filled',
  },
  {
    id: 'by_markup',
    label: 'By markup',
    description: 'Set a margin percentage over your cost',
  },
  {
    id: 'individual',
    label: 'Price later',
    description: "I'll set prices individually in inventory",
  },
];

// ============================================================================
// Root — wraps in TenantProvider since outside /dashboard layout
// ============================================================================

export default function OnboardingPageRoot() {
  return (
    <TenantProvider>
      <OnboardingThemeBridge />
    </TenantProvider>
  );
}

function OnboardingThemeBridge() {
  const { tenant } = useTenant();
  return (
    <ThemeProvider themeId={tenant?.theme_id || null}>
      <OnboardingFlow />
    </ThemeProvider>
  );
}

// ============================================================================
// Main Onboarding Flow
// ============================================================================

function OnboardingFlow() {
  const router = useRouter();
  const { tenant, isLoading, isOwner, refetch } = useTenant();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step data
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [experience, setExperience] = useState('');
  const [selectedKit, setSelectedKit] = useState<string | null>(null);
  const [kitLoading, setKitLoading] = useState(false);
  const [kitResult, setKitResult] = useState<{ chains: number; jumpRings: number } | null>(null);
  const [pricingMode, setPricingMode] = useState('');
  const [pricingValues, setPricingValues] = useState<Record<string, number>>({});
  const [selectedTheme, setSelectedTheme] = useState('rose-gold');
  const [pricingApplied, setPricingApplied] = useState(false);

  // Redirect if onboarding already completed
  useEffect(() => {
    if (!isLoading && tenant?.onboarding_completed) {
      router.replace('/dashboard');
    }
  }, [isLoading, tenant, router]);

  // Resume from saved step
  useEffect(() => {
    if (tenant) {
      if (tenant.onboarding_step > 0) setStep(tenant.onboarding_step);
      if (tenant.name) setBusinessName(tenant.name);
      if (tenant.theme_id) setSelectedTheme(tenant.theme_id);
    }
  }, [tenant]);

  // Load first name from auth metadata
  useEffect(() => {
    async function loadFirstName() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.first_name) {
        setFirstName(user.user_metadata.first_name);
      }
    }
    loadFirstName();
  }, [supabase]);

  // Save step progress to tenant
  const saveStep = useCallback(async (newStep: number, extraData?: Record<string, any>) => {
    if (!tenant) return;
    const updatePayload: Record<string, any> = { onboarding_step: newStep };

    if (extraData) {
      const { data: current } = await supabase
        .from('tenants')
        .select('onboarding_data')
        .eq('id', tenant.id)
        .single();
      const currentData = (current?.onboarding_data as Record<string, any>) || {};
      updatePayload.onboarding_data = { ...currentData, ...extraData };
    }

    await supabase.from('tenants').update(updatePayload).eq('id', tenant.id);
  }, [tenant, supabase]);

  const goTo = useCallback((newStep: number, extraData?: Record<string, any>) => {
    setDirection(newStep > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(newStep);
      setAnimating(false);
      saveStep(newStep, extraData);
    }, 150);
  }, [step, saveStep]);

  const handleSkip = async () => {
    if (!tenant) return;
    setSaving(true);
    await supabase
      .from('tenants')
      .update({ onboarding_completed: true, onboarding_step: TOTAL_STEPS })
      .eq('id', tenant.id);
    await refetch();
    router.replace('/dashboard');
  };

  const handleComplete = async () => {
    if (!tenant) return;
    setSaving(true);
    await supabase
      .from('tenants')
      .update({
        onboarding_completed: true,
        onboarding_step: TOTAL_STEPS,
        theme_id: selectedTheme,
      })
      .eq('id', tenant.id);
    await refetch();
    router.replace('/dashboard');
  };

  const loadKit = async (kitId: string) => {
    setKitLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding/load-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kit: kitId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKitResult({ chains: data.chains || 0, jumpRings: data.jumpRings || 0 });
    } catch (err: any) {
      setError(err.message || 'Failed to load kit');
    } finally {
      setKitLoading(false);
    }
  };

  const applyPricing = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = { mode: pricingMode, ...pricingValues };
      const res = await fetch('/api/onboarding/apply-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPricingApplied(true);
    } catch (err: any) {
      setError(err.message || 'Failed to apply pricing');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <div className="text-text-tertiary">Loading...</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <div className="text-center space-y-3">
          <p className="text-text-secondary">Unable to load your workspace.</p>
          <Button variant="ghost" onClick={() => router.push('/auth/login')}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  const progress = (step / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-[var(--surface-base)] flex flex-col">
      {/* Top bar with progress + skip */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <span className="font-display text-lg font-bold text-[var(--accent-primary)]">Sunstone</span>
          <div className="flex-1 max-w-xs h-2 bg-[var(--border-default)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <button
            onClick={handleSkip}
            disabled={saving}
            className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Skip setup
          </button>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div
          className={`w-full max-w-lg transition-all duration-300 ease-out ${
            animating
              ? 'opacity-0 translate-x-4'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="space-y-3">
                <h1 className="font-display text-4xl md:text-5xl font-bold text-text-primary animate-fade-in">
                  Welcome to Sunstone{firstName ? `, ${firstName}` : ''}.
                </h1>
                <p className="text-lg text-text-secondary animate-fade-in-delay-1">
                  Let&apos;s get your business set up in just a few minutes.
                </p>
              </div>
              <div className="animate-fade-in-delay-2">
                <Button
                  variant="primary"
                  onClick={() => goTo(1)}
                  className="min-h-[48px] px-8 text-base"
                >
                  Let&apos;s Go
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Business Name */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  What&apos;s your business called?
                </h2>
                <p className="text-sm text-text-secondary mt-2">
                  You can always change this later in Settings.
                </p>
              </div>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="My Jewelry Studio"
                autoFocus
                className="text-center text-lg"
              />
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={() => goTo(0)}>Back</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!businessName.trim()) { setError('Business name is required'); return; }
                    setError('');
                    supabase.from('tenants').update({ name: businessName.trim() }).eq('id', tenant.id);
                    goTo(2);
                  }}
                  className="min-h-[48px] px-8"
                >
                  Next
                </Button>
              </div>
              {error && <p className="text-sm text-center text-[var(--error-600)]">{error}</p>}
            </div>
          )}

          {/* Step 2: Business Type */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  What type of business do you run?
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    onClick={() => {
                      setBusinessType(bt.value);
                      supabase.from('tenants').update({ business_type: bt.value }).eq('id', tenant.id);
                      goTo(3, { business_type: bt.value });
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md ${
                      businessType === bt.value
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-50)]'
                        : 'border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--accent-300)]'
                    }`}
                  >
                    <span className="text-2xl block mb-2">{bt.icon}</span>
                    <span className="text-sm font-medium text-text-primary">{bt.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-center">
                <Button variant="ghost" onClick={() => goTo(1)}>Back</Button>
              </div>
            </div>
          )}

          {/* Step 3: Experience */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  How long have you been doing this?
                </h2>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {EXPERIENCE_LEVELS.map((exp) => (
                  <button
                    key={exp.value}
                    onClick={() => {
                      setExperience(exp.value);
                      goTo(4, { experience: exp.value });
                    }}
                    className={`px-5 py-3 rounded-full border-2 text-sm font-medium transition-all duration-200 ${
                      experience === exp.value
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-50)] text-[var(--accent-primary)]'
                        : 'border-[var(--border-default)] bg-[var(--surface-raised)] text-text-primary hover:border-[var(--accent-300)]'
                    }`}
                  >
                    {exp.label}
                  </button>
                ))}
              </div>
              <div className="flex justify-center">
                <Button variant="ghost" onClick={() => goTo(2)}>Back</Button>
              </div>
            </div>
          )}

          {/* Step 4: Kit Selection */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  Did you purchase a Sunstone starter kit?
                </h2>
                <p className="text-sm text-text-secondary mt-2">
                  We&apos;ll pre-load your inventory so you&apos;re ready to sell.
                </p>
              </div>

              {!kitResult ? (
                <>
                  <div className="grid gap-3">
                    {KITS.map((kit) => (
                      <button
                        key={kit.id}
                        onClick={() => setSelectedKit(kit.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                          selectedKit === kit.id
                            ? 'border-[var(--accent-primary)] bg-[var(--accent-50)]'
                            : 'border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--accent-300)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-base font-semibold text-text-primary">{kit.name}</span>
                            <span className="text-xs text-text-tertiary ml-2">{kit.tagline}</span>
                          </div>
                          {selectedKit === kit.id && (
                            <CheckIcon className="w-5 h-5 text-[var(--accent-primary)]" />
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1">
                          {kit.chains} chains &middot; {kit.jumpRings} jump rings{kit.connectors ? ' · connectors' : ''}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={() => selectedKit && loadKit(selectedKit)}
                      loading={kitLoading}
                      disabled={!selectedKit}
                      className="min-h-[48px] px-8"
                    >
                      Load My Kit
                    </Button>
                    <button
                      onClick={() => {
                        setSelectedKit(null);
                        goTo(6, { kit: 'none' }); // Skip pricing if no kit
                      }}
                      className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      I didn&apos;t buy a kit
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[var(--accent-200)] bg-[var(--accent-50)] p-6 text-center">
                    <CheckCircleIcon className="w-12 h-12 text-[var(--accent-primary)] mx-auto mb-3" />
                    <p className="text-lg font-semibold text-text-primary">Kit loaded!</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {kitResult.chains} chains and {kitResult.jumpRings} jump rings added to your inventory.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      variant="primary"
                      onClick={() => goTo(5)}
                      className="min-h-[48px] px-8"
                    >
                      Set Pricing
                    </Button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-center text-[var(--error-600)]">{error}</p>}
              <div className="flex justify-center">
                <Button variant="ghost" onClick={() => goTo(3)}>Back</Button>
              </div>
            </div>
          )}

          {/* Step 5: Pricing */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  How would you like to price your jewelry?
                </h2>
              </div>

              {!pricingMode ? (
                <div className="grid gap-3">
                  {PRICING_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setPricingMode(opt.id)}
                      className="p-4 rounded-xl border-2 border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--accent-300)] text-left transition-all duration-200"
                    >
                      <span className="text-sm font-semibold text-text-primary">{opt.label}</span>
                      <p className="text-xs text-text-secondary mt-0.5">{opt.description}</p>
                    </button>
                  ))}
                </div>
              ) : pricingMode === 'individual' ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-text-secondary">
                    No problem! You can set prices in the Inventory page anytime.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      applyPricing();
                      goTo(6);
                    }}
                    className="min-h-[48px] px-8"
                  >
                    Continue
                  </Button>
                </div>
              ) : !pricingApplied ? (
                <div className="space-y-4">
                  {pricingMode === 'by_type' && (
                    <div className="space-y-3">
                      <Input
                        label="Price per piece ($)"
                        type="number"
                        value={pricingValues.bracelet_price?.toString() || ''}
                        onChange={(e) => setPricingValues({ ...pricingValues, bracelet_price: parseFloat(e.target.value) || 0 })}
                        placeholder="45"
                        min={0}
                        step={0.01}
                      />
                    </div>
                  )}
                  {pricingMode === 'by_metal' && (
                    <div className="space-y-3">
                      <Input
                        label="Silver price ($)"
                        type="number"
                        value={pricingValues.silver_price?.toString() || ''}
                        onChange={(e) => setPricingValues({ ...pricingValues, silver_price: parseFloat(e.target.value) || 0 })}
                        placeholder="35"
                        min={0}
                        step={0.01}
                      />
                      <Input
                        label="Gold-filled price ($)"
                        type="number"
                        value={pricingValues.gold_price?.toString() || ''}
                        onChange={(e) => setPricingValues({ ...pricingValues, gold_price: parseFloat(e.target.value) || 0 })}
                        placeholder="55"
                        min={0}
                        step={0.01}
                      />
                    </div>
                  )}
                  {pricingMode === 'by_markup' && (
                    <Input
                      label="Profit margin (%)"
                      type="number"
                      value={pricingValues.margin?.toString() || ''}
                      onChange={(e) => setPricingValues({ ...pricingValues, margin: parseFloat(e.target.value) || 0 })}
                      placeholder="50"
                      helperText="E.g. 50% margin means you sell for 2x your cost"
                      min={1}
                      max={99}
                    />
                  )}

                  {/* Extras for Dream/Legacy */}
                  {selectedKit && selectedKit !== 'momentum' && (
                    <Input
                      label="Connectors add-on price ($)"
                      type="number"
                      value={pricingValues.connectors_price?.toString() || ''}
                      onChange={(e) => setPricingValues({ ...pricingValues, connectors_price: parseFloat(e.target.value) || 0 })}
                      placeholder="5"
                      min={0}
                      step={0.01}
                    />
                  )}

                  <div className="flex justify-center gap-3">
                    <Button variant="ghost" onClick={() => setPricingMode('')}>Change method</Button>
                    <Button
                      variant="primary"
                      onClick={applyPricing}
                      loading={saving}
                      className="min-h-[48px] px-8"
                    >
                      Apply Pricing
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="rounded-xl border border-[var(--accent-200)] bg-[var(--accent-50)] p-6">
                    <CheckCircleIcon className="w-12 h-12 text-[var(--accent-primary)] mx-auto mb-3" />
                    <p className="text-lg font-semibold text-text-primary">Pricing applied!</p>
                    <p className="text-sm text-text-secondary mt-1">
                      You can adjust individual prices anytime in Inventory.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => goTo(6)}
                    className="min-h-[48px] px-8"
                  >
                    Continue
                  </Button>
                </div>
              )}

              {error && <p className="text-sm text-center text-[var(--error-600)]">{error}</p>}
              <div className="flex justify-center">
                <Button variant="ghost" onClick={() => goTo(4)}>Back</Button>
              </div>
            </div>
          )}

          {/* Step 6: Theme Picker */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  Choose your look
                </h2>
                <p className="text-sm text-text-secondary mt-2">
                  Pick a theme that matches your brand. This changes colors, fonts, and feel.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setSelectedTheme(theme.id);
                      applyTheme(theme);
                    }}
                    className={`relative p-3 rounded-xl border-2 transition-all duration-200 ${
                      selectedTheme === theme.id
                        ? 'border-[var(--accent-primary)] shadow-md'
                        : 'border-[var(--border-default)] hover:border-[var(--accent-300)]'
                    }`}
                  >
                    {/* Theme swatch */}
                    <div className="flex gap-1 mb-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent }} />
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.background }} />
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.textPrimary }} />
                    </div>
                    <p className="text-xs font-medium text-text-primary truncate">{theme.name}</p>
                    <p className="text-[10px] text-text-tertiary">{theme.mode}</p>
                    {selectedTheme === theme.id && (
                      <div className="absolute top-2 right-2">
                        <CheckIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={() => {
                  // Restore previous theme on back
                  if (tenant?.theme_id) applyTheme(getThemeById(tenant.theme_id));
                  goTo(selectedKit ? 5 : 4);
                }}>Back</Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    supabase.from('tenants').update({ theme_id: selectedTheme }).eq('id', tenant.id);
                    goTo(7);
                  }}
                  className="min-h-[48px] px-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 7: Quick Wins */}
          {step === 7 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-2xl font-bold text-text-primary">
                  Quick wins to get rolling
                </h2>
                <p className="text-sm text-text-secondary mt-2">
                  These make a big difference. Do them now or later.
                </p>
              </div>
              <div className="space-y-3">
                <QuickWinCard
                  title="Connect a payment processor"
                  description="Accept card payments with Square or Stripe"
                  href="/dashboard/settings"
                  done={!!(tenant?.square_merchant_id || tenant?.stripe_account_id)}
                />
                <QuickWinCard
                  title="Set your tax rate"
                  description="Required before making your first sale"
                  href="/dashboard/settings"
                  done={tenant?.default_tax_rate > 0}
                />
              </div>
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={() => goTo(6)}>Back</Button>
                <Button
                  variant="primary"
                  onClick={() => goTo(8)}
                  className="min-h-[48px] px-8"
                >
                  {tenant?.square_merchant_id || tenant?.stripe_account_id || tenant?.default_tax_rate > 0
                    ? 'Continue'
                    : 'Skip for now'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 8: Grand Reveal */}
          {step === 8 && (
            <div className="text-center space-y-6">
              <div className="space-y-3 animate-fade-in">
                <div className="text-5xl mb-4">🎉</div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-text-primary">
                  You&apos;re all set!
                </h1>
                <p className="text-lg text-text-secondary">
                  Your workspace is ready. Let&apos;s build something beautiful.
                </p>
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 text-left space-y-3 max-w-sm mx-auto animate-fade-in-delay-1">
                <SummaryRow label="Business" value={businessName || tenant.name} />
                {businessType && (
                  <SummaryRow label="Type" value={BUSINESS_TYPES.find(b => b.value === businessType)?.label || businessType} />
                )}
                {selectedKit && (
                  <SummaryRow label="Kit" value={KITS.find(k => k.id === selectedKit)?.name || 'None'} />
                )}
                <SummaryRow label="Theme" value={THEMES.find(t => t.id === selectedTheme)?.name || 'Rose Gold'} />
              </div>

              <div className="animate-fade-in-delay-2">
                <Button
                  variant="primary"
                  onClick={handleComplete}
                  loading={saving}
                  className="min-h-[48px] px-8 text-base"
                >
                  Start Exploring
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-fade-in-delay-1 {
          opacity: 0;
          animation: fadeIn 0.5s ease-out 0.2s forwards;
        }
        .animate-fade-in-delay-2 {
          opacity: 0;
          animation: fadeIn 0.5s ease-out 0.4s forwards;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

function QuickWinCard({ title, description, href, done }: {
  title: string;
  description: string;
  href: string;
  done: boolean;
}) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${
      done
        ? 'border-[var(--accent-200)] bg-[var(--accent-50)]'
        : 'border-[var(--border-default)] bg-[var(--surface-raised)]'
    }`}>
      <div className="flex items-center gap-3">
        {done ? (
          <CheckCircleIcon className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border-default)] shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${done ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
            {title}
          </p>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-medium">{value}</span>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
