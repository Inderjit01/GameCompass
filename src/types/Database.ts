export interface databaseTypes {
    game_id: number;
    igdb_id: number;
    game_title: string | null;
    description: string | null;
    publishers: string | null;
    release_date: string | null;
    genres: string | null;
    platforms: string | null;
    image_url: string | null;
    review_score: number | null;
    main_story: number | null;
    main_extra: number | null;
    completionist: number | null;
    all_styles: number | null;
    library_status: "backlog" | "playing" | "completed";
    favorite: boolean;
    added_date: string;
};