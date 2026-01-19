// Утилиты для работы с кривыми (Catmull-Rom)

type Point = { x: number, y: number };

function CatmullRom(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t * t2;
    return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}

// Вычисление длины отрезка
function dist(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Генерация таблицы длин для равномерной скорости
export function generateArcLengthTable(points: Point[], divisions: number = 100): { arcLengths: number[], tValues: number[] } {
    const arcLengths = [0];
    const tValues = [0];

    let prev = { x: 0, y: 0 };
    getPointCurve(0, points, prev);

    let length = 0;

    for (let i = 1; i <= divisions; i++) {
        const t = i / divisions;
        const curr = { x: 0, y: 0 };
        getPointCurve(t, points, curr);
        length += dist(prev, curr);

        arcLengths.push(length);
        tValues.push(t);
        prev = curr;
    }

    // Нормализуем длины
    for (let i = 0; i < arcLengths.length; i++) {
        arcLengths[i] /= length;
    }

    return { arcLengths, tValues };
}

// Поиск t для нужной длины
function findTForUniformT(u: number, arcLengths: number[], tValues: number[]): number {
    for (let i = 1; i < arcLengths.length; i++) {
        if (u <= arcLengths[i]) {
            const ratio = (u - arcLengths[i - 1]) / (arcLengths[i] - arcLengths[i - 1]);
            return tValues[i - 1] + ratio * (tValues[i] - tValues[i - 1]);
        }
    }
    return 1;
}

export function getPointCurve(t: number, points: Point[], point: Point): Point {
    const p = (points.length - 1) * t;

    const intPoint = Math.floor(p);
    const weight = p - intPoint;

    const p0 = points[intPoint === 0 ? intPoint : intPoint - 1];
    const p1 = points[intPoint];
    const p2 = points[intPoint > points.length - 2 ? points.length - 1 : intPoint + 1];
    const p3 = points[intPoint > points.length - 3 ? points.length - 1 : intPoint + 2];

    point.x = CatmullRom(weight, p0.x, p1.x, p2.x, p3.x);
    point.y = CatmullRom(weight, p0.y, p1.y, p2.y, p3.y);
    return point;
}

// Равномерная позиция по длине дуги
export function getUniformPoint(u: number, points: Point[], arcTable: { arcLengths: number[], tValues: number[] }, point: Point): Point {
    const t = findTForUniformT(u, arcTable.arcLengths, arcTable.tValues);
    return getPointCurve(t, points, point);
}
