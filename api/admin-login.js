const crypto = require("crypto");

const SESSION_COOKIE_NAME = "pressel_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function normalizeCredential(value) {
    return String(value || "").trim();
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
            reject(new Error("Corpo de requisicao invalido."));
        }
    });
}

function signValue(value, secret) {
    return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function issueToken(secret) {
    const payload = {
        exp: Date.now() + SESSION_DURATION_SECONDS * 1000,
        nonce: crypto.randomBytes(16).toString("hex")
    };

    const payloadRaw = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = signValue(payloadRaw, secret);
    return payloadRaw + "." + signature;
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Metodo nao permitido." });
        return;
    }

    const adminUser = normalizeCredential(process.env.ADMIN_USERNAME);
    const adminPass = normalizeCredential(process.env.ADMIN_PASSWORD);
    const adminSecret = normalizeCredential(process.env.ADMIN_SESSION_SECRET);

    if (!adminUser || !adminPass || !adminSecret) {
        res.status(500).json({ ok: false, error: "Credenciais administrativas nao configuradas no servidor." });
        return;
    }

    try {
        const body = await parseJsonBody(req);
        const username = normalizeCredential(body.username);
        const password = normalizeCredential(body.password);

        if (username !== adminUser || password !== adminPass) {
            res.status(401).json({ ok: false, error: "Usuario ou senha invalidos." });
            return;
        }

        const token = issueToken(adminSecret);
        const cookie = [
            SESSION_COOKIE_NAME + "=" + token,
            "HttpOnly",
            "Secure",
            "SameSite=Strict",
            "Path=/",
            "Max-Age=" + SESSION_DURATION_SECONDS
        ].join("; ");

        res.setHeader("Set-Cookie", cookie);
        res.status(200).json({ ok: true });
    } catch (error) {
        res.status(400).json({ ok: false, error: error.message || "Erro ao processar requisicao." });
    }
};
