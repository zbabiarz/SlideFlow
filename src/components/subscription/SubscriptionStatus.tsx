import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { Alert } from '../ui/Alert';

export function SubscriptionStatus() {
  const { subscription, loading, error, plan, isActive } = useSubscription();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error">
        Failed to load subscription status
      </Alert>
    );
  }

  if (!subscription || !plan) {
    return (
      <div className="text-sm text-gray-600">
        No active subscription
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
      <span className="text-sm font-medium text-gray-900">
        {plan.name}
      </span>
      <span className="text-sm text-gray-600">
        ({subscription.subscription_status})
      </span>
    </div>
  );
}