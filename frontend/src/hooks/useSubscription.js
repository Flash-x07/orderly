/**
 * useSubscription
 * Central hook for subscription state.
 *
 * ADDED: pendingRequest — the user's active pending request (if any), returned
 * by GET /api/subscription/status. PricingPage uses this to show the
 * "Awaiting Approval" badge on the correct plan card.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export function useSubscription() {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/subscription/status');
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load subscription.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // When status is null (still loading) default to 'loading' sentinel, not 'expired'
  // This prevents a flash of "expired" state before the fetch completes.
  const subscriptionStatus = status ? (status.subscriptionStatus ?? 'expired') : null;
  const subscriptionPlan   = status?.subscriptionPlan ?? 'free';

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,

    // Plan booleans
    isActive:    subscriptionStatus === 'active',
    isPending:   subscriptionStatus === 'pending',
    isTrial:     subscriptionPlan   === 'trial',
    isPro:       subscriptionPlan   === 'pro',
    isPremium:   subscriptionPlan   === 'premium',
    isFree:      subscriptionPlan   === 'free',
    isExpired:   subscriptionStatus === 'expired',
    isCancelled: subscriptionStatus === 'cancelled',

    daysRemaining:      status?.daysRemaining ?? 0,
    plan:               subscriptionPlan,
    subscriptionStatus: subscriptionStatus ?? 'expired',
    pendingRequest:     status?.pendingRequest ?? null,
  };
}
