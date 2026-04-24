// Импортируем вспомогательные функции
import { generateRandomPolygon } from '../utils/polygonGenerator.js';
import { isPointInPolygon, polygonsIntersect, clampPolygonToBounds } from '../utils/geometry.js';

// Класс компонента холста
export class CanvasView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Состояние приложения
    this.polygons = [];           // массив всех полигонов
    this.selectedPolygon = null;   // выбранный полигон
    this.dragging = false;         // идет ли перетаскивание
    this.dragOffset = { x: 0, y: 0 }; // смещение курсора относительно центра полигона
    this.dragStartPolygons = [];   // копия полигонов до начала перетаскивания (для Undo)
    this.history = [] //массив состояний
    this.currentIndex = -1 //текущая позиция в истории
    this.isUndoRedoAction = false //флаг чтоб не сохранять в историю при undo и redo  
    this._isMovingFromHistory = false; //флаг для перемещения при undo/redo
    this._isRestoring = false; //флаг для restoreFromHistory
    
    // Слушатели событий (чтобы потом отписаться)
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundResize = this.onResize.bind(this);
  }
  
  // Вызывается при добавлении компонента на страницу
  connectedCallback() {
    // Создаем HTML-структуру
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        .canvas-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
          background: #fafbff;
          border-radius: 24px;
          overflow: hidden;
        }
        
        canvas {
          width: 100%;
          height: 100%;
          display: block;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        canvas:active {
          cursor: grabbing;
        }
        
        .canvas-info {
          position: absolute;
          bottom: 1rem;
          right: 1rem;
          background: rgba(79, 70, 229, 0.9);
          backdrop-filter: blur(8px);
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
          pointer-events: none;
          z-index: 10;
          font-family: monospace;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 0.5;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        .ripple-effect {
          position: absolute;
          border-radius: 50%;
          background: rgba(79, 70, 229, 0.3);
          pointer-events: none;
          animation: ripple 0.6s ease-out;
        }
        
        @media (max-width: 640px) {
          .canvas-info {
            bottom: 0.5rem;
            right: 0.5rem;
            padding: 0.375rem 0.75rem;
            font-size: 0.688rem;
          }
        }
      </style>
      <canvas></canvas>
    `;
    
    // Получаем ссылку на canvas
    this.canvas = this.shadowRoot.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Настраиваем размеры
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.canvas);
    
    // Добавляем слушатели событий
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mouseup', this.boundMouseUp);
    this.canvas.addEventListener('touchstart', this.boundMouseDown);
    window.addEventListener('touchmove', this.boundMouseMove);
    window.addEventListener('touchend', this.boundMouseUp);
    window.addEventListener('resize', this.boundResize);
    
    // Начальная отрисовка
    this.onResize();
    this.saveToHistory(); //соохранение состояния
  }
  
  // Вызывается при удалении компонента со страницы
  disconnectedCallback() {
    // Отписываемся от событий (важно для избежания утечек памяти)
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mouseup', this.boundMouseUp);
    this.canvas.removeEventListener('touchstart', this.boundMouseDown);
    window.removeEventListener('touchmove', this.boundMouseMove);
    window.removeEventListener('touchend', this.boundMouseUp);
    window.removeEventListener('resize', this.boundResize);
    this.resizeObserver.disconnect();
  }
  
  // Изменение размера canvas
  onResize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.draw();
  }
  

  //получается координаты мыши
  getMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    let clientX, clientY;
    
    // Проверяем тип события
    if (event.touches && event.touches.length > 0) {
        // Touch-событие
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
        // touchend событие (changedTouches)
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else {
        // Mouse-событие
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}
  
  // Найти полигон под курсором
  findPolygonAtPoint(point) {
    for (let i = 0; i < this.polygons.length; i++) {
        const polygon = this.polygons[i];
        const inside = isPointInPolygon(point, polygon.points);
        if (inside) return polygon;
    }
    return null;
  }
  
  // Обработчик нажатия мыши
  onMouseDown(event) {

    // Предотвращаем скролл на тач-устройствах
    event.preventDefault();
    event.stopPropagation();

    const pos = this.getMousePosition(event);
    const polygon = this.findPolygonAtPoint(pos);
    
    if (polygon) {
      this.selectedPolygon = polygon;
      this.dragging = true;
      
      // Сохраняем копию всех полигонов для Undo
      this.dragStartPolygons = JSON.parse(JSON.stringify(this.polygons));
      
      // Вычисляем смещение курсора относительно центра полигона
      const center = this.getPolygonCenter(polygon);
      this.dragOffset = {
        x: pos.x - center.x,
        y: pos.y - center.y
      };
      
      this.canvas.style.cursor = 'grabbing';
      this.draw();
      
      // Отправляем событие о выборе полигона
      this.dispatchEvent(new CustomEvent('polygon-selected', {
        detail: { polygon: polygon },
        bubbles: true,
        composed: true
      }));
    } else {
      this.selectedPolygon = null;
      this.draw();
      
      // Отправляем событие, что ничего не выбрано
      this.dispatchEvent(new CustomEvent('polygon-selected', {
        detail: { polygon: null },
        bubbles: true,
        composed: true
      }));
    }
  }
  
  // Обработчик движения мыши
  onMouseMove(event) {
    if (!this.dragging || !this.selectedPolygon) return;

    // Предотвращаем скролл при перетаскивании
    event.preventDefault();
    
    const pos = this.getMousePosition(event);
    const center = this.getPolygonCenter(this.selectedPolygon);
    
    // Новый центр полигона
    let newCenterX = pos.x - this.dragOffset.x;
    let newCenterY = pos.y - this.dragOffset.y;
    
    // Вычисляем смещение
    const dx = newCenterX - center.x;
    const dy = newCenterY - center.y;
    
    // Перемещаем полигон
    const movedPolygon = {
      ...this.selectedPolygon,
      points: this.selectedPolygon.points.map(p => ({
        x: p.x + dx,
        y: p.y + dy
      }))
    };
    
    // Ограничиваем границами canvas
    const clampedPolygon = clampPolygonToBounds(movedPolygon, this.canvas.width, this.canvas.height);
    
    // Проверяем пересечения с другими полигонами
    let hasCollision = false;
    for (const other of this.polygons) {
      if (other === this.selectedPolygon) continue;
      if (polygonsIntersect(clampedPolygon.points, other.points)) {
        hasCollision = true;
        break;
      }
    }
    
    // Если нет коллизий, применяем перемещение
    if (!hasCollision) {
      this.selectedPolygon.points = clampedPolygon.points;
      this.draw();
    }
  }
  
  // Обработчик отпускания мыши
  onMouseUp() {
    if (this.dragging && this.selectedPolygon) {
      // Проверяем, изменилось ли положение полигона
      const dragStartPolygon = this.dragStartPolygons.find(p => p.id === this.selectedPolygon.id);
      if (dragStartPolygon) {
        const hasMoved = JSON.stringify(dragStartPolygon.points) !== JSON.stringify(this.selectedPolygon.points);
        
        if (hasMoved && !this.isUndoRedoAction && !this._isMovingFromHistory) {
          // Сохраняем действие в историю
          this.saveToHistory();
          this.dispatchEvent(new CustomEvent('polygons-updated', { bubbles: true, composed: true }));
        }
      }
    }
    
    this.dragging = false;
    this.canvas.style.cursor = 'pointer';
    this.draw();
  }
  
  // Получить центр полигона
  getPolygonCenter(polygon) {
    const sum = polygon.points.reduce((acc, p) => ({
      x: acc.x + p.x,
      y: acc.y + p.y
    }), { x: 0, y: 0 });
    
    return {
      x: sum.x / polygon.points.length,
      y: sum.y / polygon.points.length
    };
  }
  
  // Генерация нового полигона
  generatePolygon() {
    let newPolygon = null;
    let attempts = 0;
    const maxAttempts = Math.min(50 + this.polygons.length * 10, 500);
    
    do {
      newPolygon = generateRandomPolygon(this.canvas.width, this.canvas.height);
      attempts++;
      
      let hasIntersection = false;
      for (const existing of this.polygons) {
        if (polygonsIntersect(newPolygon.points, existing.points)) {
          hasIntersection = true;
          break;
        }
      }
      
      if (!hasIntersection) break;
      newPolygon = null;
    } while (attempts < maxAttempts);
    
    if (!newPolygon) {
      this.showToast('⚠️ Не удалось найти свободное место для полигона');
      return false;
    }
    
    // Добавляем полигон
    this.polygons.push(newPolygon);
    this.draw();
    this.animatePolygon(newPolygon);
    this.saveToHistory();
    
    // Обновляем информацию
    this.dispatchEvent(new CustomEvent('polygons-updated', { bubbles: true, composed: true }));
    
    return true;
  }
  
  // Удаление выбранного полигона
  deleteSelected() {
    if (!this.selectedPolygon) {
      this.showToast('❌ Полигон не выбран');
      return false;
    }
    
    this.saveToHistory();
    this.polygons = this.polygons.filter(p => p !== this.selectedPolygon);
    this.selectedPolygon = null;
    this.draw();
    this.saveToHistory();
    this.dispatchEvent(new CustomEvent('polygons-updated', { bubbles: true, composed: true }));
    
    return true;
  }


  // Анимация появления полигона (пульсация)
  animatePolygon(polygon) {
      // Сохраняем оригинальные точки
      const originalPoints = JSON.parse(JSON.stringify(polygon.points));
      const center = this.getPolygonCenter(polygon);
      
      let progress = 0;
      const duration = 100; // 100 мс
      const startTime = performance.now();
      
      const animate = (currentTime) => {
          const elapsed = currentTime - startTime;
          progress = Math.min(elapsed / duration, 1);
          
          // Плавное изменение масштаба от 0.5 до 1
          const scale = 0.5 + progress * 0.5;
          
          // Применяем масштаб к вершинам
          polygon.points = originalPoints.map(p => ({
              x: center.x + (p.x - center.x) * scale,
              y: center.y + (p.y - center.y) * scale
          }));
          
          // Также меняем яркость цвета
          if (progress < 0.5) {
              // В начале делаем ярче
              polygon.color = '#ffaa00';
          } else {
              // Восстанавливаем оригинальный цвет
              polygon.color = originalColor;
          }
          
          this.draw();
          
          if (progress < 1) {
              requestAnimationFrame(animate);
          } else {
              // Фиксируем итоговое состояние
              polygon.points = originalPoints;
              this.draw();
          }
      };
      
      const originalColor = polygon.color;
      requestAnimationFrame(animate);
  }
  
  // Удаление всех полигонов
  deleteAll() {
    if (this.polygons.length === 0) {
      this.showToast('⚠️ Нет полигонов для удаления');
      return false;
    }
    
    this.saveToHistory();
    this.polygons = [];
    this.selectedPolygon = null;
    this.draw();
    this.saveToHistory();
    
    this.dispatchEvent(new CustomEvent('polygons-updated', { bubbles: true, composed: true }));
    
    return true;
  }
  
  // Получить количество полигонов
  getPolygonCount() {
    return this.polygons.length;
  }
  
  // Получить выбранный полигон (для InfoPanel)
  getSelectedPolygon() {
    return this.selectedPolygon;
  }
  
  // Отрисовка всех полигонов
  draw() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const polygon of this.polygons) {
      this.ctx.beginPath();
      this.ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
      for (let i = 1; i < polygon.points.length; i++) {
        this.ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
      }
      this.ctx.closePath();
      
      this.ctx.fillStyle = polygon.color;
      this.ctx.fill();
      
      if (polygon === this.selectedPolygon) {
        this.ctx.strokeStyle = '#ffaa00';
        this.ctx.lineWidth = 3;
      } else {
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 2;
      }
      this.ctx.stroke();
    }
  }
  
  // Сохранить текущее состояние в историю
  saveToHistory() {
    if (this.isUndoRedoAction || this._isMovingFromHistory) {
      this.isUndoRedoAction = false;
      this._isMovingFromHistory = false;
      return;
    }
    
    const state = {
      polygons: JSON.parse(JSON.stringify(this.polygons)),
      selectedPolygonId: this.selectedPolygon?.id || null
    };
    
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    
    this.history.push(state);
    this.currentIndex = this.history.length - 1;
    
    if (this.history.length > 50) {
      this.history.shift();
      this.currentIndex--;
    }
  }
  
  // Восстановить состояние по индексу
  restoreFromHistory(index) {
    if (this._isRestoring) return false;
    this._isRestoring = true;
    
    if (index < 0 || index >= this.history.length) {
      this._isRestoring = false;
      return false;
    }
    
    const state = this.history[index];
    if (!state) {
      this._isRestoring = false;
      return false;
    }
    
    this.isUndoRedoAction = true;
    this._isMovingFromHistory = true;
    
    this.polygons = JSON.parse(JSON.stringify(state.polygons));
    
    if (state.selectedPolygonId) {
      this.selectedPolygon = this.polygons.find(p => p.id === state.selectedPolygonId) || null;
    } else {
      this.selectedPolygon = null;
    }
    
    this.currentIndex = index;
    this.draw();
    
    this.dispatchEvent(new CustomEvent('polygons-updated', { bubbles: true, composed: true }));
    
    setTimeout(() => {
      this.isUndoRedoAction = false;
      this._isMovingFromHistory = false;
      this._isRestoring = false;
    }, 50);
    
    return true;
  }
  
  // Отменить (Undo)
  undo() {
    if (this.currentIndex > 0) {
      this.restoreFromHistory(this.currentIndex - 1);
      return true;
    }
    this.showToast('↩️ Нечего отменять');
    return false;
  }
  
  // Повторить (Redo)
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.restoreFromHistory(this.currentIndex + 1);
      return true;
    }
    this.showToast('↪️ Нечего повторять');
    return false;
  }

  // Изменить цвет выбранного полигона
changeSelectedPolygonColor(hexColor) {
    if (!this.selectedPolygon) {
        this.showToast('❌ Сначала выберите полигон');
        return false;
    }
    
    // Сохраняем состояние ДО изменения
    this.saveToHistory();
    
    // Меняем цвет
    this.selectedPolygon.color = hexColor;
    this.draw();

    this.saveToHistory();
    
    // Уведомляем другие компоненты
    this.dispatchEvent(new CustomEvent('polygons-updated', { bubbles: true, composed: true }));
    
    return true;
}

// Экспорт сцены
exportScene() {
    const sceneData = {
        version: "1.0",
        timestamp: Date.now(),
        polygons: this.polygons,
        selectedPolygonId: this.selectedPolygon?.id || null
    };
    
    const json = JSON.stringify(sceneData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `polygon-scene-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    this.showToast('💾 Сцена сохранена');
}

// Импорт сцены
importScene(file) {
    const reader = new FileReader();
    
    reader.onload = (event) => {
        try {
            const sceneData = JSON.parse(event.target.result);
            
            // Проверяем валидность данных
            if (!sceneData.polygons || !Array.isArray(sceneData.polygons)) {
                throw new Error('Неверный формат файла');
            }
            
            // Сохраняем состояние ДО импорта (для Undo)
            this.saveToHistory();
            
            // Восстанавливаем полигоны
            this.polygons = sceneData.polygons;
            
            // Восстанавливаем выбранный полигон
            if (sceneData.selectedPolygonId) {
                this.selectedPolygon = this.polygons.find(p => p.id === sceneData.selectedPolygonId) || null;
            } else {
                this.selectedPolygon = null;
            }
            
            this.draw();
            
            // Сохраняем состояние ПОСЛЕ импорта
            this.saveToHistory();
            
            this.dispatchEvent(new CustomEvent('polygons-updated', { bubbles: true, composed: true }));
            this.showToast(`📁 Загружено ${this.polygons.length} полигонов`);
            
        } catch (error) {
            console.error('Ошибка импорта:', error);
            this.showToast('❌ Ошибка при импорте файла');
        }
    };
    
    reader.readAsText(file);
}
  
  showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1e293b;
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: none;
    `;
    
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s reverse';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 2000);
  }
}

// Регистрируем компонент
customElements.define('canvas-view', CanvasView);