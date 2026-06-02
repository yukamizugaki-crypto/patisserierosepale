import os
import unicodedata

project_dir = r"c:\Users\Owner\Desktop\HP制作関連\patisserierosepale"
html_files = ["namagashi.html", "petits-gateaux.html", "yakigashi.html", "index.html", "shop.html"]

for filename in html_files:
    filepath = os.path.join(project_dir, filename)
    if os.path.exists(filepath):
        print(f"Normalizing {filename} to NFC...")
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            nfc_content = unicodedata.normalize('NFC', content)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(nfc_content)
            
            print(f"Successfully normalized {filename}")
        except Exception as e:
            print(f"Failed to normalize {filename}: {e}")
