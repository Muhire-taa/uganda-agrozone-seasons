// Minimal stand-in for the dashboard runtime: loads the CSV tables in data/ and
// gives the page the same small `dash` API it was written against.
(function () {
  const SOURCES = {
    season_change: 'data/season_change.csv',
    seasons_by_year: 'data/seasons_by_year.csv',
    rain_calendar_by_decade: 'data/rain_calendar_by_decade.csv',
    yearly: 'data/yearly.csv',
    zones: 'data/zones.csv',
    zones_map: 'data/zones_map.geojson',
  };
  const state = {};
  const listeners = [];
  let params = { zone: 'Eastern lowlands (Teso)' };
  let queued = false;

  function notify() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      listeners.forEach((fn) => {
        try { fn(); } catch (e) { console.error(e); }
      });
    });
  }

  function load(id) {
    if (state[id]) return;
    state[id] = { status: 'loading', data: [], columns: [], meta: [] };
    fetch(SOURCES[id])
      .then((r) => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.text(); })
      .then((text) => {
        if (SOURCES[id].endsWith('.geojson')) {
          state[id] = { status: 'ok', data: JSON.parse(text), columns: [], meta: [] };
          notify();
          return;
        }
        const rows = d3.csvParse(text);
        state[id] = { status: 'ok', data: rows, columns: rows.columns, meta: [] };
        notify();
      })
      .catch((err) => {
        state[id] = { status: 'error', data: [], columns: [], meta: [], message: String(err) };
        notify();
      });
  }

  window.dash = {
    colors: ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)',
             'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'],
    data(id) {
      if (!(id in SOURCES)) return { status: 'missing', data: [], columns: [], meta: [] };
      load(id);
      return state[id];
    },
    onData(fn) { listeners.push(fn); fn(); },
    params() { return Object.assign({}, params); },
    setParams(p) { params = Object.assign({}, params, p); notify(); },
    resetParams() { params = { zone: 'Eastern lowlands (Teso)' }; notify(); },
    setLink(name) { try { history.replaceState(null, '', '#' + name); } catch (e) { /* ignore */ } },
    refresh() {},
  };

  Object.keys(SOURCES).forEach(load);
  let lastWidth = 0;
  window.addEventListener('resize', () => {
    const w = document.documentElement.clientWidth;
    if (Math.abs(w - lastWidth) > 4) { lastWidth = w; notify(); }
  });
  // Redraw when the viewer switches between light and dark mode
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', notify);
})();
