(function () {
    var STORAGE_KEY = "presselAdminConfigV1";
    var MIGRATION_KEY = "presselAdminConfigMigrationId";
    var GRUPO5_BUTTON_URL = "https://chat.whatsapp.com/LlvoKvrtjz5AiELj2UO0h5?s=cl&p=i&mlu=4";
    var CURRENT_MIGRATION_ID = "grupo5-whatsapp-20260831";
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

    function getPageConfig(pageKey) {
        if (!pageKey) {
            return {};
        }

        var allConfig = getAllConfig();
        var config = allConfig[pageKey];

        if (!config || typeof config !== "object") {
            return {};
        }

        return {
            imageUrl: sanitizeUrl(config.imageUrl || ""),
            buttonUrl: sanitizeUrl(config.buttonUrl || ""),
            titleText: sanitizeText(config.titleText || ""),
            descriptionText: sanitizeText(config.descriptionText || ""),
            buttonText: sanitizeText(config.buttonText || "")
        };
    }

    function applyImage(imageUrl) {
        if (!imageUrl) {
            return;
        }

        var wrapper = document.querySelector(".icon-wrapper");
        if (!wrapper) {
            return;
        }

        var image = wrapper.querySelector("img[data-admin-editable='1']");

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

    function migrateStoredConfig() {
        try {
            if (localStorage.getItem(MIGRATION_KEY) === CURRENT_MIGRATION_ID) {
                return;
            }

            var allConfig = getAllConfig();
            if (allConfig.grupo5 && typeof allConfig.grupo5 === "object" && allConfig.grupo5.buttonUrl) {
                allConfig.grupo5.buttonUrl = GRUPO5_BUTTON_URL;
                setAllConfig(allConfig);
            }

            localStorage.setItem(MIGRATION_KEY, CURRENT_MIGRATION_ID);
        } catch (err) {
            return;
        }
    }

    function applyCurrentPageConfig() {
        migrateStoredConfig();

        var key = getPageKeyFromPath(window.location.pathname);
        if (!key) {
            return;
        }

        var config = getPageConfig(key);
        applyImage(config.imageUrl);
        applyButtonLink(config.buttonUrl);
        applyTitleText(config.titleText);
        applyDescriptionText(config.descriptionText);
        applyButtonText(config.buttonText);
    }

    function updatePageConfig(pageKey, nextConfig) {
        if (!KNOWN_PAGES[pageKey]) {
            return false;
        }

        var imageUrl = sanitizeUrl(nextConfig.imageUrl || "");
        var buttonUrl = sanitizeUrl(nextConfig.buttonUrl || "");
        var titleText = sanitizeText(nextConfig.titleText || "");
        var descriptionText = sanitizeText(nextConfig.descriptionText || "");
        var buttonText = sanitizeText(nextConfig.buttonText || "");
        var allConfig = getAllConfig();

        if (!imageUrl && !buttonUrl && !titleText && !descriptionText && !buttonText) {
            delete allConfig[pageKey];
            setAllConfig(allConfig);
            return true;
        }

        allConfig[pageKey] = {
            imageUrl: imageUrl,
            buttonUrl: buttonUrl,
            titleText: titleText,
            descriptionText: descriptionText,
            buttonText: buttonText
        };

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

    window.PresselAdminConfig = {
        storageKey: STORAGE_KEY,
        knownPages: Object.keys(KNOWN_PAGES),
        getPageKeyFromPath: getPageKeyFromPath,
        getPageConfig: getPageConfig,
        updatePageConfig: updatePageConfig,
        clearPageConfig: clearPageConfig,
        getAllConfig: getAllConfig,
        applyCurrentPageConfig: applyCurrentPageConfig
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyCurrentPageConfig);
    } else {
        applyCurrentPageConfig();
    }
})();
