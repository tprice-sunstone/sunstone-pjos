-- Add average service time column to tenants for queue wait time estimation
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS avg_service_minutes integer DEFAULT 10;
