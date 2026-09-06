import type { FilterOption } from "../types/DatabaseFilterProps";

export const baseFilterOptions: FilterOption[] = [
    { value: "alphabetical", label: "Alphabetical"},
    { value: "favorites", label: "Favorites" },
    { value: "review_score", label: "Review Score" },
    { value: "main_story", label: "Main Story Hours" },
    { value: "main_extra", label: "Main + Extra Hours" },
    { value: "completionist", label: "Completionist Hours" },
    { value: "all_styles", label: "All Styles" },
    { value: "added_date", label: "Added Date" },
];

export const wishlistFilterOptions: FilterOption[] = [
    ...baseFilterOptions,
    { value: "price", label: "Price" },
    { value: "on_sale", label: "On Sale" },
];

export const completedFilterOptions: FilterOption[] = [
    ...baseFilterOptions,
];