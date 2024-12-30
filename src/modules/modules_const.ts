export type VoidCallback = () => void;
export type Messages = UserMessages & SystemMessages;
export type MessageId = keyof Messages;

export interface VoidMessage { }

export type _SystemMessages = {
    SYS_ENGINE_READY:VoidMessage
    SYS_ON_RESIZED: { width: number, height: number },
};


export const _ID_MESSAGES = {
};