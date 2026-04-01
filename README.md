# Biohead – Pusteøvelse-app

En minimalistisk mobilapp for guidede pusteøvelser og mentale «reset»-økter, bygget med **React Native** og **Expo**.

## Funksjoner

- **Flere pusteøvelser** (ro, fokus, energi, søvn, balanse, stressned) med animert sirkel
- **Varighet** 30–120 s, med **husket varighet per øvelse**
- **Streak** og **økthistorikk** (kun lokalt på enheten)
- **Onboarding** med valg av hovedmål (påvirker rekkefølge på forsiden)
- **Favoritter**: egen seksjon på forsiden + hjerte på kort og øvelsesside
- **Innstillinger**: haptikk, redusert bevegelse, **lyd** (av / korte signaler / ambient loop), **daglig påminnelse** (lokalt varsel), nullstill data
- **Tilgjengelighet**: VoiceOver-label på pustesirkelen under økt
- **Feilrapportering**: **Sentry** (valgfritt, via `EXPO_PUBLIC_SENTRY_DSN`) + lokal lagring + support-lenke på feilskjerm
- **Apple Helse (iOS)**: valgfri logging av **mindful minutes** etter fullførte økter (krever bygget app med HealthKit, ikke Expo Go)

## Tech stack

- **Expo SDK 54** · **TypeScript** (strict)
- **expo-router** · **react-native-reanimated** · **react-native-svg**
- **AsyncStorage** · **expo-haptics** · **expo-av** (lyd) · **expo-notifications** (påminnelse) · **expo-keep-awake** (økt)
- **@sentry/react-native** · **react-native-health** (kun iOS / HealthKit)

## Kom i gang

```bash
npm install --legacy-peer-deps   # ved peer-konflikter
npx expo start
```

Unset `CI` i miljøer der tom `CI` gir Expo-feil:

```bash
unset CI && npx expo start
```

### Tester

```bash
npm test
```

### Sentry (valgfritt)

1. Opprett prosjekt på [sentry.io](https://sentry.io) og kopier **DSN** for React Native.
2. Legg `EXPO_PUBLIC_SENTRY_DSN=<din-dsn>` i `.env` (se [.env.example](.env.example)).
3. For EAS-bygg: legg samme variabel i **EAS Secrets** eller `eas.json` env for produksjon.
4. Plugin `@sentry/react-native` i [app.json](app.json) støtter kildekart ved bygg; følg [Sentry Expo-dokumentasjon](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) for org/prosjekt og auth token ved behov.

### Apple Helse

- Slå på under **Innstillinger → Integrasjoner → Apple Helse** (kun iOS).
- Krever **development build** eller **EAS-build** med HealthKit-entitlements (ikke tilgjengelig i Expo Go).
- Oppgi korrekt **App Privacy** i App Store Connect hvis du bruker Helse (data skrevet til Helse på enheten).

## Produksjonsbygg (EAS)

1. Installer EAS CLI: `npm i -g eas-cli`
2. Logg inn: `eas login`
3. Kjør `eas build:configure` om du trenger å koble prosjektet til Expo
4. iOS (TestFlight / App Store): `eas build --platform ios --profile production`
5. Øk `ios.buildNumber` i [app.json](app.json) ved behov (EAS `autoIncrement` håndterer ofte dette)

Se [eas.json](eas.json) for profiler (`development`, `preview`, `production`).

### App Store – sjekkliste (manuelt)

- [ ] Apple Developer-konto, signeringsprofiler via EAS
- [ ] App Store Connect: beskrivelse, nøkkelord, skjermbilder (påkrevd størrelser)
- [ ] **App Privacy**: lokale data + ev. **Sentry** (krasj) + ev. **Apple Helse** (mindful minutes) – besvar i tråd med det du faktisk bruker
- [ ] Aldersanbefaling og support-URL / personvern (om aktuelt)
- [ ] TestFlight-runde før App Review

Detaljert listing-mal (screenshots/video/ASO): [docs/store-readiness.md](docs/store-readiness.md)

### Ikon

Master-ikon skal være **1024×1024** for butikken. Prosjektet bruker [assets/icon-app-transparent.png](assets/icon-app-transparent.png) (oppgradert fra kilde ved behov).

### Deeplink

App-skjema: `biohead` (se [app.json](app.json)). Eksempel: `biohead://exercise/calm`

## Prosjektstruktur

```
biohead/
├── app/                    # Skjermer (expo-router)
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── onboarding.tsx
│   ├── settings.tsx
│   ├── history.tsx
│   └── exercise/
│       ├── [id].tsx
│       └── session.tsx
├── assets/sounds/          # WAV-filer for pustesignaler / ambient
├── components/
├── constants/
├── context/AppContext.tsx
├── hooks/
├── utils/
│   ├── initSentry.ts          # valgfri Sentry-init
│   └── appleHealthMindful.ts  # iOS mindful minutes → Health
└── __tests__/
```

## Designsystem

Se [constants/colors.ts](constants/colors.ts) og [constants/typography.ts](constants/typography.ts).

## Kontakt

Gran Nielsen AS / Biohead  
admin@biohead.no
