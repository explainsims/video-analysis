// shared.jsx — shared mock components for all four redesign directions.
// MotionVideoMock — synthetic basketball-toss frame w/ tracked dots, vectors, trails.
// MotionGraph — live x/y vs t curves driven by current frame index.
// useTrackingData — produces deterministic basketball-toss motion data.
// All components accept theme tokens so each direction can recolor them.

const TOTAL_FRAMES = 60;
const FPS = 30;

function useTrackingData() {
  // Basketball arc, parabolic. Returns array of {t, x, y, vx, vy} in real units.
  return React.useMemo(() => {
    const out = [];
    const dt = 1 / FPS;
    const v0 = 6.2;     // m/s
    const angle = 62 * Math.PI / 180;
    const g = 9.81;
    const x0 = 0.4, y0 = 0.9;
    const vx0 = v0 * Math.cos(angle);
    const vy0 = v0 * Math.sin(angle);
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const t = i * dt;
      const x = x0 + vx0 * t;
      const y = y0 + vy0 * t - 0.5 * g * t * t;
      const vx = vx0;
      const vy = vy0 - g * t;
      out.push({ t: +t.toFixed(3), x: +x.toFixed(3), y: +y.toFixed(3), vx: +vx.toFixed(3), vy: +vy.toFixed(3) });
    }
    return out;
  }, []);
}

// Map data-space (meters) → svg-space (pixels) for a 16:9 frame.
function makeProjector(width, height) {
  // Data range roughly x: 0..3.5m, y: 0..2.6m.
  const padX = 28, padY = 24;
  const xRange = [-0.1, 3.6];
  const yRange = [-0.1, 2.7];
  const sx = (width - padX * 2) / (xRange[1] - xRange[0]);
  const sy = (height - padY * 2) / (yRange[1] - yRange[0]);
  return (x, y) => ({
    px: padX + (x - xRange[0]) * sx,
    py: height - padY - (y - yRange[0]) * sy,
  });
}

// Synthetic "video frame" — a stylized playground scene with a basketball
// hoop, ground, and a player silhouette. Simple rectangles + paths so it
// reads instantly as "physics video" without being a real photo.
function VideoBackdrop({ width, height, theme }) {
  const t = theme;
  const skyTop = t.video?.skyTop ?? '#cfe7f5';
  const skyBot = t.video?.skyBot ?? '#e9f2f7';
  const ground = t.video?.ground ?? '#3d3a35';
  const wall = t.video?.wall ?? '#cdc4b8';
  const wall2 = t.video?.wall2 ?? '#b9ad9c';
  const post = t.video?.post ?? '#1a1a1a';

  return (
    <g>
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBot} />
        </linearGradient>
        <linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={wall} />
          <stop offset="100%" stopColor={wall2} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#skyG)" />
      {/* distant building */}
      <rect x={width * 0.55} y={height * 0.18} width={width * 0.32} height={height * 0.48} fill="url(#wallG)" />
      {/* windows */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}-${c}`} x={width * 0.58 + c * 26} y={height * 0.24 + r * 28}
                width="14" height="18" fill="rgba(60,55,50,0.35)" />
        ))
      )}
      {/* far trees */}
      <ellipse cx={width * 0.13} cy={height * 0.55} rx="60" ry="28" fill={t.video?.tree ?? '#6e8c5f'} opacity="0.85"/>
      <ellipse cx={width * 0.28} cy={height * 0.6} rx="45" ry="20" fill={t.video?.tree ?? '#6e8c5f'} opacity="0.7"/>
      {/* ground */}
      <rect x="0" y={height * 0.78} width={width} height={height * 0.22} fill={ground} />
      {/* court line */}
      <line x1="0" y1={height * 0.78} x2={width} y2={height * 0.78} stroke={t.video?.line ?? '#e8c862'} strokeWidth="2" />
      {/* basketball hoop pole */}
      <rect x={width * 0.78} y={height * 0.32} width="4" height={height * 0.46} fill={post} />
      <rect x={width * 0.74} y={height * 0.3} width="38" height="22" fill="#fff" stroke={post} strokeWidth="1.5"/>
      <rect x={width * 0.745} y={height * 0.34} width="14" height="10" fill="none" stroke={post} strokeWidth="1.2"/>
      <circle cx={width * 0.755} cy={height * 0.36} r="6" fill="none" stroke="#e8542a" strokeWidth="1.5"/>
      {/* player silhouette */}
      <g transform={`translate(${width * 0.12}, ${height * 0.5})`}>
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="#3a2e22"/>
        <rect x="-14" y="10" width="28" height="42" rx="6" fill="#1f1d1a"/>
        <rect x="-12" y="50" width="10" height="40" fill="#2c4a82"/>
        <rect x="2" y="50" width="10" height="40" fill="#2c4a82"/>
        <rect x="-22" y="14" width="9" height="28" rx="4" fill="#1f1d1a"/>
        <rect x="13" y="10" width="9" height="22" rx="4" fill="#1f1d1a"/>
      </g>
    </g>
  );
}

// Basketball at current frame.
function Basketball({ cx, cy, r = 9 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#d96a2c" stroke="#3a1d0c" strokeWidth="1.2" />
      <path d={`M ${cx - r} ${cy} Q ${cx} ${cy - r * 0.6} ${cx + r} ${cy}`} stroke="#3a1d0c" strokeWidth="0.9" fill="none"/>
      <path d={`M ${cx - r} ${cy} Q ${cx} ${cy + r * 0.6} ${cx + r} ${cy}`} stroke="#3a1d0c" strokeWidth="0.9" fill="none"/>
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#3a1d0c" strokeWidth="0.9"/>
      <ellipse cx={cx - r * 0.3} cy={cy - r * 0.3} rx={r * 0.35} ry={r * 0.18} fill="rgba(255,255,255,0.35)"/>
    </g>
  );
}

// Full video panel (background + overlay). theme controls track color, dots, vectors.
function MotionVideoMock({ width = 640, height = 360, frame, data, showTrails = true, showVectors = true,
                          showCalibration = true, showOrigin = true, theme = {}, onClickPoint, accent = '#3aa9ff' }) {
  const proj = makeProjector(width, height);
  const cur = data[frame];
  const { px, py } = proj(cur.x, cur.y);

  const trail = data.slice(0, frame + 1).map((d) => proj(d.x, d.y));
  const allFuture = data.map((d) => proj(d.x, d.y));

  // Velocity arrow (scaled)
  const vScale = 12;
  const vEnd = { x: px + cur.vx * vScale, y: py - cur.vy * vScale };
  // Acceleration arrow (gravity, mostly vertical down)
  const aScale = 6;
  const aEnd = { x: px, y: py + 9.81 * aScale };

  const originPx = proj(0, 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}
         onClick={onClickPoint}>
      <VideoBackdrop width={width} height={height} theme={theme} />

      {/* Calibration ruler — two-point line at the ground */}
      {showCalibration && (
        <g>
          <line x1={proj(0.5, 0).px} y1={proj(0.5, 0).py - 4} x2={proj(2.5, 0).px} y2={proj(2.5, 0).py - 4}
                stroke="#ffd400" strokeWidth="3" strokeLinecap="round" />
          <circle cx={proj(0.5, 0).px} cy={proj(0.5, 0).py - 4} r="4" fill="#ffd400" stroke="#000" strokeWidth="1" />
          <circle cx={proj(2.5, 0).px} cy={proj(2.5, 0).py - 4} r="4" fill="#ffd400" stroke="#000" strokeWidth="1" />
          <text x={(proj(0.5, 0).px + proj(2.5, 0).px) / 2} y={proj(2.5, 0).py - 12}
                fontSize="11" fontWeight="600" fill="#fff" textAnchor="middle"
                style={{ paintOrder: 'stroke', stroke: '#000', strokeWidth: 3 }}>2.0 m</text>
        </g>
      )}

      {/* Origin / axes */}
      {showOrigin && (
        <g>
          <line x1={originPx.px} y1={originPx.py} x2={originPx.px + 50} y2={originPx.py}
                stroke="#ff5757" strokeWidth="2" markerEnd="url(#arrowR)" />
          <line x1={originPx.px} y1={originPx.py} x2={originPx.px} y2={originPx.py - 50}
                stroke="#4cd964" strokeWidth="2" markerEnd="url(#arrowG)" />
          <circle cx={originPx.px} cy={originPx.py} r="5" fill="#fff" stroke="#000" strokeWidth="1.4" />
          <circle cx={originPx.px} cy={originPx.py} r="2" fill="#000" />
        </g>
      )}

      <defs>
        <marker id="arrowR" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#ff5757"/>
        </marker>
        <marker id="arrowG" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#4cd964"/>
        </marker>
        <marker id="arrowV" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill={accent}/>
        </marker>
        <marker id="arrowA" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#ff8a3d"/>
        </marker>
      </defs>

      {/* Trail dots — past + faded future */}
      {showTrails && allFuture.map((p, i) => (
        <circle key={i} cx={p.px} cy={p.py} r={i === frame ? 0 : 3.2}
                fill={i <= frame ? accent : 'rgba(255,255,255,0.25)'}
                stroke={i <= frame ? '#fff' : 'none'} strokeWidth="1" opacity={i <= frame ? 1 : 0.5} />
      ))}

      {/* Basketball at current frame */}
      <Basketball cx={px} cy={py} r={11} />

      {/* Velocity vector */}
      {showVectors && (
        <g>
          <line x1={px} y1={py} x2={vEnd.x} y2={vEnd.y} stroke={accent} strokeWidth="2.5"
                markerEnd="url(#arrowV)" opacity="0.95"/>
          <text x={vEnd.x + 6} y={vEnd.y + 4} fontSize="10" fontWeight="700" fill={accent}
                style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 2 }}>v</text>
          <line x1={px} y1={py} x2={aEnd.x} y2={aEnd.y} stroke="#ff8a3d" strokeWidth="2.5"
                markerEnd="url(#arrowA)" opacity="0.95"/>
          <text x={aEnd.x + 6} y={aEnd.y - 2} fontSize="10" fontWeight="700" fill="#ff8a3d"
                style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 2 }}>a</text>
        </g>
      )}

      {/* Frame counter HUD */}
      <g transform={`translate(${width - 90}, 14)`}>
        <rect x="0" y="0" width="78" height="22" rx="4" fill="rgba(0,0,0,0.55)"/>
        <text x="8" y="15" fontSize="11" fill="#fff" fontFamily="ui-monospace, Menlo, monospace">
          {String(frame + 1).padStart(3, '0')}/{TOTAL_FRAMES}
        </text>
      </g>
    </svg>
  );
}

// Live multi-trace graph. mode: 'xt' | 'yt' | 'xy' | 'vt'
function MotionGraph({ data, frame, mode = 'xt', theme = {}, height = 200, padding = 36, fitOverlay = false }) {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(400);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const W = w, H = height;
  const ax = padding, ay = 16, aw = W - padding - 12, ah = H - padding - 16;

  // Series for each mode.
  const series = {
    xt: [{ key: 'x', color: theme.gx ?? '#3aa9ff', label: 'x (m)', get: (d) => d.x }],
    yt: [{ key: 'y', color: theme.gy ?? '#ff5fa2', label: 'y (m)', get: (d) => d.y }],
    xy: [{ key: 'pos', color: theme.gx ?? '#3aa9ff', label: 'y vs x', get: (d) => ({ x: d.x, y: d.y }) }],
    vt: [
      { key: 'vx', color: theme.gx ?? '#3aa9ff', label: 'vₓ (m/s)', get: (d) => d.vx },
      { key: 'vy', color: theme.gy ?? '#ff5fa2', label: 'vᵧ (m/s)', get: (d) => d.vy },
    ],
  }[mode];

  const tMin = data[0].t, tMax = data[data.length - 1].t;
  let yMin, yMax, xMin, xMax;
  if (mode === 'xy') {
    xMin = Math.min(...data.map((d) => d.x)); xMax = Math.max(...data.map((d) => d.x));
    yMin = Math.min(...data.map((d) => d.y)); yMax = Math.max(...data.map((d) => d.y));
  } else {
    xMin = tMin; xMax = tMax;
    const all = data.flatMap((d) => series.map((s) => s.get(d)));
    yMin = Math.min(...all); yMax = Math.max(...all);
  }
  const yPad = (yMax - yMin) * 0.12 || 0.2; yMin -= yPad; yMax += yPad;
  const xPad = (xMax - xMin) * 0.05; xMin -= xPad; xMax += xPad;

  const px = (v) => ax + (v - xMin) / (xMax - xMin) * aw;
  const py = (v) => ay + ah - (v - yMin) / (yMax - yMin) * ah;

  const nGrid = 6;
  const xTicks = [...Array(nGrid + 1)].map((_, i) => xMin + (xMax - xMin) * i / nGrid);
  const yTicks = [...Array(5)].map((_, i) => yMin + (yMax - yMin) * i / 4);

  const grid = theme.grid ?? 'rgba(255,255,255,0.08)';
  const axis = theme.axis ?? 'rgba(255,255,255,0.45)';
  const text = theme.gtext ?? 'rgba(255,255,255,0.7)';
  const cursor = theme.cursor ?? '#ffcb29';

  return (
    <div ref={ref} style={{ width: '100%', height: H, position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* grid */}
        {xTicks.map((t, i) => (
          <line key={`x${i}`} x1={px(t)} y1={ay} x2={px(t)} y2={ay + ah} stroke={grid} />
        ))}
        {yTicks.map((t, i) => (
          <line key={`y${i}`} x1={ax} y1={py(t)} x2={ax + aw} y2={py(t)} stroke={grid} />
        ))}
        {/* axes */}
        <line x1={ax} y1={ay + ah} x2={ax + aw} y2={ay + ah} stroke={axis} strokeWidth="1" />
        <line x1={ax} y1={ay} x2={ax} y2={ay + ah} stroke={axis} strokeWidth="1" />
        {/* tick labels */}
        {xTicks.map((t, i) => (
          <text key={`xl${i}`} x={px(t)} y={ay + ah + 14} fontSize="10" fill={text} textAnchor="middle"
                fontFamily="ui-monospace, Menlo, monospace">{t.toFixed(mode === 'xy' ? 1 : 1)}</text>
        ))}
        {yTicks.map((t, i) => (
          <text key={`yl${i}`} x={ax - 6} y={py(t) + 3} fontSize="10" fill={text} textAnchor="end"
                fontFamily="ui-monospace, Menlo, monospace">{t.toFixed(1)}</text>
        ))}

        {/* series */}
        {mode !== 'xy' && series.map((s) => {
          const pts = data.map((d, i) => ({ ...d, _y: s.get(d), _i: i }));
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.t)} ${py(p._y)}`).join(' ');
          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={px(p.t)} cy={py(p._y)} r={i === frame ? 5 : 2.2}
                        fill={i === frame ? '#fff' : s.color}
                        stroke={i === frame ? s.color : 'none'} strokeWidth={i === frame ? 2.5 : 0} />
              ))}
            </g>
          );
        })}
        {mode === 'xy' && (() => {
          const pts = data.map((d) => ({ x: d.x, y: d.y }));
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.x)} ${py(p.y)}`).join(' ');
          return (
            <g>
              <path d={path} fill="none" stroke={series[0].color} strokeWidth="2.2" />
              {pts.map((p, i) => (
                <circle key={i} cx={px(p.x)} cy={py(p.y)} r={i === frame ? 5 : 2.2}
                        fill={i === frame ? '#fff' : series[0].color}
                        stroke={i === frame ? series[0].color : 'none'} strokeWidth={i === frame ? 2.5 : 0} />
              ))}
            </g>
          );
        })()}

        {/* curve fit overlay (quadratic) for x-t / y-t */}
        {fitOverlay && mode !== 'xy' && (() => {
          // simple parabola through endpoints + middle; visually a fit line.
          const s = series[0];
          const ys = data.map((d) => s.get(d));
          const ts = data.map((d) => d.t);
          // fit quadratic via 3-point Lagrange (rough but visually correct).
          const i0 = 0, i1 = Math.floor(data.length / 2), i2 = data.length - 1;
          const t0 = ts[i0], t1 = ts[i1], t2 = ts[i2];
          const y0 = ys[i0], y1 = ys[i1], y2 = ys[i2];
          const fit = (t) => (
            y0 * ((t - t1) * (t - t2)) / ((t0 - t1) * (t0 - t2)) +
            y1 * ((t - t0) * (t - t2)) / ((t1 - t0) * (t1 - t2)) +
            y2 * ((t - t0) * (t - t1)) / ((t2 - t0) * (t2 - t1))
          );
          const N = 60;
          const path = [...Array(N + 1)].map((_, i) => {
            const t = tMin + (tMax - tMin) * i / N;
            return `${i === 0 ? 'M' : 'L'} ${px(t)} ${py(fit(t))}`;
          }).join(' ');
          return <path d={path} stroke="#ffcb29" strokeWidth="1.6" strokeDasharray="5 4" fill="none" opacity="0.85"/>;
        })()}

        {/* time cursor for x-t / y-t / vt */}
        {mode !== 'xy' && (
          <line x1={px(data[frame].t)} y1={ay} x2={px(data[frame].t)} y2={ay + ah}
                stroke={cursor} strokeWidth="1.4" strokeDasharray="3 3" />
        )}
      </svg>
    </div>
  );
}

// Compact data table.
function DataTable({ data, frame, onSelect, theme = {}, columns = ['t', 'x', 'y', 'vx', 'vy'] }) {
  const labels = { t: 't (s)', x: 'x (m)', y: 'y (m)', vx: 'vₓ (m/s)', vy: 'vᵧ (m/s)' };
  const bg = theme.tableBg ?? 'transparent';
  const border = theme.tableBorder ?? 'rgba(255,255,255,0.07)';
  const headBg = theme.tableHead ?? 'rgba(255,255,255,0.04)';
  const text = theme.text ?? '#e6e3dd';
  const muted = theme.muted ?? 'rgba(230,227,221,0.55)';
  const hi = theme.tableHi ?? 'rgba(58,169,255,0.16)';
  const numFont = theme.numberFont ?? 'ui-monospace, "SF Mono", Menlo, monospace';

  return (
    <div style={{ background: bg, height: '100%', overflow: 'auto', fontFamily: numFont, fontVariantNumeric: 'tabular-nums' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, color: text }}>
        <thead style={{ position: 'sticky', top: 0, background: headBg, backdropFilter: 'blur(8px)' }}>
          <tr>
            <th style={{ width: 36, padding: '7px 8px', textAlign: 'right', color: muted, fontWeight: 500, borderBottom: `1px solid ${border}` }}>#</th>
            {columns.map((c) => (
              <th key={c} style={{ padding: '7px 10px', textAlign: 'right', color: muted, fontWeight: 500, borderBottom: `1px solid ${border}` }}>
                {labels[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i} onClick={() => onSelect && onSelect(i)}
                style={{ background: i === frame ? hi : 'transparent', cursor: 'pointer',
                         outline: i === frame ? `1px solid ${theme.tableHiBorder ?? 'rgba(58,169,255,0.5)'}` : 'none' }}>
              <td style={{ padding: '4px 8px', textAlign: 'right', color: muted, borderBottom: `1px solid ${border}` }}>{i + 1}</td>
              {columns.map((c) => (
                <td key={c} style={{ padding: '4px 10px', textAlign: 'right', borderBottom: `1px solid ${border}`, fontVariantNumeric: 'tabular-nums' }}>
                  {d[c].toFixed(3)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Generic transport bar.
function Transport({ frame, setFrame, playing, setPlaying, theme = {} }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: theme.text ?? '#e6e3dd', fontFamily: 'ui-sans-serif, system-ui' }}>
      <button onClick={() => setFrame(0)} style={btnIcon(theme)} title="Start">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2v10M5 7l6 5V2z"/></svg>
      </button>
      <button onClick={() => setFrame(Math.max(0, frame - 1))} style={btnIcon(theme)} title="Prev frame">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M9 2L4 7l5 5z"/></svg>
      </button>
      <button onClick={() => setPlaying(!playing)} style={{ ...btnIcon(theme), width: 36, height: 36, background: theme.accent ?? '#3aa9ff', color: theme.accentText ?? '#0d1014' }} title="Play/Pause">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="2" width="3" height="10"/><rect x="8" y="2" width="3" height="10"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2l9 5-9 5z"/></svg>
        )}
      </button>
      <button onClick={() => setFrame(Math.min(TOTAL_FRAMES - 1, frame + 1))} style={btnIcon(theme)} title="Next frame">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M5 2l5 5-5 5z"/></svg>
      </button>
      <input type="range" min="0" max={TOTAL_FRAMES - 1} value={frame} onChange={(e) => setFrame(Number(e.target.value))}
             style={{ flex: 1, accentColor: theme.accent ?? '#3aa9ff' }} />
      <div style={{ fontFamily: theme.numberFont ?? 'ui-monospace, Menlo, monospace', fontSize: 12, color: theme.muted ?? 'rgba(255,255,255,0.6)', minWidth: 100, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {(frame / FPS).toFixed(3)}s · {String(frame + 1).padStart(3, '0')}/{TOTAL_FRAMES}
      </div>
    </div>
  );
}

function btnIcon(theme) {
  return {
    width: 28, height: 28, borderRadius: 8, border: 'none',
    background: theme.btnBg ?? 'rgba(255,255,255,0.08)',
    color: theme.text ?? '#e6e3dd',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
  };
}

// usePlayback — auto-advance frame on a timer when `playing`.
function usePlayback(frame, setFrame, playing, fps = 12) {
  React.useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1 >= TOTAL_FRAMES ? 0 : f + 1));
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [playing, fps, setFrame]);
}

Object.assign(window, {
  TOTAL_FRAMES, FPS, useTrackingData, MotionVideoMock, MotionGraph, DataTable, Transport, usePlayback, btnIcon,
});
