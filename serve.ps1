# Local preview server for the portfolio.
# Run:  powershell -ExecutionPolicy Bypass -File serve.ps1   then open http://localhost:5501/
$root = $PSScriptRoot
$port = 5501
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$port/")
$l.Start()
Write-Host "Serving $root on http://localhost:$port/  (Ctrl+C to stop)"
$types = @{
  ".html"="text/html; charset=utf-8"; ".css"="text/css"; ".js"="text/javascript";
  ".png"="image/png"; ".jpg"="image/jpeg"; ".jpeg"="image/jpeg"; ".svg"="image/svg+xml";
  ".webp"="image/webp"; ".pdf"="application/pdf"; ".woff2"="font/woff2"; ".woff"="font/woff"
}
while ($l.IsListening) {
  $ctx = $l.GetContext()
  $res = $ctx.Response
  try {
    $p = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($p -eq "" -or $p.EndsWith("/")) { $p += "index.html" }
    $f = [IO.Path]::GetFullPath((Join-Path $root $p))
    if ($f.StartsWith($root) -and (Test-Path $f -PathType Leaf)) {
      $b = [IO.File]::ReadAllBytes($f)
      $ext = [IO.Path]::GetExtension($f).ToLower()
      if ($types.ContainsKey($ext)) { $res.ContentType = $types[$ext] }
      $res.Headers.Add("Cache-Control", "no-store")
      $res.ContentLength64 = $b.Length
      if ($ctx.Request.HttpMethod -ne "HEAD") { $res.OutputStream.Write($b, 0, $b.Length) }
    } else { $res.StatusCode = 404 }
  } catch {
    # client disconnected mid-response, etc. — keep serving
  } finally {
    try { $res.Close() } catch { try { $res.Abort() } catch {} }
  }
}
