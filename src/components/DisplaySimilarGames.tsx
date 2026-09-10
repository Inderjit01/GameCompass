import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import useGameSearchBar from "../hooks/useGameSearchBar";
import TopRow from "./TopRow";

import noCoverArt from "../assets/images/no-cover-art.jpg"

import pageLoadingScreen from "../assets/videos/page-loading-screen.mp4"

import type { IGDBMultiple } from "../types/igdb";
import type { PreviewMedia } from "../types/PreviewMedia";

import "../styles/displaysimilargames.css"

function DisplaySimilarGames (){

    // useGameSearchBar finds and stores similar games
    const {query, setQuery, results, noResults} = useGameSearchBar();

    // The previousSearch is user input from toprow search bar, sent with the url to DisplaySimilarGames.tsx
    const [searchParams] = useSearchParams();
    const previousSearch = searchParams.get("query");

    const navigate = useNavigate();

    const [similarGames, setSimilarGames] = useState<IGDBMultiple[] | null>(null);

    const [previewGame, setPreviewGame] = useState<PreviewMedia | null>(null);

    {/* ----------------------------------
      Gets the similar games from IGDB API  
    ----------------------------------- */}
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

    {/* -------------------------------------------------------------------------------------------------
        Sets the first game to already show its preview trailer and/or screenshots when page first loads
    ------------------------------------------------------------------------------------------------- */}
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

    {/* ---------------------------------------------------------------
        Functions to change the preview section movies and screenshots
    ----------------------------------------------------------------- */}
    const handleGameHover = (game: IGDBMultiple) => {
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

            {/* Search bar to find similar games based on user input */}
            <TopRow 
                title="Search Results"
                showSearch={true}
                query={query}
                setQuery={setQuery}
                results={results}
                noResults= {noResults}
            />

            {/* While the API is returning the games that are similar to user input load the loading screen */}
            {!similarGames ? (
                <video 
                    src={pageLoadingScreen}
                    autoPlay
                    loop
                    muted
                    playsInline
                />
            ) : (
                <div className="similar_body_layout">
                    {/* similar_body_layout splits the page. Left side game card and right side preview */}

                    {/* Displays each of the similar games on the left of the screen */}
                    <div className="similar_game_card">
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
                                            <div className="similar_title_and_platforms_layout">
                                                <span className="similar_title">{game.game_title}</span>
                                                <span className="similar_platforms">{game.platforms}</span>
                                            </div>
                                        </li>
                                    )}
                                </ul>
                            )}
                    </div> {/* End of similar_game_card */}

                    {/* Displays the currently hovered game's trailer/screenshots on the right of the page */}
                    <div className="similar_game_preview">

                        <div className="similar_game_preview_layout">
                            <span>{previewGame?.game_title ?? "Unknown"}</span>

                            <div className="similar_preview_movie_screenshots"> 
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
                            </div>{/* End of similar_preview_movie_screenshots */}

                        </div> {/* End of similar_game_preview_layout */}

                    </div> {/* End of similar_game_preview */}
                
                </div>
            )}
        </div>
    );
}

export default DisplaySimilarGames;