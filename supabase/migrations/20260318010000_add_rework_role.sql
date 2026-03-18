-- Migration: Add 'rework' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rework' AFTER 'installation';
