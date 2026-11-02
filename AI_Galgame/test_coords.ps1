Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Bill\.gemini\antigravity\brain\40a7f720-f80f-4ee4-a6da-2dc130bd2ea4\.user_uploaded\media_1793583070585_e97c9b2e.jpg"
$img = [System.Drawing.Bitmap]::FromFile($srcPath)

# Check vertical color profile at x=50, x=100
for ($y = 0; $y -lt $img.Height; $y += 10) {
    $c = $img.GetPixel(10, $y)
    Write-Host "Y=$y R=$($c.R) G=$($c.G) B=$($c.B)"
}

$img.Dispose()

