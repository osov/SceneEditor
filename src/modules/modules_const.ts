export type VoidCallback = () => void;
export type UserMessages = Record<string, unknown>;
export type SystemMessages = _SystemMessages;
export type Messages = UserMessages & SystemMessages;
export type MessageId = keyof Messages;

export interface VoidMessage { }

export type _SystemMessages = {
    ON_WS_CONNECTED: VoidMessage,
    ON_WS_DISCONNECTED: VoidMessage,
    ON_WS_DATA: { data: string | Uint8Array },
    TRY_WS_CONNECT: VoidMessage,
    TRY_WS_DISCONNECT: VoidMessage,
};

export type NetMessages = {
    // CS_GAME_CMD: { id: keyof GameCommands, message?: GameCommands[keyof GameCommands] },
}