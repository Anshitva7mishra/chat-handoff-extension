# scripts/build-zip.ps1
# Builds the browser-only distribution zip into dist/.
# Run with: npm run build:zip
# The zip is ready to upload to the Edge Add-ons store or attach to a GitHub Release.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root    = (Get-Item $PSScriptRoot).Parent.FullName
$version = (Get-Content "$root\manifest.json" | ConvertFrom-Json).version
$dest    = "$root\dist\chat-handoff-v$version.zip"

New-Item -ItemType Directory -Force -Path "$root\dist" | Out-Null
if (Test-Path $dest) { Remove-Item $dest -Force }

$files = @(
  "manifest.json",
  "icons\icon16.png", "icons\icon48.png", "icons\icon128.png",
  "background\service-worker.js", "background\handoff-orchestrator.js",
  "storage\storage-schema.js",
  "shared\format-conversation.js", "shared\default-lead-in.js", "shared\build-handoff-message.js",
  "content-scripts\dom-utils.js",
  "content-scripts\claude\scraper.js",    "content-scripts\claude\injector.js",
  "content-scripts\chatgpt\scraper.js",   "content-scripts\chatgpt\injector.js",
  "content-scripts\gemini\scraper.js",    "content-scripts\gemini\injector.js",
  "content-scripts\perplexity\scraper.js","content-scripts\perplexity\injector.js",
  "content-scripts\mistral\scraper.js",   "content-scripts\mistral\injector.js",
  "content-scripts\copilot\scraper.js",   "content-scripts\copilot\injector.js",
  "content-scripts\deepseek\scraper.js",  "content-scripts\deepseek\injector.js",
  "popup\popup.html", "popup\popup.css", "popup\popup.js",
  "popup\components\PickTarget.js", "popup\components\PreviewEditor.js", "popup\components\TemplatePicker.js",
  "options\options.html", "options\options.css", "options\options.js"
)

$zip = [System.IO.Compression.ZipFile]::Open($dest, 'Create')
foreach ($rel in $files) {
  $full = Join-Path $root $rel
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
    $zip, $full, $rel, [System.IO.Compression.CompressionLevel]::Optimal
  ) | Out-Null
}
$zip.Dispose()

$sizekb = [math]::Round((Get-Item $dest).Length / 1KB, 1)
Write-Host "Built dist\chat-handoff-v$version.zip ($sizekb KB)"
