/* ============================================
   js/app.js — полная логика квеста "Бизнесмен на день"
   Данные лотов из property.rzd.ru
   Баланс рассчитывается на основе реальной арендной ставки (price)
   ============================================ */

// ---------- ДАННЫЕ ЛОТОВ (из property.rzd.ru) ----------
const LOTS = [
    {
        id: 1,
        title: "Нежилое помещение г.Самара",
        location: "Самарская область, г Самара, пл Комсомольская, д. 1",
        area: "42 м²",
        price: "25 005.12 ₽/мес",
        tag: "safe",
        images: [
            "img/lots/lot1/photo1.jpg",
            "img/lots/lot1/photo2.jpg",
            "img/lots/lot1/photo3.jpg",
            "img/lots/lot1/photo4.jpg",
            "img/lots/lot1/photo5.jpg"
        ]
    },
    {
        id: 2,
        title: "Площади под продажу мороженого в Санкт-Петербурге и Ленинградской области",
        location: "Санкт-Петербург, пр-кт Заневский, д. 73 л. А",
        area: "18 м²",
        price: "49 921.18 ₽/мес.",
        tag: "capital",
        images: [
            "img/lots/lot2/photo1.jpg",
            "img/lots/lot2/photo2.jpg",
            "img/lots/lot2/photo3.jpg",
            "img/lots/lot2/photo4.jpg",
            "img/lots/lot2/photo5.jpg"
        ]
    },
    {
        id: 3,
        title: "Cкладское помещение г. Топки",
        location: "Кемеровская область, р-н Топкинский, г Топки, ул Пролетарская, д. 109.",
        area: "443,7 м²",
        price: "73 210.50 ₽/мес.",
        tag: "neutral",
        images: [
            "img/lots/lot3/photo1.jpg",
            "img/lots/lot3/photo2.jpg",
            "img/lots/lot3/photo3.jpg",
            "img/lots/lot3/photo4.jpg",
            "img/lots/lot3/photo5.jpg"
        ]
    },
    {
        id: 4,
        title: "Офис 300 кв. м в здании Балтийского вокзала. Отдельный вход, метро рядом",
        location: "Санкт-Петербург, наб. Обводного канала, д. 120.",
        area: "300.6 м²",
        price: "450 000 ₽/мес",
        tag: "risky",
        images: [
            "img/lots/lot4/photo1.jpg",
            "img/lots/lot4/photo2.jpg",
            "img/lots/lot4/photo3.jpg",
            "img/lots/lot4/photo4.jpg",
            "img/lots/lot4/photo5.jpg"
        ]
    },
    {
        id: 5,
        title: "Место под вендинг г. Ростов-на-Дону",
        location: "Ростовская область, г Ростов-на-Дону, ул Гусева, д. 2а/5",
        area: "5 м²",
        price: "9 235.40 ₽/мес.",
        tag: "risky",
        images: [
            "img/lots/lot5/photo1.jpg",
            "img/lots/lot5/photo2.jpg",
            "img/lots/lot5/photo3.jpg",
            "img/lots/lot5/photo4.jpg",
            "img/lots/lot5/photo5.jpg"
        ]
    }
];

// ---------- ФУНКЦИЯ РАСЧЁТА СТОИМОСТИ ЛОТА (из price) ----------
function calculateLotCost(priceString) {
    // Извлекаем число из строки (убираем пробелы, ₽, /мес и т.д.)
    const cleaned = priceString.replace(/\s/g, '').replace(/[^0-9.,]/g, '');
    const normalized = cleaned.replace(',', '.');
    const number = parseFloat(normalized);
    
    if (isNaN(number) || number === 0) {
        console.warn('Не удалось распарсить цену:', priceString);
        return 100000;
    }
    
    // Используем годовую аренду / 10 для адаптации к игровому балансу
    return Math.round((number * 12) / 10);
}

// ---------- ПОДСКАЗКИ ДЛЯ ПЕРЕХОДОВ ----------
const HINTS = {
    1: "Ищи следующую стойку у входа в парк — там заметный арт-объект.",
    2: "Пройдите к центральному фонтану, за ним стойка №3.",
    3: "Лот №4 ждёт вас у сцены, справа от главного входа.",
    4: "Финальная стойка — у шатра РЖД, рядом с большим экраном."
};

// ---------- СОСТОЯНИЕ СЕССИИ ----------
let state = {
    sessionId: null,
    name: '',
    choices: [],
    resultType: null,
    balance: 1000000,
    finished: false
};

// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----------

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function saveState() {
    try {
        localStorage.setItem('bnd_session', JSON.stringify(state));
    } catch (e) {
        console.warn('Не удалось сохранить сессию:', e);
    }
}

function loadState() {
    try {
        const raw = localStorage.getItem('bnd_session');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                state = {
                    ...state,
                    ...parsed,
                    balance: parsed.balance !== undefined ? parsed.balance : 1000000
                };
                return true;
            }
        }
    } catch (e) {
        console.warn('Не удалось загрузить сессию:', e);
    }
    return false;
}

function resetState() {
    state = {
        sessionId: generateUUID(),
        name: '',
        choices: [],
        resultType: null,
        balance: 1000000,
        finished: false
    };
    saveState();
}

function getChoiceForLot(lotId) {
    const found = state.choices.find(c => c.lotId === lotId);
    return found ? found.choice : null;
}

function countChoices() {
    return state.choices.length;
}

function isAllLotsDone() {
    return state.choices.length >= 5;
}

// ---------- АЛГОРИТМ РАСЧЁТА ТИПАЖА ----------
function calculateResult() {
    const choices = state.choices;
    const n = choices.length;

    if (n === 0) {
        return {
            type: 'Стратег',
            desc: 'Семь раз проверит — один раз подпишет. Не поддаётся азарту квеста.'
        };
    }

    const taken = choices.filter(c => c.choice === 'beru').map(c => c.lotId);
    const takenCount = taken.length;
    const hasCapital = taken.some(id => LOTS.find(l => l.id === id)?.tag === 'capital');
    const riskyCount = taken.filter(id => LOTS.find(l => l.id === id)?.tag === 'risky').length;

    if (takenCount <= 1) {
        return {
            type: 'Стратег',
            desc: 'Семь раз проверит — один раз подпишет. Не поддаётся азарту квеста и предпочитает уйти ни с чем, чем потом объяснять партнёрам необдуманную сделку.'
        };
    }

    if (takenCount > 1 && hasCapital) {
        return {
            type: 'Городской предприниматель',
            desc: 'Локация решает всё. Готов переплатить за адрес, который сам себя продаёт — потому что знает: в бизнесе имеет значение не только что ты предлагаешь, но и откуда.'
        };
    }

    if (takenCount > 1 && !hasCapital && riskyCount === 0) {
        return {
            type: 'Консервативный скряга',
            desc: 'Считает каждый рубль дважды, прежде чем вложить один. Не гонится за масштабом — предпочитает точку, которая точно отобьётся.'
        };
    }

    if (takenCount > 1 && !hasCapital && riskyCount >= 2) {
        return {
            type: 'Рискованный стартапер',
            desc: 'Верит, что осторожность — это медленная смерть бизнеса. Берёт по-крупному там, где другие сомневаются, и искренне не понимает, зачем считать риски, если можно считать прибыль.'
        };
    }

    return {
        type: 'Бизнесмен-визионер',
        desc: 'Не складывает яйца в одну корзину. Немного риска, немного надёжности, немного статуса — предпочитает портфель, а не ставку на одну идею.'
    };
}

// ---------- ГАЛЕРЕЯ ----------
function renderGallery(images, lotId) {
    if (!images || images.length === 0) {
        return `
            <div class="lot-gallery">
                <div class="gallery-slide" style="height:220px; background:#eae7e0; font-size:48px; display:flex; align-items:center; justify-content:center;">
                    🏢
                </div>
            </div>
        `;
    }

    const uniqueId = `gallery-${lotId}`;
    let slidesHtml = '';
    let dotsHtml = '';

    images.forEach((img, index) => {
        const activeClass = index === 0 ? 'active' : '';
        slidesHtml += `
            <div class="gallery-slide" style="background-image: url('${img}');"></div>
        `;
        dotsHtml += `
            <button class="gallery-dot ${activeClass}" data-index="${index}" data-gallery="${uniqueId}"></button>
        `;
    });

    const hasMultiple = images.length > 1;

    return `
        <div class="lot-gallery" id="${uniqueId}">
            <div class="gallery-slider" id="${uniqueId}-slider">
                ${slidesHtml}
            </div>
            ${hasMultiple ? `
                <div class="gallery-arrows">
                    <button class="gallery-arrow" id="${uniqueId}-prev" aria-label="Предыдущее"><i class="fas fa-chevron-left"></i></button>
                    <button class="gallery-arrow" id="${uniqueId}-next" aria-label="Следующее"><i class="fas fa-chevron-right"></i></button>
                </div>
                <div class="gallery-nav" id="${uniqueId}-dots">
                    ${dotsHtml}
                </div>
            ` : ''}
        </div>
    `;
}

function initGallery(lotId) {
    const uniqueId = `gallery-${lotId}`;
    const gallery = document.getElementById(uniqueId);
    if (!gallery) return;

    const slider = document.getElementById(`${uniqueId}-slider`);
    const dots = gallery.querySelectorAll('.gallery-dot');
    const prevBtn = document.getElementById(`${uniqueId}-prev`);
    const nextBtn = document.getElementById(`${uniqueId}-next`);
    
    if (!slider) return;

    const slides = slider.querySelectorAll('.gallery-slide');
    const totalSlides = slides.length;
    if (totalSlides <= 1) return;

    let currentIndex = 0;
    let isTransitioning = false;

    function goToSlide(index) {
        if (isTransitioning || index === currentIndex || index < 0 || index >= totalSlides) return;
        isTransitioning = true;
        currentIndex = index;
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
        
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });

        if (prevBtn) prevBtn.classList.toggle('hidden', currentIndex === 0);
        if (nextBtn) nextBtn.classList.toggle('hidden', currentIndex === totalSlides - 1);

        setTimeout(() => {
            isTransitioning = false;
        }, 400);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));
    }

    dots.forEach((dot) => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.index);
            goToSlide(index);
        });
    });

    let touchStartX = 0;
    let touchEndX = 0;

    slider.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    slider.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) {
                goToSlide(currentIndex + 1);
            } else {
                goToSlide(currentIndex - 1);
            }
        }
    }, { passive: true });

    goToSlide(0);
}

// ---------- ФУНКЦИИ ДЛЯ РАБОТЫ С КОНКРЕТНЫМИ СТРАНИЦАМИ ----------

function initLotPage(lotId) {
    // Если нет сессии — редирект на старт
    if (!loadState() || !state.name) {
        window.location.href = `index.html?redirect=${lotId}`;
        return;
    }

    // Если квест завершён — результат
    if (state.finished) {
        window.location.href = 'result.html';
        return;
    }

    // --- ЛОГИКА: проверяем, что лот идёт по порядку ---
    let nextLotId = null;
    for (const lot of LOTS) {
        if (!getChoiceForLot(lot.id)) {
            nextLotId = lot.id;
            break;
        }
    }

    // Если текущий лот НЕ является следующим по порядку — перенаправляем
    if (nextLotId !== null && lotId !== nextLotId) {
        alert(`🔍 Вы должны пройти лоты по порядку! Сейчас отсканируйте QR-код Лота №${nextLotId}.`);
        window.location.href = `lot${nextLotId}.html`;
        return;
    }

    // Если лот уже выбран — показываем сохранённый выбор
    const existingChoice = getChoiceForLot(lotId);
    if (existingChoice) {
        renderLotWithChoice(lotId, existingChoice);
        updateProgress();
        return;
    }

    // Обычный показ лота
    renderLot(lotId);
    updateProgress();
}

function renderLot(lotId) {
    const lot = LOTS.find(l => l.id === lotId);
    if (!lot) return;

    const container = document.getElementById('lotContainer');
    if (!container) return;

    const galleryHtml = renderGallery(lot.images, lotId);

    container.innerHTML = `
        <div class="lot-card">
            ${galleryHtml}
            <div class="lot-body">
                <div class="lot-title">${lot.title}</div>
                <div class="lot-meta">
                    <span><i class="fas fa-map-pin"></i> ${lot.location}</span>
                    <span><i class="fas fa-vector-square"></i> ${lot.area}</span>
                </div>
                <div class="lot-price"><i class="fas fa-tag"></i> ${lot.price}</div>
                <div class="lot-actions">
                    <button class="btn btn-primary" id="lotBeru"><i class="fas fa-hand-holding-usd"></i> Беру</button>
                    <button class="btn btn-secondary" id="lotMimo"><i class="fas fa-times"></i> Мимо</button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => initGallery(lotId), 50);

    document.getElementById('lotBeru').addEventListener('click', () => handleChoice(lotId, 'beru'));
    document.getElementById('lotMimo').addEventListener('click', () => handleChoice(lotId, 'mimo'));

    showHint(lotId);
}

function renderLotWithChoice(lotId, choice) {
    const lot = LOTS.find(l => l.id === lotId);
    if (!lot) return;

    const container = document.getElementById('lotContainer');
    if (!container) return;

    const choiceLabel = choice === 'beru' ? 'Беру' : 'Мимо';
    const choiceClass = choice === 'beru' ? 'choice-beru' : 'choice-mimo';

    const galleryHtml = renderGallery(lot.images, lotId);

    container.innerHTML = `
        <div class="lot-card">
            ${galleryHtml}
            <div class="lot-body">
                <div class="lot-title">${lot.title}</div>
                <div class="lot-meta">
                    <span><i class="fas fa-map-pin"></i> ${lot.location}</span>
                    <span><i class="fas fa-vector-square"></i> ${lot.area}</span>
                </div>
                <div class="lot-price"><i class="fas fa-tag"></i> ${lot.price}</div>
                <div style="margin-top:12px; background:#f0ede8; border-radius:40px; padding:8px 14px; text-align:center; font-weight:500;">
                    <i class="fas fa-check-circle" style="color:#DE1A1A;"></i>
                    Вы выбрали: <span class="choice-badge ${choiceClass}">${choiceLabel}</span>
                </div>
                <div style="margin-top:16px; padding:12px; background:#f5f2ed; border-radius:16px; text-align:center; font-size:15px; color:#4d463c;">
                    <i class="fas fa-qrcode" style="color:#DE1A1A; font-size:20px;"></i>
                    <br/>Отсканируйте QR-код следующей стойки, чтобы продолжить
                </div>
            </div>
        </div>
    `;

    setTimeout(() => initGallery(lotId), 50);
    showHint(lotId);
}

function showHint(lotId) {
    const hintContainer = document.getElementById('lotHint');
    if (!hintContainer) return;

    const done = countChoices();
    
    if (done >= 5 && isAllLotsDone()) {
        hintContainer.innerHTML = `
            🎉 Все 5 лотов пройдены! 
            <a href="result.html" style="color:#DE1A1A; font-weight:600; text-decoration:underline;">Перейти к результату →</a>
        `;
        return;
    }

    let progressText = '';
    if (done > 0) {
        const lotNames = state.choices.map(c => {
            const lot = LOTS.find(l => l.id === c.lotId);
            return `${lot ? lot.title : 'Лот ' + c.lotId} (${c.choice === 'beru' ? '✅ Беру' : '❌ Мимо'})`;
        });
        progressText = `<br/><span style="font-size:13px; color:#7a7266;">Пройдено: ${lotNames.join(' · ')}</span>`;
    }

    let nextHint = '';
    if (HINTS[lotId]) {
        nextHint = `🧭 ${HINTS[lotId]}`;
    } else {
        nextHint = '🔍 Продолжайте искать следующие стойки с QR-кодами.';
    }

    hintContainer.innerHTML = `
        ${nextHint}
        ${progressText}
    `;
}

function updateProgress() {
    const progressContainer = document.getElementById('lotProgress');
    if (!progressContainer) return;

    const done = countChoices();
    const playerName = state.name || 'Игрок';
    
    let choicesInfo = '';
    if (done > 0) {
        const choices = state.choices.map(c => {
            const emoji = c.choice === 'beru' ? '✅' : '❌';
            return `${emoji}`;
        }).join(' ');
        choicesInfo = ` ${choices}`;
    }

    const balanceText = `💰 ${new Intl.NumberFormat('ru-RU').format(state.balance)} ₽`;

    if (done >= 5) {
        progressContainer.innerHTML = `
            <span class="progress-left">
                <i class="fas fa-user"></i>
                <span class="player-name">Бизнесмен ${playerName}</span>
                <span style="color:#4d463c; font-weight:400;">|</span>
                <i class="fas fa-check-circle" style="color:#DE1A1A;"></i> Все лоты пройдены! 🎉
            </span>
            <span class="progress-right">
                <span class="badge-result">${balanceText}</span>
            </span>
        `;
    } else {
        progressContainer.innerHTML = `
            <span class="progress-left">
                <i class="fas fa-user"></i>
                <span class="player-name">Бизнесмен ${playerName}</span>
                <span style="color:#4d463c; font-weight:400;">|</span>
                <i class="fas fa-compass"></i> Собрано ${done} из 5 ${choicesInfo}
            </span>
            <span class="progress-right">
                ${done}/5 · ${balanceText}
            </span>
        `;
    }
}

function handleChoice(lotId, choice) {
    if (getChoiceForLot(lotId)) return;

    const lot = LOTS.find(l => l.id === lotId);
    
    state.choices.push({ lotId, choice });

    // --- РАСЧЁТ БАЛАНСА НА ОСНОВЕ price ---
    if (choice === 'beru' && lot) {
        const cost = calculateLotCost(lot.price);
        state.balance = Math.max(0, state.balance - cost);
    }

    saveState();

    if (isAllLotsDone()) {
        state.resultType = calculateResult();
        state.finished = true;
        saveState();
        renderLotWithChoice(lotId, choice);
        updateProgress();
        showHint(lotId);
        return;
    }

    renderLotWithChoice(lotId, choice);
    updateProgress();
    showHint(lotId);
}

// ---------- ФУНКЦИИ ДЛЯ СТРАНИЦЫ РЕЗУЛЬТАТА ----------

function initResultPage() {
    if (!loadState() || !state.name) {
        window.location.href = 'index.html';
        return;
    }

    if (!state.finished && !state.resultType) {
        if (isAllLotsDone()) {
            state.resultType = calculateResult();
            state.finished = true;
            saveState();
        } else {
            const done = countChoices();
            document.getElementById('resultContent').innerHTML = `
                <div class="text-center" style="padding:40px 0;">
                    <div style="font-size:48px;">🧭</div>
                    <h3 style="margin:16px 0;">Квест ещё не завершён</h3>
                    <p style="color:#7a7266;">Пройдено ${done} из 5 лотов</p>
                    <p style="color:#7a7266; margin-top:8px;">
                        Отсканируйте QR-коды на всех 5 стойках, чтобы получить результат
                    </p>
                    <button class="btn-start" style="margin-top:20px;" onclick="window.location.href='index.html'">
                        Вернуться на старт
                    </button>
                </div>
            `;
            return;
        }
    }

    renderResult();
}

function renderResult() {
    const res = state.resultType;
    if (!res) return;

    document.getElementById('resultType').textContent = res.type;
    document.getElementById('resultDesc').textContent = res.desc;

    const icons = {
        'Стратег': '🧐',
        'Городской предприниматель': '🏙️',
        'Консервативный скряга': '💰',
        'Рискованный стартапер': '🚀',
        'Бизнесмен-визионер': '🌟'
    };
    document.getElementById('resultBadge').textContent = icons[res.type] || '⭐';

    document.getElementById('resultBalance').textContent =
        new Intl.NumberFormat('ru-RU').format(state.balance) + ' ₽';

    const tbody = document.getElementById('resultTableBody');
    if (tbody) {
        let rows = '';
        for (const lot of LOTS) {
            const choice = getChoiceForLot(lot.id);
            const label = choice === 'beru' ? 'Беру' : choice === 'mimo' ? 'Мимо' : '—';
            const cls = choice === 'beru' ? 'choice-beru' : choice === 'mimo' ? 'choice-mimo' : '';
            rows += `
                <tr>
                    <td style="font-size:13px; max-width:160px;">${lot.title}</td>
                    <td><span class="choice-badge ${cls}">${label}</span></td>
                    <td style="font-size:13px; color:#5b554b; text-align:right;">${lot.price}</td>
                </tr>
            `;
        }
        tbody.innerHTML = rows;
    }
}

// ---------- ФУНКЦИИ ДЛЯ СТАРТОВОЙ СТРАНИЦЫ ----------

function initStartPage() {
    const hasSession = loadState() && state.name;

    const startBtn = document.getElementById('startBtn');
    const nameInput = document.getElementById('playerName');
    const startContainer = startBtn.parentNode;
    
    const extraButtons = document.querySelectorAll('.btn-start-extra');
    extraButtons.forEach(btn => btn.remove());
    
    const oldMessages = document.querySelectorAll('.start-message');
    oldMessages.forEach(msg => msg.remove());
    
    startBtn.textContent = 'Начать квест';
    startBtn.style.background = '#DE1A1A';
    startBtn.style.display = 'block';
    startBtn.disabled = false;

    if (hasSession && !state.finished && !isAllLotsDone()) {
        let nextLotId = null;
        for (const lot of LOTS) {
            if (!getChoiceForLot(lot.id)) {
                nextLotId = lot.id;
                break;
            }
        }

        if (nextLotId) {
            const message = document.createElement('div');
            message.className = 'start-message';
            message.style.cssText = `
                margin-top: 16px;
                padding: 16px;
                background: #f5f2ed;
                border-radius: 16px;
                text-align: center;
                font-size: 15px;
                color: #4d463c;
                border-left: 4px solid #DE1A1A;
            `;
            message.innerHTML = `
                <i class="fas fa-qrcode" style="color:#DE1A1A; font-size:24px; display:block; margin-bottom:8px;"></i>
                <strong>${state.name}</strong>, ваш прогресс сохранён.<br/>
                Найдите стойку с <strong>Лотом №${nextLotId}</strong> и отсканируйте QR-код, чтобы продолжить.
            `;
            startContainer.appendChild(message);

            const continueBtn = document.createElement('button');
            continueBtn.className = 'btn-start btn-start-extra';
            continueBtn.textContent = `Продолжить, ${state.name}`;
            continueBtn.style.marginTop = '10px';
            continueBtn.style.background = '#2d6b3e';
            continueBtn.style.width = '100%';
            continueBtn.style.padding = '16px';
            continueBtn.style.border = 'none';
            continueBtn.style.borderRadius = '60px';
            continueBtn.style.fontWeight = '700';
            continueBtn.style.fontSize = '18px';
            continueBtn.style.color = 'white';
            continueBtn.style.cursor = 'pointer';
            
            continueBtn.addEventListener('click', function() {
                alert(`🔍 Отсканируйте QR-код на стойке с Лотом №${nextLotId}, чтобы продолжить игру!`);
            });

            startContainer.insertBefore(continueBtn, startBtn.nextSibling);

            startBtn.textContent = 'Начать заново';
            startBtn.style.background = '#6b6b6b';
        }
    }

    const newStartBtn = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(newStartBtn, startBtn);
    
    newStartBtn.addEventListener('click', function() {
        const name = nameInput.value.trim();

        if (!name) {
            alert('Пожалуйста, введите ваше имя');
            return;
        }

        resetState();
        state.name = name;
        saveState();

        const message = document.createElement('div');
        message.className = 'start-message';
        message.style.cssText = `
            margin-top: 16px;
            padding: 16px;
            background: #f5f2ed;
            border-radius: 16px;
            text-align: center;
            font-size: 15px;
            color: #4d463c;
            border-left: 4px solid #DE1A1A;
        `;
        message.innerHTML = `
            <i class="fas fa-qrcode" style="color:#DE1A1A; font-size:24px; display:block; margin-bottom:8px;"></i>
            <strong>${name}</strong>, добро пожаловать в игру!<br/>
            Найдите стойку с <strong>Лотом №1</strong> и отсканируйте QR-код, чтобы начать.
        `;
        
        const container = newStartBtn.parentNode;
        const oldMsgs = container.querySelectorAll('.start-message');
        oldMsgs.forEach(msg => msg.remove());
        container.appendChild(message);

        newStartBtn.textContent = 'Начать заново';
        newStartBtn.style.background = '#6b6b6b';
    });

    if (state.name) {
        nameInput.value = state.name;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    if (redirect) {
        setTimeout(() => {
            const message = document.createElement('div');
            message.className = 'start-message';
            message.style.cssText = `
                margin-top: 16px;
                padding: 16px;
                background: #fff3cd;
                border-radius: 16px;
                text-align: center;
                font-size: 15px;
                color: #856404;
                border-left: 4px solid #ffc107;
            `;
            message.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color:#ffc107; font-size:24px; display:block; margin-bottom:8px;"></i>
                Чтобы открыть Лот №${redirect}, нужно сначала <strong>ввести имя</strong>.<br/>
                Введите имя и нажмите «Начать квест», затем отсканируйте QR-код на стойке.
            `;
            const container = document.querySelector('.content');
            container.appendChild(message);
        }, 100);
    }
}

// ---------- ЭКСПОРТ ----------
window.initLotPage = initLotPage;
window.initResultPage = initResultPage;
window.initStartPage = initStartPage;
window.handleChoice = handleChoice;

window.__app = { state, LOTS, HINTS, calculateLotCost, calculateResult };