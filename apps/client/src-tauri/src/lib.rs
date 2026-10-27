use tauri::Manager;

const MAIN_LABEL: &str = "main";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::all()
                        - tauri_plugin_window_state::StateFlags::VISIBLE,
                )
                .build(),
        )
        .menu(build_menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "reload" => reload_main(app),
            "devtools" => toggle_devtools(app),
            "github" => {
                let _ = spawn_external("https://github.com/ximing/aimo");
            }
            _ => {}
        })
        .setup(|app| {
            install_main_window(app)?;
            Ok(())
        })
        .on_window_event(on_window_event)
        .build(tauri::generate_context!())
        .expect("error while running AIMO")
        .run(on_run_event);
}

fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    // No status icon. On macOS the Dock remains, so the red button hides the
    // window instead of quitting. Cmd+Q still quits. Other platforms quit on close.
    #[cfg(target_os = "macos")]
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        if window.label() == MAIN_LABEL {
            api.prevent_close();
            let _ = window.hide();
        }
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (window, event);
}

fn on_run_event(app: &tauri::AppHandle, event: tauri::RunEvent) {
    #[cfg(target_os = "macos")]
    if let tauri::RunEvent::Reopen {
        has_visible_windows,
        ..
    } = event
    {
        if !has_visible_windows {
            show_main(app);
        }
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, event);
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn reload_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_LABEL) {
        let _ = window.reload();
    }
}

fn toggle_devtools(app: &tauri::AppHandle) {
    // These methods exist only when debug assertions are on, or when the
    // `devtools` cargo feature is enabled. `tauri build` is a release build.
    #[cfg(any(debug_assertions, feature = "devtools"))]
    if let Some(window) = app.get_webview_window(MAIN_LABEL) {
        if window.is_devtools_open() {
            window.close_devtools();
        } else {
            window.open_devtools();
        }
    }
    #[cfg(not(any(debug_assertions, feature = "devtools")))]
    let _ = app;
}

fn build_menu<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<tauri::menu::Menu<R>> {
    use tauri::menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu};

    let version = app.package_info().version.to_string();
    let about = AboutMetadata {
        name: Some("AIMO".into()),
        version: Some(version.clone()),
        ..Default::default()
    };
    let version_item = MenuItem::with_id(
        app,
        "version",
        format!("版本 {version}"),
        false,
        None::<&str>,
    )?;
    let reload = MenuItem::with_id(app, "reload", "重新加载", true, Some("CmdOrCtrl+R"))?;
    let github = MenuItem::with_id(app, "github", "访问 GitHub", true, None::<&str>)?;
    let edit = Submenu::with_items(
        app,
        "编辑",
        true,
        &[
            &PredefinedMenuItem::undo(app, Some("撤销"))?,
            &PredefinedMenuItem::redo(app, Some("重做"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, Some("剪切"))?,
            &PredefinedMenuItem::copy(app, Some("复制"))?,
            &PredefinedMenuItem::paste(app, Some("粘贴"))?,
            &PredefinedMenuItem::select_all(app, Some("全选"))?,
        ],
    )?;
    let view_separator = PredefinedMenuItem::separator(app)?;
    let fullscreen = PredefinedMenuItem::fullscreen(app, Some("全屏"))?;
    #[cfg(any(debug_assertions, feature = "devtools"))]
    let devtools = MenuItem::with_id(
        app,
        "devtools",
        "切换开发者工具",
        true,
        Some(if cfg!(target_os = "macos") {
            "Alt+Cmd+I"
        } else {
            "Ctrl+Shift+I"
        }),
    )?;
    #[cfg(any(debug_assertions, feature = "devtools"))]
    let view = Submenu::with_items(
        app,
        "视图",
        true,
        &[&reload, &devtools, &view_separator, &fullscreen],
    )?;
    #[cfg(not(any(debug_assertions, feature = "devtools")))]
    let view = Submenu::with_items(app, "视图", true, &[&reload, &view_separator, &fullscreen])?;
    let window = Submenu::with_items(
        app,
        "窗口",
        true,
        &[
            &PredefinedMenuItem::minimize(app, Some("最小化"))?,
            &PredefinedMenuItem::maximize(app, Some("缩放"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, Some("关闭"))?,
        ],
    )?;

    #[cfg(target_os = "macos")]
    {
        let app_menu = Submenu::with_items(
            app,
            "AIMO",
            true,
            &[
                &PredefinedMenuItem::about(app, Some("关于 AIMO"), Some(about))?,
                &version_item,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::hide(app, Some("隐藏 AIMO"))?,
                &PredefinedMenuItem::hide_others(app, Some("隐藏其他"))?,
                &PredefinedMenuItem::show_all(app, Some("显示全部"))?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, Some("退出 AIMO"))?,
            ],
        )?;
        let help = Submenu::with_items(app, "帮助", true, &[&github])?;
        return Menu::with_items(app, &[&app_menu, &edit, &view, &window, &help]);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let file = Submenu::with_items(
            app,
            "文件",
            true,
            &[&PredefinedMenuItem::quit(app, Some("退出"))?],
        )?;
        let help = Submenu::with_items(
            app,
            "帮助",
            true,
            &[
                &github,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::about(app, Some("关于 AIMO"), Some(about))?,
                &version_item,
            ],
        )?;
        Menu::with_items(app, &[&file, &edit, &view, &window, &help])
    }
}

/// Config marks the main window `create: false` so this can deny popup
/// webviews. `target="_blank"` and Command-click otherwise do nothing.
fn install_main_window(app: &tauri::App) -> tauri::Result<()> {
    let origin = shell_origin(app.handle())
        .map_err(|message| std::io::Error::new(std::io::ErrorKind::InvalidData, message))?;
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == MAIN_LABEL)
        .cloned()
        .expect("main window config");
    tauri::WebviewWindowBuilder::from_config(app.handle(), &config)?
        .on_navigation(move |url| {
            if is_app_navigation(url, &origin) {
                return true;
            }
            if let Some(target) = external_link_url(url.as_str()) {
                let _ = spawn_external(&target);
            }
            false
        })
        .on_new_window(|url, _features| {
            if let Some(target) = external_link_url(url.as_str()) {
                let _ = spawn_external(&target);
            }
            tauri::webview::NewWindowResponse::Deny
        })
        .build()?;
    Ok(())
}

fn shell_origin(app: &tauri::AppHandle) -> Result<tauri::Url, String> {
    let build = &app.config().build;
    if cfg!(debug_assertions) {
        return build
            .dev_url
            .clone()
            .ok_or_else(|| "missing devUrl".to_string());
    }
    match build.frontend_dist.as_ref() {
        Some(tauri::utils::config::FrontendDist::Url(url)) => Ok(url.clone()),
        _ => Err("frontendDist must be a URL".into()),
    }
}

fn is_app_navigation(target: &tauri::Url, origin: &tauri::Url) -> bool {
    target.scheme() == origin.scheme()
        && target.host_str() == origin.host_str()
        && target.port_or_known_default() == origin.port_or_known_default()
}

fn external_link_url(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() || trimmed.len() > 2048 {
        return None;
    }
    if trimmed
        .chars()
        .any(|ch| ch.is_control() || ch.is_whitespace())
    {
        return None;
    }
    let url = tauri::Url::parse(trimmed).ok()?;
    match url.scheme() {
        "http" | "https" => {
            if url.host_str().map(str::is_empty).unwrap_or(true) {
                return None;
            }
            Some(url.to_string())
        }
        "mailto" => {
            if url.path().is_empty() {
                return None;
            }
            Some(url.to_string())
        }
        _ => None,
    }
}

fn spawn_external(url: &str) -> Result<(), String> {
    // cmd.exe /C start parses the URL again. ShellExecuteW takes one wide string.
    #[cfg(target_os = "windows")]
    {
        return shell_execute_open(url);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let mut command = external_open_command(url);
        command
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map(|_| ())
            .map_err(|err| err.to_string())
    }
}

#[cfg(target_os = "windows")]
fn shell_execute_open(url: &str) -> Result<(), String> {
    let verb = wide_null("open");
    let file = wide_null(url);
    let result = unsafe {
        windows_sys::Win32::UI::Shell::ShellExecuteW(
            std::ptr::null_mut(),
            verb.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL,
        )
    };
    let code = result as isize;
    if code > 32 {
        Ok(())
    } else {
        Err(code.to_string())
    }
}

#[cfg(target_os = "windows")]
fn wide_null(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(not(target_os = "windows"))]
fn external_open_command(url: &str) -> std::process::Command {
    #[cfg(target_os = "macos")]
    {
        let mut command = std::process::Command::new("open");
        command.arg(url);
        return command;
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let mut command = std::process::Command::new("xdg-open");
        command.arg(url);
        command
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn external_links_are_http_https_or_mailto() {
        assert_eq!(
            external_link_url("https://example.com/a?b=1#c").as_deref(),
            Some("https://example.com/a?b=1#c")
        );
        assert_eq!(
            external_link_url("  http://example.com/path  ").as_deref(),
            Some("http://example.com/path")
        );
        assert_eq!(
            external_link_url("mailto:reader@example.com").as_deref(),
            Some("mailto:reader@example.com")
        );
        assert_eq!(external_link_url("javascript:alert(1)"), None);
        assert_eq!(external_link_url("file:///etc/passwd"), None);
        assert_eq!(external_link_url("/home"), None);
        assert_eq!(external_link_url("https://"), None);
        assert_eq!(external_link_url("mailto:"), None);
        assert_eq!(external_link_url("https://example.com/a\nb"), None);
        assert_eq!(external_link_url(""), None);
    }

    #[test]
    fn navigation_stays_on_the_shell_origin() {
        let origin = tauri::Url::parse("https://aimo.plus").unwrap();
        let home = tauri::Url::parse("https://aimo.plus/home").unwrap();
        assert!(is_app_navigation(&home, &origin));
        let other = tauri::Url::parse("https://github.com/ximing/aimo").unwrap();
        assert!(!is_app_navigation(&other, &origin));
        let dev = tauri::Url::parse("http://localhost:5173").unwrap();
        let page = tauri::Url::parse("http://localhost:5173/home?q=1").unwrap();
        assert!(is_app_navigation(&page, &dev));
        let wrong_port = tauri::Url::parse("http://localhost:3000/home").unwrap();
        assert!(!is_app_navigation(&wrong_port, &dev));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn external_open_command_passes_the_url_as_one_argument() {
        let url = "https://example.com/a?b=1&c=2";
        let command = external_open_command(url);
        assert_eq!(command.get_program(), "open");
        let args: Vec<_> = command.get_args().collect();
        assert_eq!(args, [std::ffi::OsStr::new(url)]);
    }
}
