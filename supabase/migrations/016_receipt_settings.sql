-- 016_receipt_settings.sql
-- Add receipt customization columns to tenants table

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_email_receipt BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS auto_sms_receipt BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS receipt_tagline TEXT DEFAULT '';
