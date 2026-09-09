import { describe, it, expect } from 'vitest';
import {
  LICENSE_TIERS,
  TRIAL,
  FEATURE_FLAGS,
  getFeatureFlags,
  type LicenseTier,
} from '../lib/constants';

describe('License tier feature flags', () => {
  const allTiers: LicenseTier[] = [
    LICENSE_TIERS.FREE,
    LICENSE_TIERS.PRO,
    LICENSE_TIERS.TRIAL,
    LICENSE_TIERS.EXPIRED,
    LICENSE_TIERS.OFFLINE_CACHED,
    LICENSE_TIERS.LEGACY_LIFETIME,
  ];

  it('every tier has an entry in FEATURE_FLAGS', () => {
    allTiers.forEach((tier) => {
      expect(FEATURE_FLAGS).toHaveProperty(tier);
    });
  });

  it('FREE tier gates archetypeDepth, scopeCreepProtection, advancedInsights to false', () => {
    const flags = getFeatureFlags(LICENSE_TIERS.FREE);
    expect(flags.archetypeDepth).toBe(false);
    expect(flags.scopeCreepProtection).toBe(false);
    expect(flags.advancedInsights).toBe(false);
    expect(flags.smartDunning).toBe(false);
    // Core features remain true
    expect(flags.contractPdf).toBe(true);
    expect(flags.docxExport).toBe(true);
    expect(flags.clientPortal).toBe(true);
    expect(flags.recurringInvoices).toBe(true);
  });

  it('TRIAL tier unlocks all features (full Pro trial)', () => {
    const flags = getFeatureFlags(LICENSE_TIERS.TRIAL);
    expect(flags.archetypeDepth).toBe(true);
    expect(flags.scopeCreepProtection).toBe(true);
    expect(flags.advancedInsights).toBe(true);
    expect(flags.smartDunning).toBe(true);
    expect(flags.contractPdf).toBe(true);
    expect(flags.docxExport).toBe(true);
    expect(flags.clientPortal).toBe(true);
    expect(flags.recurringInvoices).toBe(true);
  });

  it('PRO tier unlocks all features', () => {
    const flags = getFeatureFlags(LICENSE_TIERS.PRO);
    expect(flags.archetypeDepth).toBe(true);
    expect(flags.scopeCreepProtection).toBe(true);
    expect(flags.advancedInsights).toBe(true);
  });

  it('LEGACY_LIFETIME tier unlocks all features', () => {
    const flags = getFeatureFlags(LICENSE_TIERS.LEGACY_LIFETIME);
    expect(flags.archetypeDepth).toBe(true);
    expect(flags.scopeCreepProtection).toBe(true);
    expect(flags.advancedInsights).toBe(true);
  });

  it('EXPIRED tier reverts depth/creep/insights to false but keeps core', () => {
    const flags = getFeatureFlags(LICENSE_TIERS.EXPIRED);
    expect(flags.archetypeDepth).toBe(false);
    expect(flags.scopeCreepProtection).toBe(false);
    expect(flags.advancedInsights).toBe(false);
    expect(flags.contractPdf).toBe(true);
    expect(flags.clientPortal).toBe(true);
  });

  it('OFFLINE_CACHED tier same as EXPIRED (conservative)', () => {
    const flags = getFeatureFlags(LICENSE_TIERS.OFFLINE_CACHED);
    expect(flags.archetypeDepth).toBe(false);
    expect(flags.scopeCreepProtection).toBe(false);
    expect(flags.advancedInsights).toBe(false);
  });

  it('unknown tier falls back to FREE', () => {
    const flags = getFeatureFlags('unknown' as LicenseTier);
    expect(flags.archetypeDepth).toBe(false);
    expect(flags.scopeCreepProtection).toBe(false);
  });
});

describe('Trial timeline constants', () => {
  it('FULL_DAYS = 30, SOFT_DAY = 30, HARD_DAY = 37', () => {
    expect(TRIAL.FULL_DAYS).toBe(30);
    expect(TRIAL.SOFT_DAY).toBe(30);
    expect(TRIAL.HARD_DAY).toBe(37);
  });

  it('SOFT_DAY equals FULL_DAYS (soft prompts start immediately after trial ends)', () => {
    expect(TRIAL.SOFT_DAY).toBe(TRIAL.FULL_DAYS);
  });

  it('HARD_DAY > SOFT_DAY (7-day soft window)', () => {
    expect(TRIAL.HARD_DAY - TRIAL.SOFT_DAY).toBe(7);
  });
});

describe('License tier enum', () => {
  it('contains all six expected tiers', () => {
    expect(Object.values(LICENSE_TIERS)).toEqual([
      'free',
      'pro',
      'trial',
      'expired',
      'cached',
      'lifetime',
    ]);
  });
});