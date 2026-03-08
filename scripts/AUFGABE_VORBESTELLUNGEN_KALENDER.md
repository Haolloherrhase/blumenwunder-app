# Aufgabe: Vorbestellungen + Kalender auf dem Dashboard

## Ziel
Kunden sollen Blumen vorbestellen können (z.B. "20 Rosen für Samstag"). Die Vorbestellungen erscheinen als Kalender-Widget auf dem Dashboard, damit man immer sieht was die nächsten Tage ansteht.

---

## TEIL 1: Datenbank — Neue Tabelle `orders`

```sql
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    description TEXT NOT NULL,           -- Was bestellt wurde, z.B. "20 rote Rosen + Schleife"
    total_price NUMERIC(10,2) NOT NULL,  -- Vereinbarter Preis
    pickup_date DATE NOT NULL,           -- Abholdatum
    pickup_time TEXT,                    -- Optionale Uhrzeit, z.B. "14:00"
    status TEXT DEFAULT 'offen',         -- 'offen', 'fertig', 'abgeholt', 'storniert'
    notes TEXT,                          -- Interne Notizen
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own orders" ON orders FOR ALL USING (auth.uid() = user_id);
```

---

## TEIL 2: Vorbestellungs-Seite — `src/pages/Orders.tsx` (NEU)

### Erreichbar über:
- Navigation: Neues Nav-Item **📋 Bestellungen** (zwischen Bestand und Analyse)
- ODER: Über "Mehr"-Seite als Link

### Ansicht: Liste aller Vorbestellungen

```
┌──────────────────────────────────┐
│  📋 Vorbestellungen         [+] │
├──────────────────────────────────┤
│                                  │
│  ── Heute (Sa, 8. März) ──────  │
│  ┌────────────────────────────┐ │
│  │ 🟢 Frau Müller    14:00   │ │
│  │ 20x Rosen rot + Schleife  │ │
│  │ 45,00 €    📞 0176...     │ │
│  │ [ Fertig ] [ Abgeholt ]   │ │
│  └────────────────────────────┘ │
│                                  │
│  ── Morgen (So, 9. März) ─────  │
│  ┌────────────────────────────┐ │
│  │ 🟡 Herr Schmidt           │ │
│  │ Geburtstagsstrauß bunt    │ │
│  │ 35,00 €    📞 0151...     │ │
│  └────────────────────────────┘ │
│                                  │
│  ── Mi, 12. März ─────────────  │
│  ┌────────────────────────────┐ │
│  │ 🟡 Hochzeit Bauer         │ │
│  │ Brautstrauß + Tischdeko   │ │
│  │ 280,00 €   📞 0172...     │ │
│  └────────────────────────────┘ │
│                                  │
└──────────────────────────────────┘
```

**Status-Farben:**
- 🟡 `offen` — Noch zu erledigen
- 🟢 `fertig` — Vorbereitet, wartet auf Abholung
- ✅ `abgeholt` — Erledigt (ausgegraut)
- 🔴 `storniert` — Storniert (durchgestrichen)

**Sortierung:** Nach `pickup_date` aufsteigend (nächster Termin oben)

**Filter:** Standardmäßig nur offene/fertige Bestellungen. Option "Erledigte anzeigen" zum Einblenden.

### Neue Bestellung erstellen — Modal

```
┌──────────────────────────────────┐
│  📋 Neue Bestellung         [X] │
├──────────────────────────────────┤
│                                  │
│  Kundenname *                    │
│  [ Frau Müller              ]   │
│                                  │
│  Telefon                         │
│  [ 0176 12345678            ]   │
│                                  │
│  Was wird bestellt? *            │
│  [ 20x Rosen rot + Schleife ]   │
│                                  │
│  Abholdatum *                    │
│  [ 08.03.2026  ]                │
│                                  │
│  Uhrzeit (optional)              │
│  [ 14:00       ]                │
│                                  │
│  Preis (€) *                     │
│  [ 45,00       ]                │
│                                  │
│  Notizen (intern)                │
│  [ Lieblingskundin, mag pink ]  │
│                                  │
│  [ 💾 Bestellung speichern ]    │
│                                  │
└──────────────────────────────────┘
```

### Bestellung bearbeiten
- Tippen auf eine Bestellung → gleiches Modal öffnet sich mit vorausgefüllten Daten
- Status kann geändert werden (offen → fertig → abgeholt)
- Bestellung kann storniert werden

### Supabase Queries

```typescript
// Alle offenen/fertigen Bestellungen laden (sortiert nach Abholdatum)
const fetchOrders = async () => {
    const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['offen', 'fertig'])
        .gte('pickup_date', new Date().toISOString().split('T')[0]) // Ab heute
        .order('pickup_date', { ascending: true });
    if (data) setOrders(data);
};

// Neue Bestellung
const createOrder = async (order: Partial<Order>) => {
    const { error } = await supabase.from('orders').insert({
        user_id: user?.id,
        ...order,
    });
    if (error) throw error;
    fetchOrders();
};

// Status ändern
const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) throw error;
    fetchOrders();
};
```

---

## TEIL 3: Kalender-Widget auf dem Dashboard

### Platzierung
Zwischen dem Kassenstand und der Tagesliste auf dem Dashboard.

### Anzeige
- Zeigt die **nächsten 7 Tage** als kompakte Leiste
- Tage mit Bestellungen sind markiert (Punkt oder Zahl)
- Darunter: Liste der Bestellungen für heute und morgen

```
┌──────────────────────────────────┐
│  📅 Kommende Bestellungen        │
│                                  │
│  Mo  Di  Mi  Do  Fr  Sa  So     │
│  10  11  12  13  14  15  16     │
│       •       •   •             │
│                                  │
│  ── Heute ───────────────────── │
│  14:00 Frau Müller — Rosen 45€  │
│                                  │
│  ── Morgen ──────────────────── │
│  Herr Schmidt — Strauß 35€     │
│                                  │
│  → Alle Bestellungen            │
└──────────────────────────────────┘
```

### Technisch

```typescript
// Im Dashboard: Nächste 7 Tage Bestellungen laden
const [upcomingOrders, setUpcomingOrders] = useState<Order[]>([]);

const fetchUpcomingOrders = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['offen', 'fertig'])
        .gte('pickup_date', today)
        .lte('pickup_date', nextWeekStr)
        .order('pickup_date', { ascending: true });

    if (data) setUpcomingOrders(data);
};

// In useEffect mit fetchTodayData zusammen aufrufen
```

### Wochenleiste-Komponente

```tsx
const WeekStrip = ({ orders }: { orders: Order[] }) => {
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    return (
        <div className="flex justify-between">
            {days.map((day, i) => {
                const dateStr = day.toISOString().split('T')[0];
                const dayOrders = orders.filter(o => o.pickup_date === dateStr);
                const isToday = i === 0;

                return (
                    <div key={i} className={`flex flex-col items-center px-2 py-1 rounded-xl ${
                        isToday ? 'bg-primary/10' : ''
                    }`}>
                        <span className="text-[10px] text-gray-400 uppercase">
                            {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                        </span>
                        <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-gray-700'}`}>
                            {day.getDate()}
                        </span>
                        {dayOrders.length > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
```

### "Alle Bestellungen" Link
```tsx
<button
    onClick={() => navigate('/orders')}
    className="text-xs text-primary font-medium hover:underline mt-2"
>
    → Alle Bestellungen anzeigen
</button>
```

---

## TEIL 4: Route + Navigation

### App.tsx — Neue Route
```typescript
import Orders from './pages/Orders';

<Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
```

### Navigation — Neues Item
In `Layout.tsx`, füge hinzu:
```
📋 Bestellungen → /orders
```

Die Navigation hat dann 6 Items:
1. 🏠 Dashboard
2. 📦 Eingang
3. 📋 Bestellungen (NEU)
4. 📋 Bestand
5. 📊 Analyse
6. ⚙️ Mehr

ODER: Falls 6 Items zu viel sind für die Bottom-Navigation, kann "Bestellungen" auch über die "Mehr"-Seite erreichbar sein und nur das Kalender-Widget ist auf dem Dashboard.

---

## Dateien-Übersicht

| Datei | Aktion |
|-------|--------|
| Supabase Migration | **NEU** — `orders`-Tabelle erstellen |
| `src/pages/Orders.tsx` | **NEU** — Bestellungsseite mit Liste + Modal |
| `src/pages/Dashboard.tsx` | **ÄNDERN** — Kalender-Widget + upcoming Orders laden |
| `src/App.tsx` | **ÄNDERN** — Route `/orders` hinzufügen |
| `src/components/layout/Layout.tsx` | **ÄNDERN** — Nav-Item hinzufügen |

## Checkliste
- [ ] `orders`-Tabelle in Supabase erstellt mit RLS
- [ ] Bestellungsseite: Liste aller offenen Bestellungen, sortiert nach Datum
- [ ] Neue Bestellung erstellen: Name, Telefon, Beschreibung, Datum, Uhrzeit, Preis
- [ ] Bestellung bearbeiten + Status ändern (offen → fertig → abgeholt)
- [ ] Bestellung stornieren möglich
- [ ] Dashboard: Wochenleiste zeigt nächste 7 Tage mit Punkten bei Bestellungen
- [ ] Dashboard: Heute/Morgen-Bestellungen unter der Leiste aufgelistet
- [ ] Link "Alle Bestellungen" führt zu /orders
- [ ] Navigation enthält Bestellungen
- [ ] Keine TypeScript-Fehler
