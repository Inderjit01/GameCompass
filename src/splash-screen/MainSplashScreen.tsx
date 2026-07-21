import React from "react";
import ReactDOM from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import SplashScreen from "./SplashScreen";

/*
    async: this function can pause while waiting for something, without 
        blocking the rest of the application
    new Promise: creates an object that represents work that will finish 
        in the future
    invoke: calls a Rust function from React/Tauri
*/
async function setup() {
    await new Promise(resolve =>
        setTimeout(resolve, 3000)
    );

    await invoke("set_complete", {
        task: "frontend",
    });
}

setup();

/*
    ReactDOM: connects React to the HTML page
    docuemnt.getElementById: asks the browser to find the HTML element
        with id="root"
    !: means the object to the left really exists
    render: tells React what component should be displayed inside the 
        root element
*/
ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <SplashScreen />
    </React.StrictMode>
);