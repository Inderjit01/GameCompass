use std::sync::Mutex;
use tauri::{Manager, State};
use tokio::time::{sleep, Duration};

// for development mode
#[cfg(debug_assertions)]
use std::process::Command;

// for backend.exe
#[cfg(not(debug_assertions))]
use tauri_plugin_shell::ShellExt;

struct SetupState {
    frontend_complete: bool,
    backend_complete: bool,
}

#[tauri::command]
fn set_complete(
    app: tauri::AppHandle,
    state: State<'_, Mutex<SetupState>>,
    task: String,
) {
    let mut setup = state.lock().unwrap();

    match task.as_str() {
        "frontend" => setup.frontend_complete = true,
        "backend" => setup.backend_complete = true,
        _ => return,
    }

    println!(
        "Setup status: frontend={}, backend={}",
        setup.frontend_complete,
        setup.backend_complete
    );

    if setup.frontend_complete && setup.backend_complete {
        let splash = app
            .get_webview_window("splashscreen")
            .unwrap();

        let main = app
            .get_webview_window("main")
            .unwrap();

        splash.close().unwrap();
        main.show().unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(SetupState {
            frontend_complete: false,
            backend_complete: false,
        }))
        .setup(|app| {

            let app_handle = app.handle().clone();

            // Hide main window until setup finishes
            let main = app
                .get_webview_window("main")
                .unwrap();

            main.hide()?;

            // ==========================================
            // Start backend
            // ==========================================
            
            #[cfg(debug_assertions)]
            {
                println!("Starting PYTHON backend from /backend/server.py ...");

                Command::new("python")
                    .arg("../backend/server.py")
                    .spawn()
                    .expect("Failed to start Python backend");
            }
            
            #[cfg(not(debug_assertions))]
            {
                println!("Starting PACKAGE backend from backend/backend.exe ...");

                let (_rx, child) = app
                    .shell()
                    .sidecar("backend")
                    .expect("Failed to create backend sidecar")
                    .spawn()
                    .expect("Failed to start backend sidecar");

                println!("Packaged backend process started: {:?}", child);
            }

            // ==========================================
            // Wait for backend
            // ==========================================
            tauri::async_runtime::spawn(async move {

                println!("Waiting for backend...");

                let client = reqwest::Client::new();

                loop {
                    match client
                        .get("http://127.0.0.1:8000/health")
                        .send()
                        .await
                    {
                        Ok(response) if response.status().is_success() => {
                            println!("Backend setup complete!");
                            break;
                        }

                        Ok(response) => {
                            println!(
                                "Backend responded with status: {}",
                                response.status()
                            );
                        }

                        Err(error) => {
                            println!("Backend not ready: {}", error);
                        }
                    }

                    sleep(Duration::from_millis(250)).await;
                }

                set_complete(
                    app_handle.clone(),
                    app_handle.state::<Mutex<SetupState>>(),
                    "backend".into(),
                );
            });

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            set_complete
        ])

        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        // Call .run() here, which passes the app handle and event directly
        .run(|_app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                println!("Application exiting. Shutting down backend sidecar...");
                
                // Fire a blocking GET request to shutdown backend.exe
                let _ = reqwest::blocking::Client::new()
                    .get("http://127.0.0.1:8000/shutdown")
                    .timeout(std::time::Duration::from_secs(2))
                    .send();
            }
        });

}