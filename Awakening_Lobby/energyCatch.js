/**
 * 🎮 健康能量大採集 - 獨立小遊戲模組 (v2.2 豆腐與炸彈版)
 * 包含：3秒倒數、加深籃子深度、漂浮分數特效、階梯式能量轉換
 * 物品：💧水滴(+3)、🥦蔬菜(+2)、🧊豆腐(+5)、🍔漢堡(-3)、💣炸彈(-5)
 */

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
    if (finalScore < 10) return 1;
    if (finalScore < 20) return 3;
    if (finalScore < 40) return 5;
    if (finalScore < 50) return 8;
    return 10; // finalScore >= 50
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
   * 結算對齊龍舟體驗：時間到立刻關閉 Modal 視窗，傳回 (分數, 能量值) 給主程式 */
   */
  function endGame() {
    isGameOver = true;
    clearInterval(spawnIntervalId);
    clearInterval(timerIntervalId);
    cancelAnimationFrame(animFrameId);

    const finalEnergyGain = calculateEnergyGain(score);

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

