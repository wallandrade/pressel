const { kv } = require("@vercel/kv");
const { ensureAdminSession } = require("./_admin-auth");

const PAGE_CONFIG_KEY = "presselAdminPageConfigDbV1";
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
const MAX_IMAGE_URL_LENGTH = 2_800_000;

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
    if (!url) {
        return "";
    }

    if (isHttpUrl(url) || url.startsWith("/") || url.startsWith("data:image/")) {
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

function normalizeAllConfig(value) {
    if (!value || typeof value !== "object") {
        return {};
    }

    return Object.keys(KNOWN_PAGES).reduce((acc, pageKey) => {
        const next = normalizePageConfig(value[pageKey]);
        if (hasAnyField(next)) {
            acc[pageKey] = next;
        }
        return acc;
    }, {});
}

function kvConfigured() {
    return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function getAllConfig() {
    const raw = await kv.get(PAGE_CONFIG_KEY);
    return normalizeAllConfig(raw);
}

async function saveAllConfig(config) {
    await kv.set(PAGE_CONFIG_KEY, normalizeAllConfig(config));
}

function sendNoStore(res) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
}

module.exports = async (req, res) => {
    sendNoStore(res);

    if (req.method === "GET") {
        if (!kvConfigured()) {
            res.status(200).json({ ok: true, pages: {}, config: emptyPageConfig() });
            return;
        }

        try {
            const pages = await getAllConfig();
            const pageKey = sanitizeText((req.query && req.query.page) || "", 80);

            if (pageKey) {
                if (!KNOWN_PAGES[pageKey]) {
                    res.status(400).json({ ok: false, error: "Pagina invalida." });
                    return;
                }

                res.status(200).json({
                    ok: true,
                    page: pageKey,
                    config: pages[pageKey] || emptyPageConfig()
                });
                return;
            }

            res.status(200).json({ ok: true, pages });
            return;
        } catch (error) {
            res.status(500).json({ ok: false, error: "Erro ao ler configuracao das paginas." });
            return;
        }
    }

    if (!ensureAdminSession(req, res)) {
        return;
    }

    if (!kvConfigured()) {
        res.status(500).json({ ok: false, error: "Banco de configuracao (Vercel KV) nao configurado." });
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

            const nextPage = normalizePageConfig(body);
            const allConfig = await getAllConfig();

            if (!hasAnyField(nextPage)) {
                delete allConfig[pageKey];
            } else {
                allConfig[pageKey] = nextPage;
            }

            await saveAllConfig(allConfig);
            res.status(200).json({
                ok: true,
                page: pageKey,
                config: allConfig[pageKey] || emptyPageConfig()
            });
            return;
        }

        if (req.method === "DELETE") {
            const pageKey = sanitizeText((req.query && req.query.page) || "", 80);

            if (!KNOWN_PAGES[pageKey]) {
                res.status(400).json({ ok: false, error: "Pagina invalida." });
                return;
            }

            const allConfig = await getAllConfig();
            delete allConfig[pageKey];
            await saveAllConfig(allConfig);
            res.status(200).json({ ok: true, page: pageKey, config: emptyPageConfig() });
            return;
        }

        res.status(405).json({ ok: false, error: "Metodo nao permitido." });
    } catch (error) {
        res.status(500).json({ ok: false, error: "Erro ao salvar configuracao das paginas." });
    }
};
