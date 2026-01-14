/**
 * Функции запуска серверов для CLI
 */

import { resolve, dirname } from 'path';

/** Таймаут ожидания сервера (мс) */
const SERVER_WAIT_TIMEOUT = 30000;

/** Интервал проверки доступности (мс) */
const POLL_INTERVAL = 500;

/**
 * Ожидание доступности сервера
 */
export async function wait_for_server(url: string, timeout = SERVER_WAIT_TIMEOUT): Promise<void> {
    const start_time = Date.now();

    while (Date.now() - start_time < timeout) {
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                signal: AbortSignal.timeout(1000),
            });
            if (response.ok || response.status === 404) {
                // Сервер доступен
                return;
            }
        } catch {
            // Сервер ещё не готов, ждём
        }
        await Bun.sleep(POLL_INTERVAL);
    }

    throw new Error(`Таймаут ожидания сервера: ${url}`);
}

/**
 * Запуск бэкенд сервера
 */
export async function start_backend_server(
    port: string,
    ws_port: string
): Promise<ReturnType<typeof Bun.spawn>> {
    const cli_dir = dirname(import.meta.path);
    const server_path = resolve(cli_dir, '../server/main.ts');

    const proc = Bun.spawn(['bun', server_path], {
        env: {
            ...process.env,
            PORT: port,
            WS_PORT: ws_port,
        },
        stdout: 'inherit',
        stderr: 'inherit',
        cwd: resolve(cli_dir, '..'),
    });

    // Ожидаем готовности HTTP сервера
    try {
        await wait_for_server(`http://localhost:${port}/test`);
    } catch (error) {
        proc.kill();
        throw new Error(`Не удалось запустить бэкенд сервер: ${error}`);
    }

    return proc;
}

/**
 * Запуск Vite dev server
 */
export async function start_vite_server(
    project_path: string,
    port: string
): Promise<ReturnType<typeof Bun.spawn>> {
    const cli_dir = dirname(import.meta.path);
    const root_dir = resolve(cli_dir, '..');

    // Нормализуем путь к проекту
    const normalized_project_path = project_path.startsWith('..')
        ? project_path
        : `../${project_path}`;

    const proc = Bun.spawn(['bunx', '--bun', 'vite', '--port', port], {
        env: {
            ...process.env,
            PROJECT_PATH: normalized_project_path,
        },
        stdout: 'inherit',
        stderr: 'inherit',
        cwd: root_dir,
    });

    // Ожидаем готовности Vite
    try {
        await wait_for_server(`http://localhost:${port}`);
    } catch (error) {
        proc.kill();
        throw new Error(`Не удалось запустить Vite: ${error}`);
    }

    return proc;
}
