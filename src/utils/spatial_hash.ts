export type Aabb = { id: string; x: number; y: number; width: number; height: number };

export function createSpatialHash(cell_size: number) {
    const grid: Record<string, Aabb[]> = {};

    function get_cells_for_aabb(aabb: Aabb): string[] {
        const cells: string[] = [];
        const x_start = Math.floor(aabb.x / cell_size);
        const x_end = Math.floor((aabb.x + aabb.width) / cell_size);
        const y_start = Math.floor(aabb.y / cell_size);
        const y_end = Math.floor((aabb.y + aabb.height) / cell_size);

        for (let x = x_start; x <= x_end; x++) {
            for (let y = y_start; y <= y_end; y++) {
                cells.push(`${x},${y}`);
            }
        }

        return cells;
    }

    function add(aabb: Aabb) {
        aabb.x -= aabb.width / 2;
        aabb.y -= aabb.height / 2;
        const cells = get_cells_for_aabb(aabb);
        for (let i = 0; i < cells.length; i++) {
            const cell_key = cells[i];
            if (!grid[cell_key]) {
                grid[cell_key] = [];
            }
            grid[cell_key].push(aabb);
        }
    }

    function remove(aabb: Aabb) {
        aabb.x -= aabb.width / 2;
        aabb.y -= aabb.height / 2;
        const cells = get_cells_for_aabb(aabb);
        for (let i = 0; i < cells.length; i++) {
            const cell_key = cells[i];
            const cell = grid[cell_key];
            if (cell) {
                for (let j = 0; j < cell.length; j++) {
                    if (cell[j].id === aabb.id) {
                        cell.splice(j, 1);
                        j--;
                    }
                }
                if (cell.length === 0) {
                    delete grid[cell_key];
                }
            }
        }
    }

    function query_range(x: number, y: number, width: number, height: number): Aabb[] {
        x -= width / 2;
        y -= height / 2;
        const query_box: Aabb = { id: '__query__', x, y, width, height };
        const result: Aabb[] = [];
        const seen: Record<string, true> = {};
        const cell_keys = get_cells_for_aabb(query_box);

        for (let i = 0; i < cell_keys.length; i++) {
            const key = cell_keys[i];
            const cell = grid[key];
            if (cell) {
                for (let j = 0; j < cell.length; j++) {
                    const obj = cell[j];
                    if (!seen[obj.id]) {
                        seen[obj.id] = true;

                        const overlaps =
                            obj.x < x + width &&
                            obj.x + obj.width > x &&
                            obj.y < y + height &&
                            obj.y + obj.height > y;

                        if (overlaps) {
                            result.push(obj);
                        }
                    }
                }
            }
        }

        return result;
    }

    function get_debug_cells(): { x: number; y: number; width: number; height: number; objects: Aabb[] }[] {
        const result: { x: number; y: number; width: number; height: number; objects: Aabb[] }[] = [];

        for (const cell_key in grid) {
            const cell = grid[cell_key];
            if (cell && cell.length > 0) {
                const [cell_x_str, cell_y_str] = cell_key.split(",");
                const cell_x = parseInt(cell_x_str, 10);
                const cell_y = parseInt(cell_y_str, 10);

                result.push({
                    x: cell_x * cell_size,
                    y: cell_y * cell_size,
                    width: cell_size,
                    height: cell_size,
                    objects: cell,
                });
            }
        }

        return result;
    }

    return {
        add,
        remove,
        query_range,
        get_debug_cells
    };
}
