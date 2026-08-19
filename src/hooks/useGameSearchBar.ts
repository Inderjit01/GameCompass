import { useState, useEffect} from "react";

import type { IGDBMultiple } from "../types/igdb";

function useGameSearchBar () {
    const [query, setQuery] = useState("");

    const [results, setResults] = useState<IGDBMultiple[]>([]);

    const [noResults, setNoResults] = useState(false);

    useEffect( () => {
        if (query === ""){
            setResults([]);
            return;
        }

        const timeout = setTimeout(() => {
            const search = async () => {
                const response = await fetch(`http://127.0.0.1:8000/search?game_title=${encodeURIComponent(query)}&limit=3`);
                
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
        }, 500);

        return () => clearTimeout(timeout);

    }, [query]);

    return {
        query,
        setQuery,
        results,
        noResults,
    };
}

export default useGameSearchBar;