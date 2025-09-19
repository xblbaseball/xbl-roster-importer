import { useMemo } from 'react';
import { PositionPlayer, Pitcher, SheetPlayer, DatabasePlayer, Position, Bat, Throw, Chemistry, Angle, Trait } from '../../shared/models/player';

export type PlayerAttributeValue = 
  | string          // name, guid
  | number          // power, contact, speed, field, arm, velocity, junk, accuracy
  | boolean         // fourseam, twoseam, cutter, change, curve, slider, fork, screw
  | Position        // position, secondaryPosition
  | Bat             // bat
  | Throw           // throw
  | Chemistry       // chemistry
  | Angle           // angle
  | Trait;          // trait1, trait2

export interface PlayerDiff {
  property: string;
  sheetValue: PlayerAttributeValue;
  customValue: PlayerAttributeValue;
  isDifferent: boolean;
  displayName: string;
}

export interface PlayerComparison {
  sheetPlayer: SheetPlayer;
  customPlayer: DatabasePlayer | null;
  isMatched: boolean;
  diffs: PlayerDiff[];
}

export function usePlayerComparison(sheetPlayers: SheetPlayer[], customPlayers: DatabasePlayer[]) {
  return useMemo(() => {
    const comparisons: PlayerComparison[] = sheetPlayers.map(sheetPlayer => {
      const customPlayer = customPlayers.find(p => p.name === sheetPlayer.name);
      
      if (!customPlayer) {
        return {
          sheetPlayer,
          customPlayer: null,
          isMatched: false,
          diffs: []
        };
      }

      const diffs = generatePlayerDiffs(sheetPlayer, customPlayer);
      
      return {
        sheetPlayer,
        customPlayer,
        isMatched: true,
        diffs
      };
    });

    return comparisons;
  }, [sheetPlayers, customPlayers]);
}

function generatePlayerDiffs(sheetPlayer: SheetPlayer, customPlayer: DatabasePlayer): PlayerDiff[] {
  const diffs: PlayerDiff[] = [];
  
  // Common properties for both position players and pitchers
  const commonProperties = [
    { key: 'position', display: 'Position' },
    { key: 'bat', display: 'Bat' },
    { key: 'throw', display: 'Throw' },
    { key: 'power', display: 'Power' },
    { key: 'contact', display: 'Contact' },
    { key: 'speed', display: 'Speed' },
    { key: 'field', display: 'Field' },
    { key: 'chemistry', display: 'Chemistry' }
  ];

  // Check common properties
  commonProperties.forEach(prop => {
    const sheetValue = (sheetPlayer as any)[prop.key] as PlayerAttributeValue;
    const customValue = (customPlayer as any)[prop.key] as PlayerAttributeValue;
    
    if (sheetValue !== customValue) {
      diffs.push({
        property: prop.key,
        sheetValue,
        customValue,
        isDifferent: true,
        displayName: prop.display
      });
    }
  });

  // Handle traits separately with order-independent comparison
  const sheetTraits = [sheetPlayer.trait1, sheetPlayer.trait2].filter(trait => trait && trait !== '--');
  const customTraits = [customPlayer.trait1, customPlayer.trait2].filter(trait => trait && trait !== '--');
  
  // Sort both arrays to compare regardless of order
  const sortedSheetTraits = [...sheetTraits].sort();
  const sortedCustomTraits = [...customTraits].sort();
  
  // Check if the sorted arrays are different
  const traitsAreDifferent = sortedSheetTraits.length !== sortedCustomTraits.length ||
    sortedSheetTraits.some((trait, index) => trait !== sortedCustomTraits[index]);
  
  if (traitsAreDifferent) {
    diffs.push({
      property: 'traits',
      sheetValue: (sheetTraits.join(', ') || '--') as PlayerAttributeValue,
      customValue: (customTraits.join(', ') || '--') as PlayerAttributeValue,
      isDifferent: true,
      displayName: 'Traits'
    });
  }

  // Check position-specific properties
  if (isPitcher(sheetPlayer) && isPitcher(customPlayer)) {
    const pitcherProperties = [
      { key: 'velocity', display: 'Velocity' },
      { key: 'junk', display: 'Junk' },
      { key: 'accuracy', display: 'Accuracy' },
      { key: 'fourseam', display: '4F' },
      { key: 'twoseam', display: '2F' },
      { key: 'cutter', display: 'CF' },
      { key: 'change', display: 'CH' },
      { key: 'curve', display: 'CB' },
      { key: 'slider', display: 'SL' },
      { key: 'fork', display: 'FK' },
      { key: 'screw', display: 'SB' },
      { key: 'angle', display: 'Arm Angle' }
    ];

    pitcherProperties.forEach(prop => {
      const sheetValue = (sheetPlayer as any)[prop.key] as PlayerAttributeValue;
      const customValue = (customPlayer as any)[prop.key] as PlayerAttributeValue;
      
      if (sheetValue !== customValue) {
        diffs.push({
          property: prop.key,
          sheetValue,
          customValue,
          isDifferent: true,
          displayName: prop.display
        });
      }
    });
  } else if (isPositionPlayer(sheetPlayer) && isPositionPlayer(customPlayer)) {
    const positionPlayerProperties = [
      { key: 'secondaryPosition', display: 'Secondary Position' },
      { key: 'arm', display: 'Arm' }
    ];

    positionPlayerProperties.forEach(prop => {
      const sheetValue = (sheetPlayer as any)[prop.key] as PlayerAttributeValue;
      const customValue = (customPlayer as any)[prop.key] as PlayerAttributeValue;
      
      if (sheetValue !== customValue) {
        diffs.push({
          property: prop.key,
          sheetValue,
          customValue,
          isDifferent: true,
          displayName: prop.display
        });
      }
    });
  }

  return diffs;
}

function isPitcher(player: SheetPlayer | DatabasePlayer): player is Pitcher {
  return 'velocity' in player;
}

function isPositionPlayer(player: SheetPlayer | DatabasePlayer): player is PositionPlayer {
  return 'arm' in player && !('velocity' in player);
}

export function formatPropertyValue(value: PlayerAttributeValue): string {
  if (value === null || value === undefined) {
    return '--';
  }
  
  if (typeof value === 'boolean') {
    return value ? '☑' : '☐';
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  return value.toString();
}
