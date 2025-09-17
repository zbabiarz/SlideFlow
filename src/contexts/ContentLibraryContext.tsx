import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface LibraryImage {
  id: string;
  file: File;
  url: string;
  name: string;
  uploadedAt: string;
  size: number;
}

interface ContentLibraryContextType {
  images: LibraryImage[];
  addImages: (files: File[]) => void;
  removeImage: (id: string) => void;
  clearLibrary: () => void;
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

  const addImages = (files: File[]) => {
    const newImages: LibraryImage[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      uploadedAt: new Date().toISOString(),
      size: file.size
    }));
    
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const clearLibrary = () => {
    images.forEach(image => URL.revokeObjectURL(image.url));
    setImages([]);
  };

  const value = {
    images,
    addImages,
    removeImage,
    clearLibrary
  };

  return (
    <ContentLibraryContext.Provider value={value}>
      {children}
    </ContentLibraryContext.Provider>
  );
}