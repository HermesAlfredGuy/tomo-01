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


def shot(src, dur, out, motion, size, zoom=1.0):
    """Slow push/pull on a still: a 1.28x supersample, then a frame-evaluated
    scale that changes zoom over time, cropped back to the delivery size.
    (crop's w/h reject a time expression, so the zoom rides on scale.)
    `zoom` scales the move — use <1 on compositions that run to the edge."""
    w, h = size
    sw, sh = int(w * 1.28) // 2 * 2, int(h * 1.28) // 2 * 2
    n = max(2, int(round(dur * 30)))
    # The still is supersampled to OVERSAMPLE x, then a frame-evaluated scale
    # divides by Z before a fixed 1:1 crop. crop's w/h are configured once, so
    # Z must stay inside [1, OVERSAMPLE] and never shrink the frame below the
    # delivery size — hence FULL < OVERSAMPLE with headroom for rounding.
    full, tight = 1.26, 1.13
    mid = (full + tight) / 2
    zoom = max(0.0, min(1.0, zoom))
    full = mid + (full - mid) * zoom
    tight = mid + (tight - mid) * zoom
    z0, z1 = (full, tight) if motion == "in" else (tight, full)
    z = f"({z0}+({z1}-{z0})*min(1,t/{dur:.4f}))"
    pan = int(w * 0.006) * zoom
    cx = f"max(0,min(iw-ow,(iw-ow)/2+{pan}*min(1,t/{dur:.4f})))"
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
        # every cut but the last sits on the bar grid; the last shot absorbs the tail
        dur = bars * BAR if i < len(plan) - 1 else total - used
        if dur <= 0.2:
            continue
        used += dur
        seg = f"{BUILD}/{name}-{i:02d}.mp4"
        shot(src, dur, seg, motion, size, zoom)
        segs.append(seg)
    lst = f"{BUILD}/{name}.txt"
    with open(lst, "w") as fh:
        fh.write("".join(f"file '{s}'\n" for s in segs))
    silent = f"{BUILD}/{name}-silent.mp4"
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0",
         "-i", lst, "-c", "copy", "-t", f"{total:.3f}", silent])

    final = f"{FR}/{name}.mp4"
    fade = max(0.4, total * 0.08)
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

# 20 s. Cuts on the bar grid. `zoom` is dialled down on the shots whose
# content runs to the frame edge (tapes rail, manifesto) so nothing gets cut.
plan16 = [
    (f"{P}/title-16x9.png", 2, "in", 0.7),
    (f"{F}/01-hero.png", 1, "out", 1.0),
    (f"{F}/03-boot-crack.png", 1, "in", 1.0),
    (f"{F}/05-screens.png", 1, "out", 1.0),
    (f"{F}/06-tapes.png", 2, "in", 0.25),
    (f"{F}/07-play.png", 1, "out", 1.0),
    (f"{F}/09-manifesto.png", 1, "in", 0.45),
    (f"{P}/end-16x9.png", 2, "out", 0.7),
]

# 15 s, 7 bars + tail on the end card
plan9 = [
    (f"{P}/title-9x16.png", 1, "in"),
    (f"{F}/v01-hero.png", 1, "out"),
    (f"{F}/v02-boot.png", 2, "in"),
    (f"{F}/v03-play.png", 1, "out"),
    (f"{F}/v05-manifesto.png", 1, "in"),
    (f"{P}/end-9x16.png", 2, "out"),
]

if __name__ == "__main__":
    bed16 = f"{FR}/bed20.wav"
    bed9 = f"{FR}/bed15.wav"
    subprocess.run(["bash", "/opt/data/scripts/music-fit.sh",
                    "/opt/data/assets/music/norm/retro-chiptune/retro-chiptune-02-8-bit-love-machine.mp3",
                    "15", bed9, "24"], check=True)
    build("tomo-16x9", (2560, 1440), plan16, bed16, 20.0)
    build("tomo-9x16", (1080, 1920), plan9, bed9, 15.0)