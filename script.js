// ===================================
//   剣の道 ～ Firebase対応版 ～
//   script.js
// ===================================

// --- Firebase インポート（CDN版）---
import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Firebase 設定（firebase-config.js の中身をここに直接書く）---
// ※ firebase-config.js は削除してOKです
const firebaseConfig = {
  apiKey:            "AIzaSyCvUBddzLHVqin5hlRzGHpMjjryAPhT7Qs",
  authDomain:        "suburitest.firebaseapp.com",
  projectId:         "suburitest",
  storageBucket:     "suburitest.firebasestorage.app",
  messagingSenderId: "354625246628",
  appId:             "1:354625246628:web:1d13b4206d39f6585cdd31",
  measurementId:     "G-D4NSRRMPRG"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// --- 端末ごとのID生成（ログインなし版）---
function getDeviceId() {
  let id = localStorage.getItem("kendo_device_id");
  if (!id) {
    id = "device_" + Math.random().toString(36).slice(2);
    localStorage.setItem("kendo_device_id", id);
  }
  return id;
}
const DEVICE_ID = getDeviceId();

// ===================================
//   称号・武器 定義
// ===================================

const RANKS = [
  { min: 0,   name: "ただの村人",     icon: "🌾", flavor: "「まだ木刀も重そうだな…」",        rankClass: "rank-0", nextAt: 50   },
  { min: 50,  name: "流浪の剣客",     icon: "⚔️", flavor: "「腕は立つが、まだ荒削りよ」",    rankClass: "rank-1", nextAt: 100  },
  { min: 100, name: "修羅の兵法者",   icon: "🔥", flavor: "「その眼…只者ではないな」",        rankClass: "rank-2", nextAt: 500  },
  { min: 500, name: "天下無双の剣豪", icon: "👑", flavor: "「もはや語る言葉もない……」",       rankClass: "rank-3", nextAt: null }
];

const WEAPONS = [
  { id: 0, name: "なまくら",     grade: "並",   gradeClass: "grade-common", icon: "🗡️", unlockAt: 0,    flavor: "「刃こぼれだらけ…それでも振り続ければ腕は磨かれる」", bonusEvery: null, effectText: "特殊効果なし" },
  { id: 1, name: "練習木刀",     grade: "並",   gradeClass: "grade-common", icon: "🪵", unlockAt: 50,   flavor: "「木刀の素振りが、剣の礎となる」",                       bonusEvery: null, effectText: "特殊効果なし" },
  { id: 2, name: "打刀",         grade: "上",   gradeClass: "grade-upper",  icon: "⚔️", unlockAt: 200,  flavor: "「ようやく刀を握る資格を得たな」",                       bonusEvery: 10,   effectText: "10振りに1回 気合いの一振り（+1）" },
  { id: 3, name: "業物",         grade: "業物", gradeClass: "grade-waza",   icon: "✨", unlockAt: 500,  flavor: "「名工の魂が宿る一振り…」",                             bonusEvery: 5,    effectText: "5振りに1回 気合いの一振り（+1）" },
  { id: 4, name: "大業物",       grade: "大業物", gradeClass: "grade-owaza", icon: "⚡", unlockAt: 1000, flavor: "「天下に名を轟かす名刀よ」",                             bonusEvery: 3,    effectText: "3振りに1回 気合いの一振り（+1）" },
  { id: 5, name: "妖刀・鬼断ち", grade: "妖刀", gradeClass: "grade-cursed", icon: "🔮", unlockAt: 2000, flavor: "「この刀には怨念が宿る……振るうたびに力が増す」",         bonusEvery: 2,    effectText: "2振りに1回 気合いの一振り（+1）" }
];

// ===================================
//   ステート（localStorageは補助的に使用）
// ===================================

let totalCount      = 0;
let todayCount      = parseInt(localStorage.getItem("kendo_today")     || "0");
let streak          = parseInt(localStorage.getItem("kendo_streak")    || "0");
let bestCount       = 0;
let currentWeaponId = parseInt(localStorage.getItem("kendo_weapon")    || "0");
let swingCtr        = parseInt(localStorage.getItem("kendo_swing_ctr") || "0");

// 日付チェック（今日のカウントリセット）
(function checkDate() {
  const today = new Date().toDateString();
  const savedDate = localStorage.getItem("kendo_date");
  if (savedDate !== today) {
    if (savedDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      streak = (savedDate === yesterday.toDateString() && todayCount > 0) ? streak + 1 : 0;
    }
    todayCount = 0;
    localStorage.setItem("kendo_date",   today);
    localStorage.setItem("kendo_today",  "0");
    localStorage.setItem("kendo_streak", String(streak));
  }
})();

// ===================================
//   DOM取得
// ===================================

const countDisplay       = document.getElementById("countDisplay");
const titleText          = document.getElementById("titleText");
const titleIcon          = document.getElementById("titleIcon");
const titleFlavor        = document.getElementById("titleFlavor");
const progressBar        = document.getElementById("progressBar");
const progressLabel      = document.getElementById("progressLabel");
const todayEl            = document.getElementById("todayCount");
const streakEl           = document.getElementById("streakCount");
const bestEl             = document.getElementById("bestCount");
const swingBtn           = document.getElementById("swingBtn");
const resetBtn           = document.getElementById("resetBtn");
const rankupModal        = document.getElementById("rankupModal");
const rankupIcon         = document.getElementById("rankupIcon");
const rankupTitle        = document.getElementById("rankupTitle");
const rankupMsg          = document.getElementById("rankupMsg");
const weaponIcon         = document.getElementById("weaponIcon");
const weaponName         = document.getElementById("weaponName");
const weaponGrade        = document.getElementById("weaponGrade");
const weaponEffect       = document.getElementById("weaponEffect");
const weaponChangeBtn    = document.getElementById("weaponChangeBtn");
const weaponUnlockModal  = document.getElementById("weaponUnlockModal");
const weaponUnlockIcon   = document.getElementById("weaponUnlockIcon");
const weaponUnlockName   = document.getElementById("weaponUnlockName");
const weaponUnlockGrade  = document.getElementById("weaponUnlockGrade");
const weaponUnlockFlavor = document.getElementById("weaponUnlockFlavor");
const weaponSelectModal  = document.getElementById("weaponSelectModal");
const weaponList         = document.getElementById("weaponList");
const weaponSelectClose  = document.getElementById("weaponSelectClose");
const bonusFlash         = document.getElementById("bonusFlash");

// ===================================
//   Firestore 読み書き
// ===================================

async function loadFromFirestore() {
  try {
    const snap = await getDoc(doc(db, "users", DEVICE_ID));
    if (snap.exists()) {
      const data  = snap.data();
      totalCount  = data.totalCount  || 0;
      bestCount   = data.bestCount   || 0;
    }
  } catch (e) {
    console.warn("Firestore読み込みエラー:", e);
  }
  updateUI();
}

let saveTimer = null;
async function saveToFirestore() {
  try {
    await setDoc(doc(db, "users", DEVICE_ID), {
      totalCount,
      bestCount,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Firestore保存エラー:", e);
  }
}

// 連打時は1秒に1回だけ保存（読み書き節約）
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToFirestore, 1000);
}

// ===================================
//   ユーティリティ
// ===================================

function getRank(count) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (count >= RANKS[i].min) return i;
  }
  return 0;
}

function getCurrentWeapon() {
  return WEAPONS.find(w => w.id === currentWeaponId) || WEAPONS[0];
}

// ===================================
//   UI 更新
// ===================================

function updateProgress(count) {
  const rank = RANKS[getRank(count)];
  if (!rank.nextAt) {
    progressBar.style.width = "100%";
    progressLabel.innerHTML = "🏆 最高位に達した！おぬし、本物だ";
    return;
  }
  const pct = ((count - rank.min) / (rank.nextAt - rank.min)) * 100;
  progressBar.style.width = Math.min(pct, 100) + "%";
  progressLabel.innerHTML = `次の称号まで あと <b>${rank.nextAt - count}</b> 回`;
}

function updateWeaponUI() {
  const weapon = getCurrentWeapon();
  weaponIcon.textContent  = weapon.icon;
  weaponName.textContent  = weapon.name;
  weaponGrade.textContent = weapon.grade;
  weaponGrade.className   = "weapon-grade-badge " + weapon.gradeClass;
  weaponEffect.textContent = weapon.effectText;
}

function updateUI() {
  countDisplay.textContent = totalCount;
  countDisplay.classList.remove("bump");
  void countDisplay.offsetWidth;
  countDisplay.classList.add("bump");

  const rank = RANKS[getRank(totalCount)];
  titleText.textContent    = rank.name;
  titleText.className      = "title-text " + rank.rankClass;
  titleIcon.textContent    = rank.icon;
  titleFlavor.textContent  = rank.flavor;

  updateProgress(totalCount);
  todayEl.textContent  = todayCount;
  streakEl.textContent = streak;
  bestEl.textContent   = bestCount;
  updateWeaponUI();
}

// ===================================
//   演出
// ===================================

function showRankUp(rankIdx) {
  const rank = RANKS[rankIdx];
  rankupIcon.textContent  = rank.icon;
  rankupTitle.textContent = rank.name;
  rankupMsg.textContent   = rank.flavor;
  rankupModal.classList.add("show");
}

function showWeaponUnlock(weapon) {
  weaponUnlockIcon.textContent   = weapon.icon;
  weaponUnlockName.textContent   = weapon.name;
  weaponUnlockGrade.textContent  = weapon.grade;
  weaponUnlockGrade.className    = "weapon-grade-badge " + weapon.gradeClass;
  weaponUnlockFlavor.textContent = weapon.flavor;
  weaponUnlockModal.classList.add("show");
}

function showBonusFlash() {
  bonusFlash.classList.remove("active");
  void bonusFlash.offsetWidth;
  bonusFlash.classList.add("active");
}

// ===================================
//   武器選択モーダル
// ===================================

function openWeaponSelect() {
  weaponList.innerHTML = "";
  WEAPONS.forEach(weapon => {
    const unlocked = totalCount >= weapon.unlockAt;
    const equipped  = weapon.id === currentWeaponId;
    const item = document.createElement("div");
    item.className = "weapon-item" +
      (unlocked ? "" : " locked") +
      (equipped  ? " equipped" : "");

    item.innerHTML = unlocked ? `
      <span class="weapon-item-icon">${weapon.icon}</span>
      <div class="weapon-item-info">
        <span class="weapon-item-name">${weapon.name}</span>
        <span class="weapon-grade-badge ${weapon.gradeClass}">${weapon.grade}</span>
        <span class="weapon-item-effect">${weapon.effectText}</span>
      </div>
      <button class="weapon-equip-btn${equipped ? " is-equipped" : ""}" data-id="${weapon.id}">
        ${equipped ? "装備中" : "装備する"}
      </button>
    ` : `
      <span class="weapon-item-icon">🔒</span>
      <div class="weapon-item-info">
        <span class="weapon-item-name">???</span>
        <span class="weapon-item-unlock">${weapon.unlockAt} 回で解放</span>
      </div>
    `;
    weaponList.appendChild(item);
  });

  weaponList.querySelectorAll(".weapon-equip-btn:not(.is-equipped)").forEach(btn => {
    btn.addEventListener("pointerdown", () => {
      currentWeaponId = parseInt(btn.dataset.id);
      swingCtr = 0;
      localStorage.setItem("kendo_weapon",    String(currentWeaponId));
      localStorage.setItem("kendo_swing_ctr", "0");
      updateWeaponUI();
      weaponSelectModal.classList.remove("show");
    });
  });

  weaponSelectModal.classList.add("show");
}

// ===================================
//   素振り処理
// ===================================

swingBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); swingBtn.classList.add("pressed"); });
swingBtn.addEventListener("pointerup",   (e) => { e.preventDefault(); swingBtn.classList.remove("pressed"); doSwing(); });
swingBtn.addEventListener("pointerleave", () => swingBtn.classList.remove("pressed"));
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); doSwing(); }
});

function doSwing() {
  const prevRank  = getRank(totalCount);
  const prevTotal = totalCount;
  const weapon    = getCurrentWeapon();

  totalCount++;
  todayCount++;
  swingCtr++;

  let bonusTriggered = false;
  if (weapon.bonusEvery && swingCtr % weapon.bonusEvery === 0) {
    totalCount++;
    todayCount++;
    bonusTriggered = true;
  }

  if (todayCount > bestCount) bestCount = todayCount;
  const newRank = getRank(totalCount);

  const newlyUnlocked = WEAPONS.find(
    w => w.unlockAt > prevTotal && w.unlockAt <= totalCount
  );

  // localStorageに今日分だけ保存（Firestoreは1秒遅延で保存）
  localStorage.setItem("kendo_today",     String(todayCount));
  localStorage.setItem("kendo_swing_ctr", String(swingCtr));

  updateUI();
  scheduleSave(); // ← Firestoreへ保存

  if (bonusTriggered) showBonusFlash();
  if (newRank > prevRank) {
    localStorage.setItem("kendo_prev_rank", String(newRank));
    setTimeout(() => showRankUp(newRank), 300);
  }
  if (newlyUnlocked) {
    setTimeout(() => showWeaponUnlock(newlyUnlocked), newRank > prevRank ? 1800 : 300);
  }

  if (navigator.vibrate) navigator.vibrate(bonusTriggered ? [40, 20, 80] : 40);
}

// ===================================
//   モーダルを閉じる
// ===================================

rankupModal.addEventListener("pointerdown",       () => rankupModal.classList.remove("show"));
weaponUnlockModal.addEventListener("pointerdown", () => weaponUnlockModal.classList.remove("show"));
weaponSelectClose.addEventListener("pointerdown", () => weaponSelectModal.classList.remove("show"));
weaponChangeBtn.addEventListener("pointerdown",   (e) => { e.stopPropagation(); openWeaponSelect(); });

// ===================================
//   リセット
// ===================================

resetBtn.addEventListener("click", async () => {
  if (confirm("⚠️ 本当にリセットしますか？\n「すべての武功が消えますぞ…！」")) {
    totalCount = todayCount = streak = bestCount = currentWeaponId = swingCtr = 0;
    localStorage.clear();
    await saveToFirestore(); // Firestoreもリセット
    updateUI();
  }
});

// ===================================
//   起動時にFirestoreからデータ読み込み
// ===================================

loadFromFirestore();
