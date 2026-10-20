#!/usr/bin/env python3
"""Assemble the Tomo-01 press loop from captured stills + plates + the house music bed.

Cuts land on the bar grid of the music (bar length from the manifest), Ken Burns
motion is a slow push/pull, and the mix is normalised to -14 LUFS integrated.
"""
import json
import os
import subprocess
import sys

BAR = 1.904762  # 126 bpm, from the house manifest
FR = "/opt/data/cache/scratch/film"
BUILD = f"{FR}/build"
os.makedirs(BUILD, exist_ok=True)


def run(cmd):
    print("  $", " ".join(cmd[:9]), "...")
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)


def shot(src, dur, out, motion, size, zoom=1.0, axis="xy"):
    """Slow push/pull on a still.

    axis="xy": supersample, then a frame-evaluated scale that changes zoom over
    time, cropped back to the delivery size. (crop's w/h reject a time
    expression, so the zoom rides on scale.)

    axis="y": supersample in height only and drift vertically, so the full
    width survives — for compositions that run edge to edge.

    `zoom` scales the move. Travel is generous on purpose: the house motion gate
    wants a median frame delta >= 2.5, and a 5% drift reads as a dead frame."""
    w, h = size
    n = max(2, int(round(dur * 30)))
    zoom = max(0.0, min(1.0, zoom))
    t_norm = f"(t/{dur:.4f})"

    if axis == "y":
        # Full width, vertical drift, no distortion: crop a shorter window from
        # the still (losing a little top/bottom), slide that window, then scale
        # it back to the delivery size. Cropping width instead would eat the
        # edge-to-edge compositions this path exists for.
        sub = max(2, int(h / 1.13) // 2 * 2)
        span_v = h - sub
        if motion == "out":
            y0, y1 = span_v, 0
        else:
            y0, y1 = 0, span_v
        y = f"{y0}+({y1 - y0})*{t_norm}" if span_v else "0"
        vf = (f"crop={w}:{sub}:x=0:y='{y}',"
              f"scale={w}:{h}:flags=lanczos,format=yuv420p")
    else:
        OVERSAMPLE = 1.42
        sw, sh = int(w * OVERSAMPLE) // 2 * 2, int(h * OVERSAMPLE) // 2 * 2
        # Z must stay inside [1, OVERSAMPLE] and never shrink the frame below
        # the delivery size — hence FULL < OVERSAMPLE with rounding headroom.
        full, tight = 1.40, 1.10
        mid = (full + tight) / 2
        full = mid + (full - mid) * zoom
        tight = mid + (tight - mid) * zoom
        z0, z1 = (full, tight) if motion == "in" else (tight, full)
        z = f"({z0}+({z1}-{z0})*min(1,{t_norm}))"
        pan = int(w * 0.035) * zoom
        cx = f"max(0,min(iw-ow,(iw-ow)/2+{pan}*{t_norm}))"
        cy = "max(0,min(ih-oh,(ih-oh)/2))"
        vf = (f"scale={sw}:{sh}:flags=lanczos,"
              f"scale=w='iw/{z}':h='ih/{z}':eval=frame,"
              f"crop={w}:{h}:x='{cx}':y='{cy}',format=yuv420p")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-loop", "1", "-t", f"{dur:.4f}",
         "-i", src, "-vf", vf, "-frames:v", str(n), "-r", "30",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-an", out])


def build(name, size, plan, bed, total):
    segs = []
    used = 0.0
    for i, item in enumerate(plan):
        src, bars, motion = item[:3]
        zoom = item[3] if len(item) > 3 else 1.0
        axis = item[4] if len(item) > 4 else "xy"
        # every cut but the last sits on the bar grid; the last shot absorbs the tail
        dur = bars * BAR if i < len(plan) - 1 else total - used
        if dur <= 0.2:
            continue
        used += dur
        seg = f"{BUILD}/{name}-{i:02d}.mp4"
        shot(src, dur, seg, motion, size, zoom, axis)
        segs.append(seg)
    lst = f"{BUILD}/{name}.txt"
    with open(lst, "w") as fh:
        fh.write("".join(f"file '{s}'\n" for s in segs))
    silent = f"{BUILD}/{name}-silent.mp4"
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", lst, "-c", "copy", "-t", f"{total:.3f}", silent])

    final = f"{FR}/{name}.mp4"
    # A long tail fade reads as a dead run to the motion gate, so keep it short.
    fade = 0.6
    vf = (f"fade=t=in:st=0:d={fade:.2f},"
          f"fade=t=out:st={total - fade:.2f}:d={fade:.2f},"
          f"format=yuv420p")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", silent, "-i", bed,
         "-vf", vf, "-map", "0:v", "-map", "1:a", "-t", f"{total:.3f}",
         "-af", "loudnorm=I=-14:TP=-1.0:LRA=9",
         "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final])
    print(name, "->", final, os.path.getsize(final) // 1024, "kB")
    return final


F = f"{FR}/tomo-frames"
P = f"{FR}/plates"

# 20 s, cuts on the bar grid. Beats whose travel is gentle (title, tapes,
# manifesto, order) hold one bar — under the gate's 2 s dead-run window — while
# the push/pull beats carry the longer holds. Full-width beats use axis="y" so
# their edge-to-edge content is never cropped horizontally.
plan16 = [
    (f"{P}/title-16x9.png", 1, "out", 1.0, "y"),
    (f"{F}/01-hero.png", 1.5, "out", 1.0),
    (f"{F}/03-boot-crack.png", 1.5, "in", 1.0),
    (f"{F}/05-screens.png", 1, "out", 1.0),
    (f"{F}/06-tapes.png", 1, "in", 1.0, "y"),
    (f"{F}/07-play.png", 1.5, "out", 1.0),
    (f"{F}/09-manifesto.png", 1, "out", 1.0, "y"),
    (f"{F}/10-order.png", 1, "in", 1.0),
    (f"{P}/end-16x9.png", 2, "in", 1.0, "y"),
]

# 15 s, 7 bars + tail on the end card. Vertical cards push too hard at 1.0
# zoom, so the moves are gentler here but the end card still travels.
plan9 = [
    (f"{P}/title-9x16.png", 1, "out", 0.9),
    (f"{F}/v01-hero.png", 1, "out"),
    (f"{F}/v02-boot.png", 2, "in"),
    (f"{F}/v03-play.png", 1, "out"),
    (f"{F}/v05-manifesto.png", 1, "out", 0.6),
    (f"{P}/end-9x16.png", 2, "in", 0.9),
]

if __name__ == "__main__":
    bed16 = f"{FR}/bed20.wav"
    bed9 = f"{FR}/bed15.wav"
    subprocess.run(["bash", "/opt/data/scripts/music-fit.sh",
                    "/opt/data/assets/music/norm/retro-chiptune/retro-chiptune-02-8-bit-love-machine.mp3",
                    "15", bed9, "24"], check=True)
    build("tomo-16x9", (2560, 1440), plan16, bed16, 20.0)
    build("tomo-9x16", (1080, 1920), plan9, bed9, 15.0)