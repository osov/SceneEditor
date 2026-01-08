import { Point } from "./geometry/shapes";
import { IPoint, PointLike } from "./geometry/types";
import { Aabb, createSpatialHash } from "./spatial_hash";


export type SpatialHashManagerUtils<T> = {
    get_center: (elem: T) => PointLike;
    get_height: (elem: T) => number;
    get_width: (elem: T) => number;
    get_distance: (p: IPoint, elem: T) => number;
}

export type HashObject = { id: string | number, elements_ids: string | number[], enabled: boolean, data?: any };


export function SpatialHashManagerCreate<T>(utils: SpatialHashManagerUtils<T>, hash_cell_size: number = 20) {
    const all_elements: T[] = [];
    const objects: { [key: string | number]: HashObject } = {};
    const sp = createSpatialHash(hash_cell_size);
    let id_object = 0;
    let id_element = 0;
    const _data: { [key: string | number]: Aabb & { element: T, object_id?: string | number } } = {};

    function add_object(_elements: T[], _id?: string | number, data?: any) {
        let id: string | number;
        if (_id)
            id = _id;
        else {
            id = id_object;
            id_object++;
        }
        const elements_ids: string | number[] = [];
        for (const elem of _elements) {
            const elem_id = add_element(elem, id);
            elements_ids.push(elem_id);
        }
        const obj: HashObject = { id, elements_ids, enabled: true, data };
        objects[id] = obj;
    }

    function set_objects(objects: Dict<T[]>) {
        clear_elements();
        objects = {};
        for (const object_id of Object.keys(objects)) {
            const elements = objects[object_id] as T[];
            add_object(elements, object_id)
            
        }
    }

    function add_element(element: T, object_id?: string | number, data?: any) {
        all_elements.push(element);
        // const pc = shape_center(obstacle);
        // const width = Math.abs(obstacle.end.x - obstacle.start.x);
        // const height = Math.abs(obstacle.end.y - obstacle.start.y);
        const pc = utils.get_center(element);
        const width = utils.get_width(element);
        const height = utils.get_height(element);
        const x = pc.x;
        const y = pc.y;
        id_element++;
        _data[id_element] = { id: id_element, x, y, width, height, element, object_id, data };
        sp.add({ id: id_element, x, y, width, height, data});
        return id_element;
    }

    function remove_element(id: string | number) {
        const obst_data = _data[id];
        if (!obst_data)
            return false;
        sp.remove(obst_data);
        delete _data[id];
        return true;
    }

    function get_element_by_id(id: string) {
        const element_data = _data[id];
        if (!element_data)
            return false;
        return element_data.element;
    }

    function clear_all() {
        clear_elements();
        clear_objects();
    }

    function clear_objects() {
        for (const id in objects) {
            delete objects[id];
        }
        id_object = 0;
    }

    function clear_elements() {
        for (let i = 0; i < id_element; i++) {
            remove_element(i);
        }
        id_element = 0;
    }

    function get_elements_in_zone(elem: T) {
        const pc = utils.get_center(elem);
        const w = utils.get_width(elem);
        const h = utils.get_width(elem);
        return get_elements(pc.x, pc.y, w, h);
    }

    function get_elements(x: number, y: number, width: number, height: number) {
        const list: T[] = [];
        const result = sp.query_range(x, y, width, height);
        for (const entry of result) {
            const id = entry.id;
            const elem_data = _data[id];
            if (elem_data != null) {
                let obj = undefined;
                if (elem_data.object_id)
                    obj = objects[elem_data.object_id];
                if (!obj || obj.enabled)
                    list.push(elem_data.element);
            }
        }
        return list;
    }

    function enable_object(id: string, enabled: boolean) {
        const obj = objects[id];
        if (obj != null) obj.enabled = enabled;
    }

    function get_object_by_pos(x: number, y: number) {
        const result = sp.query_range(x, y, 11, 11);
        const point = Point(x, y);
        let shortest_distance = Infinity;
        let id_closest: string | number | undefined;
        for (const entry of result) {
            const id = entry.id;
            const obst_data = _data[id];
            if (obst_data != null) {
                // const dist = point2segment(point, obst_data.element)[0];
                const dist = utils.get_distance(point, obst_data.element);
                if (dist < shortest_distance) {
                    shortest_distance = dist;
                    id_closest = obst_data.object_id;
                }
            }
        }
        if (id_closest)
            return objects[id_closest];
        return false;
    }

    return {
        add_object, 
        set_objects,
        add_element, 
        remove_element, 
        clear_all, 
        clear_elements,
        get_elements, 
        get_elements_in_zone,
        enable_object, 
        get_object_by_pos,
        get_element_by_id, 
        objects, all_elements
    };
}