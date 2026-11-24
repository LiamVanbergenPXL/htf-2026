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

Commanders kunnen via de statuskeuze en **Opslaan** een glitch wijzigen naar
`LEAKED`, `ASSESSING`, `CONTAINING` of `FIXED`. De server controleert de rol bij
elke wijziging. Defenders zien de huidige status zonder bewerkingsknoppen.

Voer `npm run test:workflow` uit voor de HTTP-integratietests. Deze gebruiken een
tijdelijke database en testserver, en controleren onder andere validatie,
sessiecontrole, transactierollback en commanderrechten. Bestaande gegevens
blijven behouden.

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

