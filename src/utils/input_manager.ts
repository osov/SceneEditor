import { degToRad } from "@editor/modules/utils";
import { DynamicEntity } from "./physic/physic_system";


export function InputManager(player: DynamicEntity) {
    function update(dt: number) {
        const angle = get_angle();
        if (angle == -1) {
            if (player.is_moving) 
                player.is_moving = false;
            return;
        }
        if (angle != -1 && !player.is_moving) {
            player.is_moving = true;
        }
        const angle_rad = degToRad(angle);
        player.shape.setAngle(angle_rad, true);
    }
    
    return {update}
}


export function get_angle() {
    let angle = -1;
    if ((Input.keys_state['d'] || Input.keys_state['ArrowRight']) && (Input.keys_state['w'] || Input.keys_state['ArrowUp']))
        angle = 45;
    else if ((Input.keys_state['a'] || Input.keys_state['ArrowLeft']) && (Input.keys_state['w'] || Input.keys_state['ArrowUp']))
        angle = 135;
    else if ((Input.keys_state['a'] || Input.keys_state['ArrowLeft']) && (Input.keys_state['s'] || Input.keys_state['ArrowDown']))
        angle = 225;
    else if ((Input.keys_state['d'] || Input.keys_state['ArrowRight']) && (Input.keys_state['s'] || Input.keys_state['ArrowDown']))
        angle = 315;
    else if (Input.keys_state['d'] || Input.keys_state['ArrowRight'])
        angle = 0;
    else if (Input.keys_state['w'] || Input.keys_state['ArrowUp'])
        angle = 90;
    else if (Input.keys_state['a'] || Input.keys_state['ArrowLeft'])
        angle = 180;
    else if (Input.keys_state['s'] || Input.keys_state['ArrowDown'])
        angle = 270;
    return angle;
}