import { MessageId } from "@editor/modules/modules_const";
import { id_to_url } from "./utils";

declare global {
    namespace msg {
        export function post(receiver: string | hash, message_id: string, message?: any): void;
        export function url(socket?: string | hash, path?: string | hash, fragment?: string | hash): string;
    }
}

export function msg_module() {
    function post(receiver: string | hash, message_id: string, message?: any) {
        EventBus.send(message_id as MessageId, {
            receiver,
            message
        });
    }

    function url(socket?: string | hash, path?: string | hash, fragment?: string | hash): string {
        if (socket && typeof socket !== "string" && (socket as any).id != undefined) {
            const url = id_to_url((socket as any).id);
            if (url) {
                const parts = url.split(":/");
                if (parts.length > 1) socket = parts[0];
            }
        }
        if (path && typeof path !== "string" && (path as any).id != undefined) {
            const url = id_to_url((path as any).id);
            if (url) {
                const parts = url.split(":/");
                if (parts.length > 1) {
                    const pathAndFragment = parts[1].split("#");
                    path = pathAndFragment[0];
                }
            }
        }
        if (fragment && typeof fragment !== "string" && (fragment as any).id != undefined) {
            const url = id_to_url((fragment as any).id);
            if (url) {
                const hashIndex = url.indexOf("#");
                if (hashIndex !== -1) {
                    fragment = url.substring(hashIndex + 1);
                }
            }
        }

        let result = "";
        if (socket) result += socket;
        if (path) result += ":/" + path;
        if (fragment) result += "#" + fragment;
        return result;
    }

    return { post, url };
}