# Additional A2UI and usability tester review

Trace metadata readback: current QA context-options records viewport1280x720; both screencast-frame events record1280x720. The extracted preview JPEG is800x450. The viewport is taken from trace metadata, not inferred from preview scaling. Actual blank state still prevents any product layout acceptance.

Actual pixel inspection,2026-10-02: both manager and independent UI tester inspected D:/DEV/easy-web-assistant/.cache/visual-review/latest-frontend.jpeg with view_image. It is fully white,800x450 image pixels, no rendered app. Source state: QA navigation/start failure while Vite module responses remain pending. The current trace has two screencast JPEG entries only; no rendered profile/cards/gallery/approval images are available from that trace. Image pixels do not establish the browser viewport dimensions. This is observed failure evidence, not layout/readability/keyboard/zoom acceptance. QA has been asked to preserve state/viewport-tagged images once the app renders; no extra browser/server was started for this review.

Supplement from the same tester after receiving full ProfileWizard/profile.css: ProfileWizard renders a normal section and its CSS defines no fixed positioning or own overlay. The outer Radix Dialog owns the fixed overlay/content. No static collision was found; this is still not a browser/keyboard pass. Typography has since been raised to18px for all semantic profile/offer/disclosure/control text;20px conversation retained. Earlier coverage limitations below describe the earlier snapshot.

Snapshot: 2026-10-02. Independent tester: 01a0feb3-2280-79b2-9239-3c087917fa8e. Manager saved returned report because tester filesystem access failed. Static, partial coverage only; no runtime or visual acceptance.

## Prüfbericht (statische Prüfung)

**Kein bestätigter Defekt aus den bereitgestellten Auszügen.** Der QA-Lock bleibt bei PRD10 QA; ich habe keine Befehle oder Server gestartet. Ausführung mit `MessageProcessor`, vollständige Katalogprüfung und visuelle Bedienprüfung fanden daher nicht statt.

### A2UI: statisch geprüfte Schutzlogik

- `src/a2ui/validation.ts` (`validateA2UIMessages`): begrenzt Nachrichten auf 24 und Komponenten auf **80 insgesamt** über die Nachrichtenfolge. `boundedData` erlaubt Arrays mit bis zu **100 Elementen** und Objekte mit bis zu 80 Schlüsseln. Die Grenzen sind getrennt.
- Unbekannte Komponenten und zusätzliche Props werden abgewiesen (`componentNames`, `allowedProps`). Auswahlkarten erfordern `select_offer`, passenden `offerId` und eine nichtnegative ganzzahlige Version; unbekannte Aktions- oder Kontextfelder werden abgewiesen.
- Die Kindzuordnung wird gegen die Karte geprüft: `EventCard`→`event`, `JourneyCard`→`journey`, `AppointmentCard`→`appointment`, `GovernmentCard`→`government`, `ServiceCard`→`service`, `LeisureCard`→`leisure`. `EverydayOffer` akzeptiert nur Event, Journey oder Appointment.
- `src/a2ui/catalog.tsx` und `validation.ts`: Offer-, Bild- und Quellen-URLs müssen HTTP(S) sein und dürfen keine Zugangsdaten enthalten. Die bereitgestellten Schemata verlangen für Offer-Bilder auch eine `sourceUrl`. Die tatsächlichen JSON-Bildquellen konnte ich wegen des gekürzten Katalogauszugs nicht prüfen.
- `src/a2ui/A2UIOfferSurface.tsx`: Auswahlaktionen werden bei deaktiviertem oder veraltetem Stand verworfen und müssen zu Offer-ID und Version der validierten Quelle passen. Der Datenmodellpfad `/disabled` wird bei Inaktivität gesetzt.

### Gezielte Laufzeittestfälle, noch auszuführen

Mit echten `MessageProcessor`-Nachrichten je eine gültige Auswahl für alle sechs Kartenarten senden und je genau einen Callback mit passender ID/Version erwarten. Zusätzlich prüfen: deaktivierter Zustand, veraltete Version, falscher Kartentyp für ein Offer, unbekannter Aktionsname, unbekannte Props/Kontextfelder, `javascript:`-URL und URL mit Zugangsdaten; anschließend 80 gegen 81 Komponenten sowie 100 gegen 101 Arrayelemente testen.

### Dialog und mobile Darstellung

Der gelieferte `Dialog.Root`-Auszug verwendet Radix Portal, Overlay, Titel und Beschreibung. `onOpenChange(false)` schließt nur bei abgeschlossenem Profil ohne verfügbaren Session-only-Fallback. Das kann Escape/Overlay-Schließen während der Einrichtung verhindern; ob das eine unbeabsichtigte Tastaturfalle ist, muss mit vollständigem `ProfileWizard`-Code und Tastaturprüfung bewertet werden. **Ob `ProfileWizard` selbst `position: fixed` oder ein eigenes Overlay nutzt und damit mit dem Radix-Dialog kollidiert, bleibt offen**, da diese Datei noch nicht vorliegt.

Die bereitgestellten CSS-Regeln setzen mehrere mobile Bedienelemente auf mindestens 44 px Höhe/Breite: Verbindungsanzeige, Profil-/Reset-Schaltflächen, Ansichtsumschalter, Mikrofon, Senden und Stoppen. Sichtbare mobile Textgrößen reichen für Hauptinhalte meist von 16–20 px; einzelne Bedienelemente liegen bei 13–14 px. Eine vollständige Prüfung aller Controls, Labels, Zoom und tatsächlicher Darstellung ist mit den gekürzten Auszügen nicht möglich.

Für die angefragte vollständige Prüfung fehlen noch `src/profile/**`, `src/components/offers/**`, die relevanten vollständigen CSS-Abschnitte und der ungekürzte Kataloginhalt.

Manager note: no confirmed defect in the reporter's provided excerpts is not complete acceptance. The independent Astra review's18px typography issue remains actionable and is being fixed; QA owns actual MessageProcessor/browser/mobile tests. The pending A05 selection profile and A02 historical receipt contracts are newer than this snapshot.
