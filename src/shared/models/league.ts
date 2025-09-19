export type League = {
    guid: string;
    name: string;
    teams: Team[];
    databasePath: string;
}

export type Team = {
    guid: string;
    name: string;
    colors?: string[]; // Array of hex color strings
}
