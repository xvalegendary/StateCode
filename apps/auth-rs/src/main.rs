use std::{
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand_core::OsRng;
use rusqlite::{params, Connection, OptionalExtension};
use tokio::fs;
use tonic::{transport::Server, Request, Response, Status};
use uuid::Uuid;

pub mod auth {
    tonic::include_proto!("statecode.auth.v1");
}

use auth::auth_service_server::{AuthService, AuthServiceServer};
use auth::{
    AuthResponse, LoginRequest, PasswordResetRequest, PasswordResetResponse, RegisterRequest,
};

#[derive(Debug, Clone)]
struct StoredUser {
    id: String,
    login: String,
    username: String,
    password_hash: String,
}

#[derive(Debug, Clone)]
struct AuthState {
    db_path: PathBuf,
}

#[derive(Debug, Clone)]
struct AuthGrpcService {
    state: AuthState,
}

impl AuthState {
    async fn initialize(db_path: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let connection = Connection::open(&db_path)?;
        connection.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                login TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at_unix INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            ",
        )?;

        Ok(Self { db_path })
    }

    fn connection(&self) -> Result<Connection, Status> {
        Connection::open(&self.db_path)
            .map_err(|_| Status::internal("failed to open auth database"))
    }
}

impl AuthGrpcService {
    fn hash_password(password: &str) -> Result<String, Status> {
        let salt = SaltString::generate(&mut OsRng);
        Argon2::default()
            .hash_password(password.as_bytes(), &salt)
            .map(|hash| hash.to_string())
            .map_err(|_| Status::internal("failed to hash password"))
    }

    fn verify_password(password: &str, hash: &str) -> Result<(), Status> {
        let parsed_hash =
            PasswordHash::new(hash).map_err(|_| Status::internal("invalid password hash"))?;

        Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .map_err(|_| Status::unauthenticated("invalid login or password"))
    }

    fn normalize_login(value: &str) -> String {
        value.trim().to_lowercase()
    }

    fn normalize_username(value: &str) -> String {
        let trimmed = value.trim().trim_start_matches('@').to_lowercase();
        format!("@{trimmed}")
    }

    fn validate_register(request: &RegisterRequest) -> Result<(), Status> {
        if request.login.trim().is_empty()
            || request.password.trim().is_empty()
            || request.username.trim().is_empty()
        {
            return Err(Status::invalid_argument(
                "login, username, and password are required",
            ));
        }

        if request.password.len() < 8 {
            return Err(Status::invalid_argument(
                "password must be at least 8 characters",
            ));
        }

        if request.login.contains(' ') {
            return Err(Status::invalid_argument("login must not contain spaces"));
        }

        Ok(())
    }

    fn validate_login(request: &LoginRequest) -> Result<(), Status> {
        if request.login.trim().is_empty() || request.password.trim().is_empty() {
            return Err(Status::invalid_argument("login and password are required"));
        }

        Ok(())
    }

    fn auth_response(user: &StoredUser, message: &str) -> AuthResponse {
        AuthResponse {
            user_id: user.id.clone(),
            login: user.login.clone(),
            username: user.username.clone(),
            token: format!("sc_{}", Uuid::new_v4().simple()),
            message: message.to_string(),
        }
    }

    fn get_user_by_login(connection: &Connection, login: &str) -> Result<Option<StoredUser>, Status> {
        connection
            .query_row(
                "
                SELECT id, login, username, password_hash
                FROM users
                WHERE login = ?1
                ",
                params![login],
                |row| {
                    Ok(StoredUser {
                        id: row.get(0)?,
                        login: row.get(1)?,
                        username: row.get(2)?,
                        password_hash: row.get(3)?,
                    })
                },
            )
            .optional()
            .map_err(|_| Status::internal("failed to query auth database"))
    }
}

#[tonic::async_trait]
impl AuthService for AuthGrpcService {
    async fn register(
        &self,
        request: Request<RegisterRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let payload = request.into_inner();
        Self::validate_register(&payload)?;

        let login = Self::normalize_login(&payload.login);
        let username = Self::normalize_username(&payload.username);
        let password_hash = Self::hash_password(payload.password.trim())?;
        let connection = self.state.connection()?;

        let existing_login: Option<String> = connection
            .query_row(
                "SELECT login FROM users WHERE login = ?1",
                params![login],
                |row| row.get(0),
            )
            .optional()
            .map_err(|_| Status::internal("failed to query auth database"))?;

        if existing_login.is_some() {
            return Err(Status::already_exists("login is already registered"));
        }

        let existing_username: Option<String> = connection
            .query_row(
                "SELECT username FROM users WHERE username = ?1",
                params![username],
                |row| row.get(0),
            )
            .optional()
            .map_err(|_| Status::internal("failed to query auth database"))?;

        if existing_username.is_some() {
            return Err(Status::already_exists("username is already taken"));
        }

        let user = StoredUser {
            id: Uuid::new_v4().to_string(),
            login,
            username,
            password_hash,
        };

        connection
            .execute(
                "
                INSERT INTO users (id, login, username, password_hash, created_at_unix)
                VALUES (?1, ?2, ?3, ?4, ?5)
                ",
                params![
                    user.id,
                    user.login,
                    user.username,
                    user.password_hash,
                    SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as i64
                ],
            )
            .map_err(|_| Status::internal("failed to insert user into auth database"))?;

        Ok(Response::new(Self::auth_response(
            &user,
            "registration successful",
        )))
    }

    async fn login(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let payload = request.into_inner();
        Self::validate_login(&payload)?;

        let login = Self::normalize_login(&payload.login);
        let connection = self.state.connection()?;
        let user = Self::get_user_by_login(&connection, &login)?
            .ok_or_else(|| Status::unauthenticated("invalid login or password"))?;

        Self::verify_password(payload.password.trim(), &user.password_hash)?;

        Ok(Response::new(Self::auth_response(
            &user,
            "login successful",
        )))
    }

    async fn request_password_reset(
        &self,
        request: Request<PasswordResetRequest>,
    ) -> Result<Response<PasswordResetResponse>, Status> {
        let payload = request.into_inner();

        if payload.login.trim().is_empty() {
            return Err(Status::invalid_argument("login is required"));
        }

        Ok(Response::new(PasswordResetResponse {
            message: "If an account exists for this login, a recovery link has been prepared."
                .to_string(),
        }))
    }
}

fn resolve_db_path() -> PathBuf {
    let default_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("data")
        .join("auth.db");

    std::env::var("AUTH_DB_PATH")
        .map(PathBuf::from)
        .unwrap_or(default_path)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let address = std::env::var("AUTH_GRPC_ADDR").unwrap_or_else(|_| "127.0.0.1:50051".to_string());
    let db_path = resolve_db_path();
    let service = AuthGrpcService {
        state: AuthState::initialize(db_path.clone()).await?,
    };

    println!(
        "[auth-rs] gRPC auth server listening on {address}; sqlite db: {}",
        db_path.display()
    );

    Server::builder()
        .add_service(AuthServiceServer::new(service))
        .serve(address.parse()?)
        .await?;

    Ok(())
}
