import { EntityBase } from "../objects/entity_base";
import { IBaseEntity, IObjectTypes } from "../types";
import { CmpSpline } from "./spline";

export enum ComponentType {
    NONE,
    SPLINE
}

export class Component extends EntityBase implements IBaseEntity {
    public type = IObjectTypes.COMPONENT;
    public sub_type = ComponentType.NONE;
    public is_component = true;
    cmp: ReturnType<typeof CmpSpline>;

    constructor(id: number, type:number) {
        super(id);
        this.set_scale(0.1, 0.1);
        this.cmp = CmpSpline(this);
        this.cmp.init();
    }


    serialize(params?: any) {
        const data = this.cmp.serialize(params);
        return {t:this.sub_type, data};
    }

    deserialize(_data: any) {
        this.cmp.deserialize(_data.data);
    }



}