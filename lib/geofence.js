// lib/geofence.js

/**
 * Represents a 2D point.
 * In this context, 'x' is longitude and 'y' is latitude.
 */
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }  
}

// A large number to represent infinity for the ray-casting algorithm.
const INF = 10000;

// Helper function to find the orientation of the ordered triplet (p, q, r).
function orientation(p, q, r) {
    let val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0; // Collinear
    return (val > 0) ? 1 : 2; // Clockwise or Counterclockwise
}

// Helper function to check if point q lies on segment pr.
function onSegment(p, q, r) {
    return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y));
}

// Helper function to check if line segment 'p1q1' and 'p2q2' intersect.
function doIntersect(p1, q1, p2, q2) {
    let o1 = orientation(p1, q1, p2);
    let o2 = orientation(p1, q1, q2);
    let o3 = orientation(p2, q2, p1);
    let o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;

    // Special Cases for collinear points
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;

    return false;
}

/*
 * Checks if a given point is inside a polygon using the ray-casting algorithm.
 * @param {Point[]} polygon - An array of Points defining the polygon vertices.
 * @param {Point} p - The point to check.
 * @returns {boolean} - True if the point is inside the polygon, false otherwise.
 */
export function isPointInsidePolygon(polygon, p) {
    const n = polygon.length;
    if (n < 3) {
        return false; // A polygon must have at least 3 vertices
    }

    let extreme = new Point(INF, p.y);

    let count = 0;
    for (let i = 0; i < n; i++) {
        let next = (i + 1) % n;
        if (doIntersect(polygon[i], polygon[next], p, extreme)) {
            if (orientation(polygon[i], p, polygon[next]) === 0) {
                return onSegment(polygon[i], p, polygon[next]);
            }
            count++;
        }
    }
    return count % 2 === 1;
}
