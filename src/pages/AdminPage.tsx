import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useZones } from '../hooks/useZones';
import { useSyncedStorage } from '../hooks/useSyncedStorage';
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
  yellow: '#6dd2f3',
  purple: '#6dd2f3',
};

type WizardStep = 'idle' | 'draw';

export const AdminPage: React.FC = () => {
  const { zones, addZone, removeZone, updateZone, resetZones } = useZones();
  const [zoneCfgs, setZoneCfgs] = useSyncedStorage<Record<string, ModalCfg>>('zone-modal-cfgs', {});
  const [previewZoneId, setPreviewZoneId] = useState<string | null>(null);
  const [editingCfg, setEditingCfg] = useState<ModalCfg>(DEFAULT_MODAL_CFG);

  useEffect(() => {
    setEditingCfg({ ...DEFAULT_MODAL_CFG, ...(previewZoneId ? (zoneCfgs[previewZoneId] ?? {}) : {}) });
  }, [previewZoneId]);

  const saveActiveCfg = () => {
    if (!previewZoneId) return;
    setZoneCfgs({ ...zoneCfgs, [previewZoneId]: editingCfg });
  };

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const panStartRef = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null);

  // Polygon editor
  const [zonePolygons, setZonePolygons] = useState<Polygon[]>([]);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [nearFirst, setNearFirst] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Form
  const [zoneName, setZoneName] = useState('');
  const [zonePlayers, setZonePlayers] = useState('2');
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

  // Wizard + edit mode
  const [wizardStep, setWizardStep] = useState<WizardStep>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [adminHoveredId, setAdminHoveredId] = useState<string | null>(null);
  const [adminSelectedId, setAdminSelectedId] = useState<string | null>(null);
  const zoneListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const isEditing = editingZoneId !== null;

  useEffect(() => {
    if (adminSelectedId && zoneListRefs.current[adminSelectedId]) {
      zoneListRefs.current[adminSelectedId]!.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [adminSelectedId]);
  const drawingActive = wizardStep === 'draw' || isEditing;
  const fillColor = COLOR_MAP[zoneColor];

  const toSVGCoords = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [Math.round(svgPt.x), Math.round(svgPt.y)];
  }, []);

  const distToFirst = useCallback((x: number, y: number): number => {
    if (points.length === 0) return Infinity;
    const [fx, fy] = points[0];
    return Math.sqrt((x - fx) ** 2 + (y - fy) ** 2);
  }, [points]);

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
  }, [draggingIdx, toSVGCoords, points.length, isClosed, distToFirst, scale]);

  const handleSVGMouseUp = useCallback(() => {
    setDraggingIdx(null);
    panStartRef.current = null;
  }, []);

  const handleSVGClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (didDragRef.current) return;
    if (!drawingActive) return;
    if (isClosed) return;
    const [x, y] = toSVGCoords(e.clientX, e.clientY);
    if (points.length >= 3 && distToFirst(x, y) < CLOSE_THRESHOLD) {
      setIsClosed(true);
      return;
    }
    setPoints(prev => [...prev, [x, y]]);
  }, [drawingActive, isClosed, points.length, toSVGCoords, distToFirst]);

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

  const resetEditor = useCallback(() => {
    setZonePolygons([]);
    setPoints([]);
    setIsClosed(false);
    setMousePos(null);
    setNearFirst(false);
    setDraggingIdx(null);
    setZoneName('');
    setZonePlayers('2');
    setZoneDescription('');
    setZoneColor('yellow');
    setEditingZoneId(null);
    setWizardStep('idle');
    setViewTransform({ scale: 1, tx: 0, ty: 0 });
  }, []);

  const startEditing = useCallback((zone: GameZone) => {
    setEditingZoneId(zone.id);
    setZoneName(zone.name);
    setZonePlayers(String(zone.players));
    setZoneDescription(zone.description);
    setZoneColor(zone.color);
    const polys = zone.polygons ?? [];
    setPoints(polys.length > 0 ? [...polys[polys.length - 1].points] : []);
    setZonePolygons(polys.slice(0, -1));
    setIsClosed(true);
    setMousePos(null);
    setNearFirst(false);
    setDraggingIdx(null);
    setWizardStep('draw');
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

  const handleSave = useCallback(() => {
    const currentValid = points.length >= 3 && (isEditing || isClosed);
    const allPolygons: Polygon[] = [
      ...zonePolygons,
      ...(currentValid ? [{ points }] : []),
    ];
    if (!zoneName || allPolygons.length === 0) return;
    if (isEditing) {
      updateZone(editingZoneId!, { name: zoneName, players: zonePlayers === '0' ? 0 : zonePlayers, description: zoneDescription, color: zoneColor, polygons: allPolygons });
    } else {
      addZone({ id: `zone-${Date.now()}`, name: zoneName, players: zonePlayers === '0' ? 0 : zonePlayers, description: zoneDescription, polygons: allPolygons, color: zoneColor });
    }
    resetEditor();
  }, [isEditing, editingZoneId, zoneName, zonePlayers, zoneDescription, zoneColor, points, isClosed, zonePolygons, addZone, updateZone, resetEditor]);

  const currentValid = points.length >= 3 && (isEditing || isClosed);
  const totalPolygons = zonePolygons.length + (currentValid ? 1 : 0);
  const canSave = !!zoneName && totalPolygons >= 1;

  const pointsStr = points.map(p => `${p[0]},${p[1]}`).join(' ');

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
    ? `Táhni body · klik na hranu = přidej bod · pravý klik = smaž bod${zoomHint}`
    : isClosed
      ? zonePolygons.length > 0
        ? `Polygon ${zonePolygons.length + 1} uzavřen. Přidej další nebo ulož.`
        : 'Oblast uzavřena. Ulož nebo přidej další polygon.'
      : points.length < 3
        ? `Klikej body oblasti na mapě. Min. 3 body.${zoomHint}`
        : 'Klikni na první bod ✓ pro uzavření.';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-deep)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', gap: '16px',
        padding: '0 32px', height: '64px', backgroundColor: 'rgba(20,26,22,0.95)',
        borderBottom: '1px solid var(--border)', backdropFilter: 'blur(8px)', flexShrink: 0,
      }}>
        <a href="#" onClick={resetEditor} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>← Zpět</a>
        <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
        <span style={{ fontWeight: 700, letterSpacing: '0.12em', fontSize: '13px', color: 'var(--accent)', textTransform: 'uppercase' }}>
          Editor zón
        </span>
        {wizardStep !== 'idle' && (
          <>
            <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {isEditing ? `Editace: ${zones.find(z => z.id === editingZoneId)?.name}` : 'Nová hra'}
            </span>
          </>
        )}
        <button
          onClick={() => setShowSettings(v => !v)}
          style={{ marginLeft: 'auto', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: showSettings ? 'var(--accent)' : 'var(--text-muted)', fontSize: '16px', cursor: 'pointer', padding: '4px 10px', lineHeight: 1 }}
          title="Nastavení"
        >⚙</button>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* MAP */}
        <div style={{ flex: 1, padding: '28px 28px 28px 32px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {drawingActive && (
            <p style={{ fontSize: '13px', color: isEditing ? 'var(--accent)' : nearFirst ? fillColor : 'var(--text-muted)', transition: 'color 0.2s' }}>
              {instruction}
            </p>
          )}

          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', width: 'fit-content', boxShadow: '0 16px 40px rgba(0,0,0,0.4)' }}>
            <div ref={containerRef} style={{ overflow: 'hidden' }}>
              <svg
                ref={svgRef}
                viewBox={`${CROP_X} ${CROP_Y} ${CROP_W} ${CROP_H}`}
                style={{
                  width: 'min(62vw, 1100px)', display: 'block',
                  transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                  transformOrigin: '0 0',
                  cursor: draggingIdx !== null ? 'grabbing' : scale > 1 ? 'grab' : drawingActive && !isClosed ? 'crosshair' : 'default',
                  userSelect: 'none',
                }}
                onMouseDown={handleSVGMouseDown}
                onMouseMove={handleSVGMouseMove}
                onMouseUp={handleSVGMouseUp}
                onMouseLeave={() => { setMousePos(null); setNearFirst(false); setDraggingIdx(null); panStartRef.current = null; }}
                onClick={handleSVGClick}
              >
                <image href="/hriste1_web.png" x={0} y={0} width={IMG_W} height={IMG_H} />

                {/* Other zones */}
                {zones.filter(z => z.id !== editingZoneId).map(zone => {
                  const c = COLOR_MAP[zone.color] ?? zone.color;
                  const isHov = adminHoveredId === zone.id;
                  const isSel = adminSelectedId === zone.id;
                  const active = isHov || isSel;
                  return (zone.polygons ?? []).map((poly, pi) => (
                    <polygon
                      key={`${zone.id}-${pi}`}
                      points={poly.points.map(p => `${p[0]},${p[1]}`).join(' ')}
                      fill={c}
                      fillOpacity={active ? 0.45 : 0.12}
                      stroke={c}
                      strokeWidth={active ? 4 : 2}
                      strokeOpacity={active ? 1 : 0.4}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      style={{ cursor: drawingActive ? 'default' : 'pointer', transition: 'fill-opacity 0.15s, stroke-opacity 0.15s', pointerEvents: drawingActive ? 'none' : 'all' }}
                      onMouseEnter={() => !drawingActive && setAdminHoveredId(zone.id)}
                      onMouseLeave={() => !drawingActive && setAdminHoveredId(null)}
                      onClick={() => { if (!drawingActive) { setAdminSelectedId(zone.id); setPreviewZoneId(id => id === zone.id ? null : zone.id); } }}
                    />
                  ));
                })}

                {/* Current zone's finalized polygons */}
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
                      vectorEffect="non-scaling-stroke"
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

                {/* Polyline — placed points in order */}
                {!isClosed && points.length >= 2 && (
                  <polyline points={pointsStr} fill="none" stroke={fillColor} strokeWidth={6} strokeOpacity={0.8} strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
                )}
                {/* Next edge preview */}
                {!isClosed && mousePos && points.length >= 1 && (
                  <line
                    x1={points[points.length - 1][0]} y1={points[points.length - 1][1]}
                    x2={mousePos[0]} y2={mousePos[1]}
                    stroke={fillColor} strokeWidth={4} strokeDasharray="16 8" strokeOpacity={0.6}
                    vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }}
                  />
                )}
                {/* Close-preview */}
                {!isClosed && nearFirst && points.length >= 3 && (
                  <line
                    x1={points[points.length - 1][0]} y1={points[points.length - 1][1]}
                    x2={points[0][0]} y2={points[0][1]}
                    stroke={fillColor} strokeWidth={5} strokeDasharray="12 6" strokeOpacity={0.9}
                    vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Current polygon fill */}
                {points.length >= 3 && (
                  <polygon
                    points={pointsStr}
                    fill={fillColor}
                    fillOpacity={isEditing ? 0.18 : isClosed ? 0.25 : 0.12}
                    strokeLinejoin="round"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Edit mode: edge hit areas */}
                {isEditing && isClosed && points.length >= 2 && points.map((p, i) => {
                  const next = points[(i + 1) % points.length];
                  return (
                    <line key={`edge-${i}`} x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
                      stroke={fillColor} strokeWidth={14 / scale} strokeOpacity={0.25}
                      style={{ cursor: 'crosshair' }}
                      onClick={(e) => insertPointOnEdge(i, e)}
                    />
                  );
                })}

                {/* Numbered points (new polygon mode) */}
                {!isClosed && points.map((p, i) => {
                  const isFirst = i === 0;
                  const isLast = i === points.length - 1;
                  const glow = isFirst && nearFirst;
                  return (
                    <g key={i} style={{ pointerEvents: 'none' }}>
                      {glow && <circle cx={p[0]} cy={p[1]} r={55 / scale} fill={fillColor} opacity={0.22} />}
                      <circle cx={p[0]} cy={p[1]} r={(isFirst ? 18 : 14) / scale}
                        fill={isFirst ? fillColor : isLast ? fillColor : '#141a16'}
                        fillOpacity={isFirst ? 1 : isLast ? 0.3 : 1}
                        stroke={fillColor} strokeWidth={5 / scale} />
                      {isFirst
                        ? <text x={p[0]} y={p[1] + 6 / scale} textAnchor="middle" fontSize={16 / scale} fill="#141a16" fontWeight="bold" style={{ userSelect: 'none' }}>✓</text>
                        : <text x={p[0]} y={p[1] + 5 / scale} textAnchor="middle" fontSize={13 / scale} fill={fillColor} fontWeight="bold" style={{ userSelect: 'none' }}>{i + 1}</text>
                      }
                    </g>
                  );
                })}

                {/* Edit mode: draggable points */}
                {isEditing && isClosed && points.map((p, i) => (
                  <circle key={`pt-${i}`} cx={p[0]} cy={p[1]} r={12 / scale}
                    fill={draggingIdx === i ? fillColor : '#141a16'}
                    stroke={fillColor} strokeWidth={5 / scale}
                    style={{ cursor: draggingIdx === i ? 'grabbing' : 'grab' }}
                    onMouseDown={(e) => { e.stopPropagation(); didDragRef.current = false; setDraggingIdx(i); }}
                    onContextMenu={(e) => deletePoint(i, e)}
                  />
                ))}

                {/* Cursor dot */}
                {drawingActive && !isClosed && mousePos && !nearFirst && (
                  <circle cx={mousePos[0]} cy={mousePos[1]} r={8 / scale} fill={fillColor} opacity={0.5} style={{ pointerEvents: 'none' }} />
                )}
              </svg>
            </div>

            {/* Controls bar — only when drawing */}
            {drawingActive && (
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
                    Uzavřít oblast
                  </button>
                )}
                {!isClosed && points.length > 0 && (
                  <button onClick={() => setPoints(p => p.slice(0, -1))} style={btnBase}>Zpět</button>
                )}
                {scale !== 1 && (
                  <button onClick={() => setViewTransform({ scale: 1, tx: 0, ty: 0 })} style={btnBase}>
                    Zoom: {scale.toFixed(1)}× ✕
                  </button>
                )}
                {mousePos && !isClosed && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                    {mousePos[0]}, {mousePos[1]}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{ width: '300px', flexShrink: 0, borderLeft: '1px solid var(--border)', padding: '28px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* === IDLE === */}
          {wizardStep === 'idle' && !isEditing && (
            <>
              <button
                onClick={() => setWizardStep('draw')}
                style={{
                  width: '100%', padding: '14px 16px',
                  backgroundColor: 'var(--accent)', color: 'var(--bg-deep)',
                  border: 'none', borderRadius: '8px', fontSize: '15px',
                  fontWeight: 700, cursor: 'pointer', letterSpacing: '0.01em',
                }}
              >
                + Přidat novou hru
              </button>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Hry ({zones.length})
                  </h2>
                  <button onClick={() => { if (window.confirm('Resetovat na výchozí?')) resetZones(); }} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Reset
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {zones.map(zone => {
                    const c = COLOR_MAP[zone.color] ?? zone.color;
                    const isSelected = adminSelectedId === zone.id;
                    const isHovered = adminHoveredId === zone.id;
                    return (
                      <div
                        key={zone.id}
                        ref={el => { zoneListRefs.current[zone.id] = el; }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px',
                          backgroundColor: isSelected ? `rgba(109,210,243,0.12)` : isHovered ? `rgba(109,210,243,0.06)` : 'var(--bg-surface)',
                          borderRadius: 'var(--radius)',
                          border: `1px solid ${isSelected ? c : isHovered ? `rgba(109,210,243,0.3)` : 'var(--border)'}`,
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: c, flexShrink: 0, display: 'inline-block' }} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{zone.name}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{zone.players === 0 || zone.players === '0' ? '∞' : zone.players} hráčů · {(zone.polygons ?? []).length} polygon{(zone.polygons ?? []).length !== 1 ? 'y' : ''}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button onClick={() => setPreviewZoneId(zone.id)} title="Náhled"
                            style={{ background: 'none', border: 'none', color: previewZoneId === zone.id ? c : 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
                          >👁</button>
                          <button onClick={() => startEditing(zone)} title="Upravit"
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
                          >✎</button>
                          <button onClick={() => removeZone(zone.id)} title="Smazat"
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '2px 6px' }}
                          >×</button>
                        </div>
                      </div>
                    );
                  })}
                  {zones.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Žádné hry</p>}
                </div>
              </div>
            </>
          )}

          {/* === DRAW (new or edit) === */}
          {wizardStep === 'draw' && (
            <>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: isEditing ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {isEditing ? `Editace: ${zones.find(z => z.id === editingZoneId)?.name}` : 'Nová hra'}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Název *
                  <input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="Twister, Skákačka…" style={inputStyle(true)} autoFocus={!isEditing} />
                </label>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Počet hráčů
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <input
                      value={zonePlayers}
                      onChange={e => setZonePlayers(e.target.value)}
                      placeholder="4 nebo 2-6 nebo 0=∞"
                      style={{ ...inputStyle(true), marginTop: 0, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setZonePlayers('0')}
                      title="Neomezeno"
                      style={{
                        padding: '8px 10px', backgroundColor: zonePlayers === '0' ? 'rgba(109,210,243,0.15)' : 'var(--bg-surface)',
                        border: `1px solid ${zonePlayers === '0' ? '#6dd2f3' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)', color: zonePlayers === '0' ? '#6dd2f3' : 'var(--text-muted)',
                        fontSize: '15px', cursor: 'pointer', lineHeight: 1, flexShrink: 0,
                      }}
                    >∞</button>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.7 }}>
                    Celé číslo, rozsah (1-4), nebo ∞ = neomezeno
                  </p>
                </label>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Popis
                  <textarea value={zoneDescription} onChange={e => setZoneDescription(e.target.value)} rows={3} placeholder="Krátký popis hry…" style={{ ...inputStyle(true), resize: 'vertical' }} />
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  style={{
                    padding: '12px 16px', backgroundColor: canSave ? fillColor : 'transparent',
                    color: canSave ? 'var(--bg-deep)' : 'var(--text-muted)',
                    border: `1px solid ${canSave ? fillColor : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: 700,
                    cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5,
                  }}
                >
                  {isEditing ? 'Uložit změny' : 'Uložit hru'}
                </button>
                <button onClick={resetEditor} style={btnBase}>{isEditing ? 'Zrušit editaci' : 'Zrušit'}</button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        zone={zones.find(z => z.id === previewZoneId) ?? null}
        isOpen={previewZoneId !== null}
        onClose={() => setPreviewZoneId(null)}
        modalCfg={editingCfg}
        onEdit={() => {
          const zone = zones.find(z => z.id === previewZoneId);
          if (zone) { setPreviewZoneId(null); startEditing(zone); }
        }}
      />

      {/* Settings drawer */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)' }} />
      )}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: '300px',
        backgroundColor: '#1e2b22',
        borderLeft: '1px solid #4A7C59',
        padding: '24px 20px',
        overflowY: 'auto',
        transform: showSettings ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        fontSize: '12px', color: '#F0EDE8',
        boxShadow: showSettings ? '-8px 0 32px rgba(0,0,0,0.5)' : 'none',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#E8A540' }}>Nastavení</span>
          <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#8A9E91', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: previewZoneId ? '#E8A540' : '#8A9E91', margin: '0 0 12px' }}>
          {previewZoneId ? (zones.find(z => z.id === previewZoneId)?.name ?? 'Modal cfg') : 'Modal cfg — vyber zónu 👁'}
        </p>
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
