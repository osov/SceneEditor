export type VoidCallback = () => void;
export type Messages = UserMessages & SystemMessages;
export type MessageId = keyof Messages;

export interface VoidMessage { }

type HTMLElementOrNull = EventTarget | null;

export type _SystemMessages = {
    SYS_ENGINE_READY: VoidMessage
    SYS_ON_RESIZED: { width: number, height: number },
    SYS_INPUT_POINTER_MOVE: { x: number, y: number, offset_x: number, offset_y: number, target: HTMLElementOrNull },
    SYS_INPUT_POINTER_DOWN: { x: number, y: number, offset_x: number, offset_y: number, button: number, target: HTMLElementOrNull },
    SYS_INPUT_POINTER_UP: { x: number, y: number, offset_x: number, offset_y: number, button: number, target: HTMLElementOrNull },
    SYS_VIEW_INPUT_KEY_DOWN: { key: string, target: HTMLElementOrNull },
    SYS_VIEW_INPUT_KEY_UP: { key: string, target: HTMLElementOrNull },

    SYS_ON_UPDATE: { dt: number },
    SYS_ON_UPDATE_END: { dt: number },
  
    ON_WS_CONNECTED: VoidMessage,
    ON_WS_DISCONNECTED: VoidMessage,
    ON_WS_DATA: { data: string | Uint8Array },
    TRY_WS_CONNECT: VoidMessage,
    TRY_WS_DISCONNECT: VoidMessage,
};

export type NetMessages = {
    // CS_GAME_CMD: { id: keyof GameCommands, message?: GameCommands[keyof GameCommands] },
}