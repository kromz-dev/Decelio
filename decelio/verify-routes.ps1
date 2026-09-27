$BASE="http://localhost:3000"
$routes = @("/", "/dashboard", "/pricing", "/faq", "/sitemap.xml", "/robots.txt", "/api/health")
foreach ($route in $routes) {
  $status = (Invoke-WebRequest -Uri ($BASE + $route) -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue).StatusCode
  if ($status -eq $null) {
    $status = (Invoke-WebRequest -Uri ($BASE + $route) -UseBasicParsing -MaximumRedirection 0 -ErrorAction Ignore).StatusCode
  }
  Write-Host "$status $BASE$route"
}
