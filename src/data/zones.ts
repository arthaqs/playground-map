export interface Polygon {
  points: [number, number][];
}

export interface GameZone {
  id: string;
  name: string;
  players: number;
  description: string;
  polygon: Polygon;
  color: 'yellow' | 'purple';
}

// Polygon coordinates are in natural image space (2400x1525).
export const ZONES: GameZone[] = [
  {
    id: 'zone-twister',
    name: 'Twister',
    players: 4,
    description: 'Klasická hra Twister na hřišti! Barevná kolečka v řadách – dej ruku na oranžovou, nohu na modrou a nespadni!',
    polygon: {
      points: [[1424,199],[1546,199],[1623,283],[1635,443],[1623,628],[1546,731],[1424,731],[1347,628],[1335,443],[1347,283]]
    },
    color: 'yellow'
  },
];
