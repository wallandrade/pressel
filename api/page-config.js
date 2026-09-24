const { ensureAdminSession } = require("./_admin-auth");
const { isKvConfigured, getKvClient, publicKvError } = require("./_kv");

const PAGE_CONFIG_PREFIX = "presselPageConfigV1:";
const KNOWN_PAGES = {
    home: true,
    grupo2: true,
    grupo5: true,
    grupo6: true,
    grupo7: true,
    importacao: true,
    whatsapp: true,
    kaimportstelegram: true
};
const MAX_TEXT_LENGTH = 2000;
const MAX_IMAGE_URL_LENGTH = 2000;

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        if (!req.body) {
            resolve({});
            return;
        }

        if (typeof req.body === "object") {
            resolve(req.body);
            return;
        }

        try {
            resolve(JSON.parse(req.body));
        } catch (error) {
            reject(new Error("JSON invalido."));
        }
    });
}

function sanitizeText(value, maxLength) {
    if (typeof value !== "string") {
        return "";
    }
    return value.trim().slice(0, maxLength);
}

function isHttpUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (error) {
        return false;
    }
}

function sanitizeButtonUrl(value) {
    const url = sanitizeText(value, MAX_TEXT_LENGTH);
    if (!url) {
        return "";
    }
    return isHttpUrl(url) ? url : "";
}

function sanitizeImageUrl(value) {
    const url = sanitizeText(value, MAX_IMAGE_URL_LENGTH);
    if (!url || url.startsWith("data:")) {
        return "";
    }

    if (isHttpUrl(url) || url.startsWith("/")) {
        return url;
    }

    return "";
}

function emptyPageConfig() {
    return {
        imageUrl: "",
        buttonUrl: "",
        titleText: "",
        descriptionText: "",
        buttonText: ""
    };
}

function normalizePageConfig(value) {
    if (!value || typeof value !== "object") {
        return emptyPageConfig();
    }

    return {
        imageUrl: sanitizeImageUrl(value.imageUrl || ""),
        buttonUrl: sanitizeButtonUrl(value.buttonUrl || ""),
        titleText: sanitizeText(value.titleText || "", 200),
        descriptionText: sanitizeText(value.descriptionText || "", MAX_TEXT_LENGTH),
        buttonText: sanitizeText(value.buttonText || "", 120)
    };
}

function hasAnyField(config) {
    return Boolean(
        config.imageUrl ||
        config.buttonUrl ||
        config.titleText ||
        config.descriptionText ||
        config.buttonText
    );
}

function pageKeyName(pageKey) {
    return PAGE_CONFIG_PREFIX + pageKey;
}

async function getPageConfig(pageKey) {
    const kv = getKvClient();
    const raw = await kv.get(pageKeyName(pageKey));
    return normalizePageConfig(raw);
}

async function savePageConfig(pageKey, config) {
    const kv = getKvClient();
    const next = normalizePageConfig(config);

    if (!hasAnyField(next)) {
        await kv.del(pageKeyName(pageKey));
        return emptyPageConfig();
    }

    await kv.set(pageKeyName(pageKey), next);
    return next;
}

async function deletePageConfig(pageKey) {
    const kv = getKvClient();
    await kv.del(pageKeyName(pageKey));
    return emptyPageConfig();
}

function sendNoStore(res) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
}

module.exports = async (req, res) => {
    sendNoStore(res);

    if (req.method === "GET") {
        const pageKey = sanitizeText((req.query && req.query.page) || "", 80);

        if (pageKey && !KNOWN_PAGES[pageKey]) {
            res.status(400).json({ ok: false, error: "Pagina invalida." });
            return;
        }

        if (!isKvConfigured()) {
            res.status(200).json({
                ok: true,
                page: pageKey || "",
                config: emptyPageConfig(),
                pages: {}
            });
            return;
        }

        try {
            if (pageKey) {
                const config = await getPageConfig(pageKey);
                res.status(200).json({
                    ok: true,
                    page: pageKey,
                    config
                });
                return;
            }

            res.status(200).json({ ok: true, pages: {} });
            return;
        } catch (error) {
            res.status(200).json({
                ok: true,
                page: pageKey || "",
                config: emptyPageConfig(),
                pages: {},
                warning: publicKvError(error, "Nao foi possivel ler o banco.")
            });
            return;
        }
    }

    if (!ensureAdminSession(req, res)) {
        return;
    }

    if (!isKvConfigured()) {
        res.status(500).json({
            ok: false,
            error: "Banco (KV/Redis) nao configurado. Conecte o Redis/KV no projeto da Vercel."
        });
        return;
    }

    try {
        if (req.method === "POST") {
            const body = await parseJsonBody(req);
            const pageKey = sanitizeText(body.page || "", 80);

            if (!KNOWN_PAGES[pageKey]) {
                res.status(400).json({ ok: false, error: "Pagina invalida." });
                return;
            }

            const config = await savePageConfig(pageKey, body);
            res.status(200).json({
                ok: true,
                page: pageKey,
                config
            });
            return;
        }

        if (req.method === "DELETE") {
            const pageKey = sanitizeText((req.query && req.query.page) || "", 80);

            if (!KNOWN_PAGES[pageKey]) {
                res.status(400).json({ ok: false, error: "Pagina invalida." });
                return;
            }

            const config = await deletePageConfig(pageKey);
            res.status(200).json({ ok: true, page: pageKey, config });
            return;
        }

        res.status(405).json({ ok: false, error: "Metodo nao permitido." });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: publicKvError(error, "Erro ao salvar o link no banco.")
        });
    }
};
