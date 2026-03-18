/**
 * Telegram Bot — Юлия Самарина
 * Режим: Webhook (Yandex Cloud Functions)
 * Env: BOT_TOKEN, OWNER_TELEGRAM_ID, SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const https = require('https');

const BOT_TOKEN    = process.env.BOT_TOKEN;
const OWNER_ID     = Number(process.env.OWNER_TELEGRAM_ID);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const MINI_APP_URL = 'https://tg-app-iota-sage.vercel.app';
const GUIDE_URL    = 'https://tg-app-iota-sage.vercel.app/guide_prompts_yulia.pdf';
const YULIA_LINK   = 'https://t.me/Samarina_Yuliya';

const QUALIFY_KEYBOARD = {
  inline_keyboard: [
    [{ text: 'Работаю в найме',       callback_data: 'role_employee' }],
    [{ text: 'Веду свой бизнес',      callback_data: 'role_business' }],
    [{ text: 'Развиваю экспертность', callback_data: 'role_expert'   }]
  ]
};

const KEYBOARD = {
  keyboard: [
    [{ text: '📋 Услуги', web_app: { url: MINI_APP_URL } }, { text: '🖼 Портфолио', web_app: { url: MINI_APP_URL + '?screen=portfolio' } }],
    [{ text: '🎁 Подарок' }, { text: '💬 Написать Юлии' }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

const ADMIN_KEYBOARD = {
  keyboard: [
    [{ text: '📊 Статистика' }, { text: '👥 Последние подписчики' }],
    [{ text: '📨 Рассылка' }, { text: '🔙 Выйти из админки' }]
  ],
  resize_keyboard: true
};

// ─── HTTP запросы ───────────────────────────────────────────
function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function telegramRequest(method, params) {
  const body = JSON.stringify(params);
  return httpRequest({
    hostname: 'api.telegram.org',
    path: `/bot${BOT_TOKEN}/${method}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);
}

function sendMessage(chatId, params) {
  return telegramRequest('sendMessage', { chat_id: chatId, ...params });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function answerCallbackQuery(callbackQueryId) {
  return telegramRequest('answerCallbackQuery', { callback_query_id: callbackQueryId });
}

// ─── Supabase запросы ───────────────────────────────────────
function supabaseRequest(path, method, body) {
  const bodyStr = body ? JSON.stringify(body) : null;
  return httpRequest({
    hostname: new URL(SUPABASE_URL).hostname,
    path: `/rest/v1/${path}`,
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=minimal' : 'count=exact',
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
    }
  }, bodyStr);
}

async function saveClient({ userId, firstName, lastName, username, chatId }) {
  try {
    const existing = await supabaseRequest(`clients?telegram_id=eq.${userId}&select=id`, 'GET');
    if (Array.isArray(existing) && existing.length > 0) return false;
    await supabaseRequest('clients', 'POST', {
      telegram_id: userId, username: username || null,
      first_name: firstName || null, last_name: lastName || null,
      chat_id: chatId, source: 'bot_start', created_at: new Date().toISOString()
    });
    return true;
  } catch (err) { console.error('Supabase error:', err.message); return false; }
}

async function getAllClients() {
  try {
    return await supabaseRequest('clients?select=chat_id,first_name,username&order=created_at.desc', 'GET');
  } catch { return []; }
}

async function getRecentClients(limit = 10) {
  try {
    return await supabaseRequest(`clients?select=first_name,last_name,username,created_at&order=created_at.desc&limit=${limit}`, 'GET');
  } catch { return []; }
}

async function getClientsCount() {
  try {
    const data = await supabaseRequest('clients?select=id', 'GET');
    return Array.isArray(data) ? data.length : 0;
  } catch { return 0; }
}

async function saveClientRole(userId, role) {
  try {
    await supabaseRequest(`clients?telegram_id=eq.${userId}`, 'PATCH', { role });
  } catch (err) { console.error('Save role error:', err.message); }
}

async function getNewClientsCount(days) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const data = await supabaseRequest(`clients?select=id&created_at=gte.${since}`, 'GET');
    return Array.isArray(data) ? data.length : 0;
  } catch { return 0; }
}

// ─── Сохранение состояния рассылки в Supabase ──────────────
async function setBroadcastState(adminId, state) {
  try {
    // Используем таблицу bot_state (создаём если нет)
    await supabaseRequest('bot_state', 'POST', {
      key: `broadcast_${adminId}`,
      value: state,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    // Если запись уже есть — обновляем
    await supabaseRequest(`bot_state?key=eq.broadcast_${adminId}`, 'PATCH', {
      value: state,
      updated_at: new Date().toISOString()
    });
  }
}

async function getBroadcastState(adminId) {
  try {
    const data = await supabaseRequest(`bot_state?key=eq.broadcast_${adminId}&select=value`, 'GET');
    return Array.isArray(data) && data.length > 0 ? data[0].value : null;
  } catch { return null; }
}

async function clearBroadcastState(adminId) {
  try {
    await supabaseRequest(`bot_state?key=eq.broadcast_${adminId}`, 'DELETE', null);
  } catch {}
}

// ─── Рассылка ──────────────────────────────────────────────
async function sendBroadcast(adminChatId, messageText) {
  const clients = await getAllClients();
  if (!clients.length) {
    await sendMessage(adminChatId, { text: '❌ Нет подписчиков для рассылки.' });
    return;
  }

  await sendMessage(adminChatId, {
    text: `📨 Начинаю рассылку ${clients.length} подписчикам...`
  });

  let sent = 0, failed = 0;

  for (const client of clients) {
    if (!client.chat_id) continue;
    try {
      await sendMessage(client.chat_id, { text: messageText, parse_mode: 'HTML' });
      sent++;
      await sleep(50); // 20 сообщений/сек — безопасный темп
    } catch (err) {
      failed++;
    }
  }

  await sendMessage(adminChatId, {
    text: `✅ Рассылка завершена!\n\n📤 Отправлено: ${sent}\n❌ Ошибок: ${failed}`
  });
}

// ─── Админ-команды ─────────────────────────────────────────
async function handleAdmin(chatId, text, from) {
  // Показать меню
  if (text === '/admin') {
    await sendMessage(chatId, {
      text: `👑 Админ-панель\n\nДобро пожаловать, ${from.first_name || 'Юлия'}!`,
      reply_markup: ADMIN_KEYBOARD
    });
    return;
  }

  // Статистика
  if (text === '📊 Статистика' || text === '/stats') {
    const total = await getClientsCount();
    const week  = await getNewClientsCount(7);
    const day   = await getNewClientsCount(1);
    await sendMessage(chatId, {
      text: `📊 <b>Статистика бота</b>\n\n👥 Всего подписчиков: <b>${total}</b>\n📅 За последние 7 дней: <b>+${week}</b>\n🕐 За сегодня: <b>+${day}</b>`,
      parse_mode: 'HTML',
      reply_markup: ADMIN_KEYBOARD
    });
    return;
  }

  // Последние подписчики
  if (text === '👥 Последние подписчики' || text === '/recent') {
    const clients = await getRecentClients(10);
    if (!clients.length) {
      await sendMessage(chatId, { text: 'Пока нет подписчиков.', reply_markup: ADMIN_KEYBOARD });
      return;
    }
    const list = clients.map((c, i) => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Без имени';
      const tag  = c.username ? ` @${c.username}` : '';
      const date = new Date(c.created_at).toLocaleDateString('ru-RU');
      return `${i + 1}. ${name}${tag} — ${date}`;
    }).join('\n');
    await sendMessage(chatId, {
      text: `👥 <b>Последние 10 подписчиков:</b>\n\n${list}`,
      parse_mode: 'HTML',
      reply_markup: ADMIN_KEYBOARD
    });
    return;
  }

  // Начать рассылку
  if (text === '📨 Рассылка' || text === '/broadcast') {
    const total = await getClientsCount();
    await setBroadcastState(chatId, 'waiting_message');
    await sendMessage(chatId, {
      text: `📨 <b>Рассылка</b>\n\nВсего подписчиков: <b>${total}</b>\n\nНапиши текст сообщения для рассылки.\n\n<i>Можно использовать HTML: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;</i>\n\nДля отмены напиши /cancel`,
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true }
    });
    return;
  }

  // Отмена
  if (text === '/cancel') {
    await clearBroadcastState(chatId);
    await sendMessage(chatId, { text: '❌ Отменено.', reply_markup: ADMIN_KEYBOARD });
    return;
  }

  // Выйти из админки
  if (text === '🔙 Выйти из админки') {
    await sendMessage(chatId, { text: 'Вышла из админки 👋', reply_markup: KEYBOARD });
    return;
  }

  // Обработка текста для рассылки
  const state = await getBroadcastState(chatId);
  if (state === 'waiting_message') {
    await clearBroadcastState(chatId);
    // Показываем превью и просим подтверждение
    await setBroadcastState(chatId, `confirm:${text}`);
    const total = await getClientsCount();
    await sendMessage(chatId, {
      text: `📋 <b>Превью сообщения:</b>\n\n${text}\n\n─────────────────\n👥 Будет отправлено: <b>${total}</b> подписчикам\n\nОтправить?`,
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [[{ text: '✅ Отправить' }, { text: '❌ Отменить' }]],
        resize_keyboard: true, one_time_keyboard: true
      }
    });
    return;
  }

  if (state && state.startsWith('confirm:')) {
    const broadcastText = state.replace('confirm:', '');
    await clearBroadcastState(chatId);

    if (text === '✅ Отправить') {
      await sendBroadcast(chatId, broadcastText);
      await sendMessage(chatId, { reply_markup: ADMIN_KEYBOARD, text: '↩️ Возвращаю в меню' });
    } else {
      await sendMessage(chatId, { text: '❌ Рассылка отменена.', reply_markup: ADMIN_KEYBOARD });
    }
    return;
  }
}

// ─── Обработка inline-кнопок ───────────────────────────────
async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data   = query.data;

  await answerCallbackQuery(query.id);

  if (data.startsWith('role_')) {
    const roleMap = {
      role_employee: 'employee',
      role_expert:   'expert',
      role_business: 'business'
    };
    const roleLabel = {
      role_employee: 'В найме',
      role_expert:   'Эксперт',
      role_business: 'Бизнес'
    };

    await saveClientRole(userId, roleMap[data]);

    await sendMessage(chatId, {
      text: `Отлично, записала! 👌\n\n🎁 Держите гайд «Точные промпты» — он уже ждал вас!\n\nВнутри: шаблоны, примеры и разбор ошибок 👇`,
      reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть гайд', url: GUIDE_URL }]] }
    });
  }
}

// ─── Обработка сообщения ───────────────────────────────────
async function handleMessage(message) {
  const chatId    = message.chat.id;
  const text      = (message.text || '').trim();
  const from      = message.from || {};
  const firstName = from.first_name || '';
  const lastName  = from.last_name  || '';
  const username  = from.username   || '';
  const userId    = from.id;

  // Проверка на ожидание ответа для рассылки (для любого сообщения от админа)
  if (chatId === OWNER_ID) {
    const state = await getBroadcastState(chatId);
    if (state || text === '/admin' || text === '/stats' || text === '/broadcast' || text === '/recent' || text === '/cancel'
      || text === '📊 Статистика' || text === '👥 Последние подписчики'
      || text === '📨 Рассылка' || text === '🔙 Выйти из админки'
      || text === '✅ Отправить' || text === '❌ Отменить') {
      await handleAdmin(chatId, text, from);
      return;
    }
  }

  // Обычные команды для всех
  if (text === '/start' || text.startsWith('/start ')) {
    const isNew = await saveClient({ userId, firstName, lastName, username, chatId });
    const greeting = firstName ? `Привет, ${firstName}! 👋` : 'Привет! 👋';
    await sendMessage(chatId, {
      text: `${greeting}\n\nИИ сейчас везде — и именно поэтому разобраться в нём стало сложнее, не проще.\n\nЯ Юлия Самарина. Помогаю найти то, что работает именно для вашей задачи — без технического жаргона и лишней траты времени.`,
      parse_mode: 'HTML',
      reply_markup: KEYBOARD
    });
    await sendMessage(chatId, {
      text: 'Расскажите про себя — чтобы я могла помочь точнее 👇',
      reply_markup: QUALIFY_KEYBOARD
    });
    if (isNew) {
      const name = [firstName, lastName].filter(Boolean).join(' ');
      const tag  = username ? ` (@${username})` : '';
      const count = await getClientsCount();
      await sendMessage(OWNER_ID, {
        text: `🔔 Новый подписчик!\n\n👤 ${name}${tag}\n🆔 ID: ${userId}\n\nВсего: ${count}`
      });
    }
    return;
  }

  if (text === '🎁 Подарок' || text === '/gift') {
    await sendMessage(chatId, {
      text: '🎁 Вот ваш бесплатный гайд по промптам! 👇',
      reply_markup: { inline_keyboard: [[{ text: '🎁 Открыть гайд', url: GUIDE_URL }]] }
    });
    return;
  }

  if (text === '💬 Написать Юлии') {
    await sendMessage(chatId, {
      text: '💬 Напишите Юлии напрямую 👇',
      reply_markup: { inline_keyboard: [[{ text: '💬 Открыть чат', url: YULIA_LINK }]] }
    });
    return;
  }

  if (text === '/help') {
    await sendMessage(chatId, {
      text: '🤖 Кнопки внизу:\n\n📋 Услуги — каталог и цены\n🖼 Портфолио — примеры работ\n🎁 Подарок — гайд по промптам\n💬 Написать Юлии — связаться напрямую',
      parse_mode: 'HTML',
      reply_markup: KEYBOARD
    });
    return;
  }

  await sendMessage(chatId, {
    text: `${firstName ? firstName + ', в' : 'В'}оспользуйтесь кнопками внизу 👇`,
    reply_markup: KEYBOARD
  });

  // Пересылаем сообщение Юлии
  if (text && chatId !== OWNER_ID) {
    const name = [firstName, lastName].filter(Boolean).join(' ') || 'Без имени';
    const tag  = username ? ` @${username}` : '';
    const userLink = username ? `https://t.me/${username}` : `tg://user?id=${userId}`;
    await sendMessage(OWNER_ID, {
      text: `✉️ Сообщение от ${name}${tag}:\n\n«${text}»`,
      reply_markup: { inline_keyboard: [[{ text: `💬 Ответить ${name}`, url: userLink }]] }
    });
  }
}

// ─── Точка входа для Yandex Cloud Functions ─────────────────
module.exports.handler = async function(event) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    if (body && body.message)        await handleMessage(body.message);
    if (body && body.callback_query) await handleCallbackQuery(body.callback_query);
  } catch (err) {
    console.error('Handler error:', err.message);
  }
  return { statusCode: 200, body: 'ok' };
};
