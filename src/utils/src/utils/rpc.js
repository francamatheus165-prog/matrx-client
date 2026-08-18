const RPC = require("discord-rpc");
const CLIENT_ID = "1527093914488541354";

const ACTIVITIES = {
    lobby: { name: "In Lobby" },
    custom: { name: "Playing Custom Games" },
};

RPC.register(CLIENT_ID);

const rpc = new RPC.Client({ transport: "ipc" });
const startTimestamp = new Date();

rpc.on("ready", () => {
    console.log("[RPC] Connected");
    rpc.setActivity({
        details: "In Lobby",
        state: "on Matrix Client",
        largeImageKey: "logo",
        startTimestamp,
    });
});

rpc.login({ clientId: CLIENT_ID }).catch(console.error);

function updatePresence(page, isSandbox = false) {
    if (!rpc.user) return;
    const activity = ACTIVITIES[page] || { name: page };
    const sandboxTag = isSandbox ? " (Sandbox)" : "";
    rpc.setActivity({
        details: activity.name + sandboxTag,
        state: "on Matrix Client",
        largeImageKey: "logo",
        startTimestamp,
    });
}

module.exports = { rpc, updatePresence };
