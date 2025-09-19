import { Bat, Chemistry, Position, Throw, Trait } from './player';

// Position mappings
export const POSITION_MAP: { [key: number]: string } = {
    0: "",        // None
    1: "P",       // Pitcher
    2: "C",       // Catcher
    3: "1B",      // FirstBase
    4: "2B",      // SecondBase
    5: "3B",      // ThirdBase
    6: "SS",      // ShortStop
    7: "LF",      // LeftField
    8: "CF",      // CenterField
    9: "RF",      // RightField
    10: "IF",     // Infield
    11: "OF",     // Outfield
    12: "1B/OF",  // FirstBaseAndOutfield
    13: "IF/OF"   // InfieldAndOutfield
};

export const PITCH_POSITION_MAP: { [key: string]: string } = {
    "1": "SP",     // Starting Pitcher
    "2": "SP/RP",  // Starting/Relief Pitcher
    "3": "RP",     // Relief Pitcher
    "4": "CP"      // Closer Pitcher
};

// Batting hand mappings
export const BATTING_HAND_MAP: { [key: number]: Bat } = {
    0: "L",  // Left
    1: "R",  // Right
    2: "S"   // Switch
};

export const BATTING_HAND_REVERSE_MAP: { [key in Bat]: number } = {
    "L": 0,  // Left
    "R": 1,  // Right
    "S": 2   // Switch
};

// Throwing hand mappings
export const THROWING_HAND_MAP: { [key: number]: Throw } = {
    0: "L",  // Left
    1: "R"   // Right
};

export const THROWING_HAND_REVERSE_MAP: { [key in Throw]: number } = {
    "L": 0,  // Left
    "R": 1   // Right
};

// Chemistry mappings
export const CHEMISTRY_MAP: { [key: number]: Chemistry } = {
    0: "Competitive",
    1: "Spirited",
    2: "Disciplined",
    3: "Scholarly",
    4: "Crafty"
};

// Arm angle mappings
export const ARM_ANGLE_MAP: { [key: number]: string } = {
    0: "Sub",   // Submarine
    1: "Low",   // Low
    2: "Mid",   // Mid
    3: "High"   // High
};

export const ARM_ANGLE_REVERSE_MAP: { [key: string]: number } = {
    "Sub": 0,   // Submarine
    "Low": 1,   // Low
    "Mid": 2,   // Mid
    "High": 3   // High
};

// Trait mappings
export const TRAIT_MAP: { [key: string]: Trait } = {
    "0-0": "POW vs RHP (+)",
    "0-1": "POW vs LHP (+)",
    "1-0": "CON vs RHP (+)",
    "1-1": "CON vs LHP (+)",
    "2-6": "RBI Hero (+)",
    "2-7": "RBI Zero (-)",
    "3-2": "High Pitch (+)",
    "3-3": "Low Pitch (+)",
    "3-4": "Inside Pitch (+)",
    "3-5": "Outside Pitch (+)",
    "4-6": "Tough Out (+)",
    "4-7": "Whiffer (-)",
    "5-12": "Specialist (+)",
    "5-13": "Reverse Splits (+)",
    "6-6": "Composed (+)",
    "6-7": "BB Prone (-)",
    "7-6": "K Collector (+)",
    "7-7": "K Neglector (-)",
    "8-6": "Stealer (+)",
    "8-7": "Bad Jumps (-)",
    "9-6": "Utility (+)",
    "10-8": "Fastball Hitter (+)",
    "10-9": "Off-Speed Hitter (+)",
    "11-6": "Bad Ball Hitter (+)",
    "12-10": "Big Hack (+)",
    "12-11": "Little Hack (+)",
    "13-6": "Rally Starter (+)",
    "14-6": "First Pitch Slayer (+)",
    "14-7": "First Pitch Prayer (-)",
    "15-6": "Pinch Perfect (+)",
    "16-6": "Ace Exterminator (+)",
    "17-6": "Mind Gamer (+)",
    "17-7": "Easy Target (-)",
    "18-6": "Pick Officer (+)",
    "18-7": "Easy Jumps (-)",
    "19-6": "Gets Ahead (+)",
    "19-7": "Falls Behind (-)",
    "20-6": "Rally Stopper (+)",
    "20-7": "Surrounded (-)",
    "21-7": "Crossed Up (-)",
    "22-14": "Elite 4F (+)",
    "22-15": "Elite 2F (+)",
    "22-16": "Elite CF (+)",
    "22-17": "Elite CB (+)",
    "22-18": "Elite SL (+)",
    "22-19": "Elite CH (+)",
    "22-20": "Elite SB (+)",
    "22-21": "Elite FK (+)",
    "23-6": "Workhorse (+)",
    "24-22": "Two Way (OF) (+)",
    "24-23": "Two Way (IF) (+)",
    "24-24": "Two Way (C) (+)",
    "25-6": "Metal Head (+)",
    "26-6": "Sprinter (+)",
    "26-7": "Slow Poke (-)",
    "27-6": "Base Rounder (+)",
    "27-7": "Base Jogger (-)",
    "28-6": "Distractor (+)",
    "29-6": "Magic Hands (+)",
    "29-7": "Butter Fingers (-)",
    "30-7": "Wild Thrower (-)",
    "31-7": "Wild Thing (-)",
    "32-6": "Clutch (+)",
    "32-7": "Choker (-)",
    "33-25": "Consistent (+)",
    "33-26": "Volatile (+)",
    "34-6": "Durable (+)",
    "34-7": "Injury Prone (-)",
    "35-6": "Stimulated (+)",
    "36-6": "Cannon Arm (+)",
    "36-7": "Noodle Arm (-)",
    "37-6": "Dive Wizard (+)",
    "38-6": "Sign Stealer (+)",
    "39-7": "Meltdown (-)",
    "40-6": "Bunter (+)"
};

// Database option keys constants
export const OPTION_KEYS = {
    THROWING_HAND: 4,
    BATTING_HAND: 5,
    ARM_ANGLE: 49,
    PRIMARY_POSITION: 54,
    SECONDARY_POSITION: 55,
    PITCH_POSITION: 57,
    FOUR_SEAM: 58,
    TWO_SEAM: 59,
    SCREWBALL: 60,
    CHANGEUP: 61,
    FORK: 62,
    CURVEBALL: 63,
    SLIDER: 64,
    CUTTER: 65,
    CHEMISTRY: 107
} as const;

// Converter functions
export function getPlayerPosition(positionInt: number, pitchPosition: string | null | undefined): Position {
    // If it's a pitcher position and we have pitch position info, use that
    if (positionInt === 1 && pitchPosition && PITCH_POSITION_MAP[pitchPosition]) {
        return PITCH_POSITION_MAP[pitchPosition] as Position;
    }
    
    // Otherwise use the regular position mapping
    return (POSITION_MAP[positionInt] || "-") as Position;
}

export function getPositionInt(position: Position): number {
    if (!position || position === '-') {
        return 0; // None
    }
    
    for (const [key, value] of Object.entries(POSITION_MAP)) {
        if (value === position) {
            return parseInt(key);
        }
    }
    
    // If not found in POSITION_MAP, it might be a pitcher position, return 0 (None) for secondary position
    return 0;
}

export function getBattingHand(battingHandInt: number): Bat {
    if (!(battingHandInt in BATTING_HAND_MAP)) {
        throw new Error(`Invalid batting hand value: ${battingHandInt}`);
    }
    return BATTING_HAND_MAP[battingHandInt];
}

export function getBattingHandInt(battingHand: Bat): number {
    return BATTING_HAND_REVERSE_MAP[battingHand];
}

export function getThrowingHand(throwingHandInt: number): Throw {
    if (!(throwingHandInt in THROWING_HAND_MAP)) {
        throw new Error(`Invalid throwing hand value: ${throwingHandInt}`);
    }
    return THROWING_HAND_MAP[throwingHandInt];
}

export function getThrowingHandInt(throwingHand: Throw): number {
    return THROWING_HAND_REVERSE_MAP[throwingHand];
}

export function getChemistry(chemistryInt: number): Chemistry {
    if (!(chemistryInt in CHEMISTRY_MAP)) {
        throw new Error(`Invalid chemistry value: ${chemistryInt}`);
    }
    return CHEMISTRY_MAP[chemistryInt];
}

export function getChemistryInt(chemistry: Chemistry): number {
    for (const [key, value] of Object.entries(CHEMISTRY_MAP)) {
        if (value === chemistry) {
            return parseInt(key);
        }
    }
    throw new Error(`Invalid chemistry: ${chemistry}`);
}

export function getArmAngle(armAngleInt: number): string {
    return ARM_ANGLE_MAP[armAngleInt] || "";
}

export function getArmAngleInt(armAngleString: string): number {
    return ARM_ANGLE_REVERSE_MAP[armAngleString] !== undefined ? ARM_ANGLE_REVERSE_MAP[armAngleString] : 2; // Default to Mid
}

export function getTrait(traitId: number, subtypeId: number): Trait {
    const traitKey = `${traitId}-${subtypeId}`;
    if (!(traitKey in TRAIT_MAP)) {
        throw new Error(`Invalid trait combination: traitId=${traitId}, subtypeId=${subtypeId}`);
    }
    return TRAIT_MAP[traitKey];
}

export function getTraitIds(trait: Trait): { traitId: number; subtypeId: number } | null {
    if (trait === '--' || !trait) {
        return null;
    }
    
    for (const [key, value] of Object.entries(TRAIT_MAP)) {
        if (value === trait) {
            const [traitId, subtypeId] = key.split('-').map(Number);
            return { traitId, subtypeId };
        }
    }
    
    return null;
}

export function getPitchPositionInt(position: Position): number {
    if (!position) return 0;
    
    // Direct mapping for pitcher positions
    switch (position) {
        case "SP": return 1;
        case "SP/RP": return 2;
        case "RP": return 3;
        case "CP": return 4;
        default: return 0; // Default for non-pitcher positions
    }
}

export function isPitcherPosition(position: Position): boolean {
    return ['SP', 'SP/RP', 'RP', 'CP'].includes(position);
}
