# Guardians of the Grid
Jullie bouwen een mission control center om Achrona te beschermen tegen The Desync. 
Dit  fungeert als de ultieme digitale levenslijn door vitale statistieken live in 
kaart te brengen en afwijkingen vroegtijdig te signaleren. Dankzij jullie realtime 
data-inzichten kunnen we op tijd ingrijpen om de glitches te stoppen en de magie 
in Achrona te redden

## Project setup
Deze repository bevat een basis [Tanstack Start](https://tanstack.com/start) op basis van:
- **Language:** [Typescript](https://www.typescriptlang.org)
- **Framework:** [React](https://react.dev)
- **ORM:** [Drizzle](https://orm.drizzle.team)
- **Styling:** [Tailwind](https://tailwindcss.com)
- **Build tool:** [Vite](https://vite.dev)

Om op te starten kan je volgende commando's gebruiken. 

```bash
npm install
npm run db:setup
npm run dev
```

Voer `npm run db:setup` eenmalig uit bij de eerste start. Dit maakt de tabellen in
`local.db` aan en voegt voorbeeldglitches toe. Let op: de seed verwijdert bestaande
echoes en vervangt glitches door de voorbeelddata. Gebruik `npm run db:push` om alleen het
databaseschema bij te werken en bestaande gegevens te behouden.

### Login en testaccounts

Voor een bestaande installatie voeg je de login-tabellen en testaccounts toe met:

```bash
npm run db:push
npm run db:seed:accounts
```

Dit behoudt bestaande glitches. De account-seed is herhaalbaar en wijzigt geen
bestaande wachtwoorden.

| Codename | Wachtwoord | Rol |
| --- | --- | --- |
| `defender` | `Defender2026!` | defender |
| `commander` | `Commander2026!` | commander |

Open `/login` om in te loggen. Uitloggen kan via het icoon onderaan de zijbalk.
De sessie blijft acht uur geldig, ook na het vernieuwen van de pagina.
Wachtwoorden worden met scrypt gehasht; sessietokens staan alleen als SHA-256-hash
in de database. De cookie is HttpOnly, SameSite=Lax en in productie Secure.
De account-seed weigert te draaien met `NODE_ENV=production`; deze bekende
testaccounts zijn alleen voor lokale ontwikkeling.

### Echoes en commanderrechten

Beide rollen kunnen in het overzicht een echo melden met een beschrijving van
maximaal 2000 tekens. De server gebruikt de ingelogde guardian en het huidige
tijdstip. Elke melding maakt in één transactie een echo en een gekoppelde glitch
met status `LEAKED` aan. Na het opslaan wordt het overzicht ververst.

Bij een echo kan optioneel één JPG-, PNG- of WebP-afbeelding van maximaal 5 MB
worden toegevoegd. Het formulier toont een voorbeeld en laat je de selectie
verwijderen. Afbeeldingen staan bij de beschrijving in het overzicht; klik om ze
op volledig formaat te openen. Ze worden in SQLite opgeslagen en zijn alleen
voor ingelogde guardians toegankelijk. De server controleert grootte, MIME-type
en bestandskenmerken. Echo, glitch en afbeelding worden samen opgeslagen.

Via de microfoonknop rechtsonder in het beschrijvingsvak kun je Nederlands
inspreken. Eerst hoor je “Defender... wachter van Achrona. Spreek nu je echo.
Ik luister.” (of “Commander”, afhankelijk van je rol). De microfoon start nadat
de instructie is uitgesproken.
Druk opnieuw om te stoppen, controleer je tekst en kies **Echo melden**.
Na succesvol opslaan spreekt de browser een Nederlandse bevestiging uit.
De geanimeerde guardian **Auri** begeleidt je melding: het personage knippert,
beweegt rustig en praat mee tijdens het daadwerkelijk afspelen van de stem.
De mond- en golfanimaties stoppen bij het einde of annuleren van de audio.
Bij verminderde beweging in de systeeminstellingen worden de animaties uitgezet.
Auri gebruikt standaard **Ellen (nl-BE)**, met haar natuurlijke toonhoogte.
Via **Stem beluisteren** kun je een voorbeeld horen. Als Ellen niet beschikbaar
is, gebruikt de browser een andere Nederlandse stem. De plechtige formuleringen
blijven behouden. Er is geen externe AI-spraakdienst aangesloten.
Spraakherkenning vereist browserondersteuning en microfoontoestemming; wanneer
die ontbreekt kun je blijven typen. De beschikbare stem wordt door je browser
en besturingssysteem bepaald. `npm run test:speech` controleert de spraaklogica
met gesimuleerde browser-API's, zonder de microfoon te activeren.

Commanders kunnen via de statuskeuze en **Opslaan** een glitch wijzigen naar
`LEAKED`, `ASSESSING`, `CONTAINING` of `FIXED`. De server controleert de rol bij
elke wijziging. Defenders zien de huidige status zonder bewerkingsknoppen.

Voer `npm run test:workflow` uit voor de HTTP-integratietests. Deze gebruiken een
tijdelijke database en testserver, en controleren onder andere validatie,
sessiecontrole, transactierollback, commanderrechten en afbeeldingsuploads. Bestaande gegevens
blijven behouden.

### Auri als lokale AI-chatbot

Auri gebruikt een echt taalmodel via Ollama op je eigen computer. Er is geen
cloud-API of betaalde API-sleutel nodig. Elke vraag krijgt een nieuwe snapshot
met glitches, statussen en gekoppelde echoes. Afbeeldingsbestanden en
accountgeheimen worden niet aan het model doorgegeven. De chat kan geen
incidenten wijzigen en er is nog geen aparte alertbron gekoppeld.

Eenmalige installatie op macOS:

```bash
brew install ollama
```

Start Ollama in een eigen terminal en laat die draaien:

```bash
npm run ai:serve
```

Download daarna het model (ongeveer 4 GB) en start de app:

```bash
npm run ai:pull
npm run dev
```

Open **Vraag Auri** boven het meldformulier. Stel bijvoorbeeld “Welke incidenten
zijn actief?” of “Wat weten we over GL-0142?”. Antwoorden tonen links naar de
gebruikte incidenten. **Voorlezen** laat Ellen het antwoord uitspreken terwijl
Auri's mond beweegt. Je kunt een vervolgvraag stellen of een nieuw gesprek starten.
De eerste vraag kan wat langer duren omdat het model moet laden.

De standaardinstellingen zijn `http://127.0.0.1:11434/v1` en `qwen3.5:4b`.
Ze werken zonder `.env`; kopieer desgewenst `.env.example` naar `.env` om
`OLLAMA_BASE_URL` of `AURI_MODEL` aan te passen. Herstart de devserver na een
wijziging. Bij een productiebuild stel je deze variabelen in op de server.
Ollama draait met cloudfuncties uitgeschakeld en luistert standaard alleen lokaal.

De meegegeven context is begrensd; globale statustotalen blijven volledig.
AI-antwoorden kunnen fouten bevatten. Auri wordt geïnstrueerd ontbrekende
informatie te benoemen. Alleen incident-ID’s uit de actuele snapshot krijgen
een klikbare bronverwijzing. `npm run test:ai` test context en antwoordvalidatie met een gesimuleerd
model. `npm run test:workflow` controleert ook toegangscontrole en een onbereikbare
Ollama-server zonder echte modelaanroepen.

## Beoordeling
> Hoe wij beoordelen wordt voor de start van de hackathon met alle studenten gedeeld, zodat dit meteen duidelijk is voor iedereen.

- **Creativity (40%):** Biedt de applicatie nieuwe, innovatieve of creatieve oplossingen? Steekt jullie applicatie er bovenuit t.o.v. de andere deelnemers?
- **Functionality (30%):** Welke functionaliteit hebben jullie kunnen voorzien tijdens de hackathon? Is de UI intuïtief en gebruiksvriendelijk? Zijn de functionaliteiten duidelijk voor de gebruikers zonder uitleg/handleiding?
- **Presentation (30%):** Trekt jullie presentatie onze aandacht? Is de presentatie duidelijk en helder over wat jullie gebouwd hebben? Zien we in jullie presentatie de input van alle deelnemers evenwaardig terugkomen?

## Basisopdracht
> Om alle opdrachten gelijkwaardig te beoordelingen, verwachten dit als minimale setup. 
> Hierna kiezen jullie zelf welke uitbreidingen jullie willen toevoegen.

![datamodel](datamodel.png)

Maak een webapplicatie waarin guardians kunnen inloggen. Eens ingelogd, zien ze een lijst met glitches.
Guardians hebben een role.
- Role `defender` kan echoes melden. Elke echo wordt standaard aanzien als een glitch 
- Role `commander` heeft dezelfde rechten als een defender + admin rechten
- Een echo heeft een `timestamp` en een `description`. 

## Uitbreidingen (Optioneel)
> Jullie kiezen zelf wat jullie willen toevoegen. Hieronder alvast wat inspiratie

### Workflow
- **Glitch status:** Een glitch doorloopt verschillende statussen (`LEAKED` → `ASSESSING` → `CONTAINING` → `FIXED`).
- **Zoek/Filters:** Guardians kunnen zoeken op keywords + data filteren en sorteren.
- **Glitches toewijzen:** Een commander kan glitches handmatig toewijzen aan een defender, die vervolgens via echoes updates geeft over deze glitch.
- **Reporting:** Maak de belangrijkste data exporteerbaar via PDF (voor de Hoge Raad van Achrona).
- **Keyboard shortcuts:** Navigeer door de applicatie met sneltoetsen (bv. <kbd>j</kbd> en <kbd>k</kbd> om de vorige/volgende glitch te bekijken).
- **Dark mode:** Zorg dat guardians kunnen switchen tussen dark en light mode. Voorzie evt. een extra lockdown mode die aanduidt dat er een grote aanval aan de gang is.

### Real-time monitoring
- **Live updates:** Nieuwe glitches worden real-time zichtbaar op het scherm.
- **Gauge chart:** Een visuele meter die de hoeveelheid magie in Achrona toont (100% als alles in orde is).
- **Interactieve kaart:** Een kaart (map) die exact toont wáár in Achrona een glitch plaatsvindt.
- **Sensor data:** Het systeem verwerkt IoT-sensordata en toont deze in grafieken op het dashboard.
- **Responsive design:** De applicatie werkt mobile-first en is volledig geoptimaliseerd voor smartphones.
- **Offline mode:** Data blijft beschikbaar bij netwerkuitval, met een duidelijke "offline"-indicator.

### AI Automation
- **Handle duplicates:** AI groepeert gerelateerde echoes automatisch onder dezelfde glitch; admins kunnen handmatig overriden.
- **Glitch types:** AI categoriseert het type en maakt dit visueel duidelijk (bv. met iconen of kleuren).
- **AI-moderation:** AI weert nutteloze echoes en scant beschrijvingen en afbeeldingen op illegale content.
- **Auto-closable glitches:** Glitches sluiten automatisch op basis van echoes (bv. "alles terug in orde"), maar heropenen ook als er een gelijkaardig nieuw probleem binnenkomt.
- **Predictive analysis:** AI maakt zelf glitches aan op basis van data-afwijkingen (bv. data-voorraad die in 5 minuten met 40% zakt).
- **Automatische toewijzing:** AI kiest zelfstandig welke defender het best past bij de glitch.
- **Create Runbook:** AI genereert een stappenplan (runbook) om het specifieke probleem op te lossen.
- **Chatbot:** Een ingebouwde assistent die vragen van operators over actieve incidenten en alerts beantwoordt.

### User engagement
- **Image uploads:** Users kunnen foto's uploaden bij een echo om de situatie te verduidelijken.
- **Speech-to-text:** Defenders op de vlucht kunnen echoes via hun microfoon inspreken i.p.v. te typen.
- **Verstuur notificaties:** Push-notificaties, e-mails of sms-berichten bij kritieke problemen (met instelbare voorkeuren per user).
- **Leaderboard:** Een klassement met badges voor de defenders die de meeste incidenten fixen.

