export type SelectedMedia =
    | {
        type: "movie";
        id: number;
        thumbnail: string | null;
        hls_h264?: string | null;
        youtube?: string | null;
    }
    | {
        type: "screenshot";
        id: number;
        path_thumbnail: string | null;
        path_full: string | null;
    }
    | null;