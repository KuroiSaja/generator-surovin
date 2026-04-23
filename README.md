# Generátor surovin – Dračí hlídka

Webový nástroj pro hru Dračí hlídka. Vypravěč zadá prostředí, roční období, score postavy (d10 + Znalost přírody + INT) a počet hodin hledání. Nástroj vygeneruje obecné suroviny a konkrétní nálezy s přihlédnutím k tagům oblasti (denní doba, speciální podmínky prostředí) a případnému kritickému úspěchu či neúspěchu.

---

## 1. Pool – co se v okolí nachází

Každá surovina má definované prostředí a roční období. Shoda určuje pravděpodobnost zařazení do poolu pro danou oblast:

| Prostředí | Sezóna | Šance vstupu do poolu |
|---|---|---|
| ✔ | ✔ | 100 % |
| ✔ | ✘ | 30 % |
| ✘ | ✔ | 30 % |
| ✘ | ✘ | 5 % |

### Zvláštní podmínky

**Required tag** – pokud podmínka není splněna, surovina se nevyskytuje vůbec.

**Forbid tag** – pokud podmínka platí, surovina je zcela vyloučena.

**Specific tag** – pokud podmínka platí:
- prostředí souhlasí → surovina je do poolu zařazena vždy (100 %)
- prostředí nesouhlasí → specific tag prostředí nahradí (surovina se stále může objevit)

Specific tag zároveň zvyšuje váhu při výběru o násobitel **1,6×**.

---

## 2. Kolik se toho najde

### Obecné suroviny

```
obecné suroviny = score × počet hodin
```

### Konkrétní nálezy

Počet výběrů za hodinu závisí na score. Za každých 5 bodů nad 5 se rozsah posune o 1:

| Score | Nálezy / hodinu |
|---|---|
| 1–4 | 0 (nic) |
| 5–9 | 1–3 |
| 10–14 | 2–4 |
| 15–19 | 3–5 |
| 20–24 | 4–6 |
| … | … +1 každých 5 bodů |

Celkový počet výběrů = nálezy/hodinu × počet hodin.

---

## 3. Co je nalezeno – váhy rarity

Každý výběr je vážený náhodný výběr z poolu. Základní váhy:

| Rarita | Váha |
|---|---|
| Common | 1,00 |
| Uncommon | 0,35 |
| Rare | 0,12 |

### Clustering (opakované nálezy)

Pokud se surovina již jednou našla, její váha se upraví:

| Počet nálezů | Úprava váhy |
|---|---|
| 1. nález | základní váha |
| 2. nález | váha × (1 + 3,0 × základní váha) |
| 3. nález | váha × 1,2 |
| 4. nález | váha × 1 / (1 + 0,7) ≈ × 0,59 |
| 5. nález | váha × 1 / (1 + 1,4) ≈ × 0,42 |
| … | klesá dál |

Příklad pro common (váha 1,0): 2. nález má váhu **4,0** – silný peak, bohaté naleziště.

---

## 4. Kritický úspěch

Přináší jeden výrazný nález vybraný váženým losem:

| Nález | Váha |
|---|---|
| Uncommon surovina | 1,0 |
| Rare surovina | 0,25 |
| Abstraktní nález (mana) | 1,0 |
| Abstraktní nález (suroviny) | 1,0 |

Pro score ≤ 10 jsou obě hodnoty na minimu. Každý bod score nad 10 zvyšuje dolní hranici o 5 (mana) / 10 (suroviny); horní hranice je vždy o 25 / 50 výše:

| Score | Mana | Suroviny |
|---|---|---|
| ≤ 10 | 5 | 10 |
| 15 | 25–50 | 50–100 |
| 20 | 50–75 | 100–150 |
| 25 | 75–100 | 150–200 |

---

## 5. Kritický neúspěch

Všechny výsledky jsou sníženy na polovinu (zaokrouhleno dolů):

```
obecné suroviny = floor(score × hodiny / 2)
každý konkrétní nález = floor(počet / 2)
```
