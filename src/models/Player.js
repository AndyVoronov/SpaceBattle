export class Player {
  constructor(userData) {
    this.id = userData.id;
    this.name = userData.first_name;
    this.level = 1;
    this.experience = 0;
    this.coins = 1000; // Начальная валюта
  }

  // Методы для работы с игроком
  async addExperience(amount) {
    this.experience += amount;
    await this.checkLevelUp();
    // Сохраняем состояние после изменения опыта
    await this.game.saveGameState();
  }

  async checkLevelUp() {
    const nextLevelExp = this.calculateNextLevelExp();
    if (this.experience >= nextLevelExp) {
      this.level++;
      // Вызываем событие повышения уровня
      this.game.onPlayerLevelUp(this.level);
      // Сохраняем состояние после повышения уровня
      await this.game.saveGameState();
    }
  }
} 