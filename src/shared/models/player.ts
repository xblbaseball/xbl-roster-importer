export type Position = 'SP' | 'SP/RP' | 'RP' | 'CP' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'IF' | 'OF' | 'IF/OF' | '1B/OF' | '-';
export type Bat = 'L' | 'R' | 'S';
export type Throw = 'L' | 'R';
export type Chemistry = 'Crafty' | 'Competitive' | 'Disciplined' | 'Scholarly' | 'Spirited';
export type Angle = 'High' | 'Mid' | 'Low' | 'Sub';

export type PositiveTrait = 
    | 'Ace Exterminator (+)'
    | 'Bad Ball Hitter (+)'
    | 'Base Rounder (+)'
    | 'Big Hack (+)'
    | 'Bunter (+)'
    | 'Cannon Arm (+)'
    | 'Clutch (+)'
    | 'Composed (+)'
    | 'CON vs LHP (+)'
    | 'CON vs RHP (+)'
    | 'Consistent (+)'
    | 'Distractor (+)'
    | 'Dive Wizard (+)'
    | 'Durable (+)'
    | 'Elite 2F (+)'
    | 'Elite 4F (+)'
    | 'Elite CB (+)'
    | 'Elite CF (+)'
    | 'Elite CH (+)'
    | 'Elite FK (+)'
    | 'Elite SB (+)'
    | 'Elite SL (+)'
    | 'Fastball Hitter (+)'
    | 'First Pitch Slayer (+)'
    | 'Gets Ahead (+)'
    | 'High Pitch (+)'
    | 'Inside Pitch (+)'
    | 'K Collector (+)'
    | 'Little Hack (+)'
    | 'Low Pitch (+)'
    | 'Magic Hands (+)'
    | 'Metal Head (+)'
    | 'Mind Gamer (+)'
    | 'Off-Speed Hitter (+)'
    | 'Outside Pitch (+)'
    | 'Pick Officer (+)'
    | 'Pinch Perfect (+)'
    | 'POW vs LHP (+)'
    | 'POW vs RHP (+)'
    | 'Rally Starter (+)'
    | 'Rally Stopper (+)'
    | 'RBI Hero (+)'
    | 'Reverse Splits (+)'
    | 'Sign Stealer (+)'
    | 'Specialist (+)'
    | 'Sprinter (+)'
    | 'Stealer (+)'
    | 'Stimulated (+)'
    | 'Tough Out (+)'
    | 'Two Way (C) (+)'
    | 'Two Way (IF) (+)'
    | 'Two Way (OF) (+)'
    | 'Utility (+)'
    | 'Volatile (+)'
    | 'Workhorse (+)';

export type NegativeTrait = 
    | 'Bad Jumps (-)'
    | 'Base Jogger (-)'
    | 'BB Prone (-)'
    | 'Butter Fingers (-)'
    | 'Choker (-)'
    | 'Crossed Up (-)'
    | 'Easy Jumps (-)'
    | 'Easy Target (-)'
    | 'Falls Behind (-)'
    | 'First Pitch Prayer (-)'
    | 'Injury Prone (-)'
    | 'K Neglector (-)'
    | 'Meltdown (-)'
    | 'Noodle Arm (-)'
    | 'RBI Zero (-)'
    | 'Slow Poke (-)'
    | 'Surrounded (-)'
    | 'Whiffer (-)'
    | 'Wild Thing (-)'
    | 'Wild Thrower (-)';

export type Trait = PositiveTrait | NegativeTrait | '--';

// Base player interface with common properties
export interface BasePlayer {
    name: string;
    position: Position;
    bat: Bat;
    throw: Throw;
    power: number;
    contact: number;
    speed: number;
    field: number;
    chemistry: Chemistry;
    trait1: Trait;
    trait2: Trait;
}

export type PositionPlayer = BasePlayer & {
    secondaryPosition: Position;
    arm: number;
}

export type Pitcher = BasePlayer & {
    velocity: number;
    junk: number;
    accuracy: number;
    fourseam: boolean;
    twoseam: boolean;
    cutter: boolean;
    change: boolean;
    curve: boolean;
    slider: boolean;
    fork: boolean;
    screw: boolean;
    angle: Angle;
}

// Common player type - either position player or pitcher
export type Player = PositionPlayer | Pitcher;

// Sheet players (from Google Sheets - no GUID)
export type SheetPlayer = Player;

// Database players (from database - includes GUID)
export type DatabasePlayer = Player & {
    guid: string;
};

export interface PlayerComparison {
  sheetPlayer: SheetPlayer;
  customPlayer: DatabasePlayer | null;
  isMatched: boolean;
}
