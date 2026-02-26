// ============================================================================
// Settings Page — DEFINITIVE VERSION — src/app/dashboard/settings/page.tsx
// ============================================================================
// Layout (General tab):
//   1. Business Information
//   2. Branding (Logo Upload + Accent Color — combined)
//   3. Subscription & Fees (Plan tier + Platform Fee Handling — combined)
//   4. Payment Processing (Pick one: Square OR Stripe — single card)
//   5. Tax Profiles
//   6. Product Types (chain product types — inlined, with jump_rings_required)
//   6b. Materials (standardized materials — component)
//   7. Suppliers (chain supply vendors — inlined, cursor-jump bug fixed)
//   8. Waiver Text
// Subscription tab: Plan info, trial status, upgrade/manage (NEW - Task 28)
// Team tab: Invite, role management, remove (unchanged)
// ============================================================================

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { ROLE_CONFIG, type TenantRole } from '@/lib/permissions';
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui';
import { applyAccentColor, isValidHexColor, generateAccentScale } from '@/lib/theme';
import MaterialsSection from '@/components/settings/MaterialsSection';
import type { TaxProfile, FeeHandling, BusinessType, ProductType, Supplier, SubscriptionTier } from '@/types';
import { PLATFORM_FEE_RATES, SUBSCRIPTION_PRICES } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const BUSINESS_TYPE_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'permanent_jewelry', label: 'Permanent Jewelry' },
  { value: 'salon_spa', label: 'Salon / Spa' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'popup_vendor', label: 'Pop-up Vendor' },
  { value: 'other', label: 'Other' },
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

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
];

const ALL_ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Admin' },
];

// Plan feature lists for subscription tab
const PLAN_FEATURES: Record<string, string[]> = {
  pro: [
    '1.5% platform fee (down from 3%)',
    'Unlimited Sunny AI questions',
    'Business insights & analytics',
    'Full P&L reports',
    'CRM & client management',
    'Up to 3 team members',
  ],
  business: [
    '0% platform fee',
    'Everything in Pro',
    'Unlimited team members',
    'Priority support',
  ],
};

// ============================================================================
// Types
// ============================================================================

interface TeamMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  display_name: string | null;
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  is_owner: boolean;
  is_pending: boolean;
}

type SettingsTab = 'general' | 'subscription' | 'team';
type PaymentProcessor = 'square' | 'stripe';

// ============================================================================
// Subscription Helpers
// ============================================================================

function getTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const end = new Date(trialEndsAt);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function isTrialActive(status: string | null, trialEndsAt: string | null): boolean {
  if (status !== 'trialing') return false;
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}

// ============================================================================
// Page Component
// ============================================================================

function SettingsPage() {
  const { tenant, can, isOwner, refetch } = useTenant();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  // Redirect non-admins
  useEffect(() => {
    if (!can('settings:manage') && !can('team:manage')) {
      router.push('/dashboard');
    }
  }, [can, router]);

  // Tab state — check URL for ?tab=subscription
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'subscription' || tab === 'team') return tab;
    }
    return 'general';
  });

  // Business info
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [savingBusiness, setSavingBusiness] = useState(false);

  // Brand color
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [colorInput, setColorInput] = useState(DEFAULT_ACCENT);
  const [savingBrand, setSavingBrand] = useState(false);

  // Logo upload
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Fee handling
  const [feeHandling, setFeeHandling] = useState<FeeHandling>('pass_to_customer');

  // Tax profiles
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [newTax, setNewTax] = useState({ name: '', rate: '' });

  // Product types
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [ptLoading, setPtLoading] = useState(true);
  const [ptEditingId, setPtEditingId] = useState<string | null>(null);
  const [ptEditName, setPtEditName] = useState('');
  const [ptEditInches, setPtEditInches] = useState('');
  const [ptEditJumpRings, setPtEditJumpRings] = useState('1');
  const [ptShowAdd, setPtShowAdd] = useState(false);
  const [ptNewName, setPtNewName] = useState('');
  const [ptNewInches, setPtNewInches] = useState('');
  const [ptNewJumpRings, setPtNewJumpRings] = useState('1');
  const [ptSaving, setPtSaving] = useState(false);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supLoading, setSupLoading] = useState(true);
  const [supEditingId, setSupEditingId] = useState<string | null>(null);
  // Individual fields instead of object (prevents cursor-jump)
  const [supEditName, setSupEditName] = useState('');
  const [supEditContactName, setSupEditContactName] = useState('');
  const [supEditContactEmail, setSupEditContactEmail] = useState('');
  const [supEditContactPhone, setSupEditContactPhone] = useState('');
  const [supEditWebsite, setSupEditWebsite] = useState('');
  const [supEditNotes, setSupEditNotes] = useState('');
  const [supShowAdd, setSupShowAdd] = useState(false);
  const [supAddName, setSupAddName] = useState('');
  const [supAddContactName, setSupAddContactName] = useState('');
  const [supAddContactEmail, setSupAddContactEmail] = useState('');
  const [supAddContactPhone, setSupAddContactPhone] = useState('');
  const [supAddWebsite, setSupAddWebsite] = useState('');
  const [supAddNotes, setSupAddNotes] = useState('');
  const [supSaving, setSupSaving] = useState(false);

  // Waiver
  const [waiverText, setWaiverText] = useState('');

  // Payment
  const [paymentTab, setPaymentTab] = useState<PaymentProcessor>('square');
  const [disconnectingSquare, setDisconnectingSquare] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TenantRole>('staff');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);

  // Subscription state (Task 28)
  const [subscribing, setSubscribing] = useState(false);

  // ============================================================================
  // OAuth redirect handling (updated for subscription checkout)
  // ============================================================================

  useEffect(() => {
    const squareSuccess = searchParams.get('success');
    const squareError = searchParams.get('error');
    const stripeParam = searchParams.get('stripe');
    const checkoutParam = searchParams.get('checkout');
    const tabParam = searchParams.get('tab');

    if (squareSuccess === 'square_connected') {
      toast.success('Square connected successfully!');
    }
    if (squareError === 'square_denied') {
      toast.error('Square authorization was denied.');
    } else if (squareError) {
      toast.error('Failed to connect Square. Please try again.');
    }

    if (stripeParam === 'connected') {
      toast.success('Stripe connected successfully!');
    } else if (stripeParam === 'error') {
      toast.error('Failed to connect Stripe. Please try again.');
    }

    // Subscription checkout redirects
    if (checkoutParam === 'success') {
      toast.success('Subscription activated! Welcome aboard.');
      refetch();
    } else if (checkoutParam === 'canceled') {
      toast.info('Subscription checkout was canceled.');
    }

    // Set active tab from URL
    if (tabParam === 'subscription') {
      setActiveTab('subscription');
    } else if (tabParam === 'team') {
      setActiveTab('team');
    }

    // Clean up URL params
    if (squareSuccess || squareError || stripeParam || checkoutParam || tabParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('error');
      url.searchParams.delete('stripe');
      url.searchParams.delete('checkout');
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.pathname);
    }
  }, [searchParams]);

  // Refetch tenant when returning from OAuth
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    const squareSuccess = searchParams.get('success');
    if (stripeParam === 'connected' || squareSuccess === 'square_connected') {
      refetch();
    }
  }, [searchParams]);

  // ============================================================================
  // Load tenant data
  // ============================================================================

  useEffect(() => {
    if (!tenant) return;
    setBusinessName(tenant.name || '');
    setBusinessType((tenant as any).business_type || '');
    setBusinessPhone((tenant as any).phone || '');
    setBusinessWebsite((tenant as any).website || '');
    setFeeHandling(tenant.fee_handling);
    setWaiverText(tenant.waiver_text);
    setLogoUrl((tenant as any).logo_url || null);
    if (tenant.brand_color && isValidHexColor(tenant.brand_color)) {
      setAccentColor(tenant.brand_color);
      setColorInput(tenant.brand_color);
    }

    // Auto-select connected processor tab
    if (tenant.stripe_account_id) {
      setPaymentTab('stripe');
    } else if ((tenant as any).square_merchant_id) {
      setPaymentTab('square');
    }

    supabase
      .from('tax_profiles')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('name')
      .then(({ data }) => setTaxProfiles((data || []) as TaxProfile[]));
  }, [tenant]);

  // ============================================================================
  // Load product types
  // ============================================================================

  const loadProductTypes = useCallback(async () => {
    if (!tenant) return;
    try {
      const res = await fetch(`/api/product-types?tenantId=${tenant.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProductTypes(data);
          setPtLoading(false);
          return;
        }
      }
      // Fallback: direct Supabase query
      const { data } = await supabase
        .from('product_types')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('sort_order');
      setProductTypes((data || []) as ProductType[]);
    } catch {
      // Final fallback
      const { data } = await supabase
        .from('product_types')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('sort_order');
      setProductTypes((data || []) as ProductType[]);
    } finally {
      setPtLoading(false);
    }
  }, [tenant, supabase]);

  useEffect(() => {
    if (tenant) loadProductTypes();
  }, [tenant, loadProductTypes]);

  // ============================================================================
  // Load suppliers
  // ============================================================================

  const loadSuppliers = useCallback(async () => {
    if (!tenant) return;
    try {
      const res = await fetch(`/api/suppliers?tenantId=${tenant.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuppliers(data);
          setSupLoading(false);
          return;
        }
      }
      // Fallback: direct Supabase query
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('name');
      setSuppliers((data || []) as Supplier[]);
    } catch {
      const { data } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('name');
      setSuppliers((data || []) as Supplier[]);
    } finally {
      setSupLoading(false);
    }
  }, [tenant, supabase]);

  useEffect(() => {
    if (tenant) loadSuppliers();
  }, [tenant, loadSuppliers]);

  // ============================================================================
  // Team functions
  // ============================================================================

  const fetchTeam = async () => {
    setTeamLoading(true);
    try {
      const res = await fetch('/api/team');
      if (!res.ok) throw new Error('Failed to fetch team');
      const data = await res.json();
      setTeamMembers(data.members || []);
    } catch (err) {
      console.error('Fetch team error:', err);
      toast.error('Failed to load team members');
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'team' && can('team:manage')) {
      fetchTeam();
    }
  }, [activeTab]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    setInviting(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          display_name: inviteName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send invite');
        return;
      }
      toast.success(data.message || 'Invite sent!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('staff');
      fetchTeam();
    } catch {
      toast.error('Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (member: TeamMember, newRole: TenantRole) => {
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to update role');
        return;
      }
      toast.success(`Role updated to ${ROLE_CONFIG[newRole].label}`);
      fetchTeam();
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/team?id=${confirmRemove.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to remove member');
        return;
      }
      toast.success('Team member removed');
      setConfirmRemove(null);
      fetchTeam();
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  const handleResendInvite = async (member: TeamMember) => {
    if (!member.invited_email) return;
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: member.invited_email,
          role: member.role,
          display_name: member.display_name || undefined,
        }),
      });
      if (!res.ok) {
        toast.success('Invite resent');
        return;
      }
      toast.success('Invite resent');
    } catch {
      toast.error('Failed to resend invite');
    }
  };

  // ============================================================================
  // General settings save handlers
  // ============================================================================

  const saveBusinessInfo = async () => {
    if (!tenant) return;
    setSavingBusiness(true);
    const { error } = await supabase
      .from('tenants')
      .update({
        name: businessName.trim(),
        business_type: businessType || null,
        phone: businessPhone.trim() || null,
        website: businessWebsite.trim() || null,
      })
      .eq('id', tenant.id);
    setSavingBusiness(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Business info updated');
    refetch();
  };

  const saveBrandColor = async () => {
    if (!tenant || !isValidHexColor(accentColor)) return;
    setSavingBrand(true);
    const { error } = await supabase
      .from('tenants')
      .update({ brand_color: accentColor })
      .eq('id', tenant.id);
    setSavingBrand(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Brand color updated');
    refetch();
  };

  const handleColorInputChange = (value: string) => {
    setColorInput(value);
    const cleaned = value.startsWith('#') ? value : `#${value}`;
    if (isValidHexColor(cleaned)) {
      setAccentColor(cleaned);
      setColorInput(cleaned);
      applyAccentColor(cleaned);
    }
  };

  const selectPresetColor = (hex: string) => {
    setAccentColor(hex);
    setColorInput(hex);
    applyAccentColor(hex);
  };

  // ── Logo Upload ──
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `${tenant.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(filePath);

      // Append cache-buster
      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: url })
        .eq('id', tenant.id);

      if (updateError) throw updateError;

      setLogoUrl(url);
      toast.success('Logo uploaded');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!tenant) return;
    setUploadingLogo(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: null })
        .eq('id', tenant.id);
      if (error) throw error;
      setLogoUrl(null);
      toast.success('Logo removed');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveFeeHandling = async () => {
    if (!tenant) return;
    const { error } = await supabase
      .from('tenants')
      .update({ fee_handling: feeHandling })
      .eq('id', tenant.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Fee handling updated');
    refetch();
  };

  const saveWaiverText = async () => {
    if (!tenant) return;
    const { error } = await supabase
      .from('tenants')
      .update({ waiver_text: waiverText })
      .eq('id', tenant.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Waiver text updated');
  };

  const addTaxProfile = async () => {
    if (!tenant || !newTax.name || !newTax.rate) return;
    const { error } = await supabase.from('tax_profiles').insert({
      tenant_id: tenant.id,
      name: newTax.name,
      rate: Number(newTax.rate) / 100,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Tax profile added');
    setNewTax({ name: '', rate: '' });
    const { data } = await supabase
      .from('tax_profiles')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('name');
    setTaxProfiles((data || []) as TaxProfile[]);
  };

  const deleteTaxProfile = async (id: string) => {
    const { error } = await supabase.from('tax_profiles').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setTaxProfiles((tp) => tp.filter((t) => t.id !== id));
    toast.success('Tax profile removed');
  };

  const disconnectSquare = async () => {
    setDisconnectingSquare(true);
    try {
      const res = await fetch('/api/square/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');
      toast.success('Square disconnected');
      refetch();
    } catch {
      toast.error('Failed to disconnect Square');
    } finally {
      setDisconnectingSquare(false);
    }
  };

  const disconnectStripe = async () => {
    setDisconnectingStripe(true);
    try {
      const res = await fetch('/api/stripe/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');
      toast.success('Stripe disconnected');
      refetch();
    } catch {
      toast.error('Failed to disconnect Stripe');
    } finally {
      setDisconnectingStripe(false);
    }
  };

  // ============================================================================
  // Subscription handlers (Task 28)
  // ============================================================================

  const handleSubscribe = async (planTier: 'pro' | 'business') => {
    setSubscribing(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: planTier }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to start checkout');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to open billing portal');
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error('Failed to open billing portal. Please try again.');
    }
  };

  // ============================================================================
  // Product Types handlers (with jump_rings_required)
  // ============================================================================

  const ptHandleAdd = async () => {
    if (!tenant || !ptNewName.trim() || !ptNewInches) return;
    setPtSaving(true);
    try {
      // Try API route first
      const res = await fetch('/api/product-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          name: ptNewName.trim(),
          default_inches: Number(ptNewInches),
          jump_rings_required: Number(ptNewJumpRings) || 1,
        }),
      });

      if (res.ok) {
        toast.success('Product type added');
      } else {
        // Fallback: direct Supabase insert
        const { data: existing } = await supabase
          .from('product_types')
          .select('sort_order')
          .eq('tenant_id', tenant.id)
          .order('sort_order', { ascending: false })
          .limit(1);
        const nextSort = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

        const { error } = await supabase.from('product_types').insert({
          tenant_id: tenant.id,
          name: ptNewName.trim(),
          default_inches: Number(ptNewInches),
          jump_rings_required: Number(ptNewJumpRings) || 1,
          sort_order: nextSort,
          is_default: false,
        });
        if (error) {
          if (error.code === '23505') {
            toast.error('A product type with this name already exists');
          } else {
            toast.error(error.message);
          }
          return;
        }
        toast.success('Product type added');
      }
      setPtShowAdd(false);
      setPtNewName('');
      setPtNewInches('');
      setPtNewJumpRings('1');
      await loadProductTypes();
    } catch {
      toast.error('Failed to add product type');
    } finally {
      setPtSaving(false);
    }
  };

  const ptStartEdit = (pt: ProductType) => {
    setPtEditingId(pt.id);
    setPtEditName(pt.name);
    setPtEditInches(String(pt.default_inches));
    setPtEditJumpRings(String(pt.jump_rings_required ?? 1));
  };

  const ptHandleEdit = async () => {
    if (!ptEditingId || !ptEditName.trim() || !ptEditInches) return;
    setPtSaving(true);
    try {
      // Try API route first
      const res = await fetch(`/api/product-types/${ptEditingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ptEditName.trim(),
          default_inches: Number(ptEditInches),
          jump_rings_required: Number(ptEditJumpRings) || 1,
        }),
      });
      if (!res.ok) {
        // Fallback: direct Supabase
        const { error } = await supabase
          .from('product_types')
          .update({
            name: ptEditName.trim(),
            default_inches: Number(ptEditInches),
            jump_rings_required: Number(ptEditJumpRings) || 1,
          })
          .eq('id', ptEditingId);
        if (error) throw error;
      }
      toast.success('Product type updated');
      setPtEditingId(null);
      await loadProductTypes();
    } catch {
      toast.error('Failed to update product type');
    } finally {
      setPtSaving(false);
    }
  };

  const ptHandleDelete = async (pt: ProductType) => {
    if (pt.is_default) return;
    if (!confirm(`Delete "${pt.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/product-types/${pt.id}`, { method: 'DELETE' });
      if (!res.ok) {
        // Fallback
        const { error } = await supabase.from('product_types').delete().eq('id', pt.id);
        if (error) throw error;
      }
      toast.success('Product type deleted');
      await loadProductTypes();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const ptHandleReorder = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= productTypes.length) return;
    const updated = [...productTypes];
    const sortA = updated[index].sort_order;
    const sortB = updated[swapIndex].sort_order;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    setProductTypes(updated);
    try {
      await Promise.all([
        supabase.from('product_types').update({ sort_order: sortB }).eq('id', updated[index].id),
        supabase.from('product_types').update({ sort_order: sortA }).eq('id', updated[swapIndex].id),
      ]);
    } catch {
      toast.error('Failed to reorder');
      await loadProductTypes();
    }
  };

  // ============================================================================
  // Supplier handlers
  // ============================================================================

  // Track whether the supplier being edited is Sunstone (website locked)
  const [supEditIsSunstone, setSupEditIsSunstone] = useState(false);

  const supStartEdit = (s: Supplier) => {
    setSupEditingId(s.id);
    setSupEditIsSunstone(s.is_sunstone);
    setSupEditName(s.name);
    setSupEditContactName(s.contact_name || '');
    setSupEditContactEmail(s.contact_email || '');
    setSupEditContactPhone(s.contact_phone || '');
    setSupEditWebsite(s.website || '');
    setSupEditNotes(s.notes || '');
  };

  const supCancelEdit = () => {
    setSupEditingId(null);
    setSupEditIsSunstone(false);
    setSupEditName('');
    setSupEditContactName('');
    setSupEditContactEmail('');
    setSupEditContactPhone('');
    setSupEditWebsite('');
    setSupEditNotes('');
  };

  const supHandleEdit = async () => {
    if (!supEditingId || !supEditName.trim()) return;
    setSupSaving(true);
    const payload: any = {
      contact_name: supEditContactName.trim() || null,
      contact_email: supEditContactEmail.trim() || null,
      contact_phone: supEditContactPhone.trim() || null,
      notes: supEditNotes.trim() || null,
    };
    // Only include name and website if NOT Sunstone (those fields are locked)
    if (!supEditIsSunstone) {
      payload.name = supEditName.trim();
      payload.website = supEditWebsite.trim() || null;
    }
    try {
      const res = await fetch(`/api/suppliers/${supEditingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // Fallback
        const { error } = await supabase.from('suppliers').update(payload).eq('id', supEditingId);
        if (error) throw error;
      }
      toast.success('Supplier updated');
      supCancelEdit();
      await loadSuppliers();
    } catch {
      toast.error('Failed to update supplier');
    } finally {
      setSupSaving(false);
    }
  };

  const supHandleAdd = async () => {
    if (!tenant || !supAddName.trim()) return;
    setSupSaving(true);
    const payload = {
      tenant_id: tenant.id,
      name: supAddName.trim(),
      contact_name: supAddContactName.trim() || null,
      contact_email: supAddContactEmail.trim() || null,
      contact_phone: supAddContactPhone.trim() || null,
      website: supAddWebsite.trim() || null,
      notes: supAddNotes.trim() || null,
    };
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        // Fallback
        const { error } = await supabase.from('suppliers').insert(payload);
        if (error) throw error;
      }
      toast.success('Supplier added');
      setSupShowAdd(false);
      setSupAddName('');
      setSupAddContactName('');
      setSupAddContactEmail('');
      setSupAddContactPhone('');
      setSupAddWebsite('');
      setSupAddNotes('');
      await loadSuppliers();
    } catch {
      toast.error('Failed to add supplier');
    } finally {
      setSupSaving(false);
    }
  };

  const supHandleDelete = async (s: Supplier) => {
    if (s.is_sunstone) return;
    if (!confirm(`Delete "${s.name}"?`)) return;
    try {
      const res = await fetch(`/api/suppliers/${s.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { error } = await supabase.from('suppliers').delete().eq('id', s.id);
        if (error) throw error;
      }
      toast.success('Supplier deleted');
      await loadSuppliers();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!tenant)
    return (
      <div className="text-text-tertiary py-12 text-center">Loading…</div>
    );

  const tier = tenant.subscription_tier;
  const feeRate = PLATFORM_FEE_RATES[tier];
  const squareConnected = !!(tenant as any).square_merchant_id;
  const stripeConnected = !!tenant.stripe_account_id;
  const showTeamTab = can('team:manage');

  // Subscription derived state
  const trialActive = isTrialActive(tenant.subscription_status, tenant.trial_ends_at);
  const trialDays = getTrialDaysRemaining(tenant.trial_ends_at);
  const hasActiveSubscription = tenant.subscription_status === 'active';
  const isPastDue = tenant.subscription_status === 'past_due';
  const effectiveTier = trialActive ? tier : (hasActiveSubscription ? tier : 'starter');

  const activeMembers = teamMembers.filter((m) => !m.is_pending);
  const pendingMembers = teamMembers.filter((m) => m.is_pending);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
          Settings
        </h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'general'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-text-tertiary hover:text-text-primary'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'subscription'
              ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
              : 'border-transparent text-text-tertiary hover:text-text-primary'
          }`}
        >
          Subscription
        </button>
        {showTeamTab && (
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'team'
                ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-transparent text-text-tertiary hover:text-text-primary'
            }`}
          >
            Team
          </button>
        )}
      </div>

      {/* ================================================================ */}
      {/* General Settings Tab                                             */}
      {/* ================================================================ */}
      {activeTab === 'general' && (
        <div className="space-y-8">

          {/* ── 1. Business Info ── */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="My Jewelry Studio"
              />
              <Select
                label="Business Type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                options={BUSINESS_TYPE_OPTIONS}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
                <Input
                  label="Website"
                  type="url"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                  placeholder="https://myshop.com"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="primary" onClick={saveBusinessInfo} loading={savingBusiness}>
                Save Business Info
              </Button>
            </CardFooter>
          </Card>

          {/* ── 2. Branding (Logo + Color) ── */}
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--border-default)] bg-[var(--surface-raised)]">
                      <img
                        src={logoUrl}
                        alt="Business logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-[var(--border-default)] flex items-center justify-center"
                      style={{ backgroundColor: 'var(--surface-raised)' }}
                    >
                      <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                      <span className="text-sm font-medium text-[var(--accent-primary)] hover:underline cursor-pointer">
                        {uploadingLogo ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
                      </span>
                    </label>
                    {logoUrl && (
                      <button
                        onClick={removeLogo}
                        disabled={uploadingLogo}
                        className="text-xs text-red-500 hover:underline text-left"
                      >
                        Remove logo
                      </button>
                    )}
                    <span className="text-xs text-text-tertiary">PNG or JPG, max 2MB</span>
                  </div>
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-text-primary">Brand Color</label>
                <p className="text-sm text-text-secondary">
                  Choose an accent color for buttons, links, and highlights.
                </p>
                <div className="flex flex-wrap gap-3">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => selectPresetColor(preset.hex)}
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
                {isValidHexColor(accentColor) && (() => {
                  try {
                    const scale = generateAccentScale(accentColor);
                    return (
                      <div className="flex gap-1">
                        {[scale[50], scale[100], scale[200], scale[300], scale[400], scale[500], scale[600], scale[700], scale[800], scale[900]].map(
                          (color, i) => (
                            <div
                              key={i}
                              className="flex-1 h-6 rounded first:rounded-l-lg last:rounded-r-lg"
                              style={{ backgroundColor: color }}
                            />
                          )
                        )}
                      </div>
                    );
                  } catch {
                    return null;
                  }
                })()}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="primary" onClick={saveBrandColor} loading={savingBrand}>
                Save Branding
              </Button>
            </CardFooter>
          </Card>

          
          {/* ── 4. Payment Processing (pick one) ── */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Processing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-secondary">
                Connect one payment processor to accept card payments. Payments settle directly to your account.
              </p>

              {/* Processor selector tabs */}
              <div className="flex rounded-lg border border-[var(--border-default)] overflow-hidden">
                <button
                  onClick={() => setPaymentTab('square')}
                  className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
                    paymentTab === 'square'
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--surface-base)] text-text-secondary hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  Square {squareConnected && '✓'}
                </button>
                <button
                  onClick={() => setPaymentTab('stripe')}
                  className={`flex-1 py-3 text-sm font-medium text-center transition-colors border-l border-[var(--border-default)] ${
                    paymentTab === 'stripe'
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--surface-base)] text-text-secondary hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  Stripe {stripeConnected && '✓'}
                </button>
              </div>

              {/* Square pane */}
              {paymentTab === 'square' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {squareConnected ? (
                      <>
                        <Badge variant="accent" size="md">Connected</Badge>
                        <span className="text-sm text-text-secondary">
                          {(tenant as any).square_merchant_id}
                        </span>
                      </>
                    ) : (
                      <Badge variant="default" size="md">Not connected</Badge>
                    )}
                  </div>
                  {squareConnected ? (
                    <Button variant="danger" onClick={disconnectSquare} loading={disconnectingSquare}>
                      Disconnect Square
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => { window.location.href = '/api/square/authorize'; }}
                    >
                      Connect Square
                    </Button>
                  )}
                </div>
              )}

              {/* Stripe pane */}
              {paymentTab === 'stripe' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {stripeConnected ? (
                      <>
                        <Badge variant="accent" size="md">Connected</Badge>
                        <span className="text-sm text-text-secondary">
                          {tenant.stripe_account_id}
                        </span>
                      </>
                    ) : (
                      <Badge variant="default" size="md">Not connected</Badge>
                    )}
                  </div>
                  {stripeConnected ? (
                    <Button variant="danger" onClick={disconnectStripe} loading={disconnectingStripe}>
                      Disconnect Stripe
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => { window.location.href = '/api/stripe/authorize'; }}
                    >
                      Connect Stripe
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── 5. Tax Profiles ── */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Profiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {taxProfiles.length > 0 && (
                <div className="space-y-2">
                  {taxProfiles.map((tp) => (
                    <div
                      key={tp.id}
                      className="flex items-center justify-between bg-[var(--surface-base)] rounded-lg px-4 py-3"
                    >
                      <div>
                        <span className="font-medium text-text-primary">{tp.name}</span>
                        <span className="text-text-tertiary ml-2">
                          {(tp.rate * 100).toFixed(2)}%
                        </span>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => deleteTaxProfile(tp.id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {taxProfiles.length === 0 && (
                <p className="text-sm text-text-tertiary">No tax profiles yet. Add one below.</p>
              )}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Profile name (e.g. Texas)"
                    value={newTax.name}
                    onChange={(e) => setNewTax({ ...newTax, name: e.target.value })}
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Rate %"
                    value={newTax.rate}
                    onChange={(e) => setNewTax({ ...newTax, rate: e.target.value })}
                  />
                </div>
                <Button variant="secondary" onClick={addTaxProfile}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── 6. Product Types (with jump_rings_required) ── */}
          <Card>
            <CardHeader>
              <CardTitle>Product Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-tertiary">
                Define the products you sell from chain (bracelet, anklet, etc.). These appear as options when making a sale.
              </p>

              {ptLoading ? (
                <div className="text-sm text-text-tertiary py-2">Loading…</div>
              ) : productTypes.length > 0 ? (
                <div className="border border-[var(--border-default)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)]">
                  {productTypes.map((pt, index) => (
                    <div key={pt.id}>
                      {ptEditingId === pt.id ? (
                        <div className="p-3 bg-[var(--surface-raised)] space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={ptEditName}
                              onChange={(e) => setPtEditName(e.target.value)}
                              className="flex-1 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              placeholder="Name"
                            />
                            <div className="relative w-28">
                              <input
                                type="number"
                                step="0.25"
                                min="0.25"
                                value={ptEditInches}
                                onChange={(e) => setPtEditInches(e.target.value)}
                                className="w-full h-9 px-3 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">in</span>
                            </div>
                            <div className="relative w-20">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={ptEditJumpRings}
                                onChange={(e) => setPtEditJumpRings(e.target.value)}
                                className="w-full h-9 px-3 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                                title="Jump rings required per product"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">JR</span>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setPtEditingId(null)}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={ptHandleEdit} disabled={ptSaving}>
                              {ptSaving ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => ptHandleReorder(index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => ptHandleReorder(index, 'down')}
                              disabled={index === productTypes.length - 1}
                              className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-[var(--text-primary)] font-medium">{pt.name}</span>
                            <span className="text-xs text-[var(--text-tertiary)] ml-2">
                              {Number(pt.default_inches).toFixed(2)} in
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)] ml-2">
                              · {pt.jump_rings_required ?? 1} JR
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => ptStartEdit(pt)}
                              className="text-xs text-[var(--accent-primary)] hover:underline px-2 py-1"
                            >
                              Edit
                            </button>
                            {pt.is_default ? (
                              <span className="text-[var(--text-tertiary)] px-2 py-1 flex items-center" title="Default types cannot be deleted">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                              </span>
                            ) : (
                              <button
                                onClick={() => ptHandleDelete(pt)}
                                className="text-xs text-red-500 hover:underline px-2 py-1"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary py-2">No product types yet. Run the chain products migration to seed defaults, or add below.</p>
              )}

              {/* Add form */}
              {ptShowAdd ? (
                <div className="p-3 border border-[var(--border-default)] rounded-xl bg-[var(--surface-raised)] space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ptNewName}
                      onChange={(e) => setPtNewName(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      placeholder="Product name (e.g., Belly Chain)"
                      autoFocus
                    />
                    <div className="relative w-28">
                      <input
                        type="number"
                        step="0.25"
                        min="0.25"
                        value={ptNewInches}
                        onChange={(e) => setPtNewInches(e.target.value)}
                        className="w-full h-9 px-3 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">in</span>
                    </div>
                    <div className="relative w-20">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={ptNewJumpRings}
                        onChange={(e) => setPtNewJumpRings(e.target.value)}
                        className="w-full h-9 px-3 pr-8 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        placeholder="1"
                        title="Jump rings required"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">JR</span>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setPtShowAdd(false); setPtNewName(''); setPtNewInches(''); setPtNewJumpRings('1'); }}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={ptHandleAdd} disabled={ptSaving || !ptNewName.trim() || !ptNewInches}>
                      {ptSaving ? 'Adding…' : 'Add'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setPtShowAdd(true)}>
                  + Add Product Type
                </Button>
              )}
            </CardContent>
          </Card>

          {/* ── 6b. Materials ── */}
          <Card>
            <CardContent className="pt-6">
              <MaterialsSection tenantId={tenant.id} />
            </CardContent>
          </Card>

          {/* ── 7. Suppliers ── */}
          <Card>
            <CardHeader>
              <CardTitle>Suppliers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-tertiary">
                Manage your chain and supply vendors.
              </p>

              {supLoading ? (
                <div className="text-sm text-text-tertiary py-2">Loading…</div>
              ) : suppliers.length > 0 ? (
                <div className="border border-[var(--border-default)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)]">
                  {suppliers.map((s) => (
                    <div key={s.id}>
                      {supEditingId === s.id ? (
                        /* Edit form — individual state fields prevent cursor-jump */
                        <div className="p-3 bg-[var(--surface-raised)] space-y-2">
                          {supEditIsSunstone && (
                            <p className="text-xs text-[var(--text-tertiary)] italic">
                              You can save your Sunstone rep&apos;s contact info here. Company name and website are locked.
                            </p>
                          )}
                          <input
                            type="text"
                            value={supEditName}
                            onChange={(e) => setSupEditName(e.target.value)}
                            className={`w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] ${
                              supEditIsSunstone ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            placeholder="Supplier name *"
                            disabled={supEditIsSunstone}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={supEditContactName}
                              onChange={(e) => setSupEditContactName(e.target.value)}
                              className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              placeholder="Contact name"
                            />
                            <input
                              type="email"
                              value={supEditContactEmail}
                              onChange={(e) => setSupEditContactEmail(e.target.value)}
                              className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              placeholder="Email"
                            />
                            <input
                              type="tel"
                              value={supEditContactPhone}
                              onChange={(e) => setSupEditContactPhone(e.target.value)}
                              className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                              placeholder="Phone"
                            />
                            <input
                              type="url"
                              value={supEditWebsite}
                              onChange={(e) => setSupEditWebsite(e.target.value)}
                              className={`h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] ${
                                supEditIsSunstone ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              placeholder="Website"
                              disabled={supEditIsSunstone}
                              title={supEditIsSunstone ? 'Sunstone website cannot be changed' : ''}
                            />
                          </div>
                          <textarea
                            value={supEditNotes}
                            onChange={(e) => setSupEditNotes(e.target.value)}
                            className="w-full h-16 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                            placeholder="Notes (optional)"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={supCancelEdit}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={supHandleEdit} disabled={supSaving || !supEditName.trim()}>
                              {supSaving ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {s.is_sunstone && <span className="text-amber-500">✦</span>}
                              <span className="text-sm text-[var(--text-primary)] font-medium">{s.name}</span>
                            </div>
                            {s.website && (
                              <span className="text-xs text-[var(--text-tertiary)]">{s.website.replace(/^https?:\/\//, '')}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => supStartEdit(s)}
                              className="text-xs text-[var(--accent-primary)] hover:underline px-2 py-1"
                            >
                              Edit
                            </button>
                            {s.is_sunstone ? (
                              <span className="text-[var(--text-tertiary)] px-2 py-1" title="Sunstone Supply cannot be deleted">🔒</span>
                            ) : (
                              <button
                                onClick={() => supHandleDelete(s)}
                                className="text-xs text-red-500 hover:underline px-2 py-1"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-tertiary py-2">No suppliers yet. Run the chain products migration to seed Sunstone Supply, or add below.</p>
              )}

              {/* Add form — individual state fields prevent cursor-jump */}
              {supShowAdd ? (
                <div className="p-3 border border-[var(--border-default)] rounded-xl bg-[var(--surface-raised)] space-y-2">
                  <input
                    type="text"
                    value={supAddName}
                    onChange={(e) => setSupAddName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    placeholder="Supplier name *"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={supAddContactName}
                      onChange={(e) => setSupAddContactName(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      placeholder="Contact name"
                    />
                    <input
                      type="email"
                      value={supAddContactEmail}
                      onChange={(e) => setSupAddContactEmail(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      placeholder="Email"
                    />
                    <input
                      type="tel"
                      value={supAddContactPhone}
                      onChange={(e) => setSupAddContactPhone(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      placeholder="Phone"
                    />
                    <input
                      type="url"
                      value={supAddWebsite}
                      onChange={(e) => setSupAddWebsite(e.target.value)}
                      className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      placeholder="Website"
                    />
                  </div>
                  <textarea
                    value={supAddNotes}
                    onChange={(e) => setSupAddNotes(e.target.value)}
                    className="w-full h-16 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                    placeholder="Notes (optional)"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSupShowAdd(false);
                      setSupAddName(''); setSupAddContactName(''); setSupAddContactEmail('');
                      setSupAddContactPhone(''); setSupAddWebsite(''); setSupAddNotes('');
                    }}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={supHandleAdd} disabled={supSaving || !supAddName.trim()}>
                      {supSaving ? 'Adding…' : 'Add'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => setSupShowAdd(true)}>
                  + Add Supplier
                </Button>
              )}
            </CardContent>
          </Card>

          {/* ── 8. Waiver Text ── */}
          <Card>
            <CardHeader>
              <CardTitle>Waiver Text</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={waiverText}
                onChange={(e) => setWaiverText(e.target.value)}
                rows={6}
                helperText="This text will be shown to customers when they sign a waiver."
              />
            </CardContent>
            <CardFooter>
              <Button variant="primary" onClick={saveWaiverText}>
                Save Waiver Text
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* Subscription Tab (Task 28)                                       */}
      {/* ================================================================ */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">

          {/* Trial banner */}
          {trialActive && (
            <div className="bg-gradient-to-r from-[var(--accent-50)] to-[var(--accent-100)] border border-[var(--accent-200)] rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    You&apos;re on your 60-day Pro trial
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    <span className="font-semibold text-[var(--accent-primary)]">{trialDays} day{trialDays !== 1 ? 's' : ''}</span> remaining.
                    You have full access to all Pro features. Subscribe before your trial ends to keep them.
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-2">
                    After your trial, you&apos;ll drop to the Starter plan (3% fee, limited AI, no reports).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Past due warning */}
          {isPastDue && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
                <div>
                  <h3 className="text-base font-semibold text-red-800">Payment Failed</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Your last payment didn&apos;t go through. Please update your payment method to keep your subscription active.
                  </p>
                  <Button variant="danger" className="mt-3" onClick={handleManageSubscription}>
                    Update Payment Method
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Current plan status */}
          {hasActiveSubscription && !isPastDue && (
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="accent" size="md">
                      {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                    </Badge>
                    <span className="text-sm text-text-secondary">
                      ${SUBSCRIPTION_PRICES[tier]}/mo
                    </span>
                    <span className="text-xs text-green-600 font-medium">Active</span>
                  </div>
                  <Button variant="secondary" onClick={handleManageSubscription}>
                    Manage Subscription
                  </Button>
                </div>
                {tenant.subscription_period_end && (
                  <p className="text-xs text-text-tertiary mt-3">
                    Next billing date: {new Date(tenant.subscription_period_end).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Starter plan notice (trial expired, no subscription) */}
          {!trialActive && !hasActiveSubscription && !isPastDue && effectiveTier === 'starter' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-base font-semibold text-amber-900">You&apos;re on the Starter plan</h3>
              <p className="text-sm text-amber-800 mt-1">
                Upgrade to Pro or Business to unlock lower fees, unlimited AI, reports, CRM, and more.
              </p>
            </div>
          )}

          {/* Plan cards — show when not on active paid subscription */}
          {(!hasActiveSubscription || trialActive) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pro card */}
              <div className="border border-[var(--border-default)] rounded-2xl p-5 space-y-4 bg-[var(--surface-raised)]">
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Pro</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-[var(--text-primary)]">$129</span>
                    <span className="text-sm text-text-tertiary">/mo</span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {PLAN_FEATURES.pro.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleSubscribe('pro')}
                  loading={subscribing}
                >
                  {trialActive ? 'Subscribe to Pro' : 'Upgrade to Pro'}
                </Button>
              </div>

              {/* Business card */}
              <div className="border-2 border-[var(--accent-primary)] rounded-2xl p-5 space-y-4 bg-[var(--surface-raised)] relative">
                <div className="absolute -top-3 right-4">
                  <Badge variant="accent" size="sm">Best Value</Badge>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Business</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-[var(--text-primary)]">279</span>
                    <span className="text-sm text-text-tertiary">/mo</span>
                  </div>
                </div>
                <ul className="space-y-2">
                  {PLAN_FEATURES.business.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleSubscribe('business')}
                  loading={subscribing}
                >
                  {trialActive ? 'Subscribe to Business' : 'Upgrade to Business'}
                </Button>
              </div>
            </div>
          )}

          {/* Plan comparison table */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="text-left py-2 pr-4 text-text-tertiary font-medium">Feature</th>
                      <th className="text-center py-2 px-3 text-text-tertiary font-medium">Starter</th>
                      <th className="text-center py-2 px-3 text-text-tertiary font-medium">Pro</th>
                      <th className="text-center py-2 px-3 text-text-tertiary font-medium">Business</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    <tr>
                      <td className="py-2.5 pr-4 text-text-secondary">Platform fee</td>
                      <td className="py-2.5 px-3 text-center text-text-primary">3%</td>
                      <td className="py-2.5 px-3 text-center text-text-primary">1.5%</td>
                      <td className="py-2.5 px-3 text-center text-green-600 font-semibold">0%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-text-secondary">Sunny AI</td>
                      <td className="py-2.5 px-3 text-center text-text-tertiary">5/mo</td>
                      <td className="py-2.5 px-3 text-center text-text-primary">Unlimited</td>
                      <td className="py-2.5 px-3 text-center text-text-primary">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-text-secondary">Business insights</td>
                      <td className="py-2.5 px-3 text-center text-text-tertiary">—</td>
                      <td className="py-2.5 px-3 text-center text-green-600">✓</td>
                      <td className="py-2.5 px-3 text-center text-green-600">✓</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-text-secondary">Full P&L reports</td>
                      <td className="py-2.5 px-3 text-center text-text-tertiary">—</td>
                      <td className="py-2.5 px-3 text-center text-green-600">✓</td>
                      <td className="py-2.5 px-3 text-center text-green-600">✓</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-text-secondary">CRM</td>
                      <td className="py-2.5 px-3 text-center text-text-tertiary">—</td>
                      <td className="py-2.5 px-3 text-center text-green-600">✓</td>
                      <td className="py-2.5 px-3 text-center text-green-600">✓</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-text-secondary">Team members</td>
                      <td className="py-2.5 px-3 text-center text-text-primary">1</td>
                      <td className="py-2.5 px-3 text-center text-text-primary">3</td>
                      <td className="py-2.5 px-3 text-center text-text-primary">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-4 text-text-secondary">Price</td>
                      <td className="py-2.5 px-3 text-center text-text-primary font-semibold">Free</td>
                      <td className="py-2.5 px-3 text-center text-text-primary font-semibold">$129/mo</td>
                      <td className="py-2.5 px-3 text-center text-text-primary font-semibold">$279/mo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          {/* ── 3. Subscription & Fees (combined) ── */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Plan info */}
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="accent" size="md">
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Badge>
                <span className="text-text-secondary">
                  ${SUBSCRIPTION_PRICES[tier]}/mo
                </span>
                <span className="text-text-tertiary">·</span>
                <span className="text-text-secondary">
                  {(feeRate * 100).toFixed(1)}% platform fee
                </span>
              </div>

              {/* Fee handling */}
              {feeRate > 0 && (
                <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                  <p className="text-sm text-text-secondary">
                    Choose how the {(feeRate * 100).toFixed(1)}% platform fee is handled for each sale.
                  </p>
                  <label className="flex items-start gap-3 p-4 rounded-lg border border-border-default cursor-pointer hover:border-border-strong transition-colors has-[:checked]:border-accent-500 has-[:checked]:bg-accent-50">
                    <input
                      type="radio"
                      name="feeHandling"
                      checked={feeHandling === 'pass_to_customer'}
                      onChange={() => setFeeHandling('pass_to_customer')}
                      className="mt-1 accent-[var(--accent-500)]"
                    />
                    <div>
                      <div className="font-medium text-text-primary">Pass to customer</div>
                      <div className="text-sm text-text-secondary">
                        Fee appears as a &quot;Service Fee&quot; line item on the receipt. Customer pays it.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 rounded-lg border border-border-default cursor-pointer hover:border-border-strong transition-colors has-[:checked]:border-accent-500 has-[:checked]:bg-accent-50">
                    <input
                      type="radio"
                      name="feeHandling"
                      checked={feeHandling === 'absorb'}
                      onChange={() => setFeeHandling('absorb')}
                      className="mt-1 accent-[var(--accent-500)]"
                    />
                    <div>
                      <div className="font-medium text-text-primary">Absorb fee</div>
                      <div className="text-sm text-text-secondary">
                        Fee deducted from your payout. Customer sees no additional charges.
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </CardContent>
            {feeRate > 0 && (
              <CardFooter>
                <Button variant="primary" onClick={saveFeeHandling}>
                  Save Fee Handling
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* Team Management Tab                                              */}
      {/* ================================================================ */}
      {activeTab === 'team' && showTeamTab && (
        <div className="space-y-6">
          {/* Header with invite button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Team Members</h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Invite team members and manage their roles.
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowInviteModal(true)}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Invite
              </span>
            </Button>
          </div>

          {/* Active Members */}
          <Card>
            <CardHeader>
              <CardTitle>Active ({activeMembers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <p className="text-sm text-text-tertiary py-4 text-center">Loading…</p>
              ) : activeMembers.length === 0 ? (
                <p className="text-sm text-text-tertiary py-4 text-center">
                  No team members yet. Invite someone to get started.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {activeMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary truncate">
                            {member.display_name || member.invited_email || 'Unknown'}
                          </span>
                          {member.is_owner && (
                            <Badge variant="accent" size="sm">Owner</Badge>
                          )}
                        </div>
                        {member.invited_email && member.display_name && (
                          <div className="text-xs text-text-tertiary truncate">
                            {member.invited_email}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {member.is_owner ? (
                          <Badge variant={ROLE_CONFIG.admin.variant} size="md">
                            {ROLE_CONFIG.admin.label}
                          </Badge>
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member, e.target.value as TenantRole)}
                            className="text-xs rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] min-h-[36px]"
                          >
                            {ALL_ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                        {!member.is_owner && (
                          <button
                            onClick={() => setConfirmRemove(member)}
                            className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Remove member"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invites */}
          {pendingMembers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Invites ({pendingMembers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-text-secondary truncate">
                            {member.invited_email || 'Unknown'}
                          </span>
                          <Badge variant="warning" size="sm">Pending</Badge>
                          <Badge variant={ROLE_CONFIG[member.role].variant} size="sm">
                            {ROLE_CONFIG[member.role].label}
                          </Badge>
                        </div>
                        {member.display_name && (
                          <div className="text-xs text-text-tertiary">{member.display_name}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => handleResendInvite(member)}>
                          Resend
                        </Button>
                        <button
                          onClick={() => setConfirmRemove(member)}
                          className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Cancel invite"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role legend */}
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-text-primary">Admin</span>
                  <span className="text-text-secondary ml-2">
                    — Full access to everything including settings, payments, and team management.
                  </span>
                </div>
                <div>
                  <span className="font-medium text-text-primary">Manager</span>
                  <span className="text-text-secondary ml-2">
                    — Can use POS, manage inventory and events, view reports, apply discounts, and process refunds. Cannot access settings or team management.
                  </span>
                </div>
                <div>
                  <span className="font-medium text-text-primary">Staff</span>
                  <span className="text-text-secondary ml-2">
                    — Can use POS, manage queue, and view inventory/events/clients. Cannot edit, delete, or apply discounts.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* Invite Modal                                                     */}
      {/* ================================================================ */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} size="sm">
        <ModalHeader>
          <h2 className="text-lg font-semibold text-text-primary">Invite Team Member</h2>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="team@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Select
            label="Role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as TenantRole)}
            options={ROLE_OPTIONS}
          />
          <Input
            label="Display Name (optional)"
            placeholder="Jane Smith"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            helperText="How they'll appear in the team list."
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowInviteModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleInvite} loading={inviting}>
            Send Invite
          </Button>
        </ModalFooter>
      </Modal>

      {/* ================================================================ */}
      {/* Remove Confirmation Modal                                        */}
      {/* ================================================================ */}
      <Modal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        size="sm"
      >
        <ModalHeader>
          <h2 className="text-lg font-semibold text-text-primary">
            {confirmRemove?.is_pending ? 'Cancel Invite' : 'Remove Team Member'}
          </h2>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-text-secondary">
            {confirmRemove?.is_pending
              ? `Cancel the pending invite for ${confirmRemove.invited_email}? They won't be able to join your team.`
              : `Remove ${confirmRemove?.display_name || confirmRemove?.invited_email} from your team? They'll lose access to your business on Sunstone.`
            }
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
            Keep
          </Button>
          <Button variant="danger" onClick={handleRemoveMember} loading={removing}>
            {confirmRemove?.is_pending ? 'Cancel Invite' : 'Remove'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

export default function SettingsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-text-secondary">Loading...</p></div>}>
      <SettingsPage />
    </Suspense>
  );
}