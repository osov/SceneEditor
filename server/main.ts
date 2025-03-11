import { send_fs_events_interval, server_port, ws_server_port } from "./config";
import { Server } from "./main/server";
import { register_log } from "./modules/Log";



register_log();

const server = await Server(server_port, ws_server_port, send_fs_events_interval);
