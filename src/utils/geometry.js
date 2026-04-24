// тут будут реализованы все геометрические вычисления для работы с полигонами


export function isPointInPolygon(point, vertices) {
    /*функция проверки, находится ли точка внутри
    ее суть в том, что я пусккаю луч вправо, который считает кол-во пересечений с ребрами
    если кол-во пересечений нечетное - то точка внутри, 
    если четное, то точка снаружи
    */

    console.log('Проверяем точку:', point);
    
    //простая проверка, находим мин и макс координаты всем вершин и получаем прямоугольник, в который вмещаем полигон
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const v of vertices) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
    }
    
    //проверяем лежит ли точка внутри прямоугольника
    const insideBox = point.x >= minX && point.x <= maxX && 
                      point.y >= minY && point.y <= maxY;
    
    console.log('Bounding box:', { minX, maxX, minY, maxY });
    console.log('Точка внутри bounding box?', insideBox);
    
    // Если точка не в bounding box — точно снаружи
    if (!insideBox) return false;
    
    // Алгоритм Ray Casting(луч)
    let inside = false;
    
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;
        
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        
        if (intersect) {
            inside = !inside;//каждый раз как пересекаем ребро
        }
    }
    
    console.log('Ray casting результат:', inside);
    return inside;
}

export function segmentsIntersect(a,b,c,d){
    /*эта функция нунжна для того чтоб проверить пересекается ли хоть одно ребро нового хоть с одним реебром старого
    */

    function orientation(p,q,r){
        //функция, которая определяет ориентацию 3х точек
        const val = (q.y - p.y) * (r.x - q.x) - (q.x-p.x) * (r.y-q.y)
        if(val === 0) return 0; //то есть они коллинеарны(лежат на одной линии)
        return val > 0?1:2; //1 = по часовой, 2 = против часовой 
    }

    // вычисляем ориентации
    const o1 = orientation(a,b,c)
    const o2 = orientation(a,b,d)
    const o3 = orientation(c,d,a)
    const o4 = orientation(c,d,b)

    //если ориентации разные, то отрезки пересекаются
    if(o1 !== o2 && o3 !== o4) return true

    //случай для коллинеарных, проверяем лежит ли точка на отрезках
    if(o1 === 0 && onSegment(a,c,b)) return true;
    if(o2 === 0 && onSegment(a,d,b)) return true;
    if(o3 === 0 && onSegment(c,a,d)) return true;
    if(o4 === 0 && onSegment(c,b,d)) return true;


    return false;

}

function onSegment(a,p,b){
    //функция проверяет лежит ли точка p на отрезке ab
    return p.x <= Math.max(a.x, b.x) && p.x >= Math.min(a.x,b.x) && p.y <= Math.max(a.y,b.y) && p.y >= Math.min(a.y,b.y)
}


export function polygonsIntersect(poly1, poly2) {
    // Сначала быстрая проверка через bounding box
    let minX1 = Infinity, maxX1 = -Infinity;
    let minY1 = Infinity, maxY1 = -Infinity;
    for (const v of poly1) {
        minX1 = Math.min(minX1, v.x);
        maxX1 = Math.max(maxX1, v.x);
        minY1 = Math.min(minY1, v.y);
        maxY1 = Math.max(maxY1, v.y);
    }
    
    let minX2 = Infinity, maxX2 = -Infinity;
    let minY2 = Infinity, maxY2 = -Infinity;
    for (const v of poly2) {
        minX2 = Math.min(minX2, v.x);
        maxX2 = Math.max(maxX2, v.x);
        minY2 = Math.min(minY2, v.y);
        maxY2 = Math.max(maxY2, v.y);
    }
    
    // Если bounding box'ы не пересекаются — полигоны точно не пересекаются
    if (maxX1 < minX2 || maxX2 < minX1 || maxY1 < minY2 || maxY2 < minY1) {
        console.log('Bounding box не пересекаются → нет пересечения');
        return false;
    }
    
    console.log('Bounding box пересекаются, проверяем детально...');
    
    // Проверка пересечения ребер
    for (let i = 0; i < poly1.length; i++) {
        const a = poly1[i];
        const b = poly1[(i + 1) % poly1.length];
        
        for (let j = 0; j < poly2.length; j++) {
            const c = poly2[j];
            const d = poly2[(j + 1) % poly2.length];
            
            if (segmentsIntersect(a, b, c, d)) {
                console.log('Найдено пересечение ребер!');
                return true;
            }
        }
    }
    
    // Проверка, не находится ли один полигон полностью внутри другого
    // Достаточно проверить одну любую вершину
    if (isPointInPolygon(poly1[0], poly2) || isPointInPolygon(poly2[0], poly1)) {
        console.log('Один полигон внутри другого!');
        return true;
    }
    
    console.log('Пересечений нет');
    return false;
}

export function clampPolygonToBounds(polygon, canvasWidth, canvasHeight,margin = 0){
    //функция ограничивает лолигон границами canvas, если полигон выходит, то сдвигаем его

        // Находим границы полигона
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const point of polygon.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }
    
    // Вычисляем смещение
    let dx = 0, dy = 0;
    
    // Если полигон выходит за левую границу
    if (minX < margin) {
        dx = margin - minX;
    }
    // Если полигон выходит за правую границу
    else if (maxX > canvasWidth - margin) {
        dx = (canvasWidth - margin) - maxX;
    }
    
    // Если полигон выходит за верхнюю границу
    if (minY < margin) {
        dy = margin - minY;
    }
    // Если полигон выходит за нижнюю границу
    else if (maxY > canvasHeight - margin) {
        dy = (canvasHeight - margin) - maxY;
    }
    
    // Если смещение не нужно, возвращаем исходный полигон
    if (dx === 0 && dy === 0) {
        return polygon;
    }
    
    // Сдвигаем все вершины
    return {
        ...polygon,
        points: polygon.points.map(point => ({
            x: point.x + dx,
            y: point.y + dy
        }))
    };
}


export function getPolygonCenter(vertices){
    //функция вычисляет центр полигона(среднее арифметическое всех вершин), нужна для плавного перетаскивания полигона

    let sumX = 0, sumY = 0
    for(const vertex of vertices){
        sumX += vertex.x;
        sumY +=  vertex.y
    }
    return {
        x: sumX/vertices.lenght,
        y: sumY/vertices.lenght
    };
}


export function isConvex(vertices) {
    //фенкция проверяет, яв-ся ли полигон выпуклым(выпуклый - все внутренние углы меньше 180град)

    if (vertices.length < 3) return false;
    
    let sign = 0;
    
    for (let i = 0; i < vertices.length; i++) {
        const curr = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        const prev = vertices[(i - 1 + vertices.length) % vertices.length];
        
        // Векторное произведение (определяет поворот)
        const cross = (next.x - curr.x) * (prev.y - curr.y) - 
                      (next.y - curr.y) * (prev.x - curr.x);
        
        if (cross !== 0) {
            const currSign = cross > 0 ? 1 : -1;
            if (sign === 0) {
                sign = currSign;
            } else if (sign !== currSign) {
                return false;  // знак изменился - полигон вогнутый
            }
        }
    }
    
    return true;
}