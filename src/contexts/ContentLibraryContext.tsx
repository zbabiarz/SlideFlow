import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface LibraryImage {
  id: string;
  file?: File;
  url: string;
  name: string;
  uploadedAt: string;
  size: number;
  path?: string;
  bucket?: string;
  source: 'local' | 'supabase';
}

export interface UploadedFileInfo {
  path: string;
  bucket: string;
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  created_at?: string;
}

interface ContentLibraryContextType {
  images: LibraryImage[];
  addImages: (files: File[]) => void;
  addUploadedFiles: (uploaded: UploadedFileInfo[]) => Promise<void>;
  refreshLibrary: () => Promise<void>;
  removeImage: (id: string) => void;
  clearLibrary: () => void;
  loading: boolean;
}

const ContentLibraryContext = createContext<ContentLibraryContextType | undefined>(undefined);

export function useContentLibrary() {
  const context = useContext(ContentLibraryContext);
  if (context === undefined) {
    throw new Error('useContentLibrary must be used within a ContentLibraryProvider');
  }
  return context;
}

interface ContentLibraryProviderProps {
  children: ReactNode;
}

export function ContentLibraryProvider({ children }: ContentLibraryProviderProps) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Fetch all user files from Supabase storage (user/date/file structure).
  const refreshLibrary = async () => {
    if (!user) {
      setImages([]);
      return;
    }

    setLoading(true);
    try {
      const storage = supabase.storage.from('media');

      // Helper to list files recursively under a prefix.
      const listFiles = async (prefix: string): Promise<UploadedFileInfo[]> => {
        const { data, error } = await storage.list(prefix, { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });
        if (error) throw error;
        const results: UploadedFileInfo[] = [];

        for (const entry of data || []) {
          const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;

          // Folder entries have metadata === null; recurse into them.
          if (!entry.metadata) {
            const nested = await listFiles(fullPath);
            results.push(...nested);
            continue;
          }

          results.push({
            path: fullPath,
            bucket: 'media',
            filename: entry.name,
            size_bytes: entry.metadata.size,
            created_at: entry.created_at ?? entry.updated_at ?? new Date().toISOString()
          });
        }

        return results;
      };

      const prefixes = [user.id, `user_${user.id}`];
      const uploaded = (
        await Promise.all(prefixes.map(prefix => listFiles(prefix)))
      ).flat();

      // Deduplicate by path in case both prefixes exist.
      const uniqueByPath = new Map(uploaded.map((f) => [f.path, f]));

      const uploadedFiles = Array.from(uniqueByPath.values());

      if (uploadedFiles.length === 0) {
        setImages(prev => prev.filter(img => img.source === 'local'));
        return;
      }

      const { data: signedUrls, error: signedError } = await storage.createSignedUrls(
        uploadedFiles.map((f) => f.path),
        60 * 60 // 1 hour
      );
      if (signedError) throw signedError;

      const newImages: LibraryImage[] = uploadedFiles.map((file, idx) => ({
        id: file.path,
        url: signedUrls?.[idx]?.signedUrl || '',
        name: file.filename || file.path.split('/').pop() || 'file',
        uploadedAt: file.created_at || new Date().toISOString(),
        size: file.size_bytes || 0,
        path: file.path,
        bucket: file.bucket,
        source: 'supabase'
      }));

      setImages((prev) => {
        const locals = prev.filter(img => img.source === 'local');
        return [...locals, ...newImages];
      });
    } catch (error) {
      console.error('Failed to refresh media library:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Add local files (client-side previews before upload or for immediate session use).
  const addImages = (files: File[]) => {
    const newImages: LibraryImage[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      source: 'local'
    }));

    setImages(prev => [...newImages, ...prev]);
  };

  // Add files that were uploaded to Supabase (expects bucket/path info).
  const addUploadedFiles = async (uploaded: UploadedFileInfo[]) => {
    if (!uploaded.length) return;
    const storage = supabase.storage.from('media');
    try {
      const { data: signedUrls, error } = await storage.createSignedUrls(
        uploaded.map((f) => f.path),
        60 * 60
      );
      if (error) throw error;

      const newImages: LibraryImage[] = uploaded.map((file, idx) => ({
        id: file.path,
        url: signedUrls?.[idx]?.signedUrl || '',
        name: file.filename || file.path.split('/').pop() || 'file',
        uploadedAt: file.created_at || new Date().toISOString(),
        size: file.size_bytes || 0,
        path: file.path,
        bucket: file.bucket,
        source: 'supabase'
      }));

      setImages(prev => {
        // Avoid duplicates based on path.
        const existing = new Set(prev.map(img => img.id));
        const merged = [...prev];
        newImages.forEach(img => {
          if (!existing.has(img.id)) merged.push(img);
        });
        return merged;
      });
    } catch (error) {
      console.error('Failed to add uploaded files to library:', error);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        if (imageToRemove.source === 'local') {
          URL.revokeObjectURL(imageToRemove.url);
        } else if (imageToRemove.path) {
          supabase.storage.from('media').remove([imageToRemove.path]).catch((err) => {
            console.error('Failed to remove image from storage:', err);
          });
        }
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const clearLibrary = () => {
    images.forEach(image => {
      if (image.source === 'local') {
        URL.revokeObjectURL(image.url);
      }
    });
    setImages(images.filter(img => img.source === 'supabase'));
  };

  const value = {
    images,
    addImages,
    addUploadedFiles,
    refreshLibrary,
    removeImage,
    clearLibrary,
    loading
  };

  return (
    <ContentLibraryContext.Provider value={value}>
      {children}
    </ContentLibraryContext.Provider>
  );
}
