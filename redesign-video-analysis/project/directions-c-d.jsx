// directions-c-d.jsx — Direction C: "Floating Studio" and Direction D: "Focus Mode"

// ─────────────────────────────────────────────────────────────────────────────
// Direction C · Floating Studio — DAW/Figma-style draggable panels on a grid.
// Single video canvas as the workspace, panels float above it.
// ─────────────────────────────────────────────────────────────────────────────
function DirectionC({ density = 'comfortable', showTrails = true, showVectors = true }) {
  const data = useTrackingData();
  const [frame, setFrame] = React.useState(34);
  const [playing, setPlaying] = React.useState(false);
  const [graphMode, setGraphMode] = React.useState('xt');
  usePlayback(frame, setFrame, playing);

  const theme = {
    accent: '#ff7a3d', accentText: '#1a0f08', text: '#ebe7df',
    muted: 'rgba(235,231,223,0.6)',
    grid: 'rgba(235,231,223,0.06)', axis: 'rgba(235,231,223,0.4)',
    gtext: 'rgba(235,231,223,0.7)', cursor: '#ffd166',
    gx: '#ff7a3d', gy: '#69d6ff',
    tableBorder: 'rgba(235,231,223,0.07)', tableHead: 'rgba(255,255,255,0.04)',
    tableHi: 'rgba(255,122,61,0.16)', tableHiBorder: 'rgba(255,122,61,0.5)',
    btnBg: 'rgba(255,255,255,0.07)',
    video: { skyTop: '#23282f', skyBot: '#16191e', ground: '#0e0c0a', wall: '#34332f',
             wall2: '#1f1e1b', tree: '#3d5a47', line: '#e8c862', post: '#0a0a0a' },
  };

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at 30% 20%, #2a2722 0%, #16140f 60%, #0d0c08 100%)',
      color: theme.text, fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Top toolbar — minimal, integrated */}
      <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex',
                    alignItems: 'center', gap: 10, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                      background: 'rgba(20,18,14,0.7)', backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6,
                        background: 'linear-gradient(135deg,#ff7a3d,#e8542a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 12 }}>M</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Motion Studio</div>
          <div style={{ fontSize: 11, color: theme.muted, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.1)',
                        fontFamily: 'ui-monospace,Menlo,monospace' }}>basketball-toss-01</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Tool dock */}
        <div style={{ display: 'flex', gap: 4, padding: 4,
                      background: 'rgba(20,18,14,0.7)', backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
          {[
            ['＋', 'Add', true], ['✎', 'Edit'], ['⇿', 'Scale'], ['⊕', 'Origin'],
            ['↻', 'Rotate'], ['◎', 'Auto'], ['◆', 'Object'],
          ].map(([icon, label, active], i) => (
            <button key={i} title={label} style={{
              width: 32, height: 32, border: 'none', borderRadius: 8, cursor: 'pointer',
              background: active ? 'rgba(255,122,61,0.18)' : 'transparent',
              color: active ? theme.accent : theme.muted, fontSize: 14,
            }}>{icon}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                      background: 'rgba(20,18,14,0.7)', backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11.5 }}>
          <span style={{ color: theme.muted }}>Drive</span>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: '#4cd964' }} />
          <span style={{ color: theme.text, fontWeight: 600 }}>synced</span>
        </div>
        <button style={{
          border: 'none', background: theme.accent, color: theme.accentText,
          padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(255,122,61,0.4)',
        }}>Export ↗</button>
      </div>

      {/* Full-bleed video canvas */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '88%', height: '78%', position: 'relative', borderRadius: 16,
                      overflow: 'hidden', background: '#000',
                      boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 30px 80px rgba(0,0,0,0.5)' }}>
          <MotionVideoMock width={800} height={450} frame={frame} data={data}
            showTrails={showTrails} showVectors={showVectors} theme={theme} accent={theme.accent} />
          {/* Floating object selector inside video */}
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6 }}>
            {['Object A', 'Object B'].map((o, i) => (
              <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 11px', borderRadius: 999,
                                    background: i === 0 ? 'rgba(255,122,61,0.92)' : 'rgba(0,0,0,0.55)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: i === 0 ? '#1a0f08' : theme.text,
                                    fontSize: 11, fontWeight: 700, backdropFilter: 'blur(10px)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 4,
                               background: i === 0 ? '#1a0f08' : '#69d6ff' }} />
                {o}
              </div>
            ))}
          </div>
          {/* Crosshair readout near ball */}
          <div style={{ position: 'absolute', top: 16, right: 16, padding: '8px 12px',
                        background: 'rgba(20,18,14,0.85)', backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                        fontSize: 11, fontFamily: 'ui-monospace,Menlo,monospace' }}>
            <div style={{ color: theme.muted, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, marginBottom: 3 }}>POSITION</div>
            <div style={{ color: theme.accent, fontWeight: 700 }}>x = {data[frame].x.toFixed(3)} m</div>
            <div style={{ color: '#69d6ff', fontWeight: 700 }}>y = {data[frame].y.toFixed(3)} m</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 5, paddingTop: 4, color: theme.muted, fontWeight: 600 }}>
              |v| = {Math.hypot(data[frame].vx, data[frame].vy).toFixed(2)} m/s
            </div>
          </div>
        </div>
      </div>

      {/* Floating Graph panel — top-right */}
      <FloatingPanel title="Graph" subtitle={graphMode === 'xt' ? 'x · t' : graphMode === 'yt' ? 'y · t' : graphMode === 'xy' ? 'y · x' : 'v · t'}
                     style={{ top: 80, right: 28, width: 360 }}>
        <div style={{ display: 'flex', gap: 4, padding: '0 0 8px' }}>
          {[['xt', 'x · t'], ['yt', 'y · t'], ['xy', 'y · x'], ['vt', 'v · t']].map(([k, l]) => (
            <button key={k} onClick={() => setGraphMode(k)} style={{
              flex: 1, border: '1px solid', borderColor: graphMode === k ? theme.accent : 'rgba(255,255,255,0.08)',
              background: graphMode === k ? 'rgba(255,122,61,0.16)' : 'transparent',
              color: graphMode === k ? theme.accent : theme.muted,
              fontSize: 10.5, fontWeight: 700, padding: '4px 0', borderRadius: 6, cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
        <MotionGraph data={data} frame={frame} mode={graphMode} theme={theme} height={180} fitOverlay />
        <div style={{ display: 'flex', gap: 6, marginTop: 8, fontSize: 10, color: theme.muted, fontFamily: 'ui-monospace,Menlo,monospace' }}>
          <span>FIT: y = -4.91t² + 5.47t + 0.90</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: theme.accent, fontWeight: 700 }}>R²=0.999</span>
        </div>
      </FloatingPanel>

      {/* Floating Data table panel — middle-right */}
      <FloatingPanel title="Data" subtitle="60 points" style={{ bottom: 110, right: 28, width: 320, height: 220 }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 6 }}>
          <DataTable data={data.slice(Math.max(0, frame - 4), Math.min(data.length, frame + 8))}
                     frame={Math.min(4, frame)}
                     onSelect={(i) => setFrame(Math.max(0, frame - 4) + i)} theme={theme}
                     columns={['t', 'x', 'y', 'vy']} />
        </div>
      </FloatingPanel>

      {/* Floating Inspector panel — left */}
      <FloatingPanel title="Inspector" subtitle={`Object A · frame ${frame + 1}`}
                     style={{ top: 80, left: 28, width: 240 }}>
        <Inspector data={data} frame={frame} theme={theme} />
      </FloatingPanel>

      {/* Floating Vectors/Overlays panel — left bottom */}
      <FloatingPanel title="Overlays" subtitle="visual" style={{ bottom: 110, left: 28, width: 240 }}>
        <OverlayList theme={theme} showTrails={showTrails} showVectors={showVectors} />
      </FloatingPanel>

      {/* Bottom transport */}
      <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)',
                    width: 'min(900px, 88%)', padding: '10px 16px',
                    background: 'rgba(20,18,14,0.78)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}>
        <Transport frame={frame} setFrame={setFrame} playing={playing} setPlaying={setPlaying} theme={theme} />
      </div>
    </div>
  );
}

function FloatingPanel({ title, subtitle, style, children }) {
  return (
    <div style={{
      position: 'absolute', ...style,
      background: 'rgba(20,18,14,0.78)', backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
      boxShadow: '0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 4, marginRight: 10 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <span key={c} style={{ width: 9, height: 9, borderRadius: 5, background: c, opacity: 0.85 }} />
          ))}
        </div>
        <div style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: 0.3, color: '#ebe7df' }}>{title}</div>
        <div style={{ fontSize: 10.5, color: 'rgba(235,231,223,0.5)', marginLeft: 8 }}>· {subtitle}</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 14, color: 'rgba(235,231,223,0.4)', cursor: 'pointer' }}>⋮</div>
      </div>
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

function Inspector({ data, frame, theme }) {
  const cur = data[frame];
  const speed = Math.hypot(cur.vx, cur.vy);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5 }}>
      {[
        ['Time', `${cur.t.toFixed(3)} s`, theme.muted],
        ['Position x', `${cur.x.toFixed(3)} m`, theme.accent],
        ['Position y', `${cur.y.toFixed(3)} m`, '#69d6ff'],
        ['Velocity vₓ', `${cur.vx.toFixed(2)} m/s`, theme.accent],
        ['Velocity vᵧ', `${cur.vy.toFixed(2)} m/s`, '#69d6ff'],
        ['Speed |v|', `${speed.toFixed(2)} m/s`, '#fff'],
        ['Acceleration', '−9.81 m/s²', '#ffb86b'],
      ].map(([k, v, c]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <span style={{ color: theme.muted }}>{k}</span>
          <span style={{ color: c, fontWeight: 700, fontFamily: 'ui-monospace,Menlo,monospace' }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function OverlayList({ theme, showTrails, showVectors }) {
  const items = [
    ['Trails', showTrails, theme.accent],
    ['Velocity vector', showVectors, '#69d6ff'],
    ['Acceleration vector', showVectors, '#ffb86b'],
    ['Calibration ruler', true, '#ffd400'],
    ['Origin axes', true, '#4cd964'],
    ['Frame counter', true, '#fff'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map(([k, on, c]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', borderRadius: 6,
                              gap: 8, fontSize: 11.5 }}>
          <div style={{ width: 22, height: 12, borderRadius: 999,
                        background: on ? c : 'rgba(255,255,255,0.12)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 1, left: on ? 11 : 1, width: 10, height: 10,
                          borderRadius: 5, background: '#fff' }} />
          </div>
          <span style={{ color: theme.text, flex: 1 }}>{k}</span>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Direction D · Focus Mode — gigantic video, collapsible right inspector,
// bottom dock with tabs (graph, table, fit). Everything else hides.
// ─────────────────────────────────────────────────────────────────────────────
function DirectionD({ density = 'comfortable', showTrails = true, showVectors = true }) {
  const data = useTrackingData();
  const [frame, setFrame] = React.useState(40);
  const [playing, setPlaying] = React.useState(false);
  const [dock, setDock] = React.useState('graph'); // graph | table | fit
  const [graphMode, setGraphMode] = React.useState('xy');
  const [insp, setInsp] = React.useState(true);
  usePlayback(frame, setFrame, playing);

  const theme = {
    accent: '#ffd166', accentText: '#1a1408', text: '#f3efe6',
    muted: 'rgba(243,239,230,0.6)',
    grid: 'rgba(243,239,230,0.07)', axis: 'rgba(243,239,230,0.45)',
    gtext: 'rgba(243,239,230,0.7)', cursor: '#ff85b8',
    gx: '#ffd166', gy: '#ff85b8',
    tableBorder: 'rgba(255,255,255,0.06)', tableHead: 'rgba(255,255,255,0.04)',
    tableHi: 'rgba(255,209,102,0.16)', tableHiBorder: 'rgba(255,209,102,0.55)',
    btnBg: 'rgba(255,255,255,0.08)',
    video: { skyTop: '#1a2030', skyBot: '#0c1118', ground: '#0a0908', wall: '#2e2c28',
             wall2: '#1c1b18', tree: '#34453d', line: '#e8c862', post: '#0a0a0a' },
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#08080b', color: theme.text,
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      display: 'grid',
      gridTemplateColumns: insp ? '1fr 280px' : '1fr 0',
      gridTemplateRows: '40px 1fr auto',
      transition: 'grid-template-columns 0.18s ease',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{ gridColumn: '1 / 3', display: 'flex', alignItems: 'center',
                    padding: '0 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,13,10,0.85)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 5, background: '#ffd166',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1408', fontWeight: 800, fontSize: 11 }}>M</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Motion</div>
          <div style={{ fontSize: 11, color: theme.muted, paddingLeft: 8 }}>basketball-toss</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, fontSize: 11, color: theme.muted }}>
          {['Track', 'Calibrate', 'Analyze', 'Share'].map((m, i) => (
            <span key={m} style={{ padding: '4px 10px', borderRadius: 6,
                                   background: i === 2 ? 'rgba(255,209,102,0.13)' : 'transparent',
                                   color: i === 2 ? theme.accent : theme.muted, fontWeight: 600, cursor: 'pointer' }}>{m}</span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setInsp(!insp)} style={{
          border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
          color: theme.muted, padding: '4px 9px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
        }}>{insp ? 'Hide ›' : '‹ Inspector'}</button>
      </div>

      {/* Hero video */}
      <div style={{ position: 'relative', minHeight: 0, background: '#000', overflow: 'hidden' }}>
        <MotionVideoMock width={960} height={540} frame={frame} data={data}
          showTrails={showTrails} showVectors={showVectors} theme={theme} accent="#ffd166" />

        {/* Floating left tool dock — minimal */}
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: 16,
                      display: 'flex', flexDirection: 'column', gap: 4, padding: 4,
                      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)',
                      borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            ['＋', 'Add', true], ['✎', 'Edit'], ['⇿', 'Scale'],
            ['⊕', 'Origin'], ['↻', 'Rotate'], ['◎', 'Auto'],
          ].map(([icon, label, active], i) => (
            <button key={i} title={label} style={{
              width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer',
              background: active ? 'rgba(255,209,102,0.2)' : 'transparent',
              color: active ? theme.accent : theme.muted, fontSize: 15, fontWeight: 600,
            }}>{icon}</button>
          ))}
        </div>

        {/* Top-right status pill */}
        <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', gap: 8 }}>
          <div style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: 11, fontWeight: 700, color: theme.accent, fontFamily: 'ui-monospace,Menlo,monospace' }}>
            ● REC · 30 fps
          </div>
          <div style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: 11, fontWeight: 600, color: '#fff', fontFamily: 'ui-monospace,Menlo,monospace' }}>
            {data[frame].x.toFixed(2)} · {data[frame].y.toFixed(2)} m
          </div>
        </div>

        {/* Bottom subtle dock chips */}
        <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
                      display: 'flex', gap: 6 }}>
          {['Object A', '+ Object', 'Step ×1'].map((c, i) => (
            <div key={c} style={{ padding: '5px 12px', borderRadius: 999,
                                  background: i === 0 ? 'rgba(255,209,102,0.92)' : 'rgba(0,0,0,0.55)',
                                  color: i === 0 ? '#1a1408' : '#fff',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                  backdropFilter: 'blur(12px)',
                                  fontSize: 11, fontWeight: 700 }}>{c}</div>
          ))}
        </div>
      </div>

      {/* Inspector */}
      <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0c0a07',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: theme.muted, textTransform: 'uppercase' }}>Frame {frame + 1}</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2, fontFamily: 'ui-monospace,Menlo,monospace', color: theme.accent }}>
            {(frame / FPS).toFixed(3)}s
          </div>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
          <Section title="Position">
            <Row label="x" value={`${data[frame].x.toFixed(3)} m`} color={theme.accent} />
            <Row label="y" value={`${data[frame].y.toFixed(3)} m`} color="#ff85b8" />
          </Section>
          <Section title="Velocity">
            <Row label="vₓ" value={`${data[frame].vx.toFixed(3)} m/s`} color={theme.accent} />
            <Row label="vᵧ" value={`${data[frame].vy.toFixed(3)} m/s`} color="#ff85b8" />
            <Row label="|v|" value={`${Math.hypot(data[frame].vx, data[frame].vy).toFixed(3)} m/s`} color="#fff" />
          </Section>
          <Section title="Fit · y(t)">
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                          fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, color: theme.muted, lineHeight: 1.7 }}>
              y = <span style={{ color: theme.accent }}>−4.91</span>t² + <span style={{ color: theme.accent }}>5.47</span>t + <span style={{ color: theme.accent }}>0.90</span>
              <br/>R² = <span style={{ color: '#4cd964', fontWeight: 700 }}>0.9994</span>
            </div>
          </Section>
        </div>
      </div>

      {/* Bottom dock */}
      <div style={{ gridColumn: '1 / 3', borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(15,13,10,0.92)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 36, padding: '0 12px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {[['graph', 'Graph'], ['table', 'Data'], ['fit', 'Fit']].map(([k, l]) => (
              <button key={k} onClick={() => setDock(k)} style={{
                border: 'none', background: dock === k ? 'rgba(255,209,102,0.13)' : 'transparent',
                color: dock === k ? theme.accent : theme.muted, fontSize: 11, fontWeight: 700,
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
          {dock === 'graph' && (
            <div style={{ display: 'flex', gap: 4, marginLeft: 14 }}>
              {[['xt', 'x · t'], ['yt', 'y · t'], ['xy', 'y · x'], ['vt', 'v · t']].map(([k, l]) => (
                <button key={k} onClick={() => setGraphMode(k)} style={{
                  border: 'none', background: graphMode === k ? 'rgba(255,255,255,0.07)' : 'transparent',
                  color: graphMode === k ? theme.text : theme.muted, fontSize: 10.5, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
                }}>{l}</button>
              ))}
            </div>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ padding: '10px 12px' }}>
            <div style={{ width: 'min(560px, 70vw)' }}>
              <Transport frame={frame} setFrame={setFrame} playing={playing} setPlaying={setPlaying} theme={theme} />
            </div>
          </div>
        </div>
        <div style={{ height: 180, minHeight: 0, padding: dock === 'table' ? 0 : '8px 12px' }}>
          {dock === 'graph' && <MotionGraph data={data} frame={frame} mode={graphMode} theme={theme} height={164} fitOverlay />}
          {dock === 'table' && <DataTable data={data} frame={frame} onSelect={setFrame} theme={theme} />}
          {dock === 'fit' && (
            <div style={{ display: 'flex', gap: 12, height: '100%', alignItems: 'stretch' }}>
              <div style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>Linear</div>
                <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, marginTop: 6 }}>vᵧ = −9.81·t + 5.47</div>
                <div style={{ fontSize: 11, color: '#4cd964', marginTop: 8, fontFamily: 'ui-monospace,Menlo,monospace' }}>R² = 0.999</div>
              </div>
              <div style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(255,209,102,0.06)',
                            border: '1px solid rgba(255,209,102,0.25)' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.accent, letterSpacing: 0.5, textTransform: 'uppercase' }}>Quadratic ✓</div>
                <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 13, marginTop: 6 }}>y = −4.91t² + 5.47t + 0.90</div>
                <div style={{ fontSize: 11, color: '#4cd964', marginTop: 8, fontFamily: 'ui-monospace,Menlo,monospace' }}>R² = 0.9994 · g≈9.81 ✓</div>
              </div>
              <div style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>Range</div>
                <div style={{ fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, marginTop: 6, color: theme.muted, lineHeight: 1.7 }}>
                  Frames 1 – 60<br/>Drag handles on the graph<br/>to limit fit window.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.7, color: 'rgba(243,239,230,0.5)',
                    textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  );
}
function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)',
                  fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11.5 }}>
      <span style={{ color: 'rgba(243,239,230,0.55)' }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

Object.assign(window, { DirectionC, DirectionD });
