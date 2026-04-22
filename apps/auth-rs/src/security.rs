use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand_core::OsRng;
use tonic::Status;
use uuid::Uuid;

pub fn hash_password(password: &str) -> Result<String, Status> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| Status::internal("failed to hash password"))
}

pub fn verify_password(password: &str, hash: &str) -> Result<(), Status> {
    let parsed_hash =
        PasswordHash::new(hash).map_err(|_| Status::internal("invalid password hash"))?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| Status::unauthenticated("invalid login or password"))
}

pub fn generate_session_token() -> String {
    format!("sc_{}", Uuid::new_v4().simple())
}

pub fn generate_bootstrap_password() -> String {
    let raw = Uuid::new_v4().simple().to_string().to_uppercase();
    format!("SCADMIN-{}", &raw[..12])
}
