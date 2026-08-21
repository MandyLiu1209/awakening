/**
 * 🎮 健康能量大採集 - 獨立小遊戲模組 (v2.2 豆腐與炸彈版)
 * 包含：3秒倒數、加深籃子深度、漂浮分數特效、階梯式能量轉換
 * 物品：💧水滴(+3)、🥦蔬菜(+2)、🧊豆腐(+5)、🍔漢堡(-3)、💣炸彈(-5)
 */

let ENERGY_CATCH_DEBUG = false; // 💡 測試模式開關：連點 5 下 LV 標籤或標題開啟

/* 🌟 [新增] 雙效彩蛋開關：連點 5 次切換測試模式與開發者面板 */
let secretTapCount = 0;
let secretTapTimer = null;

function secretDebugToggle() {
    secretTapCount++;
    if (secretTapTimer) clearTimeout(secretTapTimer);
    secretTapTimer = setTimeout(() => { secretTapCount = 0; }, 2000);

    if (secretTapCount >= 5) {
        secretTapCount = 0; 
        
        if (typeof ENERGY_CATCH_DEBUG !== 'undefined') {
            ENERGY_CATCH_DEBUG = !ENERGY_CATCH_DEBUG;
        }
        if (typeof debug_mode !== 'undefined') {
            debug_mode = ENERGY_CATCH_DEBUG; 
        }

        const dPanel = document.getElementById('debugPanel');
        if (dPanel) {
            dPanel.style.display = ENERGY_CATCH_DEBUG ? 'block' : 'none';
        }
        
        if (typeof updateGameButtonState === "function") {
            updateGameButtonState();
        }

        alert(ENERGY_CATCH_DEBUG ? "🛠️ 魔法成功！【採集無敵】與【開發者面板】已雙重開啟！" : "🔒 魔法成功！所有測試模式【已關閉】。");
    }
}

/* 🌟 [新增] 設定每天小遊戲的解鎖門檻分數對照表 (1~14 天) */
function getRequiredEnergyForDay(day) {
    const thresholds = {
        1: 2, //10,  // 第 1 天需要 10 分才能玩
        2: 2, //10,  // 第 2 天需要 10 分
        3: 2, //10,  // 第 3 天需要 10 分
        4: 2, //10,  // 第 4 天需要 10 分
        5: 4, //13,  // 第 5 天需要 13 分
        6: 4, //13,  // 第 6 天需要 13 分
        7: 4, //13,  // 第 7 天需要 13 分
        8: 4, //13,  // 第 8 天需要 13 分
        9: 4, //13,  // 第 9 天需要 13 分
        10: 4, //13, // 第 10 天需要 13 分
        11: 6, //16, // 第 11 天需要 16 分
        12: 6, //16, // 第 12 天需要 16 分
        13: 6, //16, // 第 13 天需要 16 分
        14: 15, //55  // 第 14 天需要 55 分 (最後一天打卡給10分)
    };
    return thresholds[day] || 10; 
}

/* 🌟 [新增] 直接讀取「今日打卡」與「今日雲端加分撲滿」計算今日專屬能量 */
function getTodayEnergy() {
    let currentDay = typeof getCalendarDiffDays === "function" ? getCalendarDiffDays() : 1;
    let todayStr = new Date().toDateString();
    
    // 1. 計算今日打卡分數 (今日打卡次數 * 當天單場分數)
    let lastCheckinDate = localStorage.getItem('lastCheckinDate');
    let todayCheckins = parseInt(localStorage.getItem('todayCheckins')) || 0;

    // 若記錄的日期不是今天，打卡次數才歸零
    if (lastCheckinDate && lastCheckinDate !== todayStr) {
        todayCheckins = 0;
    }

    let ptsPerCheckin = (currentDay >= 14) ? 10 : 2; 
    let todayBase = todayCheckins * ptsPerCheckin; // 今日純打卡得分
    //let currentDayKey = "Day_" + currentDay;

    // 2. 讀取雲端記帳分
    let todayBonus = parseInt(localStorage.getItem("bonusPoints_Day_" + currentDay)) || 0;
    
    // 🌟 [新增防呆相容]：若當天撲滿為 0，但總加分 (bonusPoints) 有值，取當前總加分作為保底
    if (todayBonus === 0) {
        let totalBonus = parseInt(localStorage.getItem("bonusPoints")) || 0;
        if (totalBonus > 0 && currentDay === 1) {
            todayBonus = totalBonus;
        }
    }

    // 3. 回傳當天真正的總分 (打卡 + 審核)
    return todayBase + todayBonus; 
}

/* 🌟 [新增] 自動更新小遊戲按鈕狀態 (反灰/亮起) */
function updateGameButtonState() {
    const btn = document.getElementById('energyCatchBtn'); 
    if (!btn) return;

    // 1. 如果是 DEBUG 模式，直接全亮並解鎖
    if (typeof ENERGY_CATCH_DEBUG !== 'undefined' && ENERGY_CATCH_DEBUG) {
        btn.style.filter = 'grayscale(0%) drop-shadow(0px 0px 8px rgba(76, 175, 80, 0.8))';
        btn.style.opacity = '1';
        btn.onclick = launchMiniGame;
        btn.innerHTML = "🌾 進入採集(測試中)";
        return;
    }


    let currentDay = typeof getCalendarDiffDays === "function" ? getCalendarDiffDays() : 1;

    // 2. 檢查今天是否已經玩過了
    const playedDate = localStorage.getItem('energyCatchPlayedDate');
    const todayStr = new Date().toDateString() + "_Day_" + currentDay;
    
    if (playedDate === todayStr) {
        btn.style.filter = 'grayscale(100%)';
        btn.style.opacity = '0.5';
        btn.onclick = () => { alert("🌾 您今日已採集完畢，請明天再來挑戰！"); };
        btn.innerHTML = "✅ 今日已完賽";
        return;
    }

    // 3. 計算今日專屬能量與門檻比較
    let todayRealEnergy = getTodayEnergy();
    let requiredEnergy = getRequiredEnergyForDay(currentDay);
    let diff = requiredEnergy - todayRealEnergy; // 👈 計算出還差幾分

    if (todayRealEnergy >= requiredEnergy) {
        // 🎉 達標：按鈕亮起，綁定點擊功能
        btn.style.filter = 'grayscale(0%) drop-shadow(0px 0px 8px rgba(76, 175, 80, 0.8))'; 
        btn.style.opacity = '1';
        btn.onclick = launchMiniGame;
        btn.innerHTML = "🌾 開始挑戰！";
    } else {
        // 🔒 未達標：按鈕反灰鎖定
        btn.style.filter = 'grayscale(100%)';
        btn.style.opacity = '0.6';
        btn.onclick = () => { 
            //let diff = requiredEnergy - todayRealEnergy;
            //alert(`🔒 能量不足\n\n還差 ⚡ ${diff} 分即可解鎖今日能量採集！\n快去完成任務與打卡吧！`); 

            if (typeof showCustomAlert === "function") {
                showCustomAlert('🔒', '能量不足', `還差 ⚡ ${diff} 分即可解鎖！\n目前今日能量：${todayRealEnergy} / ${requiredEnergy} 分\n快去完成任務與打卡吧！`);
            } else {
                alert(`🔒 能量不足\n\n還差 ⚡ ${diff} 分即可解鎖！\n目前今日能量：${todayRealEnergy} / ${requiredEnergy} 分\n快去完成任務與打卡吧！`);
            }
        };
        //btn.innerHTML = `🔒 獲 ${requiredEnergy} 分解鎖`;
        btn.innerHTML = `🔒 獲 ${diff} 分解鎖`;
    }
}

/* 🌟 [新增] 進場資格防呆驗證 */
function checkGameEligibility() {
    if (ENERGY_CATCH_DEBUG) return true; 

    let currentDay = 1;
    if (typeof getCalendarDiffDays === "function") {
        currentDay = getCalendarDiffDays();
    }

    let todayRealEnergy = getTodayEnergy();
    let requiredEnergy = getRequiredEnergyForDay(currentDay);

    if (todayRealEnergy < requiredEnergy) {
        if (typeof showCustomAlert === "function") {
            showCustomAlert('🔒', '能量不足', `勇者，需要累積滿 ${requiredEnergy} 分才能挑戰採集！\n\n目前今日能量：⚡ ${todayRealEnergy} 分\n快去完成任務與打卡吧！`);
        } else {
            alert(`🔒 能量不足\n\n勇者，需要累積滿 ${requiredEnergy} 分才能挑戰採集！\n\n目前今日能量：⚡ ${todayRealEnergy} 分\n快去完成任務與打卡吧！`);
        }
        return false;
    }

    const playedDate = localStorage.getItem('energyCatchPlayedDate');
    const todayStr = new Date().toDateString() + "_Day_" + currentDay;
    
    if (playedDate === todayStr) {
        if (typeof showCustomAlert === "function") {
            showCustomAlert('🌾', '今日已完賽', '今天已參與過能量採集！\n請好好休息，明天再來！');
        } else {
            alert('🌾 今日已完賽\n\n今天已參與過能量採集！\n請好好休息，明天再來！');
        }
        return false;
    }
    return true; 
}

const EnergyCatchGame = (function () {
  // 遊戲私有變數
  let canvas, ctx;
  let animFrameId = null;
  let spawnIntervalId = null;
  let timerIntervalId = null;

  let score = 0;
  let timeLeft = 20; // 遊戲時間 20 秒
  let isGameOver = false;
  let isCountingDown = false; // 是否處於倒數狀態

  // 🧺 籃子 (Player Basket) - 寬度維持 75，深度 65 防手指遮擋
  const basket = {
    x: 0,
    y: 0,
    width: 70,
    height: 30,
    color: '#4CAF50'
  };

  // 掉落物品類型與分數設定
  const itemTypes = [
    { type: 'water', label: '💧', score: 3, speed: 3.5, radius: 18 },  // 💧 水滴 +3分
    { type: 'veggie', label: '🥦', score: 2, speed: 4.0, radius: 18 }, // 🥦 蔬菜 +2分
    { type: 'tofu', label: '🧊', score: 5, speed: 4.8, radius: 18 },   // 🧊 豆腐 +5分
    { type: 'burger', label: '🍔', score: -3, speed: 3.8, radius: 20 }, // 🍔 漢堡 -3分
    { type: 'bomb', label: '💣', score: -5, speed: 4.2, radius: 20 }   // 💣 炸彈 -5分
  ];

  let items = [];
  let floatingTexts = []; // 飄動得分文字特效陣列
  let onGameCompleteCallback = null;

  /**
   * 將遊戲得分依規則轉換為最終能量值
   */
  function calculateEnergyGain(finalScore) {
    if (finalScore < 20) return 1;
    if (finalScore < 50) return 3;
    if (finalScore < 70) return 5;
    if (finalScore < 90) return 8;
    return 10; // finalScore >= 90
  }

  /**
   * 初始化 UI 結構
   */
  function initUI() {
    const oldModal = document.getElementById('energyCatchModal');
    if (oldModal) oldModal.remove();

    const modalHTML = `
      <div id="energyCatchModal" style="
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.85); z-index: 99999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: 'Avenir', Helvetica, Arial, sans-serif; touch-action: none;
      ">
        <div style="
          position: relative; width: 90%; max-width: 380px; background: #FFF8EA;
          border-radius: 16px; padding: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          text-align: center; border: 3px solid #FFB74D;
        ">
          <!-- 頂部資訊欄 -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: bold; color: #5D4037;">
            <span style="font-size: 16px;">⏳ 時間: <span id="ecTimer" style="color:#E65100;">20</span>s</span>
            <span style="font-size: 18px; color: #2E7D32;">✨ 得分: <span id="ecScore">0</span></span>
          </div>

          <!-- Canvas 畫面 -->
          <div style="position: relative;">
            <canvas id="energyCatchCanvas" width="340" height="420" style="
              background: linear-gradient(to bottom, #E8F5E9, #C8E6C9);
              border-radius: 12px; border: 2px solid #81C784; width: 100%; height: auto; display: block;
            "></canvas>
            
            <!-- 倒數計時遮罩 (對齊龍舟樣式) -->
            <div id="ecCountdownOverlay" style="
              position: absolute; top:0; left:0; width:100%; height:100%;
              background: rgba(0,0,0,0.5); border-radius: 12px;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              color: #FFD54F; font-size: 80px; font-weight: bold; text-shadow: 3px 3px 10px rgba(0,0,0,0.8);
            ">
              <div id="ecCountdownText">3</div>
            </div>
          </div>

          <p style="font-size: 12px; color: #795548; margin: 8px 0 0 0;">
            👈 左右滑動控制籃子 🚀 收集 💧🥦🧊 避開 🍔💣
          </p>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    canvas = document.getElementById('energyCatchCanvas');
    ctx = canvas.getContext('2d');

    // 籃子位置
    basket.x = (canvas.width - basket.width) / 2;
    basket.y = canvas.height - basket.height - 15;

    bindControls();
  }

  /**
   * 控制器綁定
   */
  function bindControls() {
    function moveBasket(clientX) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      let canvasX = (clientX - rect.left) * scaleX;
      basket.x = Math.max(0, Math.min(canvas.width - basket.width, canvasX - basket.width / 2));
    }

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) moveBasket(e.touches[0].clientX);
    }, { passive: false });

    canvas.addEventListener('mousemove', (e) => moveBasket(e.clientX));
  }

  /**
   * 倒數 3 秒動畫
   */
  function startCountdown(onComplete) {
    isCountingDown = true;
    let count = 3;
    const countEl = document.getElementById('ecCountdownText');
    const overlay = document.getElementById('ecCountdownOverlay');

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        if (countEl) countEl.innerText = count;
      } else if (count === 0) {
        /* 倒數完畢顯示 🏁 GO! */
        if (countEl) countEl.innerText = "🏁 GO!";
      } else {
        clearInterval(timer);
        if (overlay) overlay.style.display = "none";
        isCountingDown = false;
        onComplete();
      }
    }, 900);
  }

  /**
   * 掉落物品（機率配置）
   */
  function spawnItem() {
    if (isGameOver || isCountingDown) return;

    const rand = Math.random();
    let selectedType;
    if (rand < 0.35) selectedType = itemTypes[0];      // 💧 水滴 +3 (35%)
    else if (rand < 0.65) selectedType = itemTypes[1]; // 🥦 蔬菜 +2 (30%)
    else if (rand < 0.80) selectedType = itemTypes[2]; // 🧊 豆腐 +5 (15%)
    else if (rand < 0.90) selectedType = itemTypes[3]; // 🍔 漢堡 -3 (10%)
    else selectedType = itemTypes[4];                 // 💣 炸彈 -5 (10%)

    items.push({
      ...selectedType,
      x: Math.random() * (canvas.width - 40) + 20,
      y: -20
    });
  }

  /**
   * 新增得分漂浮文字
   */
  function addFloatingText(text, x, y, color) {
    floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color,
      alpha: 1.0,
      life: 30 // 存在幀數
    });
  }

  /**
   * 核心主迴圈
   */
  function update() {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 繪製籃子
    ctx.fillStyle = basket.color;
    ctx.beginPath();
    ctx.roundRect(basket.x, basket.y, basket.width, basket.height, 10);
    ctx.fill();

    // 籃口邊緣視覺強化線
    ctx.fillStyle = '#81C784';
    ctx.fillRect(basket.x, basket.y, basket.width, 6);

    // 籃子文字標籤
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🧺 能量籃', basket.x + basket.width / 2, basket.y + 22);

    if (!isCountingDown) {
      // 2. 物品更新與碰撞偵測
      for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        item.y += item.speed;

        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, item.x, item.y);

        // 碰撞偵測 (判定頂端籃口處)
        if (
          item.y + item.radius >= basket.y &&
          item.y - item.radius <= basket.y + 25 &&
          item.x >= basket.x - 8 &&
          item.x <= basket.x + basket.width + 8
        ) {
          score = Math.max(0, score + item.score);
          const scoreEl = document.getElementById('ecScore');
          if (scoreEl) scoreEl.innerText = score;

          // 顯示漂浮文字特效
          const textStr = item.score > 0 ? `+${item.score}` : `${item.score}`;
          const textColor = item.score > 0 ? '#2E7D32' : '#D32F2F';
          addFloatingText(textStr, item.x, basket.y - 10, textColor);

          items.splice(i, 1);
          continue;
        }

        if (item.y > canvas.height + 30) {
          items.splice(i, 1);
        }
      }

      // 3. 繪製漂浮特效
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y -= 1.5;
        ft.alpha -= 0.03;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();

        ft.life--;
        if (ft.life <= 0 || ft.alpha <= 0) {
          floatingTexts.splice(i, 1);
        }
      }
    }

    animFrameId = requestAnimationFrame(update);
  }

  /**
   * 倒數計時器
   */
  function startTimer() {
    timerIntervalId = setInterval(() => {
      timeLeft--;
      const timerEl = document.getElementById('ecTimer');
      if (timerEl) timerEl.innerText = timeLeft;

      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  /**
   * 結算畫面
   * 結算對齊龍舟體驗：時間到立刻關閉 Modal 視窗，傳回 (分數, 能量值) 給主程式 
   */
  function endGame() {
    isGameOver = true;
    clearInterval(spawnIntervalId);
    clearInterval(timerIntervalId);
    cancelAnimationFrame(animFrameId);

    const finalEnergyGain = calculateEnergyGain(score);

    // 🌟 [新增] 紀錄今日完賽天數，防重複遊玩
    let currentDay = 1;
    if (typeof getCalendarDiffDays === "function") {
        currentDay = getCalendarDiffDays();
    }
    localStorage.setItem('energyCatchPlayedDate', new Date().toDateString() + "_Day_" + currentDay);

    // 🎯 對齊龍舟體驗：遊戲結束立即關閉遊戲 Modal，交由主程式彈窗
    const modal = document.getElementById('energyCatchModal');
    if (modal) modal.remove();

    // 將得分與換算能量傳回主程式 launchMiniGame 接手處理
    if (typeof onGameCompleteCallback === 'function') {
      onGameCompleteCallback(score, finalEnergyGain);
    }
  }

  /**
   * 對外啟動函數
   */
  function start(onComplete) {
    /* 🌟 [新增] 啟動前進行資格驗證，未達門檻不開啟 */
    if (!checkGameEligibility()) return;

    score = 0;
    timeLeft = 20;
    isGameOver = false;
    items = [];
    floatingTexts = [];
    onGameCompleteCallback = onComplete;

    initUI();
    update();

    startCountdown(() => {
      spawnIntervalId = setInterval(spawnItem, 520);
      startTimer();
    });
  }

  return {
    start: start
  };
})();

