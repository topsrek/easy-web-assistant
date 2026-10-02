# easy-web-assistant

Ein lokaler Sprach- und Textassistent, der Informationen zu Veranstaltungen, Reisen und Arztterminen in einer zugänglichen Chatoberfläche aufbereiten soll. Dieses Projekt folgt aktuell dem [PRD V0.3](easy-web-assistant-prd.md). Die Erweiterungen Behörden, Dienstleistungen und Freizeit sind dort beschrieben; ihre Abnahme ist separat erforderlich.

## Aktueller Lieferstand

Oberfläche, lokale Profilverwaltung, A2UI-Karten, kontrollierte fiktionale Testangebote sowie die Servermodule und Modellkonfiguration sind vorhanden. Die jüngste QA-Unit- und Integrationssuite bestand mit **142/142 Tests in 15 Dateien** (`npm test -- --maxWorkers=1`). Ein eigenständiger Vite-Build bündelte **2.147 Module** erfolgreich in 1,98 Sekunden; das JavaScript-Bundle beträgt 605 kB (173 kB gzip). Dieser Vite-Lauf umgeht den weiterhin nicht bestätigten Typecheck und ist kein erfolgreicher `npm run build`-Nachweis. Ein begrenzter Profil-Smoke im gebauten Preview bestand mit **1/1** und prüfte Setup, Speichern, Neuladen, Bearbeiten, Löschen sowie Session-only-Fallback. Weitere Browser- und Fachabläufe sowie die Ende-zu-Ende-Abnahme bleiben offen. Für die Erweiterungen aus PRD V0.3 gibt es Entwurfsfälle; ihre Integration ist noch nicht vollständig.

Es gibt noch keine geprüfte Integration mit einer bestehenden Anbieterwebsite. Die Demo verwendet ausschließlich klar gekennzeichnete fiktionale Testangebote und darf nicht als reale Verfügbarkeit, Buchung oder Zahlung verstanden werden. Einen detaillierten Überblick enthält [docs/integration-limits.md](docs/integration-limits.md); die Windows-Anleitung steht in [docs/local-start.md](docs/local-start.md).

## Voraussetzungen und Start

Vorgesehene lokale Umgebung: Windows, Node.js 24 und npm 11. In der zuletzt geprüften Umgebung waren Node `v24.19.0` und npm `11.17.0` installiert. Der vorgesehene Entwicklungsstart lautet:

```powershell
Set-Location D:\DEV\easy-web-assistant
npm ci
npm run dev
```

`dev` startet Vite und den lokalen Node-Server. Die Startfähigkeit ist derzeit nicht bestätigt; bitte beachte den aktuellen Lieferstand und die [Startanleitung](docs/local-start.md). Es gibt keine Anmeldung und für die fiktionale Demo wird kein API-Schlüssel benötigt. Es findet kein Deployment statt.

## Datenschutz und Freigaben

Das Profil ist für versionierte Speicherung im LocalStorage des jeweiligen Browsers vorgesehen. Profilangaben werden für einen Auftrag nach Anwendungsfall eingegrenzt; Modellverarbeitung und Übertragung an eine Zielwebsite sind unterschiedliche Schritte. Vor einer zustandsändernden Aktion soll eine Prüfübersicht den Anbieter, die konkreten übermittelten Felder, Kosten und unbekannten Kosten, Folgen und die ausdrücklich zu bestätigende Aktion nennen. Die Demo nutzt künstliche Angebots- und Personendaten.

## Modellrollen

Die lokale Konfiguration führt Gemini für Gespräch und Aufgabensteuerung, Gemma für Websiteinterpretation und Informationsaufbereitung sowie ein separat konfiguriertes Gemini Live-Modell für Sprache. Konfigurationswerte bedeuten nicht, dass Zugang, Modellantworten oder Audioverarbeitung erfolgreich geprüft wurden. Details stehen in [docs/google-cloud-setup.md](docs/google-cloud-setup.md).

Die Zuordnung des Google-Cloud-/GDG-Guthabens und der genaue API-Zugang sind noch offen. Eine automatische Umstellung auf Vertex wurde zurückgenommen; der Demo-Modus bleibt aktiv und unbestätigte lokale Keys bleiben deaktiviert.

## Entwicklung

Die verfügbaren npm-Skripte sind in `package.json` definiert: `dev`, `start`, `test`, `test:e2e`, `typecheck` und `build`. Umfassende Projektprüfungen einschließlich Typecheck und Build gehören laut Projektvertrag ausschließlich zu QA. Unit- und Integrationstests sowie der isolierte Vite-Build sind erfolgreich; Typecheck, vollständiger npm-Build und Browserabnahme bleiben offen. Siehe den aktuellen [QA-Prüfstatus](docs/acceptance.md).
