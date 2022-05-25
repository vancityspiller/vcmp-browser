use tauri::api::http::{ClientBuilder, HttpRequestBuilder, ResponseType};
use std::fs::File;
use std::io::Write;
use std::fs::create_dir;

// ------------------------------------------------------------------------------------------------ //

#[tauri::command]
#[allow(non_snake_case)]
pub async fn downloadFiles(url: String, path: String) -> Result<String, String> {
    let client = ClientBuilder::new().build().unwrap();

    let response = client.send(
        HttpRequestBuilder::new("GET", url)
            .unwrap()
            .response_type(ResponseType::Binary)
        ).await;

    if let Ok(response) = response {
        let bytes = response.bytes().await.unwrap().data;

        create_dir(format!("{}", &path)).unwrap();
        let mut file = File::create(format!("{}files.7z", path)).unwrap();
        file.write_all(&bytes).unwrap();
    }

    Ok("".to_string().into())
}