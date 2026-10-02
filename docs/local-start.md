# Lokal starten

Diese Anleitung gilt für die lokale Windows-Entwicklung. Sie richtet sich nach den vorhandenen npm-Skripten in `package.json` und den lokalen Adressen aus `docs/contracts.md`.

## Voraussetzungen

- Windows PowerShell
- Node.js 24
- npm 11
- Abhängigkeiten installierbar aus dem npm-Registry

Bei der Bestandsprüfung waren Node `v24.19.0` und npm `11.17.0` installiert.

## Abhängigkeiten installieren

```powershell
Set-Location D:\DEV\easy-web-assistant
node --version
npm --version
npm ci
```

Der Befehl `npm ci` installiert die im Lockfile festgehaltenen Abhängigkeiten.

## Demo ohne API-Schlüssel

Die vorgesehene Demo läuft mit `DEMO_MODE=true` und benötigt keinen Google-API-Schlüssel. `.env.example` enthält die Platzhalterkonfiguration. Eine vorhandene `.env` nicht überschreiben; sie kann lokale Zugangsdaten enthalten. Schlüssel gehören ausschließlich in die serverseitige `.env`, nie in Variablen mit `VITE_`-Präfix oder in das Repository.

Die Google-Modelle und die Live-Sprachfunktion benötigen jeweils eine passende lokale Konfiguration und reale Prüfungen. Ein eingetragener Schlüssel oder Modellname bestätigt weder den Zugang noch die Funktion. Die optionale Konfigurationsprüfung lautet:

```powershell
npx tsx scripts/google-cloud-preflight.ts
```

Sie zeigt keine Zugangsdaten oder Credential-Pfade an. Die zusätzlichen Optionen `--check-models` und `--check-live` senden echte Modellanfragen; sie sind keine Offline-Prüfungen und sollen nur bewusst ausgeführt werden.

Die lokale Auswahl ist Gemini (`AI_PROVIDER=gemini`) bei `DEMO_MODE=true`. Vertex AI ist nicht als Projektziel ausgewählt. Die reguläre Gemini-API- und Abrechnungsroute ist noch in Klärung; es wurden keine Live-Modellaufrufe bestätigt. Eine vorhandene Konfiguration allein belegt keinen Zugang.

## Entwicklungsserver

```powershell
npm run dev
```

Laut Skript startet Vite auf `http://127.0.0.1:5173` und den Node-WebSocket-Server auf `http://127.0.0.1:3001` (`/ws`). `npm run start` startet nur den Server. Es gibt in der aktuellen `package.json` kein Produktions- oder Deployment-Skript.

**Prüfstatus:** Die aktuelle Unit- und Integrationssuite bestand mit 142/142 Tests in 15 Dateien (`npm test -- --maxWorkers=1`). Ein separater Vite-Build war erfolgreich (2.147 Module; 1,98 Sekunden), enthält aber keinen TypeScript-Check. Ein Profil-Smoke im gebauten Preview bestand mit 1/1 für Setup, Speichern, Neuladen, Bearbeiten, Löschen und Session-only-Fallback. Der Typecheck hing ohne Diagnostik und wurde abgebrochen; ein erfolgreicher `npm run build` ist nicht belegt. Weitere Browser- und Fachabläufe sind noch offen. QA verantwortet Typecheck, Gesamt-Build und Browserläufe; Einzelheiten stehen in [docs/acceptance.md](acceptance.md).

## Lokaler Playwright-Browser

Nur erforderlich, wenn QA die Browserprüfungen freigibt. Der Chromium-Cache soll projektlokal liegen:

```powershell
Set-Location D:\DEV\easy-web-assistant
$env:PLAYWRIGHT_BROWSERS_PATH = ".playwright-browsers"
npx playwright install chromium
```

Das Umgebungsfeld gilt nur für das aktuelle PowerShell-Fenster. Das Installationsskript `test:e2e` setzt denselben Cachepfad für den Testlauf. Playwright-Downloads benötigen Netzwerkzugriff. Der Cache darf nicht eingecheckt werden. Die Playwright-Konfiguration und die E2E-Abnahmetests sind vorhanden, ihre Installation und Ausführung sind laut [QA-Abnahme](acceptance.md) noch nicht geprüft.

Falls der Chromium-Download nicht verfügbar ist, kann die bereits installierte Microsoft-Edge-Version opt-in verwendet werden. Playwright nutzt dann Edge auch für den isolierten Websitebrowser der App:

```powershell
Set-Location D:\DEV\easy-web-assistant
$env:PLAYWRIGHT_CHANNEL = "msedge"
npm run test:e2e
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

Die Playwright-Konfiguration reicht `PLAYWRIGHT_CHANNEL=msedge` an den App-Server als `PLAYWRIGHT_BROWSER_CHANNEL=msedge` weiter. Für einen direkten App-Start ohne Playwright muss der Serverwert im selben PowerShell-Fenster gesetzt werden:

```powershell
$env:PLAYWRIGHT_BROWSER_CHANNEL = "msedge"
npm run dev
```

Der Edge-Kanal ist ein optionaler lokaler Browserweg. Der Chromium-Download scheiterte im QA-Lauf an CDN-Timeouts. Ein späterer Edge-Smoke lud die App, doch die vollständige Browserabnahme ist noch offen. Siehe [docs/acceptance.md](acceptance.md) für den aktuellen Stand.

## Verfügbare Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Vite und Node-Server im Entwicklungsmodus starten |
| `npm run start` | Node-Server starten |
| `npm test` | Vitest-Suite ausführen |
| `npm run test:e2e` | Playwright-Suite ausführen |
| `npm run typecheck` | TypeScript-Prüfung ausführen |
| `npm run build` | Typecheck und Vite-Build ausführen |

Diese Dokumentation führt keine Builds oder Tests aus. Die vollständigen Prüfungen sind QA-eigenständig und sollen bei jedem Ergebnis mit echtem Laufstatus in `docs/acceptance.md` festgehalten werden.
