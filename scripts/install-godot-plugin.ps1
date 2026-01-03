# install-godot-plugin.ps1
# PowerShell script to download and install GDAI MCP Plugin

$ErrorActionPreference = "Stop"

Write-Host "📦 Installing GDAI MCP Plugin for Godot..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$addonsDir = Join-Path $projectRoot "road-to-war\addons"
$pluginDir = Join-Path $addonsDir "gdai-mcp-plugin-godot"
$zipFile = Join-Path $addonsDir "gdai-mcp-plugin.zip"

# Create addons directory
if (-not (Test-Path $addonsDir)) {
    New-Item -ItemType Directory -Path $addonsDir -Force | Out-Null
    Write-Host "✅ Created addons directory" -ForegroundColor Green
} else {
    Write-Host "✅ Addons directory exists" -ForegroundColor Green
}

# Check if plugin already exists
if (Test-Path $pluginDir) {
    Write-Host "⚠️  Plugin already installed at: $pluginDir" -ForegroundColor Yellow
    Write-Host "   Delete this directory to reinstall" -ForegroundColor Yellow
    exit 0
}

# Download plugin
Write-Host ""
Write-Host "📥 Downloading plugin..." -ForegroundColor Cyan
$pluginUrl = "https://github.com/delanolourenco/gdai-mcp-plugin-godot/releases/latest/download/gdai-mcp-plugin-godot.zip"

try {
    Write-Host "   URL: $pluginUrl" -ForegroundColor Gray
    Invoke-WebRequest -Uri $pluginUrl -OutFile $zipFile -UseBasicParsing
    Write-Host "✅ Download complete" -ForegroundColor Green
    
    # Extract ZIP
    Write-Host ""
    Write-Host "📂 Extracting plugin..." -ForegroundColor Cyan
    
    if (Test-Path $zipFile) {
        # Use Expand-Archive (PowerShell 5.0+)
        Expand-Archive -Path $zipFile -DestinationPath $addonsDir -Force
        
        # Check if extraction created the plugin directory
        if (Test-Path $pluginDir) {
            Write-Host "✅ Plugin extracted successfully" -ForegroundColor Green
        } else {
            # Sometimes the zip contains a folder, check for it
            $extractedFolders = Get-ChildItem -Path $addonsDir -Directory | Where-Object { $_.Name -like "*mcp*" -or $_.Name -like "*gdai*" }
            if ($extractedFolders.Count -eq 1) {
                $extractedPath = $extractedFolders[0].FullName
                Move-Item -Path $extractedPath -Destination $pluginDir -Force
                Write-Host "✅ Plugin installed to: $pluginDir" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Extraction completed, but plugin structure unclear" -ForegroundColor Yellow
                Write-Host "   Please check: $addonsDir" -ForegroundColor Yellow
            }
        }
        
        # Clean up ZIP file
        Remove-Item $zipFile -Force
        Write-Host "✅ Cleaned up temporary files" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "✅ Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Open Godot Editor" -ForegroundColor White
    Write-Host "   2. Open project: road-to-war/project.godot" -ForegroundColor White
    Write-Host "   3. Go to: Project -> Project Settings -> Plugins" -ForegroundColor White
    Write-Host "   4. Find 'GDAI MCP' and enable it" -ForegroundColor White
    Write-Host "   5. Check bottom panel for 'GDAI MCP' tab" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Manual Installation:" -ForegroundColor Yellow
    Write-Host "   1. Visit: https://gdaimcp.com" -ForegroundColor White
    Write-Host "   2. Download the plugin ZIP file" -ForegroundColor White
    Write-Host "   3. Extract to: $pluginDir" -ForegroundColor White
    Write-Host "   4. Enable in Godot: Project -> Project Settings -> Plugins" -ForegroundColor White
    exit 1
}

