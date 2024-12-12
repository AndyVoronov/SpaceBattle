const tg = window.Telegram.WebApp;

class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 50;
        this.height = 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.speed = 5;
        this.bullets = [];
    }

    draw(ctx, color) {
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    move(direction) {
        if (direction === 'left' && this.x > 0) {
            this.x -= this.speed;
        }
        if (direction === 'right' && this.x < this.canvas.width - this.width) {
            this.x += this.speed;
        }
    }

    shoot() {
        this.bullets.push({
            x: this.x + this.width / 2,
            y: this.y,
            width: 5,
            height: 10,
            speed: 7
        });
    }
}

class Enemy {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 40;
        this.height = 40;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = 2;
    }

    draw(ctx, color) {
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    move() {
        this.y += this.speed;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player(this.canvas);
        this.enemies = [];
        this.keys = {};
        this.enemySpawnInterval = 2000;
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;

        this.setupTelegram();
        this.setupControls();
        this.startGame();
    }

    setupTelegram() {
        tg.ready();
        this.updateColors();
        tg.MainButton.setText('Играть снова');
        tg.MainButton.onClick(() => this.restartGame());
        tg.onEvent('themeChanged', () => this.updateColors());
    }

    updateColors() {
        this.colors = {
            background: tg.themeParams.bg_color || '#ffffff',
            text: tg.themeParams.text_color || '#000000',
            player: tg.themeParams.button_color || '#0088cc',
            bullet: tg.themeParams.link_color || '#00ff00',
            enemy: tg.themeParams.destructive_text_color || '#ff0000',
            heart: tg.themeParams.destructive_text_color || '#ff0000'
        };
    }

    restartGame() {
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;
        this.enemies = [];
        this.player = new Player(this.canvas);
        document.getElementById('gameOver').style.display = 'none';
        tg.MainButton.hide();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ') {
                this.player.shoot();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    startGame() {
        setInterval(() => {
            this.enemies.push(new Enemy(this.canvas));
        }, this.enemySpawnInterval);

        this.gameLoop();
    }

    update() {
        if (this.isGameOver) return;
        
        if (this.keys['ArrowLeft']) this.player.move('left');
        if (this.keys['ArrowRight']) this.player.move('right');

        // Обновление пуль
        this.player.bullets.forEach((bullet, bulletIndex) => {
            bullet.y -= bullet.speed;
            if (bullet.y < 0) {
                this.player.bullets.splice(bulletIndex, 1);
            }
        });

        // Обновление врагов
        this.enemies.forEach((enemy, enemyIndex) => {
            enemy.move();
            if (enemy.y > this.canvas.height) {
                this.enemies.splice(enemyIndex, 1);
                this.lives--;
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        });

        this.checkCollisions();
    }

    checkCollisions() {
        this.player.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.isColliding(bullet, enemy)) {
                    this.player.bullets.splice(bulletIndex, 1);
                    this.enemies.splice(enemyIndex, 1);
                    this.score += 100;
                }
            });
        });
    }

    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    gameOver() {
        this.isGameOver = true;
        document.getElementById('gameOver').style.display = 'block';
        tg.MainButton.show();
        
        if (tg.initDataUnsafe.query_id) {
            tg.sendData(JSON.stringify({
                action: 'gameOver',
                score: this.score
            }));
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Отрисовка счета и жизней
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Счет: ${this.score}`, 10, 30);
        this.ctx.fillText(`Жизни: ${this.lives}`, 10, 60);

        // Отрисовка жизней в виде сердечек
        for (let i = 0; i < this.lives; i++) {
            this.ctx.fillStyle = this.colors.heart;
            this.ctx.font = '24px Arial';
            this.ctx.fillText('❤️', this.canvas.width - 40 - (i * 30), 30);
        }

        // Отрисовка игровых объектов с новыми цветами
        this.player.draw(this.ctx, this.colors.player);
        
        this.player.bullets.forEach(bullet => {
            this.ctx.fillStyle = this.colors.bullet;
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });

        this.enemies.forEach(enemy => {
            enemy.draw(this.ctx, this.colors.enemy);
        });
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запуск игры
window.onload = () => {
    new Game();
}; 