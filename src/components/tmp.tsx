{/* This section show the images, videos, and basic description of the game */}
            <div className="body_top"
                style={{
                        backgroundImage: background
                            ? `url("${background}")`
                            : undefined,
                }}>
                <h1>{game_title}</h1>
                
                <div className="basic_info">
                    <div className="basic_left">
                        {/* -----------------------------
                            Displays the large version of the movie or screenshot
                        ----------------------------- */}
                        <div className="main_media">

                            {selectedMedia && selectedMedia.type === "movie" && (
                                <video
                                    src={selectedMedia.hls_h264 ?? ""}
                                    controls
                                    autoPlay
                                />
                            )}
                            {selectedMedia && selectedMedia.type === "screenshot" && (
                                <img
                                    src={selectedMedia.path_full ?? ""}
                                    alt=""
                                />
                            )}
                        </div>
                        {/* -----------------------------
                            Displays the thumbnails
                        ----------------------------- */}
                        {APIResults?.steam && (
                            <ul>
                                {movies && movies.map ( (m) =>
                                    <li
                                        key={m.id}
                                        onClick={() => 
                                            setSelectedMedia({
                                                type: "movie",
                                                id: m.id,
                                                thumbnail: m.thumbnail ?? "",
                                                hls_h264: m.hls_h264 ?? "",
                                            })
                                        }
                                    >
                                        <img src={m.thumbnail ?? ""}/>
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
                                        <img src={s.path_thumbnail ?? ""}/>
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                    <div className="basic_right">
                        <p> this is a test</p>
                    </div>
                </div>

               
            </div>