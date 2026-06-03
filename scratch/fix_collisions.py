import os
import unicodedata
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_dir = r"c:\Users\Owner\Desktop\HP制作関連\patisserierosepale\img"
for f in os.listdir(img_dir):
    nfc_f = unicodedata.normalize('NFC', f)
    if f != nfc_f:
        src = os.path.join(img_dir, f)
        dst = os.path.join(img_dir, nfc_f)
        print(f"Collision check: {f} -> {nfc_f}")
        if os.path.exists(dst):
            print(f"Destination {nfc_f} already exists. Removing source NFD {f}...")
            try:
                os.remove(src)
                print("Successfully removed source NFD.")
            except Exception as e:
                print(f"Failed to remove source: {e}")
        else:
            print(f"Destination does not exist. Renaming...")
            try:
                os.rename(src, dst)
                print("Successfully renamed.")
            except Exception as e:
                print(f"Failed to rename: {e}")
