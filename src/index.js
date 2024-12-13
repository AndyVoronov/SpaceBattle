console.clear(); // Очищаем консоль
console.log('Загрузка приложения...');

import { Farm } from './models/Farm.js';
import { Player } from './models/Player.js';
import { StorageService } from './services/StorageService.js';
import { GameUI } from './ui/GameUI.js';

// Инициализация Telegram Mini App
const tg = window.Telegram.WebApp;

// Основной класс игры
class FarmGame {
  constructor() {
    this.player = null;
    this.farm = null;
    this.resources = null;
    this.quests = null;
    this.storageService = new StorageService();
    this.ui = null;
    
    // Инициализация игры
    this.init();
  }

  async init() {
    try {
      console.log('Инициализация игры...');
      
      // Проверяем доступность Telegram API
      if (!window.Telegram?.WebApp) {
        console.error('Telegram WebApp не доступен');
        this.showError('Приложение должно быть запущено в Telegram');
        return;
      }

      // Базовая инициализация даже без авторизации
      this.initializeBasicGame();

      // Проверяем авторизацию
      if (!tg.initDataUnsafe?.user) {
        console.warn('Пользователь не авторизован, используем демо-режим');
        this.initializeDemoMode();
      } else {
        console.log('Пользователь авторизован:', tg.initDataUnsafe.user);
        await this.loadPlayerData();
      }
      
      // Инициализируем интерфейс
      this.initUI();
      
      // Сообщаем Telegram что приложение готово
      tg.ready();
      
      console.log('Игра инициализирована успешно');
    } catch (error) {
      console.error('Ошибка при инициализации игры:', error);
      this.showError('Произошла ошибка при запуске игры');
    }
  }

  initializeBasicGame() {
    // Базовая инициализация игры
    this.farm = new Farm();
    this.resources = { coins: 1000, gems: 0 };
    this.quests = [];
  }

  initializeDemoMode() {
    // Создаем демо-игрока
    this.player = new Player({ 
      id: 'demo',
      first_name: 'Demo Player'
    });
  }

  initUI() {
    try {
      console.log('Инициализация интерфейса...');
      this.ui = new GameUI(this);
      this.ui.init();
      console.log('Интерфейс инициализирован');
    } catch (error) {
      console.error('Ошибка при инициализации UI:', error);
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
  }

  async loadPlayerData() {
    try {
      // Загружаем сохраненные данные игрока
      const savedData = await this.storageService.loadData(`player_${tg.initDataUnsafe.user.id}`);
      
      if (savedData) {
        // Если есть сохраненные данные - восстанавливаем состояние
        this.player = new Player(tg.initDataUnsafe.user);
        Object.assign(this.player, savedData.player);
        
        // Восстанавливаем состояние фермы
        this.farm = new Farm();
        Object.assign(this.farm, savedData.farm);
        
        // Восстанавливаем другие данные
        this.resources = savedData.resources;
        this.quests = savedData.quests;
      } else {
        // Если сохранений нет - создаем нового игрока
        this.player = new Player(tg.initDataUnsafe.user);
        this.farm = new Farm();
        this.resources = { coins: 1000, gems: 0 };
        this.quests = [];
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      // В случае ошибки создаем нового игрока
      this.player = new Player(tg.initDataUnsafe.user);
      this.farm = new Farm();
      this.resources = { coins: 1000, gems: 0 };
      this.quests = [];
    }
  }

  async saveGameState() {
    try {
      const gameState = {
        player: this.player,
        farm: this.farm,
        resources: this.resources,
        quests: this.quests,
        lastSaved: new Date().toISOString()
      };

      await this.storageService.saveData(
        `player_${tg.initDataUnsafe.user.id}`, 
        gameState
      );
      
      console.log('Игра сохранена');
    } catch (error) {
      console.error('Ошибка сохранения игры:', error);
    }
  }

  // Метод для автоматического сохранения
  startAutoSave(interval = 5 * 60 * 1000) { // По умолчанию каждые 5 минут
    setInterval(() => this.saveGameState(), interval);
  }

  // Остальные методы...
}

// Создаем экземпляр игры
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM загружен, создаем игру...');
  try {
    window.game = new FarmGame();
    console.log('Игра создана успешно');
  } catch (error) {
    console.error('Ошибка при создании игры:', error);
  }
}); 