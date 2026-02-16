'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Button, Input, Select, Card, CardContent } from '@/components/ui';
import { applyAccentColor, isValidHexColor, generateAccentScale } from '@/lib/theme';
import type { FeeHandling } from '@/types';

const TOTAL_STEPS = 3;

const BUSINESS_TYPE_OPTIONS = [
  { value: '', label: 'Select your business type' },
  { value: 'permanent_jewelry', label: 'Permanent Jewelry' },
  { value: 'salon_spa', label: 'Salon / Spa' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'popup_vendor', label: 'Pop-up Vendor' },
  { value: 'other', label: 'Other' },
];

const FEE_HANDLING_OPTIONS = [
  { value: 'pass_to_customer', label: 'Pass to customer' },
  { value: 'absorb', label: 'Absorb fees' },
];

const COLOR_PRESETS = [
  { hex: '#852454', label: 'Deep Wine' },
  { hex: '#B1275E', label: 'Raspberry' },
  { hex: '#E1598F', label: 'PJ Rose' },
  { hex: '#d4698a', label: 'Dusty Rose' },
  { hex: '#7c6874', label: 'Plum Taupe' },
  { hex: '#6b4c7a', label: 'Amethyst' },
  { hex: '#5c4a3e', label: 'Espresso Ash' },
  { hex: '#4a5e45', label: 'Olive Grove' },
];

const DEFAULT_ACCENT = '#852454';

export default function OnboardingPage() {
  const router = useRouter();
  const { tenant, isLoading, refetch } = useTenant();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2: Brand Setup
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [colorInput, setColorInput] = useState(DEFAULT_ACCENT);

  // Step 3: Tax & Fees
  const [taxRate, setTaxRate] = useState('');
  const [feeHandling, setFeeHandling] = useState<FeeHandling>('pass_to_customer');

  // Redirect if onboarding already completed
  useEffect(() => {
    if (!isLoading && tenant?.onboarding_completed) {
      router.replace('/dashboard');
    }
  }, [isLoading, tenant, router]);

  // Pre-fill from existing tenant data
  useEffect(() => {
    if (tenant) {
      if (tenant.name) setBusinessName(tenant.name);
      if (tenant.business_type) setBusinessType(tenant.business_type);
      if (tenant.phone) setPhone(tenant.phone);
      if (tenant.website) setWebsite(tenant.website);
      if (tenant.brand_color && isValidHexColor(tenant.brand_color)) {
        setAccentColor(tenant.brand_color);
        setColorInput(tenant.brand_color);
      }
      if (tenant.fee_handling) setFeeHandling(tenant.fee_handling);
      if (tenant.default_tax_rate) setTaxRate(String(tenant.default_tax_rate * 100));
    }
  }, [tenant]);

  // Live preview accent color
  useEffect(() => {
    if (isValidHexColor(accentColor)) {
      applyAccentColor(accentColor);
    }
  }, [accentColor]);

  const handleColorInputChange = (value: string) => {
    setColorInput(value);
    const cleaned = value.startsWith('#') ? value : `#${value}`;
    if (isValidHexColor(cleaned)) {
      setAccentColor(cleaned);
      setColorInput(cleaned);
    }
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && !businessName.trim()) {
      setError('Business name is required.');
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleComplete = async () => {
    if (!tenant) return;
    setSaving(true);
    setError('');

    try {
      const parsedTaxRate = taxRate ? parseFloat(taxRate) / 100 : 0;

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          name: businessName.trim(),
          business_type: businessType || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          brand_color: accentColor,
          default_tax_rate: parsedTaxRate,
          fee_handling: feeHandling,
          onboarding_completed: true,
        })
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      // Create default tax profile if rate was set
      if (parsedTaxRate > 0) {
        const { error: taxError } = await supabase.from('tax_profiles').insert({
          tenant_id: tenant.id,
          name: 'Default Tax',
          rate: parsedTaxRate,
          is_default: true,
        });
        if (taxError) console.warn('Tax profile creation:', taxError.message);
      }

      await refetch();
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <div className="text-text-tertiary">Loading…</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <div className="text-center space-y-3">
          <p className="text-text-secondary">Unable to load your workspace.</p>
          <Button variant="ghost" onClick={() => router.push('/auth/login')}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--surface-base)]">
      <div className="w-full max-w-lg">
        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-accent-600 tracking-tight">
            Sunstone
          </h1>
          <p className="text-text-secondary text-sm mt-2">
            Let&apos;s set up your workspace
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i + 1 === step
                  ? 'w-8 bg-[var(--accent-primary)]'
                  : i + 1 < step
                    ? 'w-2 bg-[var(--accent-300)]'
                    : 'w-2 bg-[var(--border-default)]'
              }`}
            />
          ))}
          <span className="ml-3 text-xs text-text-tertiary">
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>

        {/* Step Card */}
        <Card>
          <CardContent className="p-8">
            {error && (
              <div className="rounded-lg bg-[var(--error-50)] border border-[var(--error-500)]/20 px-4 py-3 text-sm text-[var(--error-600)] mb-6">
                {error}
              </div>
            )}

            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">
                    Business Information
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Tell us about your business so we can personalize your experience.
                  </p>
                </div>

                <Input
                  label="Business Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="My Jewelry Studio"
                  required
                  autoFocus
                />

                <Select
                  label="Business Type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  options={BUSINESS_TYPE_OPTIONS}
                />

                <Input
                  label="Phone (optional)"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />

                <Input
                  label="Website (optional)"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://myshop.com"
                />
              </div>
            )}

            {/* Step 2: Brand Setup */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">
                    Brand Your Workspace
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Choose an accent color that represents your brand. This colors buttons, links, and highlights throughout the app.
                  </p>
                </div>

                {/* Color presets */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Quick Picks
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => {
                          setAccentColor(preset.hex);
                          setColorInput(preset.hex);
                        }}
                        className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                          accentColor.toLowerCase() === preset.hex.toLowerCase()
                            ? 'border-[var(--text-primary)] scale-110 shadow-md'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.label}
                        aria-label={`Select ${preset.label} color`}
                      />
                    ))}
                  </div>
                </div>

                {/* Custom hex input */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input
                      label="Custom Hex Color"
                      value={colorInput}
                      onChange={(e) => handleColorInputChange(e.target.value)}
                      placeholder="#852454"
                      maxLength={7}
                    />
                  </div>
                  <div
                    className="w-[48px] h-[48px] rounded-lg border border-border-default shrink-0"
                    style={{ backgroundColor: isValidHexColor(accentColor) ? accentColor : '#ccc' }}
                  />
                </div>

                {/* Live preview */}
                <div className="rounded-lg border border-border-default p-4 space-y-3">
                  <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Preview
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 px-6 rounded-lg text-white text-sm font-semibold flex items-center"
                      style={{ backgroundColor: isValidHexColor(accentColor) ? accentColor : DEFAULT_ACCENT }}
                    >
                      Primary Button
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: isValidHexColor(accentColor) ? accentColor : DEFAULT_ACCENT }}
                    >
                      Accent Text
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {isValidHexColor(accentColor) &&
                      (() => {
                        try {
                          const scale = generateAccentScale(accentColor);
                          return [scale[50], scale[100], scale[200], scale[300], scale[400], scale[500], scale[600], scale[700], scale[800], scale[900]].map(
                            (color, i) => (
                              <div
                                key={i}
                                className="flex-1 h-6 rounded first:rounded-l-lg last:rounded-r-lg"
                                style={{ backgroundColor: color }}
                              />
                            )
                          );
                        } catch {
                          return null;
                        }
                      })()}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Tax & Fees */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">
                    Tax & Fee Settings
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Configure your default tax rate and how platform fees are handled. You can always change these later in Settings.
                  </p>
                </div>

                <Input
                  label="Default Tax Rate (%)"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="8.25"
                  helperText="Enter the percentage, e.g. 8.25 for 8.25%. Leave blank for no tax."
                  min={0}
                  max={30}
                  step={0.01}
                />

                <Select
                  label="Platform Fee Handling"
                  value={feeHandling}
                  onChange={(e) => setFeeHandling(e.target.value as FeeHandling)}
                  options={FEE_HANDLING_OPTIONS}
                  helperText={
                    feeHandling === 'pass_to_customer'
                      ? 'Customers pay the platform fee on top of the sale total.'
                      : 'You absorb the platform fee — customers see only the sale total.'
                  }
                />

                <div className="rounded-lg bg-[var(--accent-50)] border border-[var(--accent-200)] p-4">
                  <p className="text-sm text-[var(--accent-800)]">
                    <strong>Free plan:</strong> 2.5% platform fee per transaction. Upgrade to Pro (1.5%) or Business (0%) anytime.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border-default)]">
              <div>
                {step > 1 && (
                  <Button variant="ghost" onClick={handleBack} disabled={saving}>
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {step > 1 && step < TOTAL_STEPS && (
                  <Button
                    variant="ghost"
                    onClick={() => setStep((s) => s + 1)}
                    disabled={saving}
                  >
                    Skip
                  </Button>
                )}

                {step < TOTAL_STEPS ? (
                  <Button variant="primary" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleComplete}
                    loading={saving}
                  >
                    Complete Setup
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {step === 1 && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={handleComplete}
              className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              Skip setup for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}