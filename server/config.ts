/**
 * Конфигурация сервера
 *
 * Порты можно переопределить через переменные окружения:
 * PORT - HTTP порт (по умолчанию 7007)
 * WS_PORT - WebSocket порт (по умолчанию 7001)
 */

export const server_port = parseInt(process.env.PORT ?? '7007', 10);
export const ws_server_port = parseInt(process.env.WS_PORT ?? '7001', 10);
export const working_folder_path = '../';
export const send_fs_events_interval = 1;
export const use_queues_when_write_file = true;
