import type { Steam, SteamPrice } from "./steam";
import type { epicPrice } from "./epic";
import type { xboxPrice } from "./xbox";
import type { playstationPrice } from "./playstation";
import type { nintendoPrice } from "./nintendo";

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
    epic: epicPrice | null;
    playstation: playstationPrice | null;
    xbox: xboxPrice | null;
    nintendo: nintendoPrice | null;
}; 
