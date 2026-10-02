# Unabhängige Gesamtprüfung gegen PRD V0.3

Stand: 2026-10-02 (America/Los_Angeles). Unabhängige funktionale Gesamtprüfung gegen `easy-web-assistant-prd.md` V0.3, keine Sicherheitszertifizierung. Ausschließlich eigener Bericht und `tests/review/astra-overall.test.ts`; keine Produkt-, Konfigurations-, Lockfile- oder fremden Reviewänderungen. Keine Subagenten, neuen Chats oder Nachrichten an andere Chats. Spätere Änderungen sind nur durch erneute Prüfung abgedeckt; finaler Snapshot unten.

## Gesamturteil

**Noch keine abgenommene lokal nutzbare Vollfluss-Demo.** Nachprüfung **15:33 PDT**: Die Fixketten A-01 bis A-06 sind jetzt im Quellcode nachvollziehbar korrigiert. Insbesondere behandeln auch die aktuelle Shell/A2UI-Grenze verspätete Resultate und die minimale Profilnachlieferung korrekt; die zuletzt fehlenden wichtigen Status-/Bedientexte sind ebenfalls auf 18px angehoben. QA protokolliert die **drei unveränderten unabhängigen Offline-Regressionsfälle mit 3/3 bestanden**; das deckt Zeitfilter, sichtbare Originalbedingungen und die Controllerseite eines verspäteten Receipts ab. A-07/Testabdeckung ist noch offen. QA hat das Frontend geladen sowie Profil-Save/Reload/Edit erreicht; ein grüner Profilgesamt-Smoke, Typecheck, Build und sechs erfolgreiche Vollflüsse sind weiterhin nicht belegt.

Es gibt **keinen Nachweis einer erfolgreichen echten Google-Modell-/Audiointegration oder einer realen Anbieterintegration**. Das ist von der erlaubten lokalen Fixture-Abnahme getrennt. Der Nutzer hat zuletzt ein zeitlich begrenztes Billingkonto „GDG“ plus UUID gemeint und Vertex ausdrücklich abgelehnt. Grant-Scope, passende API und tatsächliche Projekt-/Billingzuordnung werden separat vom Cloud-Owner geklärt. Weder Vertex noch Developer API wird hier als ausgewählter oder abgenommener Zugang vorausgesetzt. Eine Key-Präsenzprüfung genügt dafür ausdrücklich nicht.

## Prüfumfang und Evidenzregeln

Gelesen: PRD, Contracts, Coordination, Frontend-/Backend-/Expansion-Spec, Acceptance, QA-Lock und die drei unabhängigen Reviews; `shared/schema.ts`; sämtliche sechs `server/providers/*.ts`; Controller/HTTP-Fixture/Demo/Browser/Broker/Approval/AI/Voice/Config; `src/App.tsx`, Audio/Protocol, Profil, Angebote/Galerie, A2UI und zugehörige Styles; App-Einstieg, öffentlicher Katalog, package-/Vite-/Vitest-/Playwright-/TS-Konfiguration; Google-Preflight/CLI-/Installskripte; README und Start-/Integrations-/Cloudanleitungen. Bestehende Tests wurden auf Anforderungen, Assertions und fehlende Übergänge geprüft. Installierte A2UI-v0.9-Exports, React-Factory/GenericBinder und ADC-Suchlogik wurden anhand lokaler Bibliotheksquellen gegengeprüft. Keine anwendbare AGENTS.md in Repository/übergeordneten Arbeitsverzeichnissen gefunden.

**Eigene ausgeführte Prüfungen:** ausschließlich gezielte Lese-/Quellprüfungen, keine globale Suite, kein Typecheck/Build, kein Server, Browserinstall oder Browserlauf. Der reguläre Shellstart scheiterte vor Prozessbeginn mit `helper_unknown_error: setup refresh had errors`; eng begrenzte schreibgeschützte Projektbefehle wurden mit regulärer `require_escalated`-Prüfung erfolgreich ausgeführt. Das ist keine App-Testevidenz. Keine `.env`, ADC-/Credentialdatei oder echten Personendaten gelesen; keine echten Modellrequests, Aufnahme, Buchung, Zahlung oder Cloudänderung.

**Eigene neue Regressionen, inzwischen durch QA ausgeführt:** drei konkrete Offline-Fälle in `tests/review/astra-overall.test.ts`: passender Journey-Zeitfilter, sichtbare Originalbedingungen, verspäteter Request-Receipt nach Stop/neuer Aufgabe. Config/AI/Voice/Browser sind im Controllerfall gemockt. QA-Lock, Run 11: `npm test -- tests/review/astra-overall.test.ts`, **exit 0, 1 Datei, 3 Tests bestanden in 850ms**. Den Tests liegt weiterhin unverändert SHA256 `AFCDB333526A3C024A6B7F52CFE0F31D1A5A8A7032AF9903A89B614C4D593499` zugrunde. Ausführung durch QA, eigenständige Testautorschaft und Quellnachprüfung durch diesen Reviewer. Kein eigener erneuter Lauf erforderlich; insbesondere kein paralleler Compiler/Server/Browser. Dieser Pass umfasst weder echten HTTP-Receiptweg noch Shell/A2UI/Live-Audio.

Um 15:26 zeigte ein gelesener Lock kurz nur abgeschlossene/pending Schritte. Der eigene beabsichtigte Einzeldateilauf prüfte deshalb **unmittelbar vor Start** den Lock erneut; inzwischen war QA wieder aktiv. Ausgabe: `SKIPPED: QA now has an active check.` Vitest wurde nicht gestartet. Exit 0 dieses Skip-Guards ist **kein Testpass**.

## Bereits bestätigter Quellbefund

### A-01 / P1 — Receipt-Verifikation durch Express-Routenreihenfolge unerreichbar — SOURCE-FIX BESTÄTIGT

**Nachprüfung 15:22 PDT:** `server/index.ts:59` registriert `/fixture/state` jetzt vor `/fixture/:kind` (Zeile 71). Der spezifische Handler ist nur einmal vorhanden und behält die Invocation-/Sessionbindung bei. Damit ist die deterministische Route-Shadowing-Ursache behoben. Kein eigener oder aktuell gelesener positiver echter HTTP-Receiptlauf; A-01 in den Tabellen unten bezeichnet ab jetzt diese offene Laufzeitnachprüfung, nicht einen fortbestehenden Codeblocker. Folgende Beschreibung hält den ursprünglichen Befund fest:

Trigger: Einer der sechs Fachflows sendet nach gültiger ausdrücklicher Freigabe erfolgreich POST `/fixture/book`. Erwartet: Ein read-only GET `/fixture/state?session=…&offerId=…&action=…` mit privatem Operation-Token verifiziert genau diesen Receipt; Basisflows ergeben `booking_confirmed`, Erweiterungen `request_received`.

Ist: `server/index.ts` registriert GET `/fixture/:kind` vor GET `/fixture/state`. Der erste Handler bekommt `kind=state`, lehnt es in `kindSchema.safeParse` ab und beendet die Anfrage mit 404, ohne `next()` aufzurufen. Der spätere State-Handler ist für jeden solchen GET unerreichbar. `BrowserSession.checkCurrentResult` liefert bei Nicht-200 null; `submitPrepared` und danach `ToolBroker.performSubmit` können den gespeicherten Receipt deshalb nicht verifizieren und liefern `unclear`.

Minimale Reproduktion: Lokale Fixture-Sitzung mit gültigem Angebot/Freigabe vollständig abschließen; den vom Broker ausgelösten GET `/fixture/state` beobachten. Auch ein GET mit gültigen Session-/Offer-/Action-/Operation-Token-Werten wird im früheren `:kind`-Handler als `Not found` beendet. Noch kein von mir ausgeführter HTTP-/Browserlauf; dieser deterministische Routingfehler ist anhand der tatsächlichen Registrierung und Rückgaben bestätigt. Keine echte Anbieterintegration betroffen, aber alle sechs erfolgreichen Demo-Abschlüsse blockiert.

Fixrichtung für Owner: Spezifische Read-Routen vor die dynamische Kindroute registrieren oder die dynamische Route passend begrenzen; Regression mit echtem Express-Routing und kontrolliertem Receipt ergänzen. Existierende Fake-Browser-Tests allein decken die Registrierung nicht ab.

### A-02 / P1 — Später Abschluss einer alten Aufgabe überschreibt neue Aufgabe und verwechselt Request/Booking — SOURCE-FIX BESTÄTIGT, CONTROLLER-MOCK GRÜN

**Abschließende Kettennachprüfung 15:31 PDT:** `App.tsx:127–143` erhöht die aktive Version nur durch cards/approval/status; alte Resultate können sie nicht mehr vorziehen. `App.tsx:202–228` fügt Resultate dedupliziert in die Timeline ein, aktualisiert aber Approval/Busy/Status nur bei passender aktueller Version und gültigem invalidBefore. Ein Resultat einer alten Version bleibt deshalb historisch sichtbar und löscht keine neuere Freigabe. Gemeinsam mit ursprünglichem operation.kind/version/offerId im Controller und dem passenden Shared-Schema ist der ursprüngliche Fehler durchgehend im Code behoben. Run 11 bestätigt den unveränderten Controller-Mockfall; Shell-Event-/DOMtest bleibt ausstehend. Der Kompatibilitätszweig für Resultate ohne Version gilt weiterhin als aktuell; die hier geprüften aktuellen Controllerpfade senden immer eine Version. Die folgenden Zwischenstände sind historisch:

**Nachlesen 15:24 PDT:** Controller erfasst nun unveränderliche `{version, kind, binding}`, schützt `pendingBinding`/Status/finally durch die ursprüngliche Version und sendet Resultate mit ursprünglichem kind/version. Das ist die passende Richtung. Zum Zeitpunkt dieses Reads enthielten Shared-Result-Schema und App-Result-Handler die neue Versionsbehandlung noch nicht; daher noch kein vollständiger Fix behauptet. Beide Grenzen müssen gemeinsam nachgezogen werden, damit Strict-Schema die Ereignisse akzeptiert und ein altes Resultat im Client weder `approval` noch Status der neuen Aufgabe löscht. Laufzeitnachprüfung des eigenen Mockfalls und des Shell-Handlings offen. Ursprünglicher reproduzierbarer Quellbefund:

**Weiterer Read 15:24 PDT:** Shared `result` enthält jetzt optionale `kind`/`version`, Strict-Schema akzeptiert damit den neuen Controlleroutput. `App.tsx:190` setzt jedoch noch bei jedem `result` Approval auf null und aktuellen Status auf complete, unabhängig von event.version. Der verbleibende Fehler liegt jetzt ausdrücklich an dieser Clientgrenze. Auch ein später grüner Controller-Mockfall allein würde den Gesamtfix nicht beweisen.

Trigger: Government-Request explizit bestätigen, dessen POST-Antwort verzögern, Stop drücken, Event-Suche beginnen, dann den alten verifizierten `request_received`-Receipt zurückgeben. Erwartet: Alter Receipt bleibt der alten Appointment-Request-Aktion zugeordnet; die neue Event-Aufgabe behält ihren eigenen Zustand. Ist: `server/session.ts:170–185` prüft nach `await broker.submit` nur `alive`, liest `this.currentKind` der neuen Aufgabe und veröffentlicht über `status()` die **aktuelle** Version als complete. So kombiniert der Controller `outcome=request_received` mit dem Text „confirmed the test booking“ und deaktiviert im Client die neuen Eventkarten. `confirmationVersion` schützt erst Screenshot und finally, nicht Resultattext/Status. Ähnliches gilt nach `profile_changed`/Reset; `pendingBinding` wird ebenfalls ohne Versionsprüfung gelöscht. Auswirkung: falsche fachliche Bestätigung plus Zustandskorruption eines anderen Auftrags. Der Broker wiederholt dadurch keinen POST; der Fehler liegt im Controller.

Minimaler kontrollierter Mockfall ist Test 3 in `tests/review/astra-overall.test.ts`. Browser, Voice, KI und Konfiguration sind gemockt; keine `.env` wird durch den Test geladen. Test geschrieben, wegen aktivem QA-Lock noch nicht ausgeführt. Quellbefund erneut bestätigt. Fixrichtung: unveränderliche Operationsidentität/Kind bei Confirm erfassen; verspätete Ergebnisse separat der ursprünglichen Version zuordnen, keine neuere Freigabe oder Status überschreiben.

### A-03 / P2 — Auch passende explizite Abfahrtszeiten werden verworfen — SOURCE-FIX BESTÄTIGT

**Laufzeitnachweis 15:31 PDT:** QA Run 11: unveränderter eigener positiver 9:15-AM-Regressionsfall bestanden. Keine vollständige natürliche Zeit-/Datumsinterpretation oder Browserabnahme daraus ableiten.

**Nachprüfung 15:24 PDT:** `journeys.ts:200` liest jetzt `return departure`/`outward departure`. Der konkrete Keyfehler ist behoben. Der Owner ergänzte zudem den positiven 9:15-AM-Fall in seinem vorhandenen Test. Eigener Test blieb unverändert, noch kein ausgeführter Pass gelesen. Die folgende Beschreibung hält den ursprünglichen Befund fest:

Trigger: `Find a train at 9:15 AM` mit unveränderter Journey-Fixture (Rail-Abfahrt 9:15 AM). Erwartet: `journey-direct` bleibt erhalten. Ist: `server/providers/journeys.ts:162` baut eine Map mit `label.toLowerCase()`, Zeile 200 liest jedoch `Outward departure`/`Return departure`. Ergebnis immer Unknown und anschließend kein Zeitmatch. Alle erkannten expliziten Zeitfilter treffen denselben Fehler. Der existierende Test „after 10 AM“ prüft nur Ablehnung und verdeckt ihn. Minimaler Offline-Fall: Test 1 in `tests/review/astra-overall.test.ts` (noch nicht ausgeführt); erwartete IDs `['journey-direct']`, aus Quelle tatsächlich `[]`.

### A-04 / P2 — Originalquelle zeigt ihre Detailbedingungen nicht sichtbar — SOURCE-FIX BESTÄTIGT

**Laufzeitnachweis 15:31 PDT:** QA Run 11: unveränderter eigener Test bestätigt die sichtbare ursprüngliche Transfer-/Refund-Bedingung außerhalb des JSON-Scripts. Browser-/Link-/Layoutabnahme bleibt offen.

**Nachprüfung 15:24 PDT:** `fixtureHtml` verwendet nun `renderFixtureOffer`; der rendert Subtitle, vollständige Details und unknownCosts sichtbar außerhalb des JSON-Scripts. Das irreführende buchende Formular wurde durch einen deaktivierten, ausdrücklich nicht ausführbaren Source-Page-Control ersetzt. Die konkrete Quellursache ist behoben. Eigener Test 2 unverändert; noch kein Test-/Browserpass. Ursprünglicher Befund:

Trigger: Eventkarte → „View original offer“ oder „Source for Ticket conditions“. Erwartet: die angesprochenen Originalbedingungen sind auf der Fixture-Seite lesbar. Ist: `server/demo.ts:130` rendert Bilder, `priceLabel` und `facts`, aber keine `details`, Beschreibung oder gesonderte Unknown-Kostenliste. `details` stehen nur im nicht sichtbaren JSON-Script `#offers`. Die Ticket-Transfer-/Refund-Bedingung ist bei der Event-Fixture in dieser Darstellung nicht sichtbar. Request-Seiten tragen zudem denselben nicht autorisierbaren Button „Place test booking“, obwohl sie nur Anfrageeingang demonstrieren. Die HTTP-Freigabe wird dadurch nicht umgangen (Form hat keine Capability), aber Quelllink und Websiteansicht erfüllen den Informationsvertrag nicht. Minimaler Fall: Test 2 in `tests/review/astra-overall.test.ts`, JSON-Script entfernen und sichtbaren HTML-Inhalt auf die vorhandene Transferbedingung prüfen; noch nicht ausgeführt.

### A-05 / P2 — Unterschiedliche Klassifizierung lässt unterstützte Text-/Sprachaufträge scheitern — SOURCE-FIX BESTÄTIGT

**Abschließende Kettennachprüfung 15:31 PDT:** `validation.ts` speichert die mit Offer-Schema und Kartenart geprüfte `kind` beim Source-Key. `A2UIOfferSurface.tsx:44` übergibt genau diese Art als drittes Select-Callbackargument; `App.tsx:353–369,548` sendet `neededProfileFor(kind, profileRef.current)` bei Auswahl mit. Shared `select.profile` und `session.handle/select` nehmen es an und projizieren noch einmal anhand des tatsächlichen Controllerangebots vor Prepare. Confirm vergleicht dieselbe minimale Teilmenge. Finale Voice-Turns (`App.tsx:253–265`) durchlaufen jetzt unabhängig von kindHint den normalen Taskweg; kein stummes Verwerfen von jazz/rail/anderen unterstützten Backendformulierungen mehr. UUID-Dedup bleibt, die frühere 200-ID-Eviction ist entfernt. Kein Vollprofil-Workaround, kein Voice→Confirmpfad. Damit sind die ursprünglich beschriebenen Fälle source-fixed; tatsächliche Shell-/A2UI-/Voice-Mockabnahme steht noch aus. Frühere Zwischenstände:

**Nachprüfung 15:25 PDT:** Shared `select` akzeptiert jetzt optionales `profile`; Controller projiziert es anhand der tatsächlichen gewählten offer.kind vor Prepare neu und nutzt für alte Clients den bisherigen Fallback. Das behebt die Backendvoraussetzung. Die aktuelle Shell sendet aber weiter `select` ohne Profil und verwirft finale Voice-Turns ohne kindHint. Daher noch kein durchgängiger Fix. Erwartete Frontendintegration: minimales Profil aus validierter gewählter Angebotsart senden und Voice-Taskrouting vom lokalen Kindwortschatz entkoppeln, bei weiterhin strikt separatem Confirm.

Trigger mit gespeichertem synthetischem Namen/E-Mail: `Find jazz` oder `Find a rail connection`. Erwartet: gleicher minimaler Profilpfad wie bei `Find a concert`/`Find a train`; finale Sprachtranskripte werden einmal normal weitergeleitet. Ist: `src/App.tsx:664–674` kennt weder jazz noch rail, `server/demo.ts:118–124` kennt beide. Text sendet deshalb `emptyProfile` (`App.tsx:317–318`); Controller speichert das leere projizierte Profil. Die spätere Auswahl liefert eine Freigabe ohne persönliche Felder. Confirm sendet jetzt wegen bekannter offer.kind das echte Minimalprofil; `server/session.ts:162–165` verwirft dies als Profiländerung. Bei Stimme verwirft `App.tsx:240` denselben finalen Turn schon durch `if (kindHint(text) && …)` ohne sichtbaren Hinweis. Ähnliche Lücken: pottery/workshop/passport und rein modellseitig erkannte Formulierungen. Quelle erneut geprüft, kein Browser-/Audiolauf. Fixrichtung: abgestimmte Klassifizierung und ein expliziter Profilanforderungs-/Nachlieferungspfad nach Controller-Klassifikation; kein Vollprofil-Workaround. „Yes“ muss weiterhin niemals Confirm werden.

### A-06 / P2 — Wichtige Zusatztexte unterschreiten die geforderten 18 CSS-Pixel — SOURCE-FIX BESTÄTIGT

**Weitere Nachprüfung 15:33 PDT:** Jetzt sind auch Zustellungswarnung, Stop, Icon-/Profile-/Website-/Mic-Bedientexte, Löschen und Beispielzusatztexte auf 18px korrigiert, einschließlich Mobile-Overrides. `src/profile/profile.css` und Offerstyles haben die genannten Korrekturen bereits. Die verbleibenden kleineren Selektoren betreffen Overline/Brand/Avatar/Pfeil; der konkret berichtete entscheidungsrelevante Textbefund ist damit im Code behoben. Nach Änderung der Schriftmaße bleiben mobiles Layout, Überläufe, Bedientargets und Zoom natürlich neu visuell zu prüfen. Folgender Teilfixstand ist historisch:

**Nachprüfung 15:31 PDT:** Die ursprünglich konkret betroffenen Folgen, übertragenen Feldnamen/-werte, Checkboxtexte und Ablaufzeit sind in `src/styles.css:124,127–134` jetzt 18px. Offer-Feldtitel/Completeness/Quellen/Fehlerzustände sowie Profilfelder/-schritte/-Speicherhinweise sind ebenfalls auf 18px angehoben. Damit ist der ursprüngliche Kernbefund source-fixed. Verbleibender kleinerer Rest im aktuellen Snapshot: `.message-content small` (14px; auch „Delivery was not confirmed“), `.stop-button` (16px), `.icon-label-button` (16px), Mobile-Mic/Viewwechsel/Profilecontrols (13–14px) und Beispielzusatztexte. Gerade die Zustellungswarnung ist wichtige Zusatzinformation. Ein weiterer CSS-Patch ist angekündigt; ohne Nachlesen nicht als umgesetzt zählen. Die historische Beschreibung folgt:

Trigger: Desktop oder Mobile, Freigabe öffnen. Erwartet nach PRD 5: wichtige Zusatztexte mindestens 18px. Ist: `src/styles.css:124,127–128,134` setzt Folgen auf 17px, Feldnamen 16px, übertragene Werte 17px und Ablaufzeit 15px. `src/components/offers/offers.css:27,42,49` setzt entscheidungsrelevante Feld-/Unvollständigkeits-/Quelltexte auf 16px. Kein späterer Mobile-Override hebt diese Angaben auf 18px. Auswirkungen: belegte Abweichung von der Zielgruppen-Lesbarkeitsvorgabe; kein allgemeines WCAG-Fail behauptet. Reproduktion: entsprechende Selektoren bei 100% Zoom im Browser per computed style prüfen; derzeit ausschließlich CSS-Quellnachweis.

### A-07 / P2 — Aktuelle E2E-Suite ist noch kein ausführbarer Beleg für die behaupteten Vollflüsse — TEILFIX

**Nachprüfung 15:31 PDT:** QA hat nach dem zweiten beobachteten stale-Close-Fehler auch weitere Profilsave-Stellen auf Auto-close umgestellt; neuer Profilsmoke läuft. Zusätzlicher notwendiger Abgleich des Voice-Mockfalls mit A-05: Der Test emittiert „Yes“ und direkt danach einen Train-Turn, erwartet aber weiterhin, dass der erste normale Task der Train-Turn sei. Aktuell wird „Yes“ korrekt als gewöhnlicher Task ohne Confirm geroutet; der Test muss die harmlose Controllerantwort/idle dafür simulieren, bevor er den nächsten Turn sendet. Andernfalls sperrt der normale Busy-Guard den Train-Turn. Das ist eine veraltete Testannahme über „kein Task“ statt der Anforderung „kein Abschluss“, kein Beleg einer Buchungsfreigabe durch Stimme. Positive/negative Task-/Confirm-Assertions erhalten und den tatsächlichen Eventablauf mocken.

**Nachprüfung 15:26 PDT:** QA-Lock meldet tatsächliches Laden der App und Profilabschluss innerhalb des verlängerten Smokes (1,7 min), danach genau den Fehler des alten Save-/Close-Helfers. Dieser erste Befund ist damit zusätzlich durch fremde Browser-Laufzeitevidenz bestätigt. Aktueller `finishProfile` wartet jetzt auf Your details; Session-only-Texte/Deletion-Assertions wurden korrigiert. Noch offen im gelesenen Stand: weiterer Close-Klick nach Edit-Save im Profiltest, mehrere `toHaveCount(0)` für historische Approvalbuttons, alter Appointment-Consequence-Text, Journey endet vor Confirm und Request-Assertions bleiben unspezifisch. Kein erfolgreicher Gesamtsmoke aus dem Teilfix abgeleitet. Folgende Beschreibung enthält die ursprünglichen Fehler:

Trigger: beliebiger E2E-Fachtest ruft `finishProfile` auf. Erwartet: Helfer folgt dem aktuellen erfolgreichen Save-Verhalten. Ist: `tests/e2e/acceptance.spec.ts:17–19` wartet auf eine Save-Meldung und klickt Close; `src/App.tsx:404` schließt das Dialog jedoch bereits beim erfolgreichen Save. Weitere veraltete Erwartungen: inaktiver Approval-Button wird im Timeline-Design beibehalten, Tests erwarten `toHaveCount(0)`; Appointment erwartet den nicht mehr vorhandenen Default-Consequence-Text; Storage-Test erwartet alte Beschriftung. Quelle bestätigt, kein eigener E2E-Lauf. QA hat bisher vor diesen Assertions einen Vite-Navigations-Timeout gemeldet, daher ist dieser spätere Testfehler noch nicht durch einen Browserlauf beobachtet.

Zusätzliche Coverage-Lücke: Journey-Test endet mit „New task“ vor Confirm; Regierung/Dienstleistung/Freizeit prüfen nach Confirm nur `/request/i` und das Fehlen weniger falscher Wörter, keinen positiven `REQUEST RECEIVED`-Status, Reference oder gespeicherten Receipt. Der echte Express-State-Pfad wird von den vorhandenen Unit-Mocks nicht erreicht. Fixrichtung: aktuelle UI-Semantik mit Owner abstimmen, dann **alle sechs** Vollflüsse bis zum präzisen Outcome und zum gebundenen serverseitigen Receipt ausführen.

## Fachprüfung der sechs Flows

Alle sechs `search`-Adapter lesen kontrollierte `Offer`-Daten; sie besitzen keinen Finalizer. `runTask` stellt zunächst rohe synthetische Fixtures bereit, liest diese im isolierten Browser, normalisiert sie durch den passenden Provider und ersetzt anschließend das Fixture-Angebot durch exakt diese normalisierte Fassung. Daher ist der vollständige symmetrische Brokervergleich grundsätzlich mit dem Design vereinbar. Dies ist eine kontrollierte Testdatenpipeline, keine Extraktion aus beliebigen Anbieterwebsites.

| Bereich | Daten-/Constraint-Befund am Code | Vollfluss-Abnahme |
|---|---|---|
| Event | Eventname, Ort, Datum/Uhrzeit, Kategorie, Anzahl, Sitz-/Zugangsangaben, Preisbestandteil und offene Gebühren erhalten; fehlendes Jahr/Zeitzone/Verfügbarkeit/Refund/Transfer explizit unknown. Zwei ursprüngliche fiktive SVG-Bilder erhalten. Datum/Ort/Zugang/Sitze/Ziffernanzahl teilweise gefiltert; Auswahl nur des festen Pakets 2 Erwachsene, keine Ticket-/Sitz-/Mengenänderung. Relative Daten, Zeit/Budget und ausgeschriebene Mengen nicht umfassend ausgewertet; allgemeine feste Demo-Limitierung ist sichtbar. | Suche/Auswahl/Review/POST existieren; A-01 source-fixed, Receipt-/Browserpass offen. |
| Journey | Unterschiedliche Rail-/Coach-Tarife, Bedingungen und Preise erhalten; direct wird korrekt als 0 Umstiege, nicht als 0 Zwischenhalte interpretiert. Gepäck/Ermäßigungen/offene Bedingungen bleiben unknown. Modus/Klasse/Ziffern- und einige Wortanzahlen/Route/Refund/Retour berücksichtigt. Positiver Zeitmatch defekt A-03; relative Daten/Jahr/Zeitzone und mehrere kombinierte Zeitvorgaben nicht umfassend geprüft. | Keine erfolgreich getestete Abschlussstrecke; vorhandener Journey-E2E endet schon nach Prepare/Reset. |
| Appointment | Beide GP-Slots; fachliche Angaben, Kosten/Versicherung unbekannt, Besuchsart, Dauer, Voraussetzungen und Änderungs-/Absagebedingungen dargestellt. Gemeinsame Bedingungen des zweiten Slots werden nur bei explizitem Quellenverweis übernommen. Umfangreiche harte Datum-/Ort-/Fach-/Besuchs-/Zugangsfilter, keine Symptomauswertung oder medizinische Beratung. | Quellpfad vollständig; Endbestätigung A-01, Browser offen. |
| Government | Eigene fiktive Behörde/Anliegen/Slot, Unterlagen/Gebühren/Voraussetzungen bewusst unknown; keine erfundenen realen Rechtsanforderungen. Eigener Request-Actionname und minimale Namens-/E-Mail-Projektion. `search` ignoriert Suchtext und zeigt ausdrücklich ungeprüfte feste Demo-Matches. Einige bekannte kombinierte Quellfelder (Authority & department, Date & time) werden zusätzlich durch separate Unknown-Felder ergänzt: unnötige Wiederholung, Original bleibt erhalten. | Nur `request_received` zulässig; A-01 und nach Konkurrenz A-02 offen. Kein bestätigter Amtstermin. |
| Service | Eigene Reparatur-Anfrage; Gebiet, angefragtes Zeitfenster, offener Arbeits-/Anfahrt-/Material-/Gesamtpreis und unbekannte Verfügbarkeit erhalten. Kein bestätigter Kostenvoranschlag oder Engagement. Name/E-Mail/Telefon; keine Adresse ohne neuen source-verifizierten Vertrag. Teilweise ungeeignete Orts-/Datumsanfragen werden mit explizitem Nichtmatch-Fakt versehen statt herausgefiltert. | Request-only; A-01/A-02. Weder reales Besuchsfenster noch Handwerkerbeauftragung nachgewiesen. |
| Leisure | Eigenes wiederkehrendes Töpferangebot mit sechs Terminen, Materialien/Mitgliedschaft unbekannt, 54 USD nur Grundanteil, Zugang/Teilnahmebedingungen erhalten; Originalbild vorhanden. `search` wertet den Text nicht aus und kennzeichnet alle Anforderungen als ungeprüft. Anders als andere Provider kein abschließender Vergleich aller Angebots-Origins untereinander; nur jede Quelle für sich geprüft. | Request-only; A-01/A-02. Keine bestätigte Teilnahme. |

`requiredFields` ist Metadatum; es gibt keine Pflichtfeldprüfung vor Prepare/POST und keinen nachgelagerten Fallfragebogen. Die Fixture akzeptiert also auch leere offengelegte Profile. Das ist keine implizite Freigabe (der explizite Confirm bleibt erforderlich), aber kein Nachweis realer providerseitiger Formularanforderungen. Gespeicherte `homeStation`/`appointmentPreference` beeinflussen die Suche nicht; `accessNeeds` wird gegebenenfalls übertragen, nicht automatisch als verifizierter Suchfilter ausgewertet. Zusätzliche Reisende, Geburtsdatum/Versicherung und variable Eventvarianten sind nicht implementiert.

## Positiv belegter Quellstand und nachgelesene Fixes

- **Freigabe und Mutation:** `ApprovalGate` verwendet einen Snapshot/Digest einschließlich Aktion, Site, Offer, Eingaben, Beträgen/Unknown-Kosten, Version und fünfminütiger TTL; Consume ist synchron einmalig. Stop/Reset/Profiländerung/neue Aufgabe invalidieren. Broker erlaubt eine Mutation gleichzeitig und stellt nur dabei eine opake Einmal-Capability bereit. Fixture-POST prüft Session, Offer, Aktion, Payload, Capability und Verbrauch, bevor ein Receipt gespeichert wird. Normales Websiteformular enthält keine Capability. Keine Wiederholungs-POST-Schleife gefunden.
- **Recovery-Identität:** Operation-Token wird nur intern verwendet, gehasht im Receipt gespeichert und nicht in A2UI-/Socketereignissen veröffentlicht. Stateprüfung prüft genaue Invocation statt einen beliebigen früheren Receipt. Das Konzept verhindert alte-Receipt-Falschbestätigung; nach Source-Fix A-01 ist der Handler erreichbar angeordnet, echte HTTP-Verifikation weiterhin offen. `result/:reference` ist separat Session-gebunden.
- **Fix des Approval-Reviewers:** `server/broker.ts` vergleicht jetzt das gesamte normalisierte `Offer` kanonisch und symmetrisch. Die drei ursprünglichen regressiven Fälle für entfernte Kosten/Fakten/Details sind unverändert vorhanden; Reviewer dokumentiert 3/3 grün, Owner 25 gezielte Freigabe-/Brokerchecks grün. Eigenständig nachgelesener Fix, nicht mein ausgeführter Test.
- **Fix der sechs UI-Arten und Auswahlprojektion:** App-Approval wählt alle sechs Kartenkomponenten, request-spezifische Buttons und Ergebnisüberschriften. Es gibt sechs Beispiele und Shared-Projektionen. Die freie Texteingabe darf zunächst ohne erkannte Art suchen; die Auswahl liefert jetzt anhand validierter offer.kind nur die tatsächlich nötigen Profildaten nach. A-05 ist durch diese Sourcekette behoben, Laufzeitbeleg offen.
- **Fix des ursprünglichen Voice-Drops:** Finaler Userturn besitzt UUID, Controller startet ihn nicht zusätzlich, Shell dedupliziert per Turn-ID und nutzt den normalen Taskweg unabhängig vom lokalen Kindwortschatz. Identischer Text mit neuer ID ist grundsätzlich erlaubt. Nicht finale Assistant-Ausgabe ist nicht für Taskdispatch zuständig. Alte Aussagen „kein Dispatch vorhanden“ oder „jazz/rail wird stumm verworfen“ sind für den nachgeprüften Stand überholt; Gesamtbeleg bleibt offen.
- **Profil:** versioniertes strikt validiertes LocalStorage-Envelope, Read/Write/Remove mit Fehlerbehandlung und Readback; Bearbeiten/Löschen; explizite Session-only-Entscheidung nach fehlgeschlagenem Save. Profil wird nicht in jede A2UI-Surface oder Model-Prompt kopiert. Verlust/Blockade wird im Code nicht als dauerhaft erfolgreich ausgegeben. Browserpersistenz noch nicht selbst gesehen.
- **A2UI echt integriert:** `@a2ui/react/v0_9` `A2uiSurface` und `createComponentImplementation`, `@a2ui/web_core/v0_9` `MessageProcessor`, `Catalog`, DynamicBoolean-/Action-Binding. Lokale Bibliotheksquellen bestätigen die verwendeten Exporte und GenericBinder-Auflösung. Server sendet echte createSurface/updateComponents/updateDataModel mit pro Angebot eigener Surface-ID; kein handgebauter Ersatzrenderer. Auswahl wird durch Processor-Action mit Surface/SourceComponent/Offer/Version gegen Validierung und live Props gebunden. FormValue verwendet generierten Setter; keine Confirm-Funktion im Katalog.
- **A2UI-Grenzen:** 24 Nachrichten, 80 Komponenten, 100 Arrayeinträge, 12 Ebenen, 12.000 Zeichen pro String; bekannte Katalog-ID, Komponenten/Props/Kinds/Actions, HTTP(S)-URLs ohne Userinfo. Pflichtdaten über Shared-Schema geprüft; Formfelder können keinen Abschluss autorisieren. 100 Datenitems sind von 80 Komponenten getrennt. Forms/Mutation von Datenmodell/StrictMode-Setup-Cleanup/Maximalgrenzen haben noch keinen hier bestätigten Runtime-Test. Keine erfolgreiche Renderer-Abnahme aus Source-only oder einem SSR-Loadingplaceholder ableiten.
- **Audio:** Browser-Mikrofon wird bewusst gestartet; Ressourcen haben Generation-/Unmount-Prüfungen und Cleanup. Eingang Float→PCM16 LE mono16k, Ausgang PCM16 mono24k; mehrere Audio-Parts und bounded Events; Output-Unterbrechung stoppt Playbackquellen, nicht automatisch Mic. Voice hat keine Buchungstools und verweigert Toolcalls. UUID/Turnfinalisierung und Mock-SDK-Checks sind vorhanden; physisches Mic, Permissions, Live-Latenz, Abbruch, Reconnect und hörbare Ausgabe sind ungeprüft.
- **Lokales Ausführungsziel:** Loopback-Backend, Vite-WS/Healthproxy, eine Session pro Socket, flüchtige Angebote/Freigaben/Receipts. Kein Login, keine Profildatenbank, kein Deployment. Browserpolicy beschränkt die Seite auf GET zur exakten Fixture-Origin/Session und feste Bilder; Mutationen laufen über Broker. Opt-in `PLAYWRIGHT_BROWSER_CHANNEL=msedge` wurde während dieses Reviews tatsächlich ergänzt; Backend ist nun nicht mehr zwingend vom fehlgeschlagenen Chromiumdownload abhängig.

## Aktuelle fremde Laufzeitevidenz

Diese Angaben sind **von anderen Prüfern ausgeführte, hier gelesene Evidenz**, keine eigenen Läufe:

| Prüfung | Nachweis/Status | Schlussgrenze |
|---|---|---|
| Historischer Gesamt-Vitest | QA-Lock: 12 Dateien, 131 bestanden / 1 Appointment-Wordingfehler; Assertion danach vom Owner korrigiert, 34 Appointmenttests grün gemeldet | Kein danach bestätigter grüner Gesamtlauf; neue eigene Regressionen noch nie gelaufen |
| Approval-Regression | Reviewerbericht: drei unveränderte Mocktests grün nach symmetrischem Vergleich; Owner 25 gezielte Checks | Gut für diesen Vergleich, kein Browser-/HTTP-Receiptbeleg |
| AI/Voice-Mocks | Voice-Review/Backend: 14 grün | SDK-Mockgrenze; kein Shell-/Mic-/Live-Gesamtpass |
| Profil | Frontendbericht: 8 grüne Speicher-Mocktests; inzwischen QA Save/Reload/Edit im Browser erreicht | Vollständiger Profil-/Lösch-/Storagefallback-Smoke weiterhin offen |
| Unabhängige Astra-Regressionen | QA-Lock Run 11: unveränderte Datei, exit 0, 1 Datei / 3 Tests bestanden, 850ms | Journey-Positivzeit, sichtbare HTML-Bedingungen, Controller-Spätresultat; keine Browser-/HTTP-/Shell-Abnahme |
| Abhängigkeiten | Controller meldete Reparatur, QA-Lock bestätigt `npm ls zod --all` sauber: 3.25.76 durchgehend | Frühere 4.6.5-Installation ist als Befund erledigt; dies beweist weder Compilerursache noch Compilerfix |
| Typecheck | Nach >100 Sekunden ohne Ausgabe abgebrochen | Nicht bestanden, keine Diagnose einer bestimmten Ursache |
| Build | Nach 85 Sekunden in tsc abgebrochen; Vite-Bundling nicht erreicht | Nicht bestanden; nicht als erfolgreicher Produktionsbuild melden |
| Chromiuminstallation | CDN-Timeouts, exit 1 | Kein installierter Playwright-Chromium nachgewiesen |
| Erster Edge-Profilsmoke | QA-Lock: Edge gestartet, `page.goto('/')` nach 30s ohne load beendet; HTML erhalten, `/@vite/client`, `/@react-refresh`, `/src/main.tsx` noch ohne Response | Keine Profilassertion erreicht, kein Frontendpass |
| Modulendpoint-Diagnose | QA-Lock: isolierter Vite-Server nach ~4s ready, Request `/` antwortete nicht innerhalb 15s; beim kontrollierten Stop Dependency-Scanning/Bundling geloggt | Server-ready war kein Beleg für nutzbares Frontend |
| Zweiter Profilsmoke | QA-Lock 15:24: trotz `/src/main.tsx`-Bereitschaft 30s Timeout; HTML/Appentry/erste Reactmodule 200, spätere Vite-/Appmodule pending | Keine Profilassertion erfolgreich erreicht |
| Verlängerter Profilsmoke | QA-Lock 15:26: App geladen, Profilabschluss erreicht, danach stale Savebanner-/Close-Helperfehler; exit 1 | Frontendladen teilweise nachgewiesen, kein grüner Profilsmoke; A-07 beobachtet |
| Weitere Profil-E2E | QA-Lock 15:31: Save, Reload und Edit/Save erreicht; zwei weitere Läufe wegen verbliebenem stale-Close-Selektor exit 1; korrigierter Profilgesamt-Smoke Run 12 aktiv | Teilfunktionen tatsächlich beobachtet, noch kein grüner Gesamtsmoke; keine eigenen konkurrierenden Prozesse gestartet |

Die A2UI-Typingpatchdatei ist ein unbewiesener/unangewandter Kandidat; daraus folgt keine Fehlerursache. Browser Use/CUA scheiterte laut Koordination vor Browseraktionen am Kernel-Setup; keine UI-Beobachtung daraus ableiten. Die README/Acceptance-Seiten tragen teilweise ältere „noch nicht ausgeführt“-/„Integration fehlt“-Stände; QA-Lock, aktuelle Quellen und konkrete Run-Ausgaben haben Vorrang.

## PRD-Coverage-Matrix

Statusdefinition: **bestanden** bezeichnet ausschließlich den genannten vorhandenen abgeschlossenen Mocktest-Nachweis (Fremdevidenz, nicht E2E). **Quelle geprüft** = Implementierung nachgelesen, keine Runtime-Abnahme. **offen** = fehlender Beleg oder bestätigte Blockade. **nicht implementiert** = entsprechender Produktpfad fehlt. Kombinierte Zeilen benennen explizit die Teilgrenze.

| PRD-Unterpunkt | Status | Evidenz / verbleibende Grenze |
|---|---|---|
| 1 Produkt: sprach-/textgesteuerter Alltagsassistent, Zielgruppenwirkung | Quelle geprüft / offen | Textchat/Voice-Code; reale Nutzbarkeit und Wirkung für ältere Menschen nicht evaluiert |
| 2 Lokal, kein Deployment/Login/Usermanagement | Quelle geprüft | package/Vite/index; kein veröffentlichter Dienst oder Authflow |
| 2 Profil auf Gerät, editier-/löschbar | bestanden (Speicher-Mocks) / offen (Browser) | Profil 8 Tests fremd; erster E2E vor Assertions blockiert |
| 2 Chat, Englisch, Mobile-first/zusätzlich Desktop | Quelle geprüft / offen | Englische Shell, Breakpoints; keine vollständige visuelle Prüfung |
| 2 Bewusster Mic-Knopf, A2UI ab Beginn | Quelle geprüft / offen | Echte Komponenten/SDK-Bindings, Runtime fehlt |
| 2 Sechs Bereiche, kein Einkauf | Quelle geprüft | Kind-Enum/Registry sechs, kein Warenkorb/Shopping-Provider |
| 2 Informations-/Bildererhalt | Quelle geprüft / offen | Karten erhalten Felder/Bilder, Originalquelle A-04 |
| 3.1 Event finden/Bedingungen | Quelle geprüft / offen | Feste Fictional-Suche, partielle Regex-Constraints, A-05 |
| 3.1 Datum/Vorstellung/Kategorie/Sitz/Anzahl auswählen | nicht implementiert (variable Auswahl) | Nur festes Paket in einer Eventkarte; kein Varianten-/Mengenformular |
| 3.1 Vollständige Review/explicit finish | offen | Controllerreview vorhanden, A-01/A-02 |
| 3.1 Alle Eventfelder, Unknowns/Bilder | Quelle geprüft | Eventnormalizer und Card; 13 Providertests gemeldet, keine aktuelle gesamte UI-Abnahme |
| 3.2 Start/Ziel/Datum/Zeit/Rückfahrt/Reisende | Quelle geprüft / teilweise bestanden (Mock) | Text-Regex; konkreter Zeitfilter A-03 durch unveränderte Regression bestanden, Profilpräferenzen nicht übernommen |
| 3.2 Tarife/Verbindungen und günstigere Alternativen ohne stille Relaxierung | Quelle geprüft | Train/Coach-Modusfilter und Bedingungen; keine umfassende natürliche Constraint-Interpretation |
| 3.2 Betreiber/Stops/Umstiege/Klasse/Gepäck/Zugang/Gültigkeit/Preis/Terms | Quelle geprüft | Normalizer ergänzt Unknowns; vorhandene Details bleiben erhalten |
| 3.3 Praxis/Fach/Ort/Besuchsart/Zeitfenster finden | Quelle geprüft | Harte Appointmentfilter mit Tests; Browser offen |
| 3.3 Erforderliche Angaben prüfen/Termin vorbereiten/freigeben | offen / nicht implementiert (Fallformular) | Empty Profile möglich, keine Versicherungs-/Geburtsdatum-Nachfrage; Receipt A-01 |
| 3.3 Arzt-Pflichtfelder/keine medizinische Beratung | Quelle geprüft | Kosten/Versicherung unknown, Organisation-only und keine Symptominferenz |
| 3.4 Kennzeichnung kontrollierter Website | Quelle geprüft | Demo-Badges, Fixturetitel, Texte und README |
| 3.4 Bestehende Websites je separat geprüft | nicht implementiert (bewusst spätere Phase) | Ausschließlich Fixtures; keine reale Website-Policy-Abnahme |
| 3.5 Behörde/Anliegen/Ort/Slot/Dokumente/Gebühren/Provenienz | Quelle geprüft | Eigener Provider/Fixture/Unknowns; Suche nur feste ausdrücklich ungeprüfte Alternative |
| 3.5 Datenfreigabe/keine erfundenen realen Rechtsregeln | Quelle geprüft / offen | Name/E-Mail, Request-Action, keine Application; Abschluss A-01/A-02 |
| 3.6 Leistung/Gebiet/Fenster/Kostenbestandteile/Anfahrt/Material/Voraussetzungen | Quelle geprüft | Eigene Service-Fakten; unbekannte Verfügbarkeit/Qualifikation/Preise bleiben unbekannt |
| 3.6 Anfrage/Kostenvoranschlag/Beauftragung unterscheidbar | Quelle geprüft / nicht implementiert (Quote/Commission) | Es gibt ausschließlich unverbindliche Request-Fixture, keine Quoteannahme/Beauftragung |
| 3.6 Datenweitergabe/Abschlussfreigabe | offen | Eigene Action/Disclosure vorhanden, A-01/A-02 |
| 3.7 Kurse/Ausstellungen/Verein finden/vergleichen | Quelle geprüft / nicht implementiert (Breite) | Ein fester Töpferkurs; keine unterschiedlichen Ausstellung-/Vereinsangebote |
| 3.7 Wiederholung/Voraussetzungen/Material/Mitgliedschaft/Zugang/Kosten | Quelle geprüft | Eigenes Schema via Facts/Details, Unknown-Materialkosten und originaler Flyer |
| 3.7 Auswahl bucht nicht; Anmeldung braucht Freigabe | Quelle geprüft / offen | Broker-Gate, request_received ausschließlich Eingang; A-01/A-02 |
| 4 Onboarding About you/Addresses/Preferences | Quelle geprüft | Drei Schritte, optionale Zusatzadressen/Präferenzen, kein erzwungenes Geburtsdatum |
| 4 Fallweise Reisende/Geburtsdatum/Versicherung, keine Altersannahme | nicht implementiert / Quelle geprüft | Fallfragebogen fehlt; keine Alters-/Discountinferenz gefunden |
| 4 Versionierter LocalStorage/reload/edit/delete/Fehler | bestanden (8 Speicher-Mocks) / offen (UI) | Hook/Envelope/Readback source, E2E nicht erreicht |
| 4 Minimierung, Modell vs Zielwebsite, konkrete Freigabe | Quelle geprüft / offen | Shared-/Controller-/Disclosureprojektion, kein Profil in AI; A-05 |
| 4 Sitzungsflüchtigkeit außer Profil | Quelle geprüft | WS-Session/Browser/Receipt-Map, close cleanup; keine DB |
| 5 Chatverlauf, eingebettete Auswahl/Input/Review/Result | Quelle geprüft | Chronologische Timeline und deaktivierte historische Karten; Runtime offen |
| 5 Beispiele/Eingabe/Send/Mic/Stop | Quelle geprüft | Sechs Beispiele; Stop nur bei working; State-Race A-02 |
| 5 Mobile Website/Chat, Desktop gleiche Session/Screenshotzeit | Quelle geprüft / offen | Eine Browserreferenz und Screenshot mit updatedAt; Browserabnahme offen |
| 5 Schrift 20px/Zusatz18px/Bedienziele/Fokus/Kontrast/Zoom/SR | offen | Chat20px und viele 44–58px Controls source; A-06; Kontrast/SR/visuelle Zoomprüfung fehlen |
| 5 Mic aus unabhängig Stop; kein Scroll-Zwang bei Lesen | Quelle geprüft / offen | separate Handler, shouldFollowRef; tatsächliche Scroll-/Mic-Interaktion offen |
| 6 KI strukturiert ohne erfundene Fakten/Termsverlust | Quelle geprüft | Gemma darf nur bekannte Fakt-IDs auswählen; Originalkarten vollständig, harte Längenlimits |
| 6 Pflichtkosten/Unknowns/Teilsumme/Conditions sichtbar | Quelle geprüft | price null/unknownCosts/Details; Quellenansicht A-04; keine komplette Schema-Grenzprüfung im Runtime |
| 6 Originalbilder/Galerie/Count/Thumb/Zoom/Fehlerzustand | Quelle geprüft / offen | Eigene Original-Fixture-SVGs, Dialog, failure state; Lade-/Fokustest noch offen |
| 6 Quelle jeder Angabe/Bild/Original erreichbar/Teilvollständigkeit | teilweise bestanden (HTML-Mock) / offen (Browser) | A-04-Regression bestanden, Session-Links vorhanden, Browserverifikation fehlt; ältere Tasklinks verfallen bereits beim neuen Task |
| 7 Gepflegter React-A2UI-Renderer/eigener Katalog/Radix | Quelle geprüft / offen | Bibliotheksexports stimmen, reale v0.9-Nachrichten; Rendererpass offen |
| 7 Nur deklarativ/Schema/Sitzungs-/Aktionsprüfung | Quelle geprüft | Allowlist/Boundaries, Offer/Version-Binding; Adversarial-/Grenztests noch offen |
| 7 Karten/Galerie/Formulare, feste Shell, controllerverifizierte Review | Quelle geprüft | 6 Karten/Galerie/2 Formkomponenten; Formkomponenten noch nicht in Fachflows eingesetzt |
| 7 A2UI kein Ersatz für Extraktion/Verifikation; keine Profilkopie | Quelle geprüft | Browser liest JSON-Fixture, Broker/Controller separat; Live-Webextraktion fehlt |
| 8 React/TS/Vite; Node/WS; Playwright lokal | Quelle geprüft / offen | Quellen/Startskripte, Vite-Modulladen und Build noch blockiert |
| 8 Gemini Gespräch/Aufgabensteuerung; Gemma Beobachtung/Planung | Quelle geprüft / nicht implementiert (Browserplanung) | Gemini klassifiziert; Gemma ordnet Fakt-IDs. Kein modellgenerierter Browseraktionsplan oder kontextueller Multi-Turn-Taskcontroller |
| 8 Toolbroker außerhalb Modell/LocalStorage | Quelle geprüft | Mutation allein Broker, kein KI-Confirm |
| 8 Serverseitige Keys, Modelle konfigurierbar/tatsächlich getestet | Quelle geprüft / offen | Geheimnisfreie Statuslogik und opt-in Probes; Zugang/Quote/Modelle/Region/Live ungeprüft; APIroute nutzerseitig offen |
| 8 Kein P0-Clouddeployment | Quelle geprüft | Kein Deployment gestartet oder für Demo erforderlich |
| 9 Auswahl bereitet vor; genaue Review und explicit action | Quelle geprüft / offen | A2UI select→broker.prepare; Confirm separat; A-01/A-02 |
| 9 Bindung Aktion/Site/Eingaben/Kosten/Version/TTL/Invalidation | bestanden (gezielte Mock-Fremdevidenz) / offen (UI/E2E) | Gate/Broker source und 25 Ownerchecks; ursprünglicher A-02-Controllerfall jetzt ebenfalls grün, Shell nachgelesen |
| 9 Normale Klicks/Formulare/indirekte Endpunkte keine Umgehung | Quelle geprüft / teilweise bestanden (HTTP-Mock/Fremdevidenz) | Direct POST ohne Sessiongrant abgewiesen; gültiger echter Receiptweg noch offen |
| 9 Eine Mutation, Stop/unklares Ergebnis/kein blinder Retry | Quelle geprüft / offen | Broker lock/recovery, A-01/A-02; Browser-Unterbrechungsfälle nicht E2E belegt |
| 9 Prepared/Submitted/Confirmed/Unclear verschieden | Quelle geprüft / offen | Phasen/Outcome vorhanden; Submitted bereits vor Gateprüfung ausgesendet, nicht allein Transportbeleg; A-01/A-02 |
| 10 Lokal startbar ohne Login/Deployment | offen | Edge startete, UI-Modulantworten blockiert; Backendhealth allein reicht nicht |
| 10 Profil hält Reload und erlaubt Änderung/Löschen | offen (Browser) | Speicher-Mocks grün; Browserassertions noch nicht erreicht |
| 10 Vollständig Text/Tastatur; Stimme zusätzlich | offen | Source-Pfade vorhanden, A-05; Tastatur und Audioendkette unbestätigt |
| 10 Sechs Fachflows im selben Chat | offen | Source integriert; A-01, keine sechs grünen Vollflüsse |
| 10 Echte A2UI-Nachrichten/Kartenactions | offen | Source geprüft; echter DOM-/Click-Nachweis fehlt |
| 10 Informationen/Bilder/Pflichtreview | offen | A-04, keine vollständige UI-Abnahme |
| 10 Gleiche Browsersitzung Mobile/Desktop | offen | Source dieselbe Referenz; E2E ausstehend |
| 10 Keine Buchung ohne aktuelle einmalige Freigabe | bestanden (Gate-/Broker-Mocks, Fremdevidenz) / offen (E2E) | Guter Kontrollentwurf, kein uneingeschränkter Gesamtnachweis |
| 10 Providerbeleg/unklar nicht erneut buchen | offen | A-01/A-02; Broker selbst sendet einmal |
| 10 Testprovider/Beispiele/nicht integrierte Websites dokumentiert | Quelle geprüft | README/Integrationsgrenzen vorhanden, Statusseiten müssen auf aktuellen Snapshot gebracht werden |
| 10 UI-Abnahme kein Integrations-/Wirksamkeitsnachweis | Quelle geprüft | Keine solche Gleichsetzung im Urteil |
| 11 Repo/PRD/README/Env-Template/Start/Katalog/Checks/Limits | Quelle geprüft | Dateien vorhanden; `.env.example` Existenz aus Dateiinventar, keine tatsächlichen Secrets geprüft/gelesen |
| 11 Vertikaler Start, parallele Erweiterungen, spätere reale Websites | offen / nicht implementiert (reale Adapter) | Erst lokalen Vollfluss herstellen; sechs Provider vorhanden, kein Einkaufsumfang |

## Ungeprüfte Voraussetzungen und bewusst keine bestätigten Fehler

- Ob der neue saubere Zod-Baum TypeScript/Vite-Probleme beseitigt, ist noch nicht gemessen. Eine generische Typinferenz-/Zod-Ursache bleibt Hypothese; keine Installation/Typingpatch durch mich.
- A2UI StrictMode-Mount/Cleanup, Datenmodellupdates, Formsetter, Reject-Grenzen und Actioncallbacks müssen in echtem Browser bzw. fokussierter Laufzeitprobe nachgewiesen werden. Aus verfügbaren Quellen folgt weder ein beobachteter Renderercrash noch ein Pass.
- Voice-Konfiguration verwendet denselben grundsätzlichen Availability-Check wie Text; `voiceAvailable=true` bedeutet konfigurierte Route, keine getestete Live-Fähigkeit. Die zwischenzeitlich eingeführte separate Live-Region wurde nach Nutzerkorrektur wieder zurückgenommen; Nachlesen um 15:22 findet die optionale Property nicht mehr in Config/Voice. Der vorübergehende Integrationszustand wurde nicht als stabiler TS-Fehler gemeldet. Google-API-Route/Grant, Credentials, Projekt, GDG-Billingzuordnung/Quote und konkrete Modelle sind unbestätigt.
- Die Bibliotheksprüfung bestätigt, dass die installierte google-auth-library `CLOUDSDK_CONFIG` bei ADC-Pfadsuche berücksichtigt. Eine mutmaßliche fehlende Unterstützung wurde daher **nicht** als Fehler gemeldet; Credentialinhalt und echte Anmeldung blieben ungelesen.
- Stop/neue Suche während noch laufendem `BrowserSession.start/readOffers` hat keinen expliziten pending-start-Lock; mögliche doppelte Starts/konkurrierende Navigation sind eine zusätzliche Race-Hypothese, noch nicht isoliert reproduziert. Nicht als bestätigten Browserfehler zählen.
- Kein externes Screenreader-/Kontrastaudit, kein tatsächliches Audioresampling-Qualitäts-/Mic-Browser-Lifecycletesting. CSS-Maße und Labels sind nur statisch beurteilt.

## Priorisierte Restliste für den Coordinator

1. **A-01 Source-Fix durch echten lokalen HTTP-Receiptweg nach passendem POST bestätigen**, einschließlich Capabilitybindung, falschem Token, alter Invocation und Sessiontrennung. Anschließend sechs richtige Outcome-Typen nachweisen.
2. **A-02-Kettenfix in Shell/E2E verifizieren**: Der unveränderte Controller-Mockfall ist inzwischen grün, Shellsource vollständig korrigiert. Nun echte bzw. kontrolliert verzögerte Resultate nach Stop/Reset/neuem Auftrag zeigen lassen und aktive Freigabe/Status prüfen; keine erneute Ausführung derselben Unitdatei ohne neuen Anlass.
3. **Lokales Frontendladen stabilisieren** (aktueller Vite-Modulendpoint-Befund), danach bounded Typecheck und kompletter Build seriell. Sauberer Dependencybaum allein genügt nicht.
4. **A-03/A-05 browserseitig verifizieren**: positiver Zeitfilter ist im Mock bestanden; Auswahlprofil und lexikalisch unabhängiger Voice-Taskweg source-fixed. Positive wie negative Beispiele prüfen; identische Voice-Texte mit verschiedenen IDs zulassen, doppeltes ID-Event einmal, „Yes“ niemals Abschluss.
5. **A-04/A-06 Browsernachweis**: sichtbare Quellen-Details sind per unverändertem Test bestätigt; Disclosure-/Offer-/Profile-/Status-/Bedientexte source-fixed. Nach größeren Texten besonders Überläufe und mobile Controls prüfen; alle Originalbilder, Dialogfokus, Fehlbilder, Keyboard, Mobile/Websitewechsel und Zoom tatsächlich prüfen.
6. **A-07/Testabnahme**: Helfer/Assertions auf aktuelles Produkt abstimmen; nicht Suite passend „grün machen“ durch Entfernen fachlicher Prüfungen. Journey bis Confirm ausbauen; Government/Service/Leisure explizit request_received plus Reference/Receipt nachweisen. Stop vor/nach POST, stale/double/expiry/profile-change, Lost-response und Reset-/neuer-Task-Konkurrenz aufnehmen.
7. **Abnahme-/Lieferdokumentation aktualisieren**, dann Googlezugang separat anhand endgültiger Nutzerentscheidung und tatsächlicher model-/audiofähiger Route prüfen. Kein Key-Präsenz-/SDK-Konstruktorstatus als Zugangspass.

Eine eng gekennzeichnete statische Fixture-Demo ist fachlich vorbereitet; „lokal vollständig bedienbar“ oder „PRD V0.3 fertig“ lässt sich aus dem aktuellen Stand nicht ableiten.

## Laufende Änderungen und Snapshots

Die ursprünglichen Befundbeschreibungen oben bleiben absichtlich erhalten. **Die neuesten Nachprüfungsabsätze und diese aktuelle Tabelle haben Vorrang vor der historischen Ist-Beschreibung.** Verweise auf A-01 bis A-06 in der Coverage-Matrix bedeuten nach den Sourcefixes offene weitergehende Laufzeitabnahme, keinen weiterhin behaupteten identischen Codefehler. A-02/A-03/A-04 haben zusätzlich die ausdrücklich eingegrenzte Mockevidenz aus QA Run 11.

| Befund | Zuletzt unabhängig gelesener Stand |
|---|---|
| A-01 | Sourcefix bestätigt: spezifische State-Route vor Kindroute, genaue private Invocationbindung erhalten; echter HTTP-Test offen |
| A-02 | Gesamte Controller/Schema/Shell-Kette source-fixed; unveränderter Controller-Mock grün; Shell/E2E-Abnahme offen |
| A-03 | Sourcefix bestätigt, unveränderter positiver Zeit-Mock grün |
| A-04 | Sourcefix bestätigt, unveränderter sichtbarer Originaldetail-Test grün; Browser offen |
| A-05 | Gesamte validierte A2UI-kind→Minimalprofil→Controller-Kette und lexikalisch unabhängiger Voice-Taskweg source-fixed; Runtime offen |
| A-06 | Disclosure-/Offer-/Profile-/Status-/Bedientexte samt Mobile-Overrides jetzt 18px, Sourcefix bestätigt; visuelle Prüfung offen |
| A-07 | Profilhelper weiter korrigiert, tatsächlicher Save/Reload/Editfortschritt; grüner Gesamtsmoke und präzise Vollfluss-/Voiceevent-Assertions offen |

Cloud-Fremdbericht des Coordinators nach der Nutzerkorrektur: lesende Inventarprüfung habe das gewünschte aktive App-Projekt bereits am einzigen offenen einschlägigen Billingkonto gefunden; kein Kontowechsel nötig. Grant-Scope, tatsächliches Ablaufdatum/Zeitzone und erlaubte API bleiben unbestätigt. Der Name eines Kontos mit Datumsbestandteil ist kein Ablaufnachweis. Dies ist **kein eigener Console-/Credential-/Modellzugangsnachweis** und rechtfertigt keinen API-Routenwechsel. Vollständige Account-/Credentialdaten werden hier nicht dokumentiert.

Letzter umfassender Quellen-/Hashsnapshot: **2026-10-02 15:25:56 PDT (22:25:56 UTC)**; anschließend QA-Status und Testhelfer um 15:26 erneut gelesen. Folgende SHA256-Werte machen die wesentlichen überprüften Revisionen unterscheidbar (kein atomarer Git-Commit; andere Owner arbeiten weiter):

| Pfad | SHA256 |
|---|---|
| shared/schema.ts | AC96EEED06BF5C518A48A0E51609845ED957BA4E8D8CF3F91AF98F9A7D7D7502 |
| server/index.ts | BC7D509A81197ACF44EAEDF13B8A0A704F5373A6DC34FA18039008705423497B |
| server/session.ts | 6F67C95BD804C1BCCE926233534A0C4D6223067F7797EA374897A0E051C7AFBF |
| server/demo.ts | C5A02779B9D9C195B2A4A251B941C6462A1013D8E29EEABD492003C4AC8FD144 |
| server/providers/journeys.ts | C75C791BC206E6682423D2DF861407F276C5B58296AADC67D7C1F3F967222E92 |
| src/App.tsx | 8A8BEE99E2134A015971174B03A0843C5D893DDD645541B60BD8087A079A1B01 |
| src/a2ui/catalog.tsx | F3C857EBE06CABDF487721B5CAE964932451F26D2DA4E86ECB53472DF334F193 |
| src/a2ui/validation.ts | A6B0F9808D4F0F6719FB11E98C5B7702100DCE3D017FE560796512C3D3A9EBE7 |
| src/styles.css | F7EA7DCF7E79FB88C2AD0A4AA3555D735255730869C16E3AE770E3997CA3BE2C |
| tests/e2e/acceptance.spec.ts | 1142C39476FF39C7CED4857723B8E0353526F4AA79C5EBACD76B66C4FFFDA2FB |
| tests/review/astra-overall.test.ts | AFCDB333526A3C024A6B7F52CFE0F31D1A5A8A7032AF9903A89B614C4D593499 |

### Nachprüfungs-Snapshot 15:33 PDT

Die abschließende Quellenprüfung der Frontendketten und Schriftgrößen bezieht sich auf **2026-10-02 15:33:10 PDT**. Diese Werte ergänzen bzw. ersetzen die entsprechenden älteren Frontendwerte oben; auch dies ist wegen paralleler Owneränderungen kein atomarer Commit.

| Pfad | SHA256 |
|---|---|
| src/App.tsx | AD9EED3981B59187558D57FD23C27A99B221682AD34F6FBD664DA9649F76F78F |
| src/a2ui/A2UIOfferSurface.tsx | 98E124CD2D9F4E53CCADAAB041A3BD9BFCBAF0D3A79D8F0C6925D84A42A29832 |
| src/a2ui/validation.ts | F38173F082EA7D7A59991F560FE9F049F73930B1FC54D06FB98C5F098461F6BB |
| src/styles.css | 33F69D253FD1CB437DD0674FD3DD3AFE0045F403F5A3A03795B06FFB767CDC87 |
| src/profile/profile.css | BDC4F5D5C21CE1ADFD822907C9EBC2CE17F8BFA5F3BBBF07AF7ABF9840671817 |
| src/components/offers/offers.css | D833CA69996CED7559A409C363087D627338BBE47110058A312FC00470E2F92B |

**Neuester gelesener QA-Stand beim Abschluss:** Run 12 scheiterte erneut nach 120 Sekunden bereits bei der Navigation; keine neuen Profilassertions. Run 13 dokumentiert eine weiße Seite und ausstehende Vite-Modulantworten, ohne verbliebenen QA-Vite-Prozess. Run 14 (`npm test -- --maxWorkers=1`) läuft; Typecheck, Builddiagnose und weitere E2E-Abnahme sind ausstehend. Der Teilfortschritt aus Run 10 und die drei bestandenen Offlinefälle aus Run 11 bleiben gültig, ergeben aber keinen UI-/Gesamtabnahmepass. Ich habe keine konkurrierenden Prüfungen gestartet.
