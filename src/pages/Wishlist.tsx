import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import TopRow from "../components/TopRow";
import useGameSearchBar from "../hooks/useGameSearchBar";
import DatabaseFilter from "../components/DatabaseFilter";
import useDatabaseFilter from "../hooks/useDatabaseFilter";

import { wishlistFilterOptions } from "../constants/DatabaseFilterOptions"

import type { WishlistType, WishlistGameInfo } from "../types/Wishlist";
import type { databaseTypes } from "../types/Database";

import pageLoadingScreen from "../assets/videos/page-loading-screen.mp4"
import starNotFavorite from "../assets/images/star-not-favorite.svg";
import starFavorite from "../assets/images/star-favorite.svg";
import xboxLogo from "../assets/images/xbox_logo.png";
import playstationLogo from "../assets/images/playstation_logo.png"

import "../styles/Wishlist.css";

// This is for wishlist categories since these do no exists in databaseTypes
// These one are for prices
function hasStore(game: databaseTypes | WishlistGameInfo): game is WishlistGameInfo {
    return "cheapest_store" in game;
}
function hasAlwaysFree(game: databaseTypes | WishlistGameInfo): game is WishlistGameInfo {
    return "always_free" in game;
}
function hasInitialPrice(game: databaseTypes | WishlistGameInfo): game is WishlistGameInfo {
    return "initial_formatted" in game;
}
function hasFinalPrice(game: databaseTypes | WishlistGameInfo): game is WishlistGameInfo {
    return "final_formatted" in game;
}
function hasDiscount(game: databaseTypes | WishlistGameInfo): game is WishlistGameInfo {
    return "discount_percent" in game;
}

// These ones are for subscriptions
function hasGamePass(game: databaseTypes | WishlistGameInfo): game is WishlistGameInfo {
    return "game_pass" in game;
}
function hasPlaystationEssential(game: databaseTypes | WishlistGameInfo): game is WishlistGameInfo {
    return "playstation_essential" in game;
}
function hasPlaystationExtra(game: databaseTypes | WishlistGameInfo): game is WishlistGameInfo {
    return "playstation_extra" in game;
}
function hasPlaystationPremium(game: databaseTypes | WishlistGameInfo): game is WishlistGameInfo {
    return "playstation_premium" in game;
}


function Wishlist () {
    // useGameSearchBar finds and stores similar games
    const {query, setQuery, results, noResults} = useGameSearchBar();

    const navigate = useNavigate();

    const [wishlistResults, setWishlistResults] = useState<WishlistType | null>(null);
    const wishlistGames = wishlistResults?.games;
    

    useEffect(() => {
        console.log(wishlistGames)
    }, [wishlistGames])

    // reusable script for filtering games from DB
    const {
        filteredResults,
        filterCategories, setFilterCategories,
        filterOrder, setFilterOrder,
        filterSearch, setFilterSearch,
    } = useDatabaseFilter(wishlistGames ?? null);


    {/* -----------------------------------------------------------------------------
        Gets the wishlisted games from the DB along with the prices for those games
    -------------------------------------------------------------------------------- */}
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;

        const search = async() => {
            try {
                const response = await fetch(`http://127.0.0.1:8000/wishlist`)
                if (!response.ok) {
                    throw new Error("Failed to get wishlisted games!");
                }

                const data = await response.json();
                setWishlistResults(data);

                if (data.cache_done) {
                    clearInterval(interval);
                }

            } catch (error) {
                console.error(error);
            }
        };

        search ();

        interval = setInterval(search, 1000);

        return () => {
            clearInterval(interval);
        };

    }, []);

    {/*--------------------------------  
        Update favorite status of a game in the wishlist
    ---------------------------------*/}
    const updateFavoriteStatus = async (game: databaseTypes) => {
        if (!wishlistResults || !game) return;

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
        setWishlistResults(prev =>
            prev ? {
                ...prev,
                games: prev.games.map(g =>
                    g.igdb_id === game.igdb_id
                        ? { ...g, favorite: newFavoriteStatus }
                        : g
                ),
            }
            : null
        );
    };

    return (
        <div className="wishlist_page">

            {/* Displays the search bar UI for similar games */}
            <TopRow 
                title={"Your Wishlist"}
                query={query}
                showSearch={true}
                setQuery={setQuery}
                results={results}
                noResults={noResults}
            />

            {!wishlistResults?.cache_done ? (
                <video 
                    src={pageLoadingScreen}
                    autoPlay
                    loop
                    muted
                    playsInline
                />
            ) : (
                <div className="wishlist_body">
                    {/* Allows the user to filter their list of games */}
                    <DatabaseFilter
                        filterSearch={filterSearch}
                        setFilterSearch={setFilterSearch}
                        filterCategories={filterCategories}
                        setFilterCategories={setFilterCategories}
                        filterOrder={filterOrder}
                        setFilterOrder={setFilterOrder}
                        filterOptions={wishlistFilterOptions}
                    />
                    {/* The format for the game cards */}
                    <ul className="wishlist_game_cards_layout">
                        {/* filterResults is the user games after applying the filters from DatabaseFilter */}
                        {filteredResults && filteredResults.map ((game, index) => 
                            <li className="wishlist_game_card">
                                
                                {/* Left side is the favorite star UI and the row number */}
                                <div className="wishlist_game_card_left">
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
                                    <span className="wishlist_row">{index + 1}</span>
                                </div> {/* End of wishlist_game_card_left */}
                                
                                {/* Displays the cover art of a game */}
                                <div className="wishlist_game_card_cover_art">
                                    {/* If the user clicks on the cover art they are redirected to game store page */}
                                    <img 
                                        src={game.image_url ?? ""}
                                        onClick={() => navigate(`/games/${game.igdb_id}`)}
                                    />
                                </div> {/* End of wishlist_game_card_cover_art */}

                                {/* Middle has game title, platforms, release date, review score, and howlongtobeat data */}
                                <div className="wishlist_game_card_middle">

                                    {/* Format for just title and platforms*/}
                                    <div className="wishlist_game_card_title_and_platforms">
                                        {/* If user click on the title they are redirected to that games store page */}
                                        <span 
                                            className="wishlist_game_card_title"
                                            onClick={() => navigate(`/games/${game.igdb_id}`)}
                                        >
                                            {game.game_title}
                                        </span>
                                        <span className="wishlist_game_card_platforms">{game.platforms ?? ""}</span>
                                    </div> {/* End of wishlist_game_card_title_and_platforms */}

                                    {/* Format for just release data and review score */}
                                    <div className="wishlist_game_card_release_date_and_score_layout">
                                        <div className="wishlist_game_card_release_date">
                                            <span>RELEASE DATE: <span className="wishlist_game_card_release_date_result">{game.release_date ?? "UNKNOWN"}</span></span>
                                        </div> {/* End of wishlist_game_card_release_date */}

                                        <div className="wishlist_game_card_review_score">
                                            <span>REVIEW SCORE: {" "}
                                                {game.review_score != null && game.review_score < 40 ? (
                                                    <span className="wishlist_game_card_review_score_result_red">{game.review_score}%</span>
                                                ): game.review_score != null && game.review_score < 80 ? (
                                                    <span className="wishlist_game_card_review_score_result_yellow">{game.review_score}%</span>
                                                ): game.review_score != null && game.review_score >= 80 ? (
                                                    <span className="wishlist_game_card_review_score_result_blue">{game.review_score}%</span>
                                                ): "UNKNOWN"}   
                                            </span>
                                        </div> {/* End of wishlist_game_card_review_score */}

                                    </div>{/* End of wishlist_game_card_release_date_and_score_layout */}

                                    {/* Format for just HLTB data */}
                                    <div className="wishlist_game_card_hltb">
                                        <span>MAIN STORY: <span className="wishlist_game_card_hltb_result">{game.main_story != null ? Math.round(game.main_story): "--"} Hrs</span></span>
                                        <span>MAIN + EXTRA: <span className="wishlist_game_card_hltb_result">{game.main_extra != null ? Math.round(game.main_extra): "--"} Hrs</span></span>
                                        <span>COMPLETIONIST: <span className="wishlist_game_card_hltb_result">{game.completionist != null ? Math.round(game.completionist) : "--"} Hrs</span></span>
                                        <span>ALL STYLES: <span className="wishlist_game_card_hltb_result">{game.all_styles != null ? Math.round(game.all_styles) : "--"} Hrs</span></span>                                   
                                    </div> {/* End of wishlist_game_card_hltb */}

                                </div> {/* End of wishlist_game_card_middle */}

                                {/* Right side of game card only has added date */}
                                <div className="wishlist_game_card_right">
                                    <span className="wishlist_added_date">Added on {game.added_date.split(' ')[0] ?? "UNKNOWN"}</span>
                                    
                                    {/* If the game is part of a subscription it is displayed here */}
                                    <div className="wishlist_subscriptions">
                                        {/* Xbox Subscriptions */}
                                        {hasGamePass(game) && game.game_pass && (
                                            <div className="wishlist_subscription_type">   
                                                <img src={xboxLogo ?? ""} />
                                                <span>Game Pass</span>
                                            </div>
                                        )}
                                        {/* Playstation Subscriptions*/}
                                        {hasPlaystationEssential(game) && game.playstation_essential && (
                                            <div className="wishlist_subscription_type">
                                                <img src={playstationLogo ?? ""}/>
                                                <span>Essential</span>
                                            </div>
                                        )}
                                        {hasPlaystationExtra(game) && game.playstation_extra && (
                                            <div className="wishlist_subscription_type">
                                                <img src={playstationLogo ?? ""}/>
                                                <span>Extra</span>
                                            </div>
                                        )}
                                        {hasPlaystationPremium(game) && game.playstation_premium && (
                                            <div className="wishlist_subscription_type">
                                                <img src={playstationLogo ?? ""}/>
                                                <span>Premium</span>
                                            </div>
                                        )}
                                    </div> {/* End of wishlist_subscriptions */}
                                    
                                    {/* Displays the cheapest price for the game. Has different formats based on the price */}
                                    <div className="wishlist_store_prices">
                                        {hasAlwaysFree(game) && game.always_free === true ? (
                                            <div className="wishlist_no_price">
                                                <p>FREE TO PLAY</p>
                                            </div>
                                        ) : hasDiscount(game) && game.discount_percent && game.discount_percent !== null && hasInitialPrice(game) && game.initial_formatted && hasFinalPrice(game) && game.final_formatted ? (
                                            <>
                                                {hasStore(game) && game.cheapest_store && (
                                                    <span className="wishlist_cheapest_store">{game.cheapest_store.toUpperCase() ?? "Unknown"}</span>
                                                )}
                                                <div className="wishlist_price_discount">
                                                    
                                                    <p>{game.discount_percent}</p>
                                                    <div className="wishlist_full_to_discount">
                                                        <p>{game.initial_formatted}</p>
                                                        <p>{game.final_formatted}</p>
                                                    </div>
                                                </div>
                                            </>  
                                        ): hasFinalPrice(game) && game.final_formatted ? (
                                            <div className="wishlist_full_price">
                                                <span>{game.final_formatted}</span>
                                            </div>
                                        ): (
                                            <div className="wishlist_no_price">
                                                <p>NO PRICE FOUND</p>
                                            </div>
                                        )}
                                    </div> {/* End of wishlist_store_prices */}
                                </div> {/* End of wishlist_game_card_right */}
                                
                            </li>
                        )}
                    </ul>
                {/* End of wishlist_body */}
                </div>
            )}
        {/* End of wishlist_page */}
        </div>
    );
}

export default Wishlist;