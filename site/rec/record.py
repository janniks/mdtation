#!/usr/bin/env python3
"""Record a mdtation feature as a gif: python3 site/rec/record.py site/rec/tapes/<name>.json
Tape: {"file": "examples/tour.md", "cols": 80, "rows": 24, "steps": [[delay_s, "keys"], ...]}
Keys are raw bytes for the TUI; tokens <enter> <esc> <up> <down> <ctrl+c> <ctrl+s> <ctrl+u> <ctrl+d> expand,
plus mouse: <click X,Y> <wheelup X,Y> <wheeldown X,Y> <drag X1,Y1 X2,Y2> (1-based terminal cells).
Optional: "seed": [{"line": N, "text": "..."}] pre-saved comments; "cmd": shell command instead of the TUI
(e.g. "bun src/bin.ts examples/tour.md --list; sleep 2"); "boot": seconds before first step; "typing": per-key delay.
Output: site/public/media/<name>.mp4 + <name>.png poster (the .cast stays next to the tape)."""
import json, os, pty, select, subprocess, sys, time

TOK = {"<enter>": "\r", "<esc>": "\x1b", "<up>": "\x1b[A", "<down>": "\x1b[B", "<left>": "\x1b[D",
       "<right>": "\x1b[C", "<ctrl+c>": "\x03", "<ctrl+s>": "\x13", "<ctrl+u>": "\x15", "<ctrl+d>": "\x04",
       "<tab>": "\t", "<bs>": "\x7f"}
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
tape = sys.argv[1]
name = os.path.splitext(os.path.basename(tape))[0]
t = json.load(open(tape))
cols, rows = t.get("cols", 80), t.get("rows", 24)
cast = os.path.join(os.path.dirname(tape), name + ".cast")
media = os.path.join(root, "site", "public", "media")
os.makedirs(media, exist_ok=True)
gif = os.path.join(os.path.dirname(tape), name + ".gif")  # intermediate, next to the tape
mp4 = os.path.join(media, name + ".mp4")
poster = os.path.join(media, name + ".png")
home = os.path.join(root, "site", "rec", "home")  # isolated store: no personal comments leak
os.makedirs(home, exist_ok=True)
env = {**os.environ, "MDTATION_HOME": os.path.join(home, name), "TERM": "xterm-256color",
       "COLUMNS": str(cols), "LINES": str(rows)}
subprocess.run(["rm", "-rf", env["MDTATION_HOME"]])
if t.get("seed"):
    os.makedirs(os.path.join(env["MDTATION_HOME"], "comments"))
    key = os.path.join(root, t["file"]).replace("/", "-")
    data = {"comments": [{"id": f"seed{i}", "anchor": {"kind": "line", "n": c["line"]}, "text": c["text"],
                          "createdAt": 1700000000000 + i} for i, c in enumerate(t["seed"])], "marks": []}
    json.dump(data, open(os.path.join(env["MDTATION_HOME"], "comments", key + ".json"), "w"))
cmd = t.get("cmd") or f"bun src/bin.ts {t['file']}"
start = time.time()
pid, fd = pty.fork()
if pid == 0:
    os.chdir(root)
    os.execvpe("asciinema", ["asciinema", "rec", "--overwrite", "--quiet", "--cols", str(cols),
               "--rows", str(rows), "-c", cmd, cast], env)
import fcntl, termios, struct
fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

def drain(secs):
    end = time.time() + secs
    while time.time() < end:
        r, _, _ = select.select([fd], [], [], max(0, end - time.time()))
        if r:
            try:
                if not os.read(fd, 65536):
                    return
            except OSError:
                return

drain(t.get("boot", 1.5))
import re
def mouse(m):
    kind, a, b = m.group(1), m.group(2), m.group(3)
    x, y = a.split(",")
    if kind == "click":
        return f"\x1b[<0;{x};{y}M\x1b[<0;{x};{y}m"
    if kind == "wheelup":
        return f"\x1b[<64;{x};{y}M"
    if kind == "wheeldown":
        return f"\x1b[<65;{x};{y}M"
    x2, y2 = b.split(",")
    steps = "".join(f"\x1b[<32;{x};{y2 if i else y}M" for i in range(2))
    return f"\x1b[<0;{x};{y}M{steps}\x1b[<32;{x2};{y2}M\x1b[<0;{x2};{y2}m"
for delay, keys in t["steps"]:
    for k, v in TOK.items():
        keys = keys.replace(k, v)
    keys = re.sub(r"<(click|wheelup|wheeldown|drag) (\d+,\d+)(?: (\d+,\d+))?>", mouse, keys)
    # Escape sequences go out in one write; splitting them would turn a click into keypresses.
    for ch in re.findall(r"\x1b\[[0-9;<]*[A-Za-z~]|\x1b.|.", keys, re.S):
        os.write(fd, ch.encode())
        drain(t.get("typing", 0.06))
    drain(delay)
quit = time.time() - start
if not t.get("cmd"):
    os.write(fd, b"q")
drain(1)
# A tape that leaves a modal open would swallow the `q` and hang forever, so give up after a while.
for _ in range(50):
    try:
        if os.waitpid(pid, os.WNOHANG)[0]:
            break
    except ChildProcessError:
        break
    drain(0.1)
else:
    os.kill(pid, 9)
    print("killed: app did not quit", file=sys.stderr)
# Post-process the cast so the gif loops cleanly:
# - coalesce events closer than 40 ms so a redraw split across reads never shows as a half-drawn flash
# - drop the exit (from just before `q`) so it ends on content, not on teardown
# - drop the blank boot before the first full frame so the loop restarts on the rendered document
lines = open(cast).read().splitlines()
head = lines[0]
events = [json.loads(l) for l in lines[1:] if l.startswith("[")]
if not t.get("cmd"):
    events = [e for e in events if e[0] < quit - 0.3]
merged = []
for ts, kind, data in events:
    if merged and kind == "o" and merged[-1][1] == "o" and ts - merged[-1][0] < 0.04:
        merged[-1][2] += data
    else:
        merged.append([ts, kind, data])
first = next((i for i, e in enumerate(merged) if "Help" in e[2] or t.get("cmd")), 0)
base = merged[first][0] if merged else 0
merged = [[max(0.0, e[0] - base), e[1], e[2]] for e in merged[first:]]
open(cast, "w").write("\n".join([head] + [json.dumps(e) for e in merged]) + "\n")
# Pastel on near-black, in the website's terminal colours (openindex green as the accent).
THEME = ",".join([
    "1b1d1b", "e8e6df",
    "3a3d3a", "e8a3a3", "99d892", "e9d28a", "9ec5e8", "d4a8e0", "9fdcd4", "e8e6df",
    "6b706b", "f0b8b8", "b6e6ad", "f2e0a6", "b7d6f2", "e2c2ea", "bdeae3", "ffffff",
])
subprocess.run(["agg", "--theme", t.get("theme", THEME), "--font-size", str(t.get("font", 32)), "--fps-cap", "60",
                "--idle-time-limit", "2", "--last-frame-duration", "3", cast, gif], check=True,
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
# gif -> h264 mp4 (even dimensions, yuv420p for Safari) + first-frame poster
ff = ["ffmpeg", "-y", "-loglevel", "error"]
subprocess.run(ff + ["-i", gif, "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                     "-crf", "20", "-preset", "slow", "-movflags", "+faststart", mp4], check=True)
subprocess.run(ff + ["-i", gif, "-frames:v", "1", poster], check=True)
os.remove(gif)
print(mp4)
