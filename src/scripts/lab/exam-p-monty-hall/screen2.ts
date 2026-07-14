// exam-p-monty-hall — экран 2 (правило ведущего).
// Порт механики мокапа screen2-rule-v4: тумблер «знает / наугад», едущее
// герой-число 67↔50, спойл-раунды, прогон 1000 в текущем режиме.
// Хвост sim-note + бутстрап восстановлены из полного screen2-rule-v3
// (v4 на диске обрезан; diff v3→v4 затрагивает только строку-связку выше).

import { hostOpen, other, rnd } from './calc';
import type { Mode } from './calc';

type Phase = 'pick' | 'decide' | 'spoiled' | 'result';
type Action = 'stay' | 'switch';

export function initScreen2(): void {
  const root = document.querySelector<HTMLElement>('[data-screen="rule"]');
  if (!root) return;
  const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => root.querySelector(sel) as T;
  const all = <T extends HTMLElement = HTMLElement>(sel: string): T[] =>
    Array.from(root.querySelectorAll(sel)) as T[];

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const toggleEl = $('.mh-toggle');
  const modeDesc = $('.mh-mode-desc');
  const heroNum = $('.mh-hero-num');
  const heroStay = $('.mh-hero-stay');
  const heroWhy = $('.mh-hero-why');
  const boxes = all('.mh-box');
  const statusEl = $('.mh-status');
  const actionsEl = $('.mh-actions');
  const counterEl = $('.mh-counter');

  const simBtn = $<HTMLButtonElement>('.mh-sim-btn');
  const simCounter = $('.mh-sim-counter');
  const miniCells = all('.mh-mini-cell');
  const simSwitch = $('[data-stat="switch"]');
  const simStay = $('[data-stat="stay"]');
  const simNote = $('.mh-sim-note');

  // ---- состояние ----
  let mode: Mode = 'knows';
  let money = -1;
  let pick = -1;
  let opened = -1;
  let phase: Phase = 'pick';
  let nStarted = 0;
  let nSpoiled = 0;
  const tally = { swW: 0, swT: 0, stW: 0, stT: 0 };
  let simRunning = false;
  let simIv: number | null = null;

  // ---- тумблер ----
  function renderToggle(): void {
    toggleEl.innerHTML = '';
    const opts: ReadonlyArray<readonly [Mode, string]> = [
      ['knows', 'Знает, где деньги'],
      ['random', 'Открывает наугад'],
    ];
    for (const [val, labelTxt] of opts) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mh-toggle-btn' + (mode === val ? ' is-on' : '');
      b.textContent = labelTxt;
      b.addEventListener('click', () => setMode(val));
      toggleEl.appendChild(b);
    }
  }

  function setMode(m: Mode): void {
    // смена режима обрывает бегущий прогон — иначе интервал дописал бы
    // в сброшенные карточки смесь двух режимов
    if (simIv !== null) {
      window.clearInterval(simIv);
      simIv = null;
      simRunning = false;
      simBtn.removeAttribute('disabled');
    }
    mode = m;
    renderToggle();
    modeDesc.textContent =
      m === 'knows'
        ? 'Знает, где деньги. Открывает пустую нарочно — и этим подсказывает, где денег нет.'
        : 'Не знает, где деньги. Открывает любую из двух наугад. Иногда попадает на деньги — тогда раунд не в счёт. Когда попадает на пустую — это просто совпадение.';
    animateHero(m === 'knows' ? 67 : 50, m === 'knows' ? 33 : 50);
    heroWhy.textContent =
      m === 'knows'
        ? 'Он открыл пустую нарочно. Значит, деньги в той, что осталась. Поэтому смена и даёт 2/3.'
        : 'Он открыл пустую случайно. Это ничего не говорит о деньгах. Поэтому менять или нет — без разницы.';
    nStarted = 0;
    nSpoiled = 0;
    tally.swW = tally.swT = tally.stW = tally.stT = 0;
    simSwitch.textContent = '—';
    simStay.textContent = '—';
    simNote.textContent = '';
    simCounter.textContent = 'игра — / 1000';
    flashMini();
    newRound();
  }

  // ---- едущее герой-число ----
  let heroAnim: number | null = null;
  function animateHero(tSw: number, tSt: number): void {
    if (reduceMotion) {
      heroNum.textContent = tSw + '%';
      heroStay.textContent = 'останешься — ' + tSt + '%';
      return;
    }
    if (heroAnim !== null) window.clearInterval(heroAnim);
    const curSw = parseInt(heroNum.textContent || '67', 10) || 67;
    const matched = (heroStay.textContent || '').match(/\d+/);
    const curSt = matched ? parseInt(matched[0], 10) : 33;
    const steps = 18;
    let i = 0;
    heroAnim = window.setInterval(() => {
      i++;
      heroNum.textContent = Math.round(curSw + ((tSw - curSw) * i) / steps) + '%';
      heroStay.textContent = 'останешься — ' + Math.round(curSt + ((tSt - curSt) * i) / steps) + '%';
      if (i >= steps) {
        if (heroAnim !== null) window.clearInterval(heroAnim);
        heroAnim = null;
        heroNum.textContent = tSw + '%';
        heroStay.textContent = 'останешься — ' + tSt + '%';
      }
    }, 26);
  }

  // ---- игровой цикл ----
  function render(): void {
    const reveal = phase === 'result' || phase === 'spoiled';
    for (let i = 0; i < 3; i++) {
      const isPick = i === pick;
      const isOpen = i === opened;
      const isMoney = i === money;
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
      if (isPick) box.classList.add('is-picked');
      if (phase === 'pick') box.classList.add('is-clickable');
      icon.className = 'mh-box-icon ti ' + iconName;
      label.textContent = labelText;
      tag.textContent = isPick ? 'твой выбор' : '';
    }
    setActions();
    setStatus();
    renderCounter();
  }

  function setStatus(): void {
    if (phase === 'pick') {
      statusEl.textContent =
        'Деньги в одной из трёх. Выбери шкатулку — Якубович откроет одну из оставшихся.';
    } else if (phase === 'decide') {
      statusEl.innerHTML =
        'Якубович открыл пустую шкатулку ' + (opened + 1) + '. Меняешь на закрытую или остаёшься?';
    } else if (phase === 'spoiled') {
      statusEl.innerHTML =
        '<span class="is-lose">Раунд не в счёт.</span> Якубович наугад открыл шкатулку ' +
        (opened + 1) +
        ' — а там деньги. Он же не знал. Менять нечего.';
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
    if (phase === 'decide') {
      addBtn('Поменять шкатулку', () => decide('switch'), true);
      addBtn('Остаться при своей', () => decide('stay'), false);
    } else if (phase === 'result' || phase === 'spoiled') {
      addBtn('Ещё раз', newRound, false);
    }
  }

  function choose(i: number): void {
    if (phase !== 'pick') return;
    pick = i;
    opened = hostOpen(pick, money, mode);
    nStarted++;
    if (mode === 'random' && opened === money) {
      phase = 'spoiled';
      nSpoiled++;
    } else {
      phase = 'decide';
    }
    render();
  }

  function decide(action: Action): void {
    if (phase !== 'decide') return;
    const sw = other(pick, opened);
    const fin = action === 'switch' ? sw : pick;
    const win = fin === money;
    if (action === 'switch') {
      tally.swT++;
      if (win) tally.swW++;
    } else {
      tally.stT++;
      if (win) tally.stW++;
    }
    phase = 'result';
    render();
    statusEl.innerHTML = win
      ? '<span class="is-win">Выигрыш.</span> ' +
        (action === 'switch' ? 'Сменил — деньги твои.' : 'Остался — повезло.')
      : '<span class="is-lose">Мимо.</span> Деньги были в шкатулке ' + (money + 1) + '.';
  }

  function renderCounter(): void {
    if (nStarted === 0) {
      counterEl.textContent = '';
      return;
    }
    if (mode === 'random') {
      counterEl.textContent =
        'сыграно: ' + nStarted + '  ·  Якубович наткнулся на деньги: ' + nSpoiled;
    } else {
      const parts: string[] = [];
      if (tally.swT) parts.push('менял ' + tally.swW + '/' + tally.swT);
      if (tally.stT) parts.push('оставался ' + tally.stW + '/' + tally.stT);
      counterEl.textContent = parts.length ? 'вручную: ' + parts.join('  ·  ') : '';
    }
  }

  function newRound(): void {
    money = rnd(3);
    pick = -1;
    opened = -1;
    phase = 'pick';
    render();
  }

  // ---- мини-шкатулки ----
  function flashMini(): void {
    const p = rnd(3);
    const mny = rnd(3);
    const o = hostOpen(p, mny, mode);
    const spoil = mode === 'random' && o === mny;
    for (let i = 0; i < 3; i++) {
      const cell = miniCells[i];
      const icon = cell.querySelector<HTMLElement>('i')!;
      cell.className = 'mh-mini-cell';
      let ic = 'ti-box';
      if (o === i && spoil) {
        cell.classList.add('is-spoil');
        ic = 'ti-coins';
      } else if (o === i) {
        cell.classList.add('is-open');
        ic = 'ti-square-x';
      }
      if (p === i) cell.classList.add('is-pick');
      icon.className = 'ti ' + ic;
    }
  }

  // ---- прогон 1000 в текущем режиме ----
  simBtn.addEventListener('click', () => {
    if (simRunning) return;
    simRunning = true;
    const total = 1000;
    const per = 25;
    let done = 0;
    let swW = 0;
    let swT = 0;
    let stW = 0;
    let stT = 0;
    let spoiled = 0;
    simBtn.setAttribute('disabled', '');
    simNote.textContent = '';

    const step = (count: number): void => {
      for (let n = 0; n < count; n++, done++) {
        const mny = rnd(3);
        const p = rnd(3);
        const o = hostOpen(p, mny, mode);
        if (mode === 'random' && o === mny) {
          spoiled++;
          continue;
        }
        const sw = other(p, o);
        if (sw === mny) swW++;
        swT++;
        if (p === mny) stW++;
        stT++;
      }
      flashMini();
      simCounter.textContent = 'игра ' + done + ' / ' + total;
      simSwitch.textContent = swT ? Math.round((100 * swW) / swT) + '%' : '—';
      simStay.textContent = stT ? Math.round((100 * stW) / stT) + '%' : '—';
    };

    const finish = (): void => {
      simRunning = false;
      simBtn.removeAttribute('disabled');
      simNote.textContent =
        mode === 'random'
          ? 'Из 1000 игр Якубович сам наткнулся на деньги в ' +
            spoiled +
            ' — они вылетели. В остальных смена и не-смена равны.'
          : 'Все 1000 игр в счёт. Смена выигрывает вдвое чаще.';
    };

    if (reduceMotion) {
      step(total);
      finish();
      return;
    }
    simIv = window.setInterval(() => {
      step(Math.min(per, total - done));
      if (done >= total) {
        if (simIv !== null) window.clearInterval(simIv);
        simIv = null;
        finish();
      }
    }, 38);
  });

  // ---- старт ----
  boxes.forEach((box, i) => box.addEventListener('click', () => choose(i)));
  setMode('knows');
}
