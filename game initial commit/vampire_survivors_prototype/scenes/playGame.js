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
    }

    // method to be called once the instance has been created
    create() {

        // add player, enemies group and bullets group
        this.player = this.physics.add.sprite(GameOptions.gameSize.width / 2, GameOptions.gameSize.height / 2, 'player');
        this.enemyGroup = this.physics.add.group();
        this.bulletGroup = this.physics.add.group();

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
        this.time.addEvent({
            delay       : GameOptions.enemyRate,
            loop        : true,
            callback    : () => {
                const spawnPoint = Phaser.Geom.Rectangle.RandomOutside(outerRectangle, innerRectangle);
                const enemy = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, 'enemy');
                this.enemyGroup.add(enemy);
            },
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
}
