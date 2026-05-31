# ============================================================
#  NEXUS ERP — run-local.ps1
#  Arranca el backend Spring Boot en local cargando las
#  variables de entorno del fichero .env del mismo directorio.
#
#  Uso: powershell -ExecutionPolicy Bypass -File run-local.ps1
#       (o doble clic en PowerShell desde la carpeta backend)
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  NEXUS ERP — Backend local" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════" -ForegroundColor Cyan

# ── 1. Cargar variables de entorno desde .env ─────────────────
$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] No se encontró el fichero .env en: $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "[ENV] Cargando variables desde .env..." -ForegroundColor Yellow

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    # Ignorar líneas vacías y comentarios
    if ($line -and $line -notmatch '^\s*#') {
        $parts = $line -split '=', 2
        if ($parts.Count -eq 2) {
            $key   = $parts[0].Trim()
            $value = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
            Write-Host "  · $key = $value" -ForegroundColor DarkGray
        }
    }
}

Write-Host "[ENV] Variables cargadas correctamente." -ForegroundColor Green

# ── 2. Verificar que PostgreSQL es accesible ──────────────────
Write-Host "[DB]  Comprobando conexión a PostgreSQL (localhost:5433)..." -ForegroundColor Yellow

$tcpClient = New-Object System.Net.Sockets.TcpClient
$connected = $false
try {
    $tcpClient.Connect("localhost", 5433)
    $connected = $true
} catch {}
finally {
    $tcpClient.Dispose()
}

if (-not $connected) {
    Write-Host "[ERROR] No se puede conectar a localhost:5433." -ForegroundColor Red
    Write-Host "        Asegúrate de que el contenedor 'nexus_db' de Docker está en marcha." -ForegroundColor Red
    Write-Host "        Ejecuta: docker start nexus_db" -ForegroundColor Yellow
    exit 1
}

Write-Host "[DB]  PostgreSQL accesible. OK" -ForegroundColor Green

# ── 3. Limpiar carpeta temporal de sesiones (puede quedar con propietario
#       root si el contenedor Docker del backend estuvo corriendo antes) ──
$tempPattern = Join-Path $env:TEMP "A*"
Get-ChildItem -Path $env:TEMP -Directory -Filter "A*" | Where-Object {
    $_.Name.Length -eq 40  # hash SHA1 que genera Spring Boot
} | ForEach-Object {
    try {
        Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "[TMP] Limpiada carpeta temporal: $($_.Name)" -ForegroundColor DarkGray
    } catch {}
}

# ── 4. Arrancar Spring Boot ───────────────────────────────────
Write-Host ""
Write-Host "[APP] Arrancando Spring Boot..." -ForegroundColor Cyan
Write-Host "      http://localhost:8080/api" -ForegroundColor DarkGray
Write-Host ""

& "$PSScriptRoot\mvnw.cmd" spring-boot:run
