import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  monthDiff,
  computeAvgMonthlyPaid,
  computeRevenueForecast,
  computeCashFlow,
  applyScenario,
} from './forecast';
import type {
  ForecastMonth,
  RevenueForecastItem,
  ExpenseForecastItem,
  ScenarioParams,
} from './forecast';
import type { Invoice } from '../types';

const monthKey = fc
  .tuple(fc.integer({ min: 2000, max: 2100 }), fc.integer({ min: 1, max: 12 }))
  .map(([y, m]) => `${y}-${String(m).padStart(2, '0')}`);

const forecastMonth: fc.Arbitrary<ForecastMonth> = monthKey.map((key) => ({ label: key, key }));

const sumRevenue = (items: RevenueForecastItem[]): number =>
  items.reduce((total, item) => total + item.confirmed + item.probable + item.projected, 0);

describe('forecast algebra properties', () => {
  it('monthDiff is reflexive, antisymmetric and additive', () => {
    fc.assert(
      fc.property(monthKey, monthKey, monthKey, (a, b, c) => {
        expect(monthDiff(a, a)).toBe(0);
        // Zero-sum form avoids Object.is distinguishing +0 from -0.
        expect(monthDiff(a, b) + monthDiff(b, a)).toBe(0);
        expect(monthDiff(a, c)).toBe(monthDiff(a, b) + monthDiff(b, c));
      }),
      { numRuns: 100 },
    );
  });

  it('computeCashFlow nets telescope into the running balance', () => {
    const row = fc.tuple(
      forecastMonth,
      fc.nat(10_000),
      fc.nat(10_000),
      fc.nat(10_000),
      fc.nat(10_000),
      fc.nat(10_000),
    );

    fc.assert(
      fc.property(
        fc.array(row, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: -100_000, max: 100_000 }),
        (rows, currentBalance) => {
          const revenueItems: RevenueForecastItem[] = rows.map(
            ([month, confirmed, probable, projected]) => ({
              month,
              confirmed,
              probable,
              projected,
              baseline: 0,
            }),
          );
          const expenseItems: ExpenseForecastItem[] = rows.map(
            ([month, , , , known, projected]) => ({
              month,
              known,
              projected,
              baseline: 0,
            }),
          );

          const cashFlow = computeCashFlow(revenueItems, expenseItems, currentBalance);
          for (let i = 0; i < rows.length; i++) {
            expect(cashFlow[i].income).toBe(
              revenueItems[i].confirmed + revenueItems[i].probable + revenueItems[i].projected,
            );
            expect(cashFlow[i].expenses).toBe(expenseItems[i].known + expenseItems[i].projected);
            expect(cashFlow[i].net).toBe(cashFlow[i].income - cashFlow[i].expenses);
          }

          const finalBalance = cashFlow[cashFlow.length - 1].runningBalance!;
          expect(finalBalance - currentBalance).toBe(
            cashFlow.reduce((total, item) => total + item.net, 0),
          );

          const withoutBalance = computeCashFlow(revenueItems, expenseItems);
          expect(withoutBalance.every((item) => item.runningBalance === undefined)).toBe(true);
          expect(withoutBalance.map((item) => item.net)).toEqual(cashFlow.map((item) => item.net));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('computeRevenueForecast stays non-negative above the baseline floor', () => {
    // Multiples of 3 across three months keep the computed baseline an integer.
    const paidTriplet = fc.tuple(
      fc.nat(100).map((n) => n * 3),
      fc.nat(100).map((n) => n * 3),
      fc.nat(100).map((n) => n * 3),
    );
    const months: ForecastMonth[] = [{ label: '2026-01', key: '2026-01' }];

    fc.assert(
      fc.property(paidTriplet, fc.nat(10_000), ([jan, feb, mar], sentTotal) => {
        const paid: Record<string, number> = { '2024-01': jan, '2024-02': feb, '2024-03': mar };
        const invoices: Invoice[] = [
          {
            id: 'sent-1',
            client_id: 'client-1',
            invoice_number: 'INV-1',
            status: 'sent',
            line_items: [],
            subtotal: sentTotal,
            total: sentTotal,
            due_date: '2026-01-15',
            created_at: '2026-01-01',
          },
        ];

        const [item] = computeRevenueForecast([], invoices, [], {}, paid, months);
        const baseline = computeAvgMonthlyPaid(paid);
        expect(baseline).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(baseline)).toBe(true);
        expect(item.baseline).toBe(baseline);
        expect(item.confirmed).toBeGreaterThanOrEqual(0);
        expect(item.probable).toBeGreaterThanOrEqual(0);
        expect(item.projected).toBeGreaterThanOrEqual(0);
        expect(item.baseline).toBeGreaterThanOrEqual(0);
        expect(item.confirmed + item.probable + item.projected).toBeGreaterThanOrEqual(baseline);
        if (item.confirmed + item.probable >= baseline) {
          expect(item.projected).toBe(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('applyScenario is monotone in mode and clients, and leaves expenses untouched', () => {
    const revenueItem: fc.Arbitrary<RevenueForecastItem> = fc
      .tuple(forecastMonth, fc.nat(10_000), fc.nat(10_000), fc.nat(10_000), fc.nat(10_000))
      .map(([month, confirmed, probable, projected, baseline]) => ({
        month,
        confirmed,
        probable,
        projected,
        baseline,
      }));
    const expenseItem: fc.Arbitrary<ExpenseForecastItem> = fc
      .tuple(forecastMonth, fc.nat(10_000), fc.nat(10_000), fc.nat(10_000))
      .map(([month, known, projected, baseline]) => ({ month, known, projected, baseline }));

    fc.assert(
      fc.property(
        fc.array(revenueItem, { minLength: 1, maxLength: 6 }),
        fc.array(expenseItem, { minLength: 1, maxLength: 6 }),
        fc.nat(10_000),
        fc.nat(20),
        (revenue, expenses, avgClientRevenue, newClientsPerMonth) => {
          const base: Omit<ScenarioParams, 'mode'> = {
            newClientsPerMonth,
            rateIncrease: 0,
            expenseGrowth: 0,
          };
          const conservative = applyScenario(revenue, expenses, avgClientRevenue, {
            ...base,
            mode: 'conservative',
          });
          const baseline = applyScenario(revenue, expenses, avgClientRevenue, {
            ...base,
            mode: 'base',
          });
          const optimistic = applyScenario(revenue, expenses, avgClientRevenue, {
            ...base,
            mode: 'optimistic',
          });

          expect(sumRevenue(optimistic.revenue)).toBeGreaterThanOrEqual(
            sumRevenue(baseline.revenue),
          );
          expect(sumRevenue(baseline.revenue)).toBeGreaterThanOrEqual(
            sumRevenue(conservative.revenue),
          );
          expect(optimistic.expenses).toEqual(baseline.expenses);
          expect(optimistic.expenses).toEqual(conservative.expenses);

          const moreClients = applyScenario(revenue, expenses, avgClientRevenue, {
            ...base,
            mode: 'base',
            newClientsPerMonth: newClientsPerMonth + 5,
          });
          for (let i = 0; i < revenue.length; i++) {
            expect(moreClients.revenue[i].confirmed).toBeGreaterThanOrEqual(
              baseline.revenue[i].confirmed,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
