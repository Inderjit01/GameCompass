import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import TopRow from "../components/TopRow";
import useGameSearchBar from "../hooks/useGameSearchBar";
import DatabaseFilter from "../components/DatabaseFilter";
import { completedFilterOptions } from "../constants/DatabaseFilterOptions"

import type { databaseTypes } from "../types/Database";

import starNotFavorite from "../assets/images/star-not-favorite.svg";
import starFavorite from "../assets/images/star-favorite.svg";
import useDatabaseFilter from "../hooks/useDatabaseFilter";

import "../styles/Completed.css";

function Completed() {
// useGameSearchBar finds and stores similar games
    const {query, setQuery, results, noResults} = useGameSearchBar();

    // I store the database query into completedResults
    const [completedResults, setCompletedResults] = useState<databaseTypes[] | null>(null);

    // Allows me to switch pages (GameDetails)
    const navigate = useNavigate();

    // reusable script for filtering games from DB
    const {
        filteredResults,
        filterCategories, setFilterCategories,
        filterOrder, setFilterOrder,
        filterSearch, setFilterSearch,
    } = useDatabaseFilter(completedResults);

    const gamesCount = filteredResults?.length ?? 0;

    // uses as a dropdown menu to edit your score
    const [editScoreId, setEditScoreID] = useState<number | null>(null);
    const scoreContainerRef = useRef<HTMLUListElement | null>(null);

    {/*--------------------------------  
        Grab completed games from DB
    ---------------------------------*/}
    useEffect(() => {
        if (!completedResults) {
            const search = async () => {
                const response = await fetch(`http://127.0.0.1:8000/completed`);
                const data = await response.json();

                setCompletedResults(data);
            }
            search();
        }
    }, [completedResults]);

    {/*--------------------------------  
        Update favorite status of a game in the completed location
    ---------------------------------*/}
    const updateFavoriteStatus = async (game: databaseTypes) => {
        if (!completedResults || !game) return;

        // Flips the favorite status
        const newFavoriteStatus = !game.favorite;

        const response = await fetch(`http://127.0.0.1:8000/library/update_favorite/${game.igdb_id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                favorite: newFavoriteStatus,
            }),
        })

        if (!response.ok) {
            throw new Error("Failed to update favorite status");
        }

        // forces the game to refresh so it has the new favorite status
        setCompletedResults(prev =>
            prev?.map(g =>
                g.igdb_id === game.igdb_id
                    ? { ...g, favorite: newFavoriteStatus }
                    : g
            ) ?? null
        );
    };

    {/*--------------------------------  
        Update finished_story of a game in the completed location
    ---------------------------------*/}
    const updateFinishedStoryStatus = async (game: databaseTypes) => {
        if (!completedResults || !game) return;

        // Flips the finished_story status
        const newFinishedStoryStatus = game.finished_story === 1 ? 0 : 1;

        const response = await fetch(`http://127.0.0.1:8000/library/update_finished_story/${game.igdb_id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                finished_story: newFinishedStoryStatus,
            }),
        })

        if (!response.ok) {
            throw new Error("Failed to update finished_story status");
        }

        // forces the game to refresh so it has the new finished_story status
        setCompletedResults(prev =>
            prev?.map(g =>
                g.igdb_id === game.igdb_id
                    ? { ...g, finished_story: newFinishedStoryStatus }
                    : g
            ) ?? null
        );
    };

    {/*--------------------------------  
        Update user_score of a game in the completed location
    ---------------------------------*/}
    const updateUserScore = async (game: databaseTypes, newUserScore: number) => {
        if (!completedResults || !game) return;

        const response = await fetch(`http://127.0.0.1:8000/library/update_user_score/${game.igdb_id}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_score: newUserScore,
            }),
        })

        if (!response.ok) {
            throw new Error("Failed to update user_score");
        }

        // forces the game to refresh so it has the new finished_story status
        setCompletedResults(prev =>
            prev?.map(g =>
                g.igdb_id === game.igdb_id
                    ? { ...g, user_score: newUserScore }
                    : g
            ) ?? null
        );
    };

    {/*--------------------------------  
        If the user clicks out of edit user_score widget the widget closes
    ---------------------------------*/}
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (scoreContainerRef.current && !scoreContainerRef.current.contains(event.target as Node)) {
                setEditScoreID(null);
            }
        };
        
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }

    }, []);

    return (
        <div className="completed_page">

            {/* Displays the search bar UI for similar games */}
            <TopRow
                title="Completed Games"
                showSearch={true}
                query={query}
                setQuery={setQuery}
                results={results}
                noResults={noResults}
            />

            <div className="completed_body">
                {/* Allows the user to filter their list of games */}
                <DatabaseFilter
                    filterSearch={filterSearch}
                    setFilterSearch={setFilterSearch}
                    filterCategories={filterCategories}
                    setFilterCategories={setFilterCategories}
                    filterOrder={filterOrder}
                    setFilterOrder={setFilterOrder}
                    filterOptions={completedFilterOptions}
                />

                {/* Displays a count for how many games are showing */}
                <span className="completed_results_count">{gamesCount} GAMES</span>

                {/* The format for the game cards */}
                <ul className="completed_game_cards_layout">
                    {/* filterResults is the user games after applying the filters from DatabaseFilter */}
                    {filteredResults && filteredResults.map ((game, index) => 
                        <li className="completed_game_card">

                            <div className="completed_game_card_top">
                                {/* Left side is the favorite star UI and the row number */}
                                <div className="completed_game_card_left">
                                    {game.favorite ? (
                                        <img 
                                            src={starFavorite ?? ""} 
                                            alt="Favorite"
                                            onClick={() => updateFavoriteStatus(game)}
                                        />
                                    ) : (
                                        <img 
                                            src={starNotFavorite ?? ""} 
                                            alt="Not Favorite"
                                            onClick={() => updateFavoriteStatus(game)}
                                        />
                                    )}
                                    <span className="completed_row">{index + 1}</span>
                                </div> {/* End of completed_game_card_left */}
                                
                                {/* Displays the cover art of a game */}
                                <div className="completed_game_card_cover_art">
                                    {/* If the user clicks on the cover art they are redirected to game store page */}
                                    <img 
                                        src={game.image_url ?? ""}
                                        onClick={() => navigate(`/games/${game.igdb_id}`)}
                                    />
                                </div> {/* End of completed_game_card_cover_art */}

                                {/* Middle has game title, platforms, release date, review score, and howlongtobeat data */}
                                <div className="completed_game_card_middle">

                                    {/* Format for just title and platforms*/}
                                    <div className="completed_game_card_title_and_platforms">
                                        {/* If user click on the title they are redirected to that games store page */}
                                        <span 
                                            className="completed_game_card_title"
                                            onClick={() => navigate(`/games/${game.igdb_id}`)}
                                        >
                                            {game.game_title}
                                        </span>
                                        <span className="completed_game_card_platforms">{game.platforms ?? ""}</span>
                                    </div> {/* End of completed_game_card_title_and_platforms */}

                                    {/* Format for just release data and review score */}
                                    <div className="completed_game_card_release_date_and_score_layout">
                                        <div className="completed_game_card_release_date">
                                            <span>RELEASE DATE: <span className="completed_game_card_release_date_result">{game.release_date ?? "UNKNOWN"}</span></span>
                                        </div> {/* End of completed_game_card_release_date */}

                                        <div className="completed_game_card_review_score">
                                            <span>REVIEW SCORE: {" "}
                                                {game.review_score != null && game.review_score < 40 ? (
                                                    <span className="completed_game_card_review_score_result_red">{game.review_score}%</span>
                                                ): game.review_score != null && game.review_score < 80 ? (
                                                    <span className="completed_game_card_review_score_result_yellow">{game.review_score}%</span>
                                                ): game.review_score != null && game.review_score >= 80 ? (
                                                    <span className="completed_game_card_review_score_result_blue">{game.review_score}%</span>
                                                ): "UNKNOWN"}   
                                            </span>
                                        </div> {/* End of completed_game_card_review_score */}

                                    </div>{/* End of completed_game_card_release_date_and_score_layout */}

                                    {/* Format for just HLTB data */}
                                    <div className="completed_game_card_hltb">
                                        <span>MAIN STORY: <span className="completed_game_card_hltb_result">{game.main_story != null ? Math.round(game.main_story): "--"} Hrs</span></span>
                                        <span>MAIN + EXTRA: <span className="completed_game_card_hltb_result">{game.main_extra != null ? Math.round(game.main_extra): "--"} Hrs</span></span>
                                        <span>COMPLETIONIST: <span className="completed_game_card_hltb_result">{game.completionist != null ? Math.round(game.completionist) : "--"} Hrs</span></span>
                                        <span>ALL STYLES: <span className="completed_game_card_hltb_result">{game.all_styles != null ? Math.round(game.all_styles) : "--"} Hrs</span></span>                                   
                                    </div> {/* End of completed_game_card_hltb */}

                                </div> {/* End of completed_game_card_middle */}

                                {/* Right side of game card only has added date */}
                                <div className="completed_game_card_right">
                                    <span>Added on {game.added_date.split(' ')[0] ?? "UNKNOWN"}</span>
                                </div> {/* End of completed_game_card_right */}
                            </div>
                            
                            {/* Bottom of game card */}
                            <div className="completed_game_card_bottom">
                                
                                <div className="completed_user_score_container">
                                    <span
                                        className="completed_user_score"
                                        onClick={() => setEditScoreID(game.igdb_id)}
                                    >
                                        YOUR SCORE: <span className="completed_user_score_color">{game.user_score ?? "--"}/10</span>
                                    </span>

                                    {editScoreId === game.igdb_id && (
                                        <ul className="completed_user_score_widget" ref={scoreContainerRef}>
                                            <li onClick={() => updateUserScore(game, 0)}>0</li>
                                            <li onClick={() => updateUserScore(game, 1)}>1</li>
                                            <li onClick={() => updateUserScore(game, 2)}>2</li>
                                            <li onClick={() => updateUserScore(game, 3)}>3</li>
                                            <li onClick={() => updateUserScore(game, 4)}>4</li>
                                            <li onClick={() => updateUserScore(game, 5)}>5</li>
                                            <li onClick={() => updateUserScore(game, 6)}>6</li>
                                            <li onClick={() => updateUserScore(game, 7)}>7</li>
                                            <li onClick={() => updateUserScore(game, 8)}>8</li>
                                            <li onClick={() => updateUserScore(game, 9)}>9</li>
                                            <li onClick={() => updateUserScore(game, 10)}>10</li>
                                        </ul>
                                    )}
                                </div> {/* completed_user_score_container */}

                                {game.finished_story ? (
                                        <span className="completed_finished_story" onClick={() => updateFinishedStoryStatus(game)}>
                                            FINISHED STORY: <span className="completed_finished_story_color">YES</span>
                                        </span>
                                    ) : (
                                        <span className="completed_finished_story" onClick={() => updateFinishedStoryStatus(game)}>
                                            FINISHED STORY: <span className="completed_finished_story_color">NO</span>
                                        </span>
                                )}
                                <span className="completed_completed_date">COMPLETED DATE: <span className="completed_completed_date_color">{game.completed_date}</span></span>
                            </div> {/* completed_game_card_bottom */}
                        </li>
                    )}
                </ul>

            </div> {/* End of completed_body */}

        </div>
    );
}

export default Completed;