import { LineBasicMaterial, Vector2, Line as GeomLine, BufferGeometry, Vector2Like } from 'three';

import { CAMERA_Z } from "../../config";
import { GoContainer } from "../../render_engine/objects/sub_types";
import { GridParams } from '../../modules/types';
import { ISegment, IArc, PointLike } from '../geometry/types';
import { Segment, Point } from '../geometry/shapes';
import { split_at_length, arc_start, arc_end } from '../geometry/logic';
import { shape_length } from '../geometry/utils';


export type TLinesDrawer = ReturnType<typeof LinesDrawer>;

export function LinesDrawer() {
    const DRAWN_ARC_EDGES_AMOUNT = 40;

    function draw_line(segment: ISegment, container: GoContainer, color = 0x22ff77) {
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

    function draw_grid(grid: number[][], params: GridParams, container: GoContainer, color = 0x88eeff) {
        for (let y = 0; y < grid.length; y ++) {
            for (let x = 0; x < grid[y].length; x ++) {
                if (grid[y][x] == 1) {
                    const box_xmin = params.start.x + params.cell_size * x;
                    const box_xmax = box_xmin + params.cell_size;
                    const box_ymin = params.start.y + params.cell_size * y;
                    const box_ymax = box_ymin + params.cell_size;
                    draw_line(Segment(Point(box_xmax, box_ymax), Point(box_xmax, box_ymin)), container, color);
                    draw_line(Segment(Point(box_xmax, box_ymax), Point(box_xmin, box_ymax)), container, color);
                    draw_line(Segment(Point(box_xmin, box_ymax), Point(box_xmin, box_ymin)), container, color);
                    draw_line(Segment(Point(box_xmax, box_ymin), Point(box_xmin, box_ymin)), container, color);                 
                }
            }
        }
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

    return { draw_line, draw_arc, clear_container, draw_grid, move_lines, clear_lines, translate_lines }
}