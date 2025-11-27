import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCarousel } from '../contexts/CarouselContext';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Copy,
  Share2,
  Instagram,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function Results() {
  const { currentCarousel } = useCarousel();
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [instagramCaption, setInstagramCaption] = useState('');
  const [captionPrompt, setCaptionPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loading, setLoading] = useState(!currentCarousel);

  if (!currentCarousel) {
    return (
      <div className="min-h-screen bg-ink text-vanilla">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">No carousel found</h2>
            <Link
              to="/slideboard"
              className="sf-btn-primary inline-flex"
            >
              Create a new carousel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show loading if we don't have slides yet
  if (loading || !currentCarousel.slides || currentCarousel.slides.length === 0) {
    return (
      <div className="min-h-screen bg-ink text-vanilla">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pacific mx-auto"></div>
            <h2 className="text-xl font-semibold">Loading carousel...</h2>
            <p className="text-vanilla/60">Please wait while we load your carousel</p>
          </div>
        </div>
      </div>
    );
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % currentCarousel.slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + currentCarousel.slides.length) % currentCarousel.slides.length);
  };

  const generateInstagramCaption = () => {
    if (user?.plan !== 'premium') {
      alert('Instagram caption generation is a premium feature. Please upgrade your plan.');
      return;
    }

    const mockCaption = `✨ ${currentCarousel.title}

${currentCarousel.description}

🎯 Save this post for later!
👆 Follow for more tips
💬 What's your biggest challenge?

#instagram #marketing #socialmedia #entrepreneur #business #tips #strategy #growth`;

    setInstagramCaption(mockCaption);
  };

  const regenerateSlide = async (slideIndex: number) => {
    if (!currentCarousel) return;
    const confirmed = confirm(`Regenerate slide ${slideIndex + 1} with AI? This will create a new version of this slide.`);
    if (!confirmed) return;
    alert('Regenerating slide with AI... (This is a demo)');
  };

  const handleExport = () => {
    alert('Export functionality would download all slides as high-quality 1080x1080px images in a ZIP file.');
  };

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Link 
              to="/dashboard" 
              className="text-pacific hover:text-vanilla font-medium inline-flex items-center gap-2"
            >
              ← Back to Dashboard
            </Link>
            <div className="text-sm text-vanilla/60">{currentCarousel.slides.length} slides • 1080px exports</div>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
            {/* Carousel Preview */}
            <div className="sf-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Preview</h2>
                <span className="sf-pill bg-surface text-vanilla/80">{currentSlide + 1} / {currentCarousel.slides.length}</span>
              </div>
              
              <div className="relative">
                <div className="aspect-square bg-surface rounded-lg overflow-hidden border border-charcoal/50 flex items-center justify-center">
                  <img
                    src={currentCarousel.slides[currentSlide]?.image}
                    alt={`Slide ${currentSlide + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                {currentCarousel.slides.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-surface-alt hover:bg-surface px-3 py-2 rounded-md border border-charcoal/50 text-vanilla/80 shadow-soft transition-all"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-surface-alt hover:bg-surface px-3 py-2 rounded-md border border-charcoal/50 text-vanilla/80 shadow-soft transition-all"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              
              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  onClick={() => regenerateSlide(currentSlide)}
                  disabled={isRegenerating}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-md bg-surface-alt border border-charcoal/50 hover:border-pacific/50 text-vanilla/80 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
                  {isRegenerating ? 'Regenerating...' : 'Regenerate slide'}
                </button>
                <button
                  onClick={handleExport}
                  className="sf-btn-secondary justify-center"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export all slides
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-vanilla/80 font-medium">
                  {currentCarousel.slides[currentSlide]?.caption}
                </p>
              </div>
              
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {currentCarousel.slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => setCurrentSlide(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border transition-all relative ${
                      index === currentSlide ? 'border-pacific ring-1 ring-pacific/40' : 'border-charcoal/40'
                    }`}
                  >
                    <img
                      src={slide.image}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {slide.regenerated && (
                      <div className="absolute -top-1 -right-1 bg-pacific rounded-full w-3 h-3">
                        <div className="w-full h-full bg-pacific/80 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption + prompt + sharing */}
            <div className="space-y-4">
              <div className="sf-card p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-none h-9 w-9 rounded-full bg-[#225561] text-vanilla font-black flex items-center justify-center text-xl leading-none">
                    2
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Generate</h3>
                    <p className="text-vanilla/70">Type a prompt to guide your carousel caption.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-charcoal/60 bg-surface-alt p-4 space-y-3 shadow-soft">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-vanilla">Prompt to generate</p>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink/60 border border-charcoal/60 text-tropical shadow-soft">
                      <Sparkles className="h-4 w-4" />
                    </span>
                  </div>
                  <textarea
                    value={captionPrompt}
                    onChange={(e) => setCaptionPrompt(e.target.value)}
                    placeholder="Example: Energetic caption for a 5-slide carousel about daily systems for freelancers."
                    className="w-full h-32 px-4 py-3 border border-charcoal/50 rounded-lg bg-ink/40 focus:ring-2 focus:ring-stormy focus:border-stormy resize-none text-vanilla/80"
                    maxLength={400}
                  />
                  <div className="flex items-center justify-between text-xs text-vanilla/60">
                    <span>Give the vibe, hook, and audience. AI will write from here.</span>
                    <span>{captionPrompt.length}/400</span>
                  </div>
                </div>
              </div>

              <div className="sf-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-pacific/20 text-pacific flex items-center justify-center">
                    <Instagram className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Caption & share</h3>
                    <p className="text-vanilla/70">Copy, share, or regenerate captions for Instagram.</p>
                  </div>
                </div>
                <div className="bg-surface rounded-lg border border-charcoal/50 p-3 text-sm text-vanilla/80 space-y-1">
                  <div className="flex justify-between">
                    <span>Title</span>
                    <span className="text-vanilla/60">{currentCarousel.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Description</span>
                    <span className="text-vanilla/60 line-clamp-1">{currentCarousel.description}</span>
                  </div>
                </div>
                <button
                  onClick={generateInstagramCaption}
                  className="sf-btn-primary justify-center"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Instagram caption
                </button>
                <textarea
                  value={instagramCaption || 'Premium users can generate captions. Upgrade to unlock.'}
                  readOnly
                  className="w-full h-32 bg-surface rounded-lg border border-charcoal/50 p-3 text-sm text-vanilla/80 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => instagramCaption && navigator.clipboard.writeText(instagramCaption)}
                    className="sf-btn-secondary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!instagramCaption}
                  >
                    <Copy className="h-5 w-5 mr-2" />
                    Copy caption
                  </button>
                  <button className="sf-btn-secondary justify-center">
                    <Share2 className="h-5 w-5 mr-2" />
                    Share preview
                  </button>
                </div>
              </div>

              <div className="sf-card p-6 space-y-3">
                <h3 className="text-lg font-semibold">Export options</h3>
                <p className="text-vanilla/70">Download PNGs sized for Instagram (1080x1080 & 1080x1350).</p>
                <div className="flex gap-3">
                  <button onClick={handleExport} className="sf-btn-primary flex-1 justify-center">
                    <Download className="h-5 w-5 mr-2" />
                    Export PNGs
                  </button>
                  <button className="sf-btn-secondary flex-1 justify-center">
                    <Share2 className="h-5 w-5 mr-2" />
                    Share link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
