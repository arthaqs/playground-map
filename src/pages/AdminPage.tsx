import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useZones } from '../hooks/useZones';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { GameZone, Polygon } from '../data/zones';
import { Modal } from '../components/Modal';
import { DEFAULT_MODAL_CFG } from '../components/ZoneInfo';
import type { ModalCfg } from '../components/ZoneInfo';

const IMG_W = 2400;
const IMG_H = 1525;
const CLOSE_THRESHOLD = 50;
const CROP_X = 606;
const CROP_Y = 143;
const CROP_W = 1648;
const CROP_H = 1255;

const COLOR_MAP: Record<string, string> = {
  yellow: '#E8A540',
  purple: '#4A7C59',
};

export const AdminPage: React.FC = () => {
  const { zones, addZone, removeZone, updateZone, resetZones } = useZones();
  const [zoneCfgs, setZoneCfgs] = useLocalStorage<Record<string, ModalCfg>>('zone-modal-cfgs', {});
  const [previewZoneId, setPreviewZoneId] = useState<string | null>(null);
  const [editingCfg, setEditingCfg] = useState<ModalCfg>(DEFAULT_MODAL_CFG);

  useEffect(() => {
    setEditingCfg({ ...DEFAULT_MODAL_CFG, ...(previewZoneId ? (zoneCfgs[previewZoneId] ?? {}) : {}) });
  }, [previewZoneId]); // intentionally excludes zoneCfgs — only re-init when switching zones

  const saveActiveCfg = () => {
    if (!previewZoneId) return;
    setZoneCfgs({ ...zoneCfgs, [previewZoneId]: editingCfg });
  };
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const panStartRef = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null);

  // Polygon editor
  const [zonePolygons, setZonePolygons] = useState<Polygon[]>([]); // finalized polygons for current zone
  const [points, setPoints] = useState<[number, number][]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [nearFirst, setNearFirst] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Form
  const [zoneName, setZoneName] = useState('');
  const [zonePlayers, setZonePlayers] = useState(2);
  const [zoneDescription, setZoneDescription] = useState('');
  const [zoneColor, setZoneColor] = useState<'yellow' | 'purple'>('yellow');

  // Zoom / pan
  const [viewTransform, setViewTransform] = useState({ scale: 1, tx: 0, ty: 0 });
  const { scale, tx, ty } = viewTransform;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setViewTransform(prev => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const newScale = Math.min(8, Math.max(1, prev.scale * factor));
        if (newScale === prev.scale) return prev;
        const ratio = newScale / prev.scale;
        let newTx = mx * (1 - ratio) + prev.tx * ratio;
        let newTy = my * (1 - ratio) + prev.ty * ratio;
        newTx = Math.min(0, Math.max(rect.width * (1 - newScale), newTx));
        newTy = Math.min(0, Math.max(rect.height * (1 - newScale), newTy));
        return { scale: newScale, tx: newTx, ty: newTy };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Edit mode
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  const isEditing = editingZoneId !== null;
  const formEnabled = isEditing || isClosed || zonePolygons.length > 0;
  const fillColor = COLOR_MAP[zoneColor];

  const toSVGCoords = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [Math.round(svgPt.x), Math.round(svgPt.y)];
  }, []);

  const distToFirst = useCallback((x: number, y: number): number => {
    if (points.length === 0) return Infinity;
    const [fx, fy] = points[0];
    return Math.sqrt((x - fx) ** 2 + (y - fy) ** 2);
  }, [points]);

  // --- SVG handlers ---

  const handleSVGMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    didDragRef.current = false;
    panStartRef.current = { cx: e.clientX, cy: e.clientY, tx: viewTransform.tx, ty: viewTransform.ty };
  }, [viewTransform.tx, viewTransform.ty]);

  const handleSVGMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const [x, y] = toSVGCoords(e.clientX, e.clientY);
    if (draggingIdx !== null) {
      didDragRef.current = true;
      setPoints(prev => prev.map((p, i) => i === draggingIdx ? [x, y] : p) as [number, number][]);
      return;
    }
    if (panStartRef.current && scale > 1) {
      const dx = e.clientX - panStartRef.current.cx;
      const dy = e.clientY - panStartRef.current.cy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const newTx = Math.min(0, Math.max(rect.width * (1 - scale), panStartRef.current.tx + dx));
        const newTy = Math.min(0, Math.max(rect.height * (1 - scale), panStartRef.current.ty + dy));
        setViewTransform(prev => ({ ...prev, tx: newTx, ty: newTy }));
      }
      return;
    }
    setMousePos([x, y]);
    setNearFirst(!isClosed && points.length >= 3 && distToFirst(x, y) < CLOSE_THRESHOLD);
  }, [draggingIdx, toSVGCoords, isEditing, points.length, isClosed, distToFirst, scale]);

  const handleSVGMouseUp = useCallback(() => {
    setDraggingIdx(null);
    panStartRef.current = null;
  }, []);

  const handleSVGClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (didDragRef.current) return;
    if (isClosed) return; // closed polygon: edge/point elements handle clicks
    const [x, y] = toSVGCoords(e.clientX, e.clientY);
    if (points.length >= 3 && distToFirst(x, y) < CLOSE_THRESHOLD) {
      setIsClosed(true);
      return;
    }
    setPoints(prev => [...prev, [x, y]]);
  }, [isEditing, isClosed, points.length, toSVGCoords, distToFirst]);

  const insertPointOnEdge = useCallback((edgeIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const [x, y] = toSVGCoords(e.clientX, e.clientY);
    setPoints(prev => {
      const next = [...prev];
      next.splice(edgeIdx + 1, 0, [x, y]);
      return next as [number, number][];
    });
  }, [toSVGCoords]);

  const deletePoint = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPoints(prev => {
      if (prev.length <= 3) return prev;
      return prev.filter((_, i) => i !== idx) as [number, number][];
    });
  }, []);

  // --- Form / editor actions ---

  const resetEditor = useCallback(() => {
    setZonePolygons([]);
    setPoints([]);
    setIsClosed(false);
    setMousePos(null);
    setNearFirst(false);
    setDraggingIdx(null);
    setZoneName('');
    setZonePlayers(2);
    setZoneDescription('');
    setZoneColor('yellow');
    setEditingZoneId(null);
    setViewTransform({ scale: 1, tx: 0, ty: 0 });
  }, []);

  const startEditing = useCallback((zone: GameZone) => {
    setEditingZoneId(zone.id);
    setZoneName(zone.name);
    setZonePlayers(zone.players);
    setZoneDescription(zone.description);
    setZoneColor(zone.color);
    const polys = zone.polygons ?? [];
    setPoints(polys.length > 0 ? [...polys[polys.length - 1].points] : []);
    setZonePolygons(polys.slice(0, -1));
    setIsClosed(true);
    setMousePos(null);
    setNearFirst(false);
    setDraggingIdx(null);
  }, []);

  const addCurrentPolygon = useCallback(() => {
    if (points.length < 3 || !isClosed) return;
    setZonePolygons(prev => [...prev, { points }]);
    setPoints([]);
    setIsClosed(false);
    setNearFirst(false);
    setMousePos(null);
  }, [points, isClosed]);

  const swapActivePolygon = useCallback((idx: number) => {
    const target = zonePolygons[idx];
    if (isClosed && points.length >= 3) {
      setZonePolygons(prev => prev.map((p, i) => i === idx ? { points } : p));
    } else if (points.length === 0) {
      setZonePolygons(prev => prev.filter((_, i) => i !== idx));
    } else {
      return;
    }
    setPoints([...target.points]);
    setIsClosed(true);
    setNearFirst(false);
    setDraggingIdx(null);
  }, [zonePolygons, points, isClosed]);

  const removeZonePolygon = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setZonePolygons(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    const currentValid = points.length >= 3 && (isEditing || isClosed);
    const allPolygons: Polygon[] = [
      ...zonePolygons,
      ...(currentValid ? [{ points }] : []),
    ];
    if (!zoneName || allPolygons.length === 0) return;
    if (isEditing) {
      updateZone(editingZoneId!, {
        name: zoneName,
        players: zonePlayers,
        description: zoneDescription,
        color: zoneColor,
        polygons: allPolygons,
      });
    } else {
      addZone({
        id: `zone-${Date.now()}`,
        name: zoneName,
        players: zonePlayers,
        description: zoneDescription,
        polygons: allPolygons,
        color: zoneColor,
      });
    }
    resetEditor();
  }, [isEditing, editingZoneId, zoneName, zonePlayers, zoneDescription, zoneColor, points, isClosed, zonePolygons, addZone, updateZone, resetEditor]);

  const currentValid = points.length >= 3 && (isEditing || isClosed);
  const totalPolygons = zonePolygons.length + (currentValid ? 1 : 0);
  const canSave = !!zoneName && totalPolygons >= 1;

  const pointsStr = points.map(p => `${p[0]},${p[1]}`).join(' ');
  const previewStr = mousePos && points.length > 0 && !isClosed && !isEditing
    ? [...points, mousePos].map(p => `${p[0]},${p[1]}`).join(' ')
    : null;

  const inputStyle = (enabled: boolean): React.CSSProperties => ({
    display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px',
    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: enabled ? 'var(--text-primary)' : 'var(--text-muted)',
    fontSize: '14px', outline: 'none', opacity: enabled ? 1 : 0.45, fontFamily: 'inherit',
  });

  const btnBase: React.CSSProperties = {
    padding: '5px 12px', backgroundColor: 'transparent', color: 'var(--text-muted)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '12px', cursor: 'pointer',
  };

  const zoomHint = scale > 1 ? ` · Zoom ${scale.toFixed(1)}× (táhni = posun)` : ' · kolečko = zoom';
  const instruction = isEditing
    ? `Táhni body · klik na hranu = přidej bod · pravý klik na bod = smaž bod${zoomHint}`
    : isClosed
      ? zonePolygons.length > 0
        ? `Polygon ${zonePolygons.length + 1} uzavřen. Přidej další nebo ulož.`
        : 'Polygon uzavřen. Vyplň detaily a ulož nebo přidej další polygon.'
      : points.length === 0 && zonePolygons.length > 0
        ? `Kresli polygon ${zonePolygons.length + 1} nebo ulož zónu (${zonePolygons.length} polygon${zonePolygons.length > 1 ? 'y' : ''}).`
        : points.length < 3
          ? `Klikej body polygonu na mapě. Min. 3 body.${zoomHint}`
          : 'Klikni na první bod ✓ pro uzavření.';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: '16px',
        padding: '0 32px', height: '64px', backgroundColor: 'rgba(20,26,22,0.95)',
        borderBottom: '1px solid var(--border)', backdropFilter: 'blur(8px)', flexShrink: 0,
      }}>
        <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>← Zpět</a>
        <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
        <span style={{ fontWeight: 700, letterSpacing: '0.12em', fontSize: '13px', color: 'var(--accent)', textTransform: 'uppercase' }}>
          Editor zón
        </span>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* MAP */}
        <div style={{ flex: 1, padding: '28px 28px 28px 32px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: isEditing ? 'var(--accent)' : nearFirst ? fillColor : 'var(--text-muted)', transition: 'color 0.2s' }}>
            {instruction}
          </p>

          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', width: 'fit-content', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
            <div ref={containerRef} style={{ overflow: 'hidden' }}>
              <svg
                ref={svgRef}
                viewBox={`${CROP_X} ${CROP_Y} ${CROP_W} ${CROP_H}`}
                style={{
                  width: 'min(62vw, 1100px)', display: 'block',
                  transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                  transformOrigin: '0 0',
                  cursor: draggingIdx !== null ? 'grabbing' : scale > 1 ? 'grab' : (isEditing || isClosed) ? 'default' : 'crosshair',
                  userSelect: 'none',
                }}
                onMouseDown={handleSVGMouseDown}
                onMouseMove={handleSVGMouseMove}
                onMouseUp={handleSVGMouseUp}
                onMouseLeave={() => { setMousePos(null); setNearFirst(false); setDraggingIdx(null); panStartRef.current = null; }}
                onClick={handleSVGClick}
              >
                <image href="/hriste1_web.png" x={0} y={0} width={IMG_W} height={IMG_H} />
                {/* Other zones (faded) */}
                {zones.filter(z => z.id !== editingZoneId).map(zone =>
                  (zone.polygons ?? []).map((poly, pi) => (
                    <polygon
                      key={`${zone.id}-${pi}`}
                      points={poly.points.map(p => `${p[0]},${p[1]}`).join(' ')}
                      fill={COLOR_MAP[zone.color] ?? zone.color}
                      fillOpacity={0.12}
                      stroke={COLOR_MAP[zone.color] ?? zone.color}
                      strokeWidth={3}
                      strokeLinejoin="round"
                      style={{ pointerEvents: 'none' }}
                    />
                  ))
                )}

                {/* Current zone's finalized polygons (clickable to swap active) */}
                {zonePolygons.map((poly, pi) => (
                  <g key={`zone-poly-${pi}`}>
                    <polygon
                      points={poly.points.map(p => `${p[0]},${p[1]}`).join(' ')}
                      fill={fillColor}
                      fillOpacity={0.22}
                      stroke={fillColor}
                      strokeWidth={3}
                      strokeDasharray="12 6"
                      strokeLinejoin="round"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); swapActivePolygon(pi); }}
                    />
                    <text
                      x={poly.points.reduce((s, p) => s + p[0], 0) / poly.points.length}
                      y={poly.points.reduce((s, p) => s + p[1], 0) / poly.points.length}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={28} fill={fillColor} fontWeight="bold"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >{pi + 1}</text>
                  </g>
                ))}

                {/* New polygon preview */}
                {!isClosed && previewStr && points.length >= 2 && (
                  <polygon points={previewStr} fill="none" stroke={fillColor} strokeWidth={8} strokeDasharray="24 14" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
                )}

                {/* Current polygon (new or editing) */}
                {points.length >= 3 && (
                  <polygon
                    points={pointsStr}
                    fill={fillColor}
                    fillOpacity={isEditing ? 0.18 : isClosed ? 0.25 : 0.12}
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Edit mode: edge hit areas (insert point on click) */}
                {isEditing && isClosed && points.length >= 2 && points.map((p, i) => {
                  const next = points[(i + 1) % points.length];
                  return (
                    <line
                      key={`edge-${i}`}
                      x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
                      stroke={fillColor}
                      strokeWidth={14 / scale}
                      strokeOpacity={0.25}
                      style={{ cursor: 'crosshair' }}
                      onClick={(e) => insertPointOnEdge(i, e)}
                    />
                  );
                })}

                {/* New polygon mode: points */}
                {!isClosed && points.map((p, i) => {
                  const isFirst = i === 0;
                  const glow = isFirst && nearFirst;
                  return (
                    <g key={i} style={{ pointerEvents: 'none' }}>
                      {glow && <circle cx={p[0]} cy={p[1]} r={55 / scale} fill={fillColor} opacity={0.18} />}
                      <circle cx={p[0]} cy={p[1]} r={(isFirst ? 18 : 12) / scale} fill={isFirst ? fillColor : '#141a16'} stroke={fillColor} strokeWidth={5 / scale} />
                      {isFirst && <text x={p[0]} y={p[1] + 6 / scale} textAnchor="middle" fontSize={17 / scale} fill="#141a16" fontWeight="bold" style={{ userSelect: 'none' }}>✓</text>}
                    </g>
                  );
                })}

                {/* Edit mode: draggable points */}
                {isEditing && isClosed && points.map((p, i) => (
                  <circle
                    key={`pt-${i}`}
                    cx={p[0]} cy={p[1]}
                    r={12 / scale}
                    fill={draggingIdx === i ? fillColor : '#141a16'}
                    stroke={fillColor}
                    strokeWidth={5 / scale}
                    style={{ cursor: draggingIdx === i ? 'grabbing' : 'grab' }}
                    onMouseDown={(e) => { e.stopPropagation(); didDragRef.current = false; setDraggingIdx(i); }}
                    onContextMenu={(e) => deletePoint(i, e)}
                  />
                ))}

                {/* Cursor dot (new polygon mode) */}
                {!isClosed && mousePos && !nearFirst && (
                  <circle cx={mousePos[0]} cy={mousePos[1]} r={8 / scale} fill={fillColor} opacity={0.5} style={{ pointerEvents: 'none' }} />
                )}
              </svg>
            </div>

            {/* Controls bar */}
            <div style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: isEditing ? 'var(--accent)' : 'var(--text-muted)', minWidth: '80px' }}>
                {isEditing ? 'Editace' : ''}{points.length > 0 ? ` · ${points.length} bodů` : ''}{isClosed ? ' · uzavřeno' : ''}{zonePolygons.length > 0 ? ` · ${zonePolygons.length} hotov${zonePolygons.length > 1 ? 'é' : 'ý'}` : ''}
              </span>
              {isClosed && (
                <button onClick={addCurrentPolygon} style={{ ...btnBase, borderColor: fillColor, color: fillColor }}>
                  + Přidat polygon
                </button>
              )}
              {!isClosed && points.length >= 3 && (
                <button onClick={() => setIsClosed(true)} style={{ ...btnBase, backgroundColor: fillColor, color: 'var(--bg-deep)', border: 'none', fontWeight: 600 }}>
                  Uzavřít polygon
                </button>
              )}
              {!isClosed && points.length > 0 && (
                <button onClick={() => setPoints(p => p.slice(0, -1))} style={btnBase}>Zpět</button>
              )}
              <button onClick={resetEditor} style={btnBase}>
                {isEditing ? 'Zrušit editaci' : 'Smazat'}
              </button>
              {scale !== 1 && (
                <button onClick={() => setViewTransform({ scale: 1, tx: 0, ty: 0 })} style={btnBase}>
                  Zoom: {scale.toFixed(1)}× ✕
                </button>
              )}
              {mousePos && !isClosed && !isEditing && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                  {mousePos[0]}, {mousePos[1]}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ width: '300px', flexShrink: 0, borderLeft: '1px solid var(--border)', padding: '28px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: isEditing ? 'var(--accent)' : 'var(--text-muted)', marginBottom: '16px' }}>
              {isEditing ? `Editace — ${zones.find(z => z.id === editingZoneId)?.name}` : 'Nová zóna'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Název
                <input value={zoneName} onChange={e => setZoneName(e.target.value)} disabled={!formEnabled} placeholder="Twister, Nohejbal…" style={inputStyle(formEnabled)} />
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Počet hráčů
                <input type="number" min={1} value={zonePlayers} onChange={e => setZonePlayers(Number(e.target.value))} disabled={!formEnabled} style={inputStyle(formEnabled)} />
              </label>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Popis
                <textarea value={zoneDescription} onChange={e => setZoneDescription(e.target.value)} disabled={!formEnabled} rows={3} placeholder="Krátký popis hry…" style={{ ...inputStyle(formEnabled), resize: 'vertical' }} />
              </label>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Barva</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {(['yellow', 'purple'] as const).map(c => (
                    <button key={c} onClick={() => formEnabled && setZoneColor(c)} style={{
                      flex: 1, padding: '8px',
                      backgroundColor: zoneColor === c ? `${COLOR_MAP[c]}20` : 'transparent',
                      border: `2px solid ${zoneColor === c ? COLOR_MAP[c] : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', cursor: formEnabled ? 'pointer' : 'not-allowed',
                      opacity: formEnabled ? 1 : 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      fontSize: '12px', color: zoneColor === c ? COLOR_MAP[c] : 'var(--text-muted)', transition: 'all 0.15s',
                    }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLOR_MAP[c], display: 'inline-block', flexShrink: 0 }} />
                      {c === 'yellow' ? 'Amber' : 'Zelená'}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSave} disabled={!canSave} style={{
                padding: '10px 16px',
                backgroundColor: canSave ? fillColor : 'transparent',
                color: canSave ? 'var(--bg-deep)' : 'var(--text-muted)',
                border: `1px solid ${canSave ? fillColor : 'var(--border)'}`,
                borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: 600,
                cursor: !canSave ? 'not-allowed' : 'pointer', opacity: !canSave ? 0.45 : 1,
                transition: 'all 0.2s', marginTop: '4px',
              }}>
                {isEditing ? 'Uložit změny' : 'Uložit zónu'}
              </button>
            </div>
          </div>

          {/* Zone list */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Zóny ({zones.length})
              </h2>
              <button onClick={() => { if (window.confirm('Resetovat na výchozí zóny?')) resetZones(); }} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                Reset
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {zones.map(zone => {
                const active = zone.id === editingZoneId;
                const c = COLOR_MAP[zone.color] ?? zone.color;
                return (
                  <div key={zone.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', backgroundColor: active ? `${c}12` : 'var(--bg-surface)',
                    borderRadius: 'var(--radius)', border: `1px solid ${active ? c : 'var(--border)'}`, transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c, flexShrink: 0, display: 'inline-block' }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zone.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{zone.players} hráčů · {(zone.polygons ?? []).length} polygon{(zone.polygons ?? []).length !== 1 ? 'y' : ''}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button onClick={() => setPreviewZoneId(zone.id)} title="Náhled modalu"
                        style={{ background: 'none', border: 'none', color: previewZoneId === zone.id ? c : 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', lineHeight: 1, transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = c)}
                        onMouseLeave={e => (e.currentTarget.style.color = previewZoneId === zone.id ? c : 'var(--text-muted)')}
                      >👁</button>
                      <button onClick={() => startEditing(zone)} title="Upravit"
                        style={{ background: 'none', border: 'none', color: active ? c : 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', lineHeight: 1, transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = c)}
                        onMouseLeave={e => (e.currentTarget.style.color = active ? c : 'var(--text-muted)')}
                      >✎</button>
                      <button onClick={() => { if (active) resetEditor(); removeZone(zone.id); }} title="Smazat"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '2px 6px', lineHeight: 1, transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#e55')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >×</button>
                    </div>
                  </div>
                );
              })}
              {zones.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Žádné zóny</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Modal preview */}
      <Modal
        zone={zones.find(z => z.id === previewZoneId) ?? null}
        isOpen={previewZoneId !== null}
        onClose={() => setPreviewZoneId(null)}
        modalCfg={editingCfg}
      />

      {/* Modal config panel */}
      <div style={{ position: 'fixed', bottom: '16px', right: '16px', backgroundColor: '#1e2b22', border: '1px solid #4A7C59', borderRadius: '8px', padding: '16px', width: '250px', zIndex: 1001, fontSize: '12px', color: '#F0EDE8', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
        <p style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: previewZoneId ? '#E8A540' : '#8A9E91', margin: '0 0 12px' }}>
          {previewZoneId ? (zones.find(z => z.id === previewZoneId)?.name ?? 'Modal cfg') : 'Modal cfg — vyber zónu 👁'}
        </p>
        {([
          ['bgOpacity', 'BG opacity', 0, 1, 0.01],
          ['blurDivisor', 'Blur (nižší = více)', 3, 30, 0.5],
          ['blurRatioY', 'Blur tvar Y (1=kruh)', 0.2, 4, 0.05],
          ['strokeSmoothing', 'Stroke zaoblení', 0, 1, 0.05],
          ['strokeOpacity', 'Stroke opacity', 0, 1, 0.01],
          ['strokeWidthDiv', 'Stroke tloušťka', 40, 300, 5],
        ] as [keyof ModalCfg, string, number, number, number][]).map(([key, label, min, max, step]) => (
          <div key={key} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ color: '#8A9E91' }}>{label}</span>
              <span style={{ color: '#E8A540', fontFamily: 'monospace' }}>{editingCfg[key as keyof ModalCfg]}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={editingCfg[key as keyof ModalCfg] as number}
              onChange={e => setEditingCfg(c => ({ ...c, [key]: Number(e.target.value) }))}
              disabled={!previewZoneId}
              style={{ width: '100%', accentColor: '#E8A540', opacity: previewZoneId ? 1 : 0.4 }} />
          </div>
        ))}
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#8A9E91' }}>Stroke barva</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#E8A540', fontFamily: 'monospace', fontSize: '11px' }}>{editingCfg.strokeColor}</span>
            <button onClick={() => setEditingCfg(c => ({ ...c, strokeColor: 'auto' }))} style={{ fontSize: '10px', padding: '2px 6px', background: editingCfg.strokeColor === 'auto' ? '#4A7C59' : 'transparent', color: '#8A9E91', border: '1px solid #4A7C59', borderRadius: '3px', cursor: 'pointer' }}>
              auto
            </button>
            <input type="color" value={editingCfg.strokeColor === 'auto' ? '#E8A540' : editingCfg.strokeColor}
              onChange={e => setEditingCfg(c => ({ ...c, strokeColor: e.target.value }))}
              disabled={!previewZoneId}
              style={{ width: '28px', height: '22px', border: 'none', borderRadius: '3px', cursor: 'pointer', padding: 0, backgroundColor: 'transparent', opacity: previewZoneId ? 1 : 0.4 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setEditingCfg(DEFAULT_MODAL_CFG)} disabled={!previewZoneId}
            style={{ flex: 1, padding: '7px', backgroundColor: 'transparent', color: '#8A9E91', border: '1px solid #8A9E91', borderRadius: '4px', fontWeight: 600, cursor: previewZoneId ? 'pointer' : 'not-allowed', fontSize: '12px', opacity: previewZoneId ? 1 : 0.4 }}>
            Výchozí
          </button>
          <button onClick={saveActiveCfg} disabled={!previewZoneId}
            style={{ flex: 2, padding: '7px', backgroundColor: previewZoneId ? '#E8A540' : '#333', color: '#141a16', border: 'none', borderRadius: '4px', fontWeight: 700, cursor: previewZoneId ? 'pointer' : 'not-allowed', fontSize: '12px' }}>
            Uložit
          </button>
        </div>
      </div>
    </div>
  );
};
