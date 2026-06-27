// Z desktop shell. Wraps the Next.js web app in a native Tauri window.
// The window points at the running Next server (http://localhost:3100); in
// development `beforeDevCommand` boots it via `npm run start`.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the Z desktop application");
}
