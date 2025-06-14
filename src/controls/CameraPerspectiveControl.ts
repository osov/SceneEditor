import { PerspectiveCamera, Vector2, Vector3, Object3D, Euler } from "three";


export function createCameraPerspectiveControl(camera: PerspectiveCamera, domElement?: HTMLElement) {
    let _is_changed = false;
    const _panStart = new Vector2();
    const _panEnd = new Vector2();
    const _eye = new Vector3();
    const _movePrev = new Vector2();
    const _moveCurr = new Vector2();
    const pitchObject = new Object3D();
    const yawObject = new Object3D();
    pitchObject.add(camera);
    yawObject.add(pitchObject);
    const PI_2 = Math.PI / 2;

    const screen = { left: 0, top: 0, width: 0, height: 0 };
    const panSpeed = 1;
    const target = new Vector3();
    const keyboard = {
        up: false, down: false, left: false, right: false,
        top: false, bottom: false, shift: false, alt: false,
        l: false, r: false, t: false, b: false, space: false,
    };

    const element = domElement ?? document;

    function getObject() {
        return yawObject;
    }

    function getDir() {
        return new Vector2(pitchObject.rotation.x, yawObject.rotation.y);
    }

    function setDir(x: number, y: number) {
        pitchObject.rotation.x = x;
        yawObject.rotation.y = y;
    }

    const getDirection = (() => {
        const direction = new Vector3(0, 0, -1);
        const rotation = new Euler(0, 0, 0, "YXZ");
        return (v: Vector3) => {
            rotation.set(pitchObject.rotation.x, yawObject.rotation.y, 0);
            v.copy(direction).applyEuler(rotation);
            return v;
        };
    })();

    const getMouseOnScreen = (() => {
        const vector = new Vector2();
        return (pageX: number, pageY: number) => {
            vector.set(
                (pageX - screen.left) / screen.width,
                (pageY - screen.top) / screen.height
            );
            return vector;
        };
    })();

    const getMouseOnCircle = (() => {
        const vector = new Vector2();
        return (pageX: number, pageY: number) => {
            vector.set(
                ((pageX - screen.width * 0.5 - screen.left) / (screen.width * 0.5)),
                ((screen.height + 2 * (screen.top - pageY)) / screen.width)
            );
            return vector;
        };
    })();

    function panCamera() {
        const mouseChange = new Vector2().copy(_panEnd).sub(_panStart);
        if (mouseChange.lengthSq()) {
            mouseChange.multiplyScalar(_eye.length() * panSpeed);
            const up = new Vector3(0, 1, 0);
            const direction = new Vector3(0, 0, -1);
            const rotation = new Euler(pitchObject.rotation.x, yawObject.rotation.y, 0, "YXZ");
            const v = direction.clone().applyEuler(rotation);
            const pan = v.clone().cross(up).setLength(mouseChange.x);

            const v2 = new Vector3(1, 0, 0).applyEuler(rotation);
            pan.add(v2.clone().cross(up).setLength(mouseChange.y));
            getObject().position.add(pan);
            target.add(pan);
            _panStart.copy(_panEnd);
        }
    }

    function mousemove(event: MouseEvent) {
        if (!enabled) return;
        const is_down = (event.buttons === 2 && event.button === 0);
        if (is_down) {
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            yawObject.rotation.y -= movementX * 0.002;
            pitchObject.rotation.x -= movementY * 0.002;
            pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
        } else if (event.buttons === 4 && event.button === 0) {
            _panEnd.copy(getMouseOnScreen(event.pageX, event.pageY));
        }
    }

    function mousedown(event: MouseEvent) {
        if (!enabled) return;
        _moveCurr.copy(getMouseOnCircle(event.pageX, event.pageY));
        _panStart.copy(getMouseOnScreen(event.pageX, event.pageY));
        _panEnd.copy(_panStart);
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup);
    }

    function mouseup(_: MouseEvent) {
        if (!enabled) return;
        document.removeEventListener('mousemove', mousemove);
        document.removeEventListener('mouseup', mouseup);
    }

    function mousewheel(event: WheelEvent) {
        if (!enabled) return;
        const forward = new Vector3(0, 0, -1);
        const rotation = new Euler(pitchObject.rotation.x, yawObject.rotation.y, 0, "YXZ");
        const direction = forward.clone().applyEuler(rotation);
        const wheel_dir = event.deltaY / 100;
        if (wheel_dir > 0) {
            getObject().position.sub(direction);
        } else {
            getObject().position.add(direction);
        }
    }

    function keydown(event: KeyboardEvent) {
        if (!enabled) return;
        switch (event.keyCode) {
            case 81: keyboard.top = true; break;
            case 69: keyboard.bottom = true; break;
            case 87: keyboard.up = true; break;
            case 83: keyboard.down = true; break;
            case 65: keyboard.left = true; break;
            case 68: keyboard.right = true; break;
            case 16: keyboard.shift = true; break;
            case 18: keyboard.alt = true; break;
            case 38: keyboard.t = true; break;
            case 40: keyboard.b = true; break;
            case 37: keyboard.l = true; break;
            case 39: keyboard.r = true; break;
            case 32: keyboard.space = true; break;
        }
    }

    function keyup(event: KeyboardEvent) {
        if (!enabled) return;
        switch (event.keyCode) {
            case 81: keyboard.top = false; break;
            case 69: keyboard.bottom = false; break;
            case 87: keyboard.up = false; break;
            case 83: keyboard.down = false; break;
            case 65: keyboard.left = false; break;
            case 68: keyboard.right = false; break;
            case 16: keyboard.shift = false; break;
            case 18: keyboard.alt = false; break;
            case 38: keyboard.t = false; break;
            case 40: keyboard.b = false; break;
            case 37: keyboard.l = false; break;
            case 39: keyboard.r = false; break;
            case 32: keyboard.space = false; break;
        }
    }

    function stop_keys() {
        for (const key in keyboard) keyboard[key as keyof typeof keyboard] = false;
    }

    function update(delta = 0.03) {
        if (!enabled) return;
       // if (delta > 0.1) delta = 0.1;
        _eye.subVectors(getObject().position, target);
        const velocity = new Vector3();
        delta *= 0.7;
        if (keyboard.shift) {
            delta *= 2;
            if (keyboard.alt) delta *= 3;
        }
        if (keyboard.top) velocity.y += 400.0 * delta;
        if (keyboard.bottom) velocity.y -= 400.0 * delta;
        if (keyboard.up) velocity.z -= 400.0 * delta;
        if (keyboard.down) velocity.z += 400.0 * delta;
        if (keyboard.left) velocity.x -= 400.0 * delta;
        if (keyboard.right) velocity.x += 400.0 * delta;

        if (velocity.lengthSq() > 0) {
            getObject().translateX(velocity.x * delta);
            getObject().translateY(velocity.y * delta);
            getObject().translateZ(velocity.z * delta);
        } else {
            panCamera();
            getObject().position.addVectors(target, _eye);
        }
    }

    function handleResize() {
        if (element === document) {
            screen.left = 0;
            screen.top = 0;
            screen.width = window.innerWidth;
            screen.height = window.innerHeight;
        } else {
            const box = element.getBoundingClientRect();
            const d = element.ownerDocument.documentElement;
            screen.left = box.left + window.pageXOffset - d.clientLeft;
            screen.top = box.top + window.pageYOffset - d.clientTop;
            screen.width = box.width;
            screen.height = box.height;
        }
    }

    function dispose() {
        element.removeEventListener('mousedown', mousedown);
        element.removeEventListener('mouseup', mouseup);
        element.removeEventListener('mousemove', mousemove);
        element.removeEventListener('keydown', keydown);
        element.removeEventListener('keyup', keyup);
        element.removeEventListener('wheel', mousewheel);
    }

    function init() {
        element.addEventListener('mouseup', mouseup);
        element.addEventListener('mousedown', mousedown);
        element.addEventListener('keydown', keydown);
        element.addEventListener('keyup', keyup);
        element.addEventListener('wheel', mousewheel);
    }

    let enabled = true;
    handleResize();
    init();

    return {
        update,
        dispose,
        stop_keys,
        getObject,
        getDir,
        setDir,
        getDirection,
        handleResize,
        get keyboard() { return keyboard; },
        get enabled() { return enabled; },
        set enabled(val: boolean) { enabled = val; },
    };
}
