import { sleep } from "bun";
import { TDictionary } from "../../src/modules_editor/modules_editor_const";


type Handler = (key: string, data: string) => Promise<any>;


export function PromiseChains(_hander: Handler) {
    let handler: Handler = _hander;
    const promises: TDictionary<ReturnType<typeof _hander>> = {};

    function set_handler(_hander: Handler) {
        handler = _hander;
    }

    async function push(key: string, data: any) {
        const promise = promises[key];
        if (promise == undefined) {
            const new_promise = _hander(key, data);
            promises[key] = new_promise;
        }
        else {
            promises[key] = promise.then(function(result) {
                return _hander(key, data)
            });
        }
    }
    return {set_handler, push}
}

export async function chains_test() {
    const time_interv = 1000;
    const handle_pause = 1000;
    let now = Date.now();

    function test_handler(key: string, data: string) {
        log(key, data, "time:", Date.now() - now);
        const promise = sleep(handle_pause);
        return promise;
    }

    const chains = PromiseChains(test_handler);
    setTimeout(() => {chains.push("key1", "1")}, 0);
    setTimeout(() => {chains.push("key1", "2")}, 0.5 * time_interv); // should wait full time_interv;
    setTimeout(() => {chains.push("key2", "1")}, 0.2 * time_interv)
    setTimeout(() => {chains.push("key2", "2")}, 2.2 * time_interv)
}

