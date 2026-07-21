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

// export default: lets another file import something from this file
export default SplashScreen;