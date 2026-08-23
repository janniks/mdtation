#!/usr/bin/env python3
"""Fake Claude Code transcript for the site's agent clip: prints with typing and think delays."""
import sys, time

DIM, GREEN, RED, BOLD, BG, OFF = "\x1b[2m", "\x1b[32m", "\x1b[31m", "\x1b[1m", "\x1b[48;2;55;55;55m", "\x1b[0m"

def out(s=""):
    sys.stdout.write(s)
    sys.stdout.flush()

def typed(s, per=0.04):
    for ch in s:
        out(ch)
        time.sleep(per)

def line(s="", wait=0.0):
    out(s + "\r\n")
    time.sleep(wait)

out("\x1b[2J\x1b[H")
time.sleep(0.4)
out(BG + "❯ ")
typed("Read my comments on plans/auth.md with mdtation list and address each one")
out(OFF)
line()
time.sleep(0.9)
line()
line(f"{DIM}✻ Thinking…{OFF}", 1.2)
out("\x1b[1A\x1b[2K")
line("● Bash(mdtation plans/auth.md list)", 0.5)
line(f"{DIM}  ⎿  # Comments — auth.md{OFF}", 0.05)
line(f"{DIM}     Line 41  Auth / Session refresh{OFF}", 0.05)
line(f"{DIM}         Refresh tokens expire after 15 minutes of inactivity.{OFF}", 0.05)
line(f"{DIM}     > Too tight. Give users a short grace window on refresh.{OFF}", 0.05)
line(f"{DIM}     {OFF}", 0.05)
line(f"{DIM}     Line 58  Auth / Logout{OFF}", 0.05)
line(f"{DIM}         Logout clears the cookie on the client.{OFF}", 0.05)
line(f"{DIM}     > Also revoke the refresh token server side.{OFF}", 1.4)
line()
line("● Two comments. Keeping a 30 s grace window on refresh, and revoking on logout.", 1.2)
line()
line("● Update(plans/auth.md)", 0.5)
line(f"{DIM}  ⎿  Updated plans/auth.md with 2 additions and 1 removal{OFF}", 0.3)
line(f"{DIM}     41 {OFF}{RED}- Refresh tokens expire after 15 minutes of inactivity.{OFF}", 0.15)
line(f"{DIM}     41 {OFF}{GREEN}+ Refresh tokens expire after 15 minutes, with a 30 s grace window.{OFF}", 0.15)
line(f"{DIM}     58 {OFF}{GREEN}+ Logout also revokes the refresh token server side.{OFF}", 1.3)
line()
line("● Done. Both addressed, headings unchanged. Reopen with mdtation plans/auth.md")
time.sleep(3.0)
