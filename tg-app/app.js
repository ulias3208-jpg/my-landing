/* ============================================
   Telegram Mini App — Каталог услуг
   Юлия Самарина | Вайбкодер и AI-креатор

   Навигация: стек экранов (без hash-роутера)
   Экраны: Главная → Детали → Заявка → Готово
   ============================================ */

// --- Конфигурация ---
const CONFIG = {
  // Telegram-бот для отправки заявок
  botToken: '8661549195:AAGw5GRJCCZjuXVC_e31Jwdj1BqBjvMWCXo',
  chatId: '1457545952',
  // Ссылка на Telegram Юлии
  telegramLink: 'https://t.me/Samarina_Yuliya',
};

// --- Инициализация Telegram Web App ---
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.headerColor = tg.themeParams.bg_color || '#ffffff';

// Данные пользователя из Telegram
const user = tg.initDataUnsafe?.user || {};
const userName = user.first_name || 'друг';
const userUsername = user.username || '';
const userId = user.id || 0;

// --- Состояние приложения ---
let services = [];
let screenStack = ['main']; // Стек навигации
let currentService = null;  // Выбранная услуга
let selectedVariant = 0;    // Выбранный вариант/тариф
let mainButtonAction = null; // Текущее действие MainButton

// --- DOM ---
const appEl = document.getElementById('app');
const overlayEl = document.getElementById('success-overlay');

// --- Загрузка данных ---
async function loadServices() {
  try {
    const res = await fetch('data/services.json');
    const data = await res.json();
    services = data.services;
  } catch (e) {
    // Fallback: данные встроены
    console.warn('Не удалось загрузить services.json, используем fallback');
    services = getFallbackServices();
  }
  renderScreen('main');
}

// --- НАВИГАЦИЯ ---

// Переход на новый экран (вперёд)
function navigate(screen, data) {
  screenStack.push(screen);
  renderScreen(screen, 'forward', data);
  tg.BackButton.show();
  haptic('impact', 'light');
}

// Возврат на предыдущий экран
function goBack() {
  if (screenStack.length <= 1) return;
  screenStack.pop();
  const prev = screenStack[screenStack.length - 1];
  renderScreen(prev, 'back');
  if (screenStack.length <= 1) {
    tg.BackButton.hide();
    tg.MainButton.hide();
  }
  haptic('impact', 'light');
}

// Сброс на главный экран
function goHome() {
  screenStack = ['main'];
  renderScreen('main', 'back');
  tg.BackButton.hide();
  tg.MainButton.hide();
  overlayEl.classList.add('hidden');
  haptic('impact', 'light');
}

// Подписка на BackButton
tg.BackButton.onClick(goBack);

// Единый обработчик MainButton (переключаем действие через mainButtonAction)
tg.MainButton.onClick(() => {
  if (typeof mainButtonAction === 'function') {
    mainButtonAction();
  }
});

// --- РЕНДЕР ЭКРАНОВ ---

function renderScreen(name, direction, data) {
  const oldScreen = appEl.querySelector('.screen');

  // Создаём новый экран
  let html = '';
  switch (name) {
    case 'main':
      html = renderMain();
      tg.MainButton.hide();
      break;
    case 'detail':
      html = renderDetail();
      updateMainButton();
      mainButtonAction = () => navigate('order');
      break;
    case 'order':
      html = renderOrder();
      tg.MainButton.setText('Отправить заявку');
      tg.MainButton.show();
      tg.MainButton.enable();
      tg.MainButton.hideProgress();
      mainButtonAction = submitOrder;
      break;
  }

  const newScreen = document.createElement('div');
  newScreen.className = 'screen';
  newScreen.innerHTML = html;

  // Анимация перехода
  if (direction === 'forward') {
    newScreen.classList.add('screen--enter-right');
  } else if (direction === 'back') {
    newScreen.classList.add('screen--enter-left');
  }

  appEl.appendChild(newScreen);

  // Анимируем старый экран наружу
  if (oldScreen && direction) {
    if (direction === 'forward') {
      oldScreen.classList.add('screen--exit-left');
    } else {
      oldScreen.classList.add('screen--exit-right');
    }
    setTimeout(() => oldScreen.remove(), 300);
  } else if (oldScreen) {
    oldScreen.remove();
  }

  // Анимируем новый экран внутрь
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      newScreen.classList.remove('screen--enter-right', 'screen--enter-left');
      newScreen.classList.add('screen--active');
    });
  });

  // Привязываем обработчики
  bindEvents(name);

  // Скролл наверх
  window.scrollTo(0, 0);
}

// --- ЭКРАН 1: ГЛАВНАЯ ---

function renderMain() {
  const cards = services.map((s, i) => `
    <div class="service-card fade-up" data-index="${i}">
      <div class="service-card__icon">${s.icon}</div>
      <div class="service-card__body">
        <div class="service-card__name">${s.name}</div>
        <div class="service-card__meta">
          <span class="service-card__price">${s.price_label}</span>
          <span class="service-card__count">· ${s.projects_count} ${pluralize(s.projects_count, 'проект', 'проекта', 'проектов')}</span>
        </div>
      </div>
      <span class="service-card__arrow">›</span>
    </div>
  `).join('');

  // Берём 2 отзыва для главной
  const reviews = services
    .filter(s => s.review)
    .slice(0, 2)
    .map(s => `
      <div class="review-mini fade-up">
        <div class="review-mini__text">«${s.review.text}»</div>
        <div class="review-mini__author">— ${s.review.author}</div>
      </div>
    `).join('');

  return `
    <div class="profile fade-up">
      <div class="profile__avatar"><img src="img/avatar.jpg" alt="Юлия Самарина"></div>
      <div class="profile__info">
        <div class="profile__name">Юлия Самарина</div>
        <div class="profile__role">Вайбкодер и AI-креатор</div>
        <div class="profile__status">Доступна для проектов</div>
      </div>
    </div>

    <h1 class="greeting fade-up">Привет, ${escapeHtml(userName)}!</h1>
    <p class="greeting__sub fade-up">Выбери, что тебе нужно:</p>

    ${cards}

    <div class="reviews-section">
      <div class="section-title fade-up">Что говорят клиенты</div>
      ${reviews}
    </div>

    <button class="tg-button fade-up" id="btn-contact">
      💬 Написать в Telegram
    </button>

    <button class="tg-button tg-button--share fade-up" id="btn-share">
      🔗 Поделиться с другом
    </button>
  `;
}

// --- ЭКРАН 2: ДЕТАЛИ УСЛУГИ ---

function renderDetail() {
  const s = currentService;
  if (!s) return '<p>Услуга не найдена</p>';

  const checklist = s.includes.map(item => `
    <div class="checklist__item">
      <span class="checklist__icon">✓</span>
      <span>${item}</span>
    </div>
  `).join('');

  const variants = s.variants.map((v, i) => `
    <div class="variant-card ${i === selectedVariant ? 'variant-card--selected' : ''}" data-variant="${i}">
      <div>
        <div class="variant-card__name">${v.name}</div>
        <div class="variant-card__days">${v.days}</div>
      </div>
      <div class="variant-card__price">${v.price}</div>
    </div>
  `).join('');

  const reviewHtml = s.review ? `
    <div class="detail-review fade-up">
      <div class="detail-review__text">«${s.review.text}»</div>
      <div class="detail-review__author">— ${s.review.author}</div>
    </div>
  ` : '';

  // Сроки из первого варианта
  const days = s.variants[selectedVariant]?.days || s.variants[0]?.days || '';

  return `
    <div class="detail-header fade-up">
      <div class="detail-header__icon">${s.icon}</div>
      <div class="detail-header__name">${s.name}</div>
      <div class="detail-header__price">${s.price_label}</div>
    </div>

    <p class="detail-desc fade-up">${s.description}</p>

    <div class="checklist fade-up">
      <div class="checklist__title">Что входит</div>
      ${checklist}
    </div>

    <div class="variants fade-up">
      <div class="section-title">Варианты</div>
      ${variants}
    </div>

    <div class="timing fade-up">
      <div class="timing__item">
        <div class="timing__icon">⏱</div>
        <div class="timing__value">${days}</div>
        <div class="timing__text">сроки</div>
      </div>
      <div class="timing__item">
        <div class="timing__icon">📞</div>
        <div class="timing__value">2 часа</div>
        <div class="timing__text">ответ</div>
      </div>
    </div>

    ${reviewHtml}
  `;
}

// --- ЭКРАН 3: ЗАЯВКА ---

function renderOrder() {
  const s = currentService;
  const v = s.variants[selectedVariant] || s.variants[0];
  const initial = userName.charAt(0).toUpperCase();

  return `
    <div class="order-screen">
      <h2 class="order-title fade-up">Заявка</h2>

      <div class="order-service fade-up">
        <span class="order-service__icon">${s.icon}</span>
        <div>
          <div class="order-service__name">${v.name}</div>
          <div class="order-service__price">${v.price}</div>
        </div>
      </div>

      <div class="order-label fade-up">Расскажите о задаче</div>
      <textarea
        class="order-textarea fade-up"
        id="order-message"
        placeholder="Опишите, что нужно сделать и какой результат ожидаете..."
        rows="5"
      ></textarea>

      <div class="order-user fade-up">
        <div class="order-user__avatar">${initial}</div>
        <div>
          <div class="order-user__name">${escapeHtml(userName)}${userUsername ? ' @' + escapeHtml(userUsername) : ''}</div>
          <div class="order-user__hint">Данные из Telegram</div>
        </div>
      </div>

      <div class="next-steps fade-up">
        <div class="next-steps__title">Что будет дальше</div>
        <div class="next-step">
          <div class="next-step__num">1</div>
          <div class="next-step__text">Юлия получит вашу заявку в Telegram</div>
        </div>
        <div class="next-step">
          <div class="next-step__num">2</div>
          <div class="next-step__text">Ответит в течение 2 часов</div>
        </div>
        <div class="next-step">
          <div class="next-step__num">3</div>
          <div class="next-step__text">Обсудите детали — без давления</div>
        </div>
      </div>
    </div>
  `;
}

// --- ОТПРАВКА ЗАЯВКИ ---

async function submitOrder() {
  const textarea = document.getElementById('order-message');
  const message = textarea?.value?.trim() || '';

  // Валидация
  if (message.length < 5) {
    textarea.classList.add('order-textarea--error');
    haptic('notification', 'error');
    textarea.focus();
    setTimeout(() => textarea.classList.remove('order-textarea--error'), 2000);
    return;
  }

  // Блокируем кнопку
  tg.MainButton.showProgress();
  tg.MainButton.disable();

  const s = currentService;
  const v = s.variants[selectedVariant] || s.variants[0];

  // Формируем текст сообщения
  const text = [
    '📩 Новая заявка из Mini App!',
    '',
    `🏷 Услуга: ${s.name}`,
    `💰 Вариант: ${v.name} — ${v.price}`,
    '',
    `👤 Клиент: ${userName}${userUsername ? ' (@' + userUsername + ')' : ''}`,
    userId ? `🆔 ID: ${userId}` : '',
    '',
    '📝 Описание:',
    message,
  ].filter(Boolean).join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${CONFIG.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.chatId,
        text: text,
      }),
    });

    if (!res.ok) throw new Error('Ошибка отправки');

    // Успех
    haptic('notification', 'success');
    tg.MainButton.hide();
    overlayEl.classList.remove('hidden');
  } catch (err) {
    console.error('Ошибка отправки:', err);
    haptic('notification', 'error');
    tg.MainButton.hideProgress();
    tg.MainButton.enable();

    // Показываем fallback — предлагаем написать напрямую
    alert('Не удалось отправить заявку. Попробуйте написать напрямую в Telegram.');
    tg.openTelegramLink(CONFIG.telegramLink);
  }
}

// --- ПРИВЯЗКА ОБРАБОТЧИКОВ ---

function bindEvents(screen) {
  switch (screen) {
    case 'main':
      // Карточки услуг
      document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
          const index = parseInt(card.dataset.index);
          currentService = services[index];
          selectedVariant = 0;
          navigate('detail');
        });
      });

      // Кнопка «Написать в Telegram»
      const contactBtn = document.getElementById('btn-contact');
      if (contactBtn) {
        contactBtn.addEventListener('click', () => {
          haptic('impact', 'medium');
          tg.openTelegramLink(CONFIG.telegramLink);
        });
      }

      // Кнопка «Поделиться с другом»
      const shareBtn = document.getElementById('btn-share');
      if (shareBtn) {
        shareBtn.addEventListener('click', shareBotLink);
      }
      break;

    case 'detail':
      // Выбор варианта/тарифа
      document.querySelectorAll('.variant-card').forEach(card => {
        card.addEventListener('click', () => {
          selectedVariant = parseInt(card.dataset.variant);
          document.querySelectorAll('.variant-card').forEach(c =>
            c.classList.remove('variant-card--selected')
          );
          card.classList.add('variant-card--selected');
          updateMainButton();
          haptic('impact', 'light');
        });
      });
      break;

    case 'order':
      // Фокус на textarea
      setTimeout(() => {
        const ta = document.getElementById('order-message');
        if (ta) ta.focus();
      }, 350);
      break;
  }

  // Кнопки оверлея (всегда доступны)
  const writeTgBtn = document.getElementById('btn-write-tg');
  const backHomeBtn = document.getElementById('btn-back-home');

  if (writeTgBtn) {
    writeTgBtn.onclick = () => {
      haptic('impact', 'medium');
      tg.openTelegramLink(CONFIG.telegramLink);
    };
  }

  if (backHomeBtn) {
    backHomeBtn.onclick = goHome;
  }
}

// --- Обновление MainButton на экране деталей ---
function updateMainButton() {
  if (!currentService) return;
  const v = currentService.variants[selectedVariant] || currentService.variants[0];
  tg.MainButton.setText(`Заказать · ${v.price}`);
  tg.MainButton.show();
}

// --- УТИЛИТЫ ---

// Haptic feedback (с проверкой доступности)
function haptic(type, style) {
  try {
    if (type === 'impact') {
      tg.HapticFeedback.impactOccurred(style || 'light');
    } else if (type === 'notification') {
      tg.HapticFeedback.notificationOccurred(style || 'success');
    }
  } catch (e) {
    // Haptic недоступен (десктоп, старая версия)
  }
}

// Склонение числительных (1 проект, 2 проекта, 5 проектов)
function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

// Экранирование HTML (защита от XSS)
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Fallback-данные если JSON не загрузился
function getFallbackServices() {
  return [
    {
      id: 'sites', icon: '🖥', name: 'Сайты и лендинги',
      price_from: 1500, price_label: 'от 1 500 ₽', projects_count: 4,
      description: 'Конверсионные сайты и лендинги с помощью AI — быстро, красиво и по делу.',
      includes: ['Дизайн + вёрстка', 'Мобильная версия', 'Деплой', '30 дней поддержки'],
      variants: [
        { name: 'Электронная визитка', price: 'от 1 500 ₽', days: '1–3 дня' },
        { name: 'Лендинг', price: 'от 5 000 ₽', days: '3–5 дней' },
        { name: 'Сайт: от персонального до корпоративного', price: 'от 30 000 ₽', days: '7–14 дней' }
      ],
      review: { text: 'Приятно иметь дело с профессионалом!', author: 'Анна К.' }
    },
    {
      id: 'miniapps', icon: '📱', name: 'Telegram Mini Apps',
      price_from: 40000, price_label: 'от 40 000 ₽', projects_count: 2,
      description: 'Приложения внутри Telegram — клиенты уже там.',
      includes: ['Каталоги', 'Лояльность', 'Запись', 'Интеграция с ботом'],
      variants: [{ name: 'Mini App MVP', price: 'от 40 000 ₽', days: '14–21 день' }],
      review: { text: 'Невероятная атмосфера и человечность!', author: 'Святослав С.' }
    },
    {
      id: 'agents', icon: '🤖', name: 'AI-агенты',
      price_from: 20000, price_label: 'от 20 000 ₽', projects_count: 3,
      description: 'AI-системы для автоматизации — работают 24/7.',
      includes: ['Чат-боты', 'Автоматизация', 'CRM-интеграции', 'Настройка'],
      variants: [
        { name: 'Чат-бот', price: 'от 20 000 ₽', days: '7–14 дней' },
        { name: 'AI-агент', price: 'от 50 000 ₽', days: '14–21 день' }
      ],
      review: { text: 'Нейросети экономят много времени!', author: 'Врач-гинеколог' }
    },
    {
      id: 'visual', icon: '🎨', name: 'Нейрофотосессии и визуал',
      price_from: 3000, price_label: 'от 3 000 ₽', projects_count: 5,
      description: 'AI-ролики и визуал — от сниппета до рекламной кампании.',
      includes: ['Нейрофотосессии', 'AI-ролики', 'Рекламный визуал', 'Сториз'],
      variants: [
        { name: 'Пакет визуала', price: 'от 3 000 ₽', days: '1–3 дня' },
        { name: 'Рекламная кампания', price: 'от 10 000 ₽', days: '3–7 дней' }
      ],
      review: { text: 'Ты вдохновила меня на нейросети!', author: 'Участница курса' }
    }
  ];
}

// --- ОНБОРДИНГ (показ один раз) ---

function showOnboarding() {
  if (localStorage.getItem('onboarding_seen')) {
    showOffer();
    return;
  }

  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) { showOffer(); return; }

  overlay.style.display = 'flex';

  // Персонализация приветствия
  const greetEl = document.getElementById('onboarding-greeting');
  if (greetEl && userName !== 'друг') {
    greetEl.textContent = userName + ', добро пожаловать!';
  }

  function closeOnboarding() {
    localStorage.setItem('onboarding_seen', '1');
    overlay.classList.add('closing');
    haptic('impact', 'medium');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('closing');
      showOffer();
    }, 280);
  }

  document.getElementById('onboarding-start')?.addEventListener('click', closeOnboarding);
}

// --- ОФФЕР (показ один раз, после онбординга) ---

function showOffer() {
  if (localStorage.getItem('offer_seen')) return;

  const overlay = document.getElementById('offer-overlay');
  if (!overlay) return;

  setTimeout(() => {
    overlay.style.display = 'flex';
  }, 400);

  function closeOffer() {
    localStorage.setItem('offer_seen', '1');
    overlay.classList.add('closing');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('closing');
    }, 280);
  }

  document.getElementById('offer-accept')?.addEventListener('click', () => {
    haptic('notification', 'success');
    closeOffer();
  });

  document.getElementById('offer-skip')?.addEventListener('click', () => {
    haptic('impact', 'light');
    closeOffer();
  });

  overlay.querySelector('.offer-backdrop')?.addEventListener('click', closeOffer);
}

// --- ПОДЕЛИТЬСЯ ---

function shareBotLink() {
  haptic('impact', 'medium');
  const shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent('https://t.me/Samarina28_bot') + '&text=' + encodeURIComponent('Посмотри — сайты, Mini Apps, AI-агенты и визуал от Юлии Самариной');
  tg.openTelegramLink(shareUrl);
}

// --- ЗАПУСК ---
loadServices();
setTimeout(showOnboarding, 600);
