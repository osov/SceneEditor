// GoText - текстовый компонент для GameObject

import { IObjectTypes } from "../../types";
import { TextMesh } from "../text";

export class GoText extends TextMesh {
    public type = IObjectTypes.GO_LABEL_COMPONENT;
    public is_component = true;

    // GoText использует поля из TextMesh (не переопределяем)
}
