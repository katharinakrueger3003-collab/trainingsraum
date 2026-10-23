# Übergabe Trainingsraum

Stand: 23.10.2026 · Katharina Krüger

Das Projekt wird auf den privaten Konten gestoppt und soll in die Firmen-Cloud umziehen. Diese Datei hält fest, wo alles steht, damit der Umzug ohne Suchen weitergehen kann.

Ausführliche Projektbeschreibung (Funktionen, Technik, Umzugstabelle, Datenschutz-Punkte): Artifact „Trainingsraum Projektübersicht“, https://claude.ai/artifact/Qut948ccj2nbyYaVgDkYKJ (Stand 21.09.2026).

## 1. Was wir gemacht haben

**Entwicklung (21.07.–21.08.2026)**
- Web-App zum Üben von Gesprächsführung und Einwandbehandlung für die Kundenberater: DISC- und Tier-Persönlichkeitstest, Leitfaden mit 12 Einwand-Playbooks und Produktwissen, Rollenspiel mit 12 KI-Kunden (Sessions à 4 Gespräche, Prequalifying-Karte, Coaching-Feedback, Faktencheck), Quiz mit 16 Situationen, Lernkurve je Berater, Team-Übersicht für die Teamleitung.
- Begleitmaterial „Einwand-Konter-Box“ in `material/` (Gesamttext, Druckversion, Canva-Bauplan, Design-Philosophie).
- Hosting auf Render (Gratis-Tarif), Speicherung der Ergebnisse in Upstash Redis (Gratis-Tarif), KI über die Claude-API.

**21.09.2026**
- Projektübersicht für den Umzug auf Firmenkonten erstellt (Artifact, siehe oben).

**23.10.2026**
- Projekt auf dem Rechner wiedergefunden, Online-Stand geprüft.
- Festgestellt: Upstash hat die Datenbank `trainingsraum` (whole-chimp, AWS eu-central-1) wegen Inaktivität gelöscht. Sie steht in der Upstash-Konsole unter „Inactive“ mit Status DELETED und der Option „Restore or Delete“.
- Neue leere Datenbank `trainingsraum` angelegt (Endpoint `balanced-spaniel-236244.upstash.io`, AWS eu-central-1, Free). Wiederherstellung der alten Daten und Umstellen der Zugangsdaten auf Render wurden bewusst **nicht** mehr durchgeführt, weil das Projekt jetzt gestoppt wird.
- Diese Übergabe geschrieben.
- Dokument für die interne Klärung erstellt: „Trainingsraum – Projektstand und Migration“, https://claude.ai/artifact/6a72JtMgzXSHJf8WLLVmke (Inhalte und Zweck, Technik, Migration, Ideen für die Weiterentwicklung).
- Stand gesichert (siehe unten).

### Sicherung vom 23.10.2026

**GitHub:** Branch `aufraeumen/totes-persona-css` inklusive dieser Übergabe gepusht (Commit 7650e57). `main` ist unverändert, Render wurde dadurch nicht neu ausgerollt.

**ZIP auf OneDrive:** `OneDrive - Everlife GmbH\Desktop\November\Käthe\Trainingsraum_Sicherung\Trainingsraum_Sicherung_2026-10-23.zip` (4,1 MB)

| Inhalt | Was drin ist |
|---|---|
| `Trainingsraum\` | Kompletter Code: `index.html`, `server\`, `material\` (Einwand-Konter-Box), `UEBERGABE.md`, `package.json`, `package-lock.json`, `render.yaml` |
| `Trainingsraum_Git-Historie.bundle` | Vollständige Git-Historie aller Branches in einer Datei (von Git als vollständig geprüft) |
| `Vorversionen_und_Material\` | `trainingsraum.jsx`, `trainingsraum (1).jsx`, `trainingsraum (2).jsx`, `Einwand Konter Box Komplett.pdf`, `einwand-konter-box-cover.png` (aus Downloads) |

Bewusst **nicht** enthalten: `.env` (privater API-Schlüssel) und `node_modules` (wird mit `npm install` neu erzeugt). Berater-Ergebnisse gibt es keine zu sichern: Die Datenbank ist gelöscht, und die alten Ergebnisse müssen laut Entscheidung vom 23.10. nicht mitziehen.

Die Git-Historie aus dem Bundle wiederherstellen, auch ohne Zugriff auf das private GitHub-Konto:

```
git clone Trainingsraum_Git-Historie.bundle trainingsraum
```

## 2. Aktueller Stand

**Was funktioniert**
- Die Seite https://trainingsraum.onrender.com lädt (Render-Dienst `trainingsraum`, Region Oregon, Status Deployed).
- Persönlichkeitstests, Leitfaden und Quiz laufen ohne Speicher.
- Der Code ist vollständig im GitHub-Repository `katharinakrueger3003-collab/trainingsraum` (privates Konto).

**Was nicht funktioniert**
- Speicher: `/api/health` antwortet mit `{"ok":false,"speicher":"upstash","error":"fetch failed"}`. Render zeigt noch auf die gelöschte Upstash-Datenbank. Ergebnisse können weder gespeichert noch geladen werden, Team-Übersicht und Lernkurven sind leer bzw. schlagen fehl.
- Die bisherigen Berater-Ergebnisse liegen nur noch im Backup der gelöschten Upstash-Datenbank; sie werden nicht übernommen (Entscheidung 23.10.).

**Code-Stand**
- Live auf Render läuft `main` (Commit 032b75b, Merge der Lernkurve).
- Branch `aufraeumen/totes-persona-css` (Commit 786637a, entfernt überflüssiges CSS) ist gepusht, aber noch nicht nach `main` gemergt. Diese Übergabe ist auf diesem Branch committet.
- Alter Arbeits-Branch `claude/friendly-edison-945304` (lokaler Worktree unter `.claude/worktrees/`) ist überholt und kann weg.

**Wo was liegt**

| Baustein | Ort | Konto |
|---|---|---|
| Code | `C:\Users\KatharinaKrüger\Trainingsraum` + GitHub `katharinakrueger3003-collab/trainingsraum` | privat |
| Hosting | Render, Dienst `trainingsraum` (srv-d9fltmtaeets73cbp9ng) | privat, Free |
| Speicher | Upstash: alte DB `whole-chimp` (gelöscht, wiederherstellbar), neue DB `balanced-spaniel-236244` (leer) | privat, Free |
| KI | Anthropic API, Modell `claude-opus-4-8` | privater API-Schlüssel |
| Zugangsdaten | Render-Umgebungsvariablen: `ANTHROPIC_API_KEY`, `ADMIN_NAMES`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`; lokal `.env` (nicht im Git) | — |
| Vorversionen | `Downloads\trainingsraum*.jsx`, `Downloads\Einwand Konter Box Komplett.pdf`, `einwand-konter-box-cover.png` | lokal |

## 3. Offene Fragen

1. ~~**Alte Ergebnisse:** Sollen die bisherigen Berater-Ergebnisse mit umziehen?~~ Entschieden 23.10.: Nein, der Neustart beginnt leer.
2. **Ziel-Infrastruktur:** Welche Firmen-Cloud genau (eigenes Render-/Upstash-Firmenkonto oder interne Infrastruktur, z. B. Azure)? Davon hängt ab, ob Server und Speicher angepasst werden müssen.
3. **Speicher in der Firma:** Upstash beibehalten oder durch einen firmeneigenen Speicher ersetzen? Der Server spricht aktuell die Upstash-REST-API an (`server/index.js`, Funktionen `loadProgress`/`saveProgress`).
4. **KI-Konto:** Wer stellt den Anthropic-API-Schlüssel über ein Firmenkonto mit Vertrag zur Auftragsverarbeitung aus?
5. **Datenschutz und Mitbestimmung:** Der Trainingsraum speichert Leistungsdaten einzelner Berater und zeigt sie der Teamleitung. Abstimmung mit Datenschutz und ggf. Betriebsrat vor dem Firmenbetrieb.
6. **Login:** Heute genügt ein eingetippter Name. Anbindung an Microsoft Entra ID (Firmen-Login) gewünscht?
7. **Mail-Funktion:** Session-Feedback per Outlook braucht eine App-Registrierung mit Mail.Send und ein Absender-Postfach durch die IT.
8. **Private Konten:** Wann werden Render-Dienst, Upstash-Datenbanken und der private API-Schlüssel abgeschaltet bzw. gesperrt?

## 4. Nächste Schritte

1. ~~**Daten sichern**~~ Erledigt 23.10.: Code, Historie und Material gesichert (siehe „Sicherung vom 23.10.2026“); alte Ergebnisse werden nicht übernommen.
2. **Code übertragen:** GitHub-Repository per „Transfer“ in die Firmen-Organisation übertragen (Historie bleibt erhalten) oder dort neu anlegen und pushen. Vorher entscheiden, ob `aufraeumen/totes-persona-css` nach `main` gemergt wird.
3. **Hosting neu aufsetzen:** In der Firmen-Cloud einen Node-Dienst anlegen (`npm install`, `npm start`), an das neue Repository koppeln und die vier Umgebungsvariablen setzen. `render.yaml` dient als Vorlage.
4. **Speicher anlegen:** Neue Datenbank im Firmenkonto, gesicherte Daten einspielen, Zugangsdaten beim neuen Hoster hinterlegen. Danach `/api/health` prüfen: Erwartet wird `{"ok":true, ...}`.
5. **KI-Schlüssel tauschen:** Firmen-Schlüssel eintragen, privaten Schlüssel danach in der Anthropic-Konsole sperren. Modell `claude-opus-4-8` ggf. auf ein aktuelles Modell anheben.
6. **Private Konten stilllegen:** Render-Dienst suspendieren oder löschen, Upstash-Datenbanken löschen, sobald die Daten gesichert sind.
7. **Danach:** Firmen-Login, Mail-Funktion und die vorgemerkten Erweiterungen (sechs weitere Lost-Gründe als Rollenspiel, dritter Kunde für den Typ Affe).
