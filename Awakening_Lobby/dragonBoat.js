// ==========================================
// 🛶 端午限定小遊戲：極速龍舟引擎 (全新倒數防抖版)
// ==========================================

let DRAGON_BOAT_DEBUG = false; // 💡 測試模式開關：靠主畫面的隱形彩蛋連點5下開啟！
let boatProgress = 0;
let lastPaddle = '';
let isBoatStunned = false;
let boatStartTime = 0;
let boatTimerInterval = null;
const MAX_STROKES = 30; // 總共需要划30下 (左右各15下)

// 🥚 雙效彩蛋開關：連點5次同時切換 龍舟測試 與 開發者面板 (綁定於 LV 標籤)
let secretTapCount = 0;
let secretTapTimer = null;

function secretDebugToggle() {
    secretTapCount++;
    if (secretTapTimer) clearTimeout(secretTapTimer);
    secretTapTimer = setTimeout(() => { secretTapCount = 0; }, 2000);

    if (secretTapCount >= 5) {
        secretTapCount = 0; 
        
        // 1. 切換龍舟變數
        if (typeof DRAGON_BOAT_DEBUG !== 'undefined') {
            DRAGON_BOAT_DEBUG = !DRAGON_BOAT_DEBUG;
        }
        
        // 2. 切換主程式變數
        if (typeof debug_mode !== 'undefined') {
            debug_mode = DRAGON_BOAT_DEBUG; // 讓兩者保持同步
        }

        // 3. 顯示或隱藏主畫面的 Debug 面板
        const dPanel = document.getElementById('debugPanel');
        if (dPanel) {
            dPanel.style.display = DRAGON_BOAT_DEBUG ? 'block' : 'none';
        }
        
        // 4. 更新畫面上龍舟按鈕的外觀
        if (typeof updateDragonBoatButtonState === "function") {
            updateDragonBoatButtonState();
        }

        alert(DRAGON_BOAT_DEBUG ? "🛠️ 魔法成功！【龍舟無敵】與【開發者面板】已雙重開啟！" : "🔒 魔法成功！所有測試模式【已關閉】。");
    }
}

// 🌟 核心新增：設定每天小遊戲的解鎖門檻分數
function getRequiredEnergyForDay(day) {
    const thresholds = {
        1: 13,  //2, //13,  // 第 1 天需要 13 分才能玩
        2: 13,  //2, //13,  // 第 2 天需要 13 分
        3: 13,  //2, //13,  // 例如第 3 天任務比較難，可以提高到 18 分
        4: 13,  //2, //13,
        5: 16,  //4, //16,  
        6: 16,  //4, //16,  // 
        7: 16,  //4, //16,  // 
        8: 19,  //6, //19,
        9: 19,  //6, //19,  // 
        10: 19,  //6, //19,  // 
        11: 22,  //8, //22,  // 
        12: 22,  //8, //22,
        13: 22,  //8, //22,  // 
        14: 25,  //10 //25,  // 
    };
    return thresholds[day]; // || 2; 
}

// 🌟 核心新增：自動更新龍舟按鈕狀態 (反灰/亮起)
function updateDragonBoatButtonState() {
    const btn = document.getElementById('btnDragonBoat'); 
    if (!btn) return;

    // 1. 如果是 DEBUG 模式，直接全亮並解鎖
    if (typeof DRAGON_BOAT_DEBUG !== 'undefined' && DRAGON_BOAT_DEBUG) {
        btn.style.filter = 'grayscale(0%) drop-shadow(0px 0px 8px rgba(255, 215, 0, 0.8))';
        btn.style.opacity = '1';
        btn.onclick = openDragonBoatModal;
        btn.innerHTML = "🐉 進入龍舟(測試中)";
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
    let bonusScore = parseInt(localStorage.getItem('bonusPoints')) || 0;
    let todayEnergy = baseEnergy + bonusScore; // 將兩者相加作為解鎖標準
    
    let currentDay = 1;
    if (typeof getCalendarDiffDays === "function") {
        currentDay = getCalendarDiffDays();
    }
    
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
        btn.innerHTML = `🔒 獲 ${requiredEnergy} 分解鎖`;
    }
}

function checkBoatEligibility() {
    if (DRAGON_BOAT_DEBUG) return true; 

    let todayEnergy = parseInt(localStorage.getItem('todayEnergy')) || 0;
    let bonusScore = parseInt(localStorage.getItem('bonusPoints')) || 0;
    let todayEnergy = baseEnergy + bonusScore;
    
    let currentDay = 1;
    if (typeof getCalendarDiffDays === "function") {
        currentDay = getCalendarDiffDays();
    }
    
    let requiredEnergy = getRequiredEnergyForDay(currentDay);

    if (todayEnergy < requiredEnergy) {
        if (typeof showCustomAlert === "function") {
            showCustomAlert('🔒', '能量不足', `勇者，今日需累積滿 ${requiredEnergy} 分才能挑戰龍舟！\n\n目前今日能量：⚡ ${todayEnergy} 分\n快去完成任務與打卡吧！`);
        } else {
            alert(`🔒 能量不足\n\n勇者，今日需累積滿 ${requiredEnergy} 分才能挑戰龍舟！\n\n目前今日能量：⚡ ${todayEnergy} 分\n快去完成任務與打卡吧！`);
        }
        return false;
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
    if(document.getElementById('playerBoat')) document.getElementById('playerBoat').style.bottom = '5%';
    if(document.getElementById('boatRockContainer')) document.getElementById('boatRockContainer').style.transform = 'rotate(0deg)';
    if(document.getElementById('paddleLeftWrapper')) document.getElementById('paddleLeftWrapper').style.transform = 'rotate(70deg)';
    if(document.getElementById('paddleRightWrapper')) document.getElementById('paddleRightWrapper').style.transform = 'rotate(-70deg)';

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
    const paddleLeftWrap = document.getElementById('paddleLeftWrapper');
    const paddleRightWrap = document.getElementById('paddleRightWrapper');
    const splashLeft = document.getElementById('splashLeft');
    const splashRight = document.getElementById('splashRight');

    if (side === lastPaddle) {
        // ❌ 懲罰機制：按錯邊，原地打結 0.5 秒
        isBoatStunned = true;
        document.getElementById('stunMsg').style.display = 'block';
        boatRockContainer.style.transform = 'rotate(0deg)'; 
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

    localStorage.setItem('dragonBoatPlayedDate', new Date().toDateString());

    let total = parseInt(localStorage.getItem('totalEnergy')) || 0;
    total += bonusPoints;
    localStorage.setItem('totalEnergy', total);
    
    if (document.getElementById('displayEnergy')) {
        let currentBonus = parseInt(localStorage.getItem('bonusPoints')) || 0;
        document.getElementById('displayEnergy').innerText = total + currentBonus;
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

    closeDragonBoat(); 

    // 🌟 核心：打完龍舟後，更新按鈕狀態
    if (typeof updateDragonBoatButtonState === "function") {
        updateDragonBoatButtonState();
    }

    // 👇 核心新增：強制讓網頁平滑滾動回最頂部看能量值！
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (typeof showCustomAlert === "function") {
        showCustomAlert('🏆', '奪標成功！', `划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！`);
    } else {
        alert(`🏆 奪標成功！\n\n划行時間：${timeTaken} 秒\n評定等級：【${grade}】\n\n獲得端午限定獎勵：⚡ ${bonusPoints} 分！`);
    }
}




