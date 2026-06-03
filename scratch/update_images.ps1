$path = ".\yakigashi.html"

# Read file contents using UTF8 encoding
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1. Replace CSS block for placeholder
$cssPattern = '(?s)/\* グレー画像プレースホルダー \*/\s*\.yaki-img-wrap \.img-placeholder \{.*?\}'
$cssReplacement = '/* 焼き菓子画像スタイル */
    .yaki-img {
      width: 100%;
      height: 220px;
      object-fit: cover;
      display: block;
      transition: transform 0.4s ease;
    }
    .yaki-img-wrap.active .yaki-img {
      transform: scale(1.04);
    }'

$content = [regex]::Replace($content, $cssPattern, $cssReplacement)

# Remove after pseudo-element rule
$afterPattern = '(?s)\.yaki-img-wrap \.img-placeholder::after \{.*?\}'
$content = [regex]::Replace($content, $afterPattern, '')

# 2. Replace active zoom
$zoomPattern = '(?s)\.yaki-img-wrap\.active \.img-placeholder \{.*?\}'
$content = [regex]::Replace($content, $zoomPattern, '')

# 3. Replace mobile style
$mobilePattern = '(?s)\.yaki-img-wrap \.img-placeholder \{\s*height:\s*160px;\s*\}'
$mobileReplacement = '.yaki-img {
        height: 160px;
      }'
$content = [regex]::Replace($content, $mobilePattern, $mobileReplacement)

# 4. Replace placeholders with img tags
# Find the image directory dynamically in the current working directory
$yakiImgDir = (Get-ChildItem -Directory | Where-Object { $_.Name -like "*img*" -or $_.Name -like "*焼き菓子*" })[0].FullName
$imgFolderName = (Split-Path $yakiImgDir -Leaf)

$placeholderPattern = '<div class="img-placeholder" role="img" aria-label="([^"]+)"></div>'
$content = [regex]::Replace($content, $placeholderPattern, {
    param($match)
    $label = $match.Groups[1].Value
    
    # Try finding exact match or fullwidth space match
    $exactPath = Join-Path $yakiImgDir "$label.png"
    $filename = "$label.png"
    
    if (-not (Test-Path $exactPath)) {
        # Try replacing halfwidth space with fullwidth space
        $fullwidthLabel = $label.Replace(" ", "　")
        $fullwidthPath = Join-Path $yakiImgDir "$fullwidthLabel.png"
        if (Test-Path $fullwidthPath) {
            $filename = "$fullwidthLabel.png"
        }
    }
    
    return "<img src=`"$imgFolderName/$filename`" alt=`"$label`" class=`"yaki-img`" loading=`"lazy`">"
})

# Write back to file with UTF8 encoding
[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Output "yakigashi.html updated successfully with images!"
