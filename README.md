# Planner — Microsoft Planner / ClickUp clone

Aplikacija za upravljanje projektima i zadacima sa Kanban prikazom, komentarima, materijalima i istorijom aktivnosti. Predviđena je za buduću integraciju u Microsoft Teams kao tab.

## Tehnologije

- **Backend**: Python 3.11+ • FastAPI • Supabase (PostgreSQL + Storage)
- **Frontend**: React 18 + TypeScript • Vite • @dnd-kit (Kanban drag-and-drop) • axios • React Router
- **Auth**: JWT (bcrypt hash lozinki)

## Struktura projekta

```
aplikacija/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI rute (auth, users, projects, tasks, comments, materials, activities)
│   │   ├── core/           # config, database (Supabase), security (JWT, password hashing)
│   │   ├── models/         # Pydantic modeli
│   │   ├── schemas_sql/    # init.sql za Supabase
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── api/            # axios klijent + endpoint funkcije
    │   ├── components/     # KanbanBoard, Modal, TaskDetailModal, CommentsList, MaterialsPanel, ...
    │   ├── context/        # AuthContext
    │   ├── pages/          # Login, Register, Dashboard, ProjectList, ProjectDetail
    │   └── types.ts
    ├── package.json
    └── vite.config.ts
```

## Funkcionalnosti

- **Korisnici**: registracija / prijava, JWT
- **Projekti**: kreiranje, uređivanje, datumi početka/završetka, članovi, arhiviranje, brisanje, statusi (active / completed / archived), progres bar
- **Zadaci**: CRUD, statusi (Izrada dizajna → Na odobrenju → Poslano na print → Spremno za preuzimanje → Postavljeno na lokaciju), prioriteti (Low / Medium / High / Urgent), izvršilac, rok, **podzadaci**, filtriranje
- **Kanban board**: 5 kolona, **drag-and-drop** premještanje, filteri po izvršiocu / prioritetu / pretraga
- **Komentari**: po zadatku, **@mentions**, brisanje vlastitih
- **Materijali**: upload (Supabase Storage), download, brisanje, vezivanje za projekat ili pojedini zadatak
- **Istorija aktivnosti**: log svih važnih radnji po projektu

---

## 1) Supabase setup

1. Otvori [https://supabase.com](https://supabase.com) i kreiraj novi projekat.
2. U **SQL editoru** pokreni `backend/app/schemas_sql/init.sql`.
3. U **Storage** kreiraj novi **bucket** pod nazivom `materials` (privatan).
4. Iz **Project settings → API** pokupi:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` ključ → `SUPABASE_KEY` (drži ga u tajnosti, koristi se samo na serveru)

## 2) Backend (FastAPI)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# popuni SUPABASE_URL, SUPABASE_KEY, JWT_SECRET u .env
uvicorn app.main:app --reload --port 8000
```

API dokumentacija (Swagger): http://localhost:8000/docs

## 3) Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev
```

Frontend ide na http://localhost:5173 i proxy-uje `/api/*` na `http://localhost:8000` (vidi `vite.config.ts`).

## 4) Početak korištenja

1. Otvori http://localhost:5173
2. Klikni **Registrujte se** i napravi prvi račun (postaje vlasnik svih projekata koje kreira).
3. Kreiraj nekoliko korisnika (registracija svakog) → kasnije ih možeš dodati kao članove projekta.
4. Kreiraj projekat → dodaj članove → kreiraj zadatke → koristi Kanban za drag-and-drop.

---

## Microsoft Teams integracija (planirano)

Aplikacija je dizajnirana da se može hostati kao Teams tab — frontend se otvori unutar `<iframe>` u kanalu. Za uključivanje:

1. Dodati Teams JS SDK na frontend, pozvati `microsoftTeams.initialize()` u `main.tsx`.
2. Registrovati app u **Azure AD** (App Registration) za SSO.
3. Kreirati `manifest.json` za Teams sa `staticTabs` ili `configurableTabs` na URL frontenda.
4. Backend treba prihvatati AAD tokene umjesto/uz lokalni JWT (`/api/auth/teams-sso`).
5. Pakirati `manifest.json` + ikone u zip i uploadovati u Teams Admin Center.

Trenutno radi kao standalone web app — sve API endpointe je dovoljno prebaciti na HTTPS i postaviti `CORS_ORIGINS` na Teams origin (`https://teams.microsoft.com`).

## Status zadataka — semantika

- `design` — Izrada dizajna (početni status)
- `approval` — Na odobrenju
- `sent_to_print` — Poslano na print
- `ready_pickup` — Spremno za preuzimanje
- `placed` — Postavljeno na lokaciju (broji se u `completed_task_count`)

Za postojeće baze pokreni `backend/app/schemas_sql/migrate_task_statuses.sql` u Supabase SQL editoru.

## Prioriteti

`low`, `medium` (default), `high`, `urgent` — vidljivi kao colored chip na svakom Kanban kartonu.
