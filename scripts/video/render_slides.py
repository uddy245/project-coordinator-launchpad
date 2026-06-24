# -*- coding: utf-8 -*-
"""
Render a lesson's slides to lessons/<slug>/slides/NN.png at 1920x1080 — v2 design.

On-brand (navy ink / crisp white / amber accent, from src/app/globals.css) but
with a real design system: gradient depth on dark slides, an eyebrow lesson
label, a R·A·I·D brand mark, a code-editor card for RAID entries, numbered
list chips, and a slide progress bar.

    python3 render_slides.py [lesson-slug]     # default: lesson-20-raid-logs

Pure Pillow, no network. Fonts resolve from a cross-platform list (macOS +
Linux) so this runs the same on a Mac or in CI. Per-lesson chrome labels
(EYEBROW / LESSON_TAG) come from the lesson's segments.py.
"""
import os
import re
import sys
import importlib.util
from PIL import Image, ImageDraw, ImageFont
import build_common as bc

W, H = 1920, 1080
M = 130  # outer margin

# ---- palette ----
NAVY_TOP = (24, 34, 47)
NAVY_BOT = (13, 19, 27)
INK      = (20, 28, 39)
WHITE    = (255, 255, 255)
PAPER_TOP= (251, 251, 249)
PAPER_BOT= (243, 244, 246)
AMBER    = (190, 132, 27)
AMBER_SOFT = (220, 170, 86)
AMBER_TINT = (250, 238, 218)
AMBER_DARK = (133, 79, 11)
MUTED    = (96, 106, 121)
MUTED_DK = (150, 160, 174)   # muted on navy
BORDER   = (223, 226, 231)
CARDBAR  = (238, 240, 243)
BRICK    = (176, 66, 46)
BRICK_TINT = (250, 235, 231)
GREEN    = (61, 122, 60)

# Per-lesson chrome labels; main() overrides these from the lesson's segments.py.
EYEBROW = "LESSON 20"
LESSON_TAG = "RAID LOGS"

# ---- fonts (first existing path wins) ----
def _f(paths, size):
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

SANS = ["/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
SANS_B = ["/System/Library/Fonts/Supplemental/Arial Bold.ttf",
          "/Library/Fonts/Arial Bold.ttf",
          "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
          "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
SERIF = ["/System/Library/Fonts/Supplemental/Georgia.ttf",
         "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
         "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"]
MONO = ["/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/Supplemental/Courier New.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]

def reg(s):  return _f(SANS, s)
def bold(s): return _f(SANS_B, s)
def serif(s):return _f(SERIF, s)
def mono(s): return _f(MONO, s)

# ---- text helpers ----
def wrap(draw, text, font, max_w):
    out = []
    for para in text.split("\n"):
        if not para:
            out.append("")
            continue
        words, cur = para.split(), ""
        for w in words:
            t = (cur + " " + w).strip()
            if draw.textlength(t, font=font) <= max_w:
                cur = t
            else:
                if cur: out.append(cur)
                cur = w
        if cur: out.append(cur)
    return out

def block(draw, text, font, x, y, max_w, fill, leading=1.35, center=None, tracking=0):
    lh = int(font.size * leading)
    for ln in wrap(draw, text, font, max_w):
        if ln == "":
            y += lh; continue
        if center is not None:
            tw = draw.textlength(ln, font=font) + tracking*(len(ln)-1)
            _track(draw, ln, font, center - tw/2, y, fill, tracking)
        else:
            _track(draw, ln, font, x, y, fill, tracking)
        y += lh
    return y

def _track(draw, text, font, x, y, fill, tracking=0):
    if tracking == 0:
        draw.text((x, y), text, font=font, fill=fill); return
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += draw.textlength(ch, font=font) + tracking

# ---- backgrounds & chrome ----
def gradient(top, bot):
    img = Image.new("RGB", (W, H), top)
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        c = tuple(int(top[i] + (bot[i]-top[i])*t) for i in range(3))
        d.line([(0, y), (W, y)], fill=c)
    return img

def brandmark(d, x, y, s=22, gap=9, on_dark=True):
    cols = [AMBER, AMBER_SOFT,
            (70, 84, 102) if on_dark else BORDER,
            (54, 66, 82) if on_dark else (205, 209, 215)]
    pts = [(x, y), (x+s+gap, y), (x, y+s+gap), (x+s+gap, y+s+gap)]
    for (px, py), c in zip(pts, cols):
        d.rounded_rectangle([px, py, px+s, py+s], radius=4, fill=c)

def eyebrow(d, on_dark):
    c1 = WHITE if on_dark else INK
    c2 = MUTED_DK if on_dark else MUTED
    d.rounded_rectangle([M, 78, M+16, 94], radius=3, fill=AMBER)
    x = M + 30
    _track(d, EYEBROW, bold(25), x, 70, c1, 2)
    x += d.textlength(EYEBROW, font=bold(25)) + 2*len(EYEBROW) + 22
    d.text((x, 70), "·", font=reg(25), fill=c2); x += 24
    _track(d, LESSON_TAG, reg(25), x, 70, c2, 2)
    brandmark(d, W-M-53, 70, on_dark=on_dark)

def progress(d, idx, total, on_dark):
    y = H - 86
    track = (54, 66, 82) if on_dark else BORDER
    d.rounded_rectangle([M, y, W-M, y+5], radius=3, fill=track)
    frac = idx/total
    d.rounded_rectangle([M, y, M + int((W-2*M)*frac), y+5], radius=3, fill=AMBER)
    lab = f"{idx:02d} / {total:02d}"
    c = MUTED_DK if on_dark else MUTED
    d.text((W-M-d.textlength(lab, font=reg(24)), y-44), lab, font=reg(24), fill=c)

# ---- templates ----
def t_title(s, idx, total):
    img = gradient(NAVY_TOP, NAVY_BOT); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 10, H], fill=AMBER)
    cx = W/2
    brandmark(d, int(cx-31), 300, s=28, gap=12)
    lab = EYEBROW
    tw = d.textlength(lab, font=reg(30)) + 4*(len(lab)-1)
    _track(d, lab, reg(30), cx - tw/2, 248, AMBER_SOFT, 4)
    d.text((cx - d.textlength(s["title"], font=bold(168))/2, 410),
           s["title"], font=bold(168), fill=WHITE)
    d.line([(cx-100, 640), (cx+100, 640)], fill=AMBER, width=6)
    sub = s["body"][-1] if s["body"] else ""
    d.text((cx - d.textlength(sub, font=reg(46))/2, 700), sub, font=reg(46), fill=MUTED_DK)
    progress(d, idx, total, True)
    return img

def t_story(s, idx, total):
    img = gradient(NAVY_TOP, NAVY_BOT); d = ImageDraw.Draw(img)
    eyebrow(d, True)
    d.text((M-6, 250), "“", font=serif(240), fill=(46, 58, 74))
    # measure block height to vertically center
    lines = []
    for ln in s["body"]:
        lines += wrap(d, ln, serif(70), W-2*M-60)
        lines.append("")
    if lines and lines[-1] == "": lines.pop()
    total_h = len(lines) * int(70*1.3)
    y = (H-total_h)//2 + 20
    bar_top = y
    for ln in s["body"]:
        y = block(d, ln, serif(70), M+60, y, W-2*M-60, WHITE, leading=1.3)
        y += int(70*0.3)
    d.rounded_rectangle([M, bar_top+6, M+8, y-int(70*0.3)-6], radius=4, fill=AMBER)
    progress(d, idx, total, True)
    return img

def t_def(s, idx, total):
    img = gradient(PAPER_TOP, PAPER_BOT); d = ImageDraw.Draw(img)
    eyebrow(d, False)
    mono_letter = s["title"][0]
    sq = 168
    sx, sy = M, 250
    d.rounded_rectangle([sx, sy, sx+sq, sy+sq], radius=24, fill=AMBER_TINT)
    f = bold(108)
    d.text((sx+sq/2 - d.textlength(mono_letter, font=f)/2, sy+14), mono_letter, font=f, fill=AMBER_DARK)
    tx = sx + sq + 56
    d.text((tx, sy+18), s["title"], font=bold(96), fill=INK)
    d.line([(tx+4, sy+150), (tx+360, sy+150)], fill=AMBER, width=5)
    lead, body = s["body"][0]
    yy = sy + sq + 70
    yy = block(d, lead, bold(54), M, yy, W-2*M-40, INK, leading=1.3)
    yy += 26
    block(d, body, reg(45), M, yy, W-2*M-120, MUTED, leading=1.5)
    progress(d, idx, total, False)
    return img

def t_example(s, idx, total):
    img = gradient(PAPER_TOP, PAPER_BOT); d = ImageDraw.Draw(img)
    eyebrow(d, False)
    d.text((M, 230), s["title"], font=bold(74), fill=INK)
    kind, text = s["body"][0]
    if kind == "bad":
        accent, label, lab_bg, lab_fg = BRICK, "WEAK ENTRY", BRICK_TINT, BRICK
    elif kind == "good":
        accent, label, lab_bg, lab_fg = AMBER, "STRONG ENTRY", AMBER_TINT, AMBER_DARK
    else:
        accent, label, lab_bg, lab_fg = INK, "", CARDBAR, INK
    bx, by, bw = M, 380, W-2*M
    bh = H - by - 150
    d.rounded_rectangle([bx, by, bx+bw, by+bh], radius=20, fill=WHITE, outline=BORDER, width=2)
    # title bar
    d.rounded_rectangle([bx, by, bx+bw, by+74], radius=20, fill=CARDBAR)
    d.rectangle([bx, by+40, bx+bw, by+74], fill=CARDBAR)
    for i, c in enumerate([(232,138,120),(240,200,120),(150,200,150)]):
        d.ellipse([bx+30+i*30, by+30, bx+46+i*30, by+46], fill=c)
    d.text((bx+150, by+24), "raid-log — risk entry", font=mono(28), fill=MUTED)
    if label:
        lw = d.textlength(label, font=bold(24)) + 36
        d.rounded_rectangle([bx+bw-lw-24, by+22, bx+bw-24, by+52], radius=15, fill=lab_bg)
        d.text((bx+bw-lw-24+18, by+27), label, font=bold(24), fill=lab_fg)
    # left accent + line-numbered body
    d.rounded_rectangle([bx, by+74, bx+8, by+bh], radius=0, fill=accent)
    msize = 32 if text.count("\n") >= 4 else 40
    f = mono(msize); lh = int(msize*1.45)
    tx, ty = bx+100, by+104
    gx = bx+46
    n = 1
    for raw in text.split("\n"):
        if raw == "":
            ty += lh//2; continue
        wrapped = wrap(d, raw, f, bw-170) or [""]
        for j, ln in enumerate(wrapped):
            if j == 0:
                d.text((gx, ty), f"{n}", font=mono(int(msize*0.8)), fill=(200,204,210))
            # amber-highlight leading "Label:" tokens
            if ":" in ln and ln.split(":")[0] in ("Impact","Probability","Owner","Mitigation","Next review","RISK","ISSUE"):
                lab_t = ln.split(":")[0]
                d.text((tx, ty), lab_t+":", font=f, fill=AMBER_DARK)
                rest = ln[len(lab_t)+1:]
                d.text((tx+d.textlength(lab_t+":", font=f), ty), rest, font=f, fill=INK)
            else:
                d.text((tx, ty), ln, font=f, fill=INK)
            ty += lh
        if raw != "": n += 1
    progress(d, idx, total, False)
    return img

def t_list(s, idx, total):
    img = gradient(PAPER_TOP, PAPER_BOT); d = ImageDraw.Draw(img)
    eyebrow(d, False)
    d.text((M, 220), s["title"], font=bold(76), fill=INK)
    d.line([(M+4, 330), (M+300, 330)], fill=AMBER, width=5)
    rows = s["body"]; n = len(rows)
    top = 410; bottom = H - 150
    rh = (bottom - top) / n
    cy = top
    for i, (head, sub) in enumerate(rows):
        head = re.sub(r"^\d+\s+", "", head)  # chip is the only number
        # number chip
        d.ellipse([M, cy+8, M+52, cy+60], fill=AMBER)
        num = str(i+1)
        d.text((M+26 - d.textlength(num, font=bold(30))/2, cy+16), num, font=bold(30), fill=WHITE)
        d.text((M+86, cy+6), head, font=bold(46), fill=INK)
        block(d, sub, reg(34), M+86, cy+64, W-2*M-120, MUTED, leading=1.28)
        if i < n-1:
            d.line([(M+86, cy+rh-4), (W-M, cy+rh-4)], fill=BORDER, width=1)
        cy += rh
    progress(d, idx, total, False)
    return img

def t_end(s, idx, total):
    img = gradient(NAVY_TOP, NAVY_BOT); d = ImageDraw.Draw(img)
    cx = W/2
    brandmark(d, int(cx-31), 330, s=28, gap=12)
    d.text((cx - d.textlength(s["title"], font=bold(96))/2, 470),
           s["title"], font=bold(96), fill=WHITE)
    d.line([(cx-80, 610), (cx+80, 610)], fill=AMBER, width=5)
    sub = s["body"][0]
    d.text((cx - d.textlength(sub, font=reg(44))/2, 660), sub, font=reg(44), fill=MUTED_DK)
    return img

RENDER = {"title": t_title, "story": t_story, "def": t_def,
          "example": t_example, "list": t_list, "end": t_end}


def main():
    global EYEBROW, LESSON_TAG
    lesson = bc.lesson_from_argv(sys.argv)
    # Per-lesson chrome labels from the lesson's segments.py (fall back to slug).
    spec = importlib.util.spec_from_file_location(
        "segmod", os.path.join(lesson.dir, "segments.py"))
    segmod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(segmod)
    EYEBROW = getattr(segmod, "EYEBROW", lesson.slug.upper())
    LESSON_TAG = getattr(segmod, "LESSON_TAG", "")

    os.makedirs(lesson.slides, exist_ok=True)
    total = len(lesson.segments)
    for i, s in enumerate(lesson.segments, start=1):
        img = RENDER[s["mode"]](s, i, total)
        img.save(lesson.slide_png(s["id"]))
    bc.write_narration_files(lesson)
    bc.write_segments_json(lesson)
    print(f"{total} slides -> {lesson.slides}")


if __name__ == "__main__":
    main()
