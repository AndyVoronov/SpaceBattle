export class GameUI {
  constructor(game) {
    this.game = game;
    this.elements = {};
  }

  init() {
    this.elements.container = document.getElementById('game-container');
    this.elements.gameField = document.getElementById('game-field');
    this.elements.controls = document.getElementById('controls');

    if (!this.elements.container || !this.elements.gameField || !this.elements.controls) {
      console.error('Не найдены необходимые элементы UI');
      return;
    }

    this.createInitialUI();
  }

  createInitialUI() {
    // Очищаем поле
    this.elements.gameField.innerHTML = '';
    this.elements.controls.innerHTML = '';

    // Добавляем базовую информацию
    const playerInfo = document.createElement('div');
    playerInfo.textContent = `Игрок: ${this.game.player?.name || 'Demo'}`;
    this.elements.gameField.appendChild(playerInfo);

    const resourceInfo = document.createElement('div');
    resourceInfo.textContent = `Монеты: ${this.game.resources.coins}, Кристаллы: ${this.game.resources.gems}`;
    this.elements.gameField.appendChild(resourceInfo);

    // Добавляем кнопку действия
    const actionButton = document.createElement('button');
    actionButton.textContent = 'Действие';
    actionButton.onclick = () => this.handleAction();
    this.elements.controls.appendChild(actionButton);
  }

  handleAction() {
    console.log('Действие выполнено');
  }
} 