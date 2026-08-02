/**
 * 🎮 健康能量大採集 - 獨立小遊戲模組 (v2.0 升級版)
 * 包含：3秒倒數、防遮擋高籃子、漂浮分數特效、階梯式能量轉換
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

  // 籃子 (Player Basket)
  const basket = {
    x: 0,
    y: 0,
    width: 75,
    height: 35,
    color: '#4CAF50'
  };

  // 掉落物品類型
  const itemTypes = [
    { type: 'water', label: '💧', score: 2, speed: 3.5, radius: 18 },
    { type: 'veggie', label: '🥦', score: 3, speed: 4.0, radius: 18 },
    { type: 'gold', label: '🪙', score: 5, speed: 5.0, radius: 16 },
    { type: 'burger', label: '🍔', score: -3, speed: 3.8, radius: 20 }
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: bold; color: #5D4037;">
            <span style="font-size: 16px;">⏳ 時間: <span id="ecTimer" style="color:#E65100;">20</span>s</span>
            <span style="font-size: 18px; color: #2E7D32;">✨ 得分: <span id="ecScore">0</span></span>
          </div>

          <div style="position: relative;">
            <canvas id="energyCatchCanvas" width="340" height="420" style="
              background: linear-gradient(to bottom, #E8F5E9, #C8E6C9);
              border-radius: 12px; border: 2px solid #81C784; width: 100%; height: auto; display: block;
            "></canvas>
            
            <div id="ecCountdownOverlay" style="
              position: absolute; top:0; left:0; width:100%; height:100%;
              background: rgba(0,0,0,0.4); border-radius: 12px;
              display: flex; flex-direction: column; align-items: center; justify-content: center;
              color: #FFF; font-size: 64px; font-weight: bold; text-shadow: 2px 2px 8px rgba(0,0,0,0.6);
            ">
              <div id="ecCountdownText">3</div>
              <div style="font-size: 16px; margin-top: 10px; font-weight: normal; color: #FFE082;">準備採集健康能量！</div>
            </div>
          </div>

          <p style="font-size: 14px; color: #795548; margin: 8px 0 0 0;">
            👈 左右滑動控制籃子 🚀 收集 💧🥦🪙 避開 🍔
          </p>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    canvas = document.getElementById('energyCatchCanvas');
    ctx = canvas.getContext('2d');

    // 籃子靠底部（距離底部 15px），但因為高度增為 65px，上方籃口大幅伸長
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
        if (countEl) countEl.innerText = "GO!";
      } else {
        clearInterval(timer);
        if (overlay) overlay.style.display = "none";
        isCountingDown = false;
        onComplete();
      }
    }, 900);
  }

  /**
   * 掉落物品
   */
  function spawnItem() {
    if (isGameOver || isCountingDown) return;

    const rand = Math.random();
    let selectedType;
    if (rand < 0.4) selectedType = itemTypes[0];      // 💧 +2
    else if (rand < 0.7) selectedType = itemTypes[1]; // 🥦 +3
    else if (rand < 0.85) selectedType = itemTypes[2];// 🪙 +5
    else selectedType = itemTypes[3];                 // 🍔 -3

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
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🧺 能量籃', basket.x + basket.width / 2, basket.y + 22);

    if (!isCountingDown) {
      // 2. 物品更新與繪製
      for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        item.y += item.speed;

        ctx.font = '22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.label, item.x, item.y);

        // 碰撞偵測
        if (
          item.y + item.radius >= basket.y &&
          item.y - item.radius <= basket.y + basket.height &&
          item.x >= basket.x - 10 &&
          item.x <= basket.x + basket.width + 10
        ) {
          score = Math.max(0, score + item.score);
          const scoreEl = document.getElementById('ecScore');
          if (scoreEl) scoreEl.innerText = score;

          // 顯示漂浮文字特效 (+2, +3, +5 或 -3)
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
        ft.y -= 1.5; // 向上飄動
        ft.alpha -= 0.03; // 漸隱

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
   */
  function endGame() {
    isGameOver = true;
    clearInterval(spawnIntervalId);
    clearInterval(timerIntervalId);
    cancelAnimationFrame(animFrameId);

    // 依分數對照計算最終能量值
    const finalEnergyGain = calculateEnergyGain(score);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 採集完成！', canvas.width / 2, canvas.height / 2 - 40);

    ctx.font = '16px Arial';
    ctx.fillStyle = '#FFF8EA';
    ctx.fillText(`遊戲得分：${score} 分`, canvas.width / 2, canvas.height / 2 - 5);

    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#FFD54F';
    ctx.fillText(`⚡ 換算獲得 +${finalEnergyGain} 能量`, canvas.width / 2, canvas.height / 2 + 35);

    setTimeout(() => {
      const modal = document.getElementById('energyCatchModal');
      if (modal) modal.remove();

      if (typeof onGameCompleteCallback === 'function') {
        onGameCompleteCallback(finalEnergyGain);
      }
    }, 2400);
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
    update(); // 啟動畫面渲染

    // 啟動 3 秒倒數，結束後才啟動出怪與計時
    startCountdown(() => {
      spawnIntervalId = setInterval(spawnItem, 550);
      startTimer();
    });
  }

  return {
    start: start
  };
})();

