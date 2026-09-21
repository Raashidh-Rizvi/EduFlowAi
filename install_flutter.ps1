$ErrorActionPreference = "Stop"

Write-Host "Creating C:\src directory..."
if (-not (Test-Path "C:\src")) {
    New-Item -ItemType Directory -Force -Path "C:\src" | Out-Null
}

$zipPath = "C:\src\flutter.zip"
$extractPath = "C:\src"
$flutterBin = "C:\src\flutter\bin"

Write-Host "Downloading Flutter SDK... This might take a few minutes..."
Invoke-WebRequest -Uri "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.24.3-stable.zip" -OutFile $zipPath

Write-Host "Extracting Flutter SDK to C:\src\flutter... This will also take a moment..."
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

Write-Host "Cleaning up downloaded zip file..."
Remove-Item -Path $zipPath -Force

Write-Host "Adding Flutter to User PATH environment variable..."
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$flutterBin*") {
    $newPath = $userPath + ";$flutterBin"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added $flutterBin to User PATH."
} else {
    Write-Host "Flutter is already in User PATH."
}

Write-Host "======================================================"
Write-Host "✅ FLUTTER INSTALLATION COMPLETE!"
Write-Host "======================================================"
Write-Host "Please RESTART VS Code completely for the changes to take effect."
Write-Host "Then, open a new terminal and type: flutter doctor"
