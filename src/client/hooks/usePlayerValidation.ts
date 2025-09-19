import { useMemo } from 'react';
import { SheetPlayer } from '../../shared/models/player';

export type ValidationMessage = {
  type: 'error' | 'warning' | 'success';
  message: string;
} | null;

export function usePlayerValidation(players: SheetPlayer[]) {
  return useMemo(() => {
    // Helper function to check if a player has all required attributes
    const isPlayerValid = (player: SheetPlayer): boolean => {
      // Check common required attributes
      if (!player.name || !player.position || !player.bat || !player.throw || 
          player.power === undefined || player.contact === undefined || 
          player.speed === undefined || player.field === undefined || 
          !player.chemistry) {
        return false;
      }

      // Check that player doesn't have duplicate traits
      if (player.trait1 && player.trait2 && player.trait1 === player.trait2 && player.trait1 !== '--') {
        return false;
      }

      // Check if it's a pitcher
      const isPitcher = 'velocity' in player;
      
      if (isPitcher) {
        const pitcher = player as any;
        // Check pitcher-specific required attributes
        if (pitcher.velocity === undefined || pitcher.junk === undefined || 
            pitcher.accuracy === undefined || !pitcher.angle) {
          return false;
        }
        // Check that at least two pitch types are true
        const pitchCount = [
          pitcher.fourseam, pitcher.twoseam, pitcher.cutter, pitcher.change,
          pitcher.curve, pitcher.slider, pitcher.fork, pitcher.screw
        ].filter(Boolean).length;
        
        if (pitchCount < 2) {
          return false;
        }
      } else {
        const positionPlayer = player as any;

        // Check position player-specific required attributes
        if (positionPlayer.arm === undefined) {
          return false;
        }
      }

      return true;
    };

    const allPlayersValid = players.length === 0 || players.every(player => isPlayerValid(player));
    const hasCorrectPlayerCount = players.length === 22;
    const isRosterValid = hasCorrectPlayerCount && allPlayersValid;
    
    // Generate validation message
    let validationMessage: ValidationMessage = null;
    
    if (players.length > 0) {
      if (!hasCorrectPlayerCount) {
        validationMessage = {
          type: 'error',
          message: `Invalid roster size: ${players.length} players found. A valid roster must contain exactly 22 players.`
        };
      } else if (!allPlayersValid) {
        validationMessage = {
          type: 'warning',
          message: `Roster contains ${players.length} players but some have invalid data. Please check the highlighted rows below.`
        };
      } else {
        validationMessage = {
          type: 'success',
          message: `Valid roster: ${players.length} players loaded successfully.`
        };
      }
    }
    
    return {
      isPlayerValid,
      allPlayersValid,
      hasCorrectPlayerCount,
      isRosterValid,
      playerCount: players.length,
      validationMessage
    };
  }, [players]);
}
