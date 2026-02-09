Netlify Function endpoint:
  /.netlify/functions/btc-nupl

Returns JSON:
  { date, nupl, source, fetchedAt }

Caching:
  s-maxage ~ 3600..4200s (1h + 0-10 min jitter)

Deploy:
  1) Put these files in a repo.
  2) Connect repo to Netlify.
  3) Build command: (none) or "echo ok"
     Publish directory: (can be empty, e.g. ".")
  4) Ensure Functions directory is set via netlify.toml.

Test:
  curl https://<site>.netlify.app/.netlify/functions/btc-nupl
