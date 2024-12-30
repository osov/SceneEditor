import { MessageId, Messages } from "./modules_const";

/*
    шина сообщений
*/

declare global {
    const EventBus: ReturnType<typeof EventBusModule>;
}


export function register_event_bus() {
    (window as any).EventBus = EventBusModule();
}

type FncOnCallback<T> = (data: T) => void;

interface ListenerInfo {
    callback: FncOnCallback<any>;
    once: boolean;
}

function EventBusModule() {
    const bus_log = Log.get_with_prefix('Bus');
    const listeners: { [id_message: string]: ListenerInfo[] } = {};


    function _on<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>, once: boolean) {
        //bus_log.log('on', id_message, is_message_mode);
        if (!listeners[id_message])
            listeners[id_message] = [];
        listeners[id_message].push({ callback, once, });
    }


    function on<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>) {
        _on(id_message, callback, false);
    }

    function once<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>) {
        _on(id_message, callback, true);
    }

    function off<T extends MessageId>(id_message: T, callback: FncOnCallback<Messages[T]>) {
        if (!listeners[id_message]) {
            bus_log.warn(`Ни один слушатель для события не зарегистрирован: ${id_message}, off`);
            return;
        }
        const list = listeners[id_message];
        for (let i = list.length - 1; i >= 0; i--) {
            const l = list[i];
            if (l.callback == callback) {
                list.splice(i, 1);
                return;
            }
        }
    }


    function trigger<T extends MessageId>(id_message: T, message_data?: Messages[T], show_warning = true, is_copy_data = false) {
        if (!listeners[id_message]) {
            if (show_warning)
                bus_log.warn(`Ни один слушатель для события не зарегистрирован: ${id_message}, trigger/send`);
            return;
        }
        const data = is_copy_data ? JSON.parse(JSON.stringify(message_data)) : message_data; // чтобы во всех случаях была копия(редко когда нужно иначе)
        // важный момент для случая once, что сначала происходит тригер, а затем удаление события, т.е. вешать событие внутри колбека нужно аккуратно учитывая это
        const list = listeners[id_message];
        const del_ids = [];
        for (let i = 0; i < list.length; i++) {
            const l = list[i];
            l.callback(data);
            if (l.once)
                del_ids.push(i);
        }

        for (let i = del_ids.length - 1; i >= 0; i--) {
            const id = del_ids[i];
            list.splice(id, 1);
        }
    }

    function send<T extends MessageId>(id_message: T, message_data?: Messages[T]) {
        return trigger(id_message, message_data);
    }



    return { on, once, off, send, trigger };
}