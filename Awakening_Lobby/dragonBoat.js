// ==========================================
// 🛶 端午限定小遊戲：極速龍舟引擎 (全新倒數防抖版)
// ==========================================
const DRAGON_BOAT_DEBUG = false; // 💡 測試模式開關：設為 true 即可無限重複玩！正式上線記得改為 false。
let boatProgress = 0;
let lastPaddle = '';
let isBoatStunned = false;
let boatStartTime = 0;
let boatTimerInterval = null;
const MAX_STROKES = 30; // 總共需要划30下 (左右各15下)

// 🌟 核心新增：設定每天小遊戲的解鎖門檻分數
function getRequiredEnergyForDay(day) {
    const thresholds = {
        1: 2, //13,  // 第 1 天需要 16 分才能玩
        2: 2, //13,  // 第 2 天需要 16 分
        3: 2, //13,  // 例如第 3 天任務比較難，可以提高到 18 分
        4: 2, //13,
        5: 4, //16,  
        6: 4, //16,  // 
        7: 4, //16,  // 
        8: 6, //19,
        9: 6, //19,  // 
        10: 6, //19,  // 
        11: 8, //22,  // 
        12: 8, //22,
        13: 8, //22,  // 
        14: 10， //25,  // 
    };
    // 如果找不到當天的設定，預設為 16 分
    return thresholds[day] || 16; 
}

// 🥚 彩蛋開關：連點5次切換 Debug 模式
let secretTapCount = 0;
let secretTapTimer = null;

function secretDebugToggle() {
    secretTapCount++;
    if (secretTapTimer) clearTimeout(secretTapTimer);
    secretTapTimer = setTimeout(() => { secretTapCount = 0; }, 2000);

    if (secretTapCount >= 5) {
        DRAGON_BOAT_DEBUG = !DRAGON_BOAT_DEBUG; 
        secretTapCount = 0; 
        if (DRAGON_BOAT_DEBUG) {
            alert("🛠️ 【開發者模式：已開啟】\n您現在擁有無限次數與無視分數的特權！");
        } else {
            alert("🔒 【開發者模式：已關閉】\n已恢復一般玩家的正常限制。");
        }
        // 切換後立刻更新按鈕外觀
        if (typeof updateDragonBoatButtonState === "function") {
            updateDragonBoatButtonState();
        }
    }
}

// 檢查今天是否已經玩過
function checkBoatEligibility() {
    // 🌟 核心新增：如果 DEBUG 模式開啟，直接無視規則放行！
    if (DRAGON_BOAT_DEBUG) {
        console.log("🛠️ 龍舟 DEBUG 模式已開啟：允許無限次數遊玩");
        return true; 
    }

    // 👇 核心新增：檢查今日能量是否達標
    // 從手機記憶體抓取「今日能量」與「目前天數」
    let todayEnergy = parseInt(localStorage.getItem('todayEnergy')) || 0;
    let currentDay = parseInt(localStorage.getItem('currentDay')) || 1; 
    
    // 呼叫我們剛剛寫好的函數，取得今天的及格分數
    let requiredEnergy = getRequiredEnergyForDay(currentDay);

    // 如果今天分數不夠，直接擋下來！
    if (todayEnergy < requiredEnergy) {
        if (typeof showCustomAlert === "function") {
            showCustomAlert('🔒', '能量不足', `勇者，今日需累積滿 ${requiredEnergy} 分才能挑戰龍舟！\n\n目前今日能量：⚡ ${todayEnergy} 分\n快去完成任務與打卡吧！`);
        } else {
            alert(`🔒 能量不足\n\n勇者，今日需累積滿 ${requiredEnergy} 分才能挑戰龍舟！\n\n目前今日能量：⚡ ${todayEnergy} 分\n快去完成任務與打卡吧！`);
        }
        return false; // 回傳 false，不准開啟小遊戲視窗
    }
    // 👆 新增結束


    // 檢查今天是否已經玩過了 (維持原本的邏輯)
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

// 🌟 核心新增：自動更新龍舟按鈕狀態 (反灰/亮起)
function updateDragonBoatButtonState() {
    // 假設您主畫面的龍舟按鈕 ID 是 'btnDragonBoat'
    // (如果您的按鈕 ID 不同，請把下面這行的 'btnDragonBoat' 換成您的 ID)
    const btn = document.getElementById('btnDragonBoat'); 
    if (!btn) return;

    // 1. 如果是 DEBUG 模式，直接全亮並解鎖
    if (typeof DRAGON_BOAT_DEBUG !== 'undefined' && DRAGON_BOAT_DEBUG) {
        btn.style.filter = 'grayscale(0%)';
        btn.style.opacity = '1';
        btn.onclick = openDragonBoatModal;
        btn.innerHTML = "🐉 進入龍舟 (測試中)";
        return;
    }

    // 2. 檢查今天是否已經玩過了
    const playedDate = localStorage.getItem('dragonBoatPlayedDate');
    const todayStr = new Date().toDateString();
    if (playedDate === todayStr) {
        btn.style.filter = 'grayscale(100%)';
        btn.style.opacity = '0.5';
        btn.onclick = () => { alert("🛶 您今日已完賽，請明天再來挑戰！"); };
        btn.innerHTML = "✅ 今日已完賽";
        return;
    }

    // 3. 檢查能量是否達標
    let todayEnergy = parseInt(localStorage.getItem('todayEnergy')) || 0;
    let currentDay = parseInt(localStorage.getItem('currentDay')) || 1; 
    let requiredEnergy = getRequiredEnergyForDay(currentDay);

    if (todayEnergy >= requiredEnergy) {
        // 🎉 達標：按鈕亮起，綁定開啟遊戲功能
        btn.style.filter = 'grayscale(0%) drop-shadow(0px 0px 8px rgba(255, 215, 0, 0.8))'; // 加上黃色發光特效
        btn.style.opacity = '1';
        btn.onclick = openDragonBoatModal;
        btn.innerHTML = "🐉 開始挑戰！";
    } else {
        // 🔒 未達標：按鈕反灰鎖定
        btn.style.filter = 'grayscale(100%)';
        btn.style.opacity = '0.6';
        // 點擊反灰按鈕時，溫馨提示還差幾分
        btn.onclick = () => { 
            let diff = requiredEnergy - todayEnergy;
            alert(`🔒 能量不足\n\n還差 ⚡ ${diff} 分即可解鎖今日龍舟挑戰！\n快去完成任務與打卡吧！`); 
        };
        btn.innerHTML = `🔒 達 ${requiredEnergy} 分解鎖`;
    }
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

    const boatMainEl = document.getElementById('playerBoat');
    const boatRockContainer = document.getElementById('boatRockContainer');
    //const paddleLeft = document.getElementById('paddleLeft');
    //const paddleRight = document.getElementById('paddleRight');
    const paddleLeftWrap = document.getElementById('paddleLeftWrapper');
    const paddleRightWrap = document.getElementById('paddleRightWrapper');
    //const splashLeft = document.getElementById('splashLeft');
    //const splashRight = document.getElementById('splashRight');

    if (side === lastPaddle) {
        // ❌ 懲罰機制：按錯邊，原地打結 0.5 秒
        isBoatStunned = true;
        document.getElementById('stunMsg').style.display = 'block';
        //boatEl.style.transform = 'translateX(-50%) rotate(0deg)'; // 船身回正
        boatRockContainer.style.transform = 'rotate(0deg)'; // 船身瞬間回正

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
    
    // 🌊 核心改動：驅動 CSS 動畫與爆發力「整船搖擺」
    if (side === 'A') {
        // 1. 觸發左槳 CSS 掃水動畫
        paddleLeftWrap.classList.remove('animate-rowing-left');
        void paddleLeftWrap.offsetWidth; 
        paddleLeftWrap.classList.add('animate-rowing-left');
        
        // 2. 物理爆發力：整艘船瞬間向右傾斜 ( rotate(5deg) )！
        boatRockContainer.style.transform = 'rotate(5deg)'; 
        
        // 3. 實體圖片水花：延遲 0.05秒(入水瞬間)召喚水花，0.2秒後消失
        setTimeout(() => { 
            splashLeft.style.display = 'block'; 
            setTimeout(() => { splashLeft.style.display = 'none'; }, 200);
        }, 50);

    } else {
        // 1. 觸發右槳 CSS 掃水動畫
        paddleRightWrap.classList.remove('animate-rowing-right');
        void paddleRightWrap.offsetWidth;
        paddleRightWrap.classList.add('animate-rowing-right');
        
        // 2. 物理爆發力：整艘船瞬間向左傾斜 ( rotate(-5deg) )！
        boatRockContainer.style.transform = 'rotate(-5deg)';

        // 3. 實體圖片水花：召喚右側水花
        setTimeout(() => { 
            splashRight.style.display = 'block'; 
            setTimeout(() => { splashRight.style.display = 'none'; }, 200);
        }, 50);
    }

    // 船身往前推進
    let newBottom = 5 + (boatProgress * (80 / MAX_STROKES));
    //document.getElementById('playerBoat').style.bottom = newBottom + '%';
    boatMainEl.style.bottom = newBottom + '%';

    if (boatProgress >= MAX_STROKES) {
        // 抵達終點前，讓船身帥氣回正
        boatRockContainer.style.transform = 'rotate(0deg)';
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
    updateDragonBoatButtonState();

    // 👇 核心新增：強制讓網頁平滑滾動回最頂部看能量值！
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (typeof showCustomAlert === "function") {
        showCustomAlert('🏆', '奪標成功！', `划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！`);
    } else {
        alert(`🏆 奪標成功！\n\n划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！`);
    }
}








