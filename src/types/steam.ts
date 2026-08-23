export interface Steam {
    basic_info: SteamBasicInfo | null;
    reviews: SteamReviews | null;
    recent_reviews: SteamReviews | null;
}

/*      Steam Store endpoint        */
export interface SteamBasicInfo {
    name: string; 
    steam_appid: number;

    is_free: boolean | null;

    detailed_description: string | null;
    about_the_game: string | null;
    short_description: string | null;

    header_image: string | null;
    capsule_image: string | null;
    capsule_imagev5: string | null;

    developers: string[] | null;
    publishers: string[] | null;

    genres: SteamGenres[] | null;

    screenshots: SteamScreenshot[] | null;

    movies: SteamMovie[] | null;

    release_date: SteamReleaseDate | null;
}

export interface SteamGenres {
    id: string,
    description: string | null;
}

export interface SteamScreenshot {
    id: number;
    path_thumbnail: string | null;
    path_full: string | null;
}

export interface SteamMovie {
    id: number;
    name: string | null;
    thumbnail: string | null;
    dash_av1: string | null;
    hls_h264: string | null;
    highlight: boolean | null;
}

export interface SteamReleaseDate {
    coming_soon: boolean | null;
    date: string | null;
}


/*      Steam Reviews endpoint      */
export interface SteamReviews {
    query_summary: SteamReviewSummary | null;
    reviews: SteamReview[] | null;
    cursor: string | null;
}

export interface SteamReviewSummary {
    review_score_desc: string | null;
    total_positive: number | null;
    total_negative: number | null;
    total_reviews: number | null;
}

export interface SteamReview {
    recommendationid: string | null;
    author: SteamReviewAuthor | null;
    language: string | null;
    review: string | null;
    timestamp_created: number | null;
    timestamp_updated: number | null;
    voted_up: boolean | null;
    votes_up: number | null;
    steam_purchase: boolean | null;
    received_for_free: boolean | null;
    refunded: boolean | null;

}

export interface SteamReviewAuthor {
    steamid: string | null;
    personaname: string | null;
    profile_url: string | null;
    num_games_owned: number | null;
    num_reviews: number | null;
    playtime_forever: number | null;
    playtime_last_two_weeks: number | null;
    playtime_at_review: number | null;
    avatar: string | null;
}

export interface SteamPrice {
    is_free?: boolean | null;
    currency?: string | null;
    initial?: number | null;
    final?: number | null;
    discount_percent?: number | null;
    initial_formatted?: string | null;
    final_formatted?: string | null;
}