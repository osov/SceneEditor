/**
 * Декларации типов для three.js loaders и utils
 *
 * Эти типы необходимы так как three.js 0.182.0 не включает .d.ts файлы
 */

declare module 'three/examples/jsm/loaders/GLTFLoader' {
    import { AnimationClip, Camera, Group, LoadingManager, Object3D, Scene } from 'three';

    export interface GLTF {
        animations: AnimationClip[];
        scene: Group;
        scenes: Group[];
        cameras: Camera[];
        asset: object;
        parser: unknown;
        userData: Record<string, unknown>;
    }

    export class GLTFLoader {
        constructor(manager?: LoadingManager);
        load(
            url: string,
            onLoad: (gltf: GLTF) => void,
            onProgress?: (event: ProgressEvent) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
        loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<GLTF>;
        setDRACOLoader(dracoLoader: unknown): this;
        parse(
            data: ArrayBuffer | string,
            path: string,
            onLoad: (gltf: GLTF) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
    }
}

declare module 'three/examples/jsm/loaders/ColladaLoader' {
    import { AnimationClip, Group, LoadingManager, Object3D, Scene, Camera, SkinnedMesh } from 'three';

    export interface Collada {
        animations: AnimationClip[];
        kinematics: object;
        library: object;
        scene: Group;
    }

    export class ColladaLoader {
        constructor(manager?: LoadingManager);
        load(
            url: string,
            onLoad: (collada: Collada) => void,
            onProgress?: (event: ProgressEvent) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
        loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<Collada>;
        parse(text: string, path: string): Collada;
    }
}

declare module 'three/examples/jsm/loaders/FBXLoader' {
    import { Group, LoadingManager } from 'three';

    export class FBXLoader {
        constructor(manager?: LoadingManager);
        load(
            url: string,
            onLoad: (object: Group) => void,
            onProgress?: (event: ProgressEvent) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
        loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<Group>;
        parse(FBXBuffer: ArrayBuffer | string, path: string): Group;
    }
}

declare module 'three/examples/jsm/loaders/DRACOLoader' {
    import { BufferGeometry, LoadingManager } from 'three';

    export class DRACOLoader {
        constructor(manager?: LoadingManager);
        setDecoderPath(path: string): this;
        setDecoderConfig(config: object): this;
        setWorkerLimit(workerLimit: number): this;
        load(
            url: string,
            onLoad: (geometry: BufferGeometry) => void,
            onProgress?: (event: ProgressEvent) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
        loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<BufferGeometry>;
        preload(): this;
        dispose(): void;
    }
}

declare module 'three/examples/jsm/utils/SkeletonUtils' {
    import { Object3D, Skeleton, SkinnedMesh, AnimationClip, Bone } from 'three';

    export function clone(source: Object3D): Object3D;
    export function retarget(target: Object3D | Skeleton, source: Object3D | Skeleton, options?: object): void;
    export function retargetClip(
        target: Object3D | Skeleton,
        source: Object3D | Skeleton,
        clip: AnimationClip,
        options?: object
    ): AnimationClip;
    export function getHelperFromSkeleton(skeleton: Skeleton): Object3D;
    export function getBones(skeleton: Skeleton | Bone[]): Bone[];
    export function findBoneTrackData(name: string, tracks: unknown[]): object;
}
