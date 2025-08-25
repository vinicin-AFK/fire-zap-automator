-- Fix security vulnerability in subscribers table RLS policies
-- Issue: Overly permissive insert and update policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

-- Create secure insert policy - only authenticated users can insert their own records
CREATE POLICY "authenticated_users_can_insert_own_subscription" ON public.subscribers
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND auth.email() = email
);

-- Create secure update policy - only authenticated users can update their own records
CREATE POLICY "authenticated_users_can_update_own_subscription" ON public.subscribers
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = user_id 
  AND auth.email() = email
)
WITH CHECK (
  auth.uid() = user_id 
  AND auth.email() = email
);