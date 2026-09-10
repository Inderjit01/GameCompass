import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import TopRow from "../components/TopRow";
import useGameSearchBar from "../hooks/useGameSearchBar";
import DatabaseFilter from "../components/DatabaseFilter";
import { baseFilterOptions } from "../constants/DatabaseFilterOptions"

import type { databaseTypes } from "../types/Database";

import starNotFavorite from "../assets/images/star-not-favorite.svg";
import starFavorite from "../assets/images/star-favorite.svg";
import useDatabaseFilter from "../hooks/useDatabaseFilter";

import "../styles/backlog.css";

function Backlog () {
    
    // useGameSearchBar finds and stores similar games
    const {query, setQuery, results, noResults} = useGameSearchBar();

    // I store the database query into backlogResults
    const [backlogResults, setBacklogResults] = useState<databaseTypes[] | null>(null);

    // Allows me to switch pages (GameDetails)
    const navigate = useNavigate();

    // reusable script for filtering games from DB
    const {
        filteredResults,
        filterCategories, setFilterCategories,
        filterOrder, setFilterOrder,
        filterSearch, setFilterSearch,
    } = useDatabaseFilter(backlogResults);

    {/*--------------------------------  
        Grab backlog games from DB
    ---------------------------------*/}
    useEffect(() => {
        if (!backlogResults) {
            const search = async () => {
                const response = await fetch(`http://127.0.0.1:8000/backlog`);
                const data = await response.json();

                setBacklogResults(data);
            }
            search();
        }
    }, [backlogResults]);

    {/*--------------------------------  
        Update favorite status of a game in the backlog
    ---------------------------------*/}
    const updateFavoriteStatus = async (game: databaseTypes) => {
        if (!backlogResults || !game) return;

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
        setBacklogResults(prev =>
            prev?.map(g =>
                g.igdb_id === game.igdb_id
                    ? { ...g, favorite: newFavoriteStatus }
                    : g
            ) ?? null
        );
    };

    return (
        <div className="backlog_page">

            {/* Displays the search bar UI for similar games */}
            <TopRow
                title="Your Backlog"
                showSearch={true}
                query={query}
                setQuery={setQuery}
                results={results}
                noResults={noResults}
            />

            <div className="backlog_body">
                {/* Allows the user to filter their list of games */}
                <DatabaseFilter
                    filterSearch={filterSearch}
                    setFilterSearch={setFilterSearch}
                    filterCategories={filterCategories}
                    setFilterCategories={setFilterCategories}
                    filterOrder={filterOrder}
                    setFilterOrder={setFilterOrder}
                    filterOptions={baseFilterOptions}
                />

                {/* The format for the game cards */}
                <ul className="backlog_game_cards_layout">
                    {/* filterResults is the user games after applying the filters from DatabaseFilter */}
                    {filteredResults && filteredResults.map ((game, index) => 
                        <li className="backlog_game_card">
                            
                            {/* Left side is the favorite star UI and the row number */}
                            <div className="backlog_game_card_left">
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
                                <span className="backlog_row">{index + 1}</span>
                            </div> {/* End of backlog_game_card_left */}
                            
                            {/* Displays the cover art of a game */}
                            <div className="backlog_game_card_cover_art">
                                {/* If the user clicks on the cover art they are redirected to game store page */}
                                <img 
                                    src={game.image_url ?? ""}
                                    onClick={() => navigate(`/games/${game.igdb_id}`)}
                                />
                            </div> {/* End of backlog_game_card_cover_art */}

                            {/* Middle has game title, platforms, release date, review score, and howlongtobeat data */}
                            <div className="backlog_game_card_middle">

                                {/* Format for just title and platforms*/}
                                <div className="backlog_game_card_title_and_platforms">
                                    {/* If user click on the title they are redirected to that games store page */}
                                    <span 
                                        className="backlog_game_card_title"
                                        onClick={() => navigate(`/games/${game.igdb_id}`)}
                                    >
                                        {game.game_title}
                                    </span>
                                    <span className="backlog_game_card_platforms">{game.platforms ?? ""}</span>
                                </div> {/* End of backlog_game_card_title_and_platforms */}

                                {/* Format for just release data and review score */}
                                <div className="backlog_game_card_release_date_and_score_layout">
                                    <div className="backlog_game_card_release_date">
                                        <span>RELEASE DATE: <span className="backlog_game_card_release_date_result">{game.release_date ?? "UNKNOWN"}</span></span>
                                    </div> {/* End of backlog_game_card_release_date */}

                                    <div className="backlog_game_card_review_score">
                                        <span>REVIEW SCORE: {" "}
                                            {game.review_score != null && game.review_score < 40 ? (
                                                <span className="backlog_game_card_review_score_result_red">{game.review_score}%</span>
                                            ): game.review_score != null && game.review_score < 80 ? (
                                                <span className="backlog_game_card_review_score_result_yellow">{game.review_score}%</span>
                                            ): game.review_score != null && game.review_score >= 80 ? (
                                                <span className="backlog_game_card_review_score_result_blue">{game.review_score}%</span>
                                            ): "UNKNOWN"}   
                                        </span>
                                    </div> {/* End of backlog_game_card_review_score */}

                                </div>{/* End of backlog_game_card_release_date_and_score_layout */}

                                {/* Format for just HLTB data */}
                                <div className="backlog_game_card_hltb">
                                    <span>MAIN STORY: <span className="backlog_game_card_hltb_result">{game.main_story != null ? Math.round(game.main_story): "UNKNOWN"} Hrs</span></span>
                                    <span>MAIN + EXTRA: <span className="backlog_game_card_hltb_result">{game.main_extra != null ? Math.round(game.main_extra): "UNKNOWN"} Hrs</span></span>
                                    <span>COMPLETIONIST: <span className="backlog_game_card_hltb_result">{game.completionist != null ? Math.round(game.completionist) : "UNKNOWN"} Hrs</span></span>
                                    <span>ALL STYLES: <span className="backlog_game_card_hltb_result">{game.all_styles != null ? Math.round(game.all_styles) : "UNKNOWN"} Hrs</span></span>                                   
                                </div> {/* End of backlog_game_card_hltb */}

                            </div> {/* End of backlog_game_card_middle */}

                            {/* Right side of game card only has added date */}
                            <div className="backlog_game_card_right">
                                <span>Added on {game.added_date.split(' ')[0] ?? "UNKNOWN"}</span>
                            </div> {/* End of backlog_game_card_right */}
                            
                        </li>
                    )}
                </ul>

            </div> {/* End of backlog_body */}

        </div>
    );
}

export default Backlog;