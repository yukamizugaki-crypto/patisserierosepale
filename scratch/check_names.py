import os
import sys

img_dir = r"c:\Users\Owner\Desktop\HP制作関連\patisserierosepale\img"
for f in os.listdir(img_dir):
    if ".png" in f or ".webp" in f:
        hex_repr = " ".join([f"U+{ord(c):04X}" for c in f])
        print(f"{f} = {hex_repr}")
