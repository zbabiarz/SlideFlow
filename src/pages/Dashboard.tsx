import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCarousel } from '../contexts/CarouselContext';
import Navbar from '../components/Navbar';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Download, 
  CalendarCheck2,
  TrendingUp,
  Star,
  Clock,
  Image as ImageIcon
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { carousels, loading, deleteCarousel, duplicateCarousel, setCurrentCarousel, fetchCarousel } = useCarousel();
  const navigate = useNavigate();

  const canGenerate = user && user.carouselsGenerated < user.maxCarousels;
  const planLabel = (user?.plan || 'free').toString();
  const isPremium = planLabel.toLowerCase() === 'premium';
  const planTextClass = isPremium ? 'text-pacific' : 'text-vanilla';

  // Calculate time saved (assuming each carousel saves ~2.5 hours of manual work)
  const timeSavedHours = user ? Math.round(user.carouselsGenerated * 2.5 * 10) / 10 : 0;

  const handleCarouselClick = async (carousel: any) => {
    try {
      // Fetch the full carousel data with slides
      const fullCarousel = await fetchCarousel(carousel.id);
      if (fullCarousel) {
        setCurrentCarousel(fullCarousel);
        navigate('/results');
      } else {
        alert('Could not load carousel details');
      }
    } catch (error) {
      console.error('Error loading carousel:', error);
      alert('Error loading carousel');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <Navbar />
        <main className="pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tropical"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-vanilla">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-vanilla/70 mt-2">
              Create and manage your Instagram carousel posts
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="sf-card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-stormy/15 text-stormy">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-vanilla/70">Carousels Created</p>
                  <p className="text-2xl font-bold text-vanilla">{carousels.length}</p>
                </div>
              </div>
            </div>
            
            <div className="sf-card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-tropical/15 text-tropical">
                  <CalendarCheck2 className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-vanilla/70">This Month</p>
                  <p className="text-2xl font-bold text-vanilla">{carousels.length}</p>
                </div>
              </div>
            </div>
            
            <div className="sf-card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-surface-alt/10 text-vanilla">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-vanilla/70">Time Saved</p>
                  <p className="text-2xl font-bold text-vanilla">{timeSavedHours}h</p>
                </div>
              </div>
            </div>
            
            <div className="sf-card p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-surface/15 text-vanilla">
                  <Star className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-vanilla/70">Plan</p>
                  <p className={`text-2xl font-bold capitalize ${planTextClass}`}>{planLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-8">
            {canGenerate ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/slideboard"
                  className="sf-btn-primary"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Carousel
                </Link>
                <Link
                  to="/media-library"
                  className="sf-btn-secondary"
                >
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Media Library
                </Link>
              </div>
            ) : (
              <div className="bg-tropical/10 border border-tropical/30 rounded-lg p-4">
                <p className="text-vanilla font-medium">
                  You've reached your free carousel limit. 
                  <Link to="/profile" className="text-stormy hover:text-vanilla underline ml-1">
                    Upgrade to Premium
                  </Link> for unlimited generations.
                </p>
              </div>
            )}
          </div>

          {/* Carousels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {carousels.map((carousel) => (
              <div key={carousel.id} className="sf-card overflow-hidden transition-transform hover:-translate-y-0.5">
                <div 
                  className="aspect-square bg-surface border-b border-charcoal/40 relative cursor-pointer"
                  onClick={() => handleCarouselClick(carousel)}
                >
                  <div className="w-full h-full flex items-center justify-center text-vanilla/50">
                    <div className="text-center">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">Click to view</p>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-surface text-sand px-3 py-1 rounded-md text-xs shadow-soft">
                    Carousel
                  </div>
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 bg-surface-alt text-vanilla px-3 py-1 rounded-md text-sm font-medium transition-opacity">
                      Click to view & edit
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="font-semibold text-vanilla mb-2">{carousel.title}</h3>
                  <p className="text-vanilla/80 text-sm mb-4 line-clamp-2">{carousel.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-vanilla/70 mb-4">
                    <span className="px-2 py-1 rounded-full bg-surface text-vanilla/80 border border-charcoal/40 capitalize">{carousel.status || carousel.style}</span>
                    <span>{carousel.createdAt}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => duplicateCarousel(carousel.id)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-surface hover:bg-ink text-vanilla/80 rounded-lg border border-charcoal/40 transition-colors"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </button>
                    <button className="flex-1 flex items-center justify-center px-3 py-2 bg-stormy/15 hover:bg-stormy/25 text-stormy rounded-lg border border-stormy/30 transition-colors">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </button>
                    <button 
                      onClick={() => deleteCarousel(carousel.id)}
                      className="px-3 py-2 bg-surface-alt/10 hover:bg-surface-alt/20 text-vanilla rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {carousels.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-vanilla/55" />
                  </div>
                  <h3 className="text-lg font-medium text-vanilla mb-2">No carousels yet</h3>
                  <p className="text-vanilla/80 mb-6">Get started by creating your first carousel</p>
                  {canGenerate && (
                    <Link
                      to="/slideboard"
                      className="sf-btn-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Carousel
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
