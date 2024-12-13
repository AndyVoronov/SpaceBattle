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
        this.width = 60;
        this.height = 50;
        this.x = Math.random() * (800 - this.width);
        this.y = -this.height;
        switch(type) {
            case 'fast':
                this.speed = 2;
                this.points = 200;
                this.health = 1;
                break;
            case 'tank':
                this.speed = 0.7;
                this.points = 300;
                this.health = 3;
                break;
            default: // basic
                this.speed = 1.2;
                this.points = 100;
                this.health = 1;
        }
        this.type = type;
    }

    draw(ctx, color) {
        switch(this.type) {
            case 'fast':
                ctx.fillStyle = '#FF5722';
                break;
            case 'tank':
                ctx.fillStyle = '#673AB7';
                break;
            default:
                ctx.fillStyle = '#F44336';
        }

        if (this.type === 'tank') {
            ctx.fillRect(this.x, this.y, this.width, this.height);
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#9575CD');
            gradient.addColorStop(1, '#673AB7');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x + 8, this.y + 5, this.width - 16, this.height - 10);
            ctx.fillRect(this.x + this.width/2 - 5, this.y + this.height - 15, 10, 20);
        } else if (this.type === 'fast') {
            ctx.shadowColor = '#FF5722';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y);
            ctx.quadraticCurveTo(this.x + this.width, this.y + this.height/4, this.x + this.width, this.y + this.height/2);
            ctx.quadraticCurveTo(this.x + this.width, this.y + this.height*3/4, this.x + this.width/2, this.y + this.height);
            ctx.quadraticCurveTo(this.x, this.y + this.height*3/4, this.x, this.y + this.height/2);
            ctx.quadraticCurveTo(this.x, this.y + this.height/4, this.x + this.width/2, this.y);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
            gradient.addColorStop(0, '#FF5252');
            gradient.addColorStop(1, '#D32F2F');
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, 5);
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
        this.currentWeapon = 'default';
        this.weaponTimer = null;
        this.weaponTimeLeft = 0;
        this.weapons = {
            default: {
                shoot: () => {
                    this.player.bullets.push({
                        x: this.player.x + this.player.width / 2,
                        y: this.player.y,
                        width: 5,
                        height: 10,
                        speed: 7,
                        damage: 1
                    });
                },
                cooldown: 500
            },
            doubleLaser: {
                shoot: () => {
                    [-10, 10].forEach(offset => {
                        this.player.bullets.push({
                            x: this.player.x + this.player.width / 2 + offset,
                            y: this.player.y,
                            width: 5,
                            height: 10,
                            speed: 7,
                            damage: 1
                        });
                    });
                },
                cooldown: 400
            },
            spreadShot: {
                shoot: () => {
                    [-20, 0, 20].forEach(offset => {
                        this.player.bullets.push({
                            x: this.player.x + this.player.width / 2,
                            y: this.player.y,
                            width: 5,
                            height: 10,
                            speed: 7,
                            vx: offset / 40,
                            damage: 1
                        });
                    });
                },
                cooldown: 600
            },
            rapidFire: {
                shoot: () => {
                    this.player.bullets.push({
                        x: this.player.x + this.player.width / 2,
                        y: this.player.y,
                        width: 3,
                        height: 8,
                        speed: 9,
                        damage: 0.5
                    });
                },
                cooldown: 200
            }
        };
        this.sounds = {};
        this.isSoundEnabled = false;
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
        this.weaponNames = {
            'default': 'Обычный лазер',
            'doubleLaser': 'Двойной лазер',
            'spreadShot': 'Веерная атака',
            'rapidFire': 'Скорострельный'
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
            // Обработка закрытия для мобильных устройств
            if (tg.platform !== 'tdesktop' && tg.platform !== 'web') {
                tg.BackButton.onClick(() => {
                    if (this.isGameOver) {
                        return true; // Разрешаем закрытие
                    }
                    return false; // Предотвращаем закрытие
                });
            }
        } catch (e) {
            console.error('Error in setupTelegram:', e);
        }
    }

    updateColors() {
        this.colors = {
            background: tg.themeParams.bg_color || '#1A237E',
            text: tg.themeParams.text_color || '#FFFFFF',
            player: '#2196F3',
            bullet: '#4CAF50',
            heart: '#E91E63'
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

        // Обновление бонусов
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.move();
            if (powerUp.y > this.canvas.height) {
                this.powerUps.splice(i, 1);
            }
        }

        this.checkCollisions();
    }

    checkCollisions() {
        this.player.bullets.forEach((bullet, bulletIndex) => {
            // Проверка столкновения пуль с бонусами
            for (let i = this.powerUps.length - 1; i >= 0; i--) {
                const powerUp = this.powerUps[i];
                if (bullet.x < powerUp.x + powerUp.width &&
                    bullet.x + bullet.width > powerUp.x &&
                    bullet.y < powerUp.y + powerUp.height &&
                    bullet.y + bullet.height > powerUp.y) {
                    // Удаляем пулю и бонус
                    this.player.bullets.splice(bulletIndex, 1);
                    this.powerUps.splice(i, 1);
                    // Активируем оружие
                    this.activateWeapon(powerUp.type, powerUp.duration);
                    break; // Прерываем цикл, так как пуля уже удалена
                }
            }

            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.isColliding(bullet, enemy)) {
                    this.player.bullets.splice(bulletIndex, 1);
                    enemy.health -= bullet.damage || 1;
                    if (enemy.health <= 0) {
                        this.enemies.splice(enemyIndex, 1);
                        this.score += enemy.points;
                        // Шанс выпадения оружия
                        if (Math.random() < 0.2) { // 20% шанс
                            const types = ['doubleLaser', 'spreadShot', 'rapidFire'];
                            const type = types[Math.floor(Math.random() * types.length)];
                            this.powerUps.push(new PowerUp(this.canvas, type));
                        }
                    }
                }
            });
        });
    }

    isColliding(rect1, rect2) {
        // Проверяем, что оба объекта существуют и имеют необходимые свойства
        if (!rect1 || !rect2 || !rect1.x || !rect2.x) return false;
        
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
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#1A237E');
        gradient.addColorStop(1, '#303F9F');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const scaleCoord = (value, isX = true) => value * (isX ? this.scaleX : this.scaleY);

        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = `bold ${scaleCoord(20, false)}px 'Segoe UI', Arial, sans-serif`;
        this.ctx.fillText(`Счет: ${this.score}`, scaleCoord(10), scaleCoord(30, false));
        this.ctx.fillText(`Жизни: ${this.lives}`, scaleCoord(10), scaleCoord(60, false));
        this.ctx.fillText(`Рекорд: ${this.highScore}`, scaleCoord(10), scaleCoord(90, false));
        this.ctx.shadowBlur = 0;

        // Отрисовка игрока с градиентом
        const playerGradient = this.ctx.createLinearGradient(
            scaleCoord(this.player.x),
            scaleCoord(this.player.y, false),
            scaleCoord(this.player.x + this.player.width),
            scaleCoord(this.player.y + this.player.height, false)
        );
        playerGradient.addColorStop(0, '#2196F3');
        playerGradient.addColorStop(1, '#1976D2');
        this.ctx.fillStyle = playerGradient;
        this.ctx.shadowColor = '#64B5F6';
        this.ctx.shadowBlur = 15;

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

        // Отрисовка бонусов
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));

        // Улучшенный индикатор прогресса
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(scaleCoord(10), scaleCoord(120, false),
            scaleCoord(200), scaleCoord(10, false));
        const progressGradient = this.ctx.createLinearGradient(
            scaleCoord(10), 0,
            scaleCoord(210), 0
        );
        progressGradient.addColorStop(0, '#4CAF50');
        progressGradient.addColorStop(1, '#81C784');
        this.ctx.fillStyle = progressGradient;
        this.ctx.fillRect(scaleCoord(10), scaleCoord(120, false),
            scaleCoord(200 * (this.score % 1000) / 1000), scaleCoord(10, false));

        // Отображение текущего уровня
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = `${scaleCoord(24, false)}px Arial`;
        this.ctx.fillText(`Уровень ${this.level}`, 
            scaleCoord(10), scaleCoord(160, false));

        // Отрисовка таймера оружия
        if (this.weaponTimeLeft > 0) {
            const timeLeft = Math.ceil(this.weaponTimeLeft / 1000);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = `${scaleCoord(16, false)}px 'Segoe UI'`;
            this.ctx.fillText(`${this.weaponNames[this.currentWeapon]}: ${timeLeft} сек`, 
                scaleCoord(10), scaleCoord(180, false));
        }
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
        const types = ['doubleLaser', 'spreadShot', 'rapidFire'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.powerUps.push(new PowerUp(this.canvas, type));
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

    activateWeapon(type, duration) {
        if (this.weaponTimer) {
            clearInterval(this.weaponTimer);
        }
        this.currentWeapon = type;
        this.weaponTimeLeft = duration;
        
        // Визуальный эффект при активации оружия
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.weaponTimer = setInterval(() => {
            this.weaponTimeLeft -= 100;
            if (this.weaponTimeLeft <= 0) {
                clearInterval(this.weaponTimer);
                this.currentWeapon = 'default';
            }
        }, 100);
    }
}

class PowerUp {
    constructor(canvas, type) {
        this.canvas = canvas;
        this.width = 30;
        this.height = 30;
        this.x = Math.random() * (800 - this.width);
        this.y = -this.height;
        this.speed = 2;
        this.type = type;
        this.duration = 10000; // 10 секунд для всех бонусов
    }

    draw(ctx) {
        ctx.shadowBlur = 15;
        switch(this.type) {
            case 'doubleLaser':
                ctx.shadowColor = '#FF1744';
                ctx.fillStyle = '#FF1744';
                break;
            case 'spreadShot':
                ctx.shadowColor = '#AA00FF';
                ctx.fillStyle = '#AA00FF';
                break;
            case 'rapidFire':
                ctx.shadowColor = '#00E5FF';
                ctx.fillStyle = '#00E5FF';
                break;
        }
        
        // Рисуем иконку оружия
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height/2);
        ctx.lineTo(this.x + this.width/2, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height/2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    move() {
        this.y += this.speed * (this.canvas.height / 600);
    }
}

// Запуск игры
window.onload = () => {
    new Game();
}; 