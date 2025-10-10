import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { StripeProduct } from '../../stripe-config';
import { supabase } from '../../lib/supabase';

interface SubscriptionCardProps {
  product: StripeProduct;
  isCurrentPlan?: boolean;
}

export function SubscriptionCard({ product, isCurrentPlan = false }: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to subscribe');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: product.priceId,
          mode: product.mode,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/pricing`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {product.name}
        </h3>
        <p className="text-gray-600 mb-4">
          {product.description}
        </p>
        <div className="mb-6">
          <span className="text-3xl font-bold text-gray-900">
            ${product.price}
          </span>
          {product.mode === 'subscription' && (
            <span className="text-gray-600">/month</span>
          )}
        </div>
        
        {error && (
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
        )}
        
        <Button
          onClick={handleSubscribe}
          loading={loading}
          disabled={isCurrentPlan}
          className="w-full"
          variant={isCurrentPlan ? 'secondary' : 'primary'}
        >
          {isCurrentPlan ? 'Current Plan' : 'Subscribe'}
        </Button>
      </div>
    </div>
  );
}