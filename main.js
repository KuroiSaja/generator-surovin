// =========================
// DATA
// =========================

let INGREDIENTS = [];
let TAGS_BY_CATEGORY = {};
let TAG_ID_TO_NAME = {};

// =========================
// LOAD DATA
// =========================

async function loadIngredients() {
    const res = await fetch("data/ingredience.json");
    INGREDIENTS = await res.json();
}

async function loadTags() {
    const res = await fetch("data/tags.json");
    const tags = await res.json();

    TAGS_BY_CATEGORY = {};
    TAG_ID_TO_NAME = {};

    for (const tag of tags) {
        const cat = tag.tag_category;

        if (!TAGS_BY_CATEGORY[cat]) {
            TAGS_BY_CATEGORY[cat] = [];
        }

        const id = String(tag.tag_id);
        const name = tag.tag_name;

        TAGS_BY_CATEGORY[cat].push({ id, name });
        TAG_ID_TO_NAME[id] = name;
    }
}


function extractEnvironments(ingredients) {
    const set = new Set();

    for (const row of ingredients) {
        if (!row.environment) continue;

        String(row.environment)
            .split("|")
            .map(e => e.trim())
            .filter(e => e.length > 0 && e.toLowerCase() !== "any")
            .forEach(e => set.add(e));
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, "cs"));
}

// =========================
// TAG UI
// =========================

function renderTags(containerId = "tagContainer") {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    for (const [category, tags] of Object.entries(TAGS_BY_CATEGORY)) {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "tag-category";

        const legend = document.createElement("legend");
        legend.textContent = category;
        fieldset.appendChild(legend);

        const grid = document.createElement("div");
        grid.className = "tag-grid";

        for (const tag of tags) {
            const label = document.createElement("label");
            label.className = "tag-item";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = "tags";
            checkbox.value = tag.id;

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(" " + tag.name));

            grid.appendChild(label);
        }

        fieldset.appendChild(grid);
        container.appendChild(fieldset);
    }
}

function getSelectedTags(form) {
    return Array.from(
        form.querySelectorAll('input[name="tags"]:checked')
    ).map(cb => cb.value);
}

// =========================
// RESULT RENDERING
// =========================

function renderResult(result) {    
    const el = document.getElementById("result");
    el.innerHTML = "";

    if (!result) return;

    /* =========================
       HLAVIČKA – KONTEXT
       ========================= */

    const h2 = document.createElement("h2");
    h2.textContent = "Výsledek hledání";
    el.appendChild(h2);

    const ctx = document.createElement("p");
    ctx.innerHTML = `
        <strong>Prostředí:</strong> ${result.inputs.environment} |
        <strong>Sezóna:</strong> ${result.inputs.season}<br>
        <strong>Score:</strong> ${result.inputs.score},
        <strong>Hodiny:</strong> ${result.inputs.hours}
    `;
    el.appendChild(ctx);

    if (result.inputs.tags && result.inputs.tags.length > 0) {
        const tagNames = result.inputs.tags.map(
            id => TAG_ID_TO_NAME[id] ?? id
        );
    
        const tags = document.createElement("p");
        tags.innerHTML = `<strong>Tagy:</strong> ${tagNames.join(", ")}`;
        el.appendChild(tags);
    }


    /* =========================
       ZÁKLADNÍ SUROVINY
       ========================= */

    const raw = document.createElement("p");
    raw.innerHTML = `<strong>Základní suroviny:</strong> ${result.raw}`;
    el.appendChild(raw);

    /* =========================
       KONKRÉTNÍ NÁLEZY
       ========================= */

    const h3 = document.createElement("h3");
    h3.textContent = "Nalezené suroviny";
    el.appendChild(h3);

    const ul = document.createElement("ul");

    for (const [name, item] of Object.entries(result.ingredients)) {
        if (item.count <= 0) continue;

        const li = document.createElement("li");
        li.dataset.rarity = item.rarity;
        if (item.type) li.dataset.type = item.type;

        let text = `<strong>${name}</strong> × ${item.count}`;

        const details = [];
        if (item.type) details.push(`typ: ${item.type}`);
        if (item.mana) details.push(`mana: ${item.mana}`);
        if (item.suroviny) details.push(`suroviny: ${item.suroviny}`);
        if (item.rarity) details.push(`rarita: ${item.rarity}`);

        if (details.length > 0) {
            text += ` <em>(${details.join(", ")})</em>`;
        }

        li.innerHTML = text;

        if (item.usage && String(item.usage).trim().length > 0) {
            const usage = document.createElement("div");
            usage.className = "usage";
            usage.textContent = item.usage;
            li.appendChild(usage);
        }


        ul.appendChild(li);
    }

    if (ul.childElementCount === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-result";
        empty.textContent = "Nenašel jsi nic užitečného.";
        el.appendChild(empty);
    } else {
        el.appendChild(ul);
    }

    /* =========================
       KRITICKÝ NÁLEZ
       ========================= */

    if (result.rare) {
        const hr = document.createElement("hr");
        el.appendChild(hr);

        const h3c = document.createElement("h3");
        h3c.textContent = "Kritický nález";
        el.appendChild(h3c);

        const p = document.createElement("p");
        p.classList.add("critical");

        let text = `<strong>${result.rare.name}</strong>`;

        const critDetails = [];
        if (result.rare.type) critDetails.push(`typ: ${result.rare.type}`); 
        if (result.rare.mana) critDetails.push(`mana: ${result.rare.mana}`);
        if (result.rare.suroviny) critDetails.push(`suroviny: ${result.rare.suroviny}`);
        if (result.rare.rarity) critDetails.push(`rarita: ${result.rare.rarity}`);

        if (critDetails.length > 0) {
            text += ` <em>(${critDetails.join(", ")})</em>`;
        }

        p.innerHTML = text;

        if (result.rare.usage && String(result.rare.usage).trim().length > 0) {
            const usage = document.createElement("div");
            usage.className = "usage";
            usage.textContent = result.rare.usage;
            p.appendChild(usage);
        }

        el.appendChild(p);
    }

    // =========================
    // AUTO SCROLL K VÝSLEDKU
    // =========================
    
    el.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// =========================
// FORM HANDLER
// =========================

document.addEventListener("DOMContentLoaded", async () => {

    // Pravidla toggle
    const rulesEnabled = document.getElementById("rulesEnabled");
    const rulesContent = document.getElementById("rulesContent");
    rulesEnabled.addEventListener("change", () => {
        rulesContent.hidden = !rulesEnabled.checked;
    });

    // Záložky
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-panel").forEach(p => { p.hidden = true; });
            btn.classList.add("active");
            document.getElementById("tab-" + btn.dataset.tab).hidden = false;
        });
    });

    // 1️⃣ Načti data
    await Promise.all([
        loadIngredients(),
        loadTags()
    ]);

    // 2️⃣ Naplň prostředí do selectu
    const envSelect = document.getElementById("environmentSelect");

    if (!envSelect) {
        console.error("❌ environmentSelect nenalezen v HTML");
        return;
    }

    const environments = extractEnvironments(INGREDIENTS);
    
    // 🔥 ABSOLUTNÍ RESET – smaže cokoliv, co tam bylo
    envSelect.innerHTML = "";
    
    for (const env of environments) {
    
        // 🔒 POJISTKA – nikdy nepustí any / Libovolné
        if (!env || env.toLowerCase() === "any" || env.toLowerCase() === "libovolné") {
            continue;
        }
    
        const opt = document.createElement("option");
        opt.value = env;
        opt.textContent = env;
        envSelect.appendChild(opt);
    }


    // 3️⃣ Tagy
    renderTags();

    const tagsEnabled = document.getElementById("tagsEnabled");
    const tagContainer = document.getElementById("tagContainer");

    tagsEnabled.addEventListener("change", () => {
        tagContainer.hidden = !tagsEnabled.checked;
    });

    // 4️⃣ PJ mode
    const pjEnabled = document.getElementById("pjEnabled");
    const pjOptions = document.getElementById("pjOptions");

    pjEnabled.addEventListener("change", () => {
        pjOptions.hidden = !pjEnabled.checked;
        if (!pjEnabled.checked) {
            document.getElementById("pjMinPerHour").value = 1;
            document.getElementById("pjMaxPerHour").value = 3;
        }
    });

    const pjMin = document.getElementById("pjMinPerHour");
    const pjMax = document.getElementById("pjMaxPerHour");

    pjMin.addEventListener("input", () => {
        if (parseInt(pjMin.value) > parseInt(pjMax.value)) pjMax.value = pjMin.value;
    });

    pjMax.addEventListener("input", () => {
        if (parseInt(pjMax.value) < parseInt(pjMin.value)) pjMin.value = pjMax.value;
    });

    // 4️⃣ Form submit
    const form = document.getElementById("generatorForm");
    
    // =========================
    // KRITICKÝ ÚSPĚCH / NEÚSPĚCH – vzájemné vyloučení
    // =========================
    
    const criticalCheckbox = form.querySelector('input[name="critical"]');
    const criticalFailCheckbox = form.querySelector('input[name="criticalFail"]');
    
    criticalCheckbox.addEventListener("change", () => {
        if (criticalCheckbox.checked) {
            criticalFailCheckbox.checked = false;
        }
    });
    
    criticalFailCheckbox.addEventListener("change", () => {
        if (criticalFailCheckbox.checked) {
            criticalCheckbox.checked = false;
        }
    });


    form.addEventListener("submit", e => {
        e.preventDefault();

        const data = new FormData(form);

        const score = safeFormInt(data.get("score"));
        const hours = safeFormInt(data.get("hours"));

        if (score === null || hours === null) {
            alert("Score i počet hodin musí být celé číslo ≥ 1.");
            return;
        }

        const critical = criticalCheckbox.checked;
        const criticalFail = criticalFailCheckbox.checked;

        const selectedTagIds = tagsEnabled.checked ? getSelectedTags(form) : [];
        const selectedTagNames = selectedTagIds.map(id => (TAG_ID_TO_NAME[id] ?? id).toLowerCase());

        const baseMin = pjEnabled.checked ? (parseInt(document.getElementById("pjMinPerHour").value) || 1) : 1;
        const baseMax = pjEnabled.checked ? (parseInt(document.getElementById("pjMaxPerHour").value) || 3) : 3;

        const result = generate(
            INGREDIENTS,
            data.get("environment"),
            data.get("season"),
            score,
            hours,
            critical && !criticalFail,
            criticalFail,
            selectedTagNames,
            baseMin,
            baseMax
        );

        result.inputs.tags = selectedTagIds;

        renderResult(result);
    });
});

