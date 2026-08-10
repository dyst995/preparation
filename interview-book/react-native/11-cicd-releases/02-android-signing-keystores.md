# 02. Android signing: keystores

> Source: `interview-prep/react-native/11-cicd-releases.md`

### Topics to learn
- [ ] Keystore vs key alias vs key password vs store password
- [ ] Upload key vs app signing key (Play App Signing)
- [ ] `debug.keystore` vs release keystore
- [ ] `signingConfigs` in `build.gradle`
- [ ] Keystore loss consequences and mitigation
- [ ] Keeping keystores out of git

### Mental model

An Android release APK/AAB must be signed. Signing proves the update comes from the same author as the previous version, so the OS/Play Store can trust the upgrade.

Key pieces:

| Term | What it is |
|---|---|
| Keystore file (`.jks`/`.keystore`) | Container holding one or more key pairs |
| Key alias | Named key inside the keystore |
| Store password | Unlocks the keystore file |
| Key password | Unlocks the specific alias |
| Upload key | The key you sign your AAB with when uploading to Play (with Play App Signing enabled) |
| App signing key | The key Google actually re-signs your app with for distribution; Google holds this when you opt into Play App Signing |

### Why Play App Signing matters

- If you lose your **upload key**, Google lets you request a reset (with proof of ownership) because Google still controls the real app signing key.
- If you lose the **app signing key** in the old (non-Play-App-Signing) model, you are permanently locked out of updating that app under the same package name/signature. This is why Play App Signing is the safer default for any serious production app.

### `build.gradle` signing config (conceptual)

```gradle
android {
    signingConfigs {
        release {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

Passwords/paths come from `gradle.properties` (not committed) or CI-injected environment variables - never hardcoded, never committed.

### Interview question

**Q: What happens if you lose your Android release keystore?**

> "If Play App Signing is enabled, Google retains the actual signing key, so losing your upload key is recoverable through Google's identity-verification process and you get a new upload key. If Play App Signing isn't enabled and you lose the original signing key, you cannot publish updates to that existing app listing under the same identity anymore - you'd have to publish a new app, which is a disaster for an existing user base. That's why I always store keystores in a secure, backed-up secret store (not git) and enable Play App Signing on new apps."

### Green flags
- Mentions store password vs key password as distinct.
- Knows the difference between upload key and app signing key.
- Has an actual answer for "where do you store the keystore in CI" (see Section 10).

---
