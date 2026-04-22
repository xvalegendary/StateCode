use std::{
    path::{Path, PathBuf},
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand_core::OsRng;
use serde::{Deserialize, Serialize};
use tokio::{fs, sync::Mutex};
use tonic::{transport::Server, Request, Response, Status};
use uuid::Uuid;

pub mod auth {
    tonic::include_proto!("statecode.auth.v1");
}

use auth::auth_service_server::{AuthService, AuthServiceServer};
use auth::{
    AuthResponse, LoginRequest, PasswordResetRequest, PasswordResetResponse, RegisterRequest,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StoredUser {
    id: String,
    email: String,
    handle: String,
    first_name: String,
    last_name: String,
    password_hash: String,
    created_at_unix: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
struct PersistedStore {
    users: Vec<StoredUser>,
}

#[derive(Debug, Clone)]
struct AuthState {
    data_path: PathBuf,
    store: Arc<Mutex<PersistedStore>>,
}

#[derive(Debug, Clone)]
struct AuthGrpcService {
    state: AuthState,
}

impl AuthState {
    async fn load(data_path: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        if let Some(parent) = data_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let store = if fs::try_exists(&data_path).await? {
            let raw = fs::read_to_string(&data_path).await?;
            serde_json::from_str::<PersistedStore>(&raw).unwrap_or_default()
        } else {
            PersistedStore::default()
        };

        Ok(Self {
            data_path,
            store: Arc::new(Mutex::new(store)),
        })
    }

    async fn save(&self, snapshot: &PersistedStore) -> Result<(), Status> {
        if let Some(parent) = self.data_path.parent() {
            fs::create_dir_all(parent)
                .await
                .map_err(|_| Status::internal("failed to create auth data directory"))?;
        }

        let raw = serde_json::to_string_pretty(snapshot)
            .map_err(|_| Status::internal("failed to serialize auth store"))?;

        fs::write(&self.data_path, raw)
            .await
            .map_err(|_| Status::internal("failed to persist auth store"))?;

        Ok(())
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
            .map_err(|_| Status::unauthenticated("invalid email or password"))
    }

    fn validate_register(request: &RegisterRequest) -> Result<(), Status> {
        if request.email.trim().is_empty()
            || request.password.trim().is_empty()
            || request.handle.trim().is_empty()
            || request.first_name.trim().is_empty()
            || request.last_name.trim().is_empty()
        {
            return Err(Status::invalid_argument(
                "all registration fields are required",
            ));
        }

        if request.password.len() < 8 {
            return Err(Status::invalid_argument(
                "password must be at least 8 characters",
            ));
        }

        Ok(())
    }

    fn validate_login(request: &LoginRequest) -> Result<(), Status> {
        if request.email.trim().is_empty() || request.password.trim().is_empty() {
            return Err(Status::invalid_argument("email and password are required"));
        }

        Ok(())
    }

    fn auth_response(user: &StoredUser, message: &str) -> AuthResponse {
        AuthResponse {
            user_id: user.id.clone(),
            email: user.email.clone(),
            handle: user.handle.clone(),
            token: format!("sc_{}", Uuid::new_v4().simple()),
            message: message.to_string(),
        }
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

        let normalized_email = payload.email.trim().to_lowercase();
        let normalized_handle = payload.handle.trim().to_lowercase();
        let password_hash = Self::hash_password(payload.password.trim())?;

        let snapshot = {
            let mut store = self.state.store.lock().await;

            if store
                .users
                .iter()
                .any(|user| user.email == normalized_email)
            {
                return Err(Status::already_exists("email is already registered"));
            }

            if store
                .users
                .iter()
                .any(|user| user.handle == normalized_handle)
            {
                return Err(Status::already_exists("handle is already taken"));
            }

            let user = StoredUser {
                id: Uuid::new_v4().to_string(),
                email: normalized_email,
                handle: normalized_handle,
                first_name: payload.first_name.trim().to_string(),
                last_name: payload.last_name.trim().to_string(),
                password_hash,
                created_at_unix: SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs(),
            };

            store.users.push(user);
            store.clone()
        };

        self.state.save(&snapshot).await?;

        let created_user = snapshot
            .users
            .last()
            .cloned()
            .ok_or_else(|| Status::internal("created user missing after save"))?;

        Ok(Response::new(Self::auth_response(
            &created_user,
            "registration successful",
        )))
    }

    async fn login(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let payload = request.into_inner();
        Self::validate_login(&payload)?;

        let normalized_email = payload.email.trim().to_lowercase();

        let user = {
            let store = self.state.store.lock().await;
            store
                .users
                .iter()
                .find(|user| user.email == normalized_email)
                .cloned()
        }
        .ok_or_else(|| Status::unauthenticated("invalid email or password"))?;

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

        if payload.email.trim().is_empty() {
            return Err(Status::invalid_argument("email is required"));
        }

        Ok(Response::new(PasswordResetResponse {
            message: "If an account exists for this email, a recovery link has been prepared."
                .to_string(),
        }))
    }
}

fn resolve_data_path() -> PathBuf {
    let default_path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("data")
        .join("users.json");

    std::env::var("AUTH_DATA_PATH")
        .map(PathBuf::from)
        .unwrap_or(default_path)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let address = std::env::var("AUTH_GRPC_ADDR").unwrap_or_else(|_| "127.0.0.1:50051".to_string());
    let service = AuthGrpcService {
        state: AuthState::load(resolve_data_path()).await?,
    };

    println!("[auth-rs] gRPC auth server listening on {address}");

    Server::builder()
        .add_service(AuthServiceServer::new(service))
        .serve(address.parse()?)
        .await?;

    Ok(())
}
