// =========================
// HELPERS
// =========================

function safeInt(value) {
    if (value === null || value === undefined) return 0;
    if (value === "" || value === "nan") return 0;
    const n = parseInt(value, 10);
    return isNaN(n) ? 0 : n;
}

function safeFormInt(value, minValue = 1) {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < minValue) return null;
    return n;
}

function rawSuroviny(score, hours) {
    return Math.max(score, 0) * hours;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function concretePerHour(score, baseMin = 1, baseMax = 3) {
    if (score < 5) return 0;
    const tier = Math.floor((score - 5) / 5);
    return randomInt(baseMin + tier, baseMax + tier);
}

function splitTags(cell) {
    if (!cell) return new Set();
    return new Set(
        String(cell)
            .toLowerCase()
            .split("|")
            .map(t => t.trim())
            .filter(t => t.length > 0)
    );
}

function weightedRandom(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;

    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) {
            return items[i];
        }
    }
    return items[items.length - 1];
}


// =========================
// SIMPLE MODE
// =========================

function generateSimple(ingredients, count) {
    const shuffled = [...ingredients].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// =========================
// POOL LOGIC
// =========================

const DEFAULT_POOL_CHANCES = {
    both:       1.00,
    envOnly:    0.30,
    seasonOnly: 0.30,
    none:       0.05
};

function buildPool(ingredients, environment, season, selectedTags, poolChances = DEFAULT_POOL_CHANCES) {
    const pool = [];
    const selectedTagSet = new Set(selectedTags || []);

    for (const row of ingredients) {

        const requiredTags = splitTags(row["required tag"]);
        const forbidTags   = splitTags(row["forbid tag"]);
        const specificTags = splitTags(row["specific tag"]);

        // 1️⃣ required tag – absolutní priorita
        let requiredOk = true;
        for (const tag of requiredTags) {
            if (!selectedTagSet.has(tag)) {
                requiredOk = false;
                break;
            }
        }
        if (!requiredOk) continue;

        // 2️⃣ forbid tag
        if ([...forbidTags].some(t => selectedTagSet.has(t))) continue;
        if (forbidTags.has(environment)) continue;

        // 3️⃣ environment / season
        const envAny = String(row.environment).trim().toLowerCase() === "any";
        let envMatch = envAny || String(row.environment).includes(environment);
        const seasonMatch = String(row.season).includes(season);
        const specificMatch = [...specificTags].some(t => selectedTagSet.has(t));

        // specific + env → automaticky v poolu
        if (specificMatch && envMatch && !envAny) {
            pool.push(row);
            continue;
        }

        // specific nahrazuje environment
        if (specificMatch && (envAny || !envMatch)) {
            envMatch = true;
        }

        // 4️⃣ vážená šance vstupu
        let chance = poolChances.none;
        if (envMatch && seasonMatch)  chance = poolChances.both;
        else if (envMatch)            chance = poolChances.envOnly;
        else if (seasonMatch)         chance = poolChances.seasonOnly;

        if (Math.random() <= chance) {
            pool.push(row);
        }
    }

    // 5️⃣ fallback – min. 3 položky
    if (pool.length < 3) {
        const needed = 3 - pool.length;

        const fallback = ingredients.filter(row =>
            row.rarity !== "rare" &&
            (
                String(row.environment).trim().toLowerCase() === "any" ||
                String(row.environment).includes(environment)
            )
        );

        const existingNames = new Set(pool.map(r => r.name));
        const candidates = fallback.filter(r => !existingNames.has(r.name));

        while (pool.length < 3 && candidates.length > 0) {
            const idx = Math.floor(Math.random() * candidates.length);
            pool.push(candidates.splice(idx, 1)[0]);
        }
    }

    return pool;
}

// =========================
// PICK LOGIC
// =========================

function pickFromPool(pool, total, selectedTags, rarityWeights = null, clusteringEnabled = true) {
    const results = [];
    const foundCounts = {};
    const selectedTagSet = new Set(selectedTags || []);

    const RARITY_WEIGHT = rarityWeights ?? {
        common: 1.0,
        uncommon: 0.35,
        rare: 0.12
    };

    // Ladicí konstanty
    const PEAK_STRENGTH = 3.0;
    const THIRD_MULTIPLIER = 1.2;
    const DECAY_RATE = 0.7;
    const SPECIFIC_BOOST = 1.6;

    for (let i = 0; i < total; i++) {
        const weights = [];

        for (const row of pool) {
            const name = row.name;
            const rarity = row.rarity;

            // 1️⃣ base váha podle rarity
            const base = RARITY_WEIGHT[rarity] ?? 0.1;
            let weight = base;

            // 2️⃣ specific tag boost (nejdřív!)
            const specificTags = splitTags(row["specific tag"]);
            for (const tag of specificTags) {
                if (selectedTagSet.has(tag)) {
                    weight *= SPECIFIC_BOOST;
                    break;
                }
            }

            // 3️⃣ opakování
            if (clusteringEnabled) {
                const count = foundCounts[name] || 0;

                if (count === 1) {
                    weight *= (1 + PEAK_STRENGTH * base);
                } else if (count === 2) {
                    weight *= THIRD_MULTIPLIER;
                } else if (count >= 3) {
                    weight *= 1.0 / (1 + (count - 2) * DECAY_RATE);
                }
            }

            weights.push(weight);
        }

        // vážený výběr
        const chosen = weightedRandom(pool, weights);
        results.push(chosen);

        foundCounts[chosen.name] = (foundCounts[chosen.name] || 0) + 1;
    }

    return results;
}


// =========================
// GENERATION
// =========================

function generate(ingredients, environment, season, score, hours, critical, criticalFail, selectedTags, baseMin = 1, baseMax = 3, poolChances = DEFAULT_POOL_CHANCES, rarityWeights = null, critWeights = null, clusteringEnabled = true) {

    const result = {
        inputs: {
            environment,
            season,
            score,
            hours,
            critical,
            criticalFail,
            tags: selectedTags
        },
        raw: rawSuroviny(score, hours),
        ingredients: {}
    };

    // ---- základní generace ----
    const pool = buildPool(ingredients, environment, season, selectedTags, poolChances);
    const totalPicks = concretePerHour(score, baseMin, baseMax) * hours;
    const picks = pickFromPool(pool, totalPicks, selectedTags, rarityWeights, clusteringEnabled);

    for (const row of picks) {
        const name = row.name;
        if (!result.ingredients[name]) {
            result.ingredients[name] = {
                count: 0,
                type: row.type ?? null,   // 👈 TADY JE KLÍČ
                mana: safeInt(row.mana),
                suroviny: safeInt(row.suroviny),
                usage: row.usage,
                rarity: row.rarity
            };
        }

        result.ingredients[name].count++;
    }

    // ---- kritický úspěch ----
    if (critical) {
        const uncommon = ingredients.filter(i => i.rarity === "uncommon");
        const rare = ingredients.filter(i => i.rarity === "rare");
        const cw = critWeights ?? { uncommon: 1.0, rare: 0.25, mana: 1.0, suroviny: 1.0 };

        const choices = [];
        const weights = [];

        // UNCOMMON
        if (uncommon.length > 0) {
            const r = uncommon[Math.floor(Math.random() * uncommon.length)];
            choices.push({
                name: r.name,
                count: 1,
                type: r.type ?? null,
                mana: safeInt(r.mana),
                suroviny: safeInt(r.suroviny),
                usage: r.usage,
                rarity: r.rarity
            });
            weights.push(cw.uncommon);
        }

        // RARE (nižší váha)
        if (rare.length > 0) {
            const r = rare[Math.floor(Math.random() * rare.length)];
            choices.push({
                name: r.name,
                count: 1,
                type: r.type ?? null,
                mana: safeInt(r.mana),
                suroviny: safeInt(r.suroviny),
                usage: r.usage,
                rarity: r.rarity
            });
            weights.push(cw.rare);
        }

        // ABSTRAKTNÍ MAGICKÝ NÁLEZ (MANA)
        const manaMin = Math.max((score - 10) * 5, 5);
        const manaMax = Math.max((score - 5) * 5, manaMin);

        choices.push({
            name: "Abstraktní magický nález",
            count: null,
            type: null,
            mana: randomInt(manaMin, manaMax),
            suroviny: 0,
            usage: "Volně využitelná magická energie",
            rarity: "abstract"
        });
        weights.push(cw.mana);

        // ABSTRAKTNÍ NÁLEZ SUROVIN
        const surovinyMin = Math.max((score - 10) * 10, 10);
        const surovinyMax = Math.max((score - 5) * 10, surovinyMin);

        choices.push({
            name: "Abstraktní nález surovin",
            count: null,
            type: null,
            mana: 0,
            suroviny: randomInt(surovinyMin, surovinyMax),
            usage: "Volně využitelné alchymistické suroviny",
            rarity: "abstract"
        });
        weights.push(cw.suroviny);

        result.rare = weightedRandom(choices, weights);
    }

    // ---- kritický neúspěch ----
    if (criticalFail) {
        result.raw = Math.floor(result.raw / 2);
        for (const item of Object.values(result.ingredients)) {
            item.count = Math.floor(item.count / 2);
        }
    }

    return result;
}




