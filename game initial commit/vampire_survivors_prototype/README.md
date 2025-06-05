# Vampire Survivors Prototype (Phaser 3 - JavaScript)

This project is a JavaScript conversion of the Vampire Survivors prototype originally created by Emanuele Feronato using TypeScript and Phaser 3.

Link to original article: [https://emanueleferonato.com/2024/11/29/quick-html5-prototype-of-vampire-survivors-built-with-phaser-like-the-original-game/](https://emanueleferonato.com/2024/11/29/quick-html5-prototype-of-vampire-survivors-built-with-phaser-like-the-original-game/)

## How to Run in VS Code

1.  **Open the Project:** Open the `vampire_survivors_prototype` folder in Visual Studio Code.
2.  **Install Live Server Extension:** If you don't have it already, install the "Live Server" extension from the VS Code Marketplace (Publisher: Ritwick Dey).
3.  **Start Live Server:** Right-click on the `index.html` file in the VS Code Explorer panel and select "Open with Live Server".
4.  **Play:** Your default web browser should open automatically, loading the game. Use WASD keys to move the player character. The player fires automatically towards the nearest enemy.

## Important Note: Missing Assets

The original article provided the code but not the image assets (`enemy.png`, `player.png`, `bullet.png`).

*   You need to create or find your own PNG images for the player, enemy, and bullet.
*   Place these images inside the `assets/sprites/` directory.
*   Make sure the filenames match exactly: `enemy.png`, `player.png`, `bullet.png`.

The game will not display the player, enemies, or bullets correctly until you add these image files.
