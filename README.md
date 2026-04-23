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

Zvláštní podmínky upřesňují prostředí nad rámec základního výběru – například přítomnost vody, spáleniště nebo magické anomálie. Každá surovina může mít definováno, za jakých podmínek se vyskytuje nebo nevyskytuje.

**Povinná podmínka** – surovina je zařazena do poolu pouze pokud podmínka platí.

**Zakázaná podmínka** – pokud podmínka platí, surovina je z poolu vyloučena.

**Specifická podmínka** – pokud podmínka platí:
- prostředí souhlasí → surovina je do poolu zařazena vždy (100 %)
- prostředí nesouhlasí → podmínka prostředí nahradí (surovina se stále může objevit)

Specifická podmínka zároveň zvyšuje váhu při výběru o násobitel **1,6×**.

---

## 2. Kolik se toho najde

### Obecné suroviny

```
obecné suroviny = score × počet hodin
```

### Konkrétní nálezy

Rozsah náhodně losovaného počtu nálezů za hodinu závisí na score. Při score 1–4 se nenajde nic; od 5 výše začíná rozsah 1–3 a každých dalších 5 bodů ho posune o 1 nahoru:

| Score | Nálezy za hodinu |
|---|---|
| 1–4 | 0 (nic) |
| 5–9 | 1–3 |
| 10–14 | 2–4 |
| 15–19 | 3–5 |
| 20–24 | 4–6 |
| … | … +1 každých 5 bodů |

```
celkový počet nálezů = nálezy za hodinu × počet hodin
```

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

```
mana: (score − 10) × 5 až (score − 5) × 5, nejméně 5
suroviny: (score − 10) × 10 až (score − 5) × 10, nejméně 10
```

---

## 5. Kritický neúspěch

Všechny výsledky jsou sníženy na polovinu (zaokrouhleno dolů):

```
obecné suroviny = score × hodiny ÷ 2
každý konkrétní nález = počet ÷ 2
```
