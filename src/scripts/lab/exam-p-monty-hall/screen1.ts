// exam-p-monty-hall — экран 1 (классика, режим всегда «знает»).
// Порт механики мокапа screen1-classic-v9: фазы pick→picked→opened→result,
// перетекание чипа на оставшуюся шкатулку, прогон 1000, демо со 100 шкатулками.
// Скоупится на свою секцию, цвета — через классы (см. exam-p-monty-hall.css).

import { hostOpenKnows, other, rnd, hundredSaved } from './calc';

type Phase = 'pick' | 'picked' | 'opened' | 'result';
type Action = 'stay' | 'switch';

export function initScreen1(): void {
  const root = document.querySelector<HTMLElement>('[data-screen="classic"]');
  if (!root) return;
  const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => root.querySelector(sel) as T;
  const all = <T extends HTMLElement = HTMLElement>(sel: string): T[] =>
    Array.from(root.querySelectorAll(sel)) as T[];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const chips = all('.mh-chip');
  const boxes = all('.mh-box');
  const bracket = $('.mh-bracket');
  const statusEl = $('.mh-status');
  const whyEl = $('.mh-why');
  const actionsEl = $('.mh-actions');
  const manualEl = $('.mh-manual');

  // ---- состояние игры ----
  let money = -1;
  let pick = -1;
  let opened = -1;
  let phase: Phase = 'pick';
  let finalPick = -1;
  let lastAction: Action | '' = '';
  let lastWin = false;
  const tally = { swW: 0, swT: 0, stW: 0, stT: 0 };

  function boxTag(i: number): { text: string; cls: string } {
    if (phase === 'picked' || phase === 'opened') {
      if (i === pick) return { text: 'первоначальный выбор', cls: 'is-teal' };
      return { text: '', cls: '' };
    }
    if (phase === 'result') {
      if (lastAction === 'stay') {
        if (i === pick) return { text: 'остался здесь', cls: lastWin ? 'is-teal' : 'is-coral' };
        return { text: '', cls: '' };
      }
      if (i === pick) return { text: 'ушёл отсюда', cls: 'is-faint' };
      if (i === finalPick) return { text: 'сменил сюда', cls: lastWin ? 'is-teal' : 'is-coral' };
    }
    return { text: '', cls: '' };
  }

  function render(): void {
    const reveal = phase === 'result';
    for (let i = 0; i < 3; i++) {
      const isPick = i === pick;
      const isOpen = i === opened;
      const isMoney = i === money;

      // чип
      const chip = chips[i];
      chip.style.transform = '';
      chip.style.opacity = '';
      let chipTxt = '1/3';
      let chipCls = 'is-faint';
      if (phase === 'pick') {
        chipTxt = '1/3';
        chipCls = 'is-faint';
      } else if (phase === 'picked') {
        chipTxt = '1/3';
        chipCls = isPick ? 'is-teal' : 'is-faint';
      } else if (isPick) {
        chipTxt = '1/3';
        chipCls = 'is-faint';
      } else if (isOpen) {
        chipTxt = '0';
        chipCls = 'is-coral';
      } else {
        chipTxt = '2/3';
        chipCls = 'is-teal';
      }
      chip.className = 'mh-chip ' + chipCls;
      chip.textContent = chipTxt;

      // шкатулка
      const box = boxes[i];
      const icon = box.querySelector<HTMLElement>('.mh-box-icon')!;
      const label = box.querySelector<HTMLElement>('.mh-box-label')!;
      const tag = box.querySelector<HTMLElement>('.mh-box-tag')!;
      box.className = 'mh-box';
      let iconName = 'ti-box';
      let labelText = 'Шкатулка ' + (i + 1);
      if (reveal && isMoney) {
        box.classList.add('is-money');
        iconName = 'ti-coins';
        labelText = 'Деньги';
      } else if (isOpen || reveal) {
        box.classList.add('is-empty');
        iconName = 'ti-square-x';
        labelText = 'Пусто';
      }
      if (isPick && phase !== 'result') box.classList.add('is-picked');
      if (phase === 'result' && i === finalPick) box.classList.add(lastWin ? 'is-final-win' : 'is-final-lose');
      if (phase === 'pick') box.classList.add('is-clickable');
      icon.className = 'mh-box-icon ti ' + iconName;
      label.textContent = labelText;
      const t = boxTag(i);
      tag.className = 'mh-box-tag' + (t.cls ? ' ' + t.cls : '');
      tag.textContent = t.text;
    }

    renderBracket();
    whyEl.classList.toggle('is-visible', phase === 'opened' || phase === 'result');
    setActions();
    setStatus();
    renderManual();
  }

  function renderBracket(): void {
    if (phase === 'picked') {
      bracket.classList.add('is-visible');
      let inner = '';
      for (let k = 0; k < 3; k++) {
        inner += k === pick ? '<div></div>' : '<div class="mh-bracket-line"></div>';
      }
      inner += '<div class="mh-bracket-label">две другие вместе — 2/3</div>';
      bracket.innerHTML = '<div class="mh-bracket-grid">' + inner + '</div>';
    } else {
      bracket.classList.remove('is-visible');
      bracket.innerHTML = '';
    }
  }

  function setStatus(): void {
    if (phase === 'pick') {
      statusEl.innerHTML =
        'Деньги в одной из трёх. У каждой шанс <span class="mh-mono is-faint">1/3</span>. Жми любую.';
    } else if (phase === 'picked') {
      statusEl.innerHTML =
        'Твой шанс — <span class="mh-mono is-teal">1/3</span>. На две другие вместе — <span class="mh-mono is-teal">2/3</span>. Пусть Якубович откроет пустую.';
    } else if (phase === 'opened') {
      statusEl.innerHTML =
        'Он открыл пустую. Твой шанс так и <span class="mh-mono is-faint">1/3</span> — а <span class="mh-mono is-teal">2/3</span> теперь целиком на оставшейся. Меняешь?';
    }
  }

  function addBtn(text: string, fn: () => void, primary: boolean): void {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mh-btn' + (primary ? ' mh-btn--primary' : '');
    b.textContent = text;
    b.addEventListener('click', fn);
    actionsEl.appendChild(b);
  }

  function setActions(): void {
    actionsEl.innerHTML = '';
    if (phase === 'picked') {
      addBtn('Якубович открывает пустую', doOpen, true);
    } else if (phase === 'opened') {
      addBtn('Поменять шкатулку', () => decide('switch'), true);
      addBtn('Остаться при своей', () => decide('stay'), false);
    } else if (phase === 'result') {
      addBtn('Ещё раз', newRound, false);
    }
  }

  function choose(i: number): void {
    if (phase !== 'pick') return;
    pick = i;
    phase = 'picked';
    render();
  }

  function doOpen(): void {
    if (phase !== 'picked') return;
    opened = hostOpenKnows(pick, money);
    phase = 'opened';
    render();
    if (reduceMotion) return;
    // перетекание: чип вскрытой шкатулки уезжает на оставшуюся и гаснет.
    const rem = other(pick, opened);
    const gap = 12;
    const w = boxes[0].getBoundingClientRect().width;
    const dx = (rem - opened) * (w + gap);
    const oc = chips[opened];
    oc.textContent = '1/3';
    oc.className = 'mh-chip is-teal';
    oc.style.transform = 'translateX(' + dx + 'px)';
    window.setTimeout(() => {
      oc.style.opacity = '0';
    }, 660);
  }

  function decide(action: Action): void {
    if (phase !== 'opened') return;
    const sw = other(pick, opened);
    finalPick = action === 'switch' ? sw : pick;
    lastAction = action;
    lastWin = finalPick === money;
    if (action === 'switch') {
      tally.swT++;
      if (lastWin) tally.swW++;
    } else {
      tally.stT++;
      if (lastWin) tally.stW++;
    }
    phase = 'result';
    render();
    statusEl.innerHTML = lastWin
      ? '<span class="is-win">Выигрыш.</span> ' +
        (action === 'switch' ? 'Поменял — и деньги твои.' : 'Остался при своём — и повезло.')
      : '<span class="is-lose">Мимо.</span> ' +
        (action === 'switch'
          ? 'Поменял, но в этот раз сразу попал на деньги.'
          : 'Остался — а надо было менять.') +
        ' Деньги были в шкатулке ' + (money + 1) + '.';
  }

  function renderManual(): void {
    if (tally.swT + tally.stT === 0) {
      manualEl.textContent = '';
      return;
    }
    const parts: string[] = [];
    if (tally.swT) parts.push('менял ' + tally.swW + '/' + tally.swT);
    if (tally.stT) parts.push('оставался ' + tally.stW + '/' + tally.stT);
    manualEl.textContent = 'вручную: ' + parts.join('  ·  ');
  }

  function newRound(): void {
    money = rnd(3);
    pick = -1;
    opened = -1;
    finalPick = -1;
    lastAction = '';
    phase = 'pick';
    render();
  }

  // ---- прогон 1000 ----
  const simBtn = $<HTMLButtonElement>('.mh-sim-btn');
  const simCounter = $('.mh-sim-counter');
  const miniCells = all('.mh-mini-cell');
  const simSwitch = $('[data-stat="switch"]');
  const simStay = $('[data-stat="stay"]');
  const simNote = $('.mh-sim-note');
  let simRunning = false;

  function flashMini(): void {
    const p = rnd(3);
    const mny = rnd(3);
    const o = hostOpenKnows(p, mny);
    for (let i = 0; i < 3; i++) {
      const cell = miniCells[i];
      const icon = cell.querySelector<HTMLElement>('i')!;
      cell.className = 'mh-mini-cell';
      let ic = 'ti-box';
      if (i === o) {
        cell.classList.add('is-open');
        ic = 'ti-square-x';
      }
      if (i === p) cell.classList.add('is-pick');
      icon.className = 'ti ' + ic;
    }
  }

  function simFinish(swW: number, stW: number): void {
    simRunning = false;
    simBtn.removeAttribute('disabled');
    simNote.textContent =
      'Из 1000 игр смена принесла ' + swW + ' побед, упрямство — ' + stW + '. Те самые 2/3 против 1/3.';
  }

  simBtn.addEventListener('click', () => {
    if (simRunning) return;
    simRunning = true;
    const total = 1000;
    const per = 25;
    let done = 0;
    let swW = 0;
    let stW = 0;
    simBtn.setAttribute('disabled', '');
    simNote.textContent = '';

    const step = (count: number): void => {
      for (let n = 0; n < count; n++, done++) {
        const mny = rnd(3);
        const p = rnd(3);
        const o = hostOpenKnows(p, mny);
        const sw = other(p, o);
        if (sw === mny) swW++;
        if (p === mny) stW++;
      }
      flashMini();
      simCounter.textContent = 'игра ' + done + ' / ' + total;
      simSwitch.textContent = Math.round((100 * swW) / done) + '%';
      simStay.textContent = Math.round((100 * stW) / done) + '%';
    };

    if (reduceMotion) {
      step(total);
      simFinish(swW, stW);
      return;
    }
    const iv = window.setInterval(() => {
      step(Math.min(per, total - done));
      if (done >= total) {
        window.clearInterval(iv);
        simFinish(swW, stW);
      }
    }, 38);
  });

  // ---- демо со 100 шкатулками ----
  const board = $('.mh-board');
  const boardIntro = $('.mh-board-intro');
  const boardNote = $('.mh-board-note');
  const boardReset = $<HTMLButtonElement>('.mh-board-reset');
  let money100 = -1;
  let pick100 = -1;
  let busy100 = false;
  let cells100: HTMLElement[] = [];

  function renderBoard100(): void {
    board.innerHTML = '';
    cells100 = [];
    for (let i = 0; i < 100; i++) {
      const d = document.createElement('div');
      d.className = 'mh-cell';
      d.addEventListener('click', () => pickHundred(i));
      board.appendChild(d);
      cells100.push(d);
    }
  }

  function finishBoard(saved: number): void {
    cells100[saved].className = 'mh-cell is-saved';
    cells100[money100].innerHTML = '<i class="ti ti-coins" aria-hidden="true"></i>';
    boardNote.innerHTML =
      money100 === pick100
        ? 'Редкий случай: ты угадал с первого раза — а это всего <span class="mh-mono is-coral">1 из 100</span>. Рассчитывать на такое нельзя: меняя, выигрываешь в <span class="mh-mono is-teal">99 из 100</span>.'
        : 'Деньги в той, что Якубович оставил закрытой, — не в твоей. С первого раза ты промахнулся, как и бывает в <span class="mh-mono is-teal">99 из 100</span>. Меняй не думая.';
    boardReset.style.display = 'inline-block';
    busy100 = false;
  }

  function pickHundred(i: number): void {
    if (busy100 || pick100 >= 0) return;
    pick100 = i;
    busy100 = true;
    cells100[i].className = 'mh-cell is-pick';
    const saved = hundredSaved(pick100, money100, 100);
    const toOpen: number[] = [];
    for (let k = 0; k < 100; k++) {
      if (k !== pick100 && k !== saved) toOpen.push(k);
    }
    for (let a = toOpen.length - 1; a > 0; a--) {
      const b = rnd(a + 1);
      const tmp = toOpen[a];
      toOpen[a] = toOpen[b];
      toOpen[b] = tmp;
    }
    boardIntro.style.opacity = '0.5';
    if (reduceMotion) {
      for (const k of toOpen) cells100[k].className = 'mh-cell is-open';
      finishBoard(saved);
      return;
    }
    let j = 0;
    const iv = window.setInterval(() => {
      if (j < toOpen.length) {
        cells100[toOpen[j]].className = 'mh-cell is-open';
        j++;
      } else {
        window.clearInterval(iv);
        finishBoard(saved);
      }
    }, 10);
  }

  boardReset.addEventListener('click', () => {
    money100 = rnd(100);
    pick100 = -1;
    busy100 = false;
    boardNote.textContent = '';
    boardReset.style.display = 'none';
    boardIntro.style.opacity = '1';
    renderBoard100();
  });

  // ---- старт ----
  boxes.forEach((box, i) => box.addEventListener('click', () => choose(i)));
  flashMini();
  money100 = rnd(100);
  renderBoard100();
  newRound();
}
