use tonic::{Request, Response, Status};

use crate::models::{
    profile_url, supported_languages, to_iso, StoredProblem, StoredUser, CALIBRATION_TARGET,
};
use crate::proto::platform_service_server::PlatformService;
use crate::proto::{
    AdminActionResponse, AdminAssignUserTitleRequest, AdminCreateProblemRequest,
    AdminProblemActionResponse, AdminSessionRequest, AdminSetUserBanStateRequest,
    AdminSetUserLeaderboardStateRequest, AdminSetUserRoleRequest, AdminUserTargetRequest,
    AuthResponse, CompleteProblemRequest, Empty, LeaderboardEntry, LeaderboardResponse,
    LoginRequest, PasswordResetRequest, PasswordResetResponse, ProblemCatalogRequest,
    ProblemCatalogResponse, ProblemRecord, ProfileHandleRequest, RegisterRequest, SessionRequest,
    UpdateProfileRegionRequest, UpdateProfileVisibilityRequest, UserListResponse, UserRecord,
};
use crate::rating::resolve_rank;
use crate::security::{hash_password, verify_password};
use crate::store::AppStore;

#[derive(Debug, Clone)]
pub struct PlatformGrpcService {
    pub store: AppStore,
}

impl PlatformGrpcService {
    fn normalize_login(value: &str) -> String {
        value.trim().to_lowercase()
    }

    fn normalize_username(value: &str) -> String {
        let trimmed = value.trim().trim_start_matches('@').to_lowercase();
        format!("@{trimmed}")
    }

    fn require_authenticated(&self, token: &str) -> Result<StoredUser, Status> {
        let actor = self
            .store
            .get_user_by_token(token)?
            .ok_or_else(|| Status::unauthenticated("session is invalid"))?;

        if actor.is_banned {
            return Err(Status::permission_denied("this account is banned"));
        }

        Ok(actor)
    }

    fn require_staff(&self, token: &str) -> Result<StoredUser, Status> {
        let actor = self.require_authenticated(token)?;

        if !matches!(actor.role.as_str(), "moderator" | "admin") {
            return Err(Status::permission_denied("staff permissions required"));
        }

        Ok(actor)
    }

    fn require_admin(&self, token: &str) -> Result<StoredUser, Status> {
        let actor = self.require_authenticated(token)?;

        if actor.role != "admin" {
            return Err(Status::permission_denied("admin permissions required"));
        }

        Ok(actor)
    }

    fn validate_visibility(visibility: &str) -> Result<(), Status> {
        if !matches!(visibility, "public" | "private") {
            return Err(Status::invalid_argument(
                "visibility must be public or private",
            ));
        }

        Ok(())
    }

    fn normalize_region_code(region_code: &str) -> Result<String, Status> {
        let normalized = region_code.trim().to_uppercase();
        let is_country = normalized.len() == 2
            && normalized
                .chars()
                .all(|character| character.is_ascii_uppercase());

        if normalized == "UN" || is_country {
            return Ok(normalized);
        }

        Err(Status::invalid_argument(
            "region code must be UN or an ISO 3166-1 alpha-2 code",
        ))
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

    fn validate_problem_payload(payload: &AdminCreateProblemRequest) -> Result<(), Status> {
        if payload.title.trim().is_empty()
            || payload.category.trim().is_empty()
            || payload.status.trim().is_empty()
            || payload.time_limit.trim().is_empty()
            || payload.statement.trim().is_empty()
        {
            return Err(Status::invalid_argument(
                "title, category, status, time limit, and statement are required",
            ));
        }

        if !(1..=10).contains(&payload.difficulty) {
            return Err(Status::invalid_argument(
                "difficulty must be between 1 and 10",
            ));
        }

        if payload.languages.is_empty() {
            return Err(Status::invalid_argument(
                "at least one programming language is required",
            ));
        }

        let allowed = supported_languages();
        for language in &payload.languages {
            if !allowed.iter().any(|candidate| candidate == language) {
                return Err(Status::invalid_argument(
                    "unsupported programming language provided",
                ));
            }
        }

        Ok(())
    }

    fn to_auth_response(
        &self,
        user: &StoredUser,
        token: String,
        message: &str,
    ) -> Result<AuthResponse, Status> {
        Ok(AuthResponse {
            user_id: user.id.clone(),
            login: user.login.clone(),
            email: user.email.clone(),
            username: user.username.clone(),
            token,
            message: message.to_string(),
            role: user.role.clone(),
            title: user.title.clone().unwrap_or_default(),
            visibility: user.visibility.clone(),
            tournaments_played: user.tournaments_played,
            solved_problems: user.solved_problems,
            calibration_solved: user.calibration_solved,
            calibration_target: CALIBRATION_TARGET,
            leaderboard_position: self
                .store
                .leaderboard_position_for_user(&user.id)?
                .unwrap_or_default(),
            leaderboard_rating: user.leaderboard_rating.unwrap_or_default(),
            rank: resolve_rank(user.leaderboard_rating, user.calibration_solved),
            last_online_at: to_iso(user.last_online_unix),
            joined_at: to_iso(user.created_at_unix),
            leaderboard_hidden: user.leaderboard_hidden,
            is_banned: user.is_banned,
            profile_url: profile_url(&user.username),
            region_code: user.region_code.clone(),
        })
    }

    fn to_user_record(&self, user: &StoredUser) -> Result<UserRecord, Status> {
        Ok(UserRecord {
            user_id: user.id.clone(),
            login: user.login.clone(),
            email: user.email.clone(),
            username: user.username.clone(),
            role: user.role.clone(),
            title: user.title.clone().unwrap_or_default(),
            visibility: user.visibility.clone(),
            tournaments_played: user.tournaments_played,
            solved_problems: user.solved_problems,
            calibration_solved: user.calibration_solved,
            calibration_target: CALIBRATION_TARGET,
            leaderboard_position: self
                .store
                .leaderboard_position_for_user(&user.id)?
                .unwrap_or_default(),
            leaderboard_rating: user.leaderboard_rating.unwrap_or_default(),
            rank: resolve_rank(user.leaderboard_rating, user.calibration_solved),
            last_online_at: to_iso(user.last_online_unix),
            joined_at: to_iso(user.created_at_unix),
            leaderboard_hidden: user.leaderboard_hidden,
            is_banned: user.is_banned,
            profile_url: profile_url(&user.username),
            region_code: user.region_code.clone(),
        })
    }

    fn to_problem_record(problem: &StoredProblem) -> ProblemRecord {
        ProblemRecord {
            problem_id: problem.problem_id.clone(),
            slug: problem.slug.clone(),
            title: problem.title.clone(),
            category: problem.category.clone(),
            difficulty: problem.difficulty,
            status: problem.status.clone(),
            solved_count: problem.solved_count,
            time_limit: problem.time_limit.clone(),
            statement: problem.statement.clone(),
            created_at: to_iso(problem.created_at_unix),
            languages: problem.languages.clone(),
            solved_by_current_user: problem.solved_by_current_user,
        }
    }
}

#[tonic::async_trait]
impl PlatformService for PlatformGrpcService {
    async fn register(
        &self,
        request: Request<RegisterRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let payload = request.into_inner();
        Self::validate_register(&payload)?;

        let login = Self::normalize_login(&payload.login);
        let username = Self::normalize_username(&payload.username);
        let password_hash = hash_password(payload.password.trim())?;
        let user = self.store.create_user(&login, &username, &password_hash)?;
        let token = self.store.create_session(&user.id)?;
        let response = self.to_auth_response(&user, token, "registration successful")?;

        Ok(Response::new(response))
    }

    async fn login(
        &self,
        request: Request<LoginRequest>,
    ) -> Result<Response<AuthResponse>, Status> {
        let payload = request.into_inner();
        Self::validate_login(&payload)?;

        let login = Self::normalize_login(&payload.login);
        let user = self
            .store
            .get_user_by_login(&login)?
            .ok_or_else(|| Status::unauthenticated("invalid login or password"))?;

        if user.is_banned {
            return Err(Status::permission_denied("this account is banned"));
        }

        verify_password(payload.password.trim(), &user.password_hash)?;
        self.store.touch_user(&user.id)?;
        let refreshed_user = self
            .store
            .get_user_by_id(&user.id)?
            .ok_or_else(|| Status::not_found("user not found"))?;
        let token = self.store.create_session(&user.id)?;
        let response = self.to_auth_response(&refreshed_user, token, "login successful")?;

        Ok(Response::new(response))
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

    async fn get_current_user(
        &self,
        request: Request<SessionRequest>,
    ) -> Result<Response<UserRecord>, Status> {
        let payload = request.into_inner();
        let user = self.require_authenticated(payload.token.trim())?;

        Ok(Response::new(self.to_user_record(&user)?))
    }

    async fn update_profile_visibility(
        &self,
        request: Request<UpdateProfileVisibilityRequest>,
    ) -> Result<Response<UserRecord>, Status> {
        let payload = request.into_inner();
        let actor = self.require_authenticated(payload.token.trim())?;
        let visibility = payload.visibility.trim();
        Self::validate_visibility(visibility)?;
        let user = self.store.set_user_visibility(&actor.id, visibility)?;

        Ok(Response::new(self.to_user_record(&user)?))
    }

    async fn update_profile_region(
        &self,
        request: Request<UpdateProfileRegionRequest>,
    ) -> Result<Response<UserRecord>, Status> {
        let payload = request.into_inner();
        let actor = self.require_authenticated(payload.token.trim())?;
        let region_code = Self::normalize_region_code(&payload.region_code)?;
        let user = self.store.set_user_region(&actor.id, &region_code)?;

        Ok(Response::new(self.to_user_record(&user)?))
    }

    async fn get_public_profile(
        &self,
        request: Request<ProfileHandleRequest>,
    ) -> Result<Response<UserRecord>, Status> {
        let payload = request.into_inner();
        let username = Self::normalize_username(&payload.handle);
        let user = self
            .store
            .get_user_by_username(&username)?
            .ok_or_else(|| Status::not_found("profile not found"))?;

        if user.is_banned || user.visibility == "private" {
            return Err(Status::not_found("profile not found"));
        }

        Ok(Response::new(self.to_user_record(&user)?))
    }

    async fn get_leaderboard(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<LeaderboardResponse>, Status> {
        let entries = self
            .store
            .list_leaderboard()?
            .into_iter()
            .enumerate()
            .map(|(index, entry)| LeaderboardEntry {
                rank: (index + 1) as i32,
                username: entry.username,
                title: entry.title,
                rating: entry.rating,
                solved_problems: entry.solved_problems,
                tournaments_played: entry.tournaments_played,
                region_code: entry.region_code,
            })
            .collect();

        Ok(Response::new(LeaderboardResponse { entries }))
    }

    async fn list_problems(
        &self,
        request: Request<ProblemCatalogRequest>,
    ) -> Result<Response<ProblemCatalogResponse>, Status> {
        let payload = request.into_inner();
        let current_user = if payload.token.trim().is_empty() {
            None
        } else {
            Some(self.require_authenticated(payload.token.trim())?)
        };
        let categories = self.store.list_problem_categories()?;
        let supported_languages = self.store.list_supported_languages();
        let problems = self
            .store
            .list_problems(current_user.as_ref().map(|user| user.id.as_str()))?
            .iter()
            .map(Self::to_problem_record)
            .collect();

        Ok(Response::new(ProblemCatalogResponse {
            categories,
            problems,
            supported_languages,
        }))
    }

    async fn complete_problem(
        &self,
        request: Request<CompleteProblemRequest>,
    ) -> Result<Response<UserRecord>, Status> {
        let payload = request.into_inner();
        let actor = self.require_authenticated(payload.token.trim())?;
        let problem_id = payload.problem_id.trim();
        let problem_slug = payload.problem_slug.trim();
        let problem_title = payload.problem_title.trim();

        if problem_id.is_empty() && problem_slug.is_empty() && problem_title.is_empty() {
            return Err(Status::invalid_argument("problem reference is required"));
        }

        let user =
            self.store
                .complete_problem(&actor.id, problem_id, problem_slug, problem_title)?;

        Ok(Response::new(self.to_user_record(&user)?))
    }

    async fn list_users(
        &self,
        request: Request<AdminSessionRequest>,
    ) -> Result<Response<UserListResponse>, Status> {
        let payload = request.into_inner();
        self.require_staff(payload.token.trim())?;
        let users = self
            .store
            .list_users()?
            .iter()
            .map(|user| self.to_user_record(user))
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Response::new(UserListResponse { users }))
    }

    async fn set_user_ban_state(
        &self,
        request: Request<AdminSetUserBanStateRequest>,
    ) -> Result<Response<AdminActionResponse>, Status> {
        let payload = request.into_inner();
        self.require_staff(payload.token.trim())?;
        let user = self
            .store
            .set_user_ban_state(&payload.user_id, payload.is_banned)?;

        Ok(Response::new(AdminActionResponse {
            message: if payload.is_banned {
                "user banned".to_string()
            } else {
                "user restored".to_string()
            },
            user: Some(self.to_user_record(&user)?),
        }))
    }

    async fn set_user_leaderboard_state(
        &self,
        request: Request<AdminSetUserLeaderboardStateRequest>,
    ) -> Result<Response<AdminActionResponse>, Status> {
        let payload = request.into_inner();
        self.require_staff(payload.token.trim())?;
        let user = self
            .store
            .set_user_leaderboard_state(&payload.user_id, payload.leaderboard_hidden)?;

        Ok(Response::new(AdminActionResponse {
            message: if payload.leaderboard_hidden {
                "user removed from leaderboard".to_string()
            } else {
                "user restored to leaderboard".to_string()
            },
            user: Some(self.to_user_record(&user)?),
        }))
    }

    async fn reset_user_competitive_state(
        &self,
        request: Request<AdminUserTargetRequest>,
    ) -> Result<Response<AdminActionResponse>, Status> {
        let payload = request.into_inner();
        self.require_admin(payload.token.trim())?;
        let user = self.store.reset_user_competitive_state(&payload.user_id)?;

        Ok(Response::new(AdminActionResponse {
            message: "user competitive state cleared".to_string(),
            user: Some(self.to_user_record(&user)?),
        }))
    }

    async fn assign_user_title(
        &self,
        request: Request<AdminAssignUserTitleRequest>,
    ) -> Result<Response<AdminActionResponse>, Status> {
        let payload = request.into_inner();
        self.require_staff(payload.token.trim())?;
        let user = self
            .store
            .assign_user_title(&payload.user_id, &payload.title)?;

        Ok(Response::new(AdminActionResponse {
            message: "user title updated".to_string(),
            user: Some(self.to_user_record(&user)?),
        }))
    }

    async fn set_user_role(
        &self,
        request: Request<AdminSetUserRoleRequest>,
    ) -> Result<Response<AdminActionResponse>, Status> {
        let payload = request.into_inner();
        self.require_admin(payload.token.trim())?;

        if !matches!(payload.role.as_str(), "user" | "moderator" | "admin") {
            return Err(Status::invalid_argument(
                "role must be user, moderator, or admin",
            ));
        }

        let user = self.store.set_user_role(&payload.user_id, &payload.role)?;

        Ok(Response::new(AdminActionResponse {
            message: "user role updated".to_string(),
            user: Some(self.to_user_record(&user)?),
        }))
    }

    async fn list_admin_problems(
        &self,
        request: Request<AdminSessionRequest>,
    ) -> Result<Response<ProblemCatalogResponse>, Status> {
        let payload = request.into_inner();
        self.require_staff(payload.token.trim())?;
        let categories = self.store.list_problem_categories()?;
        let supported_languages = self.store.list_supported_languages();
        let problems = self
            .store
            .list_problems(None)?
            .iter()
            .map(Self::to_problem_record)
            .collect();

        Ok(Response::new(ProblemCatalogResponse {
            categories,
            problems,
            supported_languages,
        }))
    }

    async fn create_problem(
        &self,
        request: Request<AdminCreateProblemRequest>,
    ) -> Result<Response<AdminProblemActionResponse>, Status> {
        let payload = request.into_inner();
        let staff = self.require_staff(payload.token.trim())?;
        Self::validate_problem_payload(&payload)?;

        let problem = self.store.create_problem(
            &staff.id,
            payload.title.trim(),
            payload.category.trim(),
            payload.difficulty,
            payload.status.trim(),
            payload.time_limit.trim(),
            payload.statement.trim(),
            &payload.languages,
        )?;

        Ok(Response::new(AdminProblemActionResponse {
            message: "problem created".to_string(),
            problem: Some(Self::to_problem_record(&problem)),
        }))
    }
}
