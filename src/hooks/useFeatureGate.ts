import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store';
import { TRIAL } from '../lib/constants';

export function useFeatureGate(flag: string) {
  const { getFeatureFlags, getActiveTier } = useStore();
  const [allowed, setAllowed] = useState(false);
  const [tier, setTier] = useState('free');

  useEffect(() => {
    // Sync check
    const currentTier = getActiveTier();
    setTier(currentTier);
    getFeatureFlags().then(flags => {
      setAllowed(flags[flag] === true);
    });
  }, [flag, getActiveTier, getFeatureFlags]);

  const check = useCallback(async () => {
    const flags = await getFeatureFlags();
    return flags[flag] === true;
  }, [flag, getFeatureFlags]);

  return {
    allowed,
    check,
    isAllowed: check,
    tier,
  };
}

export function useTrialStatus() {
  const { getActiveTier } = useStore();

  const tier = getActiveTier();
  const isTrial = tier === 'trial';
  const isExpired = tier === 'expired';
  const isPro = ['pro', 'lifetime'].includes(tier);

  return {
    tier,
    isTrial,
    isExpired,
    isPro,
    daysRemaining: isTrial ? TRIAL.FULL_DAYS : 0,
  };
}