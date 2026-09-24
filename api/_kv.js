const { createClient } = require("@vercel/kv");

function getKvCredentials() {
    const url = String(
        process.env.KV_REST_API_URL ||
        process.env.UPSTASH_REDIS_REST_URL ||
        process.env.REDIS_REST_API_URL ||
        ""
    ).trim();
    const token = String(
        process.env.KV_REST_API_TOKEN ||
        process.env.UPSTASH_REDIS_REST_TOKEN ||
        process.env.REDIS_REST_API_TOKEN ||
        ""
    ).trim();

    return { url, token };
}

function isKvConfigured() {
    const creds = getKvCredentials();
    return Boolean(creds.url && creds.token);
}

function getKvClient() {
    const creds = getKvCredentials();
    if (!creds.url || !creds.token) {
        throw new Error("Banco (KV/Redis) nao configurado no projeto da Vercel.");
    }

    return createClient({
        url: creds.url,
        token: creds.token
    });
}

function publicKvError(error, fallback) {
    const message = error && error.message ? String(error.message) : "";
    if (!message) {
        return fallback;
    }

    if (/token|secret|password|authorization/i.test(message)) {
        return fallback;
    }

    return fallback + " " + message;
}

module.exports = {
    isKvConfigured,
    getKvClient,
    publicKvError
};
