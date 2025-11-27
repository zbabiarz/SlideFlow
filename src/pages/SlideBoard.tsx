import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContentLibrary } from '../contexts/ContentLibraryContext';
import { supabase } from '../lib/supabase';
import ImportLibraryModal from '../components/ImportLibraryModal';
import Navbar from '../components/Navbar';
import { 
  Upload, 
  X, 
  FolderOpen,
  ArrowRight
} from 'lucide-react';

const BUCKET_NAME = "media";
const ASPECT = "1080x1350";
const MAX_FILES = 10;

const ensureImageSlots = (arr: Array<File | undefined>) =>
  Array.from({ length: MAX_FILES }, (_, i) => arr[i]);

const countImages = (arr: Array<File | undefined>) =>
  arr.filter(Boolean).length;

// Upload one file to Supabase, preserving original filename at the end of the path
async function uploadOne(userId: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const ts = Date.now();
  const path = `user_${userId}/${new Date().toISOString().slice(0,10)}/${ts}_${crypto.randomUUID()}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, { upsert: false });

  if (error) throw error;

  return {
    bucket: BUCKET_NAME,
    path,
    filename: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
  };
}

export default function SlideBoard() {
  const [images, setImages] = useState<Array<File | undefined>>(Array(MAX_FILES).fill(undefined));
  const [description, setDescription] = useState('');
  const [captionPrompt, setCaptionPrompt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  
  const { user } = useAuth();
  const { addUploadedFiles, refreshLibrary } = useContentLibrary();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const uploadToSupabase = async (files: File[]) => {
    if (!files.length) return;
    if (!user) {
      alert('Please log in to upload images.');
      return;
    }
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      alert('Your session expired. Please log back in to upload.');
      return;
    }

    setUploading(true);
    console.info('Starting upload batch:', files.map((f) => f.name));
    const successes: Awaited<ReturnType<typeof uploadOne>>[] = [];
    const failures: { file: File; error: any }[] = [];

    for (const file of files) {
      try {
        const info = await uploadOne(user.id, file);
        successes.push(info);
        console.info('Uploaded file to Supabase:', info.path);
      } catch (error) {
        console.error('Upload failed for file:', file.name, error);
        failures.push({ file, error });
      }
    }

    if (successes.length) {
      console.info('Uploaded to Supabase:', successes.map((s) => s.path));
      await addUploadedFiles(successes);
      // Force a refresh so the Media Library stays in sync.
      if (refreshLibrary) {
        try {
          await refreshLibrary();
        } catch (err) {
          console.warn('Refresh library after upload failed:', err);
        }
      }
    }
    if (failures.length) {
      alert(`Uploaded ${successes.length} file(s); ${failures.length} failed. Check console for details.`);
    }
    setUploading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!user) {
      alert('Please log in to upload images.');
      return;
    }

    const filesToPlace = files.slice(0, MAX_FILES); // safety slice
    const added: File[] = [];
    setImages(prev => {
      const next = ensureImageSlots([...prev]);
      for (const file of filesToPlace) {
        const slot = next.findIndex(v => !v);
        if (slot === -1) break;
        next[slot] = file;
        added.push(file);
      }
      return ensureImageSlots(next);
    });

    if (added.length) {
      await uploadToSupabase(added);
    }
  };

  const handleFileDrop = async (fileList: FileList, targetIndex: number) => {
    const files = Array.from(fileList).filter(file => {
      const isImageType = file.type.startsWith('image/');
      const isImageExt = /\.(png|jpe?g)$/i.test(file.name);
      return isImageType || isImageExt;
    });

    if (!files.length) return;
    if (!user) {
      alert('Please log in to upload images.');
      return;
    }

    const added: File[] = [];
    setImages(prev => {
      const next = ensureImageSlots([...prev]);
      let currentIndex = targetIndex;

      for (const file of files) {
        if (currentIndex >= MAX_FILES) break;
        next[currentIndex] = file;
        added.push(file);
        currentIndex += 1;
      }

      return ensureImageSlots(next);
    });

    if (added.length) {
      await uploadToSupabase(added);
    }
  };

  const handleImportFromLibrary = (importedImages: File[]) => {
    if (!importedImages.length) return;
    setImages(prev => {
      const next = ensureImageSlots(prev);
      const added: File[] = [];
      for (const file of importedImages) {
        const slot = next.findIndex(v => !v);
        if (slot === -1) break;
        next[slot] = file;
        added.push(file);
      }
      return ensureImageSlots(next);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const next = ensureImageSlots(prev);
      next[index] = undefined;
      return ensureImageSlots(next);
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDragIndex(index);
    if (e.dataTransfer) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      e.dataTransfer.setDragImage(e.currentTarget, rect.width / 2, rect.height / 2);
    }
  };

  const handleDragEnter = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    setImages(prev => {
      const updated = ensureImageSlots(prev);
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      const trimmed = updated.slice(0, MAX_FILES);
      return ensureImageSlots(trimmed);
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  const openPreview = (file: File, index: number) => {
    const url = URL.createObjectURL(file);
    setPreviewImage({ url, alt: `Slide ${index + 1}` });
  };

  const closePreview = () => setPreviewImage(null);

  const handleCardDrop = async (fileList: FileList) => {
    const targetIndex = images.findIndex((slot) => !slot);
    if (targetIndex === -1) {
      alert('All 10 slots are filled. Remove a slide to add more.');
      return;
    }
    await handleFileDrop(fileList, targetIndex);
  };

  const handlePromptChange = (value: string) => {
    setCaptionPrompt(value);
    setDescription(value);
  };

  React.useEffect(() => {
    if (!previewImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePreview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      URL.revokeObjectURL(previewImage.url);
    };
  }, [previewImage]);

  const imageCount = countImages(images);

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">

          <div className="grid gap-5">
            {/* Main column */}
            <div className="space-y-6">
              {/* Upload controls */}
              <div className="sf-card px-5 pt-4 pb-3 space-y-2 relative overflow-hidden">
                <img
                  src="/retro-slide.png"
                  alt="Retro accent"
                  className="absolute top-0 left-0 h-5 w-auto max-w-none object-contain pointer-events-none select-none"
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-none h-9 w-9 rounded-full bg-[#225561] text-vanilla font-black flex items-center justify-center text-xl leading-none translate-y-2">
                      1
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-vanilla">Upload media</h2>
                      <p className="text-sm text-vanilla/80 leading-snug mt-0">Drag and drop up to 10 images here, or click a button to upload or import.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <label className={`inline-flex items-center px-4 py-2 text-sm font-semibold text-sand rounded-lg cursor-pointer bg-[#225561] hover:bg-[#1a4251] transition-colors shadow-soft ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading…' : 'Add files'}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    <span className="text-vanilla/60">or</span>
                    <button
                      onClick={() => setShowImportModal(true)}
                      type="button"
                      className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-[#225561] text-sand hover:bg-[#1a4251] transition-colors shadow-soft"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Media Library
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div
                  className="rounded-xl border-2 border-dashed border-charcoal/70 bg-[#1f2221] p-4 shadow-[inset_0_6px_16px_rgba(0,0,0,0.45)]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer?.files?.length) {
                        handleCardDrop(e.dataTransfer.files);
                      }
                    }}
                  >
                    <p className="text-center text-sm" style={{ color: '#223535' }}>
                      Drag and drop multiple images into this dropzone, or use the buttons above to upload from your device or media library.<br />
                      You may also drag and drop images directly into the slots below.
                    </p>
                  </div>
                </div>
              </div>

              {/* Slide Board */}
              <div className="relative">
                <div className="sf-card px-5 pt-4 pb-3 space-y-2 relative overflow-hidden">
                  <img
                    src="/retro-slide.png"
                    alt="Retro accent"
                    className="absolute top-0 left-0 h-5 w-auto max-w-none object-contain pointer-events-none select-none"
                  />
                  <Link
                    to="/results"
                    className="group absolute right-20 top-4 z-20 flex items-center gap-2 rounded-full bg-pacific text-white px-6 py-3 shadow-lg shadow-pacific/30 border border-pacific/70 hover:shadow-pacific/50 transition-transform duration-200 ease-out hover:-translate-y-1"
                    aria-label="Go to results"
                  >
                    <span className="text-sm font-semibold">See Results</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
                  </Link>
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex-none h-9 w-9 rounded-full bg-[#225561] text-vanilla font-black flex items-center justify-center text-xl leading-none translate-y-2">
                        2
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-vanilla">Slide Board</h2>
                        <p className="text-sm text-vanilla/80 leading-snug mt-0">Add, arrange, and reorder up to 10 slides for your carousel.</p>
                      </div>
                    </div>
                    <span className="text-sm text-vanilla/60">{imageCount}/10</span>
                  </div>

                <div className="space-y-3">
                  <div className="border border-charcoal/40 bg-surface rounded-lg p-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {Array.from({ length: MAX_FILES }, (_, index) => {
                        const image = images[index];
                        const hasImage = Boolean(image);
                        const isDragging = dragIndex === index;
                        return (
                          <div
                            key={index}
                            className={`relative group rounded-lg aspect-square transition-transform duration-200 ease-out ${
                              !hasImage ? 'shadow-[inset_0_10px_18px_-8px_rgba(10,16,22,0.55),inset_0_0_10px_rgba(0,0,0,0.4)]' : ''
                            } ${
                              hasImage
                                ? `bg-[#242321] overflow-hidden border ${isDragging ? 'border-tropical ring-2 ring-tropical/30' : 'border-charcoal/40'}`
                                : 'border-2 border-dashed border-charcoal/50 bg-[#242321] text-vanilla/50'
                            }`}
                            draggable={hasImage}
                            onDragStart={hasImage ? (e) => handleDragStart(e, index) : undefined}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={hasImage ? handleDragEnd : undefined}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer?.files?.length) {
                                handleFileDrop(e.dataTransfer.files, index);
                              } else {
                                handleDragEnd();
                              }
                            }}
                            onDoubleClick={hasImage ? () => openPreview(image as File, index) : undefined}
                          >
                            <span className="absolute top-2 left-2 z-10 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-ink/90 px-2 text-xs font-semibold text-vanilla/80 shadow">
                              {index + 1}
                            </span>
                            {hasImage ? (
                              <>
                                <img
                                  src={URL.createObjectURL(image as File)}
                                  alt={`Slide ${index + 1}`}
                                  className="w-full h-full object-contain p-1"
                                />
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute top-2 right-2 bg-surface text-vanilla rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium tracking-wide">
                                Slot {index + 1}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              </div>

            </div>

          </div>

          {/* Import Library Modal */}
          <ImportLibraryModal
            isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportFromLibrary}
          maxImages={10}
          currentImageCount={imageCount}
        />

          {previewImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
              onClick={closePreview}
            >
              <div
                className="relative w-full max-w-5xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={closePreview}
                  className="absolute -top-3 -right-3 bg-surface text-vanilla rounded-full p-2 shadow-soft hover:bg-surface-alt border border-charcoal/60"
                  aria-label="Close image preview"
                >
                  <X className="h-5 w-5" />
                </button>
                <img
                  src={previewImage.url}
                  alt={previewImage.alt}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-xl border border-charcoal/60 bg-surface"
                />
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-ink/80 text-xs font-semibold text-vanilla/80 shadow-soft border border-charcoal/40">
                  {previewImage.alt}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
