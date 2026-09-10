import { useState, useEffect} from "react";

import type { IGDBMultiple } from "../types/igdb";

function useGameSearchBar () {

    // declares and returns these variables which are needed to search for similar games
    const [query, setQuery] = useState("");

    // similar games are found uses IGDB api the variable name and datatypes are in IGDBMultiple
    const [results, setResults] = useState<IGDBMultiple[]>([]);

    // If user types an input and gets no results then user get this message "No items match your query"
    // noResults prevents an empty {results} causing the prompt "No items match your query" to stay up 24/7
    const [noResults, setNoResults] = useState(false);

    {/* 
        Gets similar games froms IGDB using user input
    */}
    useEffect( () => {
        if (query.trim() === ""){
            setResults([]);
            setNoResults(false);
            return;
        }

        // allows me to cancel a search request if the user does something while search for a game
        const controller = new AbortController();

        const timeout = setTimeout(() => {
            const search = async () => {
                const response = await fetch(`http://127.0.0.1:8000/search?game_title=${encodeURIComponent(query)}&limit=3`,
                {
                    signal: controller.signal
                }
            );
                
                if (response.status == 404) {
                    setResults([]);
                    setNoResults(true);
                    return;
                } 

                if (!response.ok) {
                    console.error(`Search failed for ${query}`, response.status);
                    return;
                }

                const data = await response.json();
                setResults(data);
                setNoResults(false);
            };
            search();
        }, 400);

        return () => {
            clearTimeout(timeout)
            controller.abort();
        };

    }, [query]);

    return {
        query,
        setQuery,
        results,
        noResults,
    };
}

export default useGameSearchBar;