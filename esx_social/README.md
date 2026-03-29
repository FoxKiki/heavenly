# Heavenly Social fuer lb-tablet / ESX

Heavenly ist als App fuer `lb-tablet` gedacht und nicht als eigenstaendiges Tablet-System.

Die Resource bringt eine Social-App fuer `lb-tablet` mit:
- Registrierung und Login fuer Heavenly-Accounts
- Profilen mit Avatar, Titelbild, Hintergrund, Status und Infobox
- Freundesystem
- Direktnachrichten
- jobgebundenem News-Bereich

## Voraussetzungen

Diese Resource braucht:
- `lb-tablet`
- `es_extended`
- `mysql-async`

In [`fxmanifest.lua`]

## Installation

1. Resource in deinen Server kopieren.
Pfad hier im Projekt: [`esx_social`]
2. SQL importieren.
Die Datei dafuer ist: [`heavenly.sql`]

3. Resource in die `server.cfg` eintragen.
Beispiel:

```cfg
ensure lb-tablet
ensure es_extended
ensure mysql-async
ensure esx_social
```

4. Server oder Resource neu starten.

## Integration in lb-tablet

Heavenly wird ueber `lb-tablet` als App eingebunden.

Wichtig:
- `lb-tablet` muss vor `esx_social` gestartet sein
- die Registrierung der App passiert ueber `client/lb_tablet.lua`
- Heavenly soll ueber das Tablet geoeffnet werden, nicht als separates eigenes System

## Browser-Vorschau

Die Browseransicht ist nur als Vorschau zum Bearbeiten des Frontends gedacht.

Das bedeutet:
- HTML/CSS/JS koennen lokal im Browser getestet werden
- die Browseransicht ist nicht fuer die echte Nutzung im Server gedacht
- die eigentliche Verwendung soll ingame ueber `lb-tablet` erfolgen
- kleine Unterschiede zwischen Browser-Vorschau und FiveM/NUI sind normal

## Datenbank

Es werden diese Tabellen verwendet:
- `heavenly_accounts`
- `heavenly_profiles`
- `heavenly_news`

Wenn du das News-System neu eingebaut hast, musst du die neue Tabelle `heavenly_news` ebenfalls importieren.

## Wichtige Dateien

- Config: [`config.lua`]
- lb-tablet Integration: [`client/lb_tablet.lua`]
- Server-API: [`server/api.lua`]
- Login/Session: [`server/server.lua`]
- NUI-Callbacks: [`client/nui.lua`]
- Frontend API: [`html/js/core/api.js`]

## News-System

Der News-Bereich ist so aufgebaut:
- Lesen: alle Spieler
- Erstellen: nur erlaubte Jobs
- Bearbeiten: Autor oder Leitungsrechte
- Loeschen: Autor oder Leitungsrechte

### News-Jobs einstellen

Die News-Rechte stellst du in [`config.lua`] ein.

Aktuell:

```lua
Config.NewsJobs = {
  "reporter"
}

Config.NewsManagerJobs = {
  "government",
  "newsboss"
}

Config.NewsManagerGrades = {
  "boss"
}
```

### Bedeutung

- `Config.NewsJobs`
Nur diese Jobs duerfen News erstellen.

- `Config.NewsManagerJobs`
Diese Jobs duerfen jede News bearbeiten und loeschen, auch wenn sie nicht selbst der Autor sind.

- `Config.NewsManagerGrades`
Diese Jobgrade duerfen ebenfalls jede News bearbeiten und loeschen.
Praktisch fuer ESX-Chefs wie `boss`.

### Beispiel

Wenn nur Reporter posten sollen, aber nur Leitung alles moderieren darf:

```lua
Config.NewsJobs = {
  "reporter"
}

Config.NewsManagerJobs = {
  "newsboss"
}

Config.NewsManagerGrades = {
  "boss"
}
```

Dann gilt:
- Reporter kann News schreiben
- Autor kann seine eigene News spaeter bearbeiten/loeschen
- Boss oder `newsboss` kann alle News moderieren

## Profile und Privatsphaere

Im Profil gibt es eine Sichtbarkeit:
- `Oeffentlich`
- `Nur Freunde`

Wenn ein Profil auf `Nur Freunde` steht:
- Posts sind nur fuer Freunde sichtbar
- Infobox-Daten wie Beziehung, Geburtstag, Beruf und Ueber mich sind ebenfalls nur fuer Freunde sichtbar

## Bilder und Medien

Im Profil koennen gesetzt werden:
- Profilbild
- Titelbild
- Profil-Hintergrund

Die Bilder werden im Frontend bereits verkleinert/komprimiert, damit `localStorage` bzw. NUI nicht sofort an Speichergrenzen laeuft.

## Typischer Ablauf fuer den ersten Start

1. SQL importieren
2. `ensure lb-tablet` und `ensure esx_social` in die `server.cfg`
3. Server starten
4. Ingame `lb-tablet` oeffnen
5. Heavenly-Account registrieren
6. Einloggen
7. Profil einrichten
8. News-Rechte ueber [`config.lua`] an deinen Server anpassen

## Fehlerbehebung

### News oeffnen geht, aber nichts wird gespeichert

Pruefen:
- Wurde `heavenly_news` importiert?
- Ist dein Spielerjob in `Config.NewsJobs`?
- Wurde die Resource nach der Config-Aenderung neu gestartet?

### Blockliste oder Profilfunktionen reagieren nicht

Pruefen:
- Resource neu starten
- Browser/NUI hart neu laden
- Konsole auf JS-Fehler pruefen

### Bilder lassen sich setzen, aber erscheinen nicht korrekt

Pruefen:
- Resource neu starten
- altes Browser-Caching leeren
- bei lokalen Tests sicherstellen, dass die `html/assets/...`-Pfade stimmen

## Hinweis fuer spaetere Erweiterungen

Das News-System ist bewusst so aufgebaut, dass du spaeter leicht erweitern kannst:
- Kategorien
- mehrere News-Rollen
- Kommentare unter News
- feste News-Redaktionen pro Fraktion
- nur Leitungsjobs duerfen loeschen, normale Redakteure nur bearbeiten
