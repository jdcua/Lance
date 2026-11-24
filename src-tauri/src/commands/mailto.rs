use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn open_mailto(app: tauri::AppHandle, address: String, subject: String, body: String) -> Result<(), String> {
    let encoded_subject = urlencoding(&subject);
    let encoded_body = urlencoding(&body);
    let uri = format!("mailto:{}?subject={}&body={}", address, encoded_subject, encoded_body);
    app.opener().open_url(&uri, None::<&str>).map_err(|e| e.to_string())
}

fn urlencoding(s: &str) -> String {
    let mut encoded = String::with_capacity(s.len() * 3);
    for byte in s.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            b' ' => encoded.push('+'),
            _ => {
                encoded.push('%');
                encoded.push_str(&format!("{:02X}", byte));
            }
        }
    }
    encoded
}
