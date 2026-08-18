(function() {
    let promos = [];
    let currentPromo = 0;
    let promoIntervalStarted = false;

    async function loadPromos() {
        try {
            const res = await fetch(
                "https://celestarminefun.github.io/client/promos.json?t=" + Date.now()
            );
            promos = await res.json();
            updatePromo();
        } catch (err) {
            console.error("[Matrix] Failed to load promos", err);
        }
    }

    function injectStyles() {
        if (document.getElementById("__matrix_lobby_style")) return;
        const style = document.createElement("style");
        style.id = "__matrix_lobby_style";
        style.textContent = `
            .bottom-right .discord { display: none !important; }
            .bottom { position: relative !important; }
        `;
        document.head.appendChild(style);
    }

    function injectJoinButton() {
        const target = document.querySelector(".bottom-right");
        if (!target) return;
        let btn = document.getElementById("join-link-btn");
        if (!btn) {
            btn = document.createElement("button");
            btn.id = "join-link-btn";
            btn.textContent = "JOIN LINK";
            btn.style.cssText = `position:absolute;right:280px;bottom:16px;width:190px;height:60px;z-index:999;background:#dda214;color:white;text-align:center;border:.07em solid #ffd60c;border-radius:.25em;padding:.3em .4em;box-shadow:0 0 0 .08em #08070f;cursor:pointer;font-size:30px;transition:.2s;`;
            btn.addEventListener("click", async () => {
                try {
                    const text = (await navigator.clipboard.readText()).trim();
                    if (!text.startsWith("https://minefun.io/match/")) {
                        alert("You need to copy a valid match link.");
                        return;
                    }
                    location.href = text;
                } catch (err) {
                    console.error(err);
                }
            });
            target.prepend(btn);
        }
    }

    function injectEverything() {
        injectStyles();
        injectJoinButton();
    }

    injectEverything();
    loadPromos();

    new MutationObserver(() => {
        injectEverything();
    }).observe(document.body, {
        childList: true,
        subtree: true
    });
})();