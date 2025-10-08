import path from "path";


export function do_response(data: any, stringify = true, status?: number, request?: Request, cached = false) {
    let origin = request?.headers.get("Origin");
    const headers: Record<string, string> = {
        "Access-Control-Allow-Headers": "Content-Type, X-Session-ID, Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
         "Cache-Control": "public, max-age=" + (cached ? 31536000 : 0)
    };
    if (origin) headers["Access-Control-Allow-Origin"] = origin;
    const options: ResponseInit = { headers };
    if (status) options.status = status;
    const body = stringify ? JSON.stringify(data) : data;
    return new Response(body, options);
}

export function json_parsable(str: string) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export function now() {
    return Date.now();
}

export function get_incr_copy_name(name: string) {
    var match = name.match(/^(.+-copy-)(\d+)$/);
    return match
        ? match[1] + (+match[2] + 1)
        : name + '-copy-1';
}

export function incr_file_name(name: string) {
    const ext = path.extname(name);
    const dirname = path.dirname(name);
    const basename = path.basename(name, ext);
    const new_name = get_incr_copy_name(basename);
    return path.join(dirname, new_name + ext);
}
