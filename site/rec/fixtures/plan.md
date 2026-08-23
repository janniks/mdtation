# Auth: session refresh

## Goal

Keep users signed in across tab reloads without storing long-lived tokens in the browser.
Access tokens expire after 15 minutes; a refresh token extends the session server-side.

## Approach

- Access token in memory only, never localStorage.
- Refresh token in an httpOnly, SameSite=Strict cookie scoped to `/auth`.
- One endpoint, `POST /auth/refresh`, returns a new access token and sets a new cookie.

## Session refresh

Refresh tokens rotate on every request and the old token is revoked immediately.
A reused token means the cookie leaked, so the whole session family is invalidated.
The client calls refresh when an access token is within 60 s of expiry, or on a 401.

## Logout

- `POST /auth/logout` clears the cookie and revokes the current family.
- Other devices keep their own families; "log out everywhere" is a separate setting.

## Risks

- Two tabs refreshing at once: the second sees a revoked token and gets signed out.
- Clock skew between client and server makes the 60 s threshold unreliable.
- Cookie scope must match the API path or the browser silently drops it.

## Tasks

- [ ] Add `refresh_tokens` table with family id, parent id, revoked_at.
- [ ] Implement `POST /auth/refresh` with rotation and reuse detection.
- [ ] Implement `POST /auth/logout`.
- [ ] Client: refresh timer plus 401 retry, single in-flight promise.
- [ ] Tests: rotation, reuse after revoke, logout clears family.
- [ ] Docs: update `docs/auth.md`.
