// ==========================================
// 🛶 端午限定小遊戲：極速龍舟引擎 (全新倒數防抖版)
// ==========================================
const DRAGON_BOAT_DEBUG = true; // 💡 測試模式開關：設為 true 即可無限重複玩！正式上線記得改為 false。
let boatProgress = 0;
let lastPaddle = '';
let isBoatStunned = false;
let boatStartTime = 0;
let boatTimerInterval = null;
const MAX_STROKES = 30; // 總共需要划30下 (左右各15下)

// 檢查今天是否已經玩過
function checkBoatEligibility() {
    // 🌟 核心新增：如果 DEBUG 模式開啟，直接無視規則放行！
    if (DRAGON_BOAT_DEBUG) {
        console.log("🛠️ 龍舟 DEBUG 模式已開啟：允許無限次數遊玩");
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
    
    // 🔒 防晃動核心：鎖死主網頁滾動條
    document.body.style.overflow = 'hidden';
    
    document.getElementById('dragonBoatModal').style.display = 'flex';
    document.getElementById('boatStartOverlay').style.display = 'flex';
    document.getElementById('boatIntroGroup').style.display = 'flex';
    document.getElementById('boatCountdownBox').style.display = 'none';
    
    // 重置賽道狀態
    boatProgress = 0;
    lastPaddle = '';
    isBoatStunned = false;
    boatStartTime = 0;
    // 👇 關鍵新增：遊戲開啟或重玩時，強制讓船身回正，木槳回到「前探姿勢」！
    document.getElementById('playerBoat').style.bottom = '5%';
    document.getElementById('playerBoat').style.transform = 'translateX(-50%) rotate(0deg)';
    document.getElementById('paddleLeftWrapper').style.transform = 'rotate(70deg)'; // 👈 改為前探 angles
    document.getElementById('paddleRightWrapper').style.transform = 'rotate(-70deg)'; // 👈 改為前探 angles
    // 👆 新增結束

    document.getElementById('boatTimer').innerText = '00.00';
}

function closeDragonBoat() {
    document.getElementById('dragonBoatModal').style.display = 'none';
    clearInterval(boatTimerInterval);
    
    // 🔓 解鎖主網頁滾動條
    document.body.style.overflow = '';
}

// ⏱️ 核心新增：3秒倒數計時魔法
function startDragonBoatCountdown() {
    // 隱藏說明文字，開啟倒數大字
    document.getElementById('boatIntroGroup').style.display = 'none';
    const countdownBox = document.getElementById('boatCountdownBox');
    countdownBox.style.display = 'block';
    countdownBox.style.color = '#ffca28';
    
    let currentCount = 3;
    countdownBox.innerText = currentCount;
    
    let countdownInterval = setInterval(() => {
        currentCount--;
        
        if (currentCount > 0) {
            countdownBox.innerText = currentCount;
        } else if (currentCount === 0) {
            countdownBox.innerText = "🏁 GO!";
            countdownBox.style.color = "#2ecc71"; // 變成亮綠色出發點
        } else {
            // 倒數結束，全面開打！
            clearInterval(countdownInterval);
            document.getElementById('boatStartOverlay').style.display = 'none';
            
            // 啟動毫秒遊戲碼表
            runDragonBoatTimer();
        }
    }, 1000); // 每隔 1 秒跳動一次
}

function runDragonBoatTimer() {
    boatStartTime = Date.now();
    boatTimerInterval = setInterval(() => {
        let passed = (Date.now() - boatStartTime) / 1000;
        document.getElementById('boatTimer').innerText = passed.toFixed(2);

        // 💀 核心新增：只要超過 25 秒，立刻終止比賽並強制結算！
        if (passed > 25.0) {
            clearInterval(boatTimerInterval); // 立刻停止計時
            finishDragonBoat(); // 強制進入結算畫面
        }
    }, 50);
}

function paddleBoat(side) {
    // 碼表尚未啟動（包含倒數期間）或是暈眩中，通通不理按鈕
    if (isBoatStunned || boatStartTime === 0) return;

    const boatEl = document.getElementById('playerBoat');
    //const paddleLeft = document.getElementById('paddleLeft');
    //const paddleRight = document.getElementById('paddleRight');
    const paddleLeftWrap = document.getElementById('paddleLeftWrapper');
    const paddleRightWrap = document.getElementById('paddleRightWrapper');

    if (side === lastPaddle) {
        // ❌ 懲罰機制：按錯邊，原地打結 0.5 秒
        isBoatStunned = true;
        document.getElementById('stunMsg').style.display = 'block';
        boatEl.style.transform = 'translateX(-50%) rotate(0deg)'; // 船身回正
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
    
    // 🌊 核心動態特效：划水與船身反作用力傾斜
    if (side === 'A') {
        //boatEl.style.transform = 'translateX(-50%) rotate(10deg)'; // 左槳划，船身向右傾
        //paddleLeft.style.transform = 'rotate(-65deg)'; // 左槳往後揚起
        //setTimeout(() => { paddleLeft.style.transform = 'rotate(0deg)'; }, 100);

        // 先移除舊的 class (防止連點導致動畫沒重跑)
        paddleLeftWrap.classList.remove('animate-rowing-left');
        // 強制瀏覽器重繪 (這行是魔法，確保動畫能再次觸發)
        void paddleLeftWrap.offsetWidth; 
        // 加上新的 class，開始跑 0.4秒的完整的划船循環
        paddleLeftWrap.classList.add('animate-rowing-left');
        
        // 船身維持輕微向右傾斜
        boatEl.style.transform = 'translateX(-50%) rotate(8deg)';

    } else {
        //boatEl.style.transform = 'translateX(-50%) rotate(-10deg)'; // 右槳划，船身向左傾
        //paddleRight.style.transform = 'rotate(65deg)'; // 右槳往後揚起
        //setTimeout(() => { paddleRight.style.transform = 'rotate(0deg)'; }, 100);

        paddleRightWrap.classList.remove('animate-rowing-right');
        void paddleRightWrap.offsetWidth;
        paddleRightWrap.classList.add('animate-rowing-right');
        
        // 船身維持輕微向左傾斜
        boatEl.style.transform = 'translateX(-50%) rotate(-8deg)';
    }

    // 船身往前推進
    let newBottom = 5 + (boatProgress * (80 / MAX_STROKES));
    //document.getElementById('playerBoat').style.bottom = newBottom + '%';
    boatEl.style.bottom = newBottom + '%';

    if (boatProgress >= MAX_STROKES) {
        // 抵達終點前，讓船身帥氣回正
        boatEl.style.transform = 'translateX(-50%) rotate(0deg)';
        finishDragonBoat();
    }
}

async function finishDragonBoat() {
    clearInterval(boatTimerInterval);
    boatStartTime = 0; 
    
    let timeTaken = parseFloat(document.getElementById('boatTimer').innerText);
    
    // 🏆 分數評級運算
    let bonusPoints = 0;
    let grade = "挑戰失敗"; // 預設超過25秒就是失敗
    
    if (timeTaken <= 6.0) { bonusPoints = 10; grade = "S 級神速"; }
    else if (timeTaken <= 8.0) { bonusPoints = 8; grade = "A 級高手"; }
    else if (timeTaken <= 11.0) { bonusPoints = 5; grade = "B 級好手"; }
    else if (timeTaken <= 15.0) { bonusPoints = 3; grade = "C 級新手"; }
    else if (timeTaken <= 25.0) { bonusPoints = 1; grade = "參加獎"; }
    else { bonusPoints = 0; grade = "挑戰失敗 😭"; } // 超過 25 秒

    localStorage.setItem('dragonBoatPlayedDate', todayStr = new Date().toDateString());

    let total = parseInt(localStorage.getItem('totalEnergy')) || 0;
    total += bonusPoints;
    localStorage.setItem('totalEnergy', total);
    
    if (document.getElementById('displayEnergy')) {
        document.getElementById('displayEnergy').innerText = total;
    }

    try {
        const userId = window.userProfile ? window.userProfile.userId : ("anonymous_" + Date.now());
        if (typeof db !== "undefined") {
            await db.collection("Players_Dev").doc(userId).set({
                totalEnergy: total
            }, { merge: true });
        }
    } catch (err) {
        console.log("龍舟分數雲端同步延遲", err);
    }

    closeDragonBoat(); // 內部已整合自動恢復解鎖網頁滾動

    // 👇 核心新增：強制讓網頁平滑滾動回最頂部看能量值！
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (typeof showCustomAlert === "function") {
        showCustomAlert('🏆', '奪標成功！', `划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！`);
    } else {
        alert(`🏆 奪標成功！\n\n划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！`);
    }
}








