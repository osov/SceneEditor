import { MessageId } from "@editor/modules/modules_const";
import { Services } from '@editor/core';

declare global {
    namespace msg {
        export function post(receiver: string | hash, message_id: string, message?: unknown): void;
        export function url(socket?: string | hash, path?: string | hash, fragment?: string | hash): string;
    }
}

export function msg_module() {
    function post(receiver: string | hash, message_id: string, message?: unknown) {
        Services.event_bus.emit(message_id as MessageId, {
            receiver,
            message
        });
    }

    function url(socket?: string | hash, path?: string | hash, fragment?: string | hash): string {
        let socketStr: string | undefined;
        let pathStr: string | undefined;
        let fragmentStr: string | undefined;

        if (socket) {
            if (typeof socket !== "string" && (socket as any).id != undefined) {
                const url = Services.scene.get_url_by_id((socket as any).id);
                if (url) {
                    const parts = url.split(":/");
                    socketStr = parts[0];
                }
            } else if (typeof socket === "string") {
                const parts = socket.split(":/");
                socketStr = parts[0];
                if (parts.length > 1) {
                    const pathAndFragment = parts[1].split("#");
                    pathStr = pathAndFragment[0];
                    if (pathAndFragment.length > 1) {
                        fragmentStr = pathAndFragment[1];
                    }
                }
            }
        }

        if (path && !pathStr) {
            if (typeof path !== "string" && (path as any).id != undefined) {
                const url = Services.scene.get_url_by_id((path as any).id);
                if (url) {
                    const parts = url.split(":/");
                    if (parts.length > 1) pathStr = parts[1].split("#")[0];
                    else pathStr = parts[0];
                }
            } else if (typeof path === "string") {
                const parts = path.split(":/");
                if (parts.length > 1) pathStr = parts[1].split("#")[0];
                else pathStr = parts[0].split("#")[0];
            }
        }

        if (fragment && !fragmentStr) {
            if (typeof fragment !== "string" && (fragment as any).id != undefined) {
                const url = Services.scene.get_url_by_id((fragment as any).id);
                if (url) {
                    const hashIndex = url.indexOf("#");
                    if (hashIndex != -1) {
                        fragmentStr = url.substring(hashIndex + 1);
                    }
                }
            } else if (typeof fragment === "string") {
                const hashIndex = fragment.indexOf("#");
                fragmentStr = hashIndex != -1 ? fragment.substring(hashIndex + 1) : fragment;
            }
        }

        let result = "";
        if (socketStr) result += socketStr;
        if (pathStr) result += ":/" + pathStr;
        if (fragmentStr) result += "#" + fragmentStr;
        return result;
    }

    return { post, url };
}