-- Migration: Add force_change_password column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_change_password BOOLEAN DEFAULT false;
