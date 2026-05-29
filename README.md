# Biohead – Pusteøvelse-app

En minimalistisk mobilapp for guidede pusteøvelser og mentale «reset»-økter, bygget med **React Native** og **Expo**.

## Funksjoner

- **Flere pusteøvelser** (ro, fokus, energi, søvn, balanse, stressned m.fl.) med animert sirkel og faseindikator
- **Varighet** 30–120 s, med **husket varighet per øvelse**
- **Programmer**: flerdagers guidede opplegg med fremdriftstelling
- **Streak**, **økthistorikk** og **stresstrend** (kun lokalt på enheten)
- **Onboarding** med mål (ro / fokus / energi) som påvirker forside-anbefaling
- **Favoritter**: egen seksjon på forsiden + hjerte på kort og øvelsesside
- **Lydmikser**: signaler ved fasebytte, ambient-natur (vind / fugler / skog / regn / bølger) med egne volumnivåer og lagrede mikser, valgfri tonegenerator
- **Innstillinger**: haptikk, redusert bevegelse, daglige påminnelser (med «hopp over i dag», utsett 30 min, adaptiv tid og stille helg), lagrede øktoppsett, nullstill data
- **Widgets**: iOS og Android hjemskjerm-widget for hurtigstart av anbefalt øvelse
- **Tilgjengelighet**: skjermleser-labels, live-regioner på pustesirkelen, `hitSlop` og `accessibilityState` på interaktive elementer
- **Feilhåndtering**: lokal lagring av feil + support-lenke på feilskjerm
- **Apple Helse (iOS)**: valgfri logging av **mindful minutes** etter fullførte økter (krever bygget app med HealthKit, ikke Expo Go)
- **Automatisk pause**: aktiv økt pauses når appen går i bakgrunn slik at lyd/visuell tilstand ikke driver fra hverandre

## Tech stack

- **Expo SDK 54** · **TypeScript** (strict)
- **expo-router** · **react-native-reanimated** · **react-native-svg**
- **AsyncStorage** · **expo-haptics** · **expo-av** (lyd) · **expo-notifications** (påminnelse) · **expo-keep-awake** (økt)
- **react-native-health** (kun iOS / HealthKit)

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
npx tsc --noEmit
```

Testdekningen inkluderer reducer-logikk, streak-regler, adaptive påminnelser, historikk-insights, lagrings-serialisering, fasebereging og lydpolicy.

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
- [ ] **App Privacy**: lokale data + ev. **Apple Helse** (mindful minutes) – besvar i tråd med det du faktisk bruker
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
│   ├── index.tsx           # forside / anbefaling / favoritter
│   ├── onboarding.tsx
│   ├── settings.tsx
│   ├── lydmikser.tsx       # lydmiksing, tonegenerator
│   ├── programs.tsx        # guidede programmer
│   ├── history.tsx         # historikk + insights + eksport
│   └── exercise/
│       ├── [id].tsx
│       └── session.tsx
├── assets/sounds/          # WAV-filer for pustesignaler / ambient
├── components/
├── constants/
├── context/AppContext.tsx
├── hooks/
├── utils/
│   └── appleHealthMindful.ts  # iOS mindful minutes → Health
└── __tests__/
```

## Designsystem

Se [constants/colors.ts](constants/colors.ts) og [constants/typography.ts](constants/typography.ts).

## Kontakt

Gran Nielsen AS / Biohead  
admin@biohead.no
