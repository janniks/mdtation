#!/bin/bash
G=$'\e[32m'; D=$'\e[90m'; B=$'\e[1m'; R=$'\e[0m'; C=$'\e[36m'
echo
echo "${G}●${R} ${B}I drafted the session-refresh plan. Which approach should I take?${R}"
echo
echo "${C}❯ 1.${R} Rotate refresh tokens on every request"
echo "  ${D}2. Keep a 30 s reuse grace window${R}"
echo "  ${D}3. Long-lived sessions, no rotation${R}"
echo "  ${D}4. Let me pick per environment${R}"
echo
echo "${D}  Enter a number, or type to reply …${R}"
echo
echo "${D}› ${R}2, but only if 1's revocation applies, and where did 3 come from?"
sleep 4
