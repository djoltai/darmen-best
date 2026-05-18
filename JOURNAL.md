# Journal

Append-only журнал значимых сессий. Новые записи сверху.

---

## 2026-05-18 (вечер) — LabCard: чарт под лаб-превью

**Что сделано.**

- Чарт в `src/components/LabCard.astro` переписан с 12-траекторного «пучка»
  (порт из мокапа Cowork) на статическое лаб-превью: SVG-зеркало
  `drawTrajectoryAllIn` из `src/scripts/lab/frm-vol-drag/charts.ts`.
  11 возможных путей (серое облако, opacity 0.10), одна активная
  траектория `seed=173`, `$1` baseline + label слева.
- Та же монетка что в лабе (×1.5/×0.6, p=0.5), всё в frontmatter,
  без `Math.random`, byte-stable. viewBox 320×200, Y log-scale `[10⁻⁴, 10²]`
  (6 декад) — достаточно для all-in lognormal-облака без мёртвых полей.
- Цвет активной — по **зоне**, не по шагу: midpoint сегмента ≥ $1 → teal,
  < $1 → coral. Та же конвенция что в лабовском `charts.ts:127-129`.
- Сюжет seed=173: ~49/100 шагов над $1, max ~$11 в пике, финал $0.005
  (медиана lognormal'и). Длинный teal-кусок слева → длинный coral-спуск
  справа → end-dot coral у дна. «Volatility Drag в одном кадре».
- Деплой по плану: push ветки → Vercel preview success → merge `--no-ff`
  в main → push main → production success на darmen.best.

**Что узнали / решения.**

- **План — ориентир, не догма.** Plan-doc спецификации
  (`claude-md-roadmap-md-gentle-yeti.md`) предлагал «две аналитические
  кривые: gray decay + teal smoothstep climb». Реализовали — на скриншоте
  «непонятно что и о чём». Юзер попросил вместо абстракции взять напрямую
  вид лаба после броска. Решение: смотреть скриншот лаба → понять
  компоненты → портировать их в frontmatter SVG. Пивот через 2 итерации.
- **Цветовая семантика «по шагу» = RG-светофор-эффект.** Сначала окрашивал
  каждый сегмент по направлению шага (win × 1.5 → teal, loss × 0.6 → coral).
  Сегмент ~3px по X → мерцание teal/coral каждые 3 пикселя → визуально
  «генерик финансовый светофор». Переключение на «по зоне» дало длинные
  непрерывные сегменты + семантика «герой в зоне прибыли/убытка»
  информативнее «этот шаг выиграл/проиграл».
- **CSS-vars в SVG резолвятся правильно — это субъективное восприятие.**
  Юзер сказал «цвета не наши». Пиксельная выборка из скриншота показала
  ровно `#07434B` и `#C75B4F` (= `--teal`, `--coral`). Уточнение: жалоба
  была про семантику окраски, не палитру.
- **Один seed с clamping убивает облако.** Seed=111 при N=100 →
  max $16994 → clamp в верхнюю рамку 69 шагов подряд → жирная
  горизонталь у потолка ломала композицию. Алгоритмический отбор seeds
  по критериям (max ≤ 50, баланс зон 25-75/100, разумные zone-flips) —
  быстрый способ найти «зрелищный» путь.

**Workflow заметки.**

- **Headless Chrome для скриншотов** через
  `chrome.exe --headless=new --screenshot=...` — закрывает loop «изменил →
  проверил → согласовали → коммит» без переключения в браузер. Шрифты
  в headless могут не подгрузиться (видны fallback), но геометрия и цвета
  верны. Хорошо работает для localhost, Vercel preview и production URL'ов.
- **Untracked stale `CLAUDE.md`/`JOURNAL.md`/`ROADMAP.md` в primary
  worktree** заблокировали `git merge --no-ff` («would be overwritten»).
  Это те же файлы, которые в JOURNAL предыдущей сессии помечены как
  «papka docs/ не была tracked, осталось из исторической причины» —
  у `.md`-файлов в корне репо аналогичная история. Решение: бэкап в
  `.claude/worktrees/.md-backup-2026-05-18/`, удаление, retry merge.

**Коммиты.**

- `0031b22` feat(home): redraw LabCard chart as lab-preview
- `cb5b0f2` Merge branch 'claude/busy-ardinghelli-3c58d1'

**Tech-debt, зафиксированный этой сессией.**

- Бэкап в `.claude/worktrees/.md-backup-2026-05-18/` хранит старые
  черновики локального `CLAUDE.md`/`JOURNAL.md`/`ROADMAP.md`. Удалить,
  когда уверен что в них нет ничего ценного — это просто следы
  до-tracked-эпохи doc-файлов.
- Vitest всё ещё не установлен. Прошлая сессия отметила это; не
  сдвинулось. Когда появится — прикрутить тест на детерминизм
  `genTraj(seed)` в новом `LabCard.astro` (массивы bg + active
  должны быть byte-stable между билдами).

**Что отложено явно.**

- Миграция `/lab/frm-var` и `/lab/frm-var-v2` на IBM Plex Sans —
  без изменений.
- `.lab-door` правила, favicon D-засечкой-teal — без изменений.

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
