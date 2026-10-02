# easy-web-assistant
## Product Requirements Document · Version 0.3 · 2. Oktober 2026

Diese Fassung ergänzt Version 0.2 um die am 2. Oktober ausdrücklich parallel beauftragten Bereiche Behördentermine, Dienstleistungen und Freizeit. Die bisherigen Anforderungen bleiben bestehen. Sie beschreibt Anforderungen, keine bereits nachgewiesenen Fähigkeiten.

## 1. Produkt und Ziel

easy-web-assistant ist ein sprach- und textgesteuerter Alltagsassistent. Er bedient Websites im Hintergrund und stellt deren Informationen in einem verständlichen, nicht technischen Chat dar. Der Agent übernimmt die Bedienarbeit. Der Mensch bestimmt Ziel, Bedingungen und verbindliche Entscheidungen.

Die Anwendung soll insbesondere älteren Menschen digitale Selbstständigkeit ermöglichen. Die erste Vorführung richtet sich an eine Hackathon-Jury; sie gilt nicht als Wirksamkeitsnachweis für ältere Menschen.

## 2. Verbindliche Änderungen gegenüber Version 0.1

| Thema | Neue Festlegung |
|---|---|
| Ausführung | Lokal laufende Webapp, zunächst kein Deployment. |
| Benutzerverwaltung | Kein Login, keine Konten und kein anwendungsseitiges Usermanagement. |
| Profildaten | Auf dem Gerät gespeichert, über Onboarding erfasst und später editier- und löschbar. |
| Oberfläche | Chatbotartiger Gesprächsverlauf mit eingebetteten strukturierten Karten. Ausgangspunkt: offene Assistentenantworten. |
| Gerät | Mobile zuerst; Desktop zusätzlich. |
| Sprache | Englische Oberfläche und englische Demo. |
| Spracheingabe | Mikrofon bewusst per Knopf ein- und ausschalten. |
| Generative UI | Googles A2UI ist von Beginn an Bestandteil der Implementierung. |
| Anwendungsfälle | Eventtickets, Mobilitätstickets und Arzttermine; parallel ergänzt um Behördentermine, Dienstleistungen und zusätzliche Freizeitangebote. |
| Einkauf | Aus dem aktuellen MVP entfernt. Keine Produkt- oder Warenkorbintegration in dieser Phase. |
| Informationen | Möglichst alle angebotsspezifischen Informationen erhalten, durch KI strukturiert und von unnötigen Wiederholungen befreit. |
| Bilder | Originalbilder des jeweiligen Anbieters; alle angebotsspezifischen Bilder erreichbar. Keine generierten Ersatzbilder für reale Angebote. |

## 3. Anwendungsfälle und MVP-Grenzen

### 3.1 Eventtickets

Veranstaltung finden, Bedingungen berücksichtigen, Datum und Vorstellung auswählen, Ticketart beziehungsweise Sitzplatz und Anzahl wählen, vollständige Buchungsübersicht prüfen und den vorgesehenen Abschluss ausdrücklich freigeben.

Die Karte enthält Veranstaltungsname, Anbieter, Originalbilder, Beschreibung, Datum, Uhrzeit und Zeitzone beziehungsweise örtliche Zeit, Veranstaltungsort, Ticketkategorien, Anzahl, Sitzplätze, Verfügbarkeit, Zugangsinformationen, Einzelpreise, Gebühren, Gesamtpreis und bekannte Storno- oder Übertragungsbedingungen. Nicht verfügbare Angaben werden als unbekannt ausgewiesen.

### 3.2 Mobilitätstickets

Zug-, Bus- oder vergleichbare Fahrkarten finden. Abfahrtsort, Ziel, Datum, gewünschte Zeit, Rückfahrt und Reisende werden aus Auftrag und bestätigten Angaben übernommen. Verbindungen und Tarife werden verglichen.

Die Karte enthält Betreiber, Start und Ziel, Haltestellen, Abfahrt und Ankunft, Dauer, Umstiege einschließlich Umstiegszeiten, Hin- und Rückfahrt, Klasse, Reisende, Reservierungen, Gepäck- und Zugangsbedingungen soweit vorhanden, Tarifgültigkeit, Zugbindung, Ermäßigungsbedingungen, Preise, Gebühren, Storno- und Änderungsbedingungen. Ein günstigerer Tarif darf die genannten Anforderungen nicht stillschweigend verändern.

### 3.3 Arzttermine

Passende Praxis beziehungsweise Fachrichtung, Ort, Terminart und gewünschtes Zeitfenster finden; verfügbare Termine vergleichen; erforderliche Angaben prüfen; eine Terminbuchung vorbereiten und ausdrücklich freigeben.

Die Karte enthält Praxis und Behandler soweit bekannt, Fachrichtung, Originalbilder soweit vorhanden, Anschrift, Besuchsart, Termin und Dauer, Zugangsinformationen, Voraussetzungen, bekannte Kosten, Hinweise zur Versicherung sowie Absage- und Änderungsbedingungen. Die Anwendung unterstützt Terminorganisation. Diagnose, Behandlungsempfehlung und medizinische Beratung sind nicht Bestandteil dieses MVP.

### 3.4 Technische Abnahmegrenze

Eine lokale Testwebsite darf die UI und Abschlusslogik demonstrieren. Sie wird sichtbar als Testumgebung gekennzeichnet und ersetzt keinen Nachweis einer Integration mit einer bestehenden Website. Jeder reale Provider benötigt einen separat geprüften Ablauf und eine passende Website-Policy. Beliebige Websites, private Produktivkonten, echte Zahlungen, CAPTCHA-Lösung und MFA-Umgehung sind nicht zugesagt.

### 3.5 Behördentermine

Einen Termin bei einer passenden Stelle finden und angebotene Zeitfenster vergleichen. Behörde, Anliegen, Ort, Terminformat, Datum und Uhrzeit, benötigte Unterlagen, Voraussetzungen, Ablauf und bekannte Gebühren werden verständlich angezeigt. Unbekannte oder nur teilweise geprüfte Angaben bleiben ausdrücklich gekennzeichnet und mit der Quelle verbunden.

Die App organisiert Termine; sie erfindet keine rechtlichen Anforderungen. Vor einer Terminbuchung zeigt sie die konkrete Datenweitergabe und fordert eine passende aktuelle Freigabe an. Die erste Integration darf eine sichtbar fiktive Teststelle verwenden.

### 3.6 Dienstleistungen

Reparaturdienste, Haushaltshilfe oder Handwerker suchen und eine Termin- beziehungsweise Angebotsanfrage vorbereiten. Die Darstellung enthält Anbieter, angebotene Leistung, Einzugsgebiet, Zeitfenster, bekannte Preisbestandteile einschließlich Anfahrt und Material soweit angegeben, offene Kosten, Voraussetzungen und relevante Bedingungen.

Eine unverbindliche Anfrage, ein Kostenvoranschlag und eine verbindliche Beauftragung sind verschiedene Zustände. Die App behauptet weder eine bestätigte Verfügbarkeit noch einen Gesamtpreis ohne Beleg. Datenweitergabe und verbindliche Schritte bleiben ausdrücklich freigabepflichtig. Die erste Integration darf einen sichtbar fiktiven Testdienstleister verwenden.

### 3.7 Freizeit

Kurse, Ausstellungen, Vereinsangebote und weitere Veranstaltungen finden und vergleichen. Die Eventdarstellung wird sinnvoll wiederverwendet. Zusätzlich bleiben wiederkehrende Termine, Teilnahmevoraussetzungen, benötigte Materialien, Mitgliedschaftsbedingungen, Zugangsinformationen und vollständige bekannte Kosten erreichbar, soweit die Quelle sie liefert.

Eine Auswahl bucht nichts. Anmeldung oder Buchung benötigt dieselbe geprüfte Datenfreigabe und Abschlusskontrolle wie die bisherigen Bereiche. Die erste Integration darf sichtbar fiktive Testangebote verwenden.

Die drei Erweiterungen werden auf ausdrücklichen Nutzerwunsch parallel umgesetzt. Ihre eigenen Provider-, UI-, Freigabe- und Abnahmeprüfungen sind erforderlich; sie gelten nicht allein durch Wiederverwendung vorhandener Komponenten als fertig. Schnittstellen und Dateizuständigkeiten werden in `docs/contracts.md` und `docs/expansion-spec.md` abgestimmt.

## 4. Onboarding und Speicherung auf dem Gerät

Das Onboarding erhebt viele wiederverwendbare Informationen in wenigen gut verständlichen Schritten. Eingaben bleiben editierbar; noch nicht erforderliche Informationen können später ergänzt werden.

1. **About you:** vollständiger Name, E-Mail, Telefonnummer.
2. **Your addresses:** Wohnadresse mit Straße, Ort, Postleitzahl und Land; optional abweichende Liefer- und Rechnungsadresse.
3. **Your preferences:** häufiger Abfahrtsort, Zugangsanforderungen und Terminpräferenzen.

Geburtsdatum, zusätzliche Reisende, Versicherungsangaben und weitere fallspezifische Daten werden ergänzt, wenn ein tatsächlicher Ablauf sie erfordert. Alter allein begründet keine angenommene Einschränkung oder Ermäßigung.

Das Profil wird versioniert in Browser-LocalStorage gespeichert. Kein Login und keine Backend-Profildatenbank. **Your details** erlaubt Anzeigen, Ändern und Löschen. Bei blockierter Speicherung informiert die App verständlich; sie behauptet keinen erfolgreichen Speichervorgang. Auf einem anderen Browser oder Gerät stehen die Angaben nicht automatisch zur Verfügung.

Die Speicherung auf dem Gerät ist von der Verarbeitung durch den Assistenten und einen Modellanbieter zu unterscheiden. Bei einer Aufgabe werden nur die benötigten Angaben weitergegeben. Vor dem Übertragen an eine Zielwebsite zeigt die App Anbieter und konkrete Felder. Die Datenfreigabe ist ausdrücklich; das Vorhandensein eines Profils bedeutet keine pauschale Freigabe. Die Jury-Demo verwendet künstliche Personendaten.

Browsercookies, Gespräch, Aufgabenstatus, Freigaben und Browserprofil bleiben sitzungsgebunden. Die dauerhafte Speicherung des Profils hebt die bisherige vollständige Flüchtigkeit aus Version 0.1 ausschließlich für diese lokal gespeicherten Angaben auf.

## 5. Oberfläche

Die Standardansicht ist ein Chat. Assistentenantworten sind offen und gut lesbar; Nutzernachrichten sind klar davon unterscheidbar. Auswahl-, Eingabe-, Informations-, Prüf- und Ergebniskarten erscheinen direkt im Verlauf.

Die Startansicht bietet Beispiele für Events, Mobilität und Arzttermine. Es gibt einen großen Eingabebereich, einen Sendeknopf und einen beschrifteten Mikrofonknopf. Bei laufender Arbeit bleibt **Stop** erreichbar.

Auf Mobile schaltet **Website** oben rechts zwischen Gespräch und tatsächlicher Ansicht der Browsersitzung um. **Chat** führt zurück. Auf Desktop kann die Website daneben erscheinen. Der Wechsel erzeugt weder einen neuen Auftrag noch eine zweite Browsersitzung. Die erste Integration kann aktualisierte Screenshots mit Zeitpunkt der letzten Beobachtung zeigen; sie ist keine behauptete interaktive Fernbrowserübernahme.

Gesprächsschrift: ungefähr 20 CSS-Pixel; wichtige ergänzende Texte mindestens 18 CSS-Pixel. Große Bedienelemente, möglichst etwa 56 Pixel hoch, niemals unter der bisherigen 44×44-Pixel-Vorgabe. Tastaturbedienung, sichtbarer Fokus, ausreichender Kontrast, beschriftete Icons, Zoom und verständliche Screenreader-Rückmeldungen werden geprüft. Die visuelle Richtung ist freundlich und ruhig, mit warmen hellen Flächen und dunklem Text.

Mikrofonzustand und Browserarbeit sind getrennte Zustände. **Turn mic off** beendet das Zuhören; **Stop** hält weitere Browseraktionen an. Neue Nachrichten ziehen die Ansicht beim Lesen älterer Inhalte nicht ungefragt ans Ende.

## 6. Informationsaufbereitung und Bilder

Die KI ordnet Informationen, erklärt Unterschiede und führt inhaltliche Wiederholungen zusammen. Sie erfindet keine Daten und lässt keine unterschiedlichen Bedingungen oder wesentlichen Einschränkungen als angebliche Redundanz weg.

Kosten, Verpflichtungen, Verfügbarkeit, übertragene Angaben und wesentliche Bedingungen haben feste Pflichtfelder. Unbekannte Kosten sind unbekannt, nicht null. Ein bekannter Preisanteil ist kein bestätigter Gesamtpreis. Ausführliche Beschreibungen und Bedingungen bleiben über verständlich beschriftete Detailbereiche zugänglich. Wesentliche Einschränkungen gehören in die sichtbare Zusammenfassung.

Originalbilder werden der jeweils passenden Angebotsquelle entnommen. Eine Galerie zeigt Bildanzahl, erreichbare Miniaturen und eine vergrößerbare Ansicht. Echte Bildduplikate und rein technische Websitegrafiken können entfernt werden; unterschiedliche Ansichten, Lagepläne und relevante Bildinformationen bleiben erhalten. Nicht erreichbare Bilder führen zu einem verständlichen Zustand, nicht zu generierten Ersatzinhalten.

Jede entscheidungsrelevante Angabe und jedes Bild behält eine Quelle. Der Nutzer erreicht die Originalinformation. Eine Zusammenfassung behauptet keine Vollständigkeit, wenn die Quelle nur teilweise gelesen werden konnte.

## 7. A2UI und Komponenten

**A2UI ist P0.** Die App verwendet den gepflegten React-Renderer und einen eigenen versionierten Komponentenkatalog. shadcn/ui beziehungsweise Radix dienen als gestaltbare Grundlage für Bedienelemente.

Der Agent liefert deklarative A2UI-Nachrichten. Er darf keinen beliebigen ausführbaren HTML- oder JavaScript-Code erzeugen. Nachrichten, Daten und Aktionen werden gegen das zugelassene Schema und den Sitzungszustand geprüft. Bildergalerie und aufgabenspezifische Karten sind eigene geprüfte Komponenten.

Der Katalog umfasst mindestens EventCard, JourneyCard, AppointmentCard, Bildergalerie und Formularkomponenten. Der feste Chatrahmen, Onboarding, Mikrofon, Stopp und Website-Umschaltung bleiben appseitig definiert. Eine verbindliche Abschlussprüfung wird vom Controller aus verifizierten Daten aufgebaut und darf vom Modell nicht durch beliebige UI ersetzt werden.

A2UI stellt Oberfläche und Interaktionen bereit. Es ersetzt weder Websiteextraktion, Browserautomation, Faktenprüfung noch Freigabelogik. Persönliche Profildaten werden nicht automatisch in jedes A2UI-Surface kopiert.

## 8. Architektur und lokale Ausführung

- Frontend: React, TypeScript, Vite, A2UI, zugängliche UI-Komponenten.
- Backend: Node.js, TypeScript, WebSocket-Sitzungscontroller.
- Browser: Playwright mit Chromium; erste Ausführung lokal, logisch getrennt vom Frontend.
- Gemini: Live-Gespräch und Aufgabensteuerung.
- Gemma: Interpretation von Websitebeobachtungen, Browseraktionsplanung und Informationsaufbereitung.
- Tool-Broker: Schema-, Domain-, Zustands- und Freigabeprüfung außerhalb des Modells.
- Profil: Browser-LocalStorage, keine Backend-Profildatenbank.

Google-Schlüssel bleiben serverseitig in einer nicht eingecheckten `.env`. Modelle sind explizit konfigurierbar. Ihre tatsächliche Verfügbarkeit, Quote, Live-Audio und Tool-Fähigkeiten werden mit dem verwendeten Schlüssel getestet. Ein Modellwechsel wird dokumentiert.

Cloud Run, Cloud Build, Artifact Registry, Secret Manager und öffentliche Demo-Zugangskontrollen sind für diese lokale Fassung keine P0-Anforderungen. Falls später ein entfernter Browser hinzukommt, kann dieselbe UI dessen Beobachtungen anzeigen. Aktuell wird nichts veröffentlicht.

## 9. Kontrolle und Abschlüsse

Eine Auswahl bereitet eine Aktion vor; sie bucht noch nichts. Vor einer verbindlichen Aktion erscheinen Anbieter, Leistung, Datum beziehungsweise Strecke, Variante, Anzahl, bekannte Gesamtkosten und offene Kosten, konkrete zu übertragende Daten und Folgen der Aktion.

Die ausdrückliche Schaltfläche benennt die Aktion, zum Beispiel **Confirm test booking**. Ein beiläufiges gesprochenes „Yes“ autorisiert keinen Abschluss.

Freigaben sind an Aktion, Website, Eingaben, Beträge, Auftragsversion und Ablaufzeit gebunden. Änderungen, neue Aufträge und Stopp machen betroffene Freigaben ungültig. Auch normale Klicks, Formulare und indirekte Endpunkte dürfen die Freigabe nicht umgehen.

Nur eine zustandsändernde Browseraktion gleichzeitig. Stopp verhindert weitere Aktionen; bereits übermittelte Aktionen können trotzdem wirksam werden. Bei unklarem Ergebnis erfolgt eine Zustandsprüfung, keine blinde Wiederholung. **Prepared**, **Submitted**, **Confirmed** und **Result unclear** bleiben unterscheidbar.

## 10. Abnahme

- App lokal startbar; keine Anmeldung und kein Deployment erforderlich.
- Onboarding speichert auf diesem Browser, übersteht Neuladen und erlaubt Ändern und Löschen.
- Vollständige Bedienung über Text und Tastatur; Sprache ist ein zusätzlicher Weg.
- Event-, Mobilitäts- und Arztterminabläufe verwenden denselben verständlichen Chat.
- A2UI rendert echte deklarative Nachrichten und führt Kartenaktionen an den Controller zurück.
- Alle angebotsspezifischen Informationen und Originalbilder bleiben zugänglich; Pflichtinformationen fehlen nicht in der Abschlussprüfung.
- Mobile Website-Umschaltung und Desktop-Ansicht referenzieren dieselbe Browsersitzung.
- Keine Testbuchung ohne passende aktuelle Freigabe; veraltete und mehrfach verwendete Freigaben werden abgelehnt.
- Bestätigung erfordert überprüfbaren Providerzustand; unbekannte Ergebnisse werden nicht erneut gebucht.
- Testprovider, Beispieldaten und noch nicht integrierte bestehende Websites sind sichtbar und in der README dokumentiert.
- Die UI-Abnahme allein beweist keine reale Anbieterintegration oder Wirkung für die Zielgruppe.

## 11. Lieferumfang und Weiterentwicklung

Lokales Git-Repository `easy-web-assistant` unter `D:\dev\easy-web-assistant`, als Codex-Projekt registriert. Quellcode, aktuelle PRD, README, `.env.example`, Startanleitung, Komponentenkatalog, Prüfschritte und bekannte Integrationsgrenzen gehören hinein. Keine API-Schlüssel oder echten Personendaten im Repo.

Zuerst entsteht ein startbarer vertikaler Ablauf mit A2UI und kontrollierten Testprovidern. Parallel werden Behördentermine, Dienstleistungen und zusätzliche Freizeitangebote gemäß Abschnitt 3.5–3.7 umgesetzt und separat geprüft. Anschließend wird pro Anwendungsfall eine geeignete bestehende Website ausgewählt, integriert und geprüft. Reisebuchungen bleiben ein weiterer Kandidat außerhalb der aktuellen Abnahme. Einkauf bleibt bis zu einer ausdrücklichen neuen Entscheidung ausgeschlossen.

## Technische Referenzen

- A2UI React-Renderer: https://github.com/a2ui-project/a2ui/tree/main/renderers/react
- A2UI Client Setup und eigene Kataloge: https://a2ui.org/guides/client-setup/
- shadcn/ui: https://ui.shadcn.com/docs
- Radix Accessibility: https://www.radix-ui.com/primitives/docs/overview/accessibility
- Gemini Live SDK: https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk
- Gemma über Gemini API: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api
- Playwright: https://playwright.dev/docs/intro

Die ursprünglichen Hackathon-Track-Zuordnungen bleiben Kontext, sind keine neue Zulassungszusage. Der Verzicht auf Cloud-Deployment kann die im ursprünglichen PRD genannten Cloud-Nachweise verändern.
