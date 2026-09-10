import { useState, useMemo } from "react";

import type { databaseTypes } from "../types/Database";

function useDatabaseFilter(databaseGames : databaseTypes[] | null) {

    // All filter options. Default is aplphabetical
    const [filterCategories, setFilterCategories] = useState("alphabetical");
    // Sort by ascending or decending
    const [filterOrder, setFilterOrder] = useState("ascending");
    // Search bar filter for game titles
    const [filterSearch, setFilterSearch] = useState("");

    {/* ---------------------------------------------------------------
        Function to sort all games using filters then return the games
    ----------------------------------------------------------------*/}
    const filteredResults = useMemo(() => {
        if (!databaseGames) return [];

        let games = [...databaseGames];

        // Search Bar
        if (filterSearch.trim() !== "") {
            const search = filterSearch.toLocaleLowerCase();

            games = games.filter(game =>
                game.game_title?.toLowerCase().includes(search)
            );
        }
        
        // Categories
        if (filterCategories === "alphabetical") {
            games.sort((a, b) => 
                (a.game_title ?? "").localeCompare(b.game_title ?? "")
            );
        }
        else if (filterCategories === "favorites") {
            games = games.filter(game => game.favorite);
        }
        else if (filterCategories === "review_score") {
            games.sort((a, b) => 
                (a.review_score ?? -1) - (b.review_score ?? -1)
            );
        }
        else if (filterCategories === "main_story") {
            games.sort((a, b) => 
                (a.main_story ?? -1) - (b.main_story ?? -1)
            );
        }
        else if (filterCategories === "main_extra") {
            games.sort((a, b) => 
                (a.main_extra ?? -1) - (b.main_extra ?? -1)
            );
        }
        else if (filterCategories === "completionist") {
            games.sort((a, b) => 
                (a.completionist ?? -1) - (b.completionist ?? -1)
            );
        }
        else if (filterCategories === "all_styles") {
            games.sort((a, b) => 
                (a.all_styles ?? -1) - (b.all_styles ?? -1)
            );
        }
        else if (filterCategories === "Added_date"){
            games.sort((a, b) => 
                new Date(a.added_date).getTime() - new Date(b.added_date).getTime()
            );
        }
        
        // Order
        if (filterOrder == "descending") {
            games = games.reverse();
        }

        return games;
    }, [databaseGames, filterCategories, filterOrder, filterSearch]);

    return {
        filteredResults,
        filterCategories,
        setFilterCategories,
        filterOrder,
        setFilterOrder,
        filterSearch,
        setFilterSearch,
    };
}

export default useDatabaseFilter;