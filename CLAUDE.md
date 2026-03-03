# CLAUDE.md — Инструкции для Claude Code

## Проект
Персональный лендинг Юлии Самариной — AI-ментор, вайбкодер.

## Структура
```
my-landing/
├── index.html      — Весь лендинг (HTML + CSS + JS inline, single-file)
├── plan.md         — План доработок
├── brief.md        — Исходное ТЗ
├── CLAUDE.md       — Этот файл
└── img/
    ├── hero.jpg        — Деловой портрет (секция Hero)
    ├── about.jpg       — Креативное фото (секция About)
    ├── work-tutor.png  — Скриншот: лендинг репетитора
    ├── work-card.png   — Скриншот: визитка ведущего
    ├── work-neuro.png  — Скриншот: лендинг Нейро-Визуал
    └── work-decant.png — Скриншот: Decant Pro
```

## Архитектура
- **Single-file**: всё в одном `index.html` — стили в `<style>`, скрипты в `<script>`
- **Без внешних библиотек**: чистый HTML + CSS + JS
- **Шрифты**: Google Fonts (Space Grotesk + Inter), fallback на system-ui
- **Тема**: тёмная AI-тема, CSS-переменные в `:root`

## Секции index.html (порядок)
1. NAV (фиксированная, гамбургер на мобилке)
2. HERO (фото, заголовок, счётчики с data-target)
3. SERVICES (4 карточки + блок "Кому не подойду")
4. PORTFOLIO (6 кейсов: 4 с картинками, 2 с градиентными плейсхолдерами)
5. PROCESS (5 шагов)
6. ABOUT (текст + фото + bento-сетка)
7. REVIEWS (4 отзыва)
8. GUARANTEE (4 карточки гарантий)
9. FAQ (8 вопросов, аккордеон)
10. CONTACT (инфо + форма)
11. FOOTER

## Telegram-бот (форма)
- Token: `8732155312:AAGYtQXM7s6W5nnl2J0TFifRQArUXP8WGV0`
- Chat ID: `1457545952`
- Bot: @lending8_bot
- Формат: fetch POST → `api.telegram.org/bot.../sendMessage`
- Fallback: при ошибке сети показывает ссылку на @samarina_parfum

## Контакты клиента
- Telegram: https://t.me/samarina_parfum
- Email: yuliya.samarina.84.84@mail.ru
- Телефон: +7 919 830 89 56

## Правила редактирования
- Всё в одном файле `index.html` — не разбивать на отдельные CSS/JS файлы
- Не добавлять внешние библиотеки (jQuery, Bootstrap и т.д.)
- Картинки — относительные пути `img/...`
- Адаптивные брейкпоинты: 1024px, 768px, 480px
- На мобилке (768px): курсор выключен, hover-эффекты не применяются
- Поддержка `prefers-reduced-motion: reduce`
- Язык контента: русский
- Год в футере: 2026
- Статистика: 24 проекта (не 47)
- hero.jpg → секция Hero, about.jpg → секция About (не путать!)
