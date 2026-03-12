/* ===== WEATHER ===== */

function openWeather() {
  var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var icons = ['☀️', '⛅', '🌤️', '🌧️', '⛈️', '🌥️', '☀️'];
  var temps = ['75°', '72°', '68°', '63°', '71°', '74°', '77°'];
  var details = [['SUNRISE', '6:42 AM'], ['SUNSET', '7:18 PM'], ['UV INDEX', '5 Moderate'], ['PRESSURE', '30.12 in']];

  mkWin('weather', 'Weather', 400, 480,
    '<div class="wcard">' +
      '<div class="wloc">📍 San Francisco</div>' +
      '<div class="wtemp">72°</div>' +
      '<div class="wcond">Partly Cloudy</div>' +
      '<div class="wdets"><span>💧 45%</span><span>💨 12 mph</span><span>👁️ 10 mi</span><span>🌡️ 70°</span></div>' +
    '</div>' +
    '<div style="padding:10px 16px;font-size:14px;font-weight:700;color:var(--text)">7-Day Forecast</div>' +
    '<div style="display:flex;gap:6px;padding:0 16px">' +
      days.map(function(d, i) {
        return '<div class="fday"><div style="font-size:11px;font-weight:600;color:var(--text2)">' + d + '</div><div style="font-size:22px;margin:4px 0">' + icons[i] + '</div><div style="font-size:13px;font-weight:600;color:var(--text)">' + temps[i] + '</div></div>';
      }).join('') +
    '</div>' +
    '<div style="padding:14px 16px">' +
      '<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:10px">Details</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        details.map(function(d) {
          return '<div style="background:rgba(0,0,0,0.03);padding:12px;border-radius:12px"><div style="font-size:10px;color:var(--text2)">' + d[0] + '</div><div style="font-size:16px;font-weight:600;color:var(--text)">' + d[1] + '</div></div>';
        }).join('') +
      '</div>' +
    '</div>'
  );
}
