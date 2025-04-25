import { EntityBase } from "../objects/entity_base";
import { IBaseEntity, IObjectTypes } from "../types";
import { CmpSpline } from "./spline";

export class Component extends EntityBase implements IBaseEntity {
    public type = IObjectTypes.COMPONENT;
    public is_component = true;
    cmp: ReturnType<typeof CmpSpline>;

    constructor(id: number) {
        super(id);
        this.set_scale(0.1, 0.1);
        this.cmp = CmpSpline(this);
        this.cmp.init();
    }


    serialize() {
        return this.cmp.serialize();
    }
    deserialize(_data: any) {
        this.cmp.deserialize(_data);
    }



}