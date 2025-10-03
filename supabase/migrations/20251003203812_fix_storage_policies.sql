/*
  # Fix Storage Policies - Remove System Table Modifications

  1. Changes
    - Drop and recreate storage policies without attempting to modify storage.objects table
    - storage.objects already has RLS enabled by Supabase by default
    
  2. Security
    - Maintain user-scoped file access policies
    - Users can only access their own files in the media bucket
*/

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload files to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;

-- Policy for uploading files (INSERT)
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for viewing files (SELECT)  
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for updating files (UPDATE)
CREATE POLICY "Users can update own files"  
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for deleting files (DELETE)
CREATE POLICY "Users can delete own files"
ON storage.objects  
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);