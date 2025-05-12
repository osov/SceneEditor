import { server_port, ws_server_port } from "./config";
import { register_server_global_data, Server } from "./main/server";
import { register_log } from "./modules/Log";


register_log();
register_server_global_data();
const server = await Server(server_port, ws_server_port);
