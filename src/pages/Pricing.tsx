import React from 'react';
import { stripeProducts } from '../stripe-config';
import { SubscriptionCard } from '../components/subscription/SubscriptionCard';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function Pricing() {
  const { user } = useAuth();
  const { subscription, plan } = useSubscription();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Choose Your Plan
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Please sign in to view pricing options
            </p>
            <div className="mt-8 space-x-4">
              <Link to="/login">
                <Button>Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button variant="outline">Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Select the perfect plan for your needs
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-x-8">
          {stripeProducts.map((product) => (
            <SubscriptionCard
              key={product.id}
              product={product}
              isCurrentPlan={plan?.id === product.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}