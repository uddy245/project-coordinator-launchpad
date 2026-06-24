# -*- coding: utf-8 -*-
"""
Render a lesson's slides to lessons/<slug>/slides/NN.png at 1920x1080,
on-brand (navy ink / crisp white / amber accent — matches globals.css).

    python3 render_slides.py [lesson-slug]    # default: lesson-20-raid-logs

No network needed. Requires Pillow. Footer label comes from each segment
file's FOOTER (falls back to the lesson slug).
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
import build_common as bc

W, H = 1920, 1080

# ---- brand palette (from src/app/globals.css) ----
NAVY   = (21, 29, 40)
INK    = (21, 29, 40)
WHITE  = (255, 255, 255)
AMBER  = (184, 128, 26)
AMBER_S= (217, 167, 81)
MUTED  = (90, 100, 115)
PAPER  = (244, 245, 247)
BORDER = (220, 223, 228)
BRICK  = (176, 66, 46)   # "bad" example
CARD   = (29, 39, 52)    # raised card on navy

# ---- fonts ----
# Prefer the Liberation/DejaVu faces the validated build used (Linux); fall
# back to system equivalents so the script also runs on macOS/Windows.
_SANS_REG = ["/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
             "/Library/Fonts/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf",
             "/System/Library/Fonts/Helvetica.ttc", "Arial.ttf"]
_SANS_BOLD = ["/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
              "/Library/Fonts/Arial Bold.ttf",
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
              "/System/Library/Fonts/Helvetica.ttc", "Arial Bold.ttf"]
_MONO = ["/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
         "/System/Library/Fonts/Menlo.ttc",
         "/System/Library/Fonts/Supplemental/Courier New.ttf", "Menlo.ttc"]


def _first(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    return paths[0]  # let Pillow raise a clear error if none exist


def reg(s):  return ImageFont.truetype(_first(_SANS_REG), s)
def bold(s): return ImageFont.truetype(_first(_SANS_BOLD), s)
def mono(s): return ImageFont.truetype(_first(_MONO), s)


def wrap(draw, text, font, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines


def draw_block(draw, text, font, x, y, max_w, fill, leading=1.32, align="left", center_x=None):
    lines = []
    for para in text.split("\n"):
        if para == "":
            lines.append("")
        else:
            lines += wrap(draw, para, font, max_w)
    lh = int((font.size) * leading)
    for ln in lines:
        if ln == "":
            y += lh; continue
        if align == "center" and center_x is not None:
            tw = draw.textlength(ln, font=font)
            draw.text((center_x - tw/2, y), ln, font=font, fill=fill)
        else:
            draw.text((x, y), ln, font=font, fill=fill)
        y += lh
    return y


def base(bg):
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)


def footer(draw, dark, label):
    c = (150, 160, 175) if dark else MUTED
    draw.text((96, H-70), "PROJECT COORDINATOR LAUNCHPAD", font=reg(24), fill=c)
    draw.text((W-96-draw.textlength(label, font=reg(24)), H-70),
              label, font=reg(24), fill=c)


# ---------------- templates ----------------
def t_title(s, label):
    img, d = base(NAVY)
    d.rectangle([0, 0, 14, H], fill=AMBER)
    cx = W/2
    d.text((cx - d.textlength(s["title"], font=bold(150))/2, 360),
           s["title"], font=bold(150), fill=WHITE)
    d.line([(cx-90, 560), (cx+90, 560)], fill=AMBER, width=5)
    y = 610
    for i, b in enumerate(s["body"]):
        f = reg(54) if i == 0 else reg(40)
        col = WHITE if i == 0 else (170, 180, 195)
        d.text((cx - d.textlength(b, font=f)/2, y), b, font=f, fill=col)
        y += int(f.size*1.5)
    footer(d, True, label)
    return img


def t_story(s, label):
    img, d = base(NAVY)
    d.rectangle([0, 0, 14, H], fill=AMBER)
    d.text((110, 150), "“", font=bold(220), fill=(46, 58, 74))
    y = 380
    for i, line in enumerate(s["body"]):
        y = draw_block(d, line, bold(66), 0, y, W-360, WHITE,
                       leading=1.22, align="center", center_x=W/2)
        y += 24
    footer(d, True, label)
    return img


def t_def(s, label):
    img, d = base(WHITE)
    d.rectangle([0, 0, W, 12], fill=AMBER)
    d.text((96, 120), s["title"], font=bold(96), fill=INK)
    d.line([(100, 250), (100+460, 250)], fill=AMBER, width=6)
    lead, body = s["body"][0]
    y = 330
    y = draw_block(d, lead, bold(56), 100, y, W-200, INK, leading=1.25)
    y += 30
    draw_block(d, body, reg(46), 100, y, W-260, MUTED, leading=1.42)
    footer(d, False, label)
    return img


def t_example(s, label):
    img, d = base(PAPER)
    d.rectangle([0, 0, W, 12], fill=AMBER)
    d.text((96, 110), s["title"], font=bold(72), fill=INK)
    kind, text = s["body"][0]
    box_x, box_y, box_w = 100, 290, W-200
    if kind == "bad":
        accent, label_txt = BRICK, "WEAK ENTRY"
    elif kind == "good":
        accent, label_txt = AMBER, "STRONG ENTRY"
    else:
        accent, label_txt = INK, ""
    box_h = H - box_y - 150
    d.rounded_rectangle([box_x, box_y, box_x+box_w, box_y+box_h], radius=18,
                        fill=WHITE, outline=BORDER, width=2)
    d.rectangle([box_x, box_y, box_x+10, box_y+box_h], fill=accent)
    if label_txt:
        d.text((box_x+48, box_y+34), label_txt, font=bold(28), fill=accent)
    msize = 34 if text.count("\n") >= 4 else 40
    draw_block(d, text, mono(msize), box_x+48, box_y+ (92 if label_txt else 48),
               box_w-110, INK, leading=1.4)
    footer(d, False, label)
    return img


def t_list(s, label):
    img, d = base(WHITE)
    d.rectangle([0, 0, W, 12], fill=AMBER)
    d.text((96, 96), s["title"], font=bold(78), fill=INK)
    d.line([(100, 210), (100+520, 210)], fill=AMBER, width=6)
    n = len(s["body"])
    y = 290
    row_h = (H - 300 - y) / n
    cy = 280
    for head, sub in s["body"]:
        d.ellipse([100, cy+10, 124, cy+34], fill=AMBER)
        d.text((150, cy), head, font=bold(46), fill=INK)
        draw_block(d, sub, reg(36), 150, cy+62, W-360, MUTED, leading=1.3)
        cy += int(row_h)
    footer(d, False, label)
    return img


def t_end(s, label):
    img, d = base(NAVY)
    cx = W/2
    d.text((cx - d.textlength(s["title"], font=bold(92))/2, 420),
           s["title"], font=bold(92), fill=WHITE)
    d.line([(cx-70, 560), (cx+70, 560)], fill=AMBER, width=5)
    sub = s["body"][0]
    d.text((cx - d.textlength(sub, font=reg(46))/2, 600), sub, font=reg(46),
           fill=(170, 180, 195))
    return img


RENDER = {"title": t_title, "story": t_story, "def": t_def,
          "example": t_example, "list": t_list, "end": t_end}


def main():
    lesson = bc.lesson_from_argv(sys.argv)
    # Footer label: each lesson's segments.py may define FOOTER; else slug.
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "segmod", os.path.join(lesson.dir, "segments.py"))
    segmod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(segmod)
    label = getattr(segmod, "FOOTER", lesson.slug)

    os.makedirs(lesson.slides, exist_ok=True)
    for s in lesson.segments:
        img = RENDER[s["mode"]](s, label)
        path = lesson.slide_png(s["id"])
        img.save(path)
        print("wrote", path)
    bc.write_narration_files(lesson)
    bc.write_segments_json(lesson)
    print(f"\n{len(lesson.segments)} slides -> {lesson.slides}")


if __name__ == "__main__":
    main()
