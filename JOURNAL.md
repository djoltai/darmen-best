# Journal

Append-only журнал значимых сессий. Новые записи сверху.

---

## 2026-05-18 — design-system: первый проход

**Что сделано.**

- Подложен фундамент дизайн-системы: `src/styles/design-system.css` —
  полная копия токенов из `projects/labs/design-system/skill/colors_and_type.css`
  (Cowork bundle), без строки `@import` с Google Fonts CDN.
  Production-шрифты загружаются через `@fontsource`.
- Установлены три семейства: `@fontsource/ibm-plex-sans` (400/500/600),
  `@fontsource/jetbrains-mono` (400/500), `@fontsource/eb-garamond`
  (500/600). Inter из главной убран; лабы импортируют Inter сами,
  не сломались.
- `src/styles/global.css` упрощён до `@import './design-system.css'` +
  `.lab-door[data-portal=""]` блок. `@theme { --font-sans: 'Inter' }`
  убран — fonts теперь живут в design-system.css.
- Главная (`src/pages/index.astro`) полностью переписана под
  `HomeEditorial.jsx` + `LabCard.jsx` мокапы из skill bundle'а:
  wordmark → H1 anchor → conversational subtitle → mailto → LabCard →
  «что строю сейчас» (HomeRow × 3: emissions.kz, Qazyna AI, QVision) →
  footer (LinkedIn + © + P.S. курсивом). OG-метатеги в `<head>`
  сохранены без изменений.
- Созданы три Astro-компонента в `src/components/`: `Wordmark.astro`,
  `LabCard.astro`, `HomeRow.astro`. SVG-чарт в `LabCard.astro`
  детерминирован по конструкции (`Math.sin(seed)` без `Math.random`),
  траектории считаются в frontmatter на build time.
- Tailwind полностью удалён из репо (`Commit 3`): после переписывания
  главной grep по `src/` не нашёл ни одной утилиты Tailwind и ни
  одного `@apply`. Лабы пользуются собственными CSS-файлами.
- H1 на главной использует `clamp(36px, 4vw, 52px)` (а не token
  `--t-hero` с верхом 64px) — это совпадает с мокаповскими 52px и
  даёт 3-4 строки в 720px колонке на десктопе, а не 5. `--t-hero`
  остаётся живым токеном для hero-цифр в лабах.

**Что узнали / решения.**

- **Cascade Layers Tailwind v4 помогли.** Tailwind v4 кладёт утилиты в
  `@layer utilities`; element-rules из `design-system.css` остаются
  unlayered и выигрывают по правилам каскада. Поэтому даже на этапе
  Commit 1, когда body всё ещё имел `class="bg-white font-sans"`,
  computed font-family на h1 и body уже был IBM Plex Sans. Я ожидал
  обратного и заранее предупредил, что Commit 1 будет «невидимым» —
  оказалось видимым.
- **Favicon-расхождение.** `skill/assets/favicon.svg` в bundle'е и
  `public/favicon.svg` в репо — оба отрисовывают стилизованную гору
  (legacy Astro logo) с идентичными path-координатами, не «D засечкой
  teal», как описывает SKILL.md и README дизайн-системы. Текущий
  favicon в `public/` хотя бы рендерится (есть inline-style с
  `prefers-color-scheme`); скилловый — `fill="none"` без стилей,
  невидимый. Не трогали; правильный D-засечкой-teal надо сделать
  отдельной задачей.
- **`<astro-dev-toolbar>`.** В dev-режиме Astro вставляет floating-pill
  внизу страницы. На fullPage Playwright скриншотах он отрисовывался
  поверх LabCard'а и я сначала принял его за CSS-баг. Гасил через
  `display: none` инлайн для скриншотов. В production не появляется.

**Коммиты.**

- `fbb52ee` chore(design-system): scaffold tokens and font families
- `87bec69` feat(home): rewrite under design system
- `b0d5bfa` chore: drop tailwind dependency

**Tech-debt, зафиксированный этой сессией.**

- Vitest не установлен. Handoff требовал юнит-тест на детерминизм
  seed-функции в `LabCard.astro`, но handoff же запрещал новые
  dep'ы кроме шрифтов. Выбрали «правило сильнее теста»: SVG
  детерминирован по конструкции, тест отложен до момента, когда
  vitest появится в репо по другому поводу. См. комментарий в
  `src/components/LabCard.astro` и пункт в ROADMAP.
- `.lab-door[data-portal=""]` правила в `src/styles/global.css` стали
  неиспользуемыми после переписывания главной. Не удалены — решение
  отложено до следующей сессии (могут пригодиться на `/cv`/`/about`).
- Правильный D-засечкой-teal favicon не сделан. См. ROADMAP.

**Что отложено явно.**

- Миграция `/lab/frm-var` и `/lab/frm-var-v2` на IBM Plex Sans и
  общесистемные `--bg`/`--ink`/`--teal` — следующая сессия.
- `/cv`, `/about`, `/lab` индекс — отдельные страницы, когда придёт
  очередь.
- Решение по `.lab-door` правилам — следующая сессия.
- Pre-build / launch пост — после деплоя главной на darmen.best
  (через Cowork).

**Handoff.** `docs/handoffs/2026-05-18-design-system-handoff.md`
(существует в основной директории `C:\Users\darme\darmen-best\`,
не закоммичен в этой ветке — папка `docs/` не была tracked, осталось
из исторической причины). Resolved-блок в handoff'е дополнен
финальным статусом этой сессии.
