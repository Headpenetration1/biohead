# Biohead – Pusteøvelse-app (MVP)

En minimalistisk mobilapp for guidede pusteøvelser og mentale "reset"-økter, bygget med React Native og Expo.

## Funksjoner

- **3 pusteøvelser**: Ro (4-7-8), Fokus (box breathing), Energi (rask pust)
- **Animert pusteguide**: Pulserende sirkel med glow-effekt og progressring
- **Varighetsvelger**: 30, 60, 90 eller 120 sekunder
- **Streak-tracking**: Motivasjon gjennom daglig streak med lokal lagring
- **Haptic feedback**: Subtil vibrasjon ved interaksjoner
- **Biohead brand**: Fargepalett, Comfortaa-font og visuell identitet

## Tech stack

- **React Native** med **Expo SDK 51**
- **TypeScript** (strict mode)
- **expo-router** (filbasert navigasjon)
- **react-native-reanimated** (pusteanimasjoner)
- **react-native-svg** (sirkel og progressring)
- **AsyncStorage** (lokal lagring av streak/historikk)
- **expo-haptics** (haptic feedback)

## Kom i gang

```bash
# Installer avhengigheter
npm install

# Start Expo dev server
npx expo start

# Kjør på iOS simulator
npx expo start --ios

# Kjør på Android emulator
npx expo start --android
```

## Prosjektstruktur

```
biohead/
├── app/                    # Skjermer (expo-router)
│   ├── _layout.tsx         # Root layout, fonter, providers
│   ├── index.tsx           # Hjemskjerm med øvelseskort
│   └── exercise/
│       ├── [id].tsx        # Øvelsesdetaljer + varighetsvalg
│       └── session.tsx     # Aktiv pustesesjon + fullført
├── components/             # Gjenbrukbare komponenter
│   ├── BreathingCircle.tsx # Animert pustesirkel (SVG + Reanimated)
│   ├── DurationPicker.tsx  # Segmented control for varighet
│   ├── ExerciseCard.tsx    # Kort på hjemskjermen
│   ├── HapticButton.tsx    # Knapp med haptic feedback
│   └── StreakBadge.tsx     # Streak-indikator
├── constants/              # Konfigurasjon
│   ├── colors.ts           # Biohead fargepalett
│   ├── exercises.ts        # Øvelsesdata og pustemønstre
│   └── typography.ts       # Comfortaa font-config
├── context/
│   └── AppContext.tsx       # Global state (streak, historikk)
├── hooks/
│   ├── useBreathingEngine.ts  # Kjernelogikk for pustetiming
│   └── useHaptics.ts       # Haptic feedback wrapper
└── utils/
    ├── storage.ts           # AsyncStorage wrapper
    └── formatTime.ts        # Tidsformatering
```

## Designsystem

### Farger
| Farge           | Hex       | Bruk                         |
|-----------------|-----------|------------------------------|
| Dark Base       | `#0e2025` | Primær bakgrunn              |
| Green Accent    | `#46917c` | CTA, Ro-modus                |
| Deep Blue       | `#1e495d` | Sekundær, Fokus-modus        |
| Light Beige     | `#FFF9ED` | Tekst på mørk bakgrunn       |
| Energy Gold     | `#d4a574` | Energi-modus, streak         |

### Typografi
**Comfortaa** i vektene Regular (400), Medium (500), SemiBold (600) og Bold (700).

## Pustemønstre

| Øvelse | Teknikk         | Mønster                    |
|--------|-----------------|----------------------------|
| Ro     | 4-7-8           | Inn 4s → Hold 7s → Ut 8s  |
| Fokus  | Box breathing   | Inn 4s → Hold 4s → Ut 4s → Hold 4s |
| Energi | Energizing      | Inn 3s → Ut 3s             |

## Videre utvikling

- [ ] Push-varsler med daglig påminnelse
- [ ] Onboarding-flow (3 steg)
- [ ] Favorittøvelser
- [ ] Lyd/ambient audio under økter
- [ ] Widget for iOS/Android

## Kontakt

Gran Nielsen AS / Biohead  
admin@biohead.no
