# Raw TCP Socket HTTP Server in PowerShell
# Bypasses Windows HTTP.sys URL reservation restrictions, allowing host bindings like rishik.in
# Attempts to listen on port 80 first, then falls back to port 3000.
# Runs an infinite connection-loop with error-handling per client request to prevent exit crashes.

$ports = @(80, 3000)
$listener = $null
$started = $false
$currentPort = 0

foreach ($port in $ports) {
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
        $listener.Start()
        $started = $true
        $currentPort = $port
        Write-Host "TCP HTTP Server started successfully. Listening on port $currentPort (all interfaces/domains)..."
        break
    } catch {
        Write-Host "Warning: Could not start TCP listener on port $port - $_"
        if ($listener -ne $null) {
            $listener.Stop()
        }
    }
}

if (-not $started) {
    Write-Error "Could not start TCP listener on any of the attempted ports ($($ports -join ', '))."
    exit 1
}

# Serve client requests continuously
while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        
        # Process request inside its own try block so that a single client abort doesn't crash the server
        try {
            $stream = $client.GetStream()
            
            # Read the incoming request header (up to 4KB)
            $buffer = [byte[]]::new(4096)
            $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
            if ($bytesRead -gt 0) {
                $requestText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
                
                # Parse the request line: e.g. "GET /index.html HTTP/1.1"
                $lines = $requestText -split "`r`n"
                if ($lines.Length -gt 0) {
                    $parts = $lines[0] -split " "
                    if ($parts.Length -ge 2) {
                        $method = $parts[0]
                        $urlPath = $parts[1]
                        
                        # Strip any query parameters or hashes
                        $urlPath = ($urlPath -split "\?")[0]
                        $urlPath = ($urlPath -split "#")[0]

                        # Find headers and body separation
                        $reqSplit = $requestText -split "`r`n`r`n"
                        $bodyText = if ($reqSplit.Length -gt 1) { $reqSplit[1] } else { "" }

                        # Handle OPTIONS Preflight Requests for CORS
                        if ($method -eq "OPTIONS") {
                            $header = "HTTP/1.1 200 OK`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: POST, GET, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`nConnection: close`r`n`r`n"
                            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                            $stream.Write($headerBytes, 0, $headerBytes.Length)
                            continue
                        }

                        # Handle API Query Submission
                        if ($method -eq "POST" -and ($urlPath -eq "/api/submit" -or $urlPath -eq "/api/contact")) {
                            try {
                                $data = ConvertFrom-Json $bodyText
                                $name = $data.name
                                $email = $data.email
                                $message = $data.message
                                
                                $leadsFile = Join-Path "c:\Rishik" "leads.json"
                                $leadEntry = [PSCustomObject]@{
                                    name = $name
                                    email = $email
                                    message = $message
                                    timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                                }
                                
                                $existingLeads = @()
                                if (Test-Path $leadsFile) {
                                    $existingLeads = Get-Content $leadsFile | ConvertFrom-Json
                                    if ($existingLeads -eq $null) { $existingLeads = @() }
                                    if ($existingLeads -isnot [System.Array]) {
                                        $existingLeads = @($existingLeads)
                                    }
                                }
                                $existingLeads += $leadEntry
                                $existingLeads | ConvertTo-Json -Depth 5 | Out-File $leadsFile -Encoding UTF8
                                
                                # Return appropriate response matching endpoint URL
                                $respObj = if ($urlPath -eq "/api/contact") { @{ success = $true } } else { @{ status = "success"; message = "Query ingested successfully." } }
                                $respText = ConvertTo-Json $respObj
                                $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respText)
                                $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($respBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Headers: Content-Type`r`nConnection: close`r`n`r`n"
                                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                                $stream.Write($headerBytes, 0, $headerBytes.Length)
                                $stream.Write($respBytes, 0, $respBytes.Length)
                            } catch {
                                $errObj = @{ status = "error"; message = "Invalid JSON payload: $_" }
                                $errText = ConvertTo-Json $errObj
                                $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errText)
                                $header = "HTTP/1.1 400 Bad Request`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($errBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                                $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                                $stream.Write($headerBytes, 0, $headerBytes.Length)
                                $stream.Write($errBytes, 0, $errBytes.Length)
                            }
                            continue
                        }
                        
                        # Default route to index.html
                        if ($urlPath -eq "/" -or $urlPath -eq "") {
                            $urlPath = "/index.html"
                        }
                        
                        # Build and sanitize the file path
                        $cleanPath = $urlPath.Replace("/", "\")
                        $filePath = Join-Path "c:\Rishik" $cleanPath
                        
                        if (Test-Path $filePath -PathType Leaf) {
                            $bytes = [System.IO.File]::ReadAllBytes($filePath)
                            
                            # Set content type based on extension
                            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                            $contentType = switch ($ext) {
                                ".html" { "text/html; charset=utf-8" }
                                ".css"  { "text/css; charset=utf-8" }
                                ".js"   { "text/javascript; charset=utf-8" }
                                ".png"  { "image/png" }
                                ".jpg"  { "image/jpeg" }
                                ".jpeg" { "image/jpeg" }
                                ".webp" { "image/webp" }
                                default { "application/octet-stream" }
                            }
                            
                            # Write HTTP 200 Response
                            $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                            $stream.Write($headerBytes, 0, $headerBytes.Length)
                            $stream.Write($bytes, 0, $bytes.Length)
                        } else {
                            # Write HTTP 404 Response
                            $errText = "404 Not Found: $urlPath"
                            $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errText)
                            $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($errBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                            $stream.Write($headerBytes, 0, $headerBytes.Length)
                            $stream.Write($errBytes, 0, $errBytes.Length)
                        }
                    }
                }
            }
        }
        catch {
            Write-Host "Connection warning (aborted or error processing request): $_"
        }
        finally {
            if ($client -ne $null) {
                $client.Close()
            }
        }
    }
    catch {
        Write-Host "Error accepting new connection: $_"
    }
}
