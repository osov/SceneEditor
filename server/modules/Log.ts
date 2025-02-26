/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { appendFileSync } from "node:fs";

export function get_hms() {
    var now = new Date();
    var hh: number | string = now.getHours();
    var mm: number | string = now.getMinutes();
    var ss: number | string = now.getSeconds();
    if (hh < 10)
        hh = '0' + hh;
    if (mm < 10)
        mm = '0' + mm;
    if (ss < 10)
        ss = '0' + ss;
    return hh + ":" + mm + ":" + ss;
}

export function get_dmy() {
    var now = new Date();
    var dd: number | string = now.getDate();
    var mo: number | string = now.getMonth() + 1;
    var yy = now.getFullYear().toString();
    if (mo < 10)
        mo = '0' + mo;
    if (dd < 10)
        dd = '0' + dd;
    return dd + "." + mo + "." + yy;
}

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
    (global as any).Log = LogModule();
    (global as any).log = Log.log;
}


type LogLevels = 'notice' | 'log' | 'info' | 'warn' | 'error';
const log_priority = ['notice', 'log', 'info', 'warn', 'error'];




function LogModule(_prefix = '', _log_level: LogLevels = 'notice') {

    function get_with_prefix(prefix: string, log_level: LogLevels = 'notice') {
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

        if (level == 'error') {
            console.error(str);
            appendFileSync("./log_" + get_dmy() + ".txt", str + '\n', "utf8");
        }
        else
            console.log(str);
    }

    function notice(..._args: any) {
        send('notice', _args);
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




    return { get_with_prefix, notice, log, warn, error };
}

