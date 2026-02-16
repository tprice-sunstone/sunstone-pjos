'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';

interface LogoUploadProps {
  tenantId: string;
  currentLogoUrl: string | null;
  onUploadComplete: (url: string | null) => void;
}

export default function LogoUpload({ tenantId, currentLogoUrl, onUploadComplete }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, WebP, or SVG file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `logos/${tenantId}/logo-${Date.now()}.${ext}`;

      // Upload to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from('tenant-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tenant-assets')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update tenant record
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: publicUrl })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      // Delete old logo if it exists and is different
      if (currentLogoUrl && currentLogoUrl !== publicUrl) {
        try {
          const oldPath = currentLogoUrl.split('/tenant-assets/')[1];
          if (oldPath) {
            await supabase.storage.from('tenant-assets').remove([oldPath]);
          }
        } catch {
          // Non-critical — old file cleanup failure is fine
        }
      }

      setPreview(publicUrl);
      onUploadComplete(publicUrl);
      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    setUploading(true);
    try {
      // Remove from tenant record
      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: null })
        .eq('id', tenantId);

      if (error) throw error;

      // Try to remove from storage
      if (currentLogoUrl) {
        try {
          const path = currentLogoUrl.split('/tenant-assets/')[1];
          if (path) {
            await supabase.storage.from('tenant-assets').remove([path]);
          }
        } catch {
          // Non-critical
        }
      }

      setPreview(null);
      onUploadComplete(null);
      toast.success('Logo removed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview */}
      {preview ? (
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] flex items-center justify-center overflow-hidden">
            <img
              src={preview}
              alt="Business logo"
              className="max-w-full max-h-full object-contain"
              onError={() => setPreview(null)}
            />
          </div>
          <div className="space-y-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              loading={uploading}
            >
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeLogo}
              loading={uploading}
              className="text-red-500 hover:text-red-600"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed border-[var(--border-default)] bg-[var(--surface-raised)] hover:border-[var(--accent-primary)] hover:bg-[var(--accent-50,var(--surface-raised))] transition-colors cursor-pointer group"
        >
          {uploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
          ) : (
            <>
              <svg className="w-8 h-8 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              <span className="text-sm text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">
                Click to upload your logo
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                PNG, JPG, WebP, or SVG · Max 2MB
              </span>
            </>
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}