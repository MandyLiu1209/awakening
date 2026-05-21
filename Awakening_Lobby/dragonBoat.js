// ==========================================
// 🛶 端午限定小遊戲：極速龍舟引擎 (環境自適應防呆版)
// ==========================================
let boatProgress = 0;
let lastPaddle = '';
let isBoatStunned = false;
let boatStartTime = 0;
let boatTimerInterval = null;
const MAX_STROKES = 30; // 總共需要划30下 (左右各15下)

// 🔍 【核心自動偵測】判斷目前是測試服還是正式服
const IS_DEV_MODE = window.location.pathname.includes('dev.html') || window.location.search.includes('debug=true');
const DB_COLLECTION = IS_DEV_MODE ? "Players_Dev" : "Players_Main";

// 檢查今天是否已經玩過
function checkBoatEligibility() {
    // 🛠️ Debug 模式特權：如果是測試服，直接放行，讓村長一直划！
    if (IS_DEV_MODE) {
        console.log("🛠️ [Debug 模式] 偵測到測試環境：已自動繞過每日限制！");
        return true;
    }

    const playedDate = localStorage.getItem('dragonBoatPlayedDate');
    const todayStr = new Date().toDateString();
    if (playedDate === todayStr) {
        if (typeof showCustomAlert === "function") {
            showCustomAlert('🛶', '今日已完賽', '勇者，您今天已經參與過端午龍舟賽了！\n請好好休息，明天再來奪標！');
        } else {
            alert('🛶 今日已完賽\n\n勇者，您今天已經參與過端午龍舟賽了！\n請好好休息，明天再來奪標！');
        }
        return false;
    }
    return true;
}

function openDragonBoatModal() {
    if (!checkBoatEligibility()) return;
    document.getElementById('dragonBoatModal').style.display = 'flex';
    document.getElementById('boatStartOverlay').style.display = 'flex';
    
    // 🛠️ Debug 模式視覺提示：讓村長知道現在可以無限測試
    if (IS_DEV_MODE) {
        const descEl = document.querySelector('#boatStartOverlay p');
        if (descEl && !descEl.innerHTML.includes('🛠️')) {
            descEl.innerHTML += `<br><span style="color:#00e5ff; font-weight:bold;">🛠️ 偵測到測試服：已啟動無限除錯暢玩模式！</span>`;
        }
    }

    // 重置賽道狀態
    boatProgress = 0;
    lastPaddle = '';
    isBoatStunned = false;
    boatStartTime = 0;
    document.getElementById('playerBoat').style.bottom = '5%';
    document.getElementById('boatTimer').innerText = '00.00';
}

function closeDragonBoat() {
    document.getElementById('dragonBoatModal').style.display = 'none';
    clearInterval(boatTimerInterval);
}

function startDragonBoat() {
    document.getElementById('boatStartOverlay').style.display = 'none';
    boatStartTime = Date.now();
    
    // 啟動毫秒碼表
    boatTimerInterval = setInterval(() => {
        let passed = (Date.now() - boatStartTime) / 1000;
        document.getElementById('boatTimer').innerText = passed.toFixed(2);
    }, 50);
}

function paddleBoat(side) {
    if (isBoatStunned || boatStartTime === 0) return;

    if (side === lastPaddle) {
        // ❌ 懲罰機制：按錯邊，原地打結 0.5 秒
        isBoatStunned = true;
        document.getElementById('stunMsg').style.display = 'block';
        if (navigator.vibrate) navigator.vibrate(200); 
        
        setTimeout(() => {
            isBoatStunned = false;
            document.getElementById('stunMsg').style.display = 'none';
        }, 500);
        return;
    }

    // ✅ 成功划行
    lastPaddle = side;
    boatProgress++;
    
    let newBottom = 5 + (boatProgress * (80 / MAX_STROKES));
    document.getElementById('playerBoat').style.bottom = newBottom + '%';

    if (boatProgress >= MAX_STROKES) {
        finishDragonBoat();
    }
}

async function finishDragonBoat() {
    clearInterval(boatTimerInterval);
    boatStartTime = 0; 
    
    let timeTaken = parseFloat(document.getElementById('boatTimer').innerText);
    
    // 🏆 分數評級運算
    let bonusPoints = 1;
    let grade = "參加獎";
    if (timeTaken <= 6.0) { bonusPoints = 10; grade = "S 級神速"; }
    else if (timeTaken <= 8.0) { bonusPoints = 8; grade = "A 級高手"; }
    else if (timeTaken <= 11.0) { bonusPoints = 5; grade = "B 級好手"; }
    else if (timeTaken <= 15.0) { bonusPoints = 3; grade = "C 級新手"; }

    // 只有在「非開發模式」下，才寫入今日日期封鎖後續遊玩
    if (!IS_DEV_MODE) {
        const todayStr = new Date().toDateString();
        localStorage.setItem('dragonBoatPlayedDate', todayStr);
    }

    // 🌟 關鍵保護：加總分
    let total = parseInt(localStorage.getItem('totalEnergy')) || 0;
    total += bonusPoints;
    localStorage.setItem('totalEnergy', total);
    
    if (document.getElementById('displayEnergy')) {
        document.getElementById('displayEnergy').innerText = total;
    }

    // 同步寫入 Firebase (自動導流至正確的資料庫)
    try {
        const userId = window.userProfile ? window.userProfile.userId : ("anonymous_" + Date.now());
        if (typeof db !== "undefined") {
            await db.collection(DB_COLLECTION).doc(userId).set({
                totalEnergy: total
            }, { merge: true });
            console.log(`📡 分數已成功刻入雲端金庫：${DB_COLLECTION}`);
        }
    } catch (err) {
        console.log("龍舟分數雲端同步延遲", err);
    }

    closeDragonBoat();
    
    let suffix = IS_DEV_MODE ? "\n\n⚠️ [Debug 提示] 測試服未鎖定遊玩次數，關閉後可重新開啟再度測試！" : "";
    if (typeof showCustomAlert === "function") {
        showCustomAlert('🏆', '奪標成功！', `划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！${suffix}`);
    } else {
        alert(`🏆 奪標成功！\n\n划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！${suffix}`);
    }
}