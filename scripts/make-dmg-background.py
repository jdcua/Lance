#!/usr/bin/env python3
"""Lance DMG background: light brand-matched drag-to-install art.

660x400 @1x + 1320x800 @2x into assets/build/.
Icon zones kept clear: app (180,170), Applications (480,170).
"""
from PIL import Image, ImageDraw, ImageFont
import math
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'build')
os.makedirs(ROOT, exist_ok=True)

BG = (248, 247, 243)        # app --bg-primary
INK = (24, 23, 22)          # app --text-primary
MUTED = (117, 117, 111)     # app --text-tertiary
ACCENT = (30, 201, 138)     # app --accent
ACCENT_DOT = (30, 201, 138, 115)
RING = (214, 235, 225)      # pale mint echo of the icon ring

HELV = '/System/Library/Fonts/Helvetica.ttc'


def fonts(s):
    return (
        ImageFont.truetype(HELV, int(21 * s), index=1),   # instruction, bold
        ImageFont.truetype(HELV, int(12 * s), index=0),   # tagline
    )


def dot(draw, xy, r, fill):
    draw.ellipse([xy[0] - r, xy[1] - r, xy[0] + r, xy[1] + r], fill=fill)


def dotted_arc(draw, p0, p1, ctrl, step_px, r, fill):
    # quadratic bezier, dotted
    dist = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    n = max(int(dist / step_px), 8)
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * ctrl[0] + t ** 2 * p1[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * ctrl[1] + t ** 2 * p1[1]
        pts.append((x, y))
    for p in pts:
        dot(draw, p, r, fill)
    # direction at end for the arrowhead
    dx = pts[-1][0] - pts[-3][0]
    dy = pts[-1][1] - pts[-3][1]
    return pts[-1], math.atan2(dy, dx)


def arrowhead(draw, tip, ang, size, fill):
    l = size
    w = size * 0.62
    p1 = (tip[0] - l * math.cos(ang) + w * math.sin(ang),
          tip[1] - l * math.sin(ang) - w * math.cos(ang))
    p2 = (tip[0] - l * math.cos(ang) - w * math.sin(ang),
          tip[1] - l * math.sin(ang) + w * math.cos(ang))
    draw.polygon([tip, p1, p2], fill=fill)


def render(s, out):
    W, H = int(660 * s), int(400 * s)
    img = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(img, 'RGBA')

    # faint mint ring echo, top-left, well clear of icons
    draw.ellipse([-90 * s, -110 * s, 150 * s, 130 * s], outline=RING + (255,), width=int(10 * s))
    draw.ellipse([-40 * s, 300 * s, 120 * s, 460 * s], outline=RING + (255,), width=int(8 * s))

    # dotted drag path between the two icon zones, gentle upward arc
    tip, ang = dotted_arc(
        draw,
        (272 * s, 178 * s), (392 * s, 162 * s), (332 * s, 148 * s),
        step_px=13 * s, r=3.2 * s, fill=ACCENT_DOT,
    )
    arrowhead(draw, (tip[0] + 7 * s, tip[1]), ang, 11 * s, ACCENT + (255,))

    f_big, f_small = fonts(s)
    # instruction
    t1 = 'Drag Lance into Applications'
    bb = draw.textbbox((0, 0), t1, font=f_big)
    draw.text(((W - (bb[2] - bb[0])) / 2, 292 * s), t1, font=f_big, fill=INK + (255,))
    # tagline
    t2 = 'LANCE  ·  THE TOOL FOR FREELANCERS'
    bb2 = draw.textbbox((0, 0), t2, font=f_small)
    draw.text(((W - (bb2[2] - bb2[0])) / 2, 348 * s), t2, font=f_small, fill=MUTED + (255,))

    img.save(out)
    print('wrote', out)


render(1, os.path.join(ROOT, 'dmg-background.png'))
render(2, os.path.join(ROOT, 'dmg-background@2x.png'))
