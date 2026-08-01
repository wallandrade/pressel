const { kv } = require("@vercel/kv");
const { ensureAdminSession } = require("./_admin-auth");

const IMAGE_LIBRARY_KEY = "presselAdminImageLibraryDbV1";
const MAX_ITEMS = 30;
const MAX_BASE64_LENGTH = 2_800_000;

function normalizeLibrary(list) {
    if (!Array.isArray(list)) {
        return [];
    }

    return list
        .filter((item) => item && typeof item.id === "string" && typeof item.src === "string")
        .slice(0, MAX_ITEMS);
}

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

async function getLibrary() {
    const list = await kv.get(IMAGE_LIBRARY_KEY);
    return normalizeLibrary(list);
}

async function saveLibrary(items) {
    await kv.set(IMAGE_LIBRARY_KEY, normalizeLibrary(items));
}

function mergeWithDedupBySrc(newSrc, current) {
    const filtered = current.filter((item) => item.src !== newSrc);
    return [
        {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            src: newSrc
        },
        ...filtered
    ].slice(0, MAX_ITEMS);
}

module.exports = async (req, res) => {
    if (!ensureAdminSession(req, res)) {
        return;
    }

    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
        res.status(500).json({ ok: false, error: "Banco de imagens (Vercel KV) nao configurado." });
        return;
    }

    try {
        if (req.method === "GET") {
            const items = await getLibrary();
            res.status(200).json({ ok: true, items });
            return;
        }

        if (req.method === "POST") {
            const body = await parseJsonBody(req);
            const src = String(body.src || "").trim();

            if (!src) {
                res.status(400).json({ ok: false, error: "Imagem invalida." });
                return;
            }

            if (src.length > MAX_BASE64_LENGTH) {
                res.status(400).json({ ok: false, error: "Imagem muito grande para salvar." });
                return;
            }

            const current = await getLibrary();
            const next = mergeWithDedupBySrc(src, current);

            await saveLibrary(next);
            res.status(200).json({ ok: true, items: next });
            return;
        }

        if (req.method === "DELETE") {
            const id = String((req.query && req.query.id) || "").trim();
            if (!id) {
                res.status(400).json({ ok: false, error: "ID da imagem nao informado." });
                return;
            }

            const current = await getLibrary();
            const next = current.filter((item) => item.id !== id);
            await saveLibrary(next);
            res.status(200).json({ ok: true, items: next });
            return;
        }

        res.status(405).json({ ok: false, error: "Metodo nao permitido." });
    } catch (error) {
        res.status(500).json({ ok: false, error: "Erro ao processar biblioteca de imagens." });
    }
};
