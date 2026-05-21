# Handoff в Claude Code: design-system (первый проход)

Этот файл — мост между Cowork-сессией и Claude Code. После финализации скопировать в:
`C:\Users\darme\darmen-best\docs\handoffs\2026-05-18-design-system-handoff.md`

---

## Лаб: design-system

**Дата handoff'а:** 2026-05-18
**Тип артефакта:** Инфраструктура сайта (не lab-портал). Адаптированный шаблон `_template/handoff.md`.
**Источники в Cowork-проекте:**

- `projects/labs/design-system/idea.md` — замысел, тезис, принципы, для кого.
- `projects/labs/design-system/skill/` — bundle из Claude Design (полный design-system kit).
- `projects/labs/design-system/skill/README.md` — полная спецификация: тезис, голос, цвета, типографика, плотностной рычаг, motion, иконки.
- `projects/labs/design-system/skill/SKILL.md` — манифест-инструкция для тебя + conflict-handling блок.
- `projects/labs/design-system/skill/colors_and_type.css` — токены как CSS-переменные.
- `projects/labs/design-system/skill/ui_kits/website/` — мокапы главной (`HomeEditorial.jsx`, `LabCard.jsx`) и лаба (`LabVolDrag.jsx`), плюс `index.html` и `lab.html` для рендера.
- `projects/labs/design-system/skill/preview/` — token specimen cards (для визуальной сверки в браузере).

---

## Цель сессии — что делаем и что НЕ делаем

**Делаем.** Кладём фундамент дизайн-системы в репо: подключаем три семейства шрифтов, разворачиваем `colors_and_type.css` как `src/styles/design-system.css`, импортируем его в `global.css`. После этого — переписываем главную (`src/pages/index.astro`) под мокап `HomeEditorial.jsx` + `LabCard.jsx`. Получаем первый видимый результат на сайте: главная на новой системе.

**НЕ делаем в этой сессии.**

- Не трогаем `src/pages/lab/frm-var.astro` и `src/styles/lab/frm-vol-drag.css`. По README дизайн-системы лаб про монетку — канон, всё подгоняется под него. Физическая миграция лаба с Inter на IBM Plex Sans и с `--v3-*`-токенов на общесистемные `--bg`/`--ink`/`--teal` идёт отдельной сессией позже (см. Open questions ниже).
- Не пишем production-логику новых лабов, не трогаем `scripts/`, не вводим новые зависимости кроме шрифтов.
- Не публикуем pre-build пост — он ждёт момента, когда главная задеплоится на darmen.best (об этом — обратный handoff).

---

## Порядок чтения перед стартом (для тебя, Claude Code)

1. `CLAUDE.md` в корне репо — устройство проекта, workflow, карпати-принципы.
2. `ROADMAP.md` — что в работе, что дальше.
3. Последние 1–2 записи `JOURNAL.md` — что было сделано в прошлую сессию.
4. Этот handoff целиком.
5. Skill-папку в порядке: `SKILL.md` → `README.md` → `colors_and_type.css` → `ui_kits/website/index.html` + `HomeEditorial.jsx` + `LabCard.jsx` (это рендер главной) → `ui_kits/website/lab.html` + `LabVolDrag.jsx` (контекст: как тот же словарь садится на лаб; в этой сессии не используется, но даёт калибровку).
6. Skill-папка лежит вне репо, в `C:\Users\darme\OneDrive\Cowork\darmen-best\projects\labs\design-system\skill\`. Это input, не зависимость. Не копируй её целиком в репо — копируй только то, что нужно: `colors_and_type.css` и `assets/favicon.svg` (если он отличается от текущего).

---

## Главная развилка, на которую согласие уже дано

Лаб остаётся на Inter и `--v3-*` токенах в этой сессии. README дизайн-системы и SKILL.md задают IBM Plex Sans / `--teal` / `--coral` / `--gold` как канон. Это противоречие. Согласованное решение: канон визуальный (палитра, тезис, ритм), а физическая миграция шрифтов и переименование токенов — следующей сессией через conflict-handling блок из SKILL.md.

То есть в этой сессии у нас на сайте две системы одновременно:

- главная (`/`) на IBM Plex Sans + `--bg`/`--ink`/`--teal` из новой `design-system.css`;
- лаб (`/lab/frm-var`) на Inter + `--v3-*` из своего `lab-frm-vol-drag.css`.

Это нормальный transient state. Не пытайся «причесать» лаб попутно.

---

## Где что лежит в репо после этой сессии

```
src/
├── pages/
│   ├── index.astro              ← ПЕРЕПИСАН под HomeEditorial.jsx + LabCard.jsx
│   └── lab/
│       └── frm-var.astro        ← НЕ ТРОГАТЬ
├── scripts/                     ← НЕ ТРОГАТЬ
├── components/                  ← НОВОЕ: Wordmark.astro, LabCard.astro, HomeRow.astro
└── styles/
    ├── design-system.css        ← НОВОЕ: копия colors_and_type.css из skill
    ├── global.css               ← ОБНОВЛЁН: импортирует design-system.css
    └── lab/
        └── frm-vol-drag.css     ← НЕ ТРОГАТЬ

public/
├── favicon.svg                  ← ПРОВЕРИТЬ: совпадает ли с skill/assets/favicon.svg
└── og.png                       ← НЕ ТРОГАТЬ

package.json                     ← ОБНОВЛЁН: +@fontsource/ibm-plex-sans, +@fontsource/jetbrains-mono, +@fontsource/eb-garamond
```

---

## Разбивка по коммитам

Три атомарных коммита. Между коммитами — `npm run build` без ошибок и просмотр сайта в dev-режиме.

### Commit 1 — foundation: fonts + tokens

**Что делаем.**

1. `npm install @fontsource/ibm-plex-sans @fontsource/jetbrains-mono @fontsource/eb-garamond` — три новых семейства.
2. Создать `src/styles/design-system.css` — содержимое из `projects/labs/design-system/skill/colors_and_type.css` целиком, БЕЗ строки `@import url('https://fonts.googleapis.com/css2?...')` сверху. Шрифты подключаем через `@fontsource` (см. ниже), не через Google CDN. Это правило репо: production-шрифты через @fontsource, мокапы и превью — через CDN.
3. В `src/styles/global.css`:
   - В начало добавить `@import './design-system.css';`
   - Tailwind-импорт (`@import "tailwindcss";`) — пока ОСТАВИТЬ. Удалим в Commit 2, когда главная перестанет использовать Tailwind classes.
   - `@theme { --font-sans: 'Inter', sans-serif; }` — удалить (заменяется на design-system.css).
   - Существующие `.lab-door[data-portal=""]` правила — оставить, их использует главная для лаб-дверей в секции «Сертификации». Возможно перенесём в специфичный файл позже, в этой сессии не трогаем.
4. В `src/pages/index.astro` шапке заменить:
   - `import '@fontsource/inter/400.css';` → `import '@fontsource/ibm-plex-sans/400.css';`
   - `import '@fontsource/inter/700.css';` → `import '@fontsource/ibm-plex-sans/500.css';` (heading weight 500, не 700 — это AI-tell)
   - Добавить: `import '@fontsource/ibm-plex-sans/600.css';` (только для D в wordmark)
   - Добавить: `import '@fontsource/jetbrains-mono/400.css';` `import '@fontsource/jetbrains-mono/500.css';`
   - Добавить: `import '@fontsource/eb-garamond/500.css';` `import '@fontsource/eb-garamond/600.css';`
5. `npm run build`, прогон в dev. Главная сейчас будет выглядеть слегка иначе (шрифт сменился на IBM Plex Sans, но Tailwind утилиты ещё работают). Это промежуточное состояние, оно ок.

**Коммит:** `chore(design-system): scaffold tokens and font families`

### Commit 2 — homepage rewrite

**Что делаем.** Полностью переписать `src/pages/index.astro` по `HomeEditorial.jsx` + `LabCard.jsx`. Мокапы в JSX используют inline styles — это превью, не deploy-ready код. Портируем в Astro-компоненты с CSS-классами под конвенцию репо.

**Структура новой главной (точно по HomeEditorial):**

```
<header> Wordmark (D засечкой teal + armen.best sans 500)
<h1>     H1 anchor — fixed copy, не редактируется
<p>      subtitle (разговорный, ~120 знаков)
<div>    contact row: mailto + (опционально /cv link, см. open questions)
<section>lab feature card (LabCard, см. ниже)
<section>«что строю сейчас» — три HomeRow: emissions.kz, Qazyna AI, QVision
<footer> LinkedIn link + GitHub link (см. open questions) + © 2026 + P.S. курсивом
```

**H1 anchor (fixed copy, не редактируется):**

> «Строю цифровые системы для государства, промышленности и школ Казахстана.»

Размер `var(--t-hero)` (clamp 40–64px), вес 500, letter-spacing `var(--track-hero)`, line-height `var(--lh-tight)`. Сейчас на сайте этот текст уже стоит — копия совпадает, только обёртка меняется.

**Subtitle (заменить текущий «Product & Transformation Leader · 10+ запущенных IT-продуктов · Команды до 70 человек»):**

> «10+ продуктов за карьеру. Три компании сейчас. B2G ERP в семи областях Казахстана, команды до 70 человек на пике. База в Астане.»

Это разговорный регистр, не tagline. Из HomeEditorial.jsx, проверено в мокапе.

**LabCard (новый компонент).** Карточка лаба ПЕРЕД секцией «что строю сейчас» — это центральный элемент главной. Состоит из двух колонок 1:1, gap 40px, padding 32px, фон `var(--bg-elev)`, без скругления, без тени.

- Левая колонка — inline SVG-чартер с детерминированными траекториями (12 seeds, log-scale Y, серые ветки decay, teal-ветка outlier). Полная реализация — в `LabCard.jsx` skill-bundle'а. Перенести SVG как Astro inline-компонент, оставить ту же seed-логику (важно: graph должен быть byte-stable между сборками, чтобы Lighthouse не шумел).
- Правая колонка — tag «FRM · май 2026», title «Volatility Drag» (h3, 28px, weight 500, letter-spacing −0.025em), описание из мокапа («Положительное матожидание. Сто бросков. Ноль на руках. Игра в монетку и доля Kelly через интерактивный симулятор.»), CTA «Читать →» (teal, weight 500).
- Карточка целиком — ссылка на `/lab/frm-var`.

**HomeRow (новый компонент).** Строка проекта в секции «что строю сейчас»: kicker (mono, 13px, ink-muted) + title (sans 500, 19px) + body (16px, ink-muted, max 540px) + опциональный meta (mono, 13px, ink-faint). Разделитель — `border-bottom: 0.5px solid var(--ink-whisper)`. Контент — из HomeEditorial.jsx.

**Wordmark (новый компонент).** Один inline-блок: `D` (EB Garamond 600, цвет `var(--teal)`, letter-spacing −0.02em) + `armen.best` (IBM Plex Sans 500, ink). Это logotype в шапке. Favicon — отдельный SVG в `public/`, см. open questions.

**Что выкидываем из текущей главной:**

- Секцию «Три компании» в текущем виде — заменяется секцией «что строю сейчас» (HomeRow × 3).
- Секцию «Избранные кейсы» — НЕТ в новой главной. Кейсы переезжают на будущую `/cv` или на `/about`, не на главную. Если нужно сохранить контент — закомментировать в коде с пометкой «to /cv» и убрать из render'а.
- Секции «Образование» и «Сертификации» — НЕТ на новой главной. Та же логика. Lab-двери `data-portal="frm-var"` из секции «Сертификации» становятся LabCard'ом в более явном виде.
- Секцию «О себе» — НЕТ. Контент сжимается до subtitle + footer P.S. Полная версия — на будущей `/cv` или `/about`.
- Секцию «Контакты» в текущем виде — заменяется минималистичным footer'ом.

После этой операции главная становится резко короче — это сознательно. По мокапу — одна вертикальная прокрутка на десктопе.

**Tailwind cleanup.** После того как новая главная не использует Tailwind utility classes, прогнать `rg -l '@apply\|class="[^"]*\b(bg-|text-|border-|flex|grid|p-|m-)\b'` по `src/`. Если только `lab/frm-var.astro` использует Tailwind (а он не должен — у него свой CSS), убрать `@import "tailwindcss";` из `global.css` и `tailwindcss` из `package.json`. Если что-то ещё использует — оставить, не насильно мигрировать.

**Коммит:** `feat(home): rewrite under design system`

### Commit 3 (опциональный, если Commit 2 прошёл чисто) — Tailwind removal

Если после Commit 2 в коде нет Tailwind utility classes — удаляем зависимость. Если есть — фиксируем в Open questions, не насилуем.

**Коммит:** `chore: drop tailwind dependency` (если применимо)

---

## Acceptance criteria

### Build / runtime

1. `npm run build` проходит без errors и без warnings про unresolved imports или missing modules.
2. `npm run dev` запускается, открывается на localhost.
3. Vercel preview-deploy (или текущий пайплайн) проходит без ошибок.

### `/lab/frm-var` — регрессии

4. Страница лаба визуально и функционально идентична до и после изменений. Скриншот четырёх экранов до/после — совпадение pixel-perfect внутри основных блоков (mono-шрифт там Inter, не должен смениться; чарт-кривые те же).
5. KaTeX-формулы в шторках рендерятся.
6. Anchor-scroll по экранам работает.

### Главная — токены и шрифты

7. DevTools → computed style на h1: `font-family` начинается с `"IBM Plex Sans"`, `font-weight: 500`, `font-size` в диапазоне 40–64px (clamp).
8. DevTools → computed style на body: `background-color: rgb(250, 246, 232)` (`#FAF6E8`), `color: rgb(26, 26, 26)`.
9. Wordmark: `D` рендерится в EB Garamond 600 и цветом `#07434B`, остальное — IBM Plex Sans 500 чёрным.
10. Mono-числа в kicker и в LabCard chart-labels — JetBrains Mono.

### Главная — структура

11. Порядок секций сверху вниз: Wordmark → H1 → subtitle → contact row → LabCard → «что строю сейчас» (3 строки) → footer.
12. H1 точный: «Строю цифровые системы для государства, промышленности и школ Казахстана.» Никаких параграфов.
13. LabCard кликается целиком, ведёт на `/lab/frm-var`. Hover-состояние: фон чуть глубже (`var(--bg-elev)` → можно ослабить opacity или сменить).
14. Три карточки «что строю сейчас»: emissions.kz (внешняя ссылка), Qazyna AI (#, заглушка), QVision (#, заглушка). Тексты — из мокапа HomeEditorial.jsx.
15. Footer: LinkedIn link, © 2026, P.S. курсивом про .best (текст из мокапа). GitHub и /cv — см. open questions.

### Главная — голос и AI-маркеры

16. Эмодзи на странице ноль. Везде.
17. Heading-вес — 500, не 700. Никаких `font-weight: bold` или `700` в CSS.
18. Никаких градиентов, теней, скруглений >3px.
19. Em-dash в копии — только там, где запятая не работает. Минус — `−` (U+2212), не дефис.

### Mobile

20. На viewport 375×812 (iPhone SE): H1 переносится без horizontal scroll, padding боковой ≥16px. LabCard схлопывается в одну колонку (chart сверху, copy снизу). HomeRow — kicker над title (вертикальная компоновка).
21. На viewport 1440×900: padding боковой 96px, max-width контента ~720px.

### A11y

22. Контраст ink (`#1A1A1A`) на bg (`#FAF6E8`) проходит WCAG AA для body text (≥4.5:1). Контраст teal на bg для links — тоже AA.
23. Tab-order: Wordmark (skip) → H1 (нефокусируемый) → mailto → LabCard → emissions.kz → Qazyna AI (если интерактивный) → QVision (если интерактивный) → footer-links.
24. `prefers-reduced-motion: reduce` — анимации обнуляются (для главной их пока почти нет, кроме hover-transition; проверить).

---

## Math / formulas

Математика на главной отсутствует. LabCard SVG-чарт детерминирован, формул не считает (только seeded random). Контрольные значения для теста чарта — см. ниже.

---

## Required tests

- `src/components/LabCard.test.ts` (vitest) — юнит-тест на seeded random в SVG-чарте. Для seed=10 первые три точки траектории должны быть `(0, 1)`, `(1, 1.5)`, `(2, 0.9)` (orёл-решка, или whatever реальная последовательность даёт). Цель — зафиксировать deterministic output, чтобы будущие правки seed-логики ловились тестом. Если не получается прибить точное значение — fallback: проверить что для одного и того же seed функция возвращает идентичный массив (snapshot test).
- Acceptance-чеклист выше прогоняется глазами или Lighthouse'ом, отдельных автотестов не пишем.

---

## Edge cases / out of scope

**Out of scope этой сессии:**

- Tёмный режим главной — system requires light only on home (см. README §«Тёмный режим»). Не добавлять.
- Плотностной рычаг `data-density="dense"` на главной — не нужен, главная по умолчанию calm. Атрибут не выставляем.
- `/cv`, `/about`, `/lab` (индекс лабов) — отдельные страницы, не делаем в этой сессии. Footer ссылка на `/cv` (если оставляем) ведёт на 404, это сознательно.
- Миграция `/lab/frm-var` на IBM Plex Sans и `--bg`/`--ink`/`--teal` — следующая сессия.
- OG-картинка `og.png` — текущая остаётся. Новая дизайн-система пока её не пересобирает.

**Edge cases:**

- Длинная строка H1 на узком экране — H1 должен переноситься естественно по словам, без word-break: break-all. Если визуально некрасиво — добавить `<br>` в осмысленных местах (`Строю цифровые системы<br>для государства,<br>промышленности и школ Казахстана.` — три строки, как в мокапе).
- LabCard SVG на retina: использовать `viewBox` + responsive width, без фиксированных px-размеров для контейнера.

---

## Open questions для Claude Code

Ответ на каждый — нужен ДО старта Commit 2, не блокирующее для Commit 1.

1. **`/cv` link в contact row.** Удалить или оставить как `href="#"` с надписью «Полный CV — скоро»? Текущий ответ Дармена: убрать в этой сессии, добавим когда `/cv` появится.
2. **GitHub link в footer.** В мокапе HomeEditorial.jsx есть `github.com/djoltai`. Проверить — этот профиль публично существует и активен? Если нет — убрать, в footer'е остаются LinkedIn + © + P.S.
3. **Существующие `lab-door` data-portal атрибуты.** Раньше использовались в секциях «Образование» и «Сертификации» — для подсветки лаб-дверей. Эти секции уходят с главной. CSS-правила `.lab-door[data-portal=""]` в `global.css` сейчас становятся неиспользуемыми. Удалить из global.css или оставить на случай если они понадобятся на `/cv`? Предлагаю: оставить, они занимают 7 строк и описывают системное поведение.
4. **`favicon.svg`.** Сравнить `public/favicon.svg` (текущий) и `skill/assets/favicon.svg` (новый, D засечкой teal). Если отличаются — заменить текущий новым. Если идентичны — ничего не делаем.
5. **Mobile breakpoints для LabCard.** В мокапе LabCard всегда two-column. На мобильном (≤640px) — переключаемся на single-column? Предлагаю: да, через `grid-template-columns: 1fr` на breakpoint 640px. Подтвердить.
6. **Tailwind dependency.** После Commit 2 — действительно ли можно удалить? Прогнать grep, ответить в обратном handoff'е, не пытаться удалить если есть хоть одно использование.

---

## После завершения

Claude Code:

1. Прибивает финальный статус сюда же — в блок Resolved ниже.
2. Пишет запись в `JOURNAL.md` репо: что сделано, что узнали, какие коммиты, ссылка на этот handoff.
3. Обновляет `ROADMAP.md` если что-то закрыто.
4. Финальный handoff обратно в Cowork: краткий summary (что задеплоено, URL'ы, скриншоты главной 1440 и 375, ответы на open questions, что осталось на следующую сессию — как минимум миграция лаба на новые шрифты/токены). Этот summary я перенесу руками в Cowork и обновлю `next_up.md` + помогу собрать lessons-пост если выйдет содержательная метарефлексия.

---

## Resolved

**Сессия Claude Code: 2026-05-18.** Все три плановых коммита прошли,
build чистый, главная задеплоена локально на dev (`http://localhost:4321/`),
визуально проверена на 1440 и 375. Лаб `/lab/frm-var` без регрессии.

### Коммиты

- `fbb52ee` — `chore(design-system): scaffold tokens and font families`
- `87bec69` — `feat(home): rewrite under design system`
- `b0d5bfa` — `chore: drop tailwind dependency`

В отдельном коммите session-end docs появятся `CLAUDE.md`, `ROADMAP.md`,
`JOURNAL.md` в корне репо — закрыли инструментальную дыру (этих файлов
не существовало; следующая сессия не упрётся в неё).

### Ответы на open questions

1. **`/cv` link в contact row** — убран. Добавится, когда `/cv` появится.
2. **GitHub link в footer** — убран. В footer'е остались LinkedIn + © + P.S.
   Профиль `github.com/djoltai` существует, но пока пустой; добавим позже.
3. **`.lab-door[data-portal=""]` правила в `global.css`** — оставлены как
   есть. После переписывания главной они стали неиспользуемыми
   (~7 строк). Решение об удалении явно отложено до следующей сессии —
   могут пригодиться на `/cv` или `/about`.
4. **`favicon.svg`** — не трогали (вариант **a**). При сравнении нашли
   расхождение между описанием в SKILL.md (`D` засечкой изумрудная,
   32×32) и фактическим SVG в `skill/assets/favicon.svg` — это та же
   стилизованная гора, что и в `public/favicon.svg`, с идентичными
   path-координатами. Скилловый ещё и без fill-стилей (отрисуется
   невидимо), то есть текущий `public/favicon.svg` лучше из двух.
   Настоящий `D` засечкой teal favicon **не сделан**, ждёт отдельной
   задачи. Записано в ROADMAP репо.
5. **Mobile breakpoint для LabCard** — вариант **a** подтверждён. При
   `≤640px` LabCard схлопывается в одну колонку (chart сверху, copy
   снизу). Реализовано в `src/components/LabCard.astro`.
6. **Vitest для seeded SVG-теста** — вариант **b**. Правило «no new
   deps кроме шрифтов» победило. SVG-генератор детерминирован по
   конструкции (`Math.sin(seed)`-генератор без `Math.random`),
   траектории считаются в Astro frontmatter на build time → static path
   data в HTML, байт-стабильно между сборками. В коде `LabCard.astro`
   стоит короткий комментарий, в `JOURNAL.md` и `ROADMAP.md` записан
   tech-debt: когда vitest появится в репо — прикрутить snapshot-тест.

### Доп. вопросы вне handoff'а — итоги

- **v1 vs v2 лаба.** Подтверждено: LabCard ведёт на `/lab/frm-var`
  (v1, Volatility Drag v3, текущая активная версия). `/lab/frm-var-v2`
  — архив scrollytelling, под `noindex`, в этой сессии не тронут.
- **Tailwind cleanup.** Прогнал grep по `src/`: ни одной Tailwind
  utility-class, ни одного `@apply`. Лабы пользуются собственными CSS.
  Дроп прошёл чисто — Commit 3 (`b0d5bfa`).

### Отклонения от handoff-плана

- **H1 размер на главной.** Handoff говорил `var(--t-hero)`
  (`clamp(40px, 5.8vw, 64px)`). На 1440 это даёт 64px, в 720px колонке
  H1 переносится на 5 строк — ломает редакторский ритм. Снизил до
  `clamp(36px, 4vw, 52px)` — совпадает с мокаповским `fontSize: 52`
  в `HomeEditorial.jsx`. Token `--t-hero` не тронут, остаётся для
  hero-цифр в лабах. Дополнительно, по edge-case секции handoff'а
  («добавить `<br>` в осмысленных местах»), в копии H1 теперь три
  контролируемых `<br>` вместо одного, последний сегмент
  «промышленности и школ Казахстана.» на десктопе сам переносится на
  две строки. Всё внутри 40-64 acceptance range.
- **CSS-стратегия главной.** Inline styles из мокаповского JSX
  портированы в Astro component-scoped `<style>` блоки для трёх новых
  компонентов и в `<style>` блок страницы для page-level layout.
  Отдельный `src/styles/home.css` не создавался — объём CSS не
  обосновал.
- **Footer «Полная история ↗»** ссылка из текущей главной (на пост в
  LinkedIn про .best vs .bestest) не перенесена в новый footer.
  Мокап P.S. короткий, без неё. Если нужна — добавится отдельным
  коммитом.

### Что осталось на следующую сессию (commitable)

- Миграция `/lab/frm-var` и `/lab/frm-var-v2` на IBM Plex Sans и
  общесистемные `--bg`/`--ink`/`--teal` (через conflict-handling
  блок SKILL.md). Сейчас лабы остаются на Inter и `--v3-*` токенах.
- Решение по `.lab-door[data-portal=""]` правилам.
- Настоящий favicon `D` засечкой teal под спецификацию SKILL.md.
- Vitest + snapshot-тест для `LabCard.astro` SVG.

### Технически возможные скриншоты

Сделаны через Playwright MCP, лежат в `C:\Users\darme\OneDrive\Cowork\darmen-best\`
(default playwright-mcp output, не закоммичено):

- `commit2-home-1440-v3.png` — главная на 1440
- `commit2-home-375-v3.png` — главная на 375
- `commit2-lab-1440-clean.png` — лаб на 1440 (regression check)

При деплое на darmen.best сделать pre-build пост — после, не до
(см. handoff line 33: «pre-build пост ждёт момента, когда главная
задеплоится»).
