# Biohead – Pusteøvelse-app

En minimalistisk mobilapp for guidede pusteøvelser og mentale «reset»-økter, bygget med **React Native** og **Expo**.

## Funksjoner

- **Flere pusteøvelser** (ro, fokus, energi, søvn, balanse, stressned) med animert sirkel
- **Varighet** 30–120 s, med **husket varighet per øvelse**
- **Streak** og **økthistorikk** (kun lokalt på enheten)
- **Onboarding** med valg av hovedmål (påvirker rekkefølge på forsiden)
- **Favoritter** (hjerte på kort og øvelsesside)
- **Innstillinger**: haptikk, redusert bevegelse, **lyd** (av / korte signaler / ambient loop), **daglig påminnelse** (lokalt varsel), nullstill data
- **Tilgjengelighet**: VoiceOver-label på pustesirkelen under økt
- **Feilrapportering**: siste krasj lagres lokalt; bruker kan kontakte support fra feilskjerm

## Tech stack

- **Expo SDK 54** · **TypeScript** (strict)
- **expo-router** · **react-native-reanimated** · **react-native-svg**
- **AsyncStorage** · **expo-haptics** · **expo-av** (lyd) · **expo-notifications** (påminnelse) · **expo-keep-awake** (økt)

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
- [ ] **App Privacy**: data lagres lokalt (AsyncStorage), ingen konto – besvar spørsmålene deretter
- [ ] Aldersanbefaling og support-URL / personvern (om aktuelt)
- [ ] TestFlight-runde før App Review

### Ikon

Master-ikon skal være **1024×1024** for butikken. Prosjektet bruker [assets/icon.png](assets/icon.png) (oppgradert fra kilde ved behov).

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
└── __tests__/
```

## Designsystem

Se [constants/colors.ts](constants/colors.ts) og [constants/typography.ts](constants/typography.ts).

## Kontakt

Gran Nielsen AS / Biohead  
admin@biohead.no
