# Blumenwunder — Briefing: Umbau der Hauptseite (Dashboard)

## Ziel
Die bestehende Dashboard-Seite (`src/pages/Dashboard.tsx`) soll durch eine neue, vereinfachte **Tagesansicht** ersetzt werden. Der Rest der App bleibt unverändert.

---

## Neue Hauptseite — Anforderungen

### 1. Kassenstand (oben, prominent)
- **Startbetrag**: 200 € (hartcodiert oder konfigurierbar)
- **Laufender Saldo**: `200 € + Tagesverkäufe − Tageseinkäufe`
- Wird live aktualisiert bei jedem neuen Verkauf/Einkauf
- Gut sichtbar, große Schrift, z.B. als Card oben auf der Seite
- Zeigt das heutige Datum an

### 2. Tagesliste (Mitte)
- Liste aller Verkäufe des heutigen Tages
- Jeder Eintrag zeigt: **Kategorie** + **Betrag** (z.B. "Deko — 12 €", "Blumen — 38 €")
- Einträge sind nach **Kategorien gruppiert** dargestellt:
  - **Schnittblumen** (Kategorie)
  - **Topfpflanzen** (Kategorie)
  - **Deko** (Kategorie)
- Sortierung: neueste Einträge oben (oder chronologisch, je nach Übersichtlichkeit)
- Am Ende jeder Kategorie optional: **Zwischensumme** pro Kategorie

### 3. Verkauf-Button (unten, sticky)
- Fester Button am unteren Bildschirmrand: **"Verkauf"**
- Beim Klicken öffnet sich ein einfaches Modal/Formular:
  - **Kategorie auswählen**: Schnittblumen / Topfpflanzen / Deko (Dropdown oder Buttons)
  - **Betrag eingeben**: Numerisches Feld (€)
  - **Optionale Notiz/Beschreibung**: z.B. "3x Rosen"
  - **Speichern-Button**
- Nach dem Speichern:
  - Eintrag erscheint sofort in der Tagesliste
  - Kassenstand wird aktualisiert
  - Modal schließt sich

### 4. Einkauf-Button (separater Zugang, NICHT prominent auf der Hauptseite)
- Der Einkauf soll über die Navigation erreichbar sein (z.B. über "Mehr" oder eigenes Menü-Item), aber **nicht auf der Hauptseite** stehen
- Die bestehende Einkaufsseite (`/purchase`) kann beibehalten oder vereinfacht werden
- Einkaufs-Formular enthält: **Artikelname**, **Menge**, **Preis pro Stück** → **Gesamtpreis** wird automatisch berechnet
- Einkäufe werden vom Kassenstand abgezogen

---

## Technische Umsetzung

### Datenbank (Supabase)
- Nutze die bestehende `transactions`-Tabelle für Verkäufe
- Stelle sicher, dass jede Transaktion folgende Felder hat:
  - `transaction_type`: 'sale' oder 'purchase'
  - `category`: 'schnittblumen', 'topfpflanzen', oder 'deko'
  - `total_price`: Betrag in €
  - `description`: optionale Notiz
  - `created_at`: Timestamp (für Tagesfilterung)
  - `user_id`: aus AuthContext

### Tagesfilter
- Nur Transaktionen von **heute** anzeigen (`created_at` >= Tagesbeginn)
- Kassenstand basiert nur auf heutigen Transaktionen

### Kassenstand-Berechnung
```
Kassenstand = 200 + SUM(Verkäufe heute) - SUM(Einkäufe heute)
```

Hinweis: Verkäufe werden **addiert** (Geld kommt rein), Einkäufe werden **subtrahiert** (Geld geht raus).

### Kategorien
Definiere als Enum oder Konstante:
```typescript
const CATEGORIES = [
  { id: 'schnittblumen', label: 'Schnittblumen', icon: '✂️' },
  { id: 'topfpflanzen', label: 'Topfpflanzen', icon: '🪴' },
  { id: 'deko', label: 'Deko', icon: '🎀' },
] as const;
```

---

## UI/UX Hinweise

### Layout der neuen Dashboard-Seite
```
┌─────────────────────────────┐
│  📅 Heute, 17. Februar 2026 │
│                             │
│   Kassenstand               │
│   ████  247,00 €  ████     │
│   (Start: 200 € | +85 -38) │
├─────────────────────────────┤
│                             │
│  ✂️ Schnittblumen            │
│  ├─ 3x Rosen ........  15 €│
│  ├─ Tulpen ..........  23 €│
│  └─ Summe:            38 €│
│                             │
│  🪴 Topfpflanzen             │
│  └─ (keine Verkäufe)       │
│                             │
│  🎀 Deko                     │
│  ├─ Vase .............  12 €│
│  ├─ Kerzen ...........  35 €│
│  └─ Summe:            47 €│
│                             │
├─────────────────────────────┤
│                             │
│    [ 🛒 Verkauf erfassen ]   │  ← Sticky Button
│                             │
└─────────────────────────────┘
```

### Design-Richtlinien
- Verwende das bestehende Tailwind-Design der App (gleiche Farben, Schriften, Abstände)
- Mobile-first (die App wird hauptsächlich auf Tablet/Handy genutzt)
- Kassenstand: große, gut lesbare Zahl
- Kategorien visuell voneinander getrennt (Cards oder Sections)
- Verkauf-Button: auffällig, farbig, leicht erreichbar (sticky bottom)

---

## Was NICHT geändert werden soll
- **Routing**: Alle bestehenden Routen bleiben (`/sale`, `/purchase`, `/inventory`, etc.)
- **Navigation/Layout**: `Layout.tsx` bleibt gleich
- **Andere Seiten**: Sale, Purchase, Bouquet, Inventory, Analytics, etc. bleiben unverändert
- **Auth**: Login/Signup bleibt gleich
- **Supabase-Konfiguration**: Bleibt gleich

---

## Zusammenfassung der Änderungen
1. **`src/pages/Dashboard.tsx`** — komplett neu schreiben (Tagesansicht mit Kassenstand, Tagesliste, Verkauf-Button)
2. **Eventuell neue Datei**: `src/components/dashboard/SaleEntryModal.tsx` — Modal für schnellen Verkaufseintrag
3. **Eventuell Datenbank-Anpassung**: Falls die `transactions`-Tabelle kein `category`-Feld hat, muss dieses hinzugefügt werden (ALTER TABLE oder neue Spalte über Supabase Dashboard)
4. **Kategorien-Konstante**: z.B. in `src/types/` oder direkt in der Dashboard-Datei

---

## Fragen, die beim Umsetzen geklärt werden müssen
- Hat die `transactions`-Tabelle bereits ein `category`-Feld? Falls nein, bitte hinzufügen.
- Soll der Startbetrag (200 €) hartcodiert oder in einer Settings-Tabelle gespeichert werden?
- Soll es eine Zahlungsmethode (Bar/Karte) beim schnellen Verkauf geben, oder ist das hier egal?
