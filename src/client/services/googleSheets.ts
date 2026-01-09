/// <reference types="vite/client" />
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { PositionPlayer, Pitcher, Position, Bat, Throw, Chemistry, Player, Trait, Angle } from '../../shared/models/player';

export interface SheetData {
  players: Player[];
  lastUpdated: Date | null;
}

export async function loadPlayersFromSheet(sheetUrl: string): Promise<SheetData> {
  try {
    // Extract the sheet ID from the URL
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      throw new Error('Invalid Google Sheet URL');
    }

    // Initialize the sheet with auth
    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Sheets API key not found. Please set VITE_GOOGLE_SHEETS_API_KEY in your .env.local file');
    }
    
    const doc = new GoogleSpreadsheet(sheetId, {
      apiKey: apiKey
    });

    // Load the sheet
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Roster"];
    if (!sheet) {
      throw new Error('Could not find sheet named "Roster"');
    }

    // Load all needed cells for pitchers and position players
    await sheet.loadCells('B6:BT52');
    
    const players: Player[] = [];

    // Helper functions for cell value parsing
    const getCellValue = (row: number, column: string) => {
      const cell = sheet.getCellByA1(`${column}${row}`);
      return cell.value;
    };

    // Parse numeric values, defaulting to 0 if invalid
    const parseNumber = (value: any): number => {
      const num = Number(value);
      return !isNaN(num) ? num : 0;
    };

    // Parse boolean values from TRUE/FALSE strings
    const parseBoolean = (value: any): boolean => {
      return value === true || (typeof value === 'string' && value.trim().toUpperCase() === 'TRUE');
    };
    
    // Process pitchers (rows 6-22, even numbers only)
    for (let row = 6; row <= 22; row += 2) {
      const name = getCellValue(row, 'B');
      const position = getCellValue(row, 'H') as string;
      
      if (name && typeof name === 'string' && name.trim()) {
        // Validate the pitcher position first
        const trimmedPosition = position?.trim() || '';
        const validPitcherPositions: Position[] = ['SP', 'SP/RP', 'RP', 'CP'];
        if (!validPitcherPositions.includes(trimmedPosition as Position)) {
          throw new Error(`Invalid pitcher position "${trimmedPosition}" at row ${row}. Must be one of: ${validPitcherPositions.join(', ')}`);
        }

        const pitcher: Pitcher = {
          name: name.trim(),
          position: trimmedPosition as Position,
          bat: (getCellValue(row, 'L') as string)?.trim() as Bat,
          throw: (getCellValue(row, 'N') as string)?.trim() as Throw,
          power: parseNumber(getCellValue(row, 'P')),
          contact: parseNumber(getCellValue(row, 'S')),
          speed: parseNumber(getCellValue(row, 'V')),
          field: parseNumber(getCellValue(row, 'Y')),
          velocity: parseNumber(getCellValue(row, 'AE')),
          junk: parseNumber(getCellValue(row, 'AH')),
          accuracy: parseNumber(getCellValue(row, 'AK')),
          chemistry: (getCellValue(row, 'AN') as string)?.trim() as Chemistry,
          trait1: (getCellValue(row, 'AS') as string)?.trim() as Trait,
          trait2: (getCellValue(row, 'AZ') as string)?.trim() as Trait,
          fourseam: parseBoolean(getCellValue(row, 'BL')),
          twoseam: parseBoolean(getCellValue(row, 'BM')),
          cutter: parseBoolean(getCellValue(row, 'BN')),
          change: parseBoolean(getCellValue(row, 'BO')),
          curve: parseBoolean(getCellValue(row, 'BP')),
          slider: parseBoolean(getCellValue(row, 'BQ')),
          fork: parseBoolean(getCellValue(row, 'BR')),
          screw: parseBoolean(getCellValue(row, 'BS')),
          angle: (getCellValue(row, 'BT') as string)?.trim() as Angle
        };
        players.push(pitcher);
      }
    }

    // Process position players (rows 26-52, even numbers only)
    for (let row = 26; row <= 52; row += 2) {
      const getCellValue = (column: string) => {
        const cell = sheet.getCellByA1(`${column}${row}`);
        return cell.value;
      };

      const name = getCellValue('B');
      const position = getCellValue('H') as string;
      const secondaryPosition = getCellValue('J') as string;
      
      if (name && typeof name === 'string' && name.trim()) {
        // Validate the position first
        const trimmedPosition = position?.trim() || '';
        const trimmedSecondaryPosition = secondaryPosition?.trim() || '';
        const validPositions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'IF', 'OF', '1B/OF', 'IF/OF', '-'];
        
        if (!validPositions.includes(trimmedPosition as Position)) {
          throw new Error(`Invalid position "${trimmedPosition}" at row ${row}. Must be one of: ${validPositions.join(', ')}`);
        }
        if (trimmedSecondaryPosition && !validPositions.includes(trimmedSecondaryPosition as Position)) {
          throw new Error(`Invalid secondary position "${trimmedSecondaryPosition}" at row ${row}. Must be one of: ${validPositions.join(', ')}`);
        }

        const positionPlayer: PositionPlayer = {
          name: name.trim(),
          position: trimmedPosition as Position,
          secondaryPosition: trimmedSecondaryPosition as Position,
          bat: (getCellValue('L') as string)?.trim() as Bat || 'R',
          throw: (getCellValue('N') as string)?.trim() as Throw || 'R',
          power: parseNumber(getCellValue('P')),
          contact: parseNumber(getCellValue('S')),
          speed: parseNumber(getCellValue('V')),
          field: parseNumber(getCellValue('Y')),
          arm: parseNumber(getCellValue('AB')),
          chemistry: (getCellValue('AN') as string)?.trim() as Chemistry || 'Competitive',
          trait1: (getCellValue('AS') as string)?.trim() as Trait || '--',
          trait2: (getCellValue('AZ') as string)?.trim() as Trait || '--'
        };
        players.push(positionPlayer);
      }
    }

    return {
      players,
      lastUpdated: null // TODO: register the app and use googleapis to fetch this. Doesn't seem to be possible with google-spreadsheet alone
    };
  } catch (error) {
    console.error('Error loading sheet:', error);
    throw error;
  }
}

function extractSheetId(url: string): string | null {
  // Handle both old and new Google Sheets URL formats
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
    /spreadsheets.google.com\/feeds\/.*\/([a-zA-Z0-9-_]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
