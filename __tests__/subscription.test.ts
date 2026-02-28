// Test the subscription tier config
import { TIER_CONFIG } from '../src/types/subscription';

describe('Subscription Tiers', () => {
  it('free tier should have 5 daily messages', () => {
    expect(TIER_CONFIG.free.dailyLimit).toBe(5);
  });

  it('lite tier should have 15 daily messages', () => {
    expect(TIER_CONFIG.lite.dailyLimit).toBe(15);
  });

  it('vip tier should have unlimited messages', () => {
    expect(TIER_CONFIG.vip.dailyLimit).toBe(Infinity);
  });

  it('premium tier should have unlimited messages', () => {
    expect(TIER_CONFIG.premium.dailyLimit).toBe(Infinity);
  });

  it('free tier should have $0 price', () => {
    expect(TIER_CONFIG.free.price).toBe(0);
  });

  it('all paid tiers should have annual pricing', () => {
    expect(TIER_CONFIG.lite.annualPrice).toBeDefined();
    expect(TIER_CONFIG.vip.annualPrice).toBeDefined();
    expect(TIER_CONFIG.premium.annualPrice).toBeDefined();
  });
});
