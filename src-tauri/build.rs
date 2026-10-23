fn main() {
    // Re-run this build script when these env vars change, otherwise Cargo
    // may reuse a cached LANCE_LICENSE_HASH from a previous build.
    println!("cargo:rerun-if-env-changed=LANCE_LICENSE_SECRET");
    println!("cargo:rerun-if-env-changed=LANCE_LICENSE_WORKER_URL");
    let secret = std::env::var("LANCE_LICENSE_SECRET").unwrap_or_else(|_| {
        println!("cargo:warning=LANCE_LICENSE_SECRET not set — using dev placeholder");
        "dev-secret-do-not-use-in-production".to_string()
    });
    let hash = hash_secret(&secret);
    println!("cargo:rustc-env=LANCE_LICENSE_HASH={}", hash);
    tauri_build::build()
}

fn hash_secret(secret: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    hex::encode(&hasher.finalize()[..16]).to_uppercase()
}
