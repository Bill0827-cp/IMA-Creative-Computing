Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Bill\.gemini\antigravity\brain\40a7f720-f80f-4ee4-a6da-2dc130bd2ea4\.user_uploaded\media_1793583070585_e97c9b2e.jpg"
$img = [System.Drawing.Bitmap]::FromFile($srcPath)

# Check Y dividers by averaging pixel lightness across X for each Y
for ($y = 0; $y -lt $img.Height; $y += 2) {
    # Check at x=5
    $c = $img.GetPixel(5, $y)
    # Check if there is horizontal line
    if ($c.R -lt 245 -and $c.G -lt 245) {
        Write-Host "Y = $y has non-white at border: R=$($c.R) G=$($c.G) B=$($c.B)"
    }
}

# Check X dividers at y=100
for ($x = 0; $x -lt $img.Width; $x += 2) {
    $c = $img.GetPixel($x, 100)
    $c2 = $img.GetPixel($x, 5) # header
    # Check vertical dividers between columns
}

$img.Dispose()

