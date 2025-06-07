// THE GAME ITSELF

// PlayGame class extends Phaser.Scene class
class PlayGame extends Phaser.Scene {

    controlKeys;
    player;
    enemyGroup;
    bulletGroup;

    constructor(){
        super({
            key: 'PlayGame'
        });
    this.playerHP = 5; // Quantidade inicial de vida
    this.hpText = null; // Objeto de texto para exibir a vida

    this.totalGameTime = 15 * 60 * 1000; // 15 minutos em milissegundos
    this.elapsedTime = 0;
    this.timeBar = null;
    this.timeText = null;
    
    }

    // method to be called once the instance has been created
    create() {

        this.cameras.main.setScroll(0, 0); // Trava a rolagem no topo

        // add player, enemies group and bullets group
        this.player = this.physics.add.sprite(GameOptions.gameSize.width / 2, GameOptions.gameSize.height / 2, 'player');
        this.enemyGroup = this.physics.add.group();
        this.bulletGroup = this.physics.add.group();
        // ADICIONA A CAMERA
        this.cameras.main.startFollow(this.player);
        this.coinGroup = this.physics.add.group();
        
         // Cria a barra de tempo no topo da tela
        const barWidth = this.cameras.main.width * 0.9;
        const barHeight = 20;
        const barX = this.cameras.main.centerX;
        const barY = 30;

        // Barra de fundo (cinza)
        this.timeBarBg = this.add.graphics()
            .fillStyle(0x333333, 1)
            .fillRect(-barWidth/2, 0, barWidth, barHeight)
            .setPosition(barX, barY)
            .setScrollFactor(0); // Fixa na tela

        // Barra de progresso (azul)
        this.timeBar = this.add.graphics()
            .fillStyle(0x00a8ff, 1)
            .fillRect(-barWidth/2, 0, barWidth, barHeight)
            .setPosition(barX, barY)
            .setScrollFactor(0); // Fixa na tela

        // Texto do tempo
        this.timeText = this.add.text(barX, barY - 8, '15:00', { 
            fontSize: '22px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontWeight: 'bold'
        })
        .setOrigin(0.5)
        .setScrollFactor(0); // Fixa na tela

          // Configura profundidades (z-index)
        // INIMIGOS FICAM ABAIXO DA BARRA DE TEMPO
        this.timeBarBg.setDepth(1000);
        this.timeBar.setDepth(1001);
        this.timeText.setDepth(1002);
        if (this.timeBarBack) this.timeBarBack.setDepth(999);

        // Garante que inimigos fiquem ABAIXO da barra
        this.enemyGroup.setDepth(100);
        
        this.updateTimeBar(); // Inicializa a barra


        // Cria a barra de vida
        this.healthBarBg = this.add.graphics(); // Fundo da barra (cinza)
        this.healthBar = this.add.graphics();   // Barra vermelha (vida atual)

        // Posiciona as barras acima do jogador
        this.healthBarContainer = this.add.container(this.player.x, this.player.y - 40);
        this.healthBarContainer.add([this.healthBarBg, this.healthBar]);

        // Atualiza a aparência inicial da barra
        this.updateHealthBar();

        this.hpText = this.add.text(30, 60, `HP: ${this.playerHP}`, {  // X: 30, Y: 60 (abaixo da barra)
            fontSize: '24px',
            fill: '#fff',
            fontFamily: 'Arial',
            backgroundColor: '#000000AA', // Fundo semi-transparente
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        })
        .setScrollFactor(0)
        .setDepth(1003); // Garante que fique acima de tudo
    
    // Modifique a colisão player vs inimigo:
    this.physics.add.collider(this.player, this.enemyGroup, () => {
        this.takeDamage(); // Substitui o restart direto por uma função de dano
    });

        // set keyboard controls
        // Note: Direct assignment to Phaser.Input.Keyboard.KeyboardPlugin might not be intended.
        // Assuming the intention was to get the keyboard plugin instance.
        const keyboard = this.input.keyboard;
        this.controlKeys = keyboard.addKeys({
            'up'    : Phaser.Input.Keyboard.KeyCodes.W,
            'left'  : Phaser.Input.Keyboard.KeyCodes.A,
            'down'  : Phaser.Input.Keyboard.KeyCodes.S,
            'right' : Phaser.Input.Keyboard.KeyCodes.D
        });

        // set outer rectangle and inner rectangle; enemy spawn area is between them
        const outerRectangle = new Phaser.Geom.Rectangle(0, 0, GameOptions.gameSize.width, GameOptions.gameSize.height);
        const innerRectangle = new Phaser.Geom.Rectangle(GameOptions.gameSize.width / 4, GameOptions.gameSize.height / 4, GameOptions.gameSize.width / 2, GameOptions.gameSize.height / 2);

        // timer event to add enemies
        // MUDANÇAS PARA SPAWNAR INIMIGOS NA REGIÃO DA CAMERA
        this.time.addEvent({
        delay: GameOptions.enemyRate,
        loop: true,
    callback: () => {
        // Obtém os limites da câmera
        const camera = this.cameras.main;
        const cameraBounds = new Phaser.Geom.Rectangle(
            camera.scrollX,
            camera.scrollY,
            camera.width,
            camera.height
        );

        // Cria uma área um pouco maior que a câmera para spawn (opcional)
        const spawnArea = new Phaser.Geom.Rectangle(
            cameraBounds.x - 100,
            cameraBounds.y - 100,
            cameraBounds.width + 200,
            cameraBounds.height + 200
        );

        // Escolhe um lado aleatório (cima, baixo, esquerda, direita)
        const side = Phaser.Math.Between(0, 3);
        let spawnPoint;

        switch(side) {
            case 0: // Topo
                spawnPoint = new Phaser.Geom.Point(
                    Phaser.Math.Between(spawnArea.left, spawnArea.right),
                    spawnArea.top
                );
                break;
            case 1: // Direita
                spawnPoint = new Phaser.Geom.Point(
                    spawnArea.right,
                    Phaser.Math.Between(spawnArea.top, spawnArea.bottom)
                );
                break;
            case 2: // Baixo
                spawnPoint = new Phaser.Geom.Point(
                    Phaser.Math.Between(spawnArea.left, spawnArea.right),
                    spawnArea.bottom
                );
                break;
            case 3: // Esquerda
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

        // timer event to fire bullets
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

        // bullet Vs enemy collision
        this.physics.add.collider(this.bulletGroup, this.enemyGroup, (bullet, enemy) => {
            const coin = this.physics.add.sprite(enemy.x, enemy.y, 'coin');
            coin.setDisplaySize(30, 30);
            coin.setSize(30, 30);
            this.coinGroup.add(coin);
            this.bulletGroup.killAndHide(bullet);
            (bullet.body).checkCollision.none = true; // Make bullet non-collidable after hit
            this.enemyGroup.killAndHide(enemy);
            (enemy.body).checkCollision.none = true; // Make enemy non-collidable after hit
        });

        // player Vs enemy collision
        this.physics.add.collider(this.player, this.enemyGroup, () => {
            this.scene.restart();
        });

        // player Vs coin colission
        this.physics.add.collider(this.player, this.coinGroup, (player, coin) => {
            this.coinGroup.killAndHide(coin);
            coin.body.checkCollision.none = true;
        })
    }

    // method to be called at each frame
    update(time, delta) {

        // Faz a barra seguir o jogador
        this.healthBarContainer.setPosition(this.player.x, this.player.y - 40);

        // set movement direction according to keys pressed
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

        // normalize vector if moving diagonally
        movementDirection.normalize();

        // set player velocity according to movement direction
        this.player.setVelocity(movementDirection.x * GameOptions.playerSpeed, movementDirection.y * GameOptions.playerSpeed);

        // get coins on collide
        const coinsInCircle = this.physics.overlapCirc(this.player.x, this.player.y, GameOptions.magnetRadius, true, true);
        coinsInCircle.forEach((body) => {
            const bodySprite = body.gameObject;
            if (bodySprite.texture.key == 'coin'){
                this.physics.moveToObject(bodySprite, this.player, 500);
            }
        })
        
        // move enemies towards player
        this.enemyGroup.getChildren().forEach((enemy) => {
            // Ensure enemy is active before moving
            if (enemy.active) {
                 this.physics.moveToObject(enemy, this.player, GameOptions.enemySpeed);
            }
        });
            
            // Atualiza o tempo decorrido
            this.elapsedTime += delta;
            
            // Atualiza a barra a cada segundo
            if (Math.floor(this.elapsedTime / 1000) > Math.floor((this.elapsedTime - delta) / 1000)) {
                this.updateTimeBar();
            }
            
            // Verifica se o tempo acabou
            if (this.elapsedTime >= this.totalGameTime) {
                this.gameOver(); // Chama sua função de game over
            }


    }

    updateHealthBar() {
    const barWidth = 80;  // Largura da barra
    const barHeight = 10; // Altura da barra
    const healthPercent = this.playerHP / 5; // Calcula a porcentagem de vida

    // Limpa os gráficos
    this.healthBarBg.clear();
    this.healthBar.clear();

    // Desenha o fundo da barra (cinza)
    this.healthBarBg.fillStyle(0x333333, 1); // Cinza escuro
    this.healthBarBg.fillRect(-barWidth/2, 0, barWidth, barHeight); // Centralizado

    // Desenha a barra de vida vermelha
    this.healthBar.fillStyle(0xff0000, 1); // Vermelho
    this.healthBar.fillRect(-barWidth/2, 0, barWidth * healthPercent, barHeight);
    
    // Adiciona borda branca (opcional)
    this.healthBarBg.lineStyle(1, 0xffffff, 1);
    this.healthBarBg.strokeRect(-barWidth/2, 0, barWidth, barHeight);
    }

    takeDamage() {
    if (this.isInvulnerable) return; // Ignora dano se invencível

    this.playerHP--;
    this.hpText.setText(`HP: ${this.playerHP}`);
    this.updateHealthBar(); // Atualiza a barra visual

    // Efeito visual de dano
    this.isInvulnerable = true;
    this.player.setTint(0xff0000); // Fica vermelho

    // Piscar o jogador
    const blinkInterval = this.time.addEvent({
        delay: 100,
        callback: () => {
            this.player.alpha = this.player.alpha === 1 ? 0.5 : 1;
        },
        repeat: 10
    });

    // Volta ao normal após 1 segundo
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

    updateTimeBar() {
        const barWidth = this.cameras.main.width * 0.9;
        const timePercent = 1 - (this.elapsedTime / this.totalGameTime);

        this.timeBar.clear()
            .fillStyle(0x00a8ff, 1)
            .fillRect(-barWidth/2, 0, barWidth * timePercent, 20);

        // Vermelho nos últimos 30 segundos
        if ((this.totalGameTime - this.elapsedTime) < 30000) {
            this.timeBar.fillStyle(0xff0000, 1);
        }

        // Atualiza texto
        const remainingTime = this.totalGameTime - this.elapsedTime;
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        this.timeText.setText(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    }

    gameOver() {
        // Pausa o jogo
        this.physics.pause();
        this.player.setTint(0xff0000);

        // Texto de Game Over
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

        // Texto de reiniciar
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

        // Configura tecla de reinício
        this.input.keyboard.once('keydown-R', () => {
            this.scene.restart();
        });
    }
}
