import { LineBasicMaterial, Vector2, Line as GeomLine, BufferGeometry, Vector2Like } from 'three';

import { CAMERA_Z } from "../config";
import { GoContainer } from "../render_engine/objects/sub_types";
import { IArc, PointLike } from './geometry/types';
import { Segment, Point, Arc } from './geometry/shapes';
import { split_at_length, arc_start, arc_end } from './geometry/logic';
import { shape_length } from './geometry/utils';
import { COLORS } from './old_pathfinder/types';

type SegmentLike = {start: PointLike, end: PointLike};
type PolyPoints = PointLike[];
export type TLinesDrawer = ReturnType<typeof LinesDrawer>;

export function LinesDrawer() {
    const DRAWN_ARC_EDGES_AMOUNT = 40;
    const POINT_R = 0.1;
    const POINTS_COLOR = COLORS.PURPLE;

    function draw_multiline(points: PolyPoints, container: GoContainer, color = 0x22ff77, draw_points = false, points_radius = POINT_R) {
        if (draw_points) {
            const p = points[0];
            draw_arc(Arc(Point(p.x, p.y), points_radius, 0, Math.PI * 2), container, POINTS_COLOR);

        }
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            draw_line({start: Point(p1.x, p1.y), end: Point(p2.x, p2.y)}, container, color);
            if (draw_points) {
                draw_arc(Arc(Point(p2.x, p2.y), points_radius, 0, Math.PI * 2), container, POINTS_COLOR);
            }
        }
    }

    function draw_polygon(points: PolyPoints, container: GoContainer, color = 0x22ff77) {
        draw_multiline(points, container, color);
        draw_line({start: points[0], end: points[points.length - 1]}, container, color);
    }

    function draw_line(segment: SegmentLike, container: GoContainer, color = 0x22ff77) {
        const a = segment.start;
        const b = segment.end;
        const point_a = new Vector2(a.x,  a.y);
        const point_b = new Vector2(b.x,  b.y);
        const points: Vector2[] = [point_a, point_b];
        const geometry = new BufferGeometry().setFromPoints(points);
        const material = new LineBasicMaterial({ color });
        const line = new GeomLine(geometry, material);
        line.position.z = CAMERA_Z  - 5;
        container.add(line);
        return line;
    }

    function draw_arc(arc: IArc, container: GoContainer, color = 0x22ff77, arc_edges = DRAWN_ARC_EDGES_AMOUNT) {
        const step = 2 * Math.PI * arc.r / arc_edges;
        const list = [];
        let lenght_remains = shape_length(arc);
        let _allowed_way = arc;
        while (lenght_remains > 0 && !('null' in _allowed_way)) {
            const move = (step < shape_length(_allowed_way)) ? step : shape_length(_allowed_way);
            lenght_remains -= move;
            const sub_arcs = split_at_length(_allowed_way, move);
            const move_arc = sub_arcs[0] as IArc;
            _allowed_way = sub_arcs[1] as IArc;
            const p1 = arc_start(move_arc);
            const p2 = arc_end(move_arc);
            const line = draw_line(Segment(p1, p2), container, color);
            list.push({line, p1, p2});
        }
        return list;
    }
    
    function move_lines(lines: GeomLine[], points: Vector2[]) {
        for (const line of lines)
            line.geometry.setFromPoints(points);
    }

    function translate_lines(lines: {
        line: GeomLine;
        p1: PointLike;
        p2: PointLike;
    }[], vector: Vector2Like) { 
        for (const data of lines) {
            const p1 = new Vector2(data.p1.x + vector.x,  data.p1.y + vector.y);
            const p2 = new Vector2(data.p2.x + vector.x,  data.p2.y + vector.y);
            data.line.geometry.setFromPoints([p1, p2]);
            data.p1 = p1;
            data.p2 = p2;
            data.line.position.z = CAMERA_Z - 0.01;
        }
    }

    function clear_lines(lines: GeomLine[]) {
        for (const line of lines) {
            line.removeFromParent();
            line.geometry.dispose();
        }
        lines.splice(0, lines.length);    
    }

    function clear_container(container: GoContainer) {
        const children = container.children as GeomLine[];
        if (children.length == 0) return;
        clear_lines(children);
        for (const child of children) {
            child.parent!.remove(child);
            
        }
        container.clear()
    }

    return { draw_polygon, draw_multiline, draw_line, draw_arc, clear_container, move_lines, clear_lines, translate_lines }
}