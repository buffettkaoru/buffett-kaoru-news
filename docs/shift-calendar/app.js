// ============================================
// シフトカレンダー — app.js
// ============================================

// ============================================
// 🔧 Firebase設定 (空白のままだとローカル保存)
// ============================================
const FIREBASE_CONFIG = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

// ============================================
// 初期データ (4210.rfshift.jp から取り込んだシフト)
// 2026/05/01 〜 05/15
// ============================================
const SEED_SHIFTS = {
    "2026-05-03": { start: "09:30", end: "11:30" },
    "2026-05-12": { start: "16:30", end: "18:30" },
    "2026-05-13": { start: "12:00", end: "14:00" }
};

// ============================================
// 状態
// ============================================
const STORAGE_KEY = 'kaoru-shifts-v1';
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

let viewYear = 2026;
let viewMonth = 5; // 1-indexed
let shifts = {};   // { "YYYY-MM-DD": { start, end } }
let useFirebase = false;
let firestoreDb = null;
let editTargetDate = null;

// ============================================
// 初期化
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    viewYear = today.getFullYear();
    viewMonth = today.getMonth() + 1;

    displayTodayLabel();

    useFirebase = FIREBASE_CONFIG.apiKey !== "";

    if (useFirebase && typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            firestoreDb = firebase.firestore();
            initFirebase();
        } catch (e) {
            console.error("Firebase初期化エラー:", e);
            useFirebase = false;
            showBanner();
            initLocal();
        }
    } else {
        useFirebase = false;
        showBanner();
        initLocal();
    }
});

// ============================================
// 日付ユーティリティ
// ============================================
function pad(n) { return String(n).padStart(2, '0'); }

function dateKey(year, month, day) {
    return `${year}-${pad(month)}-${pad(day)}`;
}

function displayTodayLabel() {
    const d = new Date();
    const str = `今日 ${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}(${WEEKDAYS[d.getDay()]})`;
    document.getElementById('today-label').textContent = str;
}

function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

// ============================================
// ローカルストレージ
// ============================================
function initLocal() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            shifts = JSON.parse(stored);
        } catch (_) {
            shifts = { ...SEED_SHIFTS };
            saveLocal();
        }
    } else {
        shifts = { ...SEED_SHIFTS };
        saveLocal();
    }
    jumpToRelevantMonth();
    render();
}

// 今月にシフトが無く、未来にシフトがあればその月を初期表示する
function jumpToRelevantMonth() {
    const today = new Date();
    const monthPrefix = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-`;
    const todayKey = dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const hasThisMonth = Object.keys(shifts).some(k => k.startsWith(monthPrefix));
    if (hasThisMonth) return;
    const upcoming = Object.keys(shifts)
        .filter(k => k >= todayKey)
        .sort()[0];
    if (upcoming) {
        const [y, m] = upcoming.split('-').map(Number);
        viewYear = y;
        viewMonth = m;
    }
}

function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
}

// ============================================
// Firebase
// ============================================
async function initFirebase() {
    try {
        const snap = await firestoreDb.collection('shifts').limit(1).get();
        if (snap.empty) {
            await seedFirebase();
        }
        startListener();
    } catch (e) {
        console.error("Firestore接続エラー:", e);
        useFirebase = false;
        showBanner();
        initLocal();
    }
}

async function seedFirebase() {
    const batch = firestoreDb.batch();
    Object.entries(SEED_SHIFTS).forEach(([key, val]) => {
        const ref = firestoreDb.collection('shifts').doc(key);
        batch.set(ref, val);
    });
    await batch.commit();
}

function startListener() {
    let firstSnapshot = true;
    firestoreDb.collection('shifts').onSnapshot(snapshot => {
        shifts = {};
        snapshot.forEach(doc => {
            shifts[doc.id] = doc.data();
        });
        if (firstSnapshot) {
            firstSnapshot = false;
            jumpToRelevantMonth();
        }
        render();
    }, err => {
        console.error("リスナーエラー:", err);
    });
}

// ============================================
// 月の切り替え
// ============================================
function changeMonth(delta) {
    viewMonth += delta;
    if (viewMonth < 1) {
        viewMonth = 12;
        viewYear -= 1;
    } else if (viewMonth > 12) {
        viewMonth = 1;
        viewYear += 1;
    }
    render();
}

function goToToday() {
    const d = new Date();
    viewYear = d.getFullYear();
    viewMonth = d.getMonth() + 1;
    render();
}

// ============================================
// 描画
// ============================================
function render() {
    document.getElementById('month-label').textContent = `${viewYear}年${viewMonth}月`;
    renderGrid();
    renderSummary();
    renderExport();
}

function renderGrid() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const startWeekday = firstDay.getDay();
    const totalDays = daysInMonth(viewYear, viewMonth);

    const today = new Date();
    const todayKey = dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

    // 前月の埋め草
    for (let i = 0; i < startWeekday; i++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell empty';
        grid.appendChild(cell);
    }

    for (let day = 1; day <= totalDays; day++) {
        const key = dateKey(viewYear, viewMonth, day);
        const weekday = (startWeekday + day - 1) % 7;
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (weekday === 0) cell.classList.add('sun');
        if (weekday === 6) cell.classList.add('sat');
        if (key === todayKey) cell.classList.add('today');

        const numWrap = document.createElement('div');
        numWrap.className = 'day-num-wrap';
        const num = document.createElement('span');
        num.className = 'day-num';
        num.textContent = day;
        const wd = document.createElement('span');
        wd.className = 'day-wd';
        wd.textContent = `(${WEEKDAYS[weekday]})`;
        numWrap.appendChild(num);
        numWrap.appendChild(wd);
        cell.appendChild(numWrap);

        const shift = shifts[key];
        const slot = document.createElement('div');
        slot.className = 'shift-slot';
        if (shift) {
            if (shift.off) {
                slot.classList.add('off');
                slot.textContent = '休み';
            } else if (shift.start && shift.end) {
                slot.classList.add('work');
                slot.innerHTML = `<span>${shift.start}</span><span>${shift.end}</span>`;
            }
        }
        cell.appendChild(slot);

        cell.onclick = () => openModal(key);
        grid.appendChild(cell);
    }

    // 後ろの埋め草で6週分まで埋める
    const filled = startWeekday + totalDays;
    const rows = Math.ceil(filled / 7);
    const trailing = rows * 7 - filled;
    for (let i = 0; i < trailing; i++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell empty';
        grid.appendChild(cell);
    }
}

function renderSummary() {
    const list = document.getElementById('summary-list');
    list.innerHTML = '';

    const prefix = `${viewYear}-${pad(viewMonth)}-`;
    const monthShifts = Object.entries(shifts)
        .filter(([k, v]) => k.startsWith(prefix) && !v.off && v.start && v.end)
        .sort();

    document.getElementById('summary-title').textContent = `${viewYear}年${viewMonth}月のシフト（${monthShifts.length}件）`;

    if (monthShifts.length === 0) {
        list.innerHTML = '<div class="empty-summary">この月はまだシフトが入っていません</div>';
        return;
    }

    monthShifts.forEach(([key, shift]) => {
        const [, , dayStr] = key.split('-');
        const day = parseInt(dayStr, 10);
        const wd = new Date(viewYear, viewMonth - 1, day).getDay();

        const row = document.createElement('div');
        row.className = 'summary-row';
        if (wd === 0) row.classList.add('sun');
        if (wd === 6) row.classList.add('sat');

        const dateEl = document.createElement('div');
        dateEl.className = 'summary-date';
        dateEl.textContent = `${viewMonth}/${day}(${WEEKDAYS[wd]})`;

        const timeEl = document.createElement('div');
        timeEl.className = 'summary-time';
        timeEl.textContent = `${shift.start} 〜 ${shift.end}`;

        const dur = durationHours(shift.start, shift.end);
        const durEl = document.createElement('div');
        durEl.className = 'summary-dur';
        durEl.textContent = `${dur}h`;

        row.appendChild(dateEl);
        row.appendChild(timeEl);
        row.appendChild(durEl);
        row.onclick = () => openModal(key);
        list.appendChild(row);
    });

    const totalMin = monthShifts.reduce((acc, [, s]) => acc + diffMinutes(s.start, s.end), 0);
    const totalH = Math.floor(totalMin / 60);
    const totalM = totalMin % 60;
    const total = document.createElement('div');
    total.className = 'summary-total';
    total.textContent = `合計：${totalH}時間${totalM > 0 ? totalM + '分' : ''}`;
    list.appendChild(total);
}

function diffMinutes(start, end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
}

function durationHours(start, end) {
    const min = diffMinutes(start, end);
    if (min % 60 === 0) return String(min / 60);
    return (min / 60).toFixed(1);
}

// ============================================
// モーダル
// ============================================
function openModal(key) {
    editTargetDate = key;
    const [y, m, d] = key.split('-').map(Number);
    const wd = new Date(y, m - 1, d).getDay();
    document.getElementById('edit-target-date').textContent = `${y}/${m}/${d}(${WEEKDAYS[wd]})`;

    const existing = shifts[key];
    if (existing && !existing.off && existing.start) {
        document.getElementById('edit-start').value = existing.start;
        document.getElementById('edit-end').value = existing.end;
    } else {
        document.getElementById('edit-start').value = '';
        document.getElementById('edit-end').value = '';
    }
    document.getElementById('edit-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('edit-modal').style.display = 'none';
    editTargetDate = null;
}

function closeModalOutside(e) {
    if (e.target === document.getElementById('edit-modal')) {
        closeModal();
    }
}

async function saveShift() {
    if (!editTargetDate) return;
    const start = document.getElementById('edit-start').value;
    const end = document.getElementById('edit-end').value;

    if (!start || !end) {
        alert('開始時刻と終了時刻を入力してください');
        return;
    }
    if (diffMinutes(start, end) <= 0) {
        alert('終了時刻は開始時刻より後にしてください');
        return;
    }

    await writeShift(editTargetDate, { start, end });
    closeModal();
}

async function setOff() {
    if (!editTargetDate) return;
    await writeShift(editTargetDate, { off: true });
    closeModal();
}

async function clearShift() {
    if (!editTargetDate) return;
    await deleteShift(editTargetDate);
    closeModal();
}

async function writeShift(key, value) {
    if (useFirebase && firestoreDb) {
        await firestoreDb.collection('shifts').doc(key).set(value);
    } else {
        shifts[key] = value;
        saveLocal();
        render();
    }
}

async function deleteShift(key) {
    if (useFirebase && firestoreDb) {
        await firestoreDb.collection('shifts').doc(key).delete();
    } else {
        delete shifts[key];
        saveLocal();
        render();
    }
}

// ============================================
// iPhone カレンダーへエクスポート (.ics)
// ============================================
function buildIcs() {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Kaoru//Shift Calendar//JA',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:パートのシフト',
        'X-WR-TIMEZONE:Asia/Tokyo',
        'BEGIN:VTIMEZONE',
        'TZID:Asia/Tokyo',
        'BEGIN:STANDARD',
        'DTSTART:19700101T000000',
        'TZOFFSETFROM:+0900',
        'TZOFFSETTO:+0900',
        'TZNAME:JST',
        'END:STANDARD',
        'END:VTIMEZONE'
    ];

    const stamp = icsStampNow();
    const entries = Object.entries(shifts)
        .filter(([, v]) => !v.off && v.start && v.end)
        .sort();

    entries.forEach(([key, v]) => {
        const [y, m, d] = key.split('-');
        const [sh, sm] = v.start.split(':');
        const [eh, em] = v.end.split(':');
        const dtStart = `${y}${m}${d}T${sh}${sm}00`;
        const dtEnd = `${y}${m}${d}T${eh}${em}00`;
        lines.push(
            'BEGIN:VEVENT',
            `UID:shift-${key}@kaoru.local`,
            `DTSTAMP:${stamp}`,
            `DTSTART;TZID=Asia/Tokyo:${dtStart}`,
            `DTEND;TZID=Asia/Tokyo:${dtEnd}`,
            'SUMMARY:パート',
            `DESCRIPTION:シフト ${v.start}〜${v.end}`,
            'END:VEVENT'
        );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

function icsStampNow() {
    const d = new Date();
    return d.getUTCFullYear() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) + 'T' +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) + 'Z';
}

function exportToCalendar() {
    const entries = Object.entries(shifts).filter(([, v]) => !v.off && v.start && v.end);
    if (entries.length === 0) {
        alert('登録されているシフトがありません');
        return;
    }
    const ics = buildIcs();
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'shifts.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ============================================
// Googleカレンダー用 URL を作る
// ============================================
function googleCalendarUrl(key, shift) {
    const [y, m, d] = key.split('-');
    const dtStart = `${y}${m}${d}T${shift.start.replace(':', '')}00`;
    const dtEnd   = `${y}${m}${d}T${shift.end.replace(':', '')}00`;
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: 'パート',
        dates: `${dtStart}/${dtEnd}`,
        ctz: 'Asia/Tokyo',
        details: `シフト ${shift.start}〜${shift.end}`
    });
    return 'https://calendar.google.com/calendar/render?' + params.toString();
}

function renderExport() {
    const list = document.getElementById('export-list');
    if (!list) return;
    list.innerHTML = '';

    const today = new Date();
    const todayKey = dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

    const entries = Object.entries(shifts)
        .filter(([k, v]) => !v.off && v.start && v.end && k >= todayKey)
        .sort();

    if (entries.length === 0) {
        list.innerHTML = '<div class="export-empty">これから先のシフトはありません</div>';
        return;
    }

    entries.forEach(([key, v]) => {
        const [y, m, d] = key.split('-').map(Number);
        const wd = new Date(y, m - 1, d).getDay();
        const a = document.createElement('a');
        a.className = 'gcal-btn';
        if (wd === 0) a.classList.add('sun');
        if (wd === 6) a.classList.add('sat');
        a.href = googleCalendarUrl(key, v);
        a.target = '_blank';
        a.rel = 'noopener';
        a.innerHTML =
            `<span class="gcal-date">${m}/${d}(${WEEKDAYS[wd]})</span>` +
            `<span class="gcal-time">${v.start}〜${v.end}</span>` +
            `<span class="gcal-add">＋追加</span>`;
        list.appendChild(a);
    });
}

// ============================================
// バナー
// ============================================
function showBanner() {
    document.getElementById('firebase-banner').style.display = 'block';
}
