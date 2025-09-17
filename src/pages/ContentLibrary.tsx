import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContentLibrary } from '../contexts/ContentLibraryContext';
import Navbar from '../components/Navbar';
import { 
  ArrowLeft,
  Upload, 
  Image as ImageIcon,
  Trash2,
  Download,
  Search,
  Grid3X3,
  List,
  Filter
} from 'lucide-react';

export default function ContentLibrary() {
  const { images, addImages, removeImage, clearLibrary } = useContentLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      addImages(files);
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredImages = images.filter(image =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedImages.size === 0) return;
    
    if (confirm(`Delete ${selectedImages.size} selected images?`)) {
      selectedImages.forEach(imageId => removeImage(imageId));
      setSelectedImages(new Set());
    }
  };

  const handleDownloadImage = (image: any) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center text-indigo-600 hover:text-indigo-500 font-medium mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Library</h1>
                <p className="text-gray-600">Manage your uploaded images ({images.length} files)</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </button>
                {images.length > 0 && (
                  <button
                    onClick={() => confirm('Clear all images?') && clearLibrary()}
                    className="inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search images..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-64"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {selectedImages.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="inline-flex items-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedImages.size})
                  </button>
                )}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {filteredImages.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {images.length === 0 ? 'No images uploaded' : 'No images match your search'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {images.length === 0 
                    ? 'Upload images to build your content library'
                    : 'Try adjusting your search terms'
                  }
                </p>
                {images.length === 0 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Images
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredImages.map((image) => (
                    <div key={image.id} className="relative group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                      <div className="aspect-square relative">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                          <div className="absolute top-2 left-2">
                            <input
                              type="checkbox"
                              checked={selectedImages.has(image.id)}
                              onChange={() => toggleImageSelection(image.id)}
                              className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                            />
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleDownloadImage(image)}
                                className="p-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-md transition-colors"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeImage(image.id)}
                                className="p-1.5 bg-white/90 hover:bg-white text-red-600 rounded-md transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-900 truncate" title={image.name}>
                          {image.name}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{formatFileSize(image.size)}</span>
                          <span className="text-xs text-gray-500">{formatDate(image.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 text-sm font-medium text-gray-700">
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedImages.size === filteredImages.length}
                        onChange={() => {
                          if (selectedImages.size === filteredImages.length) {
                            setSelectedImages(new Set());
                          } else {
                            setSelectedImages(new Set(filteredImages.map(img => img.id)));
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">Preview</div>
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Size</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredImages.map((image) => (
                      <div key={image.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-50 transition-colors">
                        <div className="col-span-1">
                          <input
                            type="checkbox"
                            checked={selectedImages.has(image.id)}
                            onChange={() => toggleImageSelection(image.id)}
                            className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        </div>
                        <div className="col-span-4">
                          <p className="font-medium text-gray-900 truncate" title={image.name}>
                            {image.name}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm text-gray-600">{formatFileSize(image.size)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-sm text-gray-600">{formatDate(image.uploadedAt)}</span>
                        </div>
                        <div className="col-span-1">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleDownloadImage(image)}
                              className="p-1 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => removeImage(image.id)}
                              className="p-1 hover:bg-gray-200 text-red-600 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </main>
    </div>
  );
}