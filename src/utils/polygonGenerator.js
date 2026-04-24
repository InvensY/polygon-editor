


function random(min, max){
    return min + Math.random() * (max-min)
}

function randomInt(min, max){
    return Math.floor(random(min,max+1))
}

function randomColor(){
    const hue = random(0, 360) //отттенок
    const saturation = random(50,80) // для насыщенности
    const lightness = random(20,80) // яркость
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}
/*я выбрал hsl потому, что он интуативно понятен, в нем просто тон, насыщенность и яркость, например, в hex сложно 
генерировать случайный цвет, а в rgb непонятно какой цвет может получится */

function generateRandomVertices(centerX, centerY,radius,vertexCount){
    //функция генерации вершин
    const vertices = [];
    const angleStep = (Math.PI * 2) / vertexCount

    for(let i = 0; i < vertexCount; i++){
        let angle = i*angleStep;

        const angleOffset = random(-0.3, 0.3) //случайное смещение угла, тк вершины не лужат четко на окружности
        angle+= angleOffset;

        const radiusFactor = random(0.6, 1.4) /*случайное изменение радиуса от 0.6 до 1.4, так форма становится неправильно и
        более похожа на реальныый пролигон(0.6 ближе к центру, 1.4 дальше от центра) */
        const currentRadius = radius * radiusFactor //делаем верщины на разном расстолянии от центра

        const x = centerX + Math.cos(angle) * currentRadius //эта формула превращает угол и расстояние в координату точки 
        const y = centerY + Math.sin(angle) * currentRadius

        vertices.push({x, y})
    }
    return vertices;
}

function isPolygonWithinBounds(vertices, width, height, margin=20){
    //функция проверки на то, что ни одна из вершин не выходит за границы canvas с отступом margin
    for(const vertex of vertices){
        if (vertex.x < margin || vertex.x> width-margin || 
            vertex.y < margin || vertex.y > height-margin
        ){
            return false
        }
    }
    return true
}

function fitPolygonToBounds(vertices, width, height, margin=20){
    //функция, которая сдвигает полигон, если он вылазит за границы
    //ищем макс и мин координаты
    let minX = Infinity, minY = Infinity //начинаем с бесконечно большого числа
    let maxX = -Infinity, maxY = -Infinity // начинаем с бесконечно малого числа

    for (const vertex of vertices){
        minX = Math.min(minX, vertex.x)
        minY = Math.min(minY, vertex.y)
        maxX = Math.max(maxX, vertex.x)
        maxY = Math.max(maxY, vertex.y)
    }

    //вычислим текущую ширину и высоту полигона
    const polyWidth = maxX - minX;
    const polyHeight = maxY - minY;
    
    //вычисляем оптимальные границы для центра
    const minCenterX = margin + polyWidth / 2;
    const maxCenterX = width - margin - polyWidth/2;
    const minCenterY = margin + polyHeight/2;
    const maxCenterY = height - margin - polyHeight/2;

    //найдем текущий центр
    const currentCenterX = (minX+maxX)/2;
    const currentCenterY = (minY+maxY)/2;

    //ищем новый центр
    let newCenterX = Math.min(maxCenterX, Math.max(minCenterX, currentCenterX));
    let newCenterY = Math.min(maxCenterY, Math.max(minCenterX, currentCenterY));

    //выполнаяем смещение 
    const dx = newCenterX - currentCenterX;
    const dy = newCenterY - currentCenterY;

    //если сдвиг не нужен
    if(dx === 0 && dy === 0){
        return vertices
    }

    //применяем смещение
    return vertices.map(vertex => ({
        x: vertex.x+dx,
        y:vertex.y+dy
    }));
}
    export function generateRandomPolygon(canvasWidth, canvasHeight){
        //главная функция генерации
        const vertexCount = randomInt(3, 7);//кол-во вершин

        //радиус от 40 до 15% от мин стороны
        const maxRadius = Math.min(canvasWidth, canvasHeight) * 0.15;
        const radius = random(40, maxRadius);

        //случайная позиция с отступом
        const margin = radius + 20;
        const centerX = random(margin, canvasWidth-margin)
        const centerY = random(margin, canvasHeight-margin);

        //генерируем вершины
        let vertices = generateRandomVertices(centerX, centerY, radius, vertexCount);

        //проверка границ
        if(!isPolygonWithinBounds(vertices, canvasWidth, canvasHeight)){
            vertices = fitPolygonToBounds(vertices, canvasWidth, canvasHeight)
        }

        //задаем цвет
        const color = randomColor()

        //задаем уникальный id чтоб их можно было разлицать для дальнейших действий
        const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random();

        return{
            id: id,
            points: vertices,
            color: color,
            vertexCount: vertexCount,
            createdAt: Date.now()
        };

    }
// Генерация нескольких полигонов (для тестирования или начального состояния)
export function generateMultiplePolygons(count, canvasWidth, canvasHeight) {
  const polygons = [];
  const maxAttempts = 100;
  
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let polygon = null;
    
    do {
      polygon = generateRandomPolygon(canvasWidth, canvasHeight);
      attempts++;
      
      // Проверяем, не пересекается ли новый полигон с уже существующими
      let hasIntersection = false;
      for (const existing of polygons) {
        if (polygonsIntersect(polygon.points, existing.points)) {
          hasIntersection = true;
          break;
        }
      }
      
      if (!hasIntersection) {
        break;
      }
      
      polygon = null;
    } while (attempts < maxAttempts);
    
    if (polygon) {
      polygons.push(polygon);
    }
  }
  
  return polygons;
}

// Экспорт для использования в других файлах (если понадобится)
export const PolygonGenerator = {
    generateRandomPolygon,
    generateMultiplePolygons,
    randomColor
};

