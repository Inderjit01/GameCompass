import React from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import SplashScreen from "./SplashScreen";

async function setup() {
    console.log("Frontend setup starting");

    // Fake frontend work
    await new Promise(resolve =>
        setTimeout(resolve, 3000)
    );

    console.log("Frontend setup complete");

    await invoke("set_complete", {
        task: "frontend",
    });
}

setup();

ReactDOM.createRoot(
    document.getElementById("root")!
).render(
    <React.StrictMode>
        <SplashScreen />
    </React.StrictMode>
);