/**
 * 🎮 健康能量大採集 - 獨立小遊戲模組
 * 支援 Mobile Touch 滑動與 Desktop 滑鼠操作
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

  // 籃子 (Player Basket)
  const basket = {
    x: 0,
    y: 0,
    width: 70,
    height: 30,
    color: '#4CAF50'
  };

  // 下落物品清單 (Items)
  let items = [];
  const itemTypes = [
    { type: 'water', label: '💧', score: 2, speed: 3.5, radius: 18 },
    { type: 'veggie', label: '🥦', score: 3, speed: 4.0, radius: 18 },
    { type: 'gold', label: '🪙', score: 5, speed: 5.0, radius: 16 },
    { type: 'burger', label: '🍔', score: -3, speed: 3.8, radius: 20 } // 避開垃圾食物
  ];

  // 遊戲結束時的回調函數 (Callback)
  let onGameCompleteCallback = null;

  /**
   * 初始化遊戲視窗與 Canvas
   */
  function initUI() {
    // 若已存在 Modal 則先移除
    const oldModal = document.getElementById('energyCatchModal');
    if (oldModal) oldModal.remove();

    // 建立 Modal HTML 結構
    const modalHTML = `
      <div id="energyCatchModal" style="
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0, 0, 0, 0.85); z-index: 99999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: Arial, sans-serif; touch-action: none;
      ">
        <div style="
          position: relative; width: 90%; max-width: 380px; background: #FFF8EA;
          border-radius: 16px; padding: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          text-align: center; border: 3px solid #FFB74D;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: bold; color: #5D4037;">
            <span style="font-size: 16px;">⏳ 時間: <span id="ecTimer" style="color:#E65100;">20</span>s</span>
            <span style="font-size: 18px; color: #2E7D32;">✨ 能量: <span id="ecScore">0</span></span>
          </div>

          <canvas id="energyCatchCanvas" width="340" height="420" style="
            background: linear-gradient(to bottom, #E8F5E9, #C8E6C9);
            border-radius: 12px; border: 2px solid #81C784; width: 100%; height: auto; display: block;
          "></canvas>

          <p style="font-size: 12px; color: #795548; margin: 8px 0 0 0;">
            👈 左右滑動控制籃子 🚀 收集 💧🥦🪙 避開 🍔
          </p>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    canvas = document.getElementById('energyCatchCanvas');
    ctx = canvas.getContext('2d');

    // 設定籃子初始位置
    basket.x = (canvas.width - basket.width) / 2;
    basket.y = canvas.height - basket.height - 10;

    // 綁定觸控與滑鼠事件
    bindControls();
  }

  /**
   * 控制器綁定 (Touch & Mouse)
   */
  function bindControls() {
    function moveBasket(clientX) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      let canvasX = (clientX - rect.left) * scaleX;
      
      // 限制籃子不超出畫布邊界
      basket.x = Math.max(0, Math.min(canvas.width - basket.width, canvasX - basket.width / 2));
    }

    // Touch 事件 (手機)
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        moveBasket(e.touches[0].clientX);
      }
    }, { passive: false });

    // Mouse 事件 (電腦測試)
    canvas.addEventListener('mousemove', (e) => {
      moveBasket(e.clientX);
    });
  }

  /**
   * 產生掉落物品
   */
  function spawnItem() {
    if (isGameOver) return;

    // 隨機選擇物品類型 (調整權重)
    const rand = Math.random();
    let selectedType;
    if (rand < 0.4) selectedType = itemTypes[0];      // 💧 水滴 (40%)
    else if (rand < 0.7) selectedType = itemTypes[1]; // 🥦 蔬菜 (30%)
    else if (rand < 0.85) selectedType = itemTypes[2];// 🪙 金幣 (15%)
    else selectedType = itemTypes[3];                 // 🍔 漢堡 (15%)

    const item = {
      ...selectedType,
      x: Math.random() * (canvas.width - 40) + 20,
      y: -20
    };
    items.push(item);
  }

  /**
   * 遊戲核心渲染與更新迴圈
   */
  function update() {
    if (isGameOver) return;

    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 繪製籃子
    ctx.fillStyle = basket.color;
    ctx.beginPath();
    ctx.roundRect(basket.x, basket.y, basket.width, basket.height, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🧺 能量籃', basket.x + basket.width / 2, basket.y + 19);

    // 2. 更新並繪製掉落物品
    for (let i = items.length - 1; i >= 0; i--) {
      let item = items[i];
      item.y += item.speed;

      // 繪製物品 Icon
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, item.x, item.y);

      // 碰撞偵測 (Collision Detection)
      if (
        item.y + item.radius >= basket.y &&
        item.y - item.radius <= basket.y + basket.height &&
        item.x >= basket.x - 10 &&
        item.x <= basket.x + basket.width + 10
      ) {
        // 吃到物品
        score = Math.max(0, score + item.score); // 分數不低於 0
        document.getElementById('ecScore').innerText = score;
        
        // 浮動分數特效 (簡單表示)
        items.splice(i, 1);
        continue;
      }

      // 超出底部邊界判定
      if (item.y > canvas.height + 30) {
        items.splice(i, 1);
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
   * 遊戲結束結算
   */
  function endGame() {
    isGameOver = true;
    clearInterval(spawnIntervalId);
    clearInterval(timerIntervalId);
    cancelAnimationFrame(animFrameId);

    // 繪製結束畫面
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 時間到！', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '18px Arial';
    ctx.fillText(`本次採集能量: ${score} 點`, canvas.width / 2, canvas.height / 2 + 10);

    // 2 秒後關閉並發送結果
    setTimeout(() => {
      const modal = document.getElementById('energyCatchModal');
      if (modal) modal.remove();

      // 呼叫外部 Callback 傳遞最後得分
      if (typeof onGameCompleteCallback === 'function') {
        onGameCompleteCallback(score);
      }
    }, 2200);
  }

  /**
   * 對外公開的主啟動介面 (Public API)
   */
  function start(onComplete) {
    // 重設狀態
    score = 0;
    timeLeft = 20;
    isGameOver = false;
    items = [];
    onGameCompleteCallback = onComplete;

    // 建置 UI 與啟動迴圈
    initUI();
    update();

    // 啟動定時產生物品與計時器
    spawnIntervalId = setInterval(spawnItem, 600);
    startTimer();
  }

  // 曝露對外介面
  return {
    start: start
  };
})();

