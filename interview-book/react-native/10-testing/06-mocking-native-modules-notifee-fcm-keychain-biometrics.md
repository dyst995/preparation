# 06. Mocking native modules (Notifee, FCM, Keychain, biometrics)

> Source: `interview-prep/react-native/10-testing.md`

### Topics to learn
- [ ] Why native modules must be mocked in Jest � there's no real native runtime in the JS test environment
- [ ] Manual mocks via `jest.mock('module-name', () => ({ ... }))`
- [ ] `__mocks__` folder convention for reusable mocks across the suite
- [ ] Setup files (`jest.config.js` ? `setupFiles`/`setupFilesAfterEach`) for globally mocking modules that nearly every test tree touches (e.g. Firebase messaging, Notifee)
- [ ] Mocking native module methods to return resolved/rejected promises to simulate permission grants/denials, biometric success/failure, etc.
- [ ] Community-maintained mocks (e.g. official Jest mocks shipped by some native libraries) vs writing your own

### Example: mocking Notifee and FCM

```ts
// __mocks__/@notifee/react-native.ts
export default {
  createChannel: jest.fn().mockResolvedValue('payments'),
  displayNotification: jest.fn().mockResolvedValue(undefined),
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
};

// __mocks__/@react-native-firebase/messaging.ts
const messaging = () => ({
  requestPermission: jest.fn().mockResolvedValue(1), // AUTHORIZED
  getToken: jest.fn().mockResolvedValue('fake-token'),
  onMessage: jest.fn(),
  setBackgroundMessageHandler: jest.fn(),
});
export default messaging;
```

### Example: mocking biometrics for both success and failure paths

```ts
jest.mock('react-native-biometrics', () => ({
  simplePrompt: jest.fn(),
}));

test('shows fallback PIN entry when biometric auth fails', async () => {
  (simplePrompt as jest.Mock).mockResolvedValueOnce({ success: false });
  render(<AuthGate />);
  await user.press(screen.getByRole('button', { name: 'Unlock' }));
  expect(await screen.findByText('Enter PIN')).toBeOnTheScreen();
});
```

### Interview question

**Q: How do you mock native modules like Notifee, FCM, or a biometrics library in Jest?**

> "There's no real native runtime under Jest, so any native module needs a JS-side mock � either via `jest.mock` inline in a test, or a reusable mock in a `__mocks__` folder or global setup file for modules touched broadly, like Firebase messaging or Notifee. I mock the methods to return resolved or rejected promises that simulate the real range of outcomes � permission granted vs denied, biometric success vs failure � so I can actually test both my happy-path and my fallback UI, like showing a PIN entry screen when biometric auth fails, without needing a real device."

---
