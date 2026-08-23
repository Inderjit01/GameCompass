import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import "../styles/GameDetails.css";
import useGameSearchBar from "../hooks/useGameSearchBar";
import TopRow from "./TopRow.tsx";
import thumbsUp from "../assets/images/thumbs-up.svg";
import thumbsDown from "../assets/images/thumbs-down.svg";
import loadingScreen from "../assets/videos/page-loading-screen.mp4"
import checkbox from "../assets/images/checkbox.png"

import type { GameDetails } from "../types/GameDetails.ts"
import type { SelectedMedia } from "../types/SelectedMedia.ts";

function GameDetailsPage (){
    const {query, setQuery, results} = useGameSearchBar();

    const { igdb_id } = useParams();

    const [libraryLocation, setLibraryLocation] = useState<"backlog" | "wishlist" | "completed" | null>(null);

    const [APIResults, setAPIResults] = useState<GameDetails | null>(null);

    const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
    
    const [expandedReview, setExpandedReview] = useState<string | null>(null);
    /* -----------------------------
       Variables from API
    ----------------------------- */
    const game_title = APIResults?.steam?.basic_info?.name ?? APIResults?.igdb?.game_title;

    const movies = APIResults?.steam?.basic_info?.movies ?? APIResults?.igdb?.movies;
    const screenshots = APIResults?.steam?.basic_info?.screenshots ?? APIResults?.igdb?.screenshots;
    
    const headerImage = APIResults?.steam?.basic_info?.header_image ?? APIResults?.igdb?.artwork;
    const shortDescription = APIResults?.steam?.basic_info?.short_description ?? APIResults?.igdb?.short_description;
    const reviewPositiveCount = APIResults?.steam?.reviews?.query_summary?.total_positive ?? 0;
    const reivewTotalCount = APIResults?.steam?.reviews?.query_summary?.total_reviews ?? 0;
    const positiveReviewPercentage =
        reivewTotalCount > 0
            ? Math.round((reviewPositiveCount / reivewTotalCount) * 100)
            : APIResults?.igdb?.rating;
    const comingSoon = APIResults?.steam?.basic_info?.release_date?.coming_soon ?? false;
    const releaseDate = APIResults?.steam?.basic_info?.release_date?.date ?? APIResults?.igdb?.released ?? "";
    const developers = APIResults?.steam?.basic_info?.developers ?? APIResults?.igdb?.developers;
    const publishers = APIResults?.steam?.basic_info?.publishers ?? APIResults?.igdb?.publishers;

    const prices = APIResults?.prices
        ? Object.entries(APIResults.prices).filter(([_, price]) => price !== null)
        : [];
    
    const howLongToBeat = APIResults?.hltb ?? null;

    const reviews = APIResults?.steam?.reviews?.reviews ?? null;
    const recentReviews = APIResults?.steam?.recent_reviews?.reviews ?? null;

    /* -----------------------------
       Get game information
    ----------------------------- */
    useEffect(() => {
        if (!igdb_id) return;

        const search = async () => {
            const response = await fetch(`http://127.0.0.1:8000/games/${igdb_id}`)
            const data = await response.json();
            setAPIResults(data);
        }
        search();
    }, [igdb_id]);

    /* -----------------------------
       Automatically select first media
    ----------------------------- */
    useEffect(() => {
        if (selectedMedia) return;

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

    /* -----------------------------
       Send info to database for saving
    ----------------------------- */
    const addToLibrary = async (
        status: "backlog" | "wishlist" | "completed"
    ) => {
        if (!igdb_id || !APIResults) return;

        else if (libraryLocation && libraryLocation === status) {
            const response = await fetch(`http://127.0.0.1:8000/library/remove/${igdb_id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status,
                })
            })

            if (!response.ok) {
            throw new Error("Failed to remove game");
            }

            setLibraryLocation(null);
        }

        else {
            const response = await fetch(`http://127.0.0.1:8000/library/add/${igdb_id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
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

    /* -----------------------------
       Get variable from DB to see if the game is in the user's library
    ----------------------------- */
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
        <div className="page">
            <TopRow 
                title= "Game"
                showSearch={true}
                query = {query}
                setQuery = {setQuery}
                results = {results}
            />
            {!APIResults ? (
                <video 
                    src={loadingScreen}
                    autoPlay
                    loop
                    muted
                    playsInline
                /> 
            ): (
                <div className="body">
                    {/* ----------
                        Start of body top
                    -------------- */}
                    <div className="body_top">

                        {/* Background Layers */}
                        <img className="gameColor" src={screenshots?.[0]?.path_full ?? ""} alt=""/>
                        <img className="gameTexture" src={screenshots?.[0]?.path_full ?? ""} alt=""/>

                        <div className="body_content">
                            <h1>{game_title}</h1>

                            {/* This section show the images, videos, and basic description of the game */}
                            <div className="basic_info">
                                <div className="basic_left">
                                    {/* -----------------------------
                                        Displays the large version of the movie or screenshot
                                    ----------------------------- */}
                                    <div className="main_media">

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
                                    </div> {/* End of main_media */}
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
                                </div> {/* End of basic_left*/}

                                <div className="basic_right">

                                    <img src={headerImage ?? ""} alt=""/>

                                    <p className="game_short_description">{shortDescription ?? ""}</p>

                                    <div className="game_details_table">
                                        <p className="game_detail_name">REVIEW SCORE:</p>
                                        <p className="game_detail_result">{positiveReviewPercentage}%</p>

                                        <p className="game_detail_name">RELEASE DATE:</p>
                                        <p className="game_detail_result">{comingSoon ? "Coming Soon" :releaseDate}</p>

                                        <p className="game_detail_name">DEVELOPERS:</p>
                                        <p className="game_detail_result">{Array.isArray(developers) ? developers.join(", ") : developers}</p>

                                        <p className="game_detail_name">PUBLISHERS:</p>
                                        <p className="game_detail_result">{Array.isArray(publishers) ? publishers?.join(", "): publishers}</p>
                                    </div>
                                </div> {/* End of basic_right */}
                                
                            </div> {/* End of basic_info*/}
                        </div> {/* End of body_content*/}
                    </div> {/* End of body_top*/}

                    {/* ----------
                        Start of body_middle
                    ----------- */}
                    <div className="body_middle">
                        {/* Adds or removes data from the DB*/}
                        <div className="db_row">
                            <button onClick={() => addToLibrary("backlog")}>
                                {libraryLocation && libraryLocation === "backlog" ? (
                                    <>
                                        <img className="checkbox" src={checkbox}/>
                                        On Backlog
                                    </>
                                ): "Add to Backlog"}
                            </button>
                            <button onClick={() => addToLibrary("wishlist")}>
                                {libraryLocation && libraryLocation === "wishlist" ? (
                                    <>
                                        <img className="checkbox" src={checkbox}/>
                                        On Wishlist
                                    </>
                                ): "Add to Wishlist"}
                            </button>
                            <button onClick={() => addToLibrary("completed")}>
                                {libraryLocation && libraryLocation === "completed" ? (
                                    <>
                                        <img className="checkbox" src={checkbox}/>
                                        On Completed
                                    </>
                                ): "Add to Completed"}
                            </button>
                        </div> {/* End of db_row */}
                        
                        <div className="price_hltb_overlay">
                            {/* Displays the price */}
                            <div className="prices">
                                {prices.length > 0 ? (
                                    prices.map (([store, price]) => (
                                        <div className="price_row" key={store}>
                                            <p>{game_title} on {store}</p>

                                            {/* Every store api will have a different format*/}
                                            {store === "steam" && (
                                                <>
                                                    {price.is_free === true ? (
                                                        <div className="no_price">
                                                            <p>Free To Play</p>
                                                        </div>
                                                    ): price.discount_percent && price.discount_percent > 0 && price.initial_formatted && price.final_formatted ? (
                                                        <div className="price_discount">
                                                            <p>-{price.discount_percent}%</p>
                                                            <div className="full_to_discount">
                                                                <p>{price.initial_formatted}</p>
                                                                <p>{price.final_formatted}</p>
                                                            </div>
                                                        </div>
                                                    ): price.final_formatted ? (
                                                        <div className="full_price">
                                                            <p>{price.final_formatted}</p>
                                                        </div>
                                                    ): (
                                                        <div className="no_price">
                                                            <p>No price found</p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div> 
                                    ))
                                ) : (
                                    <div className="price_row">
                                        <p>{game_title} not available on any store for sale</p>
                                    </div>
                                )}
                            </div> {/* End of prices*/}

                            {/* Show HowLongToBeat data*/}
                            <div className="hltb">
                                <p>How Long to Beat:</p>
                                <div className="hltb_table">
                                    <div className="hltb_square">
                                        <p className="hltb_category">Average</p>
                                        <p className="hltb_hours">{howLongToBeat?.all_styles ?? "Unknown"}</p>
                                    </div>

                                    <div className="hltb_square">
                                        <p className="hltb_category">Main Story</p>
                                        <p className="hltb_hours">{howLongToBeat?.main_story ?? "Unknown"}</p>
                                    </div>

                                    <div className="hltb_square">
                                        <p className="hltb_category">Main + Side</p>
                                        <p className="hltb_hours">{howLongToBeat?.main_extra ?? "Unknown"}</p>
                                    </div>
                                    
                                    <div className="hltb_square">
                                        <p className="hltb_category">Completionist</p>
                                        <p className="hltb_hours">{howLongToBeat?.completionist ?? "Unknown"}</p>
                                    </div>
                                </div> {/* End of hltb_table */}
                            </div> {/*End of hltb */}
                        </div> {/* End of price_hltb_overlay */}

                    </div> {/* End of body_middle */}

                    <div className="body_end">
                        {(reviews || recentReviews) && <hr />}

                        <div className="reviews_layout">
                            {reviews && reviews?.length > 0 && (
                                <div className="reviews">
                                    <p>MOST HELPFUL REVIEWS</p>

                                    <div className="reviews_table">

                                        {reviews.map((review) => (
                                            <div className="review">

                                                <div className="review_author_profile">
                                                    <img src={`https://avatars.akamai.steamstatic.com/${review?.author?.avatar ?? ""}_full.jpg`} alt={`${review?.author?.personaname ?? "Unknown"}'s avatar`}/>
                                                    <div className="review_author_profile_info">
                                                        <p className="author_name">{review?.author?.personaname ?? "Unknown Author"}</p>
                                                        <div className="review_author_count_variable">
                                                            <p>{review?.author?.num_games_owned ?? "Unknown count of"} games</p>
                                                            <p>{review?.author?.num_reviews ?? "Unkown count of"} reviews</p>
                                                        </div>
                                                    </div> 
                                                </div> {/* End of review_author_profile */}

                                                <div className="review_author_game_data">    
                                                    <div className="review_author_game_data_top">                                                
                                                        {review?.voted_up === true ? (
                                                            <img className="thumbs_up" src={thumbsUp} alt="Thumbs up"/>
                                                        ) : review?.voted_up === false ? (
                                                            <img className="thumbs_down" src={thumbsDown} alt="Thumbs down"/>                   
                                                        ): null}

                                                        <div className="review_author_game_data_right">
                                                            {review?.voted_up === true ? (
                                                                <p className="recommended_or_not">Recommended</p>
                                                            ) : review?.voted_up === false ? (
                                                                <p className="recommended_or_not">Not Recommended</p>
                                                            ): null}

                                                            {review?.author?.playtime_forever && review?.author?.playtime_at_review && review?.author?.playtime_forever !== review?.author?.playtime_at_review ? (
                                                                <p className="review_author_game_hours">{(review?.author?.playtime_forever / 60).toFixed(1)} hrs on record ({(review?.author?.playtime_at_review / 60).toFixed(1)} hrs at review time)</p>
                                                            ): review?.author?.playtime_forever ? (
                                                                <p className="review_author_game_hours">{(review?.author?.playtime_forever / 60).toFixed(1)} hrs on record</p>
                                                            ): null}
                                                        </div>
                                                    </div>

                                                    <div className="review_author_game_data_bottom">
                                                        <p className="date_of_review">
                                                            POSTED: {review?.timestamp_created ? 
                                                                new Date(review.timestamp_created * 1000).toLocaleDateString("en-US", {
                                                                    month: "long",
                                                                    day: "numeric",
                                                                    year: "numeric"
                                                                }): "Unknown"}
                                                        </p>
                                                        <p className={`review_text ${expandedReview === review.recommendationid ? "expanded" : ""}`}>{review?.review ?? ""}</p>
                                                        <button 
                                                            className="read_more_button"
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

                            {recentReviews && recentReviews?.length > 0 && (
                                <div className="recent_reviews">
                                    <p>RECENTLY POSTED</p>

                                    <div className="recent_reviews_table">

                                    {recentReviews.map((newReview) => (
                                        <div className="recent_review">
                                            <div className="recent_reviews_top">
                                                {newReview?.voted_up === true ? (
                                                            <img className="thumbs_up_small" src={thumbsUp} alt="Thumbs up"/>
                                                        ) : newReview?.voted_up === false ? (
                                                            <img className="thumbs_down_small" src={thumbsDown} alt="Thumbs down"/>                   
                                                ): null}
                                                {newReview?.author?.personaname && (
                                                    <p className="recent_author_name">{newReview.author.personaname}</p>
                                                )}
                                                {newReview?.author?.playtime_at_review  && (
                                                    <p className="recent_author_game_hours">{(newReview?.author?.playtime_at_review / 60).toFixed(1)} hrs</p>
                                                )}
                                            </div> {/* End of recent_reviews_top*/}

                                            <div className="recent_reviews_bottom">
                                                <p className="date_of_review">
                                                    POSTED: {newReview?.timestamp_created ? 
                                                        new Date(newReview.timestamp_created * 1000).toLocaleDateString("en-US", {
                                                            month: "long",
                                                            day: "numeric",
                                                            year: "numeric"
                                                        }): "Unknown"}
                                                </p>
                                                <p className={`review_text ${expandedReview === newReview.recommendationid ? "expanded" : ""}`}>{newReview?.review ?? ""}</p>
                                                <button 
                                                    className="read_more_button"
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