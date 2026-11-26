use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn open_mailto(
    app: tauri::AppHandle,
    address: String,
    subject: String,
    body: String,
) -> Result<(), String> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unreserved_characters_pass_through() {
        assert_eq!(urlencoding("AZaz09-_.~"), "AZaz09-_.~");
    }

    #[test]
    fn spaces_become_plus() {
        assert_eq!(urlencoding("hello world"), "hello+world");
    }

    #[test]
    fn reserved_bytes_use_uppercase_hex() {
        assert_eq!(urlencoding("a/b?c=d&e"), "a%2Fb%3Fc%3Dd%26e");
    }

    #[test]
    fn non_ascii_bytes_are_encoded_individually() {
        assert_eq!(urlencoding("é"), "%C3%A9");
    }

    #[test]
    fn empty_input_stays_empty() {
        assert_eq!(urlencoding(""), "");
    }
}
