(function () {
    var STORAGE_KEY = "presselAdminConfigV1";
    var KNOWN_PAGES = {
        home: true,
        grupo2: true,
        grupo5: true,
        grupo6: true,
        grupo7: true,
        importacao: true,
        whatsapp: true,
        kaimportstelegram: true
    };
    var pageDefaults = null;

    function safeParse(value) {
        try {
            var parsed = JSON.parse(value);
            if (parsed && typeof parsed === "object") {
                return parsed;
            }
        } catch (err) {
            return {};
        }
        return {};
    }

    function getAllConfig() {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? safeParse(raw) : {};
    }

    function setAllConfig(config) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }

    function normalizePath(pathname) {
        if (!pathname) {
            return "/";
        }

        var normalized = pathname.toLowerCase();
        normalized = normalized.replace(/\/+$/, "");
        return normalized || "/";
    }

    function getPageKeyFromPath(pathname) {
        var normalized = normalizePath(pathname);

        if (normalized === "/" || normalized === "/index.html") {
            return "home";
        }

        var pieces = normalized.split("/").filter(Boolean);
        if (pieces.length === 0) {
            return "home";
        }

        if (pieces.length >= 2 && pieces[1] === "index.html" && KNOWN_PAGES[pieces[0]]) {
            return pieces[0];
        }

        if (KNOWN_PAGES[pieces[0]]) {
            return pieces[0];
        }

        return "";
    }

    function sanitizeUrl(value) {
        if (!value || typeof value !== "string") {
            return "";
        }
        return value.trim();
    }

    function sanitizeText(value) {
        if (typeof value !== "string") {
            return "";
        }
        return value.trim();
    }

    function emptyConfig() {
        return {
            imageUrl: "",
            buttonUrl: "",
            titleText: "",
            descriptionText: "",
            buttonText: ""
        };
    }

    function normalizeConfig(config) {
        if (!config || typeof config !== "object") {
            return emptyConfig();
        }

        return {
            imageUrl: sanitizeUrl(config.imageUrl || ""),
            buttonUrl: sanitizeUrl(config.buttonUrl || ""),
            titleText: sanitizeText(config.titleText || ""),
            descriptionText: sanitizeText(config.descriptionText || ""),
            buttonText: sanitizeText(config.buttonText || "")
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

    function getPageConfig(pageKey) {
        if (!pageKey) {
            return emptyConfig();
        }

        var allConfig = getAllConfig();
        return normalizeConfig(allConfig[pageKey]);
    }

    function capturePageDefaults() {
        if (pageDefaults) {
            return pageDefaults;
        }

        var button = document.querySelector("a.cta-button");
        var image = document.querySelector(".icon-wrapper img");
        var title = document.querySelector(".card h1");
        var description = document.querySelector(".card p");

        pageDefaults = {
            imageUrl: image ? sanitizeUrl(image.getAttribute("src") || "") : "",
            buttonUrl: button ? sanitizeUrl(button.getAttribute("href") || "") : "",
            titleText: title ? sanitizeText(title.textContent || "") : "",
            descriptionText: description ? sanitizeText(description.textContent || "") : "",
            buttonText: button ? sanitizeText(button.textContent || "") : ""
        };

        return pageDefaults;
    }

    function applyImage(imageUrl) {
        if (!imageUrl) {
            return;
        }

        var wrapper = document.querySelector(".icon-wrapper");
        if (!wrapper) {
            return;
        }

        var image = wrapper.querySelector("img[data-admin-editable='1']") || wrapper.querySelector("img");

        if (!image) {
            wrapper.innerHTML = "";
            wrapper.style.background = "transparent";
            wrapper.style.boxShadow = "none";
            wrapper.style.padding = "0";

            image = document.createElement("img");
            image.setAttribute("data-admin-editable", "1");
            image.width = 160;
            image.height = 160;
            image.alt = "Imagem da pagina";
            image.style.objectFit = "contain";
            image.style.borderRadius = "16px";
            wrapper.appendChild(image);
        }

        image.src = imageUrl;
    }

    function applyButtonLink(buttonUrl) {
        if (!buttonUrl) {
            return;
        }

        var button = document.querySelector("a.cta-button");
        if (!button) {
            return;
        }

        button.setAttribute("href", buttonUrl);
    }

    function applyTitleText(titleText) {
        if (!titleText) {
            return;
        }

        var title = document.querySelector(".card h1");
        if (!title) {
            return;
        }

        title.textContent = titleText;
    }

    function applyDescriptionText(descriptionText) {
        if (!descriptionText) {
            return;
        }

        var description = document.querySelector(".card p");
        if (!description) {
            return;
        }

        description.textContent = descriptionText;
    }

    function applyButtonText(buttonText) {
        if (!buttonText) {
            return;
        }

        var button = document.querySelector("a.cta-button");
        if (!button) {
            return;
        }

        button.textContent = buttonText;
    }

    function mergeWithDefaults(config) {
        var defaults = capturePageDefaults();
        var next = normalizeConfig(config);

        return {
            imageUrl: next.imageUrl || defaults.imageUrl,
            buttonUrl: next.buttonUrl || defaults.buttonUrl,
            titleText: next.titleText || defaults.titleText,
            descriptionText: next.descriptionText || defaults.descriptionText,
            buttonText: next.buttonText || defaults.buttonText
        };
    }

    function applyPageFields(config) {
        var next = mergeWithDefaults(config);
        applyImage(next.imageUrl);
        applyButtonLink(next.buttonUrl);
        applyTitleText(next.titleText);
        applyDescriptionText(next.descriptionText);
        applyButtonText(next.buttonText);
    }

    function updatePageConfig(pageKey, nextConfig) {
        if (!KNOWN_PAGES[pageKey]) {
            return false;
        }

        var normalized = normalizeConfig(nextConfig);
        var allConfig = getAllConfig();

        if (!hasAnyField(normalized)) {
            delete allConfig[pageKey];
            setAllConfig(allConfig);
            return true;
        }

        allConfig[pageKey] = normalized;
        setAllConfig(allConfig);
        return true;
    }

    function clearPageConfig(pageKey) {
        if (!KNOWN_PAGES[pageKey]) {
            return false;
        }

        var allConfig = getAllConfig();
        delete allConfig[pageKey];
        setAllConfig(allConfig);
        return true;
    }

    function readJson(response) {
        return response.json().then(function (data) {
            if (!response.ok) {
                throw new Error((data && data.error) ? data.error : "Falha na configuracao.");
            }
            return data;
        });
    }

    function fetchServerPageConfig(pageKey) {
        if (!KNOWN_PAGES[pageKey]) {
            return Promise.resolve(emptyConfig());
        }

        return fetch("/api/page-config?page=" + encodeURIComponent(pageKey), {
            method: "GET",
            cache: "no-store"
        })
            .then(readJson)
            .then(function (data) {
                return normalizeConfig(data && data.config);
            });
    }

    function saveServerPageConfig(pageKey, nextConfig) {
        var normalized = normalizeConfig(nextConfig);

        return fetch("/api/page-config", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                page: pageKey,
                imageUrl: normalized.imageUrl,
                buttonUrl: normalized.buttonUrl,
                titleText: normalized.titleText,
                descriptionText: normalized.descriptionText,
                buttonText: normalized.buttonText
            })
        })
            .then(readJson)
            .then(function (data) {
                var saved = normalizeConfig(data && data.config);
                updatePageConfig(pageKey, saved);
                return saved;
            });
    }

    function clearServerPageConfig(pageKey) {
        return fetch("/api/page-config?page=" + encodeURIComponent(pageKey), {
            method: "DELETE",
            credentials: "same-origin"
        })
            .then(readJson)
            .then(function () {
                clearPageConfig(pageKey);
                return emptyConfig();
            });
    }

    function applyCurrentPageConfig() {
        var key = getPageKeyFromPath(window.location.pathname);
        if (!key) {
            return Promise.resolve();
        }

        capturePageDefaults();
        applyPageFields(getPageConfig(key));

        return fetchServerPageConfig(key)
            .then(function (serverConfig) {
                if (hasAnyField(serverConfig)) {
                    updatePageConfig(key, serverConfig);
                    applyPageFields(serverConfig);
                    return;
                }

                clearPageConfig(key);
                applyPageFields(emptyConfig());
            })
            .catch(function () {
                return null;
            });
    }

    window.PresselAdminConfig = {
        storageKey: STORAGE_KEY,
        knownPages: Object.keys(KNOWN_PAGES),
        getPageKeyFromPath: getPageKeyFromPath,
        getPageConfig: getPageConfig,
        updatePageConfig: updatePageConfig,
        clearPageConfig: clearPageConfig,
        getAllConfig: getAllConfig,
        applyCurrentPageConfig: applyCurrentPageConfig,
        fetchServerPageConfig: fetchServerPageConfig,
        saveServerPageConfig: saveServerPageConfig,
        clearServerPageConfig: clearServerPageConfig
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyCurrentPageConfig);
    } else {
        applyCurrentPageConfig();
    }
})();
