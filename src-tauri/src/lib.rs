use std::sync::Mutex;
use tauri::{Manager, State};
use tokio::time::{sleep, Duration};

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


            // Fake backend setup
            tauri::async_runtime::spawn(async move {

                println!("Starting backend setup...");

                // Replace this with database loading later
                sleep(Duration::from_secs(5)).await;

                println!("Backend setup complete!");

                set_complete(
                    app_handle.clone(),
                    app_handle.state::<Mutex<SetupState>>(),
                    "backend".into(),
                );
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            set_complete
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}