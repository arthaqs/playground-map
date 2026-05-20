import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_ZONES } from '../data/zones';
import type { GameZone } from '../data/zones';

function migrateZones(raw: unknown[]): GameZone[] {
  return raw.map((z: any) => ({
    ...z,
    polygons: z.polygons ?? (z.polygon ? [z.polygon] : []),
  }));
}

export function useZones() {
  const [zones, setZones] = useLocalStorage<GameZone[]>('playground-zones', DEFAULT_ZONES);
  const migratedZones = migrateZones(zones as unknown[]) as GameZone[];

  const addZone = useCallback((zone: GameZone) => {
    setZones([...migratedZones, zone]);
  }, [migratedZones, setZones]);

  const removeZone = useCallback((id: string) => {
    setZones(migratedZones.filter(z => z.id !== id));
  }, [migratedZones, setZones]);

  const updateZone = useCallback((id: string, patch: Partial<Omit<GameZone, 'id'>>) => {
    setZones(migratedZones.map(z => z.id === id ? { ...z, ...patch } : z));
  }, [migratedZones, setZones]);

  const resetZones = useCallback(() => {
    setZones(DEFAULT_ZONES);
  }, [setZones]);

  return { zones: migratedZones, addZone, removeZone, updateZone, resetZones };
}
