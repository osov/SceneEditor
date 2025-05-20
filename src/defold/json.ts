declare global {
    export const json: ReturnType<typeof json_module>
}

export function json_module() {
    function encode(data: any, _: any) {
        return JSON.stringify(data)
    }

    function decode(s: string) {
        return JSON.parse(s)
    }

    return { encode, decode };
}