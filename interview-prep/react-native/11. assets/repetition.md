# Images, fonts, assets, icons, splash — Next-day repetition

## How to use

1. Do **not** open `notes.md` first. The full question bank is `self-test.md`; this file is the next-day subset.
2. Answer every question out loud or in writing, notes closed.
3. Check `answers.md` only after you finish (or after an item if stuck more than ~2 minutes).
4. Mark `[x]` only if you retrieved it without looking.
5. If more than about a third are misses, restudy those sections in `notes.md`, then retry only the misses.

Target time: **15–25 minutes**.

## Must retrieve

- [ ] `require` vs `{ uri }`. Four `resizeMode`s. Why 4000px in a 40px avatar still hurts.
- [ ] Unregistered font → what users see. Icon/splash owned by whom? OTA can’t change them — why?
- [ ] How to stop layout jump. Why FastImage isn’t the first answer for huge avatars.
- [ ] `cover` vs `contain`. Fonts need a native rebuild — why?
- [ ] Metro-packed assets vs mipmap/xcassets.

## Predict / debug

- [ ] Remote `Image` with no size — layout? `contain` in a square, wide photo — crop or letterbox? Explain why.
- [ ] `fontFamily` set but iOS internal name/link wrong — what do users see? CodePush splash `Image` — does cold-launch splash change? Explain why.
- [ ] Android OOM on avatar list — checklist. Designer splash wrong; you only edited React — where to look?
- [ ] Content jumps when the image loads — what did you forget?

## Say it out loud

- [ ] Explain RN images/fonts/splash in 30–60 seconds.
- [ ] How do you handle images and assets in RN? Follow-ups: resizeMode? Fonts? Splash not updating?
- [ ] Avatar list OOMs on Android — what do you check?
