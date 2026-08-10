# 05. Clean House - Zebra DataWedge barcode integration

> Source: `interview-prep/react-native/14-behavioral-stories.md`

### STAR breakdown

- **Situation**: Clean House needed barcode scanning workflows integrated with Zebra hardware devices using DataWedge, a capability with no off-the-shelf RN solution.
- **Task**: Bridge Zebra's native DataWedge broadcast-intent-based scanning API into the React Native app reliably.
- **Action**: Built the native integration (Android intents/broadcast receivers under the hood) to receive scan events from DataWedge and surface them cleanly to JS, handling edge cases like configuration profiles and device-specific quirks.
- **Result**: Reliable barcode scanning workflows on Zebra hardware, integrated cleanly into the app's business logic without exposing DataWedge's native complexity to the rest of the JS codebase.

### Spoken script (60-90s)

> "Clean House needed barcode scanning on Zebra handheld devices using DataWedge, which is Zebra's native scanning service - there wasn't a ready-made React Native library that handled it well, so this meant real native Android integration. DataWedge communicates via broadcast intents rather than a typical SDK call pattern, so I built the native bridge to register for those broadcasts, parse scan events, and expose a clean, simple JS API to the rest of the app - the business logic layer never needed to know DataWedge intents existed underneath. There were real device-specific quirks to handle, like DataWedge profile configuration and making sure the app correctly claimed focus for scan events versus other apps on the same device. The result was reliable, production-ready barcode workflows that felt like a native RN feature to the rest of the team, even though the underlying integration was genuinely native Android work."

### Likely follow-ups
- "Why DataWedge instead of the device camera for scanning?" - Zebra hardware scanners are dramatically faster/more reliable than camera-based scanning for high-volume warehouse/logistics-style use, especially at range and in poor lighting - know this reasoning.
- "What was the trickiest part of that integration?" - have a specific technical anecdote (e.g. broadcast receiver lifecycle issues, or profile configuration mismatches).

---
