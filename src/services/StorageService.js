export class StorageService {
  constructor() {
    this.tg = window.Telegram.WebApp;
  }

  // Сохранение данных
  async saveData(key, data) {
    try {
      // Конвертируем данные в строку
      const serializedData = JSON.stringify(data);
      
      // Отправляем запрос на сохранение через Telegram CloudStorage
      const result = await this.tg.CloudStorage.setItem(key, serializedData);
      
      if (!result) {
        throw new Error('Ошибка сохранения данных');
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      throw error;
    }
  }

  // Загрузка данных
  async loadData(key) {
    try {
      // Получаем данные из Telegram CloudStorage
      const data = await this.tg.CloudStorage.getItem(key);
      
      if (!data) {
        return null;
      }
      
      // Парсим данные из строки
      return JSON.parse(data);
    } catch (error) {
      console.error('Ошибка при загрузке:', error);
      throw error;
    }
  }
} 