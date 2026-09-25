import { databaseTypes } from "./Database.ts";

// wishlistTypes is the cache for all the games in the location wishlist and returns a flag to know when add the data has been loaded
export type WishlistType = {
    "games": WishlistGameInfo[];
    "cache_done": boolean;
}

// WishlistGameInfo has all the DB variables along with the cheapest store price
// These variables are but together in /wishlist
export interface WishlistGameInfo extends databaseTypes, WishlistPrices, WishlistSubscriptions{}

export interface WishlistPrices {
    cheapest_store: string | null;
    always_free: boolean | null;
    currency: string | null;
    initial_formatted: string | null;
    final_formatted: string | null;
    discount_percent: number | string | null;
}

export interface WishlistSubscriptions {
    playstation_essential: boolean | null;
    playstation_extra: boolean | null;
    playstation_premium: boolean | null;
    game_pass: boolean | null;
}