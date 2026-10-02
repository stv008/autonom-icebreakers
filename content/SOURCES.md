# Sursa întrebărilor și reluarea lucrului

Internal Confidential · v1.3 · 2026-10-02 · initiated-by: codex; v1.3 claude-code

## Release-ul aplicației 2026.10.0 [NOU v1.3]

Cele **479 de întrebări** din colecția v1.1 sunt implementate în aplicație ca release de conținut **`2026.10.0`, `releaseSeq=4`**, în **opt categorii**. Publicat cu aplicația v0.1.4 (aprobare Marius, 2 octombrie 2026; vezi nota de release, „Deploy”). Fișierele: [questions-2026.10.0.json](../public/data/questions-2026.10.0.json), [manifest.json](../public/data/manifest.json) (sha256 `3fcd072a…7a9a`), fallback-ul [questions.json](../public/data/questions.json) identic cu release-ul. Nota completă, cu numărători, traduceri, `presentationSafe`, compatibilitate, deploy și rollback: **[RELEASE_2026.10.0.md](RELEASE_2026.10.0.md)**.

- Autorizare: instrucțiunea lui Marius din 2 octombrie 2026, care include și cele trei categorii propuse. Ea înlocuiește limita „fără modificarea datelor aplicației” din secțiunea „Continuare” de mai jos; acea secțiune rămâne ca istoric.
- Intrare: doar tabloul `questions` (cele reținute) din `outputs/…/v1.1/support/consolidated.json`. Excluderile și inventarul nu au fost folosite. Construcție reproductibilă: `node scripts/import-collection.mjs --check`.
- Cele 107 întrebări publicate sunt identice byte cu byte. ID-urile noi sunt păstrate. Cele 368 de traduceri în engleză sunt redactate de Claude, pentru revizie: [en-translations.json](release-2026.10.0/en-translations.json). [presentation-safety.json](release-2026.10.0/presentation-safety.json) marchează 10 întrebări noi drept nepotrivite pentru ecran partajat.
- Pe site nu ajung titluri de surse, linkuri Drive sau inventarul. Proveniența detaliată rămâne local, în `outputs/`. Repo-ul GitHub este public; `outputs/` și `SOURCES.private.md` sunt ignorate de Git și nu au fost niciodată publicate (istoricul local a fost rescris înainte de push, 2 octombrie 2026).

## Sursa confirmată

**Joc intrebari — Google Sheets (intern)**

> Repo-ul GitHub este public: linkul, ID-ul spreadsheetului și reperele e-mailului sunt doar în fișierul local, ignorat de Git, `content/SOURCES.private.md`. Directorul `outputs/` (workbook-uri, rapoarte, inventar) este, de asemenea, doar local.

- Spreadsheet ID: vezi `SOURCES.private.md`.
- Fila indicată de link (identificator în `SOURCES.private.md`): „Versiune actuala”, citită de cititorul Forum/Exercises la 2 octombrie 2026 în intervalul `A1:D300`. Consolidatorul a verificat raportul și exportul local primit, nu a repetat accesul live.
- Proveniența linkului: conversația coordonatoare a verificat documentul nativ în Drive și același URL într-un e-mail intern din 17 septembrie 2026 (subiect și ID-uri în `SOURCES.private.md`), care îl descrie drept centralizarea întrebărilor explorate de-a lungul timpului. Aceste verificări sunt preluate din handoff-ul conversației coordonatoare; e-mailul și spreadsheetul nu au fost recitite în sesiunea de documentare.
- Reper pentru regăsirea e-mailului: vezi `SOURCES.private.md`. Nu copia semnături sau date personale.
- Există copii Excel cu nume similar, potrivit aceleiași verificări din conversația coordonatoare. Nu le substitui documentului nativ confirmat.

## Ce este verificat local la 2 octombrie 2026

[RELEASE_2026.09.2.md](RELEASE_2026.09.2.md) identifică „Joc intrebari” ca sursă citită pe **17 septembrie 2026**, cu coloanele `CATEGORIE | ROMANA | ENGLEZĂ | Reformulari / modificari`. Acesta este un reper istoric, nu o verificare a conținutului live de astăzi.

[questions.json](../public/data/questions.json) conține **107 întrebări**, toate active, în cinci categorii:

| Categorie în fișier | Întrebări |
|---|---:|
| `me_life_dreams` | 35 |
| `values` | 32 |
| `personal_growth` | 19 |
| `relationships` | 11 |
| `professional` | 10 |

Versiunea locală este `2026.09.2`, `releaseSeq=3`; [manifest.json](../public/data/manifest.json) indică [questions-2026.09.2.json](../public/data/questions-2026.09.2.json). Aceste valori descriu fișierele locale, nu numărul total de întrebări din spreadsheet și nici starea curentă a site-ului.

Conform [README — Content](../README.md#content-how-questions-reach-the-app), fluxul este **spreadsheet → export validat → fișier de release → manifest → aplicație**. Aplicația nu citește direct spreadsheetul. Corecturile editoriale se fac în sursă și se publică printr-un release nou, fără suprascrierea release-urilor istorice.

## Colecția extinsă — etapa YPO [NOU]

Autonom Icebreakers extins — v1.0 (local: `outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/Autonom_Icebreakers_extins_codex_2026-10-02_v1.0.xlsx`) are **347 întrebări**: cele **107 existente**, păstrate cu ID, RO, EN și categorie neschimbate; **14 preluate/adaptate** suplimentar din fila sursă; **226 noi inspirate** de teme din YPO. Nu este un export aprobat pentru aplicație.

- Sursa extinderii: folderul YPO din My Drive (link în `SOURCES.private.md`), cele 16 ramuri principale. Inventarul are 502 fișiere YPO plus fila sursă. Citirea și limitele fiecărei surse sunt atribuite celor trei cititori; consolidarea locală verifică proveniența completă, unicitatea, numerele și păstrarea bazei.
- Dintre fișierele YPO, 107 au lectură/text utilizabil, inclusiv lecturi selective și duplicate de document; 24 au acces/extracție incompletă; 371 sunt omise după triaj. Aceste numere nu certifică lectura integrală a corpusului.
- Fila „Versiune actuala” conține 127 rânduri candidate în intervalul citit, nu 107. Celelalte nouă file nu au fost citite în etapa YPO; fila de contacte rămâne exclusă.
- Registrul de eliminări are 178 duplicate sau variante semantice și o excludere tematică, din 419 candidați evaluați (127 rânduri sursă și 292 propuneri YPO, incluzând 12 eliminate anterior de unul dintre cititori). Cele 107 întrebări existente au prioritate și nu au fost deduplicate semantic între ele.
- Categoriile existente sunt păstrate. Sunt propuse suplimentar „Curiozitate și joacă”, „Gândire și decizii”, „Echilibru și prezență”; ele nu modifică taxonomia aplicației.
- Consolidarea reutilizabilă (local: `outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/support/consolidated.json`), verificările (local: `outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/support/verification.json`) și rapoartele cititorilor din același director `support/` permit continuarea fără reluarea etapei YPO. Titlurile sensibile din inventarul livrat sunt mascate; sursele folosite efectiv păstrează titlurile și URL-urile.

## Colecția curentă — YPO + Education v1.1 [NOU]

Workbook v1.1 — 479 întrebări (local: `outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/v1.1/Autonom_Icebreakers_extins_codex_2026-10-02_v1.1.xlsx`) păstrează toate cele 347 de întrebări v1.0 și adaugă **132** din cele trei ramuri Education. Au fost evaluate 153 de candidate finale și eliminate 21 de variante semantice. Fișierul XLSX v1.0 rămâne identic byte cu byte.

| Ramură Education | Fișiere inventariate | Cu lectură efectivă | Candidate finale | Întrebări reținute | Surse pentru reținute |
|---|---:|---:|---:|---:|---:|
| TRAINING | 404 | 38 | 53 | 45 | 19 |
| Resurse | 173 | 77 | 47 | 45 | 26 |
| CASES HBS ARTICLES | 624 | 274 | 53 | 42 | 38 |
| Total | 1.201 | 389 | 153 | 132 | 83 |

- „Cu lectură efectivă” include lectura selectivă/tematică, nu presupune parcurgere integrală. TRAINING: 15 integral, 22 tematic, 1 tematic prin OCR; 7 inspecții de structură pentru triaj sunt numărate separat. Resurse: 62 tematic, 10 în text, 5 vizual integral. Cases: 274 selectiv, plus 8 duplicate textuale separate. TRAINING are și 3 duplicate probabile după titlu, neconfirmate textual.
- Intrarea TRAINING este un shortcut, rezolvat de cititor prin redirecționare în Chrome autentificat la folderul țintă (linkuri în `SOURCES.private.md`). Raportul cititorului păstrează dovada și limitele OCR. Consolidatorul nu a repetat descoperirea sau citirea surselor.
- Registrul consolidat are **1.704 intrări distincte**: 502 fișiere YPO + 1.201 Education + fila Joc intrebari. Fiecare intrare are statut, motiv/limită și URL. Fișierele interioare arhivei ZIP de 6,22 GB din Resurse nu sunt inventariate; arhiva nu a fost deschisă. Nu se afirmă epuizarea fiecărei pagini din bibliotecă.
- Totalul colecției: **107 existente + 14 adaptate din fila sursă + 358 noi inspirate**. Cele opt categorii din v1.0 sunt păstrate. Registrul cumulat are 199 duplicate/variante și o excludere tematică; nu include încercări preliminare retrase de cititori înainte de loturile finale, exceptând cele 12 deja documentate în v1.0.
- Consolidarea v1.1 (local: `outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/v1.1/support/consolidated.json`), verificările (local: `outputs/01a0fb5d-c648-7313-908b-50a3c76fb269/v1.1/support/verification.json`), deciziile editoriale și cele trei rapoarte finale sunt păstrate în `v1.1/support/`. Rapoartele sunt evidență de lectură a cititorilor, nu o declarație de recitire independentă a surselor de către consolidator.

## Continuare [ACTUALIZAT]

Etapele YPO și Education sunt încheiate pentru această selecție editorială, după primirea și verificarea tuturor celor șase loturi finale. Punctul de pornire este v1.1. Orice extindere nouă trebuie salvată în altă versiune și deduplicată față de cele 479 de întrebări și registrul de eliminări; nu suprascrie snapshoturile. Selecția pentru publicare și revizia englezei existente rămân acțiuni distincte, neexecutate aici.

Autorizarea din 2 octombrie acoperă workbook-ul local extins și documentarea pentru sesiuni viitoare. Nu acoperă modificarea datelor aplicației, a Google Sheet-ului sursă sau publicarea site-ului. README/SOURCES preexistente au fost păstrate și actualizate incremental; reperul inițial se află în commitul local `a53e4b9`.

## Limita de acces

Nota release-ului consemnează o filă cu date personale în același workbook. Nu descărca și nu citi integral workbook-ul prin conectori. Înaintea unei viitoare citiri, limitează accesul la o filă/un interval verificat ca fără date personale sau folosește un export redactat. Linkul cu `gid` este un reper de navigare, nu o garanție de clasificare a conținutului.
