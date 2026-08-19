export interface IGDBSingle {
    igdb_id: number;
    game_title: string;
    cover_image: string | null;
    platforms: string | null;
    short_description: string | null;
    released: string | null;
    developers: string | null;
    publishers: string | null;
    rating: string | null;
    movies: IGDBMovies[] | null;
    screenshots: IGDBScreenshots[] |null;
    artwork: string | null;
};

export interface IGDBMultiple {
    igdb_id: number;
    game_title: string;
    cover_image: string | null;
    platforms: string | null;
};

export interface IGDBMovies {
    id: number;
    name: string | null;
    thumbnail: string | null;
    youtube: string | null;
}

export interface IGDBScreenshots {
    id: number;
    path_thumbnail: string;
    path_full: string;
}