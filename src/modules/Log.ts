import { get_hms } from "./utils";


/*
    Модуль для логирования как в логи редактора, так и в консоль браузера если это хтмл5
    доступен глобальный метод log либо
    экземпляр Log с методами и уровнями лога, типа Log.warn(...), если вызов идет Log.error то показывает также стек
*/

declare global {
    const Log: ReturnType<typeof LogModule>;
    const log: (..._args: any) => void;
}

export function register_log() {
    (window as any).Log = LogModule();
    (window as any).log = Log.log;
}


type LogLevels = 'log' | 'info' | 'warn' | 'error';
const log_priority = ['log', 'info', 'warn', 'error'];


function LogModule(_prefix = '', _log_level: LogLevels = 'log') {

    function get_with_prefix(prefix: string, log_level: LogLevels = 'log') {
        return LogModule(prefix, log_level);
    }

    function send(level: LogLevels, _args: any) {
        let str = '';
        for (const k in _args) {
            const a = _args[k];
            if (typeof a == 'object') {
                str += JSON.stringify(a) + ', ';
            }
            else
                str += a + ', ';
        }
        if (str != '')
            str = str.substr(0, str.length - 2);

        show(_prefix, level, _log_level, str);
    }

    function show(prefix = '', level: LogLevels, log_level: LogLevels, text: string) {
        const is_logging = log_priority.indexOf(level) >= log_priority.indexOf(log_level);
        if (!is_logging)
            return;
        const time = get_hms();
        let str = '[' + time + '-' + level + (prefix == '' ? '' : ' _' + prefix + '_ ') + '] ' + text;
        console[level](str);
    }



    function log(..._args: any) {
        send('log', _args);
    }

    function warn(..._args: any) {
        send('warn', _args);
    }

    function error(..._args: any) {
        send('error', _args);
    }




    return { get_with_prefix, log, warn, error };
}

