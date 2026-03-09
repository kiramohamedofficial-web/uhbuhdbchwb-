$files = Get-ChildItem -Recurse -Include "*.tsx","*.ts" -Path "." |
  Where-Object { $_.FullName -notmatch "node_modules|\.next|AppContext" }

foreach ($file in $files) {
  $content = Get-Content $_.FullName -Raw -Encoding UTF8
  if ($content -match "from '(\.\./)+App'") {
    # Count the ../ levels to rebuild correct path
    $newContent = $content
    $newContent = $newContent -replace "from '(\.\./)+App'", {
      $match = $_.Value
      $depth = ([regex]::Matches($match, "\.\./")).Count
      $prefix = "../" * $depth
      "from '${prefix}AppContext'"
    }
    Set-Content $file.FullName $newContent -Encoding UTF8 -NoNewline
    Write-Host "Updated: $($file.Name)"
  }
}
Write-Host "Done!"
