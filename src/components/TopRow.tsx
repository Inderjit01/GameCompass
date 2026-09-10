import { useNavigate } from "react-router-dom";

import type { TopRowProps } from "../types/TopRowProps.ts";

import noCoverArt from "../assets/images/no-cover-art.jpg";

import "../styles/toprow.css";

function TopRow ( {title, showSearch = false, query, setQuery, results = [], noResults = false }: TopRowProps){
    
    // Allows users to switch pages (DisplaySimilarGames and GameDetails)
    const navigate = useNavigate(); 

    return(
        <div className="top_search_bar_layout">
            {/* The title for the page */}
            <span>{title}</span>

            <div className="search_wrapper">
                {showSearch === true && (
                    <>
                        {/* This is the search bar */}
                        <input 
                            type="search"
                            placeholder="Search for a game"
                            value={query}
                            onChange={(e) => setQuery?.(e.target.value)}
                            onKeyDown={(e) => {                                    
                                if (e.key === "Enter") {
                                    if (!query?.trim()) return;

                                    navigate(`/displaysimilargames?query=${encodeURIComponent(query ?? "")}`);   
                                    if (setQuery) {
                                        setQuery("");
                                    }                                
                                }
                            }} 
                        />

                        {/* This is the drop down widget that appears when user tries to find a game using the search bar */}
                        {(results.length > 0 || noResults) && (
                            <div className="search_results">
                                {results.length > 0 && (
                                    <>
                                        <span>Search results</span>

                                        <ul>
                                            {results.map( (game) => 
                                                <li 
                                                    key={game.igdb_id}
                                                    onClick={() => {
                                                        navigate(`/games/${game.igdb_id}`);

                                                        if (setQuery) {
                                                            setQuery("");
                                                        }
                                                    }}
                                                    >
                                                    <img
                                                        src={game.cover_image ?? noCoverArt}
                                                        alt={game.game_title}
                                                        width={100}
                                                        height={130}
                                                    />
                                                    <span>{game.game_title}</span>
                                                </li>
                                            )}
                                        </ul>
                                    </>
                                )}

                                {noResults && (
                                    <ul>
                                        <li>No items match your query</li>
                                    </ul>
                                )}
                                
                            </div>
                        )}
                    </>
                )}
            </div> {/* End of search_wrapper */}

        </div>
    );
}

export default TopRow;