# Blumenwunder App - Setup für Entwickler

Willkommen im **Blumenwunder App** Projekt! Diese Anleitung hilft dir, die App lokal zum Laufen zu bringen.

## 📋 Voraussetzungen

Stelle sicher, dass du Folgendes installiert hast:
- **Node.js** (Version 18 oder höher) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **GitHub Account** - [Registrieren](https://github.com/)

## 🚀 Setup-Anleitung

### 1. Repository klonen

```bash
git clone https://github.com/Haolloherrhase/blumenwunder-app.git
cd blumenwunder-app
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Umgebungsvariablen einrichten

Kopiere die `.env.example` Datei zu `.env`:

```bash
cp .env.example .env
```

Öffne die `.env` Datei und füge die Supabase-Credentials ein:

```env
VITE_SUPABASE_URL=https://oigoxrgstbkpaheabpwv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZ294cmdzdGJrcGFoZWFicHd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODE3NzAsImV4cCI6MjA4NTM1Nzc3MH0.MRZYsP6w3fGHkCFHxMb71hNpErGxe2VMDSpyLV14ALY
```

> ⚠️ **Wichtig:** Die `.env` Datei ist in `.gitignore` und wird NICHT ins Repository gepusht!

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft jetzt auf: **http://localhost:5173**

## 🗄️ Datenbank (Supabase)

Die App nutzt **Supabase** als Backend:
- **Dashboard**: https://supabase.com/dashboard/project/oigoxrgstbkpaheabpwv
- **Zugriff**: Frag den Projektinhaber, dich zum Supabase-Projekt hinzuzufügen

### Datenbank-Schema anwenden

Falls die Datenbank leer ist, führe die Migration aus:

1. Geh zum Supabase Dashboard
2. Öffne den **SQL Editor**
3. Kopiere den Inhalt von `supabase/migrations/001_initial_schema.sql`
4. Führe das SQL-Skript aus

## 📦 Wichtige Befehle

| Befehl | Beschreibung |
|--------|--------------|
| `npm run dev` | Startet den Entwicklungsserver |
| `npm run build` | Baut die App für Production |
| `npm run preview` | Vorschau der Production-Build |

## 🌿 Git Workflow

### Branch erstellen

```bash
git checkout -b feature/dein-feature-name
```

### Änderungen committen

```bash
git add .
git commit -m "feat: beschreibung deiner änderung"
```

### Pushen und Pull Request erstellen

```bash
git push origin feature/dein-feature-name
```

Dann auf GitHub einen **Pull Request** erstellen.

## 🏗️ Projekt-Struktur

```
blumenwunder-app/
├── src/
│   ├── components/       # Wiederverwendbare UI-Komponenten
│   │   ├── ui/          # Basis-Komponenten (Button, Input, Card)
│   │   ├── layout/      # Layout-Komponenten (Header, BottomNav)
│   │   ├── dashboard/   # Dashboard-spezifische Komponenten
│   │   ├── inventory/   # Inventar-Komponenten
│   │   ├── pos/         # POS/Verkauf-Komponenten
│   │   └── purchase/    # Wareneingang-Komponenten
│   ├── pages/           # Seiten/Views
│   ├── contexts/        # React Contexts (z.B. AuthContext)
│   ├── lib/             # Utilities (z.B. Supabase Client)
│   └── App.tsx          # Haupt-App-Komponente
├── supabase/
│   └── migrations/      # Datenbank-Migrationen
└── public/              # Statische Assets
```

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router DOM
- **Icons**: Heroicons
- **Deployment**: Vercel

## 📱 Features

- ✅ **Authentifizierung** (Login/Signup)
- ✅ **Dashboard** (Umsatz, Verkäufe, Low-Stock-Warnung)
- ✅ **Inventar** (Produkte & Materialien verwalten)
- ✅ **Verkauf (POS)** (Produkte verkaufen, Warenkorb, Checkout)
- ✅ **Wareneingang** (Neue Ware ins Lager buchen)
- 🚧 **Strauß-Konfigurator** (In Entwicklung)
- 🚧 **Lieferanten** (Geplant)

## 🐛 Probleme?

Falls du Probleme hast:
1. Stelle sicher, dass alle Dependencies installiert sind: `npm install`
2. Prüfe, ob die `.env` Datei korrekt ist
3. Lösche `node_modules` und installiere neu:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## 📞 Kontakt

Bei Fragen wende dich an den Projektinhaber!

---

**Viel Erfolg beim Entwickeln! 🌸**
