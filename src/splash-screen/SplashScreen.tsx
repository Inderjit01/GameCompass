import {useEffect} from "react";
import loadingVideo from "../assets/videos/loading-screen.mp4";
import "./splash-screen.css";

function SplashScreen() {
    return (
        <main className="splash-screen">
            <video
                src={loadingVideo}
                autoPlay
                muted
                loop
                playsInline
            />
        </main>
    )
}

export default SplashScreen;