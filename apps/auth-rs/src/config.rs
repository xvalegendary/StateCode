use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub grpc_address: String,
    pub db_path: PathBuf,
    pub admin_credentials_path: PathBuf,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let base_path = Path::new(env!("CARGO_MANIFEST_DIR")).join("data");

        Self {
            grpc_address: std::env::var("AUTH_GRPC_ADDR")
                .unwrap_or_else(|_| "127.0.0.1:50051".to_string()),
            db_path: std::env::var("AUTH_DB_PATH")
                .map(PathBuf::from)
                .unwrap_or_else(|_| base_path.join("auth.db")),
            admin_credentials_path: std::env::var("AUTH_ADMIN_BOOTSTRAP_PATH")
                .map(PathBuf::from)
                .unwrap_or_else(|_| base_path.join("admin-credentials.txt")),
        }
    }
}
