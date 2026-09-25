use crate::error::AppResult;

/// Extracts a 7z archive into a directory, creating it if needed.
///
/// Replaces the previous rust7z binding, which needed a bundled 7z.dll and a
/// hand-written UTF-16 FFI layer.
#[tauri::command]
#[allow(non_snake_case)]
pub async fn extract7z(path: String, dest: String) -> AppResult<()> {
    tauri::async_runtime::spawn_blocking(move || {
        sevenz_rust2::decompress_file(&path, &dest).map_err(Into::into)
    })
    .await
    .map_err(|e| crate::error::AppError::msg(format!("extraction task failed: {e}")))?
}
