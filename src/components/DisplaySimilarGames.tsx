import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import "../styles/displaysimilargames.css"
import useGameSearchBar from "../hooks/useGameSearchBar";
import TopRow from "./TopRow";
import noCoverArt from "../assets/images/no-cover-art.jpg"

import type { IGDBMultiple } from "../types/igdb";

function DisplaySimilarGames (){
    const {query, setQuery, results, noResults} = useGameSearchBar();

    const [searchParams] = useSearchParams();
    const previousSearch = searchParams.get("query");

    const navigate = useNavigate();

    const [similarGames, setSimilarGames] = useState<IGDBMultiple[]>([]);

    useEffect (() => {
        const search = async () => {
            if (!previousSearch) return;

            const response = await fetch(`http://127.0.0.1:8000/search?game_title=${previousSearch}&limit=10`);
            const data = await response.json();

            setSimilarGames(data);
        }

        search();
    }, [previousSearch]);

    return (
        <div className="page">
            <TopRow 
                title="Find Games"
                showSearch={true}
                query={query}
                setQuery={setQuery}
                results={results}
                noResults= {noResults}
            />

            <div className="main">
                <div className="game-card">
                    {similarGames.length > 0 && (
                        <ul>
                            {similarGames.map ( (game) =>
                                <li 
                                    key={game.igdb_id}
                                    onClick={() => navigate(`/games/${game.igdb_id}`)}
                                    >
                                    <img 
                                        src={game.cover_image ?? noCoverArt} 
                                        alt={game.game_title}
                                    />
                                    <div className="title-platforms">
                                        <p>{game.game_title}</p>
                                        <span>{game.platforms}</span>
                                    </div>
                                </li>
                            )}
                        </ul>
                    )}
                </div>
            
            </div>

        </div>
    );
}

export default DisplaySimilarGames;