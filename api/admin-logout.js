const SESSION_COOKIE_NAME = "pressel_admin_session";

module.exports = (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Metodo nao permitido." });
        return;
    }

    const cookie = [
        SESSION_COOKIE_NAME + "=",
        "HttpOnly",
        "Secure",
        "SameSite=Strict",
        "Path=/",
        "Max-Age=0"
    ].join("; ");

    res.setHeader("Set-Cookie", cookie);
    res.status(200).json({ ok: true });
};
