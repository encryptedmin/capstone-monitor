$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$envFile = Join-Path $backend ".env"
$exampleEnv = Join-Path $backend ".env.example"

function Get-BackendSetting([string]$Name, [string]$DefaultValue) {
    $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ($null -ne $processValue -and $processValue.Length -gt 0) {
        return $processValue
    }

    if (Test-Path -LiteralPath $envFile) {
        $pattern = "^\s*$([regex]::Escape($Name))\s*=\s*(.*)$"
        $line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match $pattern } | Select-Object -Last 1
        if ($line -match $pattern) {
            $value = $Matches[1].Trim()
            if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            return $value
        }
    }
    return $DefaultValue
}

function Invoke-CheckedCommand([string]$FilePath, [string[]]$Arguments, [string]$FailureMessage) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $FilePath @Arguments
        $commandExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($commandExitCode -ne 0) {
        throw "$FailureMessage (exit code $commandExitCode)."
    }
}

try {
    if (-not (Test-Path -LiteralPath $envFile)) {
        Copy-Item -LiteralPath $exampleEnv -Destination $envFile
        Write-Host "Created backend/.env from the example. Set DB_PASSWORD there for a successful connection." -ForegroundColor Yellow
    }

    $venvPython = Join-Path $backend "venv\Scripts\python.exe"
    if (-not (Test-Path -LiteralPath $venvPython)) {
        $pythonLauncher = Get-Command py -ErrorAction SilentlyContinue
        if ($pythonLauncher) {
            Invoke-CheckedCommand $pythonLauncher.Source @("-3", "-m", "venv", (Join-Path $backend "venv")) "Could not create the backend Python environment."
        } else {
            $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
            if (-not $pythonCommand) { throw "Python was not found. Install Python 3 and add it to PATH." }
            Invoke-CheckedCommand $pythonCommand.Source @("-m", "venv", (Join-Path $backend "venv")) "Could not create the backend Python environment."
        }
    }
    $python = $venvPython

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $python -c "import django, MySQLdb, dotenv" 2>$null
        $importsExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($importsExitCode -ne 0) {
        Write-Host "Installing backend requirements..."
        Invoke-CheckedCommand $python @("-m", "pip", "install", "-r", (Join-Path $backend "requirements.txt")) "Backend dependency installation failed."
    }

    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCommand) { $npmCommand = Get-Command npm -ErrorAction SilentlyContinue }
    if (-not $npmCommand) { throw "npm was not found. Install Node.js and add npm to PATH." }

    if (-not (Test-Path -LiteralPath (Join-Path $frontend "node_modules\vite\bin\vite.js"))) {
        Write-Host "Installing frontend dependencies..."
        Push-Location $frontend
        try {
            Invoke-CheckedCommand $npmCommand.Source @("ci") "Frontend dependency installation failed."
        } finally {
            Pop-Location
        }
    }

    $dbHost = Get-BackendSetting "DB_HOST" "127.0.0.1"
    $dbPortText = Get-BackendSetting "DB_PORT" "3306"
    $dbPort = 0
    if (-not [int]::TryParse($dbPortText, [ref]$dbPort) -or $dbPort -lt 1 -or $dbPort -gt 65535) {
        throw "DB_PORT must be a TCP port between 1 and 65535."
    }

    if ($dbHost -in @("localhost", "127.0.0.1", "::1")) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $dbPort -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $listener) {
            $mysqlServices = @(Get-CimInstance Win32_Service | Where-Object { $_.Name -match "^(MySQL|MariaDB)" })
            if ($mysqlServices.Count -eq 0) {
                throw "No local MySQL or MariaDB Windows service was found. Install MySQL Server and configure its service first."
            }

            $service = $mysqlServices | Where-Object { $_.State -eq "Stopped" } | Sort-Object Name | Select-Object -First 1
            if (-not $service) { $service = $mysqlServices | Sort-Object Name | Select-Object -First 1 }
            if ($service.State -ne "Running") {
                Write-Host "Starting MySQL service $($service.Name)..."
                Start-Service -Name $service.Name
            } else {
                Write-Host "Waiting for MySQL service $($service.Name) on port $dbPort..."
            }

            $deadline = (Get-Date).AddSeconds(45)
            do {
                Start-Sleep -Seconds 1
                $listener = Get-NetTCPConnection -State Listen -LocalPort $dbPort -ErrorAction SilentlyContinue | Select-Object -First 1
            } while (-not $listener -and (Get-Date) -lt $deadline)
            if (-not $listener) {
                throw "MySQL service did not listen on port $dbPort. Check its my.ini port and backend/.env."
            }
        } else {
            Write-Host "MySQL is already listening on port $dbPort."
        }
    } else {
        Write-Host "Using the configured remote MySQL host $dbHost`:$dbPort."
    }

    foreach ($port in @(8000, 5173)) {
        $occupied = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($occupied) {
            throw "Port $port is already in use (PID $($occupied.OwningProcess)). Stop that process before starting the system."
        }
    }

    Push-Location $backend
    try {
        Write-Host "Ensuring MySQL database exists..."
        Invoke-CheckedCommand $python @("manage.py", "ensure_database") "Could not prepare the MySQL database. Check credentials and database permissions in backend/.env."

        Write-Host "Applying database migrations..."
        Invoke-CheckedCommand $python @("manage.py", "migrate", "--noinput") "Django migrations failed."
    } finally {
        Pop-Location
    }

    Start-Process -FilePath $python -ArgumentList @("manage.py", "runserver", "127.0.0.1:8000") -WorkingDirectory $backend -WindowStyle Normal
    Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", "npm run dev -- --host 127.0.0.1") -WorkingDirectory $frontend -WindowStyle Normal

    Write-Host "Capstone Monitor is starting." -ForegroundColor Green
    Write-Host "Frontend: http://127.0.0.1:5173"
    Write-Host "Backend:  http://127.0.0.1:8000/api/"
} catch {
    Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
