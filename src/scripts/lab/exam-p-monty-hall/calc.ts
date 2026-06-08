// exam-p-monty-hall — чистое математическое ядро.
// Три шкатулки. Логика ведущего, точный апостериор, Монте-Карло.
// Никакого DOM — только числа. Тестируется в calc.test.ts.

export type Mode = 'knows' | 'random';

// Случайный индекс в [0, n).
export function rnd(n: number): number {
  return Math.floor(Math.random() * n);
}

// Третья из трёх шкатулок — не p и не o (для различных p, o из {0,1,2}).
export function other(p: number, o: number): number {
  for (let x = 0; x < 3; x++) {
    if (x !== p && x !== o) return x;
  }
  return -1; // недостижимо при различных корректных p, o
}

// Ведущий ЗНАЕТ: открывает шкатулку, которая не выбор и не деньги —
// всегда пустую. Никогда не вернёт money и никогда не вернёт pick.
export function hostOpenKnows(pick: number, money: number): number {
  const c = [0, 1, 2].filter((x) => x !== pick && x !== money);
  return c[rnd(c.length)];
}

// Ведущий НАУГАД: открывает любую, кроме выбранной. Может попасть на
// деньги (спойл-раунд) — это обрабатывается на уровне выше.
export function hostOpenRandom(pick: number, money: number): number {
  const c = [0, 1, 2].filter((x) => x !== pick);
  return c[rnd(c.length)];
}

export function hostOpen(pick: number, money: number, mode: Mode): number {
  return mode === 'knows' ? hostOpenKnows(pick, money) : hostOpenRandom(pick, money);
}

// Точный апостериор P(деньги | ведущий открыл пустую) для каждой стратегии.
// ЗНАЕТ: остаться 1/3, сменить 2/3. НАУГАД (при наступившем D_3): 1/2, 1/2.
export function posterior(mode: Mode): { stay: number; switch: number } {
  return mode === 'knows'
    ? { stay: 1 / 3, switch: 2 / 3 }
    : { stay: 1 / 2, switch: 1 / 2 };
}

export interface SimResult {
  switchWins: number;
  switchTotal: number;
  stayWins: number;
  stayTotal: number;
  spoiled: number;
  started: number;
}

// Монте-Карло обоих режимов. В «наугад» спойл-раунды (ведущий вскрыл
// деньги) выбрасываются из статистики смены/остановки, но считаются в
// spoiled/started.
export function simulate(mode: Mode, n: number): SimResult {
  let switchWins = 0;
  let switchTotal = 0;
  let stayWins = 0;
  let stayTotal = 0;
  let spoiled = 0;
  for (let i = 0; i < n; i++) {
    const money = rnd(3);
    const pick = rnd(3);
    const opened = hostOpen(pick, money, mode);
    if (mode === 'random' && opened === money) {
      spoiled++;
      continue;
    }
    const sw = other(pick, opened);
    if (sw === money) switchWins++;
    switchTotal++;
    if (pick === money) stayWins++;
    stayTotal++;
  }
  return { switchWins, switchTotal, stayWins, stayTotal, spoiled, started: n };
}

// Демо со ста шкатулками: какую ведущий оставляет закрытой («обойдённая»).
// Если выбор не на деньгах — оставляет шкатулку с деньгами. Если игрок
// угадал сразу (редкий случай) — оставляет детерминированную другую.
export function hundredSaved(pick: number, money: number, size = 100): number {
  return money !== pick ? money : (pick + Math.floor(size / 2)) % size;
}
