import os
import unicodedata
import sys

sys.stdout.reconfigure(encoding='utf-8')

img_dir = r"c:\Users\Owner\Desktop\HP制作関連\patisserierosepale\img"
renamed_count = 0

for f in os.listdir(img_dir):
    nfc_f = unicodedata.normalize('NFC', f)
    if f != nfc_f:
        src = os.path.join(img_dir, f)
        dst = os.path.join(img_dir, nfc_f)
        tmp = src + ".tmp"
        try:
            # Step 1: Rename to temporary name
            os.rename(src, tmp)
            # Step 2: Rename from temporary to NFC
            os.rename(tmp, dst)
            print(f"Renamed: {f} -> {nfc_f}")
            renamed_count += 1
        except Exception as e:
            print(f"Failed to rename {f}: {e}")

print(f"Total renamed: {renamed_count}")
