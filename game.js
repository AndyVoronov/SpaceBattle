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
    constructor(canvas, type = 'basic') {
        this.canvas = canvas;
        this.width = 40;
        this.height = 40;
        this.x = Math.random() * (800 - this.width);
        this.y = -this.height;
        switch(type) {
            case 'fast':
                this.speed = 4;
                this.points = 200;
                this.health = 1;
                break;
            case 'tank':
                this.speed = 1;
                this.points = 300;
                this.health = 3;
                break;
            default: // basic
                this.speed = 2;
                this.points = 100;
                this.health = 1;
        }
        this.type = type;
    }

    draw(ctx, color) {
        ctx.fillStyle = color;
        if (this.type === 'tank') {
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#888';
            ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
        } else if (this.type === 'fast') {
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y);
            ctx.lineTo(this.x + this.width, this.y + this.height/2);
            ctx.lineTo(this.x + this.width/2, this.y + this.height);
            ctx.lineTo(this.x, this.y + this.height/2);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
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
        this.enemySpawnTimer = null;
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;
        this.highScore = this.loadHighScore();
        this.level = 1;
        this.powerUps = [];
        this.sounds = {
            shoot: new Audio('sounds/shoot.mp3'),
            explosion: new Audio('sounds/explosion.mp3'),
            powerUp: new Audio('sounds/powerup.mp3'),
            gameOver: new Audio('sounds/gameover.mp3')
        };
        this.isSoundEnabled = true;
        this.achievements = {
            sharpshooter: { name: "Меткий стрелок", condition: "Уничтожьте 10 врагов подряд без промаха" },
            survivor: { name: "Выживший", condition: "Наберите 1000 очков без потери жизней" },
            speedster: { name: "Спидстер", condition: "Уничтожьте 5 быстрых врагов подряд" }
        };
        this.progress = {
            consecutiveHits: 0,
            noHitScore: 0,
            fastEnemiesStreak: 0
        };

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
        
        this.canvas.width = windowWidth;
        this.canvas.height = windowHeight;
        
        this.scaleX = windowWidth / 800;
        this.scaleY = windowHeight / 600;

        if (this.enemies) {
            this.enemies.forEach(enemy => {
                enemy.canvas = this.canvas;
            });
        }

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
        try {
            tg.ready();
            this.updateColors();
            tg.MainButton.hide();
            tg.MainButton.setParams({
                text_color: '#FFFFFF',
                color: '#2ECC71'
            });
            tg.onEvent('themeChanged', () => this.updateColors());
            // Предотвращаем закрытие мини-приложения
            tg.enableClosingConfirmation();
        } catch (e) {
            console.error('Error in setupTelegram:', e);
        }
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
        try {
            if (this.enemySpawnTimer) {
                clearInterval(this.enemySpawnTimer);
            }
            this.score = 0;
            this.lives = 3;
            this.isGameOver = false;
            this.enemies = [];
            this.level = 1;
            this.player = new Player(this.canvas);
            this.player.x = 400 - this.player.width / 2;
            this.player.y = 500;
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('leaderboard').style.display = 'none';
            this.keys = {};
            try {
                this.startGame();
            } catch (e) {
                console.error('Error starting game:', e);
            }
        } catch (e) {
            console.error('Error in restartGame:', e);
        }
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            // Добавляем поддержку клавиш A и D
            if (e.key.toLowerCase() === 'a') {
                this.keys['ArrowLeft'] = true;
            }
            if (e.key.toLowerCase() === 'd') {
                this.keys['ArrowRight'] = true;
            }
            this.keys[e.key] = true;
            if (e.key === ' ') {
                this.player.shoot();
            }
        });

        document.addEventListener('keyup', (e) => {
            // Добавляем поддержку клавиш A и D
            if (e.key.toLowerCase() === 'a') {
                this.keys['ArrowLeft'] = false;
            }
            if (e.key.toLowerCase() === 'd') {
                this.keys['ArrowRight'] = false;
            }
            this.keys[e.key] = false;
        });
    }

    startGame() {
        if (this.enemySpawnTimer) {
            clearInterval(this.enemySpawnTimer);
        }
        
        this.enemySpawnTimer = setInterval(() => {
            const enemyCount = Math.min(3, Math.floor(this.level / 5)) + 1;
            for (let i = 0; i < enemyCount; i++) {
                const type = Math.random() > 0.7 ? 'fast' : 
                            Math.random() > 0.8 ? 'tank' : 'basic';
                this.enemies.push(new Enemy(this.canvas, type));
            }
        }, 2000);

        // Спавн бонусов
        setInterval(() => {
            if (Math.random() < 0.3) this.spawnPowerUp();
        }, 10000);

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
                    enemy.health--;
                    if (enemy.health <= 0) {
                        this.enemies.splice(enemyIndex, 1);
                        this.score += enemy.points;
                        this.level = Math.floor(this.score / 1000) + 1;
                    }
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
        try {
            this.saveHighScore();
            document.getElementById('gameOver').style.display = 'block';
            
            // Отправляем счет и запрашиваем таблицу лидеров
            if (tg.initDataUnsafe?.user) {
                const userData = {
                    username: tg.initDataUnsafe.user.username,
                    score: this.score,
                    timestamp: Date.now()
                };
                tg.sendData(JSON.stringify({
                    action: 'newHighScore',
                    data: userData
                }));
            }
            
            this.showLeaderboard();
            tg.MainButton.show();
            tg.MainButton.setText('Играть заново');
            
            // Очищаем все обработчики и устанавливаем новый
            const handlers = tg.MainButton.events.onClick || [];
            handlers.forEach(handler => tg.MainButton.offClick(handler));
            
            tg.MainButton.onClick(() => {
                try {
                    // Сбрасываем состояние игры
                    this.restartGame();
                    // Запускаем новую игру
                    this.gameLoop();
                    // Скрываем кнопку после рестарта
                    tg.MainButton.hide();
                } catch (e) {
                    console.error('Error restarting game:', e);
                }
            });
        } catch (e) {
            console.error('Error in gameOver:', e);
        }
    }

    showLeaderboard() {
        const leaderboard = document.getElementById('leaderboard');
        const leaderboardItems = document.getElementById('leaderboard-items');
        leaderboardItems.innerHTML = ''; // Очищаем предыдущую таблицу
        
        if (tg.initDataUnsafe?.user) {
            tg.sendData(JSON.stringify({
                action: 'getLeaderboard'
            }));
        }
        
        leaderboard.style.display = 'block';
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const scaleCoord = (value, isX = true) => value * (isX ? this.scaleX : this.scaleY);

        // Отрисовка счета и жизней
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = `${scaleCoord(20, false)}px Arial`;
        this.ctx.fillText(`Счет: ${this.score}`, scaleCoord(10), scaleCoord(30, false));
        this.ctx.fillText(`Жизни: ${this.lives}`, scaleCoord(10), scaleCoord(60, false));
        this.ctx.fillText(`Рекорд: ${this.highScore}`, scaleCoord(10), scaleCoord(90, false));

        // Отрисовка жизней в виде сердечек с увеличенным расстоянием
        for (let i = 0; i < this.lives; i++) {
            this.ctx.fillStyle = this.colors.heart;
            this.ctx.font = `${scaleCoord(24, false)}px Arial`;
            this.ctx.fillText('❤️', 
                scaleCoord(700 - i * 40),
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

        // Индикатор прогресса уровня
        this.ctx.fillStyle = this.colors.text;
        this.ctx.fillRect(scaleCoord(10), scaleCoord(120, false), 
            scaleCoord(200), scaleCoord(10, false));
        this.ctx.fillStyle = this.colors.player;
        this.ctx.fillRect(scaleCoord(10), scaleCoord(120, false), 
            scaleCoord(200 * (this.score % 1000) / 1000), scaleCoord(10, false));

        // Отображение текущего уровня
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = `${scaleCoord(24, false)}px Arial`;
        this.ctx.fillText(`Уровень ${this.level}`, 
            scaleCoord(10), scaleCoord(160, false));
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    loadHighScore() {
        const stored = localStorage.getItem('highScore');
        return stored ? parseInt(stored) : 0;
    }

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.score);
            
            // Отправляем новый рекорд в Telegram
            if (tg.initDataUnsafe?.user) {
                const userData = {
                    username: tg.initDataUnsafe.user.username,
                    score: this.score,
                    timestamp: Date.now()
                };
                tg.sendData(JSON.stringify({
                    action: 'newHighScore',
                    data: userData
                }));
            }
        }
    }

    shareScore() {
        const message = `🚀 Я набрал ${this.score} очков в Space Battle!${
            this.score === this.highScore ? ' Это мой новый рекорд! 🏆' : ''
        }`;
        
        if (tg.initDataUnsafe?.query_id) {
            tg.sendData(JSON.stringify({
                action: 'share',
                message: message
            }));
        }
    }

    spawnPowerUp() {
        const types = ['shield', 'doubleShot', 'speedBoost'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.powerUps.push({
            x: Math.random() * (this.canvas.width - 30),
            y: -30,
            type: type,
            width: 30,
            height: 30,
            speed: 2
        });
    }

    createExplosion(x, y) {
        const particles = [];
        for (let i = 0; i < 10; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1
            });
        }
        return particles;
    }

    drawEffects() {
        // Отрисовка частиц взрыва
        this.particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.02;
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
                return;
            }
            this.ctx.fillStyle = `rgba(255, 100, 0, ${particle.life})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    playSound(soundName) {
        if (this.isSoundEnabled && this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play();
        }
    }

    checkAchievements() {
        // Проверка достижений и отправка в Telegram
        if (this.progress.consecutiveHits >= 10) {
            this.unlockAchievement('sharpshooter');
        }
    }
}

// Запуск игры
window.onload = () => {
    new Game();
}; 