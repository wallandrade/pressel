const crypto = require("crypto");

const SESSION_COOKIE_NAME = "pressel_admin_session";

function signValue(value, secret) {
    return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function parseCookies(rawCookieHeader) {
    if (!rawCookieHeader) {
        return {};
    }

    return rawCookieHeader.split(";").reduce((acc, item) => {
        const parts = item.split("=");
        const key = (parts.shift() || "").trim();
        const value = parts.join("=").trim();
        if (key) {
            acc[key] = value;
        }
        return acc;
    }, {});
}

function verifyToken(token, secret) {
    if (!token || typeof token !== "string") {
        return false;
    }

    const parts = token.split(".");
    if (parts.length !== 2) {
        return false;
    }

    const payloadRaw = parts[0];
    const signature = parts[1];
    const expectedSignature = signValue(payloadRaw, secret);

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
    }

    const isValidSignature = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    if (!isValidSignature) {
        return false;
    }

    try {
        const payloadText = Buffer.from(payloadRaw, "base64url").toString("utf8");
        const payload = JSON.parse(payloadText);
        if (!payload || typeof payload.exp !== "number") {
            return false;
        }
        return payload.exp > Date.now();
    } catch (error) {
        return false;
    }
}

function ensureAdminSession(req, res) {
    const adminSecret = String(process.env.ADMIN_SESSION_SECRET || "").trim();
    if (!adminSecret) {
        res.status(500).json({ ok: false, error: "Segredo de sessao nao configurado." });
        return false;
    }

    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies[SESSION_COOKIE_NAME] || "";

    if (!verifyToken(token, adminSecret)) {
        res.status(401).json({ ok: false, error: "Nao autorizado." });
        return false;
    }

    return true;
}

module.exports = {
    ensureAdminSession
};
