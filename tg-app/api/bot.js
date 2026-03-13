const BOT_TOKEN = process.env.BOT_TOKEN || '8661549195:AAGw5GRJCCZjuXVC_e31Jwdj1BqBjvMWCXo';
const GUIDE_URL = 'https://tg-app-iota-sage.vercel.app/guide.html';
const MINI_APP_URL = 'https://t.me/Samarina28_bot/app';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, method: req.method });
  }

  try {
    const { message } = req.body || {};
    if (!message) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const firstName = message.from?.first_name || '';

    // /start or /start from_app
    if (text === '/start' || text.startsWith('/start ')) {
      const greeting = firstName ? `Привет, ${firstName}! 👋` : 'Привет! 👋';

      await sendMessage(chatId, {
        text: `${greeting}\n\nЯ — бот Юлии Самариной, AI-ментора для экспертов и брендов.\n\n🎁 <b>У меня есть подарок для вас</b> — бесплатный гайд «Как создавать точные промпты и получать от ИИ результат».\n\nНажмите кнопку ниже, чтобы забрать его 👇`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎁 Забрать подарок', url: GUIDE_URL }],
            [{ text: '📋 Посмотреть услуги', web_app: { url: 'https://tg-app-iota-sage.vercel.app' } }],
            [{ text: '💬 Написать Юлии', url: 'https://t.me/Samarina_Yuliya' }]
          ]
        }
      });
      return res.status(200).json({ ok: true });
    }

    // /gift command
    if (text === '/gift') {
      await sendMessage(chatId, {
        text: '🎁 Вот ваш бесплатный гайд по промптам!\n\nНажмите кнопку, чтобы открыть 👇',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎁 Открыть гайд', url: GUIDE_URL }]
          ]
        }
      });
      return res.status(200).json({ ok: true });
    }

    // /services command
    if (text === '/services') {
      await sendMessage(chatId, {
        text: '📋 Откройте каталог услуг 👇',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Открыть каталог', web_app: { url: 'https://tg-app-iota-sage.vercel.app' } }]
          ]
        }
      });
      return res.status(200).json({ ok: true });
    }

    // /help command
    if (text === '/help') {
      await sendMessage(chatId, {
        text: '🤖 Что я умею:\n\n/start — Приветствие и подарок\n/gift — Забрать бесплатный гайд\n/services — Каталог услуг\n/help — Список команд\n\n💬 Или просто напишите Юлии: @Samarina_Yuliya',
        parse_mode: 'HTML'
      });
      return res.status(200).json({ ok: true });
    }

    // Any other message — friendly fallback
    await sendMessage(chatId, {
      text: `${firstName ? firstName + ', я' : 'Я'} пока не умею отвечать на сообщения 🙂\n\nНо вот что могу:\n\n🎁 /gift — забрать бесплатный гайд\n📋 /services — посмотреть услуги\n💬 Написать Юлии — @Samarina_Yuliya`,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Bot error:', err);
    return res.status(200).json({ ok: true, error: err.message });
  }
};

async function sendMessage(chatId, params) {
  const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, ...params })
  });
  return resp.json();
}
