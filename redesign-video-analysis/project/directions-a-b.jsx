// directions-a-b.jsx — Direction A: "Lab Pro" (dark) and Direction B: "Classroom" (light)

// ─────────────────────────────────────────────────────────────────────────────
// Direction A · Lab Pro — Vernier-inspired dark with left tool rail, big video,
// graph stacked on right, tabbed bottom data dock. Density-aware.
// ─────────────────────────────────────────────────────────────────────────────
function DirectionA({ density = 'comfortable', layout = 'standard', showTrails = true, showVectors = true }) {
  const data = useTrackingData();
  const [frame, setFrame] = React.useState(28);
  const [playing, setPlaying] = React.useState(false);
  const [graphMode, setGraphMode] = React.useState('xt');
  const [tab, setTab] = React.useState('table');
  const [tool, setTool] = React.useState('add');
  usePlayback(frame, setFrame, playing);

  const D = density === 'compact';
  const theme = {
    accent: '#22e6c8', accentText: '#04231d', text: '#e8e6e0',
    muted: 'rgba(232,230,224,0.55)',
    grid: 'rgba(232,230,224,0.07)', axis: 'rgba(232,230,224,0.4)',
    gtext: 'rgba(232,230,224,0.65)', cursor: '#ffd166',
    gx: '#22e6c8', gy: '#ff85b8',
    tableBg: 'transparent', tableBorder: 'rgba(255,255,255,0.06)',
    tableHead: 'rgba(255,255,255,0.04)', tableHi: 'rgba(34,230,200,0.14)',
    tableHiBorder: 'rgba(34,230,200,0.5)', btnBg: 'rgba(255,255,255,0.06)',
    video: { skyTop: '#1c2a36', skyBot: '#0f1a23', ground: '#12100c', wall: '#2c2a26', wall2: '#1d1c19',
             tree: '#2f4a3a', line: '#e8c862', post: '#0a0a0a' },
  };

  const tools = [
    { id: 'add', icon: '＋', label: 'Add' },
    { id: 'edit', icon: '✎', label: 'Edit' },
    { id: 'cal', icon: '⇿', label: 'Scale' },
    { id: 'origin', icon: '⊕', label: 'Origin' },
    { id: 'auto', icon: '◎', label: 'Auto' },
    { id: 'obj', icon: '◆', label: 'Objects' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0c0e11', color: theme.text,
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      display: 'grid', gridTemplateColumns: '52px 1fr', gridTemplateRows: '44px 1fr', overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{ gridColumn: '1 / 3', display: 'flex', alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px',
                    background: 'linear-gradient(180deg,#15171b,#0e1013)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: 'linear-gradient(135deg,#22e6c8,#3aa9ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#04231d', fontWeight: 800, fontSize: 11 }}>M</div>
          <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: 0.2 }}>Motion Lab</div>
          <div style={{ fontSize: 11, color: theme.muted, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>basketball-toss-01.mp4</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6, fontSize: 11.5 }}>
          {['File', 'Tracks', 'Calibrate', 'Analyze', 'Export'].map((m) => (
            <div key={m} style={{ padding: '5px 9px', borderRadius: 6, color: theme.muted, cursor: 'pointer' }}>{m}</div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: theme.muted }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px',
                         borderRadius: 999, background: 'rgba(34,230,200,0.12)', color: theme.accent }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: theme.accent }} /> Tracking · Object A
          </span>
          <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>30 fps</span>
        </div>
      </div>

      {/* Left tool rail */}
      <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0e1013',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10, gap: 4 }}>
        {tools.map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)}
            style={{ width: 40, height: 40, border: 'none', cursor: 'pointer',
                     background: tool === t.id ? 'rgba(34,230,200,0.12)' : 'transparent',
                     color: tool === t.id ? theme.accent : 'rgba(232,230,224,0.55)',
                     borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center',
                     justifyContent: 'center', fontSize: 14, gap: 2,
                     borderLeft: tool === t.id ? `2px solid ${theme.accent}` : '2px solid transparent' }}>
            <div style={{ fontSize: 16 }}>{t.icon}</div>
            <div style={{ fontSize: 8.5, letterSpacing: 0.5, fontWeight: 600 }}>{t.label.toUpperCase()}</div>
          </button>
        ))}
      </div>

      {/* Main workspace */}
      <div style={{ display: 'grid',
                    gridTemplateColumns: layout === 'wide-graph' ? '1fr 1fr' : '1.4fr 1fr',
                    gridTemplateRows: '1fr auto', minHeight: 0 }}>
        {/* Video + transport */}
        <div style={{ background: '#000', position: 'relative', borderRight: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <MotionVideoMock width={640} height={360} frame={frame} data={data}
              showTrails={showTrails} showVectors={showVectors} theme={theme} accent={theme.accent} />
            {/* Floating HUD */}
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
              <div style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(8px)', fontSize: 11, fontFamily: 'ui-monospace,Menlo,monospace',
                            color: theme.text, border: '1px solid rgba(255,255,255,0.08)' }}>
                Object A · {data[frame].x.toFixed(2)}, {data[frame].y.toFixed(2)} m
              </div>
              <div style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(8px)', fontSize: 11, color: theme.muted,
                            border: '1px solid rgba(255,255,255,0.08)' }}>
                |v|={Math.hypot(data[frame].vx, data[frame].vy).toFixed(2)} m/s
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 8 }}>
              <Chip label="Step ×1" theme={theme} />
              <Chip label="Trails" active={showTrails} theme={theme} />
              <Chip label="Vectors" active={showVectors} theme={theme} />
            </div>
          </div>
          <div style={{ padding: D ? '6px 12px' : '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
                        background: '#0e1013' }}>
            <Transport frame={frame} setFrame={setFrame} playing={playing} setPlaying={setPlaying} theme={theme} />
          </div>
        </div>

        {/* Right column · graph + inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: '#0e1013' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 36, padding: '0 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 4 }}>
            {[
              ['xt', 'x · t'], ['yt', 'y · t'], ['xy', 'y · x'], ['vt', 'v · t']
            ].map(([k, l]) => (
              <button key={k} onClick={() => setGraphMode(k)} style={{
                border: 'none', background: graphMode === k ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: graphMode === k ? theme.text : theme.muted,
                fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
              }}>{l}</button>
            ))}
            <div style={{ flex: 1 }} />
            <Chip label="Quadratic fit" theme={theme} active />
            <Chip label="Linear" theme={theme} />
          </div>
          <div style={{ padding: '8px 8px 4px', flex: 1, minHeight: 0 }}>
            <MotionGraph data={data} frame={frame} mode={graphMode} theme={theme}
                         height={D ? 200 : 240} fitOverlay />
          </div>
          {/* analysis stats */}
          <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
            {[
              ['v₀', '6.20 m/s'], ['θ', '62°'], ['a', '−9.81 m/s²'], ['R²', '0.9994'],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ color: theme.muted, fontSize: 9.5, letterSpacing: 0.6, fontWeight: 600 }}>{k.toUpperCase()}</div>
                <div style={{ color: theme.text, fontWeight: 600, fontFamily: 'ui-monospace,Menlo,monospace' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom dock */}
        <div style={{ gridColumn: '1 / 3', borderTop: '1px solid rgba(255,255,255,0.06)',
                      background: '#0a0c0f', display: 'flex', flexDirection: 'column', height: D ? 160 : 200, minHeight: 0 }}>
          <div style={{ display: 'flex', height: 30, alignItems: 'center', padding: '0 8px', gap: 2,
                        borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[['table', 'Data'], ['fit', 'Curve fit'], ['stats', 'Statistics'], ['notes', 'Notes']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                border: 'none', background: tab === k ? 'rgba(34,230,200,0.1)' : 'transparent',
                color: tab === k ? theme.accent : theme.muted, fontSize: 11, fontWeight: 600,
                padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
              }}>{l}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button style={{
              border: 'none', background: theme.accent, color: theme.accentText, fontSize: 11, fontWeight: 700,
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
            }}>Export ↓ CSV</button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {tab === 'table' && <DataTable data={data} frame={frame} onSelect={setFrame} theme={theme} />}
            {tab !== 'table' && (
              <div style={{ padding: 16, color: theme.muted, fontSize: 12, fontStyle: 'italic' }}>
                {tab === 'fit' && 'Drag two markers on the graph to bound the fit region.'}
                {tab === 'stats' && 'Mean, σ, min/max for current data range.'}
                {tab === 'notes' && 'Lab notes and observations.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, active, theme }) {
  return (
    <div style={{
      padding: '4px 9px', borderRadius: 6, fontSize: 10.5, fontWeight: 600,
      background: active ? 'rgba(34,230,200,0.16)' : 'rgba(255,255,255,0.05)',
      color: active ? theme.accent : theme.muted,
      border: `1px solid ${active ? 'rgba(34,230,200,0.35)' : 'rgba(255,255,255,0.07)'}`,
      letterSpacing: 0.3,
    }}>{label}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Direction B · Classroom — bright, friendly, colorful for high-school students.
// Big buttons, generous spacing, strong color coding (Object A blue / B pink).
// ─────────────────────────────────────────────────────────────────────────────
function DirectionB({ density = 'comfortable', showTrails = true, showVectors = true }) {
  const data = useTrackingData();
  const [frame, setFrame] = React.useState(22);
  const [playing, setPlaying] = React.useState(false);
  const [graphMode, setGraphMode] = React.useState('xt');
  const [tool, setTool] = React.useState('add');
  usePlayback(frame, setFrame, playing);

  const theme = {
    accent: '#2563eb', accentText: '#ffffff', text: '#1d2433',
    muted: 'rgba(60,68,90,0.7)',
    grid: 'rgba(60,68,90,0.1)', axis: 'rgba(60,68,90,0.5)',
    gtext: 'rgba(60,68,90,0.75)', cursor: '#f59e0b',
    gx: '#2563eb', gy: '#db2777',
    tableBorder: 'rgba(60,68,90,0.1)', tableHead: 'rgba(248,247,243,0.95)',
    tableHi: 'rgba(37,99,235,0.1)', tableHiBorder: 'rgba(37,99,235,0.4)',
    btnBg: 'rgba(60,68,90,0.08)',
    video: { skyTop: '#cfe7f5', skyBot: '#e9f2f7', ground: '#3d3a35', wall: '#cdc4b8',
             wall2: '#b9ad9c', tree: '#7fa56a', line: '#e8c862', post: '#1a1a1a' },
  };

  const D = density === 'compact';
  const tools = [
    { id: 'import', label: 'Import video', icon: '⬆', color: '#2563eb' },
    { id: 'cal', label: 'Calibrate', icon: '⇿', color: '#0891b2' },
    { id: 'origin', label: 'Set origin', icon: '⊕', color: '#7c3aed' },
    { id: 'add', label: 'Add point', icon: '＋', color: '#16a34a' },
    { id: 'auto', label: 'Auto-track', icon: '◎', color: '#ea580c' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', background: '#f6f4ee', color: theme.text,
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', height: 56, padding: '0 20px',
                    borderBottom: '1px solid rgba(60,68,90,0.08)', background: '#fff', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#2563eb,#db2777)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>M</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.2 }}>Motion Lab</div>
            <div style={{ fontSize: 11, color: theme.muted, marginTop: -2 }}>Project: Basketball toss · Lesson 4</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <PillButton color="#16a34a" onClick={() => {}}>Save</PillButton>
          <PillButton color="#2563eb" onClick={() => {}}>Export to Sheets</PillButton>
        </div>
      </div>

      {/* Action ribbon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
                    background: '#fbf9f4', borderBottom: '1px solid rgba(60,68,90,0.08)' }}>
        {tools.map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              border: `1.5px solid ${tool === t.id ? t.color : 'rgba(60,68,90,0.15)'}`,
              background: tool === t.id ? t.color : '#fff',
              color: tool === t.id ? '#fff' : '#1d2433',
              padding: '8px 14px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              boxShadow: tool === t.id ? `0 1px 0 rgba(0,0,0,0.06), 0 4px 12px ${t.color}33` : '0 1px 0 rgba(0,0,0,0.04)',
            }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                           background: tool === t.id ? 'rgba(255,255,255,0.18)' : `${t.color}1c`, color: tool === t.id ? '#fff' : t.color, fontSize: 13 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
        <div style={{ width: 1, height: 26, background: 'rgba(60,68,90,0.12)', margin: '0 4px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999,
                      background: '#fff', border: '1.5px solid rgba(60,68,90,0.12)' }}>
          <span style={{ fontSize: 12, color: theme.muted, fontWeight: 600 }}>Step</span>
          {['1', '2', '5'].map((s, i) => (
            <span key={s} style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                                   background: i === 0 ? '#1d2433' : 'transparent', color: i === 0 ? '#fff' : theme.muted, cursor: 'pointer' }}>{s}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999,
                      background: '#fff', border: '1.5px solid rgba(60,68,90,0.12)', fontSize: 12, fontWeight: 600 }}>
          <span style={{ color: theme.muted }}>FPS</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>30</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ObjectChip color="#2563eb" label="Object A" active />
          <ObjectChip color="#db2777" label="Object B" />
          <button style={{ border: '1.5px dashed rgba(60,68,90,0.25)', background: 'transparent',
                           color: theme.muted, padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                           cursor: 'pointer' }}>+ object</button>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gridTemplateRows: '1fr auto',
                    flex: 1, minHeight: 0, padding: 16, gap: 16 }}>
        {/* Video card */}
        <div style={{ borderRadius: 14, background: '#fff', overflow: 'hidden',
                      boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 6px 24px rgba(20,23,32,0.06)',
                      border: '1px solid rgba(60,68,90,0.06)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderBottom: '1px solid rgba(60,68,90,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: '#16a34a' }} />
              <div style={{ fontWeight: 600, fontSize: 13 }}>Video tracker</div>
              <div style={{ fontSize: 11, color: theme.muted, padding: '2px 8px', background: 'rgba(60,68,90,0.06)',
                            borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}>3.0 MB · 0:02</div>
            </div>
            <div style={{ display: 'flex', gap: 6, fontSize: 11, color: theme.muted }}>
              <Toggle label="Trails" on={showTrails} />
              <Toggle label="Vectors" on={showVectors} />
              <Toggle label="Grid" on={false} />
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', background: '#000', minHeight: 0 }}>
            <MotionVideoMock width={640} height={360} frame={frame} data={data}
              showTrails={showTrails} showVectors={showVectors} theme={theme} accent="#2563eb" />
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.92)',
                            fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                            color: '#1d2433', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' }}>
                ({data[frame].x.toFixed(2)}, {data[frame].y.toFixed(2)}) m
              </div>
              <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(37,99,235,0.92)',
                            fontSize: 11, fontWeight: 600, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                v = {Math.hypot(data[frame].vx, data[frame].vy).toFixed(2)} m/s
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 10, fontSize: 11, fontWeight: 700,
                          padding: '4px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.55)', color: '#fff',
                          letterSpacing: 0.4 }}>
              CLICK ON BALL TO ADD POINT
            </div>
          </div>
          <div style={{ padding: 12, borderTop: '1px solid rgba(60,68,90,0.07)', background: '#fbf9f4' }}>
            <Transport frame={frame} setFrame={setFrame} playing={playing} setPlaying={setPlaying}
              theme={{ ...theme, btnBg: '#fff', accent: '#2563eb', accentText: '#fff', numberFont: 'inherit' }} />
          </div>
        </div>

        {/* Graph card */}
        <div style={{ borderRadius: 14, background: '#fff', overflow: 'hidden',
                      boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 6px 24px rgba(20,23,32,0.06)',
                      border: '1px solid rgba(60,68,90,0.06)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px',
                        borderBottom: '1px solid rgba(60,68,90,0.07)', gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Graph</div>
            <div style={{ flex: 1 }} />
            {[['xt', 'x vs t'], ['yt', 'y vs t'], ['xy', 'y vs x'], ['vt', 'v vs t']].map(([k, l]) => (
              <button key={k} onClick={() => setGraphMode(k)} style={{
                border: '1.5px solid', borderColor: graphMode === k ? '#1d2433' : 'rgba(60,68,90,0.12)',
                background: graphMode === k ? '#1d2433' : 'transparent',
                color: graphMode === k ? '#fff' : theme.muted, fontSize: 11, fontWeight: 600,
                padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
              }}>{l}</button>
            ))}
          </div>
          <div style={{ padding: '8px 8px 4px', flex: 1 }}>
            <MotionGraph data={data} frame={frame} mode={graphMode} theme={theme}
                         height={D ? 220 : 260} fitOverlay />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid rgba(60,68,90,0.07)',
                        background: '#fbf9f4' }}>
            <Stat label="v₀" value="6.20 m/s" color="#2563eb" />
            <Stat label="θ" value="62°" color="#7c3aed" />
            <Stat label="a" value="−9.81 m/s²" color="#ea580c" />
            <Stat label="R²" value="0.999" color="#16a34a" />
          </div>
        </div>

        {/* Data table — full width below */}
        <div style={{ gridColumn: '1 / 3', borderRadius: 14, background: '#fff',
                      boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 6px 24px rgba(20,23,32,0.06)',
                      border: '1px solid rgba(60,68,90,0.06)', overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', height: D ? 150 : 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 16px',
                        borderBottom: '1px solid rgba(60,68,90,0.07)' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Data table · Object A</div>
            <div style={{ fontSize: 11, color: theme.muted, padding: '2px 8px', background: 'rgba(60,68,90,0.06)',
                          borderRadius: 999, marginLeft: 10, fontVariantNumeric: 'tabular-nums' }}>{data.length} points</div>
            <div style={{ flex: 1 }} />
            <button style={{
              border: '1.5px solid rgba(60,68,90,0.12)', background: '#fff', color: '#1d2433',
              padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            }}>Export CSV</button>
          </div>
          <div style={{ flex: 1, minHeight: 0, background: '#fff' }}>
            <DataTable data={data} frame={frame} onSelect={setFrame}
              theme={{ ...theme, text: '#1d2433', tableBg: '#fff', tableHead: '#fbf9f4',
                       tableBorder: 'rgba(60,68,90,0.06)', tableHi: '#eff4ff', tableHiBorder: '#2563eb',
                       numberFont: 'inherit' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PillButton({ color, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      border: 'none', background: color, color: '#fff', padding: '8px 14px', borderRadius: 999,
      fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: `0 2px 8px ${color}44`,
    }}>{children}</button>
  );
}
function Toggle({ label, on }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999,
                  background: on ? 'rgba(37,99,235,0.1)' : 'rgba(60,68,90,0.06)', fontSize: 11, fontWeight: 600,
                  color: on ? '#2563eb' : 'rgba(60,68,90,0.7)', cursor: 'pointer' }}>
      <div style={{ width: 22, height: 12, borderRadius: 999,
                    background: on ? '#2563eb' : 'rgba(60,68,90,0.25)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 1, left: on ? 11 : 1, width: 10, height: 10, borderRadius: 5, background: '#fff', transition: 'left 0.15s' }} />
      </div>
      {label}
    </div>
  );
}
function ObjectChip({ color, label, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
                  background: active ? `${color}1a` : 'transparent',
                  border: `1.5px solid ${active ? color : 'rgba(60,68,90,0.15)'}`,
                  fontSize: 12, fontWeight: 600, color: active ? color : 'rgba(60,68,90,0.7)', cursor: 'pointer' }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: color, boxShadow: `0 0 0 2px ${color}33` }} />
      {label}
    </div>
  );
}
function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, padding: '6px 10px', borderRadius: 8, background: '#fff',
                  border: '1px solid rgba(60,68,90,0.08)' }}>
      <div style={{ fontSize: 9.5, color, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#1d2433' }}>{value}</div>
    </div>
  );
}

Object.assign(window, { DirectionA, DirectionB });
