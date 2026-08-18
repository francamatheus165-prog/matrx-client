(function() {
    let badges = {};
    const badgeImages = {};

    async function loadBadges() {
        try {
            const res = await fetch(
                "https://celestarminefun.github.io/client/badges.json?t=" + Date.now()
            );
            badges = await res.json();
            for (const username in badges) {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = badges[username].badge;
                badgeImages[username.toLowerCase()] = img;
            }
        } catch (err) {
            console.error("[Matrix] Failed to load badges", err);
        }
    }

    loadBadges();
})();