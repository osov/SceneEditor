import { IObjectTypes } from "../types";
import { MultipleMaterialMesh } from "./multiple_material_mesh";

export class Model extends MultipleMaterialMesh {
    public type = IObjectTypes.GO_MODEL_COMPONENT;
}