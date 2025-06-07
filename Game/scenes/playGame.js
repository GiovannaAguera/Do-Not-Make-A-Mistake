// THE GAME ITSELF

// PlayGame class extends Phaser.Scene class
class PlayGame extends Phaser.Scene {

    // --- Properties ---
    controlKeys;
    player;
    enemyGroup;
    bulletGroup;
    coinGroup;

    // Player Stats
    playerHP = 5; // Initial health points
    isInvulnerable = false; // Invulnerability status
    playerLVL = 1;
    playerXP = 0;
    nextLevelXP = 100;

    // UI Elements
    hpText = null; // Text object to display HP
    healthBarBg; // Health bar background graphic
    healthBar; // Health bar graphic
    healthBarContainer; // Container for health bar graphics
    timeBarBg; // Time bar background graphic
    timeBar; // Time bar graphic
    timeText = null; // Text object to display time

    // Game Timer
    totalGameTime = 900000; // 15 minutes in milliseconds
    elapsedTime = 0;

    // Map
    tileSize = 256;
    tileMap;
    tileLayer;
    tileset;
    tileCache = new Set();
    tileUpdateCounter = 0;
    lastTileX = null;
    lastTileY = null;

    // --- Constructor ---
    constructor(){
        super({
            key: 'PlayGame'
        });
    }

    // --- Phaser Scene Methods ---
    
    // method to be called once the instance has been created
    create() {
        // Camera setup
        this.cameras.main.setScroll(0, 0); // Lock scrolling at the top

        // Game Objects
        this.player = this.physics.add.sprite(GameOptions.gameSize.width / 2, GameOptions.gameSize.height / 2, 'player');
        this.player.setDisplaySize(60, 60);
        this.player.setSize(60, 60);
        this.mapGeneration();
        this.enemyGroup = this.physics.add.group();
        this.bulletGroup = this.physics.add.group();
        this.coinGroup = this.physics.add.group();

        // Camera follows the player
        this.cameras.main.startFollow(this.player);

        // UI Creation
        this.createTimeBar();
        this.createHealthBar();
        this.createLevelUI();

        // Input Handling
        this.setupInput();

        // Timed Events
        this.setupTimers();

        // Collisions
        this.setupCollisions();

        // Initial UI Update
        this.updateHealthBar(); // Initialize health bar appearance
        this.updateTimeBar(); // Initialize time bar appearance
        this.updateLevelText();

        // Set depths (z-index) - Ensure enemies are below the time bar
        this.timeBarBg.setDepth(1000);
        this.timeBar.setDepth(1001);
        this.timeText.setDepth(1002);
        // if (this.timeBarBack) this.timeBarBack.setDepth(999); // timeBarBack is not defined in the original code
        this.enemyGroup.setDepth(100); // Ensure enemies are below the time bar
    }

    // method to be called at each frame
    update(time, delta) {
        // Update UI positions
        // Ensure player exists before updating health bar container position
        if (this.player) {
            this.healthBarContainer.setPosition(this.player.x, this.player.y - 40);
            this.updateTilemapAroundPlayer(); // ✅ Now it's safe to call every frame
            this.cleanFarTiles(this.player.x, this.player.y);
        }

        // Player Movement
        this.handlePlayerMovement();

        // Coin Collection (Magnet effect)
        this.collectCoins();

        // Enemy Movement
        this.moveEnemies();

        // Game Timer Update
        this.updateGameTimer(delta);
    }

    // --- Custom Methods ---

    mapGeneration() {
        this.tileMap = this.make.tilemap({
            tileWidth: this.tileSize,
            tileHeight: this.tileSize,
            width: 1000,
            height: 1000
        });

        this.tileset = this.tileMap.addTilesetImage('tiles', null, this.tileSize, this.tileSize);
        this.tileLayer = this.tileMap.createBlankLayer('Ground', this.tileset);
        this.tileLayer.setDepth(-10); // Set behind everything

        // Initially fill a few tiles around the player
        this.updateTilemapAroundPlayer();

    }

    updateTilemapAroundPlayer(radius = 3) {
        const playerTileX = Math.floor(this.player.x / this.tileSize);
        const playerTileY = Math.floor(this.player.y / this.tileSize);

        // Only regenerate if player entered a new tile
        if (this.lastTileX === playerTileX && this.lastTileY === playerTileY) {
            return; // Player is still in same tile — skip update
        }

        // Save new position
        this.lastTileX = playerTileX;
        this.lastTileY = playerTileY;

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                const tileX = playerTileX + dx;
                const tileY = playerTileY + dy;
                const key = `${tileX},${tileY}`;

                if (!this.tileCache.has(key)) {
                    const tileIndex = 0;
                    this.tileLayer.putTileAt(tileIndex, tileX, tileY);
                    this.tileCache.add(key);
                }
            }
        }
    }

    cleanFarTiles(playerX, playerY, maxDistance = 10) {
        const playerTileX = Math.floor(playerX / this.tileSize);
        const playerTileY = Math.floor(playerY / this.tileSize);

        this.tileCache.forEach((key) => {
            const [tx, ty] = key.split(',').map(Number);
            const dx = tx - playerTileX;
            const dy = ty - playerTileY;

            if (Math.abs(dx) > maxDistance || Math.abs(dy) > maxDistance) {
                this.tileLayer.removeTileAt(tx, ty);
                this.tileCache.delete(key);
            }
        });
    }

    createTimeBar() {
        const barWidth = this.cameras.main.width * 0.9;
        const barHeight = 19;
        const barX = this.cameras.main.width * 0.05; // Left-aligned (5% from left)
        const barY = 30;

        // Background bar (gray - static)
        this.timeBarBg = this.add.graphics()
            .fillStyle(0x333333, 1)
            .fillRect(0, 0, barWidth, barHeight)
            .setPosition(barX, barY)
            .setScrollFactor(0);

        // Progress bar (blue - will grow from left to right)
        this.timeBar = this.add.graphics()
            .fillStyle(0x00a8ff, 1)
            .fillRect(0, 0, 0, barHeight) // Start with width 0
            .setPosition(barX, barY)
            .setScrollFactor(0);

        // Time text
        this.timeText = this.add.text(this.cameras.main.centerX, barY - 8, '15:00', { 
            fontSize: '22px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
    }

    updateTimeBar() {
        const barWidth = this.cameras.main.width * 0.9;
        const timePercent = this.elapsedTime / this.totalGameTime; // Changed from 1 - ...

        this.timeBar.clear()
            .fillStyle(0x00a8ff, 1);

        // Change color to red in the last 30 seconds
        if ((this.totalGameTime - this.elapsedTime) < 30000) {
            this.timeBar.fillStyle(0xff0000, 1);
        }

        this.timeBar.fillRect(0, 0, barWidth * timePercent, 20);

        // Update text
        const remainingTime = this.totalGameTime - this.elapsedTime;
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        this.timeText.setText(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    }

    createHealthBar() {
        const barWidth = 80;  // Bar width
        const barHeight = 10; // Bar height

        this.healthBarBg = this.add.graphics(); // Background bar (gray)
        this.healthBar = this.add.graphics();   // Red bar (current health)

        // Position the bars above the player
        // This will be updated in the update loop to follow the player
        this.healthBarContainer = this.add.container(0, 0);
        this.healthBarContainer.add([this.healthBarBg, this.healthBar]);

        // HP Text
        this.hpText = this.add.text(30, 60, `HP: ${this.playerHP}`, {  // Positioned below the time bar
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial',
            backgroundColor: '#000000AA', // Semi-transparent background
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        })
        .setScrollFactor(0)
        .setDepth(1003); // Ensure it's above everything else
    }

    updateHealthBar() {
        const barWidth = 80;  // Bar width
        const barHeight = 10; // Bar height
        const healthPercent = this.playerHP / 5; // Calculate health percentage (assuming max HP is 5)

        // Clear graphics
        this.healthBarBg.clear();
        this.healthBar.clear();

        // Draw background bar (gray)
        this.healthBarBg.fillStyle(0x333333, 1); // Dark gray
        this.healthBarBg.fillRect(-barWidth/2, 0, barWidth, barHeight); // Centered

        // Draw red health bar
        this.healthBar.fillStyle(0xff0000, 1); // Red
        this.healthBar.fillRect(-barWidth/2, 0, barWidth * healthPercent, barHeight);

        // Add white border (optional)
        this.healthBarBg.lineStyle(1, 0xffffff, 1);
        this.healthBarBg.strokeRect(-barWidth/2, 0, barWidth, barHeight);
    }

        createLevelUI() {
        const xpBarWidth = this.cameras.main.width * 0.8;
        const xpBarHeight = 20;
        const xpBarX = this.cameras.main.width * 0.1;
        const xpBarY = this.cameras.main.height - 40;

        this.xpBarBg = this.add.graphics()
            .fillStyle(0x333333, 1)
            .fillRect(0, 0, xpBarWidth, xpBarHeight)
            .setPosition(xpBarX, xpBarY)
            .setScrollFactor(0)
            .setDepth(1000);

        this.xpBar = this.add.graphics()
            .fillStyle(0xffff00, 1)
            .fillRect(0, 0, 0, xpBarHeight)
            .setPosition(xpBarX, xpBarY)
            .setScrollFactor(0)
            .setDepth(1001);

        this.xpText = this.add.text(this.cameras.main.centerX, xpBarY - 22, `XP: ${this.playerXP} / ${this.nextLevelXP}`, {
            fontSize: '18px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            backgroundColor: '#000000AA',
            padding: { left: 10, right: 10, top: 2, bottom: 2 }
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1002);

        this.levelText = this.add.text(60, 100, `Level: ${this.playerLVL}`, {
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial',
            backgroundColor: '#000000AA',
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        })
        .setScrollFactor(0)
        .setDepth(1003);
    }

    updateLevelText() {
        this.levelText.setText(`Level: ${this.playerLVL}`);
        this.xpText.setText(`XP: ${this.playerXP} / ${this.nextLevelXP}`);

        const xpBarWidth = this.cameras.main.width * 0.8;
        const xpPercent = Phaser.Math.Clamp(this.playerXP / this.nextLevelXP, 0, 1);

        this.xpBar.clear()
            .fillStyle(0xffff00, 1)
            .fillRect(0, 0, xpBarWidth * xpPercent, 20);
    }

    takeDamage() {
        if (this.isInvulnerable) return; // Ignore damage if invulnerable

        this.playerHP--;
        this.hpText.setText(`HP: ${this.playerHP}`);
        this.updateHealthBar(); // Update health bar visual

        // Visual damage effect
        this.isInvulnerable = true;
        this.player.setTint(0xff0000); // Turn red

        // Piscar o jogador (Blink the player)
        const blinkInterval = this.time.addEvent({
            delay: 100,
            callback: () => {
                this.player.alpha = this.player.alpha === 1 ? 0.5 : 1;
            },
            repeat: 10
        });

        // Volta ao normal após 1 segundo (Return to normal after 1 second)
        this.time.delayedCall(1000, () => {
            this.isInvulnerable = false;
            this.player.clearTint();
            this.player.setAlpha(1);
            blinkInterval.destroy();
        });

        if (this.playerHP <= 0) {
            this.gameOver();
        }
    }

    setupInput() {
        const keyboard = this.input.keyboard;
        this.controlKeys = keyboard.addKeys({
            'up'    : Phaser.Input.Keyboard.KeyCodes.W,
            'left'  : Phaser.Input.Keyboard.KeyCodes.A,
            'down'  : Phaser.Input.Keyboard.KeyCodes.S,
            'right' : Phaser.Input.Keyboard.KeyCodes.D
        });
    }

    setupTimers() {
        // Timer event to add enemies
        this.time.addEvent({
            delay: GameOptions.enemyRate,
            loop: true,
            callback: () => {
                // Get camera bounds
                const camera = this.cameras.main;
                const cameraBounds = new Phaser.Geom.Rectangle(
                    camera.scrollX,
                    camera.scrollY,
                    camera.width,
                    camera.height
                );

                // Create a spawn area slightly larger than the camera (optional)
                const spawnArea = new Phaser.Geom.Rectangle(
                    cameraBounds.x - 100,
                    cameraBounds.y - 100,
                    cameraBounds.width + 200,
                    cameraBounds.height + 200
                );

                // Choose a random side (top, bottom, left, right)
                const side = Phaser.Math.Between(0, 3);
                let spawnPoint;

                switch(side) {
                    case 0: // Top
                        spawnPoint = new Phaser.Geom.Point(
                            Phaser.Math.Between(spawnArea.left, spawnArea.right),
                            spawnArea.top
                        );
                        break;
                    case 1: // Right
                        spawnPoint = new Phaser.Geom.Point(
                            spawnArea.right,
                            Phaser.Math.Between(spawnArea.top, spawnArea.bottom)
                        );
                        break;
                    case 2: // Bottom
                        spawnPoint = new Phaser.Geom.Point(
                            Phaser.Math.Between(spawnArea.left, spawnArea.right),
                            spawnArea.bottom
                        );
                        break;
                    case 3: // Left
                        spawnPoint = new Phaser.Geom.Point(
                            spawnArea.left,
                            Phaser.Math.Between(spawnArea.top, spawnArea.bottom)
                        );
                        break;
                }

                const enemy = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, 'enemy');
                this.enemyGroup.add(enemy);
            }
        });

        // Timer event to fire bullets
        this.time.addEvent({
            delay       : GameOptions.bulletRate,
            loop        : true,
            callback    : () => {
                const closestEnemy = this.physics.closest(this.player, this.enemyGroup.getChildren());
                if (closestEnemy !== null) {
                    const bullet = this.physics.add.sprite(this.player.x, this.player.y, 'bullet');
                    this.bulletGroup.add(bullet);
                    this.physics.moveToObject(bullet, closestEnemy, GameOptions.bulletSpeed);
                }
            },
        });
    }

    setupCollisions() {
        // Player vs Enemy collision
        this.physics.add.collider(this.player, this.enemyGroup, () => {
            this.takeDamage(); // Call takeDamage function
        });

        // Bullet vs Enemy collision
        this.physics.add.collider(this.bulletGroup, this.enemyGroup, (bullet, enemy) => {
            (bullet.body).checkCollision.none = true;
            (enemy.body).checkCollision.none = true;            
            const coin = this.physics.add.sprite(enemy.x, enemy.y, 'coin');
            coin.setDisplaySize(30, 30);
            coin.setSize(30, 30);
            this.coinGroup.add(coin);
            this.bulletGroup.killAndHide(bullet);
            this.enemyGroup.killAndHide(enemy);
        });

        // Player vs Coin collision
        this.physics.add.collider(this.player, this.coinGroup, (player, coin) => {
            this.playerXP += 10;

            if (this.playerXP >= this.nextLevelXP) {
                this.levelUP();
            } else {
                this.updateLevelText(); // Update XP bar even if no level up
            }

            this.coinGroup.killAndHide(coin);
            coin.body.checkCollision.none = true;
        });
    }

    handlePlayerMovement() {
        // Ensure player exists before handling movement
        if (!this.player) return;

        let movementDirection = new Phaser.Math.Vector2(0, 0);
        if (this.controlKeys.right.isDown) {
            movementDirection.x ++;
        }
        if (this.controlKeys.left.isDown) {
            movementDirection.x --;
        }
        if (this.controlKeys.up.isDown) {
            movementDirection.y --;
        }
        if (this.controlKeys.down.isDown) {
            movementDirection.y ++;
        }

        // Normalize vector if moving diagonally
        movementDirection.normalize();

        // Set player velocity
        this.player.setVelocity(movementDirection.x * GameOptions.playerSpeed, movementDirection.y * GameOptions.playerSpeed);
    }

    collectCoins() {
        // Ensure player exists before collecting coins
        if (!this.player) return;

        const coinsInCircle = this.physics.overlapCirc(this.player.x, this.player.y, GameOptions.magnetRadius, true, true);
        coinsInCircle.forEach((body) => {
            const bodySprite = body.gameObject;
            if (bodySprite.texture.key == 'coin'){
                this.physics.moveToObject(bodySprite, this.player, 500);
            }
        });
    }

    levelUP() {
        this.playerLVL++;
        this.playerXP -= this.nextLevelXP;
        this.nextLevelXP = Math.floor(this.nextLevelXP * 1.2);
        this.updateLevelText(); // This now updates both level and XP bar
    }

    moveEnemies() {
        // Ensure player exists before moving enemies towards it
        if (!this.player) return;

        this.enemyGroup.getChildren().forEach((enemy) => {
            // Ensure enemy is active before moving
            if (enemy.active) {
                 this.physics.moveToObject(enemy, this.player, GameOptions.enemySpeed);
            }
        });
    }

    updateGameTimer(delta) {
        // Update elapsed time
        this.elapsedTime += delta;

        // Update the bar every second
        if (Math.floor(this.elapsedTime / 1000) > Math.floor((this.elapsedTime - delta) / 1000)) {
            this.updateTimeBar();
        }

        // Check if time is up
        if (this.elapsedTime >= this.totalGameTime) {
            this.gameOver(); // Call game over function
        }
    }

    gameOver() {
        // Pause the game
        this.physics.pause();
        // Ensure player exists before tinting
        if (this.player) {
            this.player.setTint(0xff0000);
        }

        // Game Over Text
        const gameOverText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 50,
            'GAME OVER',
            { 
                fontSize: '64px', 
                fill: '#ff0000',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 5
            }
        );
        gameOverText.setOrigin(0.5);

        // Restart Text
        const restartText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 50,
            'Pressione R para reiniciar',
            { 
                fontSize: '24px', 
                fill: '#ffffff',
                fontFamily: 'Arial'
            }
        );
        restartText.setOrigin(0.5);

        // Setup restart key
        this.input.keyboard.once('keydown-R', () => {
            this.scene.restart();
        });
    }
}
