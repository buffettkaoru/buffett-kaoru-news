// ============================================
// かおるのメモ帳 v2 — app.js
// 編集機能 + ゴミ箱機能を追加
// ============================================

// ============================================
// 🔧 Firebase設定
// Firebaseコンソールから取得したconfigをここに貼り付けてください
// 空白のままだとローカル保存モード（スマホ同期なし）になります
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
// カテゴリ定義 (8カテゴリー + ゴミ箱タブ)
// ============================================
const CATEGORIES = [
    { id: "immediate-todo", short: "🔥 直近",      label: "🔥 直近のやること",   type: "task", color: "#e85d04" },
    { id: "long-term-todo", short: "📅 長期",      label: "📅 長期のやること",   type: "task", color: "#4a90d9" },
    { id: "ideas",          short: "💡 アイデア",   label: "💡 アイデア",         type: "note", color: "#f5a623" },
    { id: "quotes",         short: "📖 大切な言葉", label: "📖 大切な言葉",       type: "note", color: "#27ae60" },
    { id: "family",         short: "👨‍👩‍👧 家族",      label: "👨‍👩‍👧 家族の思い出",   type: "note", color: "#c0392b" },
    { id: "study",          short: "📚 学習メモ",   label: "📚 学習メモ",         type: "note", color: "#8e44ad" },
    { id: "shopping",       short: "🛒 買い物",     label: "🛒 買い物リスト",     type: "task", color: "#16a085" },
    { id: "wishlist",       short: "🛍️ 欲しいもの", label: "🛍️ 買いたいものリスト", type: "task", color: "#d35400" },
    { id: "__trash__",      short: "🗑️ ゴミ箱",    label: "🗑️ ゴミ箱",           type: "trash", color: "#7f8c8d" },
];

// ============================================
// Google Keepから移行した初期データ
// ============================================
const SEED_DATA = [
    // 🔥 直近のやること
    { category: "immediate-todo", text: "アムスのビデオダウンロード" },
    { category: "immediate-todo", text: "YouTubeのグーグルアドセンスがどうなってるか確認" },
    { category: "immediate-todo", text: "グーグルアナリティクス:契約ブログ4つ、どれがどれか整理" },
    { category: "immediate-todo", text: "年間生活費の25倍に持ち家は入るか確認" },
    { category: "immediate-todo", text: "プライバシーポリシーをブログのフッターに入れる" },
    { category: "immediate-todo", text: "FWD収入保障保険(学長お薦め)を検討" },
    { category: "immediate-todo", text: "掛け捨て保険:ネットライフ or FWD を比較検討" },
    { category: "immediate-todo", text: "確定申告の整理:支払い手数料・研究費・研修費・経費・給与・会議費・交通費" },

    // 📅 長期のやること
    { category: "long-term-todo", text: "MacBook Air M1チップ以上(13インチ)購入検討\n値段によってはM2・M3は不要。アップルサポートで質問可能" },
    { category: "long-term-todo", text: "格安スマホへの乗り換え検討\n日本通信 or 楽天モバイル。1人2Gあれば十分(クイックペイかidで支払い)" },

    // 📖 大切な言葉
    { category: "quotes", text: "落ちていくことが悪でもなく、上がっていくことが善でもない" },
    { category: "quotes", text: "チャンスの神様は前髪しかない\n— ギリシャ神話のカイロ" },
    { category: "quotes", text: "明日やろうはバカやろう" },
    { category: "quotes", text: "どう思われたいかで生きるのではなく、\nどうありたいか、で生きる哲学" },
    { category: "quotes", text: "情報は欲望の母" },
    { category: "quotes", text: "自己表現は自己治癒。\n満点取れなかった批判され続けたじぶんを、助けに行く旅" },
    { category: "quotes", text: "死ぬことに比べれば大丈夫\n— 父の言葉" },
    { category: "quotes", text: "学びは力になり、知識は武器になる\n— 父の言葉" },
    { category: "quotes", text: "自分を受け入れると相手を許せる、らくになれる\n— 父の言葉" },
    { category: "quotes", text: "人が持てる3つの資本\n①金融資本　②人的資本　③社会資本" },
    { category: "quotes", text: "BIG FIVE・ストレングスファインダー\n— 思考の癖に気づくことの大切さ" },
    { category: "quotes", text: "セールスで一番最初のお客様は自分だから、\n自分が感動して心が震えるものを売ること" },

    // 👨‍👩‍👧 家族の思い出
    { category: "family", text: "母・***:56才まで***で働いていた" },
    { category: "family", text: "母・***:44才から***。\nその前は***で3年、8時〜13時の5時間勤務" },
    { category: "family", text: "母の遺言:知恵と知識を残すことが大事。\n学ぶこと・人と会うこと" },
    { category: "family", text: "母の言葉:ないではなく「ある」に視点を置く。\n右手を失えば左手がある、左手を失えば足がある、足を失えば口がある。\n自分の可能性を最大限に活かして" },
    { category: "family", text: "母の言葉:悪い時ばかりじゃない、いつかいい時がある" },
    { category: "family", text: "父の言葉:幸せな家庭にする為に自分は何ができるか?を常に考える" },
    { category: "family", text: "父の言葉:幸せな夕飯のためにできることを具体的にやっていく" },

    // 📚 学習メモ
    { category: "study", text: "Claude Code活用法\n税理士・弁護士・会計士・FP の4人を配属 → 出力時に自動チェック → 回答精度が劇的向上" },
    { category: "study", text: "WEB用語まとめ\n・リスティング広告＝ググった時に「スポンサー」と出るもの\n・MEO＝地図でのSEO\n・インプレッション＝表示回数\n・リーチ数＝何人に表示されたか\n・フリークエンシー＝1人あたりの表示回数\n・コンバージョン＝成果のこと\n・メタディスクリプション＝検索結果に出る文字" },
    { category: "study", text: "参考サイト\nイケサイ / SANKO / WAY BACK MACHINE / eMaRl / similarweb / ウーバーサジェスト(有料)/ ネトラボ" },
    { category: "study", text: "コンテンツ作成:prep法\n結論 → 理由 → 具体例 → 結論 の順で書く" },
    { category: "study", text: "マーケティングの基本\n・ペルソナを作って拡散すると3倍の力がある\n・マーケティングはデジタル化してきている\n・パーミッションデータ・データメディアが大事な時代" },
];

// ============================================
// アプリ状態
// ============================================
let currentCategory = "immediate-todo";
let items = [];
let useFirebase = false;
let firestoreDb = null;
let showCompleted = false;
let editingId = null;

const STORAGE_KEY = 'kaoru-notes-v1';

// ============================================
// 初期化
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    displayDate();
    buildTabs();
    setupTextarea();

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
// 日付表示
// ============================================
function displayDate() {
    const d = new Date();
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    const str = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}(${weekDays[d.getDay()]})`;
    document.getElementById('today-date').textContent = str;
}

function pad(n) {
    return String(n).padStart(2, '0');
}

function formatDate(d) {
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

// ============================================
// タブ生成
// ============================================
function buildTabs() {
    const wrapper = document.getElementById('tabs-wrapper');
    wrapper.innerHTML = '';
    CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'tab' + (cat.id === currentCategory ? ' active' : '');
        btn.dataset.category = cat.id;
        btn.style.setProperty('--cat-color', cat.color);

        const shortText = document.createElement('span');
        shortText.textContent = cat.short;
        btn.appendChild(shortText);

        if (cat.id === '__trash__') {
            const badge = document.createElement('span');
            badge.className = 'trash-count-badge';
            badge.id = 'trash-count-badge';
            badge.textContent = '0';
            btn.appendChild(badge);
        }

        btn.onclick = () => selectCategory(cat.id);
        wrapper.appendChild(btn);
    });
    updateTrashBadge();
}

function selectCategory(categoryId) {
    currentCategory = categoryId;
    showCompleted = false;
    editingId = null;
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.category === categoryId);
    });
    const footer = document.getElementById('add-footer');
    if (categoryId === '__trash__') {
        footer.style.display = 'none';
    } else {
        footer.style.display = 'block';
    }
    renderItems();
}

function updateTrashBadge() {
    const badge = document.getElementById('trash-count-badge');
    if (!badge) return;
    const count = items.filter(i => i.trashed).length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
}

// ============================================
// ローカルストレージモード
// ============================================
function initLocal() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            items = JSON.parse(stored);
            items.forEach(item => {
                if (typeof item.trashed === 'undefined') item.trashed = false;
                if (typeof item.trashedAt === 'undefined') item.trashedAt = null;
                if (typeof item.updatedAt === 'undefined') item.updatedAt = item.ts || Date.now();
            });
        } catch (_) {
            items = buildSeedItems();
            saveLocal();
        }
    } else {
        items = buildSeedItems();
        saveLocal();
    }
    renderItems();
}

function buildSeedItems() {
    const today = formatDate(new Date());
    const now = Date.now();
    return SEED_DATA.map((d, i) => ({
        id: 'loc-' + (now + i),
        category: d.category,
        text: d.text,
        completed: false,
        trashed: false,
        trashedAt: null,
        date: today,
        ts: now + i,
        updatedAt: now + i
    }));
}

function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ============================================
// Firebase モード
// ============================================
async function initFirebase() {
    try {
        const snap = await firestoreDb.collection('notes').limit(1).get();
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
    const today = formatDate(new Date());
    const batch = firestoreDb.batch();
    const now = Date.now();
    SEED_DATA.forEach((d, i) => {
        const ref = firestoreDb.collection('notes').doc();
        batch.set(ref, {
            category: d.category,
            text: d.text,
            completed: false,
            trashed: false,
            trashedAt: null,
            date: today,
            ts: now - i * 100,
            updatedAt: now - i * 100
        });
    });
    await batch.commit();
}

function startListener() {
    firestoreDb.collection('notes')
        .orderBy('ts', 'desc')
        .onSnapshot(snapshot => {
            items = snapshot.docs.map(doc => {
                const data = { id: doc.id, ...doc.data() };
                if (typeof data.trashed === 'undefined') data.trashed = false;
                return data;
            });
            renderItems();
        }, err => {
            console.error("リスナーエラー:", err);
        });
}

// ============================================
// 項目の追加
// ============================================
function setupTextarea() {
    const ta = document.getElementById('new-item-text');
    ta.addEventListener('input', () => {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 110) + 'px';
    });
    ta.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            addItem();
        }
    });
}

async function addItem() {
    const ta = document.getElementById('new-item-text');
    const text = ta.value.trim();
    if (!text) return;
    if (currentCategory === '__trash__') return;

    const today = formatDate(new Date());
    const now = Date.now();
    const newItem = {
        category: currentCategory,
        text,
        completed: false,
        trashed: false,
        trashedAt: null,
        date: today,
        ts: now,
        updatedAt: now
    };

    ta.value = '';
    ta.style.height = 'auto';
    ta.blur();

    if (useFirebase && firestoreDb) {
        await firestoreDb.collection('notes').add(newItem);
    } else {
        newItem.id = 'loc-' + now;
        items.unshift(newItem);
        saveLocal();
        renderItems();
    }
}

// ============================================
// チェック切り替え
// ============================================
async function toggleComplete(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const next = !item.completed;

    if (useFirebase && firestoreDb) {
        await firestoreDb.collection('notes').doc(id).update({ completed: next });
    } else {
        item.completed = next;
        saveLocal();
        renderItems();
    }
}

// ============================================
// ゴミ箱に入れる (削除 = ゴミ箱行き)
// ============================================
async function deleteItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (!confirm('この項目をゴミ箱に移動しますか?')) return;

    const now = Date.now();
    if (useFirebase && firestoreDb) {
        await firestoreDb.collection('notes').doc(id).update({
            trashed: true,
            trashedAt: now
        });
    } else {
        item.trashed = true;
        item.trashedAt = now;
        saveLocal();
        renderItems();
    }
}

// ============================================
// ゴミ箱から復元
// ============================================
async function restoreItem(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (useFirebase && firestoreDb) {
        await firestoreDb.collection('notes').doc(id).update({
            trashed: false,
            trashedAt: null
        });
    } else {
        item.trashed = false;
        item.trashedAt = null;
        saveLocal();
        renderItems();
    }
}

// ============================================
// 完全削除
// ============================================
async function deleteForever(id) {
    if (!confirm('この項目を完全に削除しますか?\nこの操作は取り消せません。')) return;
    if (useFirebase && firestoreDb) {
        await firestoreDb.collection('notes').doc(id).delete();
    } else {
        items = items.filter(i => i.id !== id);
        saveLocal();
        renderItems();
    }
}

// ============================================
// ゴミ箱を空にする
// ============================================
async function emptyTrash() {
    const trashItems = items.filter(i => i.trashed);
    if (trashItems.length === 0) return;
    if (!confirm(`ゴミ箱の ${trashItems.length} 件を完全に削除しますか?\nこの操作は取り消せません。`)) return;

    if (useFirebase && firestoreDb) {
        const batch = firestoreDb.batch();
        trashItems.forEach(item => {
            batch.delete(firestoreDb.collection('notes').doc(item.id));
        });
        await batch.commit();
    } else {
        items = items.filter(i => !i.trashed);
        saveLocal();
        renderItems();
    }
}

// ============================================
// 編集開始
// ============================================
function startEdit(id) {
    editingId = id;
    renderItems();
    setTimeout(() => {
        const ta = document.getElementById('edit-textarea-' + id);
        if (ta) {
            ta.focus();
            ta.setSelectionRange(ta.value.length, ta.value.length);
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
        }
    }, 0);
}

async function saveEdit(id) {
    const ta = document.getElementById('edit-textarea-' + id);
    if (!ta) return;
    const newText = ta.value.trim();
    if (!newText) {
        alert('テキストが空です');
        return;
    }
    const item = items.find(i => i.id === id);
    if (!item) return;
    const now = Date.now();

    if (useFirebase && firestoreDb) {
        await firestoreDb.collection('notes').doc(id).update({
            text: newText,
            updatedAt: now
        });
        editingId = null;
    } else {
        item.text = newText;
        item.updatedAt = now;
        editingId = null;
        saveLocal();
        renderItems();
    }
}

function cancelEdit() {
    editingId = null;
    renderItems();
}

// ============================================
// 描画
// ============================================
function renderItems() {
    updateTrashBadge();

    const listEl = document.getElementById('items-list');
    const completedSection = document.getElementById('completed-section');
    const trashSection = document.getElementById('trash-section');

    if (currentCategory === '__trash__') {
        listEl.innerHTML = '';
        completedSection.style.display = 'none';
        trashSection.style.display = 'block';
        renderTrash();
        return;
    }

    trashSection.style.display = 'none';

    const cat = CATEGORIES.find(c => c.id === currentCategory);
    const isTask = cat && cat.type === 'task';

    const catItems = items.filter(i => i.category === currentCategory && !i.trashed);
    const active = catItems.filter(i => !i.completed);
    const done = catItems.filter(i => i.completed);

    listEl.innerHTML = '';
    if (active.length === 0) {
        listEl.innerHTML = '<div class="empty-message">まだ何もありません。<br>下の入力欄から追加してください。</div>';
    } else {
        active.forEach(item => listEl.appendChild(makeCard(item, isTask, cat)));
    }

    const countEl = document.getElementById('completed-count');
    if (isTask && done.length > 0) {
        completedSection.style.display = 'block';
        countEl.textContent = done.length;
        const btn = document.getElementById('toggle-completed-btn');
        const completedList = document.getElementById('completed-list');
        if (showCompleted) {
            btn.innerHTML = `▲ 完了済みを非表示(<span id="completed-count">${done.length}</span>件)`;
            completedList.style.display = 'block';
            completedList.innerHTML = '';
            done.forEach(item => completedList.appendChild(makeCard(item, isTask, cat)));
        } else {
            btn.innerHTML = `✅ 完了済みを表示(<span id="completed-count">${done.length}</span>件)`;
            completedList.style.display = 'none';
        }
    } else {
        completedSection.style.display = 'none';
    }
}

function renderTrash() {
    const trashList = document.getElementById('trash-list');
    const trashed = items.filter(i => i.trashed)
        .sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0));

    trashList.innerHTML = '';

    if (trashed.length === 0) {
        trashList.innerHTML = '<div class="empty-message">ゴミ箱は空です</div>';
        return;
    }

    trashed.forEach(item => {
        trashList.appendChild(makeTrashCard(item));
    });
}

function makeCard(item, isTask, cat) {
    if (editingId === item.id) {
        return makeEditCard(item);
    }

    const div = document.createElement('div');
    div.className = 'item-card' + (item.completed ? ' completed' : '');

    if (isTask) {
        const left = document.createElement('div');
        left.className = 'item-left';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = item.completed;
        cb.className = 'item-checkbox';
        if (cat) cb.style.setProperty('--cat-color', cat.color);
        cb.onchange = () => toggleComplete(item.id);
        left.appendChild(cb);
        div.appendChild(left);
    }

    const body = document.createElement('div');
    body.className = 'item-body';

    const textEl = document.createElement('div');
    textEl.className = 'item-text';
    textEl.textContent = item.text;

    const dateEl = document.createElement('div');
    dateEl.className = 'item-date';
    let dateText = item.date || '';
    if (item.updatedAt && item.ts && item.updatedAt !== item.ts) {
        const d = new Date(item.updatedAt);
        dateText += ` ・ ✏️ ${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} 編集`;
    }
    dateEl.textContent = dateText;

    body.appendChild(textEl);
    body.appendChild(dateEl);
    div.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.textContent = '✏️';
    editBtn.title = '編集';
    editBtn.onclick = e => { e.stopPropagation(); startEdit(item.id); };
    actions.appendChild(editBtn);

    const del = document.createElement('button');
    del.className = 'action-btn delete-btn';
    del.textContent = '🗑️';
    del.title = 'ゴミ箱へ';
    del.onclick = e => { e.stopPropagation(); deleteItem(item.id); };
    actions.appendChild(del);

    div.appendChild(actions);

    return div;
}

function makeEditCard(item) {
    const div = document.createElement('div');
    div.className = 'item-card edit-mode';

    const body = document.createElement('div');
    body.className = 'item-body';
    body.style.width = '100%';

    const ta = document.createElement('textarea');
    ta.id = 'edit-textarea-' + item.id;
    ta.className = 'edit-textarea';
    ta.value = item.text;
    ta.addEventListener('input', () => {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
    });
    ta.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            saveEdit(item.id);
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
    body.appendChild(ta);

    const btnRow = document.createElement('div');
    btnRow.className = 'edit-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'キャンセル';
    cancelBtn.onclick = () => cancelEdit();
    btnRow.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-btn';
    saveBtn.textContent = '保存';
    saveBtn.onclick = () => saveEdit(item.id);
    btnRow.appendChild(saveBtn);

    body.appendChild(btnRow);
    div.appendChild(body);
    return div;
}

function makeTrashCard(item) {
    const div = document.createElement('div');
    div.className = 'item-card trash-card';

    const body = document.createElement('div');
    body.className = 'item-body';

    const cat = CATEGORIES.find(c => c.id === item.category);
    const catLabel = document.createElement('div');
    catLabel.className = 'trash-cat-label';
    catLabel.textContent = cat ? cat.short : item.category;
    body.appendChild(catLabel);

    const textEl = document.createElement('div');
    textEl.className = 'item-text';
    textEl.textContent = item.text;
    body.appendChild(textEl);

    const dateEl = document.createElement('div');
    dateEl.className = 'item-date';
    if (item.trashedAt) {
        const d = new Date(item.trashedAt);
        dateEl.textContent = `🗑️ ${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} に削除`;
    }
    body.appendChild(dateEl);

    div.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'action-btn restore-btn';
    restoreBtn.textContent = '↩️ 復元';
    restoreBtn.title = '復元';
    restoreBtn.onclick = e => { e.stopPropagation(); restoreItem(item.id); };
    actions.appendChild(restoreBtn);

    const forever = document.createElement('button');
    forever.className = 'action-btn delete-forever-btn';
    forever.textContent = '完全削除';
    forever.title = '完全に削除';
    forever.onclick = e => { e.stopPropagation(); deleteForever(item.id); };
    actions.appendChild(forever);

    div.appendChild(actions);
    return div;
}

// ============================================
// 完了済みの表示切り替え
// ============================================
function toggleCompleted() {
    showCompleted = !showCompleted;
    renderItems();
}

// ============================================
// Firebase バナー・モーダル
// ============================================
function showBanner() {
    document.getElementById('firebase-banner').style.display = 'block';
}

function showFirebaseHelp() {
    document.getElementById('firebase-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('firebase-modal').style.display = 'none';
}

function closeModalOutside(e) {
    if (e.target === document.getElementById('firebase-modal')) {
        closeModal();
    }
}
