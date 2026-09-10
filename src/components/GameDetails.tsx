import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import useGameSearchBar from "../hooks/useGameSearchBar";
import TopRow from "./TopRow.tsx";

import thumbsUp from "../assets/images/thumbs-up.svg";
import thumbsDown from "../assets/images/thumbs-down.svg";
import loadingScreen from "../assets/videos/page-loading-screen.mp4"
import checkbox from "../assets/images/checkbox.png"

import type { GameDetails } from "../types/GameDetails.ts"
import type { SelectedMedia } from "../types/SelectedMedia.ts";

import "../styles/GameDetails.css";

function GameDetailsPage (){

    // useGameSearchBar finds and stores similar games
    const {query, setQuery, results} = useGameSearchBar();

    // Stores a igbd_id that is passed with the url when displaying GameDetails page
    const { igdb_id } = useParams();

    // libraryLocation is used to check the current location of the game in the database. If it is not in the database then it is none
    const [libraryLocation, setLibraryLocation] = useState<"backlog" | "wishlist" | "completed" | null>(null);

    // Stores the API results from IGDB, STEAM, NINTENDO, PLAYSTATION, and XBOX
    const [APIResults, setAPIResults] = useState<GameDetails | null>(null);

    // Keeps track of the Movie or Screenshot to be displayed on the big screen version
    const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
    
    // Keeps track of which review is being expanding to see full message
    const [expandedReview, setExpandedReview] = useState<string | null>(null);

    /* ------------------------------------------
        Variables from API coverted to shortcuts
    ------------------------------------------- */
    const game_title = APIResults?.steam?.basic_info?.name ?? APIResults?.igdb?.game_title;

    // left side of basic info
    const movies = APIResults?.steam?.basic_info?.movies ?? APIResults?.igdb?.movies;
    const screenshots = APIResults?.steam?.basic_info?.screenshots ?? APIResults?.igdb?.screenshots;
    
    // right side of basic info
    const headerImage = APIResults?.steam?.basic_info?.header_image ?? APIResults?.igdb?.artwork;
    const shortDescription = APIResults?.steam?.basic_info?.short_description ?? APIResults?.igdb?.short_description;
    // reviewPositiveCount and reviewTotalCount is only used for calculating positiveReviewPercentage
    const reviewPositiveCount = APIResults?.steam?.reviews?.query_summary?.total_positive ?? 0;
    const reviewTotalCount = APIResults?.steam?.reviews?.query_summary?.total_reviews ?? 0;
    const positiveReviewPercentage =
        reviewTotalCount > 0
            ? Math.round((reviewPositiveCount / reviewTotalCount) * 100)
            : APIResults?.igdb?.rating;
    const comingSoon = APIResults?.steam?.basic_info?.release_date?.coming_soon ?? false;
    const releaseDate = APIResults?.steam?.basic_info?.release_date?.date ?? APIResults?.igdb?.released ?? "";
    const developers = APIResults?.steam?.basic_info?.developers ?? APIResults?.igdb?.developers;
    const publishers = APIResults?.steam?.basic_info?.publishers ?? APIResults?.igdb?.publishers;

    // left side of body middle
    const prices = APIResults?.prices
        ? Object.entries(APIResults.prices).filter(([_, price]) => price !== null)
        : [];
    
    // right side of body middle
    const howLongToBeat = APIResults?.hltb ?? null;

    // bottom left of reviews
    const reviews = APIResults?.steam?.reviews?.reviews ?? null;
    // bottom right of reviews
    const recentReviews = APIResults?.steam?.recent_reviews?.reviews ?? null;

    /* ------------------------------------------------------------------------------------------------
       Get game information and reset old values from previous searches whenever there is a new igdb_id
    ------------------------------------------------------------------------------------------------ */
    useEffect(() => {
        if (!igdb_id) return;

        setAPIResults(null);
        setSelectedMedia(null);
        setExpandedReview(null);

        const search = async () => {
            const response = await fetch(`http://127.0.0.1:8000/games/${igdb_id}`)
            if (!response.ok) {
                    throw new Error("Failed to get game information from APIs");
            }

            const data = await response.json();
            setAPIResults(data);
        }
        search();
    }, [igdb_id]);

    /* --------------------------------------------------------------------
       Automatically select first media to display when page first loads
    -------------------------------------------------------------------- */
    useEffect(() => {
        if (selectedMedia) return;

        // If the game has a trailer display the trailer otherwise look for a screenshot in next if statement
        if (movies && movies.length > 0) {
            const movie = movies[0];

            setSelectedMedia({
                type: "movie",
                id: movie.id,
                thumbnail: movie.thumbnail ?? "",
                hls_h264: "hls_h264" in movie ? movie.hls_h264 : null,
                youtube: "youtube" in movie ? movie.youtube : null,
            });

            return;
        }

        // If there is no trailer display a screenshot if available
        if (screenshots && screenshots.length > 0) {
            const screenshot = screenshots[0];

            setSelectedMedia({
                type: "screenshot",
                id: screenshot.id,
                path_thumbnail: screenshot.path_thumbnail ?? "",
                path_full: screenshot.path_full ?? "",
            });
        }
    }, [movies, screenshots, selectedMedia])

    /* ----------------------------------------------------------------------------------------------------
       Send game info to database for saving or deleting when user selects backlog, wishlist, or completed
    ---------------------------------------------------------------------------------------------------- */
    const addToLibrary = async (status: "backlog" | "wishlist" | "completed") => {
        if (!igdb_id || !APIResults) return;

        // If the game was already saved at that location (libaryLocation) that mean the user is trying to remove it from the DB
        else if (libraryLocation && libraryLocation === status) {
            const response = await fetch(`http://127.0.0.1:8000/library/remove/${igdb_id}`, {
                method: "POST",
                headers: {"Content-Type": "application/json",},
                body: JSON.stringify({
                    status,
                })
            })

            if (!response.ok) {
            throw new Error("Failed to remove game");
            }

            setLibraryLocation(null);
        }

        /*
         If the user didn't select the same button that mean the user is add the game to the DB 
         or wants to change the location of the game between backlog, wishlist, or compelted
        */
        else {
            const response = await fetch(`http://127.0.0.1:8000/library/add/${igdb_id}`, {
                method: "POST",
                headers: {"Content-Type": "application/json",},
                body: JSON.stringify({
                    status,
                    game_data: APIResults,
                })
            })

            if (!response.ok) {
            throw new Error("Failed to add game");
            }
            
            setLibraryLocation(status)
        }
    };

    /* ----------------------------------------------------------------------------------------
       Get library_status variable from DB to see if the game is in the user's library already
    ---------------------------------------------------------------------------------------- */
        useEffect (() => {
            if (!igdb_id) return;

            const search = async () => {
                const response = await fetch(`http://127.0.0.1:8000/library/location/${igdb_id}`);
                if (!response.ok) {
                    throw new Error("Failed to get library location");
                }

                const data = await response.json();

                setLibraryLocation(data);
            }
            search();
        }, [igdb_id])

    return (
        <div className="game_details_page">

            {/* Search bar to find similar games based on user input */}
            <TopRow 
                title= "Store Page"
                showSearch={true}
                query = {query}
                setQuery = {setQuery}
                results = {results}
            />

            {/* Load the loading screen until we get the API data into APIResults */}
            {!APIResults ? (
                <video 
                    src={loadingScreen}
                    autoPlay
                    loop
                    muted
                    playsInline
                /> 
            ): (
                <div className="store_body">
                    
                    {/* -------------------------------------------------------------------------------------------------------
                        Start of body top section

                        store_body_top contains the game title, big picture mode, screenshots, trailers, and basic game info
                    --------------------------------------------------------------------------------------------------------- */}
                    <div className="store_body_top">

                        {/* Background Layers for the store_body_top. Two layers of the first screenshot are used */}
                        <img className="gameColor" src={screenshots?.[0]?.path_full ?? ""} alt=""/>
                        <img className="gameTexture" src={screenshots?.[0]?.path_full ?? ""} alt=""/>
                        
                        <div className="store_body_top_content">
                            <h1>{game_title}</h1>

                            {/* This section show the images, videos, and basic description of the game */}
                            <div className="store_basic_info">

                                {/* Left side of basic info displays big image/trailer and the smaller version below it */}
                                <div className="store_basic_left">
                                    {/* -----------------------------
                                        Displays the large version of the movie or screenshot
                                    ----------------------------- */}
                                    <div className="store_main_media">

                                        {selectedMedia && selectedMedia.type === "movie" && (
                                            selectedMedia.hls_h264 ? (
                                                <video
                                                    src={selectedMedia.hls_h264 ?? ""}
                                                    controls
                                                    autoPlay
                                                />
                                            ): selectedMedia.youtube ? (
                                                <iframe
                                                    src={selectedMedia?.youtube ?? ""}
                                                    title="Game trailer"
                                                    allow="autoplay; encrypted-media"
                                                    allowFullScreen
                                                />
                                            )
                                        : null)}

                                        {selectedMedia && selectedMedia.type === "screenshot" && (
                                            <img
                                                src={selectedMedia.path_full ?? ""}
                                                alt=""
                                            />
                                        )}
                                    </div> {/* End of store_main_media */}
                                    {/* -----------------------------
                                        Displays the thumbnails
                                    ----------------------------- */}
                                    <ul>
                                        {movies && movies.map ( (m) =>
                                            <li
                                                key={m.id}
                                                onClick={() => 
                                                    setSelectedMedia({
                                                        type: "movie",
                                                        id: m.id,
                                                        thumbnail: m.thumbnail ?? "",
                                                        hls_h264: "hls_h264" in m ? m.hls_h264 : null,
                                                        youtube: "youtube" in m ? m.youtube : null,
                                                    })
                                                }
                                            >
                                                <img 
                                                    src={m.thumbnail ?? ""}
                                                    className={selectedMedia?.id == m.id ? "selected" : ""}
                                                />
                                            </li>
                                        )}
                                        {screenshots && screenshots.map ( (s) =>
                                            <li 
                                                key={s.id}
                                                onClick={() => 
                                                    setSelectedMedia({
                                                        type: "screenshot",
                                                        id: s.id,
                                                        path_thumbnail: s.path_thumbnail ?? "",
                                                        path_full: s.path_full ?? "",
                                                    })
                                                }
                                            >
                                                <img 
                                                    src={s.path_thumbnail ?? ""}
                                                    className={selectedMedia?.id === s.id ? "selected" : ""}
                                                />
                                            </li>
                                        )}
                                    </ul>
                                </div> {/* End of store_basic_left */}

                                {/* Right side of basic info displays the header image with details of the game */}
                                <div className="store_basic_right">

                                    <img src={headerImage ?? ""} alt=""/>

                                    <p className="store_game_short_description">{shortDescription ?? ""}</p>

                                    <div className="store_game_details_table">
                                        <p className="store_game_detail_name">REVIEW SCORE:</p>
                                        <p className="store_game_detail_result">{positiveReviewPercentage}%</p>

                                        <p className="store_game_detail_name">RELEASE DATE:</p>
                                        <p className="store_game_detail_result">{comingSoon ? "Coming Soon" :releaseDate}</p>

                                        <p className="store_game_detail_name">DEVELOPERS:</p>
                                        <p className="store_game_detail_result">{Array.isArray(developers) ? developers.join(", ") : developers}</p>

                                        <p className="store_game_detail_name">PUBLISHERS:</p>
                                        <p className="store_game_detail_result">{Array.isArray(publishers) ? publishers?.join(", "): publishers}</p>
                                    </div> {/* End of store_game_details_table */}

                                </div> {/* End of store_basic_right */}
                                
                            </div> {/* End of store_basic_info */}

                        </div> {/* End of store_body_top_content */}
                    </div> {/* End of store_body_top */}

                    {/* ---------------------------------------------------------
                        Start of store_body_middle
                        The middle of the body has the db row, prices, and hltb
                    ------------------------------------------------------------ */}
                    <div className="store_body_middle">
                        {/* Adds or removes game data from the DB*/}
                        <div className="store_db_row">
                            <button onClick={() => addToLibrary("backlog")}>
                                {libraryLocation && libraryLocation === "backlog" ? (
                                    <>
                                        <img className="store_checkbox" src={checkbox}/>
                                        On Backlog
                                    </>
                                ): "Add to Backlog"}
                            </button>
                            <button onClick={() => addToLibrary("wishlist")}>
                                {libraryLocation && libraryLocation === "wishlist" ? (
                                    <>
                                        <img className="store_checkbox" src={checkbox}/>
                                        On Wishlist
                                    </>
                                ): "Add to Wishlist"}
                            </button>
                            <button onClick={() => addToLibrary("completed")}>
                                {libraryLocation && libraryLocation === "completed" ? (
                                    <>
                                        <img className="store_checkbox" src={checkbox}/>
                                        On Completed
                                    </>
                                ): "Add to Completed"}
                            </button>
                        </div> {/* End of store_db_row */}
                        
                        <div className="store_price_hltb_overlay">
                            {/* Displays the price of the game from different stores */}
                            <div className="store_prices">
                                {prices.length > 0 ? (
                                    prices.map (([store, price]) => (
                                        <div className="store_price_row" key={store}>
                                            <p>{game_title} on {store}</p>

                                            {/* Every store api will have a different format*/}
                                            {/* Steam prices format */}
                                            {store === "steam" && (
                                                <>
                                                    {price.is_free === true ? (
                                                        <div className="store_no_price">
                                                            <p>Free To Play</p>
                                                        </div>
                                                    ): price.discount_percent && price.discount_percent > 0 && price.initial_formatted && price.final_formatted ? (
                                                        <div className="store_price_discount">
                                                            <p>-{price.discount_percent}%</p>
                                                            <div className="store_full_to_discount">
                                                                <p>{price.initial_formatted}</p>
                                                                <p>{price.final_formatted}</p>
                                                            </div>
                                                        </div>
                                                    ): price.final_formatted ? (
                                                        <div className="store_full_price">
                                                            <p>{price.final_formatted}</p>
                                                        </div>
                                                    ): (
                                                        <div className="store_no_price">
                                                            <p>No price found</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        {/* End of store_price_row */}
                                        </div> 
                                    ))
                                ) : (
                                    <div className="store_price_row">
                                        <p>{game_title} not available on any store for sale</p>
                                    </div>
                                )}
                            </div> {/* End of store_prices*/}

                            {/* Show HowLongToBeat data*/}
                            <div className="store_hltb">
                                <p>How Long to Beat:</p>
                                <div className="store_hltb_table">
                                    <div className="store_hltb_square">
                                        <p className="store_hltb_category">Main Story</p>
                                        <p className="store_hltb_hours">{howLongToBeat?.main_story ?? "Unknown"}</p>
                                    </div>

                                    <div className="store_hltb_square">
                                        <p className="store_hltb_category">Main + Side</p>
                                        <p className="store_hltb_hours">{howLongToBeat?.main_extra ?? "Unknown"}</p>
                                    </div>

                                    <div className="store_hltb_square">
                                        <p className="store_hltb_category">All Styles</p>
                                        <p className="store_hltb_hours">{howLongToBeat?.all_styles ?? "Unknown"}</p>
                                    </div>
                                    
                                    <div className="store_hltb_square">
                                        <p className="store_hltb_category">Completionist</p>
                                        <p className="store_hltb_hours">{howLongToBeat?.completionist ?? "Unknown"}</p>
                                    </div>
                                </div> {/* End of store_hltb_table */}
                            </div> {/* End of store_hltb */}
                        </div> {/* End of store_price_hltb_overlay */}

                    </div> {/* End of store_body_middle */}

                    {/* -----------------------------------------------------------------------------------
                        Start of store_body_end
                        This section has most popular reviews on the left and recent reviews on the right
                    ------------------------------------------------------------------------------------ */}
                    <div className="store_body_end">
                        {(reviews || recentReviews) && <hr />}

                        <div className="store_reviews_layout">

                            {/* Most popular reviews */}
                            {reviews && reviews?.length > 0 && (
                                <div className="store_reviews">
                                    <p>MOST HELPFUL REVIEWS</p>

                                    <div className="store_reviews_table">

                                        {reviews.map((review) => (
                                            <div className="store_review">

                                                {/* This section is info about the author */}
                                                <div className="store_review_author_profile">
                                                    <img src={`https://avatars.akamai.steamstatic.com/${review?.author?.avatar ?? ""}_full.jpg`} alt={`${review?.author?.personaname ?? "Unknown"}'s avatar`}/>
                                                    <div className="store_review_author_profile_info">
                                                        <span className="store_author_name">{review?.author?.personaname ?? "Unknown Author"}</span>
                                                        <div className="store_review_author_count_variable">
                                                            <span>{review?.author?.num_games_owned ?? "Unknown count of"} games <br/></span>
                                                            <span>{review?.author?.num_reviews ?? "Unkown count of"} reviews</span>
                                                        </div>
                                                    </div> 
                                                </div> {/* End of review_author_profile */}

                                                {/* This section has info on the authors current stats on the game being reviewed */}
                                                <div className="store_review_author_game_data">    
                                                    <div className="store_review_author_game_data_top">                                                
                                                        {review?.voted_up === true ? (
                                                            <img className="store_thumbs_up" src={thumbsUp} alt="Thumbs up"/>
                                                        ) : review?.voted_up === false ? (
                                                            <img className="store_thumbs_down" src={thumbsDown} alt="Thumbs down"/>                   
                                                        ): null}

                                                        <div className="store_review_author_game_data_right">
                                                            {review?.voted_up === true ? (
                                                                <p className="store_recommended_or_not">Recommended</p>
                                                            ) : review?.voted_up === false ? (
                                                                <p className="store_recommended_or_not">Not Recommended</p>
                                                            ): null}

                                                            {review?.author?.playtime_forever && review?.author?.playtime_at_review && review?.author?.playtime_forever !== review?.author?.playtime_at_review ? (
                                                                <p className="store_review_author_game_hours">{(review?.author?.playtime_forever / 60).toFixed(1)} hrs on record ({(review?.author?.playtime_at_review / 60).toFixed(1)} hrs at review time)</p>
                                                            ): review?.author?.playtime_forever ? (
                                                                <p className="store_review_author_game_hours">{(review?.author?.playtime_forever / 60).toFixed(1)} hrs on record</p>
                                                            ): null}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* The section is the authors reason for the review */}
                                                    <div className="store_review_author_game_data_bottom">
                                                        <p className="store_date_of_review">
                                                            POSTED: {review?.timestamp_created ? 
                                                                new Date(review.timestamp_created * 1000).toLocaleDateString("en-US", {
                                                                    month: "long",
                                                                    day: "numeric",
                                                                    year: "numeric"
                                                                }): "Unknown"}
                                                        </p>
                                                        <p className={`store_review_text ${expandedReview === review.recommendationid ? "expanded" : ""}`}>{review?.review ?? ""}</p>
                                                        <button 
                                                            className="store_read_more_button"
                                                            onClick={() => setExpandedReview(expandedReview === review.recommendationid ? null : review.recommendationid)}
                                                            >{expandedReview === review.recommendationid ? "Show Less" : "Read More"}
                                                        </button>
                                                    </div> {/* End of review_author_game_data_bottom */}

                                                </div> {/* End of review_author_game_data */}
    
                                            </div>
                                        ))}

                                    </div> {/* End of reviews_table */}
                                </div>
                            )}

                            {/* Recent Reviews */}
                            {recentReviews && recentReviews?.length > 0 && (
                                <div className="store_recent_reviews">
                                    <p>RECENTLY POSTED</p>

                                    <div className="store_recent_reviews_table">
                                        {recentReviews.map((newReview) => (
                                            <div className="store_recent_review">
                                                {/* This section has info about the author and their stats on the game */}
                                                <div className="store_recent_reviews_top">
                                                    {newReview?.voted_up === true ? (
                                                                <img className="store_thumbs_up_small" src={thumbsUp} alt="Thumbs up"/>
                                                            ) : newReview?.voted_up === false ? (
                                                                <img className="store_thumbs_down_small" src={thumbsDown} alt="Thumbs down"/>                   
                                                    ): null}
                                                    {newReview?.author?.personaname && (
                                                        <p className="store_recent_author_name">{newReview.author.personaname}</p>
                                                    )}
                                                    {newReview?.author?.playtime_at_review  && (
                                                        <p className="store_recent_author_game_hours">{(newReview?.author?.playtime_at_review / 60).toFixed(1)} hrs</p>
                                                    )}
                                                </div> {/* End of recent_reviews_top */}

                                                {/* This sections has info about the authors reason for the review */}
                                                <div className="store_recent_reviews_bottom">
                                                    <p className="store_date_of_review">
                                                        POSTED: {newReview?.timestamp_created ? 
                                                            new Date(newReview.timestamp_created * 1000).toLocaleDateString("en-US", {
                                                                month: "long",
                                                                day: "numeric",
                                                                year: "numeric"
                                                            }): "Unknown"}
                                                    </p>
                                                    <p className={`store_review_text ${expandedReview === newReview.recommendationid ? "expanded" : ""}`}>{newReview?.review ?? ""}</p>
                                                    <button 
                                                        className="store_read_more_button"
                                                        onClick={() => setExpandedReview(expandedReview === newReview.recommendationid ? null : newReview.recommendationid)}
                                                        >{expandedReview === newReview.recommendationid ? "Show Less" : "Read More"}
                                                    </button>
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                            )}

                        </div> {/* End of reviews_layout */}
                    </div>{/* End of body_end */}

                </div>
            )}
        </div> 
    )
}

export default GameDetailsPage;