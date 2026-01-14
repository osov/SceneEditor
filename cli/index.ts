/**
 * CLI для запуска SceneEditor
 *
 * Использование:
 * bun run dev --project=../MyProject
 * bun run dev -p ../MyProject --port=8080
 */

import { parseArgs } from 'util';
import { start_backend_server, start_vite_server, wait_for_server } from './servers';

/** Конфигурация по умолчанию */
const DEFAULT_CONFIG = {
    port: '7007',
    ws_port: '7001',
    vite_port: '5173',
    open: true,
} as const;

/** Парсинг аргументов командной строки */
function parse_cli_args() {
    const { values } = parseArgs({
        args: Bun.argv.slice(2),
        options: {
            project: { type: 'string', short: 'p' },
            port: { type: 'string', default: DEFAULT_CONFIG.port },
            'ws-port': { type: 'string', default: DEFAULT_CONFIG.ws_port },
            'vite-port': { type: 'string', default: DEFAULT_CONFIG.vite_port },
            open: { type: 'boolean', short: 'o', default: DEFAULT_CONFIG.open },
            'no-open': { type: 'boolean', default: false },
            'no-server': { type: 'boolean', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
        allowPositionals: true,
    });

    return values;
}

/** Вывод справки */
function print_help() {
    console.log(`
SceneEditor CLI

Использование:
  bun run dev [опции]

Опции:
  -p, --project <путь>    Путь к проекту (по умолчанию: текущая директория)
  --port <порт>           HTTP порт бэкенда (по умолчанию: ${DEFAULT_CONFIG.port})
  --ws-port <порт>        WebSocket порт (по умолчанию: ${DEFAULT_CONFIG.ws_port})
  --vite-port <порт>      Vite dev server порт (по умолчанию: ${DEFAULT_CONFIG.vite_port})
  -o, --open              Открыть браузер автоматически (по умолчанию: да)
  --no-open               Не открывать браузер
  --no-server             Не запускать бэкенд сервер
  -h, --help              Показать эту справку

Примеры:
  bun run dev --project=../MyProject
  bun run dev -p ../MyProject --port=8080
  bun run dev --no-server  # Только Vite, без бэкенда
`);
}

/** Открыть URL в браузере */
async function open_browser(url: string) {
    // Определяем команду в зависимости от ОС
    const is_windows = process.platform === 'win32';
    const is_mac = process.platform === 'darwin';

    if (is_windows) {
        Bun.spawn(['cmd', '/c', 'start', url], { stdout: 'ignore', stderr: 'ignore' });
    } else if (is_mac) {
        Bun.spawn(['open', url], { stdout: 'ignore', stderr: 'ignore' });
    } else {
        // Linux
        Bun.spawn(['xdg-open', url], { stdout: 'ignore', stderr: 'ignore' });
    }
}

/** Главная функция */
async function main() {
    const args = parse_cli_args();

    // Справка
    if (args.help) {
        print_help();
        process.exit(0);
    }

    // Определяем путь к проекту
    const project_path = args.project ?? 'test-project';
    const should_open = args.open && !args['no-open'];

    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║         SceneEditor CLI v1.0           ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
    console.log(`Проект: ${project_path}`);
    console.log(`Порты: HTTP=${args.port}, WS=${args['ws-port']}, Vite=${args['vite-port']}`);
    console.log('');

    // Массив запущенных процессов для graceful shutdown
    const processes: { proc: ReturnType<typeof Bun.spawn>; name: string }[] = [];

    // Обработка завершения
    const cleanup = () => {
        console.log('\n\nЗавершение работы...');
        for (const { proc, name } of processes) {
            console.log(`  Остановка ${name}...`);
            proc.kill();
        }
        process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    try {
        // 1. Запуск backend сервера (если не отключён)
        if (!args['no-server']) {
            console.log('Запуск бэкенд сервера...');
            const backend = await start_backend_server(
                args.port ?? DEFAULT_CONFIG.port,
                args['ws-port'] ?? DEFAULT_CONFIG.ws_port
            );
            processes.push({ proc: backend, name: 'Backend Server' });
            console.log(`  ✓ HTTP сервер на http://localhost:${args.port}`);
            console.log(`  ✓ WebSocket на ws://localhost:${args['ws-port']}`);
        }

        // 2. Запуск Vite dev server
        console.log('Запуск Vite dev server...');
        const vite = await start_vite_server(
            project_path,
            args['vite-port'] ?? DEFAULT_CONFIG.vite_port
        );
        processes.push({ proc: vite, name: 'Vite Dev Server' });
        console.log(`  ✓ Vite на http://localhost:${args['vite-port']}`);

        // 3. Открытие браузера
        const editor_url = `http://localhost:${args['vite-port']}/?project=${project_path}`;

        console.log('');
        console.log('════════════════════════════════════════');
        console.log(`Редактор доступен: ${editor_url}`);
        console.log('════════════════════════════════════════');
        console.log('');
        console.log('Нажмите Ctrl+C для завершения');
        console.log('');

        if (should_open) {
            await open_browser(editor_url);
        }

        // Ожидаем завершения процессов
        await Promise.race(processes.map(({ proc }) => proc.exited));

    } catch (error) {
        console.error('Ошибка запуска:', error);
        cleanup();
    }
}

// Запуск
main().catch(console.error);
