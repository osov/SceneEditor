import { Vector2, Vector3 } from "three";
import { Aabb, createSpatialHash } from "./spatial_hash";
import { IBaseEntityAndThree } from "../render_engine/types";
import { Services } from '@editor/core';

interface RegionData {
    region: Aabb;
    list: { [k: string]: boolean }
}

interface GoData {
    id: string;
    pos: Vector3;
}

export function createRegionManager(cell_size: number, object_size: number) {
    const sp = createSpatialHash(cell_size);
    let id_region = 0;
    const regions_data: { [id_region: string]: RegionData } = {};
    const objects: GoData[] = [];

    function add_region(x: number, y: number, width: number, height: number) {
        const id = 'region_' + id_region;
        id_region++;
        regions_data[id] = { region: { id, x, y, width, height }, list: {} };
        sp.add(regions_data[id].region);
        return id;
    }

    function remove_region(id: string) {
        const reg = regions_data[id];
        if (!reg)
            return false;
        sp.remove(reg.region);
        delete regions_data[id];
        return true;
    }


    function add_object(it: GoData) {
        objects.push(it);
    }

    function add_mesh(it: IBaseEntityAndThree) {
        objects.push({id:it.name, pos:it.position});
    }

    function on_entered_check(id_region: string, item: GoData) {
        const reg = regions_data[id_region];
        if (!reg) {
            Services.logger.error('Регион не найден:', id_region);
            return;
        }
        // уже был в регионе
        if (reg.list[item.id])
            return;
        reg.list[item.id] = true;
        on_enter_region(id_region, item.id);
    }

    function on_enter_region(id_region: string, id_mesh: string) {
        Services.event_bus.emit('REGION_ENTER', {id_mesh, id_region}, false);
        //log('Enter:', id_mesh, 'in region:', id_region);
    }

    function on_leave_region(id_region: string, id_mesh: string) {
        Services.event_bus.emit('REGION_LEAVE', {id_mesh, id_region}, false);
        //log('Leave:', id_mesh, 'in region:', id_region);
    }

    function update() {
        const active_regions_data: Record<string, { [id_object: string]: boolean }> = {};
        for (let i = objects.length - 1; i >= 0; i--) {
            const it = objects[i];
            const result = sp.query_range(it.pos.x, it.pos.y, object_size, object_size);
            if (result.length > 0) {
                for (let j = 0; j < result.length; j++) {
                    const reg = result[j];
                    on_entered_check(reg.id as string, it);
                    if (!active_regions_data[reg.id])
                        active_regions_data[reg.id] = {};
                    active_regions_data[reg.id][it.id] = true;
                }
            }
        }
        for (const id_region in regions_data) {
            const reg = regions_data[id_region];
            const active_reg_data = active_regions_data[id_region];
            for (const id_mesh in reg.list) {
                // если нет среди активных регионов, либо просто в активном регионе нет именно этого меша
                if (!active_reg_data || !active_reg_data[id_mesh]) {
                    on_leave_region(id_region, id_mesh);
                    delete reg.list[id_mesh];
                }
            }
        }
    }

    function get_debug_cells(){
        return sp.get_debug_cells();
    }



    return { add_region, remove_region, add_object,add_mesh, update ,get_debug_cells};
}