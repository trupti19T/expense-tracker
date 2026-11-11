(function () {
    var THEMES = {
        pink:  { icons: ["🌸", "💗", "🎀", "✨"], mode: "fall" },
        green: { icons: ["🍃", "🌿", "🍀", "🌱"], mode: "fall" },
        blue:  { icons: ["☁️", "🌤️", "✨", "☁️"], mode: "drift" },
        white: { icons: ["💧", "🌬️", "🌊", "🤍"], mode: "drift" },
        red:   { icons: ["🌹", "🔥", "❤️", "✨"], mode: "rise" },
        black: { icons: ["⭐", "🌙", "✨", "💫"], mode: "fall" }
    };

    var QUOTES = [
        "Small savings today become big dreams tomorrow.",
        "Track it, tame it, grow it.",
        "Every rupee has a job. Give it a good one.",
        "A little progress each day adds up to big results.",
        "Spend with purpose, save with joy.",
        "Your future self will thank you for today's choices.",
        "Consistency beats perfection, one entry at a time.",
        "Be patient with your goals; money grows with time."
    ];

    var MONTHS = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];

    var DECO = [
        { cls: "d1", svg: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="20" width="76" height="68" rx="8"/><line x1="12" y1="38" x2="88" y2="38"/><line x1="32" y1="10" x2="32" y2="28"/><line x1="68" y1="10" x2="68" y2="28"/><line x1="37" y1="38" x2="37" y2="88"/><line x1="62" y1="38" x2="62" y2="88"/><line x1="12" y1="55" x2="88" y2="55"/><line x1="12" y1="72" x2="88" y2="72"/><circle cx="75" cy="63" r="4" fill="currentColor"/></svg>' },
        { cls: "d2", svg: '<svg viewBox="0 0 80 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="4" width="64" height="92" rx="10"/><rect x="18" y="14" width="44" height="18" rx="4"/><circle cx="24" cy="48" r="4"/><circle cx="40" cy="48" r="4"/><circle cx="56" cy="48" r="4"/><circle cx="24" cy="64" r="4"/><circle cx="40" cy="64" r="4"/><circle cx="56" cy="64" r="4"/><circle cx="24" cy="80" r="4"/><circle cx="40" cy="80" r="4"/><circle cx="56" cy="80" r="4"/></svg>' },
        { cls: "d3", svg: '<svg viewBox="0 0 120 80" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="12" width="108" height="56" rx="8"/><circle cx="60" cy="40" r="16"/><circle cx="22" cy="40" r="4"/><circle cx="98" cy="40" r="4"/><text x="60" y="47" text-anchor="middle" font-size="20" font-family="Arial, sans-serif" fill="currentColor" stroke="none">&#8377;</text></svg>' },
        { cls: "d4", svg: '<svg viewBox="0 0 120 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 10 V86 H110"/><rect x="26" y="56" width="14" height="30" rx="2"/><rect x="50" y="40" width="14" height="46" rx="2"/><rect x="74" y="24" width="14" height="62" rx="2"/><circle cx="33" cy="46" r="3" fill="currentColor"/><circle cx="57" cy="30" r="3" fill="currentColor"/><circle cx="81" cy="14" r="3" fill="currentColor"/></svg>' }
    ];

    function spawn() {
        var sky = document.getElementById("sky");
        if (!sky) { return; }
        sky.innerHTML = DECO.map(function (d) {
            return '<div class="deco ' + d.cls + '">' + d.svg + '</div>';
        }).join("");
    }
    
    function applyTheme(name) {
        if (!THEMES[name]) { name = "pink"; }
        document.documentElement.setAttribute("data-theme", name);
        try { localStorage.setItem("theme", name); } catch (e) {}
        document.querySelectorAll("button.dot").forEach(function (b) {
            b.classList.toggle("on", b.getAttribute("data-theme") === name);
        });
        spawn(name);
    }

    function showQuote() {
        var el = document.getElementById("quote");
        if (!el) { return; }
        el.classList.remove("show");
        void el.offsetWidth;
        el.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        el.classList.add("show");
    }

    document.querySelectorAll("button.dot").forEach(function (b) {
        b.addEventListener("click", function () {
            applyTheme(b.getAttribute("data-theme"));
        });
    });

    var now = new Date();

    var thisMonth = document.getElementById("thisMonth");
    if (thisMonth) {
        thisMonth.textContent = MONTHS[now.getMonth()] + " " + now.getFullYear();
    }

    document.querySelectorAll(".sticker[data-m]").forEach(function (s) {
        if (parseInt(s.getAttribute("data-m"), 10) === now.getMonth()) {
            s.classList.add("current");
        }
    });

    applyTheme(document.documentElement.getAttribute("data-theme"));
    showQuote();
    setInterval(showQuote, 9000);
})();