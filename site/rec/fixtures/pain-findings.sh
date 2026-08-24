#!/bin/bash
D=$'\e[90m'; B=$'\e[1m'; R=$'\e[0m'; Y=$'\e[33m'; RD=$'\e[31m'; G=$'\e[32m'
echo "${B}Review findings (12)${R}"
echo
echo " ${RD}F1 [Critical]${R} refresh race on parallel tabs ${D}— see §2.1, rec (c), sub-point iii${R}"
echo " ${Y}F2 [High]${R} token in localStorage ${D}— fix per §3.4(b), paragraphs 2–3${R}"
echo " ${Y}F3 [High]${R} cookie scope too wide ${D}— relates to F1(a) and §4.2${R}"
echo " ${G}F4 [Low]${R} naming drift in /auth handlers ${D}— optional, see appendix A(iv)${R}"
echo " ${D}… 8 more findings${R}"
echo
echo "${D}› ${R}re F1: agree with (c) but only paragraph 3; F3 conflicts"
echo "  with §4.2(a), and F2(b) is already done I think?"
sleep 4
