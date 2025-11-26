import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCarousel } from '../contexts/CarouselContext';
import { useContentLibrary } from '../contexts/ContentLibraryContext';
import { supabase } from '../lib/supabase';
import { n8nPost } from '../lib/n8n';
import ImportLibraryModal from '../components/ImportLibraryModal';
import Navbar from '../components/Navbar';
import { 
  Upload, 
  X, 
  Wand2, 
  Image as ImageIcon,
  ArrowRight,
  FolderOpen
} from 'lucide-react';

const BUCKET_NAME = "media";
const ASPECT = "1080x1350";
const MAX_FILES = 10;

// Upload one file to Supabase
async function uploadOne(userId: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const ts = Date.now();
  const path = `${userId}/${new Date().toISOString().slice(0,10)}/${ts}_${crypto.randomUUID()}.${ext}`;

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

export default function Generator() {
  const [images, setImages] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [style, setStyle] = useState<'minimalist' | 'bold' | 'elegant'>('minimalist');
  const [customColors, setCustomColors] = useState({
    primary: '#3B82F6',
    secondary: '#10B981', 
    accent1: '#F59E0B',
    accent2: '#EF4444'
  });
  const [skipCustomColors, setSkipCustomColors] = useState(false);
  const [primaryFont, setPrimaryFont] = useState('Inter, sans-serif');
  const [secondaryFont, setSecondaryFont] = useState('Roboto, sans-serif');
  const [generating, setGenerating] = useState(false);
  const [skipCustomFonts, setSkipCustomFonts] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Brand presets state
  const [presets, setPresets] = useState<Array<{
    id: string;
    name: string;
    colors: typeof customColors;
    primaryFont: string;
    secondaryFont: string;
  }>>([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  
  const { user, updateUser } = useAuth();
  const { addCarousel, setCurrentCarousel, fetchCarousel } = useCarousel();
  const { addImages, addUploadedFiles } = useContentLibrary();
  const navigate = useNavigate();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Load presets from localStorage on component mount
  React.useEffect(() => {
    const savedPresets = localStorage.getItem('slideflow_brand_presets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  // Save presets to localStorage whenever presets change
  React.useEffect(() => {
    localStorage.setItem('slideflow_brand_presets', JSON.stringify(presets));
  }, [presets]);

  // Universal font list for web-safe fonts
  const universalFonts = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Open Sans', value: 'Open Sans, sans-serif' },
    { name: 'Lato', value: 'Lato, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Source Sans Pro', value: 'Source Sans Pro, sans-serif' },
    { name: 'Raleway', value: 'Raleway, sans-serif' },
    { name: 'Ubuntu', value: 'Ubuntu, sans-serif' },
    { name: 'Nunito', value: 'Nunito, sans-serif' },
    { name: 'Poppins', value: 'Poppins, sans-serif' },
    { name: 'Playfair Display', value: 'Playfair Display, serif' },
    { name: 'Merriweather', value: 'Merriweather, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
    { name: 'Tahoma', value: 'Tahoma, sans-serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Monaco', value: 'Monaco, monospace' },
    { name: 'Consolas', value: 'Consolas, monospace' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.slice(0, 10 - images.length);
    setImages(prev => [...prev, ...newFiles]);
    
    // Also add to content library
    if (newFiles.length > 0) {
      addImages(newFiles);
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    if (!user) {
      alert('You must be logged in to save presets');
      return;
    }

    setGenerating(true);

    try {
      const userId = user.id;

      // Prepare data to send to webhook
      const allData = {
        user_id: userId,
        uploaded_files: [],
        description: '',
        style: style,
        brand_profile: {
          palette: {
            primary: customColors.primary,
            secondary: customColors.secondary,
            accent1: customColors.accent1,
            accent2: customColors.accent2
          },
          fonts: {
            primary: primaryFont,
            secondary: secondaryFont
          },
          defaults: { style }
        },
        carousel: {
          title: presetName.trim(),
          aspect: ASPECT
        },
        captions: {
          text: '',
          language: 'en',
          source: 'user'
        },
        ai_caption: {
          language: 'en',
          style: style
        },
        derivatives: {
          types: []
        },
        search_params: {
          orientation: 'vertical',
          limit: 0
        },
        post_platform: {
          platform: 'instagram',
          required_derivative_types: []
        },
        save_preset_only: true
      };

      // Send to webhook
      await n8nPost('/all-data', allData);

      // Also save locally for immediate UI update
      const newPreset = {
        id: Date.now().toString(),
        name: presetName.trim(),
        colors: { ...customColors },
        primaryFont,
        secondaryFont
      };

      setPresets(prev => [...prev, newPreset]);
      setPresetName('');
      alert(`Preset "${newPreset.name}" saved successfully!`);
    } catch (err: any) {
      console.error('Error saving preset:', err);
      alert(err.message || 'Failed to save preset. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setCustomColors(preset.colors);
      setPrimaryFont(preset.primaryFont);
      setSecondaryFont(preset.secondaryFont);
      setSkipCustomColors(false); // Enable custom colors when applying preset
    }
  };

  const deletePreset = (presetId: string) => {
    if (confirm('Delete this preset?')) {
      setPresets(prev => prev.filter(p => p.id !== presetId));
      if (selectedPreset === presetId) {
        setSelectedPreset('');
      }
    }
  };

  const handleImportFromLibrary = (importedImages: File[]) => {
    setImages(prev => [...prev, ...importedImages]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  const handleGenerate = async () => {
    if (!user) return;

    if (images.length === 0) {
      alert('Please select at least 1 image.');
      return;
    }

    if (images.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} images allowed.`);
      return;
    }

    setGenerating(true);

    try {
      const userId = user.id;

      // Upload all files to Supabase
      const uploadedInfos = await Promise.all(images.map(f => uploadOne(userId, f)));

      // Persist the uploaded files into the media library for this user
      await addUploadedFiles(uploadedInfos);

      // Prepare all data to send to single webhook
      const allData = {
        user_id: userId,
        uploaded_files: uploadedInfos,
        description: description,
        style: style,
        brand_profile: {
          palette: skipCustomColors ? {} : {
            primary: customColors.primary,
            secondary: customColors.secondary,
            accent1: customColors.accent1,
            accent2: customColors.accent2
          },
          fonts: skipCustomFonts ? {} : {
            primary: primaryFont,
            secondary: secondaryFont
          },
          defaults: { style }
        },
        carousel: {
          title: description.slice(0, 100) || "Untitled Carousel",
          aspect: ASPECT
        },
        captions: {
          text: description,
          language: "en",
          source: "user"
        },
        ai_caption: {
          language: "en",
          style: style
        },
        derivatives: {
          types: ["vertical", "square", "poster"]
        },
        search_params: {
          orientation: "vertical",
          limit: 24
        },
        post_platform: {
          platform: "instagram",
          required_derivative_types: ["vertical", "square"]
        }
      };

      // Send all data to single webhook
      const response: any = await n8nPost("/all-data", allData);

      console.log('N8N all-data response:', response);

      const carouselId = response.carousel_id || response.id;

      if (!carouselId) {
        throw new Error('No carousel ID returned from N8N');
      }

      // Fetch the generated carousel from the database and navigate to results
      try {
        const generatedCarousel = await fetchCarousel(carouselId);
        if (generatedCarousel) {
          setCurrentCarousel(generatedCarousel);
          navigate('/results');
        } else {
          alert("Carousel created successfully! Redirecting to dashboard.");
          navigate('/dashboard');
        }
      } catch (fetchError) {
        console.error('Error fetching generated carousel:', fetchError);
        alert("Carousel created successfully! Redirecting to dashboard.");
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Carousel generation error:', err);
      alert(err.message || "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = images.length > 0 && description.trim() && user;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Media Upload */}
              <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">1. Storyboard</h2>
                    <p className="text-gray-600">Add, arrange, and reorder up to 10 slides for your carousel.</p>
                  </div>
                  <span className="text-sm text-gray-500">{images.length}/10</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 px-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-indigo-100 px-2 text-xs font-semibold text-indigo-700">SB</span>
                      <span className="font-semibold text-gray-900">Slide board</span>
                    </div>
                    <span className="text-gray-500">Drag to reorder slides</span>
                  </div>
                  <div className="border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-sm p-3">
                    {images.length === 0 ? (
                      <div className="aspect-video border border-dashed border-gray-300 rounded-sm flex flex-col items-center justify-center text-sm text-gray-500 bg-white">
                        <span className="font-medium text-gray-700">Empty storyboard</span>
                        <span>Slides will appear here as you add them.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {images.map((image, index) => (
                          <div
                            key={index}
                            className={`relative group bg-white rounded-sm overflow-hidden border aspect-square transition-transform duration-150 ease-out ${dragIndex === index ? 'border-indigo-400 ring-2 ring-indigo-200 scale-105' : 'border-gray-200 hover:scale-[1.01]'}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => { e.preventDefault(); handleDragEnd(); }}
                          >
                            <span className="absolute top-2 left-2 z-10 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white/90 px-2 text-xs font-semibold text-gray-700 shadow opacity-0 group-hover:opacity-100 transition-opacity">
                              {index + 1}
                            </span>
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Slide ${index + 1}`}
                              className="w-full h-full object-contain p-1"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 bg-white/90 text-red-500 rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border border-dashed border-gray-300 rounded-sm p-4 md:p-6 bg-white transition-all duration-150 hover:border-indigo-300 hover:bg-indigo-50/40">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-3">
                    <label className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-sm cursor-pointer hover:bg-indigo-200 transition-colors">
                      <Upload className="h-4 w-4 mr-2" />
                      Add files
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-gray-500">or</span>
                    <button
                      onClick={() => setShowImportModal(true)}
                      type="button"
                      className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-sm hover:bg-purple-200 transition-colors"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Import from Library
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-3 text-center">PNG or JPG, up to 10 files.</p>
                </div>
              </div>

              {/* Narrative */}
              <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 space-y-3">
                <h2 className="text-xl font-semibold text-gray-900">2. Story & tone</h2>
                <p className="text-gray-600">Describe what you want to communicate.</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: 5 marketing tips for small businesses to grow on Instagram."
                className="w-full h-28 px-4 py-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  maxLength={500}
                />
                <p className="text-sm text-gray-500">{description.length}/500 characters</p>
              </div>

              {/* Apply Preset */}
              <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">3. Apply preset</h2>
                    <p className="text-gray-600">Use a saved brand preset for colors and fonts.</p>
                  </div>
                  <span className="text-sm text-gray-500">{presets.length} saved</span>
                </div>
                {presets.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedPreset}
                      onChange={(e) => {
                        setSelectedPreset(e.target.value);
                        if (e.target.value) {
                          applyPreset(e.target.value);
                        }
                      }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Select a preset...</option>
                      {presets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                    {selectedPreset && (
                      <button
                        onClick={() => deletePreset(selectedPreset)}
                        className="text-sm text-red-600 hover:text-red-500"
                      >
                        Delete selected preset
                      </button>
                    )}
                  </div>
                ) : (
                    <p className="text-sm text-gray-500 py-3 px-4 bg-gray-50 rounded-sm">
                      No presets saved yet
                    </p>
                )}
                {presets.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Saved Presets</h4>
                    <div className="flex flex-wrap gap-2">
                      {presets.map((preset) => (
                        <span
                          key={preset.id}
                          className="inline-flex items-center px-3 py-1 bg-white border border-gray-200 rounded-full text-sm"
                        >
                          {preset.name}
                          <button
                            onClick={() => deletePreset(preset.id)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Style */}
              <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">4. Choose style</h2>
                  <span className="text-sm text-gray-500 capitalize">Current: {style}</span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { value: 'minimalist', name: 'Minimalist', desc: 'Clean, simple design with lots of white space' },
                    { value: 'bold', name: 'Bold', desc: 'Strong colors and typography for high impact' },
                    { value: 'elegant', name: 'Elegant', desc: 'Sophisticated design with refined aesthetics' }
                  ].map((styleOption) => (
                    <label
                      key={styleOption.value}
                    className={`p-4 border-2 rounded-sm cursor-pointer transition-all ${
                        style === styleOption.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="style"
                        value={styleOption.value}
                        checked={style === styleOption.value}
                        onChange={(e) => setStyle(e.target.value as typeof style)}
                        className="hidden"
                      />
                      <h3 className="font-medium text-gray-900 mb-2">{styleOption.name}</h3>
                      <p className="text-sm text-gray-600">{styleOption.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brand & Fonts */}
              <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">5. Brand palette</h2>
                  <label className="flex items-center text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={skipCustomColors}
                      onChange={(e) => setSkipCustomColors(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 mr-2"
                    />
                    Skip custom colors
                  </label>
                </div>
                <p className="text-gray-600">
                  {skipCustomColors
                    ? 'Using defaults from your selected style'
                    : 'Set the palette used across your carousel'}
                </p>
                <div className={`grid md:grid-cols-2 gap-6 transition-opacity ${skipCustomColors ? 'opacity-50' : ''}`}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.primary}
                          disabled={skipCustomColors}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, primary: e.target.value }))}
                          className="w-12 h-12 rounded-sm border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customColors.primary}
                          disabled={skipCustomColors}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, primary: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.secondary}
                          disabled={skipCustomColors}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, secondary: e.target.value }))}
                          className="w-12 h-12 rounded-sm border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customColors.secondary}
                          disabled={skipCustomColors}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, secondary: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="#10B981"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Accent Color 1
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.accent1}
                          disabled={skipCustomColors}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, accent1: e.target.value }))}
                          className="w-12 h-12 rounded-sm border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customColors.accent1}
                          disabled={skipCustomColors}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, accent1: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="#F59E0B"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Accent Color 2
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={customColors.accent2}
                          disabled={skipCustomColors}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, accent2: e.target.value }))}
                          className="w-12 h-12 rounded-sm border-2 border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={customColors.accent2}
                          disabled={skipCustomColors}
                          onChange={(e) => setCustomColors(prev => ({ ...prev, accent2: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          placeholder="#EF4444"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <h3 className="text-xl font-semibold text-gray-900">Fonts</h3>
                  <label className="flex items-center text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={skipCustomFonts}
                      onChange={(e) => setSkipCustomFonts(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 mr-2"
                    />
                    Skip custom fonts
                  </label>
                </div>
                <p className="text-gray-600">
                  {skipCustomFonts
                    ? 'Using default fonts based on your selected style'
                    : 'Choose primary and secondary typography for your carousel'}
                </p>
                <div className={`grid md:grid-cols-2 gap-6 transition-opacity ${skipCustomFonts ? 'opacity-50' : ''}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Font
                    </label>
                    <div className="relative">
                      <select
                        value={primaryFont}
                        disabled={skipCustomFonts}
                        onChange={(e) => setPrimaryFont(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white max-h-40 overflow-y-auto disabled:bg-gray-100 disabled:cursor-not-allowed"
                        style={{ fontFamily: primaryFont }}
                      >
                        {universalFonts.map((font) => (
                          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-base text-gray-700 mt-2 font-medium" style={{ fontFamily: primaryFont }}>
                      Preview: The quick brown fox jumps
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Font
                    </label>
                    <div className="relative">
                      <select
                        value={secondaryFont}
                        disabled={skipCustomFonts}
                        onChange={(e) => setSecondaryFont(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white max-h-40 overflow-y-auto disabled:bg-gray-100 disabled:cursor-not-allowed"
                        style={{ fontFamily: secondaryFont }}
                      >
                        {universalFonts.map((font) => (
                          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-base text-gray-700 mt-2 font-medium" style={{ fontFamily: secondaryFont }}>
                      Preview: The quick brown fox jumps
                    </p>
                  </div>
                </div>

                {/* Save preset (down here) */}
                <div className="pt-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Save current settings</h3>
                  <p className="text-gray-600 mb-3">Save the current colors, fonts, and style as a reusable preset.</p>
                  <div className="space-y-3 max-w-xl">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Enter preset name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={savePreset}
                      disabled={!presetName.trim()}
                      className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save as Preset
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Saves current colors, fonts, and style selections
                  </p>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Quick summary</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Images</span>
                    <span className="font-medium">{images.length}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Style</span>
                    <span className="font-medium capitalize">{style}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Preset</span>
                    <span className="font-medium">{selectedPreset ? 'Applied' : 'None'}</span>
                  </div>
                </div>
                {user && (
                  <div className="bg-gray-50 rounded-sm p-3 text-sm text-gray-700">
                    You've used {user.carouselsGenerated} of {user.maxCarousels} free generations.
                    {user.plan === 'free' && user.carouselsGenerated >= user.maxCarousels && (
                      <span className="text-orange-600 font-medium ml-1">
                        Upgrade to Premium for unlimited generations.
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-sm shadow-sm border border-gray-100 p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Generate</h3>
                    <button
                      onClick={handleGenerate}
                      disabled={!canGenerate || generating}
                      className="w-full flex items-center justify-center px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5 mr-2" />
                      Generate Carousel
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500">
                  Tip: add at least 1 image and a short description before generating.
                </p>
              </div>
            </div>
          </div>

          {/* Import Library Modal */}
          <ImportLibraryModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImport={handleImportFromLibrary}
            maxImages={10}
            currentImageCount={images.length}
          />
        </div>
      </main>
    </div>
  );
}
