(function () {
  "use strict";

  var api = window.electronAPI;

  if (!api) {
    console.error("[Matrix] electronAPI not found");
    return;
  }

  var settings = {};
  var menuOpen = false;
  var menuKeybind = "KeyG";

  var root = document.getElementById("__matrix_root");
  var menuEl = document.getElementById("celestar-menu");
  var searchEl = document.getElementById("celestar-search");
  var closeBtn = document.getElementById("celestar-close");

  if (!menuEl) {
    console.error("[Matrix] menu element not found");
    return;
  }

  api.getSettings()
    .then(function (s) {
      settings = s || {};
      initCards();
      initSearch();
      initTabs();
      initCloseBtn();
      initMenuKey();
      initClientSettings();
      console.log("[Matrix] Menu ready");
    })
    .catch(function (err) {
      console.error("[Matrix] Failed to load settings:", err);
    });

  function initCards() {
    document.querySelectorAll("#celestar-menu .card").forEach(function (card) {
      var mod = card.dataset.mod;
      if (!mod) return;

      setEnabled(mod, !!settings[mod + ".enabled"]);

      var toggleBtn = card.querySelector(".toggle-btn");

      if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {
          var now = !settings[mod + ".enabled"];
          settings[mod + ".enabled"] = now;
          setEnabled(mod, now);
          api.setSetting(mod + ".enabled", now);
        });
      }
    });
  }

  function initClientSettings() {
    var kbBtn = document.getElementById("client-keybind-btn");
    var btnMain = document.getElementById("btn-main");
    var btnSandbox = document.getElementById("btn-sandbox");

    if (!kbBtn || !btnMain || !btnSandbox) return;

    function fmtKeybind(code) {
      if (!code) return "G";
      return code.replace("Key", "").replace("Digit", "").replace(/Left$/, "");
    }

    var currentKeybind = settings["client.keybind"] || "KeyG";
    kbBtn.textContent = fmtKeybind(currentKeybind);

    var listeningKb = false;
    kbBtn.addEventListener("click", function () {
      listeningKb = true;
      kbBtn.textContent = "Press a key...";
    });

    document.addEventListener("keydown", function (e) {
      if (!listeningKb) return;
      e.preventDefault();
      listeningKb = false;
      currentKeybind = e.code;
      kbBtn.textContent = fmtKeybind(e.code);
      settings["client.keybind"] = e.code;
      api.setSetting("client.keybind", e.code);
      menuKeybind = e.code;
    });

    var isSandbox = !!settings["client.sandbox"];

    function updateSiteBtns() {
      btnMain.style.background = !isSandbox ? "var(--background-3)" : "var(--background-1)";
      btnMain.style.color = !isSandbox ? "var(--white)" : "var(--grey-2)";
      btnSandbox.style.background = isSandbox ? "var(--background-3)" : "var(--background-1)";
      btnSandbox.style.color = isSandbox ? "var(--white)" : "var(--grey-2)";
    }

    updateSiteBtns();

    var fsEl = document.getElementById("client-autofullscreen-btn");
    if (fsEl) {
      var fsOn = settings["client.autofullscreen"] != null ? !!settings["client.autofullscreen"] : true;
      fsEl.checked = fsOn;
      fsEl.addEventListener("change", function () {
        settings["client.autofullscreen"] = fsEl.checked;
        api.setSetting("client.autofullscreen", fsEl.checked);
      });
    }

    btnMain.addEventListener("click", function () {
      if (!isSandbox) return;
      isSandbox = false;
      updateSiteBtns();
      settings["client.sandbox"] = false;
      api.switchSite(false);
    });

    btnSandbox.addEventListener("click", function () {
      if (isSandbox) return;
      isSandbox = true;
      updateSiteBtns();
      settings["client.sandbox"] = true;
      api.switchSite(true);
    });
  }

  function setEnabled(mod, on) {
    var card = document.querySelector("#celestar-menu .card[data-mod='" + mod + "']");
    var toggleBtn = card ? card.querySelector(".toggle-btn") : null;
    if (card) card.classList.toggle("enabled", on);
    if (toggleBtn) toggleBtn.textContent = on ? "Enabled" : "Disabled";
  }

  function initSearch() {
    if (!searchEl) return;
    searchEl.addEventListener("input", function () {
      var q = searchEl.value.toLowerCase().trim();
      document.querySelectorAll("#celestar-menu .card").forEach(function (card) {
        var nameEl = card.querySelector(".name");
        if (!nameEl) return;
        var match = !q || nameEl.textContent.toLowerCase().includes(q);
        card.style.display = match ? "" : "none";
      });
    });
  }

  function initTabs() {
    var modsPanel = document.getElementById("celestar-mods-panel");
    var settingsPanel = document.getElementById("celestar-settings-panel");
    var toolbar = document.querySelector("#celestar-menu .toolbar");

    document.querySelectorAll("#celestar-menu .tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll("#celestar-menu .tab").forEach(function (t) {
          t.classList.remove("active");
        });
        tab.classList.add("active");
        var isSettings = tab.dataset.tab === "settings";
        if (modsPanel) modsPanel.style.display = isSettings ? "none" : "";
        if (settingsPanel) settingsPanel.style.display = isSettings ? "flex" : "none";
        if (toolbar) toolbar.style.display = isSettings ? "none" : "";
      });
    });
  }

  function initCloseBtn() {
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closeMenu();
      });
    }
  }

  function openMenu() {
    menuOpen = true;
    menuEl.classList.add("open");
  }

  function closeMenu() {
    menuOpen = false;
    menuEl.classList.remove("open");
    if (searchEl) searchEl.value = "";
  }

  function initMenuKey() {
    menuKeybind = settings["client.keybind"] || "KeyG";
    document.addEventListener("keydown", function (e) {
      if (e.code === menuKeybind && !menuOpen) {
        var active = document.activeElement;
        var isInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
        if (!isInput) {
          e.preventDefault();
          openMenu();
        }
        return;
      }
      if (e.code === menuKeybind && menuOpen) {
        e.preventDefault();
        closeMenu();
        return;
      }
    });
  }
})();