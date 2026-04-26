/**
 * In-memory anti-cheat session store (one token per desktop client).
 * For production, replace with Redis + signed JWTs.
 */

const crypto = require('crypto');

/** If no heartbeat within this window, the session is considered dead. */
const HEARTBEAT_TTL_MS = 20000;

/** @type {Map<string, { lastHeartbeat: number, violation: boolean, violationReasons: string[] }>} */
const sessions = new Map();

function createSession() {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    sessions.set(token, {
        lastHeartbeat: now,
        violation: false,
        violationReasons: [],
    });
    return token;
}

/**
 * @param {string} token
 * @param {{ checksPassed?: boolean, messages?: string[] }} env
 */
function recordHeartbeat(token, env = {}) {
    const s = sessions.get(token);
    if (!s) return false;
    s.lastHeartbeat = Date.now();
    if (env.checksPassed === false) {
        s.violation = true;
        if (Array.isArray(env.messages)) {
            for (const m of env.messages) {
                if (m && !s.violationReasons.includes(m)) s.violationReasons.push(m);
            }
        }
    }
    return true;
}

/**
 * Validates token and freshness. Removes stale sessions.
 * @param {string} token
 */
function getStatus(token) {
    const s = sessions.get(token);
    if (!s) {
        return { active: false, validToken: false, reason: 'invalid_token' };
    }
    const age = Date.now() - s.lastHeartbeat;
    if (age > HEARTBEAT_TTL_MS) {
        sessions.delete(token);
        return { active: false, validToken: false, reason: 'heartbeat_timeout' };
    }
    return {
        active: true,
        validToken: true,
        violation: s.violation,
        reasons: [...s.violationReasons],
    };
}

function stopSession(token) {
    return sessions.delete(token);
}

function activeSessionCount() {
    return sessions.size;
}

/**
 * Returns the first session token that is still alive and not in violation.
 * Lab / single-machine use: browser can request this to build the exam URL.
 * (Production should use authenticated handoff instead of a public token endpoint.)
 */
function getFirstEligibleSessionToken() {
    const tokens = [...sessions.keys()];
    for (const token of tokens) {
        const st = getStatus(token);
        if (st.active && st.validToken && !st.violation) {
            return token;
        }
    }
    return null;
}

module.exports = {
    createSession,
    recordHeartbeat,
    getStatus,
    stopSession,
    activeSessionCount,
    getFirstEligibleSessionToken,
    HEARTBEAT_TTL_MS,
};
