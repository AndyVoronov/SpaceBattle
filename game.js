const tg = window.Telegram.WebApp;

class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = 50;
        this.height = 50;
        this.x = 400 - this.width / 2;
        this.y = 500;
        this.speed = 5;
        this.bullets = [];
    }

    draw(ctx, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }

    move(direction) {
        const speed = this.speed * (direction === 'left' ? -1 : 1);
        const newX = this.x + speed;
        const maxX = 800 - this.width;
        
        if (newX >= 0 && newX <= maxX) {
            this.x = newX;
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
        this.x = Math.random() * (800 - this.width);
        this.y = -this.height;
        this.speed = 2;
    }

    draw(ctx, color) {
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    move() {
        this.y += this.speed * (this.canvas.height / 600);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scaleX = window.innerWidth / 800;
        this.scaleY = window.innerHeight / 600;
        this.resizeCanvas();
        this.player = new Player(this.canvas);
        this.enemies = [];
        this.keys = {};
        this.enemySpawnInterval = 2000;
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;

        if (tg.initDataUnsafe?.query_id) {
            tg.ready();
        }
        this.setupTelegram();
        this.setupControls();
        this.setupTouchControls();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.startGame();
    }

    resizeCanvas() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Устанавливаем размеры канваса равными размерам окна
        this.canvas.width = windowWidth;
        this.canvas.height = windowHeight;
        
        // Обновляем коэффициенты масштабирования
        this.scaleX = windowWidth / 800;
        this.scaleY = windowHeight / 600;

        // Обновляем позицию игрока при изменении размера экрана
        if (this.player) {
            this.player.x = (this.player.x * this.scaleX) / this.scaleX;
        }
    }

    setupTouchControls() {
        // Обработка касаний экрана
        const handleTouch = (e) => {
            const touch = e.touches[0];
            const centerX = window.innerWidth / 2;
            
            // Сбрасываем предыдущие нажатия
            this.keys['ArrowLeft'] = false;
            this.keys['ArrowRight'] = false;
            
            // Определяем, какая половина экрана нажата
            if (touch) {
                if (touch.clientX < centerX) {
                    this.keys['ArrowLeft'] = true;
                } else {
                    this.keys['ArrowRight'] = true;
                }
            }
        };

        // Обработка окончания касания
        const handleTouchEnd = () => {
            this.keys['ArrowLeft'] = false;
            this.keys['ArrowRight'] = false;
        };

        // Добавляем обработчики событий касания
        this.canvas.addEventListener('touchstart', handleTouch);
        this.canvas.addEventListener('touchmove', handleTouch);
        this.canvas.addEventListener('touchend', handleTouchEnd);

        // Добавляем автоматическую стрельбу на мобильных устройствах
        if ('ontouchstart' in window) {
            setInterval(() => {
                if (!this.isGameOver) {
                    this.player.shoot();
                }
            }, 500);
        }

        // Предотвращаем скролл страницы при свайпах
        document.addEventListener('touchmove', (e) => {
            if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
        }, { passive: false });
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
        this.player.x = 400 - this.player.width / 2;
        this.player.y = 500;
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
        const scaleCoord = (value, isX = true) => value * (isX ? this.scaleX : this.scaleY);

        // Отрисовка счета и жизней
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = `${scaleCoord(20, false)}px Arial`;
        this.ctx.fillText(`Счет: ${this.score}`, scaleCoord(10), scaleCoord(30, false));
        this.ctx.fillText(`Жизни: ${this.lives}`, scaleCoord(10), scaleCoord(60, false));

        // Отрисовка жизней в виде сердечек с увеличенным расстоянием
        for (let i = 0; i < this.lives; i++) {
            this.ctx.fillStyle = this.colors.heart;
            this.ctx.font = `${scaleCoord(24, false)}px Arial`;
            this.ctx.fillText('❤️', 
                scaleCoord(760 - i * 50),
                scaleCoord(30, false)
            );
        }

        // Отрисовка игрока (треугольника)
        this.ctx.fillStyle = this.colors.player;
        this.ctx.beginPath();
        this.ctx.moveTo(
            scaleCoord(this.player.x + this.player.width / 2),
            scaleCoord(this.player.y, false)
        );
        this.ctx.lineTo(
            scaleCoord(this.player.x + this.player.width),
            scaleCoord(this.player.y + this.player.height, false)
        );
        this.ctx.lineTo(
            scaleCoord(this.player.x),
            scaleCoord(this.player.y + this.player.height, false)
        );
        this.ctx.closePath();
        this.ctx.fill();

        // Отрисовка пуль
        this.player.bullets.forEach(bullet => {
            this.ctx.fillStyle = this.colors.bullet;
            this.ctx.fillRect(
                scaleCoord(bullet.x),
                scaleCoord(bullet.y, false),
                scaleCoord(bullet.width),
                scaleCoord(bullet.height, false)
            );
        });

        // Отрисовка врагов (квадратов)
        this.enemies.forEach(enemy => {
            this.ctx.fillStyle = this.colors.enemy;
            this.ctx.fillRect(
                scaleCoord(enemy.x),
                scaleCoord(enemy.y, false),
                scaleCoord(enemy.width),
                scaleCoord(enemy.height, false)
            );
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