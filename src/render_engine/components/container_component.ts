import { EntityBase } from "../objects/entity_base";
import { IBaseEntity, IObjectTypes } from "../types";
import { CmpMover } from "./mover";
import { CmpSpline } from "./spline";

export enum ComponentType {
    NONE,
    SPLINE,
    MOVER
}

export class Component extends EntityBase implements IBaseEntity {
    public type = IObjectTypes.COMPONENT;
    public sub_type = ComponentType.NONE;
    public is_component = true;
    cmp: ReturnType<typeof CmpSpline> | ReturnType<typeof CmpMover>;

    constructor(id: number, type: ComponentType) {
        super(id);
        this.set_scale(0.1, 0.1);
        this.sub_type = type;
        if (type == ComponentType.SPLINE)
            this.cmp = CmpSpline(this);
        else
            this.cmp = CmpMover(this);
        this.cmp.init();
    }


    serialize(params?: any) {
        const data = this.cmp.serialize(params);
        return { t: this.sub_type, data };
    }

    deserialize(_data: any) {
        this.sub_type = _data.t;
        this.cmp.deserialize(_data.data);
    }
}