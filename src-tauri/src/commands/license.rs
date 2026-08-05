use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

const LICENSE_PRIME: u64 = 999999937;

#[tauri::command]
pub fn validate_license(key: String) -> Result<bool, String> {
    validate_license_internal(&key).map_err(|e| e.to_string())
}

fn validate_license_internal(key: &str) -> Result<bool, &'static str> {
    if key.is_empty() {
        return Ok(false);
    }

    if !is_valid_key_format(key) {
        return Ok(false);
    }

    let stripped = key.replace("LANCE-", "").replace('-', "");
    let hash = compute_hmac_sha256(&stripped).map_err(|_| "HMAC computation failed")?;

    let mut check_bytes = [0u8; 8];
    let copy_len = 8.min(hash.len());
    check_bytes[..copy_len].copy_from_slice(&hash[..copy_len]);
    let check = u64::from_be_bytes(check_bytes);

    Ok(check % LICENSE_PRIME == 0)
}

fn is_valid_key_format(key: &str) -> bool {
    if !key.starts_with("LANCE-") || key.len() != 25 {
        return false;
    }
    let body = &key[6..];
    let parts: Vec<&str> = body.split('-').collect();
    if parts.len() != 4 {
        return false;
    }
    let allowed = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    for part in parts {
        if part.len() != 4 {
            return false;
        }
        for ch in part.chars() {
            if !allowed.contains(ch) {
                return false;
            }
        }
    }
    true
}

fn compute_hmac_sha256(message: &str) -> Result<[u8; 32], &'static str> {
    let secret = env!("LANCE_LICENSE_HASH");
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).map_err(|_| "Invalid key length")?;
    mac.update(message.as_bytes());
    let result = mac.finalize();
    let code_bytes = result.into_bytes();
    let mut output = [0u8; 32];
    output.copy_from_slice(&code_bytes);
    Ok(output)
}
