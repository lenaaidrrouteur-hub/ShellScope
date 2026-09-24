export const windowsCollectorScript = `
$ErrorActionPreference = 'Stop'
function Tool([string]$Id, [string]$Name, [string]$Command) {
  $resolved = @(Get-Command $Command -All -ErrorAction SilentlyContinue)
  $seen = @{}
  $candidates = @()
  foreach ($item in $resolved) {
    $path = if ($item.Path) { $item.Path } elseif ($item.Source) { $item.Source } else { $item.Definition }
    if (-not $path) { continue }
    $key = $path.ToLowerInvariant()
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    $version = $null
    $runtimeVersion = $null
    $runtimeCompatible = $null
    if (Test-Path -LiteralPath $path -PathType Leaf) {
      $version = (Get-Item -LiteralPath $path).VersionInfo.ProductVersion
      if ($version) { $version = $version.ToString() }
    }
    if (-not $version -or $Id -in @('wsl', 'codex', 'python', 'uv')) {
      try {
        $versionOutput = @(& $path --version 2>&1 | Select-Object -First 1)
        if ($versionOutput.Count -gt 0) {
          $version = ($versionOutput[0].ToString() -replace [char]0, '').Trim()
        }
      } catch {
        $version = $null
      }
    }
    if ($Id -eq 'npm') {
      try {
        $runtimeJson = (& $path --versions --json 2>$null | Out-String)
        $runtimeData = $runtimeJson | ConvertFrom-Json
        if ($runtimeData.node) {
          $runtimeVersion = $runtimeData.node.ToString()
          $runtimeCompatible = $true
        }
        $runtimeWarning = (& $path --version 2>&1 | Out-String)
        if ($runtimeWarning -match 'does not support Node[.]js') {
          $runtimeCompatible = $false
        }
      } catch {
        $runtimeVersion = $null
        $runtimeCompatible = $null
      }
    }
    $candidates += @{
      path = $path
      version = $version
      kind = $item.CommandType.ToString()
      precedence = $candidates.Count + 1
      runtimeVersion = $runtimeVersion
      runtimeCompatible = $runtimeCompatible
    }
  }
  if ($candidates.Count -eq 0) {
    return @{ id=$Id; name=$Name; available=$false; executable=$null; version=$null; candidates=@() }
  }
  $active = $candidates[0]
  return @{
    id=$Id
    name=$Name
    available=$true
    executable=$active.path
    version=$active.version
    candidates=@($candidates)
  }
}
function ValueOrEmpty($Value) { if ($null -eq $Value) { return '' }; return $Value }
function WslDistributionNames {
  try {
    return @(& wsl.exe --list --quiet 2>$null | ForEach-Object { ($_.ToString() -replace [char]0, '').Trim() } | Where-Object { $_ })
  } catch {
    return @()
  }
}
$shells = @(
  (Tool 'pwsh' 'PowerShell 7' 'pwsh'),
  (Tool 'powershell' 'Windows PowerShell' 'powershell'),
  (Tool 'cmd' 'Invite de commandes' 'cmd'),
  (Tool 'git' 'Git' 'git'),
  (Tool 'wsl' 'WSL' 'wsl'),
  (Tool 'codex' 'Codex CLI' 'codex'),
  (Tool 'node' 'Node.js' 'node'),
  (Tool 'npm' 'npm' 'npm'),
  (Tool 'bun' 'Bun' 'bun'),
  (Tool 'python' 'Python' 'python'),
  (Tool 'uv' 'uv' 'uv'),
  (Tool 'docker' 'Docker' 'docker'),
  (Tool 'dotnet' '.NET SDK' 'dotnet'),
  (Tool 'go' 'Go' 'go'),
  (Tool 'rustc' 'Rust' 'rustc'),
  (Tool 'cargo' 'Cargo' 'cargo')
)
@{
  scannedAt = [DateTime]::UtcNow.ToString('o')
  computerName = $env:COMPUTERNAME
  os = [System.Environment]::OSVersion.VersionString
  architecture = $env:PROCESSOR_ARCHITECTURE
  homeDirectory = $env:USERPROFILE
  userPath = ValueOrEmpty ([Environment]::GetEnvironmentVariable('Path', 'User'))
  machinePath = ValueOrEmpty ([Environment]::GetEnvironmentVariable('Path', 'Machine'))
  processPath = ValueOrEmpty $env:Path
  pathExt = ValueOrEmpty $env:PATHEXT
  shells = $shells
  wslDistributionNames = @(WslDistributionNames)
} | ConvertTo-Json -Depth 5 -Compress
`;
