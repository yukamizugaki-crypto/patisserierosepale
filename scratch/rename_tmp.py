import os

img_dir = r"c:\Users\Owner\Desktop\HP制作関連\patisserierosepale\img"
for f in os.listdir(img_dir):
    if f.endswith(".tmp"):
        src = os.path.join(img_dir, f)
        dst = os.path.join(img_dir, f[:-4])
        print(f"Renaming tmp file: {f} -> {f[:-4]}")
        try:
            if os.path.exists(dst):
                os.remove(dst)
            os.rename(src, dst)
            print("Success")
        except Exception as e:
            print(f"Failed: {e}")
