// Jump tuning values (easy to tweak in one place)
const JUMP = {
  jumpVelocity: 560, // Initial upward speed when jumping
  gravity: 1350,     // Downward pull strength
  maxFallSpeed: 760  // Maximum downward speed
};

// Movement tuning values (easy to tweak in one place)
const MOVEMENT = {
  acceleration: 1200, // How fast player speeds up when pressing left/right
  deceleration: 1600, // How fast player slows down when no key is pressed
  maxSpeed: 180       // Maximum horizontal speed
};

const ENEMY_RULES = {
  stompBounce: 320,
  stompTolerance: 10
};

// Texture keys (ready for future real image/sprite replacement)
const ASSETS = {
  player: "player",
  ground: "ground",
  platform: "platform",
  coin: "coin",
  enemy: "enemy",
  finish: "finish"
};

// Temporary placeholder colors
const COLORS = {
  sky: 0x87ceeb,
  hillFar: 0x9edb9a,
  hillNear: 0x7fcf78,
  player: 0x1e90ff,
  ground: 0x228b22,
  platform: 0x8b4513,
  coin: 0xffd700,
  enemy: 0xff6a00,
  finish: 0xff2d2d
};

// Level configs (small data structure to avoid messy hardcoding everywhere)
const LEVELS = [
  {
    name: "Level 1",
    worldWidth: 1200,
    worldHeight: 450,
    fallDeathY: 530,
    playerSpawn: { x: 120, y: 300 },
    ground: { y: 420, height: 60 },
    platforms: [
      { x: 280, y: 330, w: 140, h: 20 },
      { x: 430, y: 260, w: 140, h: 20 },
      { x: 580, y: 190, w: 140, h: 20 }
    ],
    coins: [
      { x: 260, y: 295 },
      { x: 430, y: 225 },
      { x: 580, y: 155 },
      { x: 700, y: 295 }
    ],
    enemy: {
      x: 220,
      y: 304,
      w: 28,
      h: 28,
      speed: 70,
      minX: 220,
      maxX: 340
    },
    finish: { x: 740, y: 330, w: 20, h: 120 }
  },
  {
    name: "Level 2",
    worldWidth: 1500,
    worldHeight: 450,
    fallDeathY: 530,
    playerSpawn: { x: 90, y: 300 },
    ground: { y: 420, height: 60 },
    platforms: [
      { x: 260, y: 340, w: 150, h: 20 },
      { x: 470, y: 290, w: 150, h: 20 },
      { x: 700, y: 240, w: 170, h: 20 },
      { x: 940, y: 300, w: 150, h: 20 },
      { x: 1170, y: 250, w: 180, h: 20 }
    ],
    coins: [
      { x: 240, y: 305 },
      { x: 470, y: 255 },
      { x: 700, y: 205 },
      { x: 940, y: 265 },
      { x: 1170, y: 215 }
    ],
    enemy: {
      x: 640,
      y: 214,
      w: 28,
      h: 28,
      speed: 80,
      minX: 620,
      maxX: 780
    },
    finish: { x: 1420, y: 330, w: 20, h: 120 }
  }
];

class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload() {
    ensurePlaceholderTextures(this);
  }

  create() {
    createSimpleBackground(this, this.scale.width, this.scale.height, false);

    this.add.text(this.scale.width / 2, 120, "Mini Platformer", {
      fontSize: "56px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(this.scale.width / 2, 210, "Press SPACE or Click to Start", {
      fontSize: "26px",
      color: "#f5f5f5"
    }).setOrigin(0.5);

    this.add.text(this.scale.width / 2, 270, "Arrow Keys: Move / Jump", {
      fontSize: "20px",
      color: "#f0f0f0"
    }).setOrigin(0.5);

    let started = false;
    const startGame = () => {
      if (started) return;
      started = true;
      this.scene.start("LevelScene", { levelIndex: 0, totalScore: 0 });
    };

    this.input.keyboard.once("keydown-SPACE", startGame);
    this.input.once("pointerdown", startGame);
  }
}

class LevelScene extends Phaser.Scene {
  constructor() {
    super("LevelScene");
  }

  init(data) {
    this.levelIndex = typeof data.levelIndex === "number" ? data.levelIndex : 0;
    this.totalScore = typeof data.totalScore === "number" ? data.totalScore : 0;
    this.levelScore = 0;
    this.levelCleared = false;
    this.isRestarting = false;
    this.level = LEVELS[this.levelIndex];
  }

  create() {
    const level = this.level;

    // Sync physics world bounds with camera bounds
    this.physics.world.setBounds(0, 0, level.worldWidth, level.worldHeight);
    // Keep left/right/top collision, allow falling below bottom for death-restart
    this.physics.world.setBoundsCollision(true, true, true, false);

    createSimpleBackground(this, level.worldWidth, level.worldHeight, true);

    this.ground = createGround(this, level);
    this.platforms = createPlatforms(this, level.platforms);
    this.coins = createCoins(this, level.coins);
    this.enemy = createEnemy(this, level.enemy);
    this.finish = createFinish(this, level.finish);
    this.player = createPlayer(this, level.playerSpawn.x, level.playerSpawn.y);

    // Player collisions
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);

    // UI
    this.scoreText = this.add.text(20, 20, "", {
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold"
    });
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(1000);
    this.updateScoreText();

    this.levelText = this.add.text(20, 56, level.name, {
      fontSize: "20px",
      color: "#ffffff"
    });
    this.levelText.setScrollFactor(0);
    this.levelText.setDepth(1000);

    this.statusText = this.add.text(this.scale.width / 2, 20, "", {
      fontSize: "38px",
      color: "#ffffff",
      fontStyle: "bold"
    });
    this.statusText.setOrigin(0.5, 0);
    this.statusText.setScrollFactor(0);
    this.statusText.setDepth(1000);
    this.statusText.setVisible(false);

    // Overlaps
    this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
    if (this.enemy) {
      this.physics.add.overlap(this.player, this.enemy, this.handlePlayerEnemy, null, this);
    }
    this.physics.add.overlap(this.player, this.finish, this.handleFinish, null, this);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();

    // Camera
    this.cameras.main.setBounds(0, 0, level.worldWidth, level.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(220, 120);
  }

  update() {
    // Restart level if player falls below level
    if (this.player.y > this.level.fallDeathY) {
      this.triggerFailRestart();
      return;
    }

    // Left/right movement with acceleration and deceleration
    const leftDown = this.cursors.left.isDown;
    const rightDown = this.cursors.right.isDown;

    if (leftDown && !rightDown) {
      this.player.setAccelerationX(-MOVEMENT.acceleration);
      this.setPlayerFacing("left");
    } else if (rightDown && !leftDown) {
      this.player.setAccelerationX(MOVEMENT.acceleration);
      this.setPlayerFacing("right");
    } else {
      this.player.setAccelerationX(0);
    }

    // Jump only when touching the ground/platform
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && this.player.body.blocked.down) {
      this.player.setVelocityY(-JUMP.jumpVelocity);
    }

    // Enemy patrol movement
    if (this.enemy && this.enemy.active) {
      if (this.enemy.x <= this.level.enemy.minX) {
        this.enemy.setVelocityX(this.level.enemy.speed);
      } else if (this.enemy.x >= this.level.enemy.maxX) {
        this.enemy.setVelocityX(-this.level.enemy.speed);
      }
    }
  }

  updateScoreText() {
    this.scoreText.setText(`\u5206\u6570: ${this.totalScore + this.levelScore}`);
  }

  setPlayerFacing(direction) {
    if (this.player.facing === direction) return;
    this.player.facing = direction;
    // Hook for future sprite animation integration
    this.player.setFlipX(direction === "left");
  }

  collectCoin(playerObj, coin) {
    if (!coin.active) return;

    coin.disableBody(true, true); // Hide and disable collected coin
    this.levelScore += 1;
    this.updateScoreText();
  }

  handlePlayerEnemy(playerObj, enemyObj) {
    if (!enemyObj.active || this.isRestarting || this.levelCleared) return;

    const isFalling = playerObj.body.velocity.y > 0;
    const isFromAbove = playerObj.body.bottom <= enemyObj.body.top + ENEMY_RULES.stompTolerance;

    if (isFalling && isFromAbove) {
      enemyObj.disableBody(true, true); // Defeat enemy
      playerObj.setVelocityY(-ENEMY_RULES.stompBounce); // Bounce up
    } else {
      this.triggerFailRestart();
    }
  }

  handleFinish() {
    if (this.levelCleared || this.isRestarting) return;

    this.levelCleared = true;
    this.physics.pause();
    const newTotal = this.totalScore + this.levelScore;

    this.statusText.setText("\u901a\u5173");
    this.statusText.setColor("#6dff8a");
    this.statusText.setVisible(true);

    this.time.delayedCall(500, () => {
      const hasNextLevel = this.levelIndex < LEVELS.length - 1;
      if (hasNextLevel) {
        this.scene.start("LevelScene", {
          levelIndex: this.levelIndex + 1,
          totalScore: newTotal
        });
      } else {
        this.scene.start("WinScene", { finalScore: newTotal });
      }
    });
  }

  triggerFailRestart() {
    if (this.isRestarting || this.levelCleared) return;

    this.isRestarting = true;
    this.physics.pause();
    this.statusText.setText("\u5931\u8d25\u91cd\u5f00");
    this.statusText.setColor("#ff6666");
    this.statusText.setVisible(true);

    this.time.delayedCall(500, () => {
      this.scene.restart({
        levelIndex: this.levelIndex,
        totalScore: this.totalScore
      });
    });
  }
}

class WinScene extends Phaser.Scene {
  constructor() {
    super("WinScene");
  }

  init(data) {
    this.finalScore = typeof data.finalScore === "number" ? data.finalScore : 0;
  }

  create() {
    createSimpleBackground(this, this.scale.width, this.scale.height, false);

    this.add.text(this.scale.width / 2, 120, "\u80dc\u5229", {
      fontSize: "64px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(this.scale.width / 2, 210, `\u603b\u5206: ${this.finalScore}`, {
      fontSize: "36px",
      color: "#fff4b8",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(this.scale.width / 2, 280, "Press SPACE or Click to Restart", {
      fontSize: "24px",
      color: "#f2f2f2"
    }).setOrigin(0.5);

    let restarting = false;
    const restart = () => {
      if (restarting) return;
      restarting = true;
      this.scene.start("StartScene");
    };

    this.input.keyboard.once("keydown-SPACE", restart);
    this.input.once("pointerdown", restart);
  }
}

// ---------- Creation helpers ----------

function createSolidTexture(scene, key, color) {
  const graphics = scene.add.graphics();
  graphics.fillStyle(color, 1);
  graphics.fillRect(0, 0, 1, 1);
  graphics.generateTexture(key, 1, 1);
  graphics.destroy();
}

function ensurePlaceholderTextures(scene) {
  if (!scene.textures.exists(ASSETS.player)) createSolidTexture(scene, ASSETS.player, COLORS.player);
  if (!scene.textures.exists(ASSETS.ground)) createSolidTexture(scene, ASSETS.ground, COLORS.ground);
  if (!scene.textures.exists(ASSETS.platform)) createSolidTexture(scene, ASSETS.platform, COLORS.platform);
  if (!scene.textures.exists(ASSETS.coin)) createSolidTexture(scene, ASSETS.coin, COLORS.coin);
  if (!scene.textures.exists(ASSETS.enemy)) createSolidTexture(scene, ASSETS.enemy, COLORS.enemy);
  if (!scene.textures.exists(ASSETS.finish)) createSolidTexture(scene, ASSETS.finish, COLORS.finish);
}

function createSimpleBackground(scene, width, height, worldSpace) {
  const centerX = width / 2;
  const centerY = height / 2;

  const sky = scene.add.rectangle(centerX, centerY, width, height, COLORS.sky);
  sky.setDepth(-100);
  if (!worldSpace) sky.setScrollFactor(0);

  const hillFar = scene.add.rectangle(width * 0.45, height - 70, width * 1.1, 160, COLORS.hillFar);
  hillFar.setDepth(-90);
  hillFar.setScrollFactor(worldSpace ? 0.35 : 0);

  const hillNear = scene.add.rectangle(width * 0.6, height - 40, width * 1.2, 120, COLORS.hillNear);
  hillNear.setDepth(-80);
  hillNear.setScrollFactor(worldSpace ? 0.55 : 0);
}

function createGround(scene, level) {
  return scene.physics.add.staticImage(level.worldWidth / 2, level.ground.y, ASSETS.ground)
    .setDisplaySize(level.worldWidth, level.ground.height)
    .refreshBody();
}

function createPlatforms(scene, platformData) {
  const group = scene.physics.add.staticGroup();
  platformData.forEach((p) => {
    group.create(p.x, p.y, ASSETS.platform)
      .setDisplaySize(p.w, p.h)
      .refreshBody();
  });
  return group;
}

function createCoins(scene, coinData) {
  const group = scene.physics.add.staticGroup();
  coinData.forEach((c) => {
    group.create(c.x, c.y, ASSETS.coin)
      .setDisplaySize(16, 16)
      .refreshBody();
  });
  return group;
}

function createEnemy(scene, enemyData) {
  if (!enemyData) return null;

  const enemy = scene.physics.add.sprite(enemyData.x, enemyData.y, ASSETS.enemy)
    .setDisplaySize(enemyData.w, enemyData.h);

  enemy.setImmovable(true);
  enemy.body.allowGravity = false;
  enemy.setVelocityX(enemyData.speed);
  return enemy;
}

function createFinish(scene, finishData) {
  return scene.physics.add.staticImage(finishData.x, finishData.y, ASSETS.finish)
    .setDisplaySize(finishData.w, finishData.h)
    .refreshBody();
}

function createPlayer(scene, x, y) {
  const player = scene.physics.add.sprite(x, y, ASSETS.player)
    .setDisplaySize(32, 48);

  player.setCollideWorldBounds(true);
  player.facing = "right"; // Hook for future animation state
  player.setDragX(MOVEMENT.deceleration);
  player.setMaxVelocity(MOVEMENT.maxSpeed, JUMP.maxFallSpeed);
  return player;
}

// Phaser game configuration and scene registration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
  parent: "game-container",
  backgroundColor: "#87CEEB",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: JUMP.gravity },
      debug: false
    }
  },
  scene: [StartScene, LevelScene, WinScene]
};

new Phaser.Game(config);
