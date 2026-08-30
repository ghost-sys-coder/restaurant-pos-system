import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDailyPerformanceTrend } from './analytics.ts';

test('builds a zero-filled daily business performance trend', () => {
  const trend = buildDailyPerformanceTrend([
    { total: 30_000, createdAt: new Date('2026-08-28T10:00:00Z'), completedAt: new Date('2026-08-28T10:30:00Z') },
    { total: 20_000, createdAt: new Date('2026-08-28T12:00:00Z'), completedAt: new Date('2026-08-28T12:20:00Z') },
    { total: 45_000, createdAt: new Date('2026-08-30T08:00:00Z'), completedAt: new Date('2026-08-30T08:10:00Z') },
  ], new Date('2026-08-28T00:00:00Z'), 'Africa/Kampala', new Date('2026-08-30T23:00:00Z'));

  assert.deepEqual(trend, [
    { date: '2026-08-28', revenue: 50_000, orders: 2, averageTicket: 25_000 },
    { date: '2026-08-29', revenue: 0, orders: 0, averageTicket: 0 },
    { date: '2026-08-30', revenue: 45_000, orders: 1, averageTicket: 45_000 },
  ]);
});
