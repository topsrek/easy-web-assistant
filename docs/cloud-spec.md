# Lokale Google-Konfiguration — PRD 8

Stand: 2. Oktober 2026. Cloud-Manager spezifiziert, sichtbarer Luna-Chat implementiert. Keine internen Subagenten.

## Dateigrenzen

Implementierung ausschließlich `server/config.ts`, `.env.example`, `scripts/google-cloud-*`, `docs/google-cloud-setup.md`, `tests/cloud-config.test.ts`. Manager erstellt `skills/google-cloud-local/SKILL.md` und verwaltet `.env`. Keine Änderungen an package.json, README, shared oder anderem Servercode.

## Konfiguration

Bestehende Exporte config/loadConfig/cloudConfigurationIssues/publicConfigStatus und Felder erhalten. Host bleibt 127.0.0.1. Demo ohne Keys bleibt startbar. Neue Felder gemmaModel und geminiModel. textModel ist kompatibler Alias für gemmaModel. GEMMA_MODEL hat Vorrang vor altem GEMINI_TEXT_MODEL (als dokumentierter Legacy-Alias). GEMINI_MODEL steuert Gespräch/Aufgabensteuerung separat. Defaults Developer API: gemma-4-31b-it, gemini-3.8-flash, gemini-3.8-live. Bestehende Env-Werte niemals still ersetzen. API-Key Priorität GEMINI_API_KEY vor GOOGLE_API_KEY. Keine VITE_-Secrets. Public Status enthält nur sichere Metadaten und keine Credential-Werte oder Credential-Pfade; configured bedeutet Konfiguration vorhanden, nicht Zugang getestet. Vertex darf keine ungeprüfte Gemma-Route behaupten: verlangt explizites GEMMA_MODEL, GEMINI_MODEL und GEMINI_LIVE_MODEL zusätzlich Projekt und ADC; kein stiller Provider-Fallback.

## Preflight

`npx tsx scripts/google-cloud-preflight.ts`: rein lokale Konfigurationsprüfung, Credential-Präsenz nur boolean, keine Keys/Token/rohen Exceptions ausgeben. Exitcode ungleich null wenn Voraussetzungen fehlen; Demo ist möglich, Google-Zugang bleibt dann fehlend. Opt-in `--check-models`: echte minimale generateContent-Aufrufe für Gemma und Gemini; Opt-in `--check-live`: Live-Verbindung mit AUDIO und einem harmlosen Text, kurze Frist, Audioausgabe/Serverantwort und Tool-Fähigkeit getrennt berichten. Ein bloßer Socket-open ist kein nachgewiesenes Audio. Gemma strukturierte Ausgabe/Planung wird per Prompt und JSON-Validierung getestet, nicht angenommene Function-Calling-Unterstützung. Gemini Function Calling per harmloser probe-Funktion testen, ohne reale Aktion. Proben begrenzt, nicht blind wiederholen. Keine Cloud-Ressourcen, IAM, Billing oder API-Aktivierung. Missing ADC oder gcloud offen melden; SDK kann vorhandene ADC auch ohne gcloud verwenden. Errors nur sicher klassifizieren (Auth/Quota/Modell/Timeout/Netzwerk), keine rohen SDK-Details. Testprompts ausschließlich synthetisch.

## Tests und Anleitung

Tests für Demo ohne Key, Env-Aliase/Priorität, separate Modellrollen, ungültige Werte, secretfreier Public Status, Vertex ohne explizite Modelle. Keine Onlinecalls in Tests. Anleitung Deutsch, Windows PowerShell, direkte npx-Befehle, serverseitige .env, AI Studio-Key und alternative ADC-Schritte, Prüfergebnisse ehrlich unterscheiden. Kein gcloud-Installieren ohne Nutzerentscheidung. Modellstatus aus Doku ist keine accountbezogene Verfügbarkeit.

## Geprüfte Primärquellen

Am 2. Oktober 2026 gelesen: https://ai.google.dev/gemini-api/docs/changelog (Gemma 4 am 2. April, Gemini 3.8 Flash am 2. September, Live am 15. September); https://ai.google.dev/gemini-api/docs/live-api/capabilities ; https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api ; https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment ; https://googleapis.github.io/js-genai/release_docs/index.html . Vor SDK-Nutzung installierte Typen prüfen.

## Abnahme

Vitest nur Cloud-Tests, Typecheck (fremde parallele Fehler separat berichten), lokaler Preflight. Echtzugang erst erfolgreich, wenn tatsächliche authentifizierte Modellantworten nachgewiesen; ohne Credentials als offen melden. Ausführliche Resultate im finalen Implementierungsbericht, keine Secrets.
