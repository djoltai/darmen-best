// exam-p-monty-hall — точка входа. Инициализирует оба экрана.
// Каждый init скоупится на свою секцию ([data-screen]) и тихо выходит,
// если секции нет, поэтому порядок и взаимное отсутствие безопасны.

import { initScreen1 } from './screen1';
import { initScreen2 } from './screen2';

function init(): void {
  initScreen1();
  initScreen2();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
