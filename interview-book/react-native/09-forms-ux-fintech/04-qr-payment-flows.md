# 04. QR payment flows

> Source: `interview-prep/react-native/09-forms-ux-fintech.md`

### Topics to learn
- [ ] Camera permission request UX (contextual priming before the OS prompt)
- [ ] Scanning library integration (`react-native-vision-camera` + a barcode/QR frame processor, or a dedicated scanner library)
- [ ] Parsing and validating the scanned payload before acting on it (never trust raw QR content blindly)
- [ ] Handling malformed/unsupported QR codes gracefully
- [ ] Torch/flashlight toggle, focus/tap-to-focus UX
- [ ] Confirmation screen before committing the payment (never pay directly on scan)
- [ ] Receipt/success screen with clear transaction reference

### The QR payment flow (state by state)

```
[Scan screen]
   -> camera permission granted? -- no --> [Permission rationale + settings deep link]
   -> yes
   -> scan QR
   -> parse payload
      -> invalid/unsupported format --> [Inline error, allow rescan]
      -> valid
   -> [Confirmation screen: recipient, amount, fee, editable? clarify]
   -> user confirms (biometric/PIN step if required)
   -> [Processing state]
      -> success --> [Receipt screen with reference id, share/save option]
      -> failure --> [Error screen with retry, clear reason, no silent charge]
```

### Interview question

**Q: Walk me through a QR payment flow end-to-end, including error handling.**

> "First, I request camera permission with a short contextual explanation before the system prompt so the user understands why, which improves grant rates. Once scanning, I never act directly on raw QR content � I parse and validate the payload against an expected schema (e.g. merchant id, amount, reference), and if it doesn't match, I show an inline error and let them rescan rather than crashing or guessing. On a valid scan, I always route to a confirmation screen showing recipient, amount, and any fee � I never auto-submit a payment straight from a scan. Confirmation may require a biometric or PIN step depending on amount thresholds. During submission I show an explicit processing state, and on completion I show a receipt with a transaction reference; on failure, a clear reason and a retry path that doesn't risk a duplicate charge � which ties directly into idempotency."

---
