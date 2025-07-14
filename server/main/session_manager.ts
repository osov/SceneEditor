import { ServerData, TDictionary } from "../../src/modules_editor/modules_editor_const";

export interface SessionData extends ServerData {
    id: string;
    lastActivity: number;
}

export interface ISessionManager {
    createSession(id: string): SessionData;
    getSession(id: string): SessionData | undefined;
    updateSession(id: string, updates: Partial<SessionData>): void;
    removeSession(id: string): void;
    getAllSessions(): SessionData[];
    cleanupInactiveSessions(timeoutMs: number): void;
}

export function SessionManager(): ISessionManager {
    const sessions: TDictionary<SessionData> = {};

    function createSession(id: string): SessionData {
        const session: SessionData = {
            id,
            project: undefined,
            dir: "",
            scene: {},
            lastActivity: Date.now()
        };
        sessions[id] = session;
        return session;
    }

    function getSession(id: string): SessionData | undefined {
        const session = sessions[id];
        if (session) {
            session.lastActivity = Date.now();
        }
        return session;
    }

    function updateSession(id: string, updates: Partial<SessionData>): void {
        const session = sessions[id];
        if (session) {
            Object.assign(session, updates);
            session.lastActivity = Date.now();
            log(`Обновлена сессия: ${id}`);
        } else {
            log(`Попытка обновить несуществующую сессию: ${id}`);
        }
    }

    function removeSession(id: string): void {
        if (sessions[id]) {
            delete sessions[id];
            log(`Удалена сессия: ${id}`);
        } else {
            log(`Попытка удалить несуществующую сессию: ${id}`);
        }
    }

    function getAllSessions(): SessionData[] {
        return Object.values(sessions);
    }

    function cleanupInactiveSessions(timeoutMs: number): void {
        const now = Date.now();
        const sessionsToRemove: string[] = [];

        for (const id in sessions) {
            const session = sessions[id];
            if (now - session.lastActivity > timeoutMs) {
                sessionsToRemove.push(id);
            }
        }

        for (const id of sessionsToRemove) {
            delete sessions[id];
        }
    }

    return {
        createSession,
        getSession,
        updateSession,
        removeSession,
        getAllSessions,
        cleanupInactiveSessions
    };
} 