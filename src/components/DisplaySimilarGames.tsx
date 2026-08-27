import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import "../styles/displaysimilargames.css"
import useGameSearchBar from "../hooks/useGameSearchBar";
import TopRow from "./TopRow";
import noCoverArt from "../assets/images/no-cover-art.jpg"

import type { IGDBMultiple } from "../types/igdb";
import type { PreviewMedia } from "../types/PreviewMedia";
import pageLoadingScreen from "../assets/videos/page-loading-screen.mp4"

function DisplaySimilarGames (){
    const {query, setQuery, results, noResults} = useGameSearchBar();

    const [searchParams] = useSearchParams();
    const previousSearch = searchParams.get("query");

    const navigate = useNavigate();

    const [similarGames, setSimilarGames] = useState<IGDBMultiple[] | null>(null);

    const [previewGame, setPreviewGame] = useState<PreviewMedia | null>(null);

    useEffect (() => {
        setSimilarGames(null);
        setPreviewGame(null);

        const search = async () => {
            if (!previousSearch) return;

            const response = await fetch(`http://127.0.0.1:8000/search?game_title=${previousSearch}&limit=10`);
            const data = await response.json();

            setSimilarGames(data);
        }

        search();
    }, [previousSearch]);

    useEffect (() => {
        if (previewGame || !similarGames)    
            return;

        if (similarGames.length > 0) {
            const preview = similarGames[0];

            const movie = preview?.movies?.[0] ?? null;
            const screenshots = preview?.screenshots ?? null;

            if (movie) {
                setPreviewGame({
                    game_title: preview?.game_title ?? null,

                    movie_id: movie.id ?? null,
                    youtube: movie.youtube ?? null,

                    screen_shot_id_1: screenshots?.[0]?.id ?? null,
                    path_full_1: screenshots?.[0]?.path_full ?? null,

                    screen_shot_id_2: screenshots?.[1]?.id ?? null,
                    path_full_2: screenshots?.[1]?.path_full ?? null,

                    screen_shot_id_3: screenshots?.[2]?.id ?? null,
                    path_full_3: screenshots?.[2]?.path_full ?? null,
                });
            } else if (screenshots) {
                setPreviewGame({
                    game_title: preview?.game_title ?? null,

                    screen_shot_id_1: screenshots?.[0]?.id ?? null,
                    path_full_1: screenshots?.[0]?.path_full ?? null,

                    screen_shot_id_2: screenshots?.[1]?.id ?? null,
                    path_full_2: screenshots?.[1]?.path_full ?? null,

                    screen_shot_id_3: screenshots?.[2]?.id ?? null,
                    path_full_3: screenshots?.[2]?.path_full ?? null,

                    screen_shot_id_4: screenshots?.[3]?.id ?? null,
                    path_full_4: screenshots?.[3]?.path_full ?? null,
                });
            } else {
                setPreviewGame(null);
            };
        }
    }, [previewGame, similarGames]);

    const handleGameHover = (game: IGDBMultiple) => {
        console.log("this is the game info: ", game)
        const movie = game.movies?.[0] ?? null;
        const screenshots = game.screenshots ?? [];

        setPreviewGame({
            game_title: game?.game_title ?? null,

            movie_id: movie?.id ?? null,
            youtube: movie?.youtube ?? null,

            screen_shot_id_1: screenshots?.[0]?.id ?? null,
            path_full_1: screenshots?.[0]?.path_full ?? null,

            screen_shot_id_2: screenshots?.[1]?.id ?? null,
            path_full_2: screenshots?.[1]?.path_full ?? null,

            screen_shot_id_3: screenshots?.[2]?.id ?? null,
            path_full_3: screenshots?.[2]?.path_full ?? null,

            screen_shot_id_4: screenshots?.[3]?.id ?? null,
            path_full_4: screenshots?.[3]?.path_full ?? null,
        });
    };

    return (
        <div className="display_similar_games_page">
            <TopRow 
                title="Find Games"
                showSearch={true}
                query={query}
                setQuery={setQuery}
                results={results}
                noResults= {noResults}
            />

            {!similarGames ? (
                <video 
                    src={pageLoadingScreen}
                    autoPlay
                    loop
                    muted
                    playsInline
                />
            ) : (
                <div className="main">
                    <div className="game_card">
                            {similarGames.length > 0 && (
                                <ul>
                                    {similarGames.map ( (game) =>
                                        <li 
                                            key={game.igdb_id}
                                            onMouseEnter={() => handleGameHover(game)}
                                            onClick={() => navigate(`/games/${game.igdb_id}`)}
                                            >
                                            <img 
                                                src={game.cover_image ?? noCoverArt} 
                                                alt={game.game_title}
                                            />
                                            <div className="title_platforms">
                                                <p>{game.game_title}</p>
                                                <span>{game.platforms}</span>
                                            </div>
                                        </li>
                                    )}
                                </ul>
                            )}
                    </div> {/* End of game_card*/}

                    <div className="game_preview">
                        <div className="game_preview_layout">
                            <span>{previewGame?.game_title ?? "Unknown"}</span>

                            <div className="preview_movie_screenshots"> 
                                {previewGame && (
                                    <>
                                        {previewGame?.movie_id && (
                                            <iframe
                                                src={`${previewGame.youtube}?autoplay=1&mute=1&controls=0&loop=1&modestbranding=1&rel=0&iv_load_policy=3`}
                                                title="Game trailer"
                                            />
                                        )}

                                        {previewGame?.path_full_1 && (
                                            <img src={previewGame.path_full_1} alt="" />
                                        )}

                                        {previewGame?.path_full_2 && (
                                            <img src={previewGame.path_full_2} alt="" />
                                        )}

                                        {previewGame?.path_full_3 && (
                                            <img src={previewGame.path_full_3} alt="" />
                                        )}

                                        {!previewGame?.movie_id && previewGame?.path_full_4 && (
                                            <img src={previewGame.path_full_4} alt="" />
                                        )}
                                    </>
                                )}
                            </div>
                        </div> {/* End of game_preview_layout*/}
                    </div> {/* End of game_preview*/}
                
                </div>
            )}
        </div>
    );
}

export default DisplaySimilarGames;