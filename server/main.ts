import { server_port } from "./config";
import { Server } from "./main/server";
import { register_log } from "./modules/Log";



register_log();

const server = Server(server_port);
server.start();
