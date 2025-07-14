import { server_port, ws_server_port } from "./config";
import { Server } from "./main/server";
import { register_log } from "./modules/Log";

register_log();
await Server(server_port, ws_server_port);
