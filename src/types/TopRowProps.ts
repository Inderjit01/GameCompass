import type { IGDBMultiple } from "./igdb";

export type TopRowProps =
    | {
        title?: string;
        showSearch: true;
        query: string;
        setQuery: React.Dispatch<React.SetStateAction<string>>;
        results: IGDBMultiple[];
        noResults?: boolean;
    }
    | {
        title?: string;
        showSearch: false;
        query?: never;
        setQuery?: never;
        results?: never;
        noResults?: never;
    };