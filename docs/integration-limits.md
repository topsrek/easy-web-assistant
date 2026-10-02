# Integrationsgrenzen

Stand: 2. Oktober 2026. Maßgeblich ist das [PRD V0.3](../easy-web-assistant-prd.md) zusammen mit [docs/contracts.md](contracts.md). Diese Datei unterscheidet lokale Testabläufe von noch nicht nachgewiesenen Fähigkeiten.

## Kontrollierte Demo

Die vorhandenen Event-, Mobilitäts- und Arztterminangebote sind fiktionale Fixtures einer lokalen Testwebsite. Sie demonstrieren Angebotskarten und den vorgesehenen Freigabeablauf. Ihre Angaben stellen keine echte Verfügbarkeit, Anbieterinformation, Reservierung, Buchung oder Zahlung dar. Wo Daten in einer Fixture fehlen, sollen sie als unbekannt oder teilweise geprüft erscheinen; unbekannte Gebühren dürfen nicht als null oder als bestätigter Gesamtpreis dargestellt werden.

Ein Demo-Abschluss ist auf die lokale Testwebsite begrenzt. Er ist kein Nachweis einer Integration mit Ticketanbietern, Verkehrsunternehmen oder Praxen. Für jede bestehende Website braucht es einen eigenen geprüften Provider, eine passende Website-Policy und eigene Abnahmeprüfungen.

## Daten und Einwilligung

- Das Profil ist für LocalStorage dieses Browsers vorgesehen. Es wird nicht mit einem Konto synchronisiert und nicht automatisch an jede Aufgabe angehängt.
- Die Felder für die jeweilige Aufgabe werden eingegrenzt. Die Modellverarbeitung der Suchanfrage beziehungsweise Angebotsinformationen ist von einer Übertragung an die Website zu unterscheiden.
- Vor dem Website-Schritt müssen Anbieter, Aktion und jedes konkrete übermittelte Profilfeld mit seinem Wert sichtbar sein. Eine gespeicherte Profilangabe gilt nicht als Freigabe.
- Eine Freigabe gilt nur für die angezeigte Aktion und die dazu geprüfte Angebotsversion. Bei Änderung, Stopp oder Ablauf muss sie verfallen.
- Die Jury-Demo soll künstliche Personendaten verwenden. Keine echten Gesundheits-, Konto-, Zahlungs- oder Zugangsdaten in Demoaufträgen verwenden.

## Modellrollen und Live-Betrieb

Die Konfiguration benennt getrennte Modellrollen: Gemini für Gespräch und Aufgabensteuerung, Gemma für Interpretation und Aufbereitung von Websitebeobachtungen sowie Gemini Live für Audio. Modell-IDs, ein erkannter Schlüssel und ein erfolgreicher lokaler Preflight sind kein Nachweis, dass alle Rollen im App-Ablauf funktionieren. Authentifizierte Text- und Live-Audio-Prüfungen sind separat und gegebenenfalls netzwerkabhängig.

Die erforderlichen AI- und Voice-Module sind vorhanden, aber die Integration mit einem realen Modellzugang ist nicht durch einen aktuellen erfolgreichen Lauf bestätigt. Die kontrollierte Demo meldet `voiceAvailable: false`; Live-Sprache ist damit keine verfügbare Demo-Fähigkeit. Spracheingabe darf keine Buchung oder verbindliche Aktion freigeben; eine gesprochene Zustimmung ersetzt die ausdrückliche Prüfschaltfläche nicht.

## Nicht zugesagt

- Beliebige Websites, automatisierter Zugriff auf private Produktivkonten oder Umgehung von Login, MFA oder CAPTCHA
- Reale Zahlungen, verbindliche echte Anbieterbuchungen oder bestätigte Live-Verfügbarkeit
- Behördliche Rechtsauskünfte oder erfundene Anforderungen und Unterlagen
- Eine verbindliche Beauftragung eines Dienstleisters ohne separate Zustands- und Freigabeprüfung
- Automatische Anmeldung oder Buchung von Freizeitangeboten allein durch Anzeige oder Auswahl
- Wiederholung einer Aktion, wenn ihr Ergebnis unklar ist; zuerst muss der Anbieterzustand geprüft werden
- Veröffentlichung oder Deployment der lokalen Anwendung

## Erweiterungen aus PRD V0.3

Behördentermine, Dienstleistungen und zusätzliche Freizeitangebote sind Anforderungen aus dem am 2. Oktober ergänzten PRD. Sie gelten nicht aufgrund der bestehenden Karten oder der Wiederverwendung von UI-Komponenten als implementiert oder abgenommen. Jede Kategorie benötigt eigene sichtbare Testdaten, Provider- und Quellenprüfung, Pflichtfelder, Datenfreigaben, sichere Abschlusszustände und getrennte Akzeptanzfälle. Ein fiktiver Testprovider darf keine reale Stelle, verfügbare Leistung oder bestätigte Anbieterzusage vortäuschen.

## Liefer- und Abnahmestatus

Die aktuelle QA-Unit- und Integrationssuite bestand mit 142/142 Tests in 15 Dateien (`npm test -- --maxWorkers=1`). Der separate Vite-Build bestand mit 2.147 Modulen in 1,98 Sekunden; er führt keinen TypeScript-Check aus. Ein Profil-Smoke im gebauten Preview bestand mit 1/1 für Speichern, Neuladen, Bearbeiten, Löschen und Session-only-Fallback. Typecheck und `npm run build` sind weiterhin ohne erfolgreichen Nachweis. Ein früherer TypeScript-Lauf scheiterte mit `ENOMEM`; ein späterer Lauf hing ohne Diagnostik und wurde abgebrochen. Der Profil-Smoke ist eine begrenzte Prüfung; weitere Browser- und Fachabläufe sowie die Gesamt-Abnahme bleiben offen. Für Behörden, Dienstleistungen und Freizeit sind Browserfälle als Entwurf geschrieben; ihre vollständige Integration und Abnahme ist noch nicht bestätigt. Die QA-Abnahme weist außerdem auf manuelle und automatisierte Lücken beim unklaren Ergebnis, bei Profil-Wiederherstellung und bei Screenreader-Tests hin. Live-Sprache ist in der Demo deaktiviert. Diese Projektbeschreibung behauptet deshalb keine vollständige Start-, Build-, Browser- oder Ende-zu-Ende-Abnahme.
