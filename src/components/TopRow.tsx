import { useNavigate } from "react-router-dom";

import "../styles/toprow.css";
import type { TopRowProps } from "../types/TopRowProps.ts";
import noCoverArt from "../assets/images/no-cover-art.jpg";

function TopRow ( {title, showSearch = false, query, setQuery, results = [], noResults = false }: TopRowProps){
    
    const navigate = useNavigate(); 

    return(
        <div className="top-row">
            <h1>{title}</h1>

            <div className="search-wrapper">
                {showSearch === true && (
                    <>
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
            </div>

        </div>
    );
}

export default TopRow;