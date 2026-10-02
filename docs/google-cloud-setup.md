# Google AI lokal einrichten

Diese Anleitung gilt für die lokale Entwicklungsumgebung unter Windows. Die App bleibt auch ohne Google-Zugang im Demo-Modus startbar. Ein hier als `configured` angezeigter Provider ist nur konfiguriert; erst eine erfolgreiche Modellantwort bestätigt tatsächlichen Zugang.

Aktueller Kontostand vom 2. Oktober 2026: Das gewünschte Projekt `easy-web-assistant-demo-2026` ist aktiv und hat aktives Billing. Weder Gemini Developer API noch Vertex AI ist dort aktiviert. Der Nutzer hat die automatische Ableitung „Google Cloud bedeutet Vertex“ zurückgewiesen; die genaue API-Zuordnung und der Geltungsbereich des als „GDG“ bezeichneten Guthabens werden noch geklärt. Die lokale Vertex-Umstellung wurde zurückgenommen, der begonnene ADC-Login abgebrochen, vorhandene unbestätigte Key-Zeilen in `.env` erhalten und auskommentiert. `DEMO_MODE=true` bleibt aktiv. Die folgenden Optionen beschreiben technische Alternativen, keine bereits bestätigte Konto- oder Credit-Berechtigung.

Das Konto wurde per CLI identifiziert: Nur ein Billing-Konto ist offen; sein Name enthält `GDP`, eine Credit-Bezeichnung und das heutige Datum. Das gewünschte Projekt ist bereits genau damit verbunden. UUIDs und mögliche Grant-Codes werden nicht dokumentiert. Die Aussage „nur heute verfügbar“ stammt vom Nutzer; ein Datum im Kontonamen bestätigt weder Grant-Ablauf noch Zeitzone. Scope und Ablauf bleiben offen, weil beide verfügbaren Browser-/Computer-Use-Helfer beim Start scheitern und die öffentliche Billing-API diese Grant-Felder nicht anbietet. Die konkrete Rückfrage betrifft ausschließlich Scope und End date auf der Credits-Seite.

## Modellrollen und Standardwerte

- **Gemma** (`GEMMA_MODEL`, Standard `gemma-4-31b-it`): Websiteinformationen strukturieren und einen geprüften Plan als JSON ausgeben.
- **Gemini** (`GEMINI_MODEL`, Standard `gemini-3.8-flash`): Gespräch und Aufgabensteuerung.
- **Gemini Live** (`GEMINI_LIVE_MODEL`, Standard `gemini-3.8-live`): Echtzeit-Sprache.

Die Standardwerte stammen aus der für dieses Projekt geprüften Modellspezifikation. Ein Modellname in der Konfiguration bestätigt weder seine Verfügbarkeit für ein bestimmtes Konto noch Quote, Region oder Funktion.

`GEMINI_TEXT_MODEL` bleibt als veralteter Alias für Gemma erhalten. `GEMMA_MODEL` hat Vorrang. Für den Gemini-API-Key gilt `GEMINI_API_KEY` vor `GOOGLE_API_KEY`. Schlüssel gehören ausschließlich in die serverseitige `.env`; niemals `VITE_` voranstellen.

## Option A: Gemini Developer API mit AI Studio

1. Öffne [Google AI Studio](https://aistudio.google.com/) und erstelle oder wähle ein API-Projekt. Erstelle dort einen Gemini API Key.
2. Kopiere `.env.example` nach `.env`, falls `.env` noch nicht existiert.
3. Trage den Schlüssel in `.env` als `GEMINI_API_KEY` ein. Ändere Modellnamen nur, wenn du einen anderen ID-Wert ausdrücklich verwenden willst.
4. Prüfe lokal:

   ```powershell
   npx tsx scripts/google-cloud-preflight.ts
   npx tsx scripts/google-cloud-preflight.ts --check-models
   npx tsx scripts/google-cloud-preflight.ts --check-live
   ```

Der erste Aufruf prüft nur lokale Werte und Dateipräsenz. `--check-models` sendet kurze synthetische Anfragen an Gemma, Gemini und die Gemini-Funktionsaufruf-Schnittstelle. `--check-live` öffnet zwei kurze Live-Sitzungen: eine prüft tatsächliche Audioausgabe und Serverantwort; die andere fordert einen harmlosen Test-Funktionsaufruf an. Diese optionalen Prüfungen können API-Nutzung und Kosten verursachen. Sie buchen oder verändern keine realen Angebote.

## Option B: Vertex AI mit Application Default Credentials

### PowerShell blockiert lokale Skripte

Wenn PowerShell `google-cloud-cli.ps1` wegen deaktivierter Skriptausführung blockiert, verwende den Batch-Launcher. Er verwendet dieselbe installierte CLI und denselben lokalen Credential-Ordner, ohne die PowerShell-Ausführungsrichtlinie zu ändern:

```powershell
.\scripts\google-cloud-cli.cmd --version
.\scripts\google-cloud-cli.cmd auth login
.\scripts\google-cloud-cli.cmd auth application-default login
```

Die Anmeldung erfolgt im Browser. Codes, Tokens und Schlüssel nicht in den Chat kopieren.

### Projektlokale Google Cloud CLI

Die CLI kann ohne globale PATH-Änderung im ignorierten Projekt-Cache eingerichtet werden:

```powershell
.\scripts\google-cloud-install.ps1
.\scripts\google-cloud-cli.ps1 --version
.\scripts\google-cloud-cli.ps1 auth login
.\scripts\google-cloud-cli.ps1 auth application-default login
```

Der Installer prüft das offizielle Google-Archiv per SHA256 vor dem Entpacken. Der Wrapper legt Credentials in `.local/credentials/gcloud` ab. Die Google-Anmeldung erfolgt im Browser; keine Codes oder Tokens in den Chat kopieren. Für die App muss `CLOUDSDK_CONFIG` in der lokalen `.env` auf den absoluten Pfad dieses Verzeichnisses zeigen. Die lokale `.env` wurde dafür vorbereitet. CLI-Anmeldung und ADC sind zwei getrennte Anmeldungen: die erste dient der Projektverwaltung, die zweite dem serverseitigen SDK.

Vor Projektänderungen das gewünschte Billing-Konto und den Geltungsbereich der Hackathon-Credits prüfen. Die CLI-Einrichtung legt weder ein Projekt an noch aktiviert sie Cloud-APIs.

Der SDK-Client kann ADC finden, auch wenn `gcloud` nicht installiert ist. Der lokale Preflight erkennt gängige ADC-Dateien und meldet separat, ob die CLI verfügbar ist. Er gibt keine Credentials oder Pfade aus.

Für ein Google-Konto ist der übliche lokale Weg:

1. Wähle oder erstelle ein Google-Cloud-Projekt und prüfe, dass das gewünschte Konto die nötigen Projektberechtigungen hat.
2. Installiere die Google Cloud CLI nur, wenn du diese Authentifizierung verwenden möchtest. Danach in PowerShell:

   ```powershell
   gcloud init
   gcloud auth application-default login
   ```

3. ADC kann auch aus `GOOGLE_APPLICATION_CREDENTIALS` oder einer konfigurierten externen Identität kommen. Falls diese Variable gesetzt ist, muss genau dieser Pfad gültig sein; ein falscher Pfad wird nicht durch ein anderes lokales ADC-Profil übergangen.
4. Setze in `.env`:

   ```dotenv
   AI_PROVIDER=vertex
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=global
   GEMMA_MODEL=your-tested-gemma-model-id
   GEMINI_MODEL=your-tested-gemini-model-id
   GEMINI_LIVE_MODEL=your-tested-live-model-id
   ```

   Vertex erfordert Projekt und alle drei expliziten Modellwerte. Die Anwendung behauptet keine Gemma-Route, die nicht für dieses Projekt und Modell geprüft wurde. `GEMINI_API_KEY` wird bei `AI_PROVIDER=vertex` nicht für einen automatischen Rückfall benutzt.
5. Führe zuerst den lokalen Preflight und danach nach Bedarf `--check-models` und `--check-live` aus.

Für Vertex Live muss eine vom gewählten Modell unterstützte Region verwendet werden. Google dokumentiert für `gemini-3.8-live` derzeit `us-central1`, `us` und `eu`; der allgemeine Konfigurationsstandard `global` ist hierfür keine Verfügbarkeitszusage. Auch die Gemma-Route muss für Vertex separat nachgewiesen werden. [Vertex Live-Modellreferenz](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-live).

Google empfiehlt für lokale ADC in der Regel ein Nutzerkonto oder Service-Account-Impersonation. Schlüsseldateien von Service Accounts sind besonders schützenswert. Erteile nur die für das ausgewählte API und Projekt erforderlichen Rollen. Diese Anleitung erstellt weder Cloud-Ressourcen noch aktiviert sie APIs, IAM oder Billing.

## Cloud-Guthaben und Gemini API-Abrechnung

Ein neues Google-Cloud-Konto oder ein Hackathon-Guthaben beweist nicht, dass Gemini API / AI Studio abgedeckt ist. Prüfe in der Google-Cloud-Console unter **Billing → Credits** für jedes Guthaben den Namen, Status, verbleibenden Betrag, Geltungsbereich beziehungsweise eingeschränkte Services/SKUs sowie Start- und Ablaufdatum. Verbinde für Vertex AI das richtige Projekt mit dem vorgesehenen Billing-Konto; auch dann muss der Credit laut Scope Vertex AI abdecken.

Googles aktuelle Gemini API-Abrechnungsdokumentation sagt, dass neue Cloud-Willkommensguthaben nicht für Gemini API oder AI Studio verwendet werden können. Vor dem 2. März 2026 gewährte Guthaben können gemäß Dokumentation bis zum Ablauf ausgenommen sein. Prüfe die aktuellen Bedingungen deines individuellen Hackathon-Grants und frage den Grant-Anbieter, falls der Eintrag keinen eindeutigen Service-Scope nennt. Gemini API nutzt eigene AI-Studio-/API-Abrechnung und kann eine Prepayment-Einrichtung verlangen. Richte keine Zahlung oder Prepayment allein aufgrund dieses Leitfadens ein. [Gemini API Billing](https://ai.google.dev/gemini-api/docs/billing) · [Google Cloud Guthabenstatus](https://docs.cloud.google.com/billing/docs/how-to/resolve-issues).

## Ergebnisse richtig lesen

- **Lokale Konfiguration erfolgreich:** Werte sind syntaktisch gültig und erforderliche Dateien beziehungsweise Schlüssel sind vorhanden. Der Dienstzugriff ist damit nicht bestätigt.
- **Modellprüfung erfolgreich:** Das Modell hat auf eine echte, minimale Testanfrage geantwortet; beim Gemma-Test wurde zusätzlich die JSON-Form der Planprobe validiert. Der Gemini-Funktionstest meldet separat, ob der Test-Funktionsaufruf kam.
- **Live-Prüfung erfolgreich:** Der Live-Dienst hat Audioausgabe und eine Serverantwort geliefert. Ein offener WebSocket allein zählt nicht. Der Live-Funktionstest wird separat ausgewiesen.
- **Fehlende Credentials:** Google-Zugang wurde nicht geprüft. Die lokale Demo ist davon unabhängig nutzbar.
- **Fehlerklasse:** Die Prüfung nennt nur Kategorien wie Authentifizierung, Quote, Modell, Timeout oder Netzwerk. Rohe SDK-Ausnahmen werden nicht ausgegeben.

## Geprüfte Primärquellen und SDK

- [Google Gen AI SDK für TypeScript und JavaScript](https://googleapis.github.io/js-genai/release_docs/index.html)
- [Gemma über die Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api)
- [Gemini Live Fähigkeiten](https://ai.google.dev/gemini-api/docs/live-api/capabilities)
- [ADC lokal einrichten](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment)
- [Gemini API-Abrechnung](https://ai.google.dev/gemini-api/docs/billing)
- [Cloud-Guthaben prüfen](https://docs.cloud.google.com/billing/docs/how-to/resolve-issues)

Die lokale Implementierung wurde gegen die installierten `@google/genai`-Typen geprüft. Die modellbezogenen Onlineproben sind optional und benötigen einen echten Zugang.
