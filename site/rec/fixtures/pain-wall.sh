#!/bin/bash
D=$'\e[90m'; R=$'\e[0m'; B=$'\e[1m'
for i in $(seq 1 3); do
cat <<T
${B}## Phase $i${R}
The client calls refresh when an access token is within 60 s of expiry, or on the first
401, whichever comes first, and every in-flight request is queued behind the refresh so
we never fan out duplicate refresh calls from parallel tabs or race the rotation window.
Refresh tokens rotate on every request and the old token is revoked immediately after
the new cookie is set, because a reused token means the cookie leaked and the whole
session family is invalidated server-side, which also covers the stolen-device case.
- Access token in memory only, never localStorage, never a readable cookie.
- Refresh token in an httpOnly SameSite=Strict cookie scoped to /auth.
- One endpoint, POST /auth/refresh, returns a new access token and sets a new cookie.
T
done
printf '%s' "${D}-- 214 more lines --${R}"
sleep 4
