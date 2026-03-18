# Инструкция по деплою — Проект Самариной Юлии

## Что и куда деплоится

| Компонент | Где хостится | Адрес |
|-----------|-------------|-------|
| Лендинг (`index.html` + `img/`) | Яндекс Object Storage | www.samarina-ai.ru |
| Telegram-бот (webhook) | Яндекс Cloud Functions | functions.yandexcloud.net/d4epdc2r8q7oqb6hrqs6 |
| Mini App | Vercel | tg-app-iota-sage.vercel.app |
| База данных клиентов | Supabase | kkhlyonwcvrwyeuwetuw.supabase.co |

---

## 1. Лендинг (Яндекс Object Storage)

### Первый деплой
1. Зайди на [console.yandex.cloud](https://console.yandex.cloud)
2. Object Storage → Бакеты → `samarina-ai.ru`
3. Вкладка **Объекты** → кнопка **Загрузить**
4. Загрузи `index.html`
5. Создай папку `img` → загрузи все картинки из папки `img/`
6. Настройки → Веб-сайт → Хостинг → Главная страница: `index.html` → Сохранить

### Обновление сайта
1. Отредактируй `index.html` в VS Code
2. Зайди в бакет `samarina-ai.ru` → Объекты
3. Нажми `...` рядом со старым `index.html` → Удалить
4. Загрузи новый `index.html`

> Картинки обновляй так же — удали старую, загрузи новую с тем же именем.

---

## 2. Telegram-бот (Яндекс Cloud Functions)

### Первый деплой
1. Зайди на [console.yandex.cloud](https://console.yandex.cloud) → Cloud Functions
2. Создать функцию → имя: `samarina-bot`
3. Выбери среду: **Node.js 22** → Продолжить
4. Вставь код из файла `tg-app/bot-webhook.js` в редактор
5. Таймаут: **10 секунд**
6. Добавь переменные окружения:
   - `BOT_TOKEN` = токен бота от @BotFather
   - `OWNER_TELEGRAM_ID` = твой Telegram ID (1457545952)
   - `SUPABASE_URL` = URL проекта Supabase
   - `SUPABASE_SERVICE_KEY` = Service Key из Supabase
7. Нажми **Сохранить изменения**
8. В разделе **Обзор** → включи **Публичная функция**
9. Скопируй **Ссылку для вызова**

### Подключить webhook к Telegram
Открой в браузере (замени `<ТОКЕН>` и `<URL_ФУНКЦИИ>`):
```
https://api.telegram.org/bot<ТОКЕН>/setWebhook?url=<URL_ФУНКЦИИ>
```
Должно вернуть: `{"ok":true,"description":"Webhook was set"}`

### Обновление кода бота
1. Отредактируй `tg-app/bot-webhook.js` в VS Code
2. Cloud Functions → `samarina-bot` → Редактор
3. Замени код (Ctrl+A → Delete → вставь новый)
4. Сохранить изменения

---

## 3. Mini App (Vercel)

### Первый деплой
1. Зайди на [vercel.com](https://vercel.com) → New Project
2. Подключи репозиторий GitHub с папкой `tg-app/`
3. Root Directory: `tg-app`
4. Deploy

### Обновление
Vercel деплоит автоматически при каждом `git push` в ветку `main`.

---

## 4. База данных (Supabase)

### Структура таблицы `clients`
```sql
CREATE TABLE clients (
  id          bigserial PRIMARY KEY,
  telegram_id bigint UNIQUE,
  username    varchar,
  first_name  varchar,
  last_name   varchar,
  chat_id     bigint,
  source      varchar,
  created_at  timestamptz DEFAULT now()
);
```

### Где смотреть клиентов
[supabase.com](https://supabase.com) → проект → Table Editor → таблица `clients`

---

## 5. Домен (reg.ru + Яндекс Object Storage)

DNS настройка (уже сделано):
- Регистратор: reg.ru
- Запись: `CNAME www → samarina-ai.ru.website.yandexcloud.net`
- Домен: `samarina-ai.ru`

Если нужно изменить DNS:
1. reg.ru → Домены → `samarina-ai.ru` → DNS-серверы и управление зоной

---

## Переменные окружения (секреты)

| Переменная | Где используется | Где взять |
|-----------|-----------------|-----------|
| `BOT_TOKEN` | Cloud Functions | @BotFather в Telegram |
| `OWNER_TELEGRAM_ID` | Cloud Functions | userinfobot в Telegram |
| `SUPABASE_URL` | Cloud Functions | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Cloud Functions | Supabase → Settings → API → service_role |

> Никогда не публикуй эти значения в GitHub!

---

## Проверка что всё работает

1. Открой `www.samarina-ai.ru` — должен загрузиться лендинг
2. Напиши `/start` боту `@Samarina28_bot` — должен ответить
3. Проверь Supabase → таблица `clients` — должна появиться запись
4. Юлии должно прийти уведомление в Telegram
