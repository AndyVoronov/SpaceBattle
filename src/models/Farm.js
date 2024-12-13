export class Farm {
  constructor() {
    this.plots = []; // Участки земли
    this.buildings = []; // Здания
    this.animals = []; // Животные
  }

  // Методы для работы с фермой
  addPlot(plot) {
    this.plots.push(plot);
  }

  addBuilding(building) {
    this.buildings.push(building);
  }

  addAnimal(animal) {
    this.animals.push(animal);
  }

  // Методы для обработки игровых событий
  update(deltaTime) {
    // Обновление состояния всех объектов фермы
    this.plots.forEach(plot => plot.update(deltaTime));
    this.buildings.forEach(building => building.update(deltaTime));
    this.animals.forEach(animal => animal.update(deltaTime));
  }
} 