import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Instagram, ChevronLeft, ChevronRight, CheckCircle2, Clock3, Check, Share2, ShieldCheck, Sparkles, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import PageDots from '../components/PageDots';
import { useCarousel, type Carousel } from '../contexts/CarouselContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type AspectRatio = '4:5' | '1:1';

type LocationState = {
  caption?: string;
  carousel?: Carousel;
  aspectRatio?: AspectRatio;
};

const TOTAL_APP_PAGES = 5;

export default function Publish() {
  const { user } = useAuth();
  const { carouselId } = useParams<{ carouselId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as LocationState) || {};
  const navCarousel = navState.carousel;
  const navCaption = navState.caption;

  const { currentCarousel, setCurrentCarousel, fetchCarousel, updateCarousel } = useCarousel();
  const [orderedSlides, setOrderedSlides] = React.useState(navCarousel?.slides ?? currentCarousel?.slides ?? []);
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [caption, setCaption] = React.useState(navCaption ?? '');
  const [loading, setLoading] = React.useState(!navCarousel);
  const [hydrated, setHydrated] = React.useState(false);
  const [hydrating, setHydrating] = React.useState(false);
  const [shareToInstagram, setShareToInstagram] = React.useState(true);
  const [shareToFacebook, setShareToFacebook] = React.useState(false);
  const [scheduleMode, setScheduleMode] = React.useState<'now' | 'later'>('now');
  const [selectedAspect, setSelectedAspect] = React.useState<AspectRatio>(navState.aspectRatio ?? '4:5');
  const [nextArmed, setNextArmed] = React.useState(false);
  const [platformError, setPlatformError] = React.useState<string | null>(null);
  const [showDraftModal, setShowDraftModal] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState('');
  const [draftSaving, setDraftSaving] = React.useState(false);
  const [draftError, setDraftError] = React.useState<string | null>(null);
  const weekOverview = React.useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(todayStart);
    start.setDate(todayStart.getDate() - todayStart.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const isToday = d.toDateString() === todayStart.toDateString();
      const isPast = d < todayStart;
      return {
        label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][i],
        date: d.getDate(),
        isToday,
        isPast,
      };
    });

    const rangeLabel = `${start.toLocaleString('default', { month: 'short' })} ${start.getDate()} - ${end.toLocaleString('default', { month: 'short' })} ${end.getDate()}`;

    return { days, rangeLabel };
  }, []);

  const captionHydrated = React.useRef(false);

  // Persist caption changes (debounced) so dashboard reflects saved caption.
  React.useEffect(() => {
    if (!currentCarousel?.id) return;
    const trimmed = caption.trim();
    const existing = (currentCarousel.caption || '').trim();
    if (trimmed === existing) return;

    const handle = window.setTimeout(async () => {
      await updateCarousel(currentCarousel.id, { caption: trimmed });
      setCurrentCarousel((prev) => (prev ? { ...prev, caption: trimmed } : prev));
    }, 800);

    return () => {
      window.clearTimeout(handle);
    };
  }, [caption, currentCarousel?.id, setCurrentCarousel, updateCarousel]);

  // Use any preloaded carousel from navigation state.
  React.useEffect(() => {
    if (navCarousel) {
      setCurrentCarousel(navCarousel);
      setOrderedSlides(navCarousel.slides || []);
      setLoading(false);
    }
  }, [navCarousel, setCurrentCarousel]);

  // Fetch carousel by ID if needed.
  React.useEffect(() => {
    if (!carouselId) return;
    let cancelled = false;
    setLoading(!navCarousel);
    fetchCarousel(carouselId)
      .then((fetched) => {
        if (cancelled) return;
        if (fetched) {
          setCurrentCarousel(fetched);
          setOrderedSlides(fetched.slides || []);
        } else {
          setCurrentCarousel(null);
          setOrderedSlides([]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load carousel for publish page', err);
          setCurrentCarousel(null);
          setOrderedSlides([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [carouselId, fetchCarousel, navCarousel, setCurrentCarousel]);

  // Hydrate slide URLs if needed.
  React.useEffect(() => {
    const shouldHydrate =
      currentCarousel?.slides?.some(
        (s) => !s.image || !s.image.startsWith('http')
      );
    if (!currentCarousel || !currentCarousel.slides?.length || hydrated || !shouldHydrate) {
      return;
    }
    let cancelled = false;
    const hydrate = async () => {
      setHydrating(true);
      try {
        const nextSlides = await Promise.all(
          currentCarousel.slides.map(async (slide) => {
            if (slide.image && slide.image.startsWith('http')) {
              return slide;
            }
            const media = slide.originalMedia;
            if (media?.bucket && media?.path) {
              try {
                const { data, error } = await supabase.storage
                  .from(media.bucket)
                  .createSignedUrl(media.path, 60 * 60);
                if (!error && data?.signedUrl) {
                  return { ...slide, image: data.signedUrl };
                }
              } catch (err) {
                console.warn('Failed to create signed URL for slide', slide.id, err);
              }
            }
            return slide;
          })
        );
        if (!cancelled) {
          setOrderedSlides(nextSlides);
          setCurrentCarousel({ ...currentCarousel, slides: nextSlides });
          setHydrated(true);
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    };
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [currentCarousel, hydrated, setCurrentCarousel]);

  // Sync ordered slides when context changes.
  React.useEffect(() => {
    if (currentCarousel) {
      setOrderedSlides(currentCarousel.slides || []);
      setLoading(false);
      setCurrentSlide(0);
    }
  }, [currentCarousel]);

  // Seed caption from navigation or carousel record.
  React.useEffect(() => {
    if (captionHydrated.current) return;
    if (navCaption !== undefined) {
      setCaption(navCaption);
      captionHydrated.current = true;
      return;
    }
    if (currentCarousel?.caption) {
      setCaption(currentCarousel.caption);
      captionHydrated.current = true;
    }
  }, [navCaption, currentCarousel]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % orderedSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + orderedSlides.length) % orderedSlides.length);
  };

  const readyToPublish = orderedSlides.length > 0;
  const primaryCtaLabel = scheduleMode === 'later' ? 'Go to calendar' : 'Publish';
  const nextButtonEnabled = readyToPublish && nextArmed && scheduleMode === 'now';

  const handleToggleInstagram = () => {
    if (shareToInstagram && !shareToFacebook) {
      setPlatformError('Select at least one platform.');
      return;
    }
    setShareToInstagram((prev) => !prev);
    setPlatformError(null);
  };

  const handleToggleFacebook = () => {
    if (shareToFacebook && !shareToInstagram) {
      setPlatformError('Select at least one platform.');
      return;
    }
    setShareToFacebook((prev) => !prev);
    setPlatformError(null);
  };

  React.useEffect(() => {
    if (showDraftModal) {
      setDraftTitle(currentCarousel?.title || '');
      setDraftError(null);
    }
  }, [showDraftModal, currentCarousel?.title]);

  const persistSlidesOrder = React.useCallback(async () => {
    try {
      if (!currentCarousel?.id || !orderedSlides.length) return true;
      if (!user?.id) {
        console.warn('No authenticated user; skipping slide persistence');
        return false;
      }

      const slideRows = orderedSlides
        .map((slide, idx) => {
          const mediaId = (slide.originalMedia as { id?: string } | undefined)?.id;
          if (!mediaId) return null;
          return {
            user_id: user.id,
            carousel_id: currentCarousel.id,
            position: idx + 1,
            media_id: mediaId,
          };
        })
        .filter(
          (row): row is { user_id: string; carousel_id: string; position: number; media_id: string } =>
            !!row && !!row.media_id
        );

      if (!slideRows.length) return true;

      const { error } = await supabase
        .from('carousel_slide')
        .upsert(slideRows, { onConflict: 'carousel_id,position' });
      if (error) {
        console.warn('Failed to persist slide order', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Persist slides order error', err);
      return false;
    }
  }, [currentCarousel?.id, orderedSlides, user?.id]);

  const handleSaveDraft = async () => {
    if (!currentCarousel) return;
    if (!user?.id) {
      setDraftError('Not signed in. Please log in again.');
      return;
    }
    const title = draftTitle.trim();
    if (!title) {
      setDraftError('Please enter a name for your carousel.');
      return;
    }
    setDraftSaving(true);
    setDraftError(null);
    try {
      const slidesOk = await persistSlidesOrder();
      if (!slidesOk) {
        setDraftError('Failed to save slides. Please try again.');
        setDraftSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from('carousel')
        .update({
          title,
          caption: caption.trim(),
          status: 'draft',
        })
        .eq('id', currentCarousel.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCurrentCarousel((prev) =>
        prev
          ? {
              ...prev,
              title: data.title,
              caption: data.caption ?? '',
              status: data.status,
              description: data.title,
            }
          : prev
      );
      await updateCarousel(currentCarousel.id, { title: data.title, caption: data.caption ?? '', status: data.status });
      setShowDraftModal(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to save draft', err);
      setDraftError('Failed to save draft. Please try again. ' + (err instanceof Error ? err.message : ''));
    } finally {
      setDraftSaving(false);
    }
  };

  // Guards placed after hooks to keep hook order stable
  if (loading) {
    return (
      <div className="min-h-screen bg-ink text-vanilla">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pacific mx-auto"></div>
            <h2 className="text-xl font-semibold">Loading your publish view...</h2>
            <p className="text-vanilla/60">Pulling in slides and captions</p>
          </div>
        </div>
        <PageDots total={TOTAL_APP_PAGES} active={3} />
      </div>
    );
  }

  if (!orderedSlides.length) {
    return (
      <div className="min-h-screen bg-ink text-vanilla">
        <Navbar />
        <div className="pt-20 flex items-center justify-center h-screen">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold">No slides to publish</h2>
            <Link
              to="/slideboard"
              className="sf-btn-primary inline-flex"
            >
              Build a carousel first
            </Link>
          </div>
        </div>
        <PageDots total={TOTAL_APP_PAGES} active={3} />
      </div>
    );
  }

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
        <PageDots total={TOTAL_APP_PAGES} active={3} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-vanilla">
      <Navbar />

      <main className="pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Link
              to={`/generate-caption/${carouselId || currentCarousel.id}`}
              state={{ carousel: currentCarousel, caption, aspectRatio: selectedAspect }}
              className="text-pacific hover:text-vanilla font-medium inline-flex items-center gap-2"
            >
              ← Back to Captions
            </Link>
            {hydrating && (
              <span className="text-xs text-vanilla/60">
                Refreshing preview links...
              </span>
            )}
          </div>

          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-3 lg:gap-4">
            <div className="space-y-4 lg:space-y-5">
              {/* Preview + caption */}
              <div className="sf-card px-4 pt-4 pb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Preview</h2>
                </div>

                <div className="relative mx-auto max-w-[280px] w-full">
                  <div className={`${selectedAspect === '4:5' ? 'aspect-[4/5]' : 'aspect-square'} bg-surface overflow-hidden border border-charcoal/50 flex items-center justify-center shadow-soft rounded-xl relative`}>
                    <img
                      src={orderedSlides[currentSlide]?.image}
                      alt={`Slide ${currentSlide + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {orderedSlides.length > 1 && (
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2">
                        {orderedSlides.map((_, idx) => (
                          <span
                            key={idx}
                            className={`h-1.5 w-1.5 rounded-full transition-colors ${idx === currentSlide ? 'bg-vanilla shadow-[0_0_0_2px_rgba(0,0,0,0.35)]' : 'bg-vanilla/40'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {orderedSlides.length > 1 && (
                    <>
                      <button
                        onClick={prevSlide}
                        className="absolute -left-14 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 border border-charcoal/60 text-vanilla shadow-soft backdrop-blur-sm transition-colors hover:bg-ink/95 focus:outline-none focus:ring-2 focus:ring-pacific/60 h-11 w-11 flex items-center justify-center"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="absolute -right-14 top-1/2 -translate-y-1/2 rounded-full bg-ink/80 border border-charcoal/60 text-vanilla shadow-soft backdrop-blur-sm transition-colors hover:bg-ink/95 focus:outline-none focus:ring-2 focus:ring-pacific/60 h-11 w-11 flex items-center justify-center"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-vanilla">Caption</p>
                    </div>
                  </div>
                  <div className="relative">
                    {caption.trim().length === 0 && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] font-normal tracking-normal text-vanilla/55">
                        no caption
                      </span>
                    )}
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder=""
                      className="w-full h-[10.5rem] bg-ink/60 rounded-lg border border-charcoal/50 p-4 text-base text-vanilla/80 focus:outline-none focus:ring-0 focus:border-[#39a1b2] resize-none overflow-y-auto placeholder:text-vanilla/55"
                    />
                  </div>
                  <div className="flex items-center justify-end text-xs text-vanilla/60">
                    <span>{caption.length}/2200</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute right-4 -top-4 z-30 flex items-center gap-3 translate-x-[8px] translate-y-[7px] pointer-events-none">
                  {!nextButtonEnabled && (
                    <span className="text-xs text-vanilla/60 whitespace-nowrap">
                      {scheduleMode === 'later'
                        ? 'Hint: To publish now, select Publish Now, then click Publish.'
                        : 'Hint: Click Publish to continue.'}
                    </span>
                  )}
                  <div className="relative w-24 h-20 group pointer-events-auto">
                    <div
                      className="absolute inset-0 z-0 rounded-[4px] bg-[#0c0c0c] pointer-events-none"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      disabled={!nextButtonEnabled}
                      className={`group relative z-10 flex items-center justify-center rounded-[4px] w-full h-full overflow-hidden border transition-transform duration-200 ease-out transform-gpu ${
                        nextButtonEnabled
                          ? 'border-transparent shadow-lg shadow-pacific/30 hover:shadow-pacific/50 group-hover:translate-x-1'
                          : 'bg-surface opacity-70 border-charcoal/50 cursor-not-allowed pointer-events-none shadow-none'
                      }`}
                      aria-label="Next step"
                      tabIndex={nextButtonEnabled ? 0 : -1}
                      aria-disabled={!nextButtonEnabled}
                    >
                      <img
                        src={nextButtonEnabled ? '/Next%20Button.png' : '/Deactivated%20Next%20Button.png'}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 block w-full h-full object-cover select-none pointer-events-none"
                      />
                      {nextButtonEnabled && (
                        <span className="absolute inset-0 z-10 flex items-center justify-center text-xl font-extrabold leading-tight text-white drop-shadow-sm">
                          Publish
                        </span>
                      )}
                    </button>
                  </div>
                  <img
                    src="/blue_arrow.png"
                    alt=""
                    aria-hidden="true"
                    className={`w-4 h-auto sf-arrow-wiggle select-none pointer-events-none transition-opacity duration-150 ${
                      nextButtonEnabled ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>
                <div className="sf-card px-5 pt-4 pb-5 space-y-4 relative overflow-hidden">
                  <img
                    src="/retro-slide.png"
                    alt="Retro accent"
                    className="absolute top-0 left-0 h-5 w-auto max-w-none object-contain pointer-events-none select-none"
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-none h-9 w-9 rounded-full bg-[#225561] text-vanilla font-black flex items-center justify-center text-xl leading-none translate-y-2">
                        4
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold text-vanilla">Publish</h3>
                        <p className="text-sm text-vanilla/80 leading-snug mt-0">Final checks before you ship the carousel.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-charcoal/60 bg-surface-alt p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Destinations</p>
                          <p className="text-xs text-vanilla/60">Choose where to post.</p>
                        </div>
                        <Instagram className="h-5 w-5 text-pacific" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleToggleInstagram}
                          className={`w-full px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${
                            shareToInstagram
                              ? 'bg-pacific text-white border-pacific/90 shadow-soft'
                              : 'bg-surface text-vanilla/70 border-charcoal/60 hover:border-pacific/60'
                          }`}
                          aria-pressed={shareToInstagram}
                        >
                          Instagram
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleFacebook}
                          className={`w-full px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${
                            shareToFacebook
                              ? 'bg-pacific text-white border-pacific/90 shadow-soft'
                              : 'bg-surface text-vanilla/70 border-charcoal/60 hover:border-pacific/60'
                          }`}
                          aria-pressed={shareToFacebook}
                        >
                          Facebook
                        </button>
                      </div>
                      {platformError && (
                        <div className="text-[11px] text-pacific mt-1">{platformError}</div>
                      )}
                    </div>

                    <div className="rounded-lg border border-charcoal/60 bg-surface-alt p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Timing</p>
                          <p className="text-xs text-vanilla/60">Drop it now or set a slot.</p>
                        </div>
                        <Clock3 className="h-5 w-5 text-pacific" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setScheduleMode('now')}
                          className={`px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${
                            scheduleMode === 'now'
                              ? 'bg-pacific text-white border-pacific/90 shadow-soft'
                              : 'bg-surface text-vanilla/70 border-charcoal/60 hover:border-pacific/60'
                          }`}
                        >
                          Publish now
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleMode('later');
                            setNextArmed(false);
                          }}
                          className={`px-3 py-2 rounded-md text-sm font-semibold border transition-colors ${
                            scheduleMode === 'later'
                              ? 'bg-pacific text-white border-pacific/90 shadow-soft'
                              : 'bg-surface text-vanilla/70 border-charcoal/60 hover:border-pacific/60'
                          }`}
                        >
                          Schedule
                        </button>
                      </div>
                    </div>

                  </div>

                  {scheduleMode === 'later' && (
                    <div className="rounded-md border border-charcoal/50 bg-ink/60 px-4 py-3 text-xs text-vanilla/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-vanilla">This week</div>
                        <div className="text-xs text-vanilla/60">{weekOverview.rangeLabel}</div>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {weekOverview.days.map((day) => (
                          <div
                            key={day.label + day.date}
                            className={`flex flex-col items-center justify-center rounded-md border text-sm font-semibold h-16 ${
                              day.isPast
                                ? 'bg-ink/80 border-charcoal/80 text-vanilla/30 opacity-60 cursor-not-allowed pointer-events-none'
                                : day.isToday
                                  ? 'bg-pacific/20 border-pacific text-vanilla'
                                  : 'bg-surface border-charcoal/60 text-vanilla/80 hover:border-pacific/50'
                            }`}
                          >
                            <span className="text-[11px] font-medium text-vanilla/60">{day.label}</span>
                            <span className="text-base">{day.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold border border-charcoal/60 bg-surface-alt hover:border-pacific/60 transition-colors order-1"
                      onClick={() => setShowDraftModal(true)}
                    >
                      Save draft
                    </button>
                    {scheduleMode === 'later' ? (
                      <Link
                        to="/calendar"
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-md font-semibold border transition-all order-2 bg-pacific text-white border-pacific shadow-soft hover:bg-pacific/90"
                      >
                        Go to Calendar
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={!readyToPublish}
                        onClick={async () => {
                          if (!readyToPublish || !currentCarousel?.id) return;
                          setNextArmed(true);
                          await updateCarousel(currentCarousel.id, { status: 'ready' });
                          setCurrentCarousel((prev) => (prev ? { ...prev, status: 'ready' } : prev));
                        }}
                        className={`inline-flex items-center gap-2 px-5 py-2 rounded-md font-semibold border transition-all order-2 ${
                          readyToPublish
                            ? 'bg-[#2f9f56] text-vanilla border-[#2f9f56] shadow-soft hover:bg-[#38b865] hover:border-[#38b865] hover:shadow-[0_14px_40px_rgba(56,184,101,0.3)]'
                            : 'bg-surface text-vanilla/60 border-charcoal/60 cursor-not-allowed'
                        }`}
                      >
                        <Check className="h-4 w-4" />
                        {readyToPublish ? 'Ready?' : primaryCtaLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="sf-card px-6 py-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pacific/12 via-surface to-ink/90 pointer-events-none" aria-hidden="true" />
                <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full bg-pacific/15 blur-3xl pointer-events-none" aria-hidden="true" />
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-lg bg-pacific/15 border border-pacific/25 text-pacific flex items-center justify-center shadow-soft">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold text-pacific leading-tight">SlideFlow Studio</h3>
                        <p className="text-sm text-vanilla/75 leading-snug">Need quick edits? Apply brand styling to slides or composite new visuals in seconds.</p>
                      </div>
                    </div>
                    <span className="sf-pill text-xs bg-surface-alt border-charcoal/50">Workspace</span>
                  </div>

                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-vanilla/90">
                    <li className="flex items-start gap-2 rounded-lg border border-charcoal/50 bg-ink/50 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-pacific" />
                      <span>Crop + resize with 1:1 and 4:5 presets.</span>
                    </li>
                    <li className="flex items-start gap-2 rounded-lg border border-charcoal/50 bg-ink/50 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-pacific" />
                      <span>Remove or swap backgrounds with AI.</span>
                    </li>
                    <li className="flex items-start gap-2 rounded-lg border border-charcoal/50 bg-ink/50 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-pacific" />
                      <span>Add text overlays that stay on brand.</span>
                    </li>
                    <li className="flex items-start gap-2 rounded-lg border border-charcoal/50 bg-ink/50 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-pacific" />
                      <span>Save and export PNGs.</span>
                    </li>
                  </ul>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/studio', { state: { from: 'publish', carousel: currentCarousel, caption } })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-semibold bg-[#225561] text-white border border-pacific/40 shadow-soft transition-all hover:bg-pacific hover:shadow-[0_14px_40px_rgba(47,160,186,0.3)]"
                    >
                      Go to Studio
                    </button>
                    <span className="text-xs text-vanilla/65">Slides and captions carry over.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showDraftModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm p-4"
          onClick={() => {
            if (!draftSaving) {
              setShowDraftModal(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-charcoal/60 bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-vanilla">Name your carousel</h3>
              <button
                type="button"
                onClick={() => !draftSaving && setShowDraftModal(false)}
                className="rounded-full bg-ink/70 text-vanilla p-2 border border-charcoal/60 hover:bg-ink/90 transition-colors"
                aria-label="Close modal"
                disabled={draftSaving}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-vanilla/70 mb-3">Give this draft a name for your dashboard card.</p>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full rounded-md border border-charcoal/60 bg-ink/60 px-3 py-2 text-vanilla/90 focus:outline-none focus:border-pacific focus:ring-1 focus:ring-pacific"
              placeholder="Carousel title"
              disabled={draftSaving}
            />
            {draftError && <div className="text-sm text-tropical mt-2">{draftError}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                className="px-4 py-2 rounded-md border border-charcoal/60 text-vanilla/80 hover:border-pacific/50"
                disabled={draftSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={draftSaving}
                className="px-4 py-2 rounded-md bg-pacific text-white font-semibold hover:bg-pacific-deep shadow-soft border border-pacific/70 disabled:opacity-60"
              >
                {draftSaving ? 'Saving...' : 'Save draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageDots total={TOTAL_APP_PAGES} active={3} />
    </div>
  );
}
