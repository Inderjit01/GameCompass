import type { Steam, SteamPrice } from "./steam";
import type { IGDBSingle } from "./igdb";
import type { HLTB } from "./hltb";

export type GameDetails = {
    igdb: IGDBSingle;
    steam: Steam | null;
    hltb: HLTB | null;
    prices: AllPrices | null;
};

export interface AllPrices {
    steam: SteamPrice | null;
    epic: EpicPrice | null;
    playstation: PlaystationPrice | null;
    xbox: XboxPrice | null;
    nintendo: NintendoPrice | null;
}; 

export interface EpicPrice {
    final_formatted: string | null;
}
export interface PlaystationPrice {
    final_formatted: string | null;
}
export interface XboxPrice {
    final_formatted: string | null;
}
export interface NintendoPrice {
    final_formatted: string | null;
}