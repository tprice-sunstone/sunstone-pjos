import type { Metadata } from 'next'
import { createServerSupabase } from '@/lib/supabase/server'
import CRMPageClient from './crm-client'

export const metadata: Metadata = {
  title: 'CRM — Your AI-Powered Business Phone | Sunstone Studio',
  description: 'A dedicated phone number, automated marketing, and an AI assistant that texts your clients for you — all for $69/month. Replace $200-900/month in tools with one platform built for permanent jewelry artists.',
  openGraph: {
    title: 'CRM — Your AI-Powered Business Phone | Sunstone Studio',
    description: 'Sunny AI answers your client texts, sends aftercare, books appointments, and keeps your business top of mind — automatically.',
    url: 'https://sunstonepj.app/crm',
    siteName: 'Sunstone Studio',
    type: 'website',
  },
}

export default async function CRMPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  return <CRMPageClient isLoggedIn={!!user} />
}
