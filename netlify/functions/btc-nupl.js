// Netlify Function: /.netlify/functions/btc-nupl
// Fetches Bitbo NUPL chart page and extracts the latest NUPL + date.

export default async (req, context) => {
  try {
    const url = 'https://charts.bitbo.io/net-unrealized-profit-loss/';
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "referer": "https://charts.bitbo.io/",
        "upgrade-insecure-requests": "1"
      }
    });

    if (!res.ok) {
      return json(502, { error: 'upstream_fetch_failed', status: res.status });
    }

    const html = await res.text();

    const latest = extractLatestNupl(html);
    if (!latest) {
      return json(500, { error: 'parse_failed' });
    }

    // Cache about 1h, with jitter so it doesn't always refresh on the hour.
    const base = 60 * 60;
    const jitter = Math.floor(Math.random() * (10 * 60)); // 0..600 seconds
    const sMaxAge = base + jitter;

    return json(200, {
      date: latest.date,
      nupl: latest.nupl,
      source: url,
      fetchedAt: new Date().toISOString()
    }, {
      'Cache-Control': `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=60`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    });
  } catch (e) {
    return json(500, { error: 'exception', message: String(e) });
  }
};

function json(statusCode, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

function extractBetween(haystack, startNeedle, endNeedle, fromIndex = 0) {
  const start = haystack.indexOf(startNeedle, fromIndex);
  if (start === -1) return null;
  const end = haystack.indexOf(endNeedle, start + startNeedle.length);
  if (end === -1) return null;
  return haystack.slice(start + startNeedle.length, end);
}

function extractLatestNupl(html) {
  // The page contains e.g.
  //   var axis_x = ["2011-01-01", ... , "2026-02-09"];
  //   var nupl = [0.72, ... , 0.2196];
  // We extract the last element from each.

  const axisRaw = extractBetween(html, 'var axis_x = [', '];');
  if (!axisRaw) return null;

  const nuplRaw = extractBetween(html, 'var nupl = [', '];', html.indexOf('var nupl = ['));
  if (!nuplRaw) return null;

  const axisParts = axisRaw.split(',');
  const lastDateRaw = axisParts[axisParts.length - 1]?.trim();
  const date = lastDateRaw?.replace(/^"|"$/g, '');

  const nuplParts = nuplRaw.split(',');
  const lastNuplRaw = nuplParts[nuplParts.length - 1]?.trim();
  const nupl = lastNuplRaw ? Number.parseFloat(lastNuplRaw) : NaN;

  if (!date || !Number.isFinite(nupl)) return null;
  return { date, nupl };
}
