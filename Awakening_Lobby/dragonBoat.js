// ==========================================
// 🛶 端午限定小遊戲：極速龍舟引擎
// ==========================================
let boatProgress = 0;
let lastPaddle = '';
let isBoatStunned = false;
let boatStartTime = 0;
let boatTimerInterval = null;
const MAX_STROKES = 30; // 總共需要划30下 (左右各15下)

// 檢查今天是否已經玩過
function checkBoatEligibility() {
    const playedDate = localStorage.getItem('dragonBoatPlayedDate');
    const todayStr = new Date().toDateString();
    if (playedDate === todayStr) {
        // 如果您原本有 showCustomAlert 函數，這裡可以直接呼叫
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
    // 如果還沒按開始，或是正在暈眩中，都不受理按鈕
    if (isBoatStunned || boatStartTime === 0) return;

    if (side === lastPaddle) {
        // ❌ 懲罰機制：按錯邊，原地打結 0.5 秒
        isBoatStunned = true;
        document.getElementById('stunMsg').style.display = 'block';
        if (navigator.vibrate) navigator.vibrate(200); // 讓手機震動一下(若支援)
        
        setTimeout(() => {
            isBoatStunned = false;
            document.getElementById('stunMsg').style.display = 'none';
        }, 500);
        return;
    }

    // ✅ 成功划行
    lastPaddle = side;
    boatProgress++;
    
    // 計算位移：從底部 5% 往上移動到 85% (共移動 80%)
    let newBottom = 5 + (boatProgress * (80 / MAX_STROKES));
    document.getElementById('playerBoat').style.bottom = newBottom + '%';

    // 抵達終點！
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

    // 寫入今日日期，防作弊重複刷分
    const todayStr = new Date().toDateString();
    localStorage.setItem('dragonBoatPlayedDate', todayStr);

    // 🌟 關鍵保護：將獎勵「只加進總能量」，絕對不影響解鎖任務的分數！
    let total = parseInt(localStorage.getItem('totalEnergy')) || 0;
    total += bonusPoints;
    localStorage.setItem('totalEnergy', total);
    
    if (document.getElementById('displayEnergy')) {
        document.getElementById('displayEnergy').innerText = total;
    }

    // 同步寫入 Firebase (只更新總分)
    try {
        const userId = window.userProfile ? window.userProfile.userId : ("anonymous_" + Date.now());
        // 注意這裡：如果是正式版，記得在 main.html 呼叫時會寫入 Players_Main，
        // 但因為邏輯現在在外部，只要 db.collection 指向正確即可。
        // 我們先寫死 Players_Dev 以供測試服使用，後續可優化為傳入參數或判斷環境。
        if (typeof db !== "undefined") {
            await db.collection("Players_Dev").doc(userId).set({
                totalEnergy: total
            }, { merge: true });
        }
    } catch (err) {
        console.log("龍舟分數雲端同步延遲", err);
    }

    closeDragonBoat();
    
    if (typeof showCustomAlert === "function") {
        showCustomAlert('🏆', '奪標成功！', `划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！`);
    } else {
        alert(`🏆 奪標成功！\n\n划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！`);
    }
}