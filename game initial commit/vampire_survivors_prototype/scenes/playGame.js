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
    }

    // method to be called once the instance has been created
    create() {

        // add player, enemies group and bullets group
        this.player = this.physics.add.sprite(GameOptions.gameSize.width / 2, GameOptions.gameSize.height / 2, 'player');
        this.enemyGroup = this.physics.add.group();
        this.bulletGroup = this.physics.add.group();
        // ADICIONA A CAMERA
        this.cameras.main.startFollow(this.player);

        this.hpText = this.add.text(16, 16, `HP: ${this.playerHP}`, {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial'
        });
        this.hpText.setScrollFactor(0); // Faz o texto ficar fixo na tela
    
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
            // Cast to 'any' to access 'body' if needed, or ensure proper Phaser types
            // Assuming killAndHide is sufficient
            this.bulletGroup.killAndHide(bullet);
            (bullet.body).checkCollision.none = true; // Make bullet non-collidable after hit
            this.enemyGroup.killAndHide(enemy);
            (enemy.body).checkCollision.none = true; // Make enemy non-collidable after hit
        });

        // player Vs enemy collision
        this.physics.add.collider(this.player, this.enemyGroup, () => {
            this.scene.restart();
        });
    }

    // method to be called at each frame
    update() {

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

        // move enemies towards player
        this.enemyGroup.getChildren().forEach((enemy) => {
            // Ensure enemy is active before moving
            if (enemy.active) {
                 this.physics.moveToObject(enemy, this.player, GameOptions.enemySpeed);
            }
        });
    }

    takeDamage() {
    if (this.isInvulnerable) return; // Ignora dano se invencível

    this.playerHP--;
    this.hpText.setText(`HP: ${this.playerHP}`);

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
