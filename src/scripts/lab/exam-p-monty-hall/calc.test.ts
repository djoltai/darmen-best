// Тесты математического ядра exam-p-monty-hall.
//
// ВНИМАНИЕ: тестовый раннер (vitest) в репо пока не установлен — это
// осознанный tech-debt (см. CLAUDE.md, ROADMAP.md, JOURNAL 2026-05-18).
// Файл написан в синтаксисе vitest и НЕ импортируется страницей, поэтому
// `astro build` его не трогает. Запустить: `npx vitest run` (когда раннер
// появится в репо по отдельной задаче). Контрольные значения и допуски —
// из handoff «Required tests» и design-doc.

import { describe, it, expect } from 'vitest';
import {
  hostOpenKnows,
  hostOpenRandom,
  posterior,
  simulate,
  hundredSaved,
} from './calc';

describe('hostOpenKnows', () => {
  it('никогда не вскрывает деньги и не вскрывает выбор (все pick×money)', () => {
    for (let pick = 0; pick < 3; pick++) {
      for (let money = 0; money < 3; money++) {
        for (let t = 0; t < 2000; t++) {
          const opened = hostOpenKnows(pick, money);
          expect(opened).not.toBe(money);
          expect(opened).not.toBe(pick);
          expect(opened).toBeGreaterThanOrEqual(0);
          expect(opened).toBeLessThan(3);
        }
      }
    }
  });
});

describe('hostOpenRandom', () => {
  it('никогда не вскрывает выбор', () => {
    for (let pick = 0; pick < 3; pick++) {
      for (let money = 0; money < 3; money++) {
        for (let t = 0; t < 2000; t++) {
          expect(hostOpenRandom(pick, money)).not.toBe(pick);
        }
      }
    }
  });

  it('может вскрыть деньги (спойл) — когда выбор не на деньгах', () => {
    let hitMoney = false;
    const pick = 0;
    const money = 1; // деньги не под выбором → ведущий может на них попасть
    for (let t = 0; t < 2000 && !hitMoney; t++) {
      if (hostOpenRandom(pick, money) === money) hitMoney = true;
    }
    expect(hitMoney).toBe(true);
  });
});

describe('posterior', () => {
  it('знает → остаться 1/3, сменить 2/3', () => {
    expect(posterior('knows')).toEqual({ stay: 1 / 3, switch: 2 / 3 });
  });
  it('наугад → остаться 1/2, сменить 1/2', () => {
    expect(posterior('random')).toEqual({ stay: 1 / 2, switch: 1 / 2 });
  });
});

const TOL = 0.015; // ±1.5% по handoff
const N = 100_000;

describe('simulate — режим «знает»', () => {
  const r = simulate('knows', N);
  it('спойлов нет', () => {
    expect(r.spoiled).toBe(0);
    expect(r.switchTotal).toBe(N);
    expect(r.stayTotal).toBe(N);
  });
  it('смена выигрывает ≈ 2/3', () => {
    expect(r.switchWins / r.switchTotal).toBeGreaterThan(2 / 3 - TOL);
    expect(r.switchWins / r.switchTotal).toBeLessThan(2 / 3 + TOL);
  });
  it('остаться выигрывает ≈ 1/3', () => {
    expect(Math.abs(r.stayWins / r.stayTotal - 1 / 3)).toBeLessThan(TOL);
  });
});

describe('simulate — режим «наугад»', () => {
  const r = simulate('random', N);
  it('доля спойлов ≈ 1/3', () => {
    expect(Math.abs(r.spoiled / r.started - 1 / 3)).toBeLessThan(TOL);
  });
  it('среди не-спойлов смена ≈ 1/2', () => {
    expect(Math.abs(r.switchWins / r.switchTotal - 1 / 2)).toBeLessThan(TOL);
  });
  it('среди не-спойлов остаться ≈ 1/2', () => {
    expect(Math.abs(r.stayWins / r.stayTotal - 1 / 2)).toBeLessThan(TOL);
  });
});

describe('hundredSaved', () => {
  it('выбор не на деньгах → оставляет шкатулку с деньгами', () => {
    expect(hundredSaved(7, 42)).toBe(42);
  });
  it('угадал сразу → оставляет другую (не выбор)', () => {
    const saved = hundredSaved(7, 7);
    expect(saved).not.toBe(7);
    expect(saved).toBeGreaterThanOrEqual(0);
    expect(saved).toBeLessThan(100);
  });
});
