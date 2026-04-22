use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, OptionalExtension};
use tokio::fs;
use tonic::Status;
use uuid::Uuid;

use crate::models::{LeaderboardUser, StoredProblem, StoredUser, CALIBRATION_TARGET};
use crate::security::{generate_bootstrap_password, generate_session_token, hash_password};

#[derive(Debug, Clone)]
pub struct BootstrapReport {
    pub admin_credentials_path: Option<PathBuf>,
}

#[derive(Debug, Clone)]
pub struct AppStore {
    db_path: PathBuf,
}

const DEMO_PASSWORD: &str = "demo-only-password";

impl AppStore {
    pub async fn initialize(
        db_path: PathBuf,
        admin_credentials_path: PathBuf,
    ) -> Result<(Self, BootstrapReport), Box<dyn std::error::Error>> {
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        if let Some(parent) = admin_credentials_path.parent() {
            fs::create_dir_all(parent).await?;
        }

        let store = Self { db_path };
        let connection = store.connection_raw()?;
        migrate_legacy_schema(&connection)?;
        connection.execute_batch(
            "
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                login TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                title TEXT,
                visibility TEXT NOT NULL,
                tournaments_played INTEGER NOT NULL,
                solved_problems INTEGER NOT NULL,
                calibration_solved INTEGER NOT NULL,
                leaderboard_rating INTEGER,
                leaderboard_hidden INTEGER NOT NULL,
                is_banned INTEGER NOT NULL,
                last_online_unix INTEGER NOT NULL,
                created_at_unix INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at_unix INTEGER NOT NULL,
                last_used_at_unix INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS problems (
                problem_id TEXT PRIMARY KEY,
                slug TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                difficulty INTEGER NOT NULL,
                status TEXT NOT NULL,
                solved_count INTEGER NOT NULL,
                time_limit TEXT NOT NULL,
                statement TEXT NOT NULL,
                created_at_unix INTEGER NOT NULL,
                created_by_user_id TEXT NOT NULL,
                FOREIGN KEY(created_by_user_id) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_problems_slug ON problems(slug);
            ",
        )?;

        let admin_report = store.seed_admin(&connection, admin_credentials_path).await?;
        store.seed_demo_users(&connection)?;
        store.seed_problems(&connection)?;

        Ok((store, admin_report))
    }

    fn connection_raw(&self) -> Result<Connection, rusqlite::Error> {
        Connection::open(&self.db_path)
    }

    fn connection(&self) -> Result<Connection, Status> {
        self.connection_raw()
            .map_err(|_| Status::internal("failed to open platform database"))
    }

    async fn seed_admin(
        &self,
        connection: &Connection,
        admin_credentials_path: PathBuf,
    ) -> Result<BootstrapReport, Box<dyn std::error::Error>> {
        let existing: Option<String> = connection
            .query_row(
                "SELECT id FROM users WHERE login = 'admin' LIMIT 1",
                [],
                |row| row.get(0),
            )
            .optional()?;

        if existing.is_some() {
            return Ok(BootstrapReport {
                admin_credentials_path: None,
            });
        }

        let password = generate_bootstrap_password();
        let password_hash = hash_password(&password)
            .map_err(|error| std::io::Error::other(error.to_string()))?;
        let now = unix_now();

        connection.execute(
            "
            INSERT INTO users (
                id, login, email, username, password_hash, role, title, visibility,
                tournaments_played, solved_problems, calibration_solved, leaderboard_rating,
                leaderboard_hidden, is_banned, last_online_unix, created_at_unix
            )
            VALUES (?1, ?2, ?3, ?4, ?5, 'admin', ?6, 'private', 0, 0, 0, NULL, 1, 0, ?7, ?7)
            ",
            params![
                Uuid::new_v4().to_string(),
                "admin",
                "admin@statecode.com",
                "@statecode-admin",
                password_hash,
                "Platform Administrator",
                now
            ],
        )?;

        fs::write(
            &admin_credentials_path,
            format!(
                "StateCode bootstrap administrator\nlogin=admin\nemail=admin@statecode.com\npassword={password}\n"
            ),
        )
        .await?;

        Ok(BootstrapReport {
            admin_credentials_path: Some(admin_credentials_path),
        })
    }

    fn seed_demo_users(&self, connection: &Connection) -> Result<(), Box<dyn std::error::Error>> {
        let count: i64 =
            connection.query_row("SELECT COUNT(*) FROM users WHERE role = 'user'", [], |row| {
                row.get(0)
            })?;

        if count > 0 {
            return Ok(());
        }

        let demo_password_hash = hash_password(DEMO_PASSWORD)
            .map_err(|error| std::io::Error::other(error.to_string()))?;
        let now = unix_now();
        let seeds = [
            ("bytemarshal", "@bytemarshal", 2712, 1487, 22),
            ("heapwizard", "@heapwizard", 2648, 1435, 18),
            ("segfaultless", "@segfaultless", 2591, 1398, 19),
            ("dp_nomad", "@dp_nomad", 2516, 1362, 17),
            ("range_update", "@range_update", 2478, 1320, 15),
            ("graphpilot", "@graphpilot", 2441, 1297, 21),
        ];

        for (login, username, rating, solved, tournaments) in seeds {
            connection.execute(
                "
                INSERT INTO users (
                    id, login, email, username, password_hash, role, title, visibility,
                    tournaments_played, solved_problems, calibration_solved, leaderboard_rating,
                    leaderboard_hidden, is_banned, last_online_unix, created_at_unix
                )
                VALUES (?1, ?2, ?3, ?4, ?5, 'user', NULL, 'public', ?6, ?7, ?8, ?9, 0, 0, ?10, ?10)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    login,
                    format!("{login}@statecode.dev"),
                    username,
                    demo_password_hash,
                    tournaments,
                    solved,
                    CALIBRATION_TARGET,
                    rating,
                    now
                ],
            )?;
        }

        Ok(())
    }

    fn seed_problems(&self, connection: &Connection) -> Result<(), Box<dyn std::error::Error>> {
        let count: i64 = connection.query_row("SELECT COUNT(*) FROM problems", [], |row| row.get(0))?;
        if count > 0 {
            return Ok(());
        }

        let admin_id: String = connection.query_row(
            "SELECT id FROM users WHERE login = 'admin' LIMIT 1",
            [],
            |row| row.get(0),
        )?;
        let now = unix_now();
        let seeds = [
            ("Zero-Latency Relay", "Graphs", 4, "Popular", 842, "1s", "Find the minimum relay path across weighted network hops."),
            ("Memory Safe Spiral", "Dynamic Programming", 6, "New", 391, "2s", "Count spiral states without revisiting forbidden cells."),
            ("State Compression Arena", "Bitmask", 8, "Hard", 117, "2s", "Compress tournament state transitions with bitmask DP."),
            ("Binary Harbor", "Binary Search", 3, "Classic", 1215, "1s", "Search the earliest feasible harbor slot under monotonic constraints."),
            ("Contest Clock Drift", "Implementation", 2, "Warmup", 1631, "1s", "Repair contest timestamps after repeated drift adjustments."),
            ("Weighted Portal Map", "Graphs", 7, "Featured", 209, "3s", "Route through portals with time-weighted cooldown penalties."),
            ("Modulo Archive", "Math", 5, "Rated", 624, "2s", "Restore archived values after modular folding operations."),
            ("Rope Merge Schedule", "Greedy", 5, "Practice", 577, "2s", "Minimize merge cost while respecting release windows."),
        ];

        for (title, category, difficulty, status, solved_count, time_limit, statement) in seeds {
            connection.execute(
                "
                INSERT INTO problems (
                    problem_id, slug, title, category, difficulty, status, solved_count,
                    time_limit, statement, created_at_unix, created_by_user_id
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                ",
                params![
                    problem_identifier(),
                    slugify(title),
                    title,
                    category,
                    difficulty,
                    status,
                    solved_count,
                    time_limit,
                    statement,
                    now,
                    admin_id
                ],
            )?;
        }

        Ok(())
    }

    pub fn create_user(
        &self,
        login: &str,
        username: &str,
        password_hash: &str,
    ) -> Result<StoredUser, Status> {
        let connection = self.connection()?;
        let now = unix_now();
        let user = StoredUser {
            id: Uuid::new_v4().to_string(),
            login: login.to_string(),
            email: format!("{login}@users.statecode.local"),
            username: username.to_string(),
            password_hash: password_hash.to_string(),
            role: "user".to_string(),
            title: None,
            visibility: "public".to_string(),
            tournaments_played: 0,
            solved_problems: 0,
            calibration_solved: 0,
            leaderboard_rating: None,
            leaderboard_hidden: false,
            is_banned: false,
            last_online_unix: now,
            created_at_unix: now,
        };

        connection
            .execute(
                "
                INSERT INTO users (
                    id, login, email, username, password_hash, role, title, visibility,
                    tournaments_played, solved_problems, calibration_solved, leaderboard_rating,
                    leaderboard_hidden, is_banned, last_online_unix, created_at_unix
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8, ?9, ?10, NULL, 0, 0, ?11, ?12)
                ",
                params![
                    user.id,
                    user.login,
                    user.email,
                    user.username,
                    user.password_hash,
                    user.role,
                    user.visibility,
                    user.tournaments_played,
                    user.solved_problems,
                    user.calibration_solved,
                    user.last_online_unix,
                    user.created_at_unix
                ],
            )
            .map_err(map_unique_violation)?;

        Ok(user)
    }

    pub fn create_session(&self, user_id: &str) -> Result<String, Status> {
        let connection = self.connection()?;
        let token = generate_session_token();
        let now = unix_now();
        connection
            .execute(
                "INSERT INTO sessions (token, user_id, created_at_unix, last_used_at_unix) VALUES (?1, ?2, ?3, ?3)",
                params![token, user_id, now],
            )
            .map_err(|_| Status::internal("failed to create session"))?;

        Ok(token)
    }

    pub fn get_user_by_login(&self, login: &str) -> Result<Option<StoredUser>, Status> {
        let connection = self.connection()?;
        query_user(&connection, "SELECT * FROM users WHERE login = ?1 LIMIT 1", params![login])
    }

    pub fn get_user_by_id(&self, user_id: &str) -> Result<Option<StoredUser>, Status> {
        let connection = self.connection()?;
        query_user(&connection, "SELECT * FROM users WHERE id = ?1 LIMIT 1", params![user_id])
    }

    pub fn get_user_by_username(&self, username: &str) -> Result<Option<StoredUser>, Status> {
        let connection = self.connection()?;
        query_user(
            &connection,
            "SELECT * FROM users WHERE username = ?1 LIMIT 1",
            params![username],
        )
    }

    pub fn get_user_by_token(&self, token: &str) -> Result<Option<StoredUser>, Status> {
        let connection = self.connection()?;
        connection
            .execute(
                "UPDATE sessions SET last_used_at_unix = ?2 WHERE token = ?1",
                params![token, unix_now()],
            )
            .map_err(|_| Status::internal("failed to update session"))?;

        query_user(
            &connection,
            "
            SELECT u.*
            FROM users u
            INNER JOIN sessions s ON s.user_id = u.id
            WHERE s.token = ?1
            LIMIT 1
            ",
            params![token],
        )
    }

    pub fn touch_user(&self, user_id: &str) -> Result<(), Status> {
        let connection = self.connection()?;
        connection
            .execute(
                "UPDATE users SET last_online_unix = ?2 WHERE id = ?1",
                params![user_id, unix_now()],
            )
            .map_err(|_| Status::internal("failed to update last online"))?;
        Ok(())
    }

    pub fn set_user_visibility(&self, user_id: &str, visibility: &str) -> Result<StoredUser, Status> {
        self.execute_user_update(
            "UPDATE users SET visibility = ?2 WHERE id = ?1",
            params![user_id, visibility],
            user_id,
        )
    }

    pub fn list_users(&self) -> Result<Vec<StoredUser>, Status> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare("SELECT * FROM users ORDER BY created_at_unix DESC")
            .map_err(|_| Status::internal("failed to prepare users query"))?;
        let rows = statement
            .query_map([], map_user_row)
            .map_err(|_| Status::internal("failed to query users"))?;

        let mut users = Vec::new();
        for row in rows {
            users.push(row.map_err(|_| Status::internal("failed to decode user"))?);
        }
        Ok(users)
    }

    pub fn list_leaderboard(&self) -> Result<Vec<LeaderboardUser>, Status> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "
                SELECT username, COALESCE(title, ''), leaderboard_rating, solved_problems, tournaments_played
                FROM users
                WHERE leaderboard_hidden = 0
                  AND is_banned = 0
                  AND leaderboard_rating IS NOT NULL
                ORDER BY leaderboard_rating DESC, solved_problems DESC, created_at_unix ASC
                ",
            )
            .map_err(|_| Status::internal("failed to prepare leaderboard query"))?;
        let rows = statement
            .query_map([], |row| {
                Ok(LeaderboardUser {
                    username: row.get(0)?,
                    title: row.get(1)?,
                    rating: row.get(2)?,
                    solved_problems: row.get(3)?,
                    tournaments_played: row.get(4)?,
                })
            })
            .map_err(|_| Status::internal("failed to query leaderboard"))?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(row.map_err(|_| Status::internal("failed to decode leaderboard entry"))?);
        }
        Ok(entries)
    }

    pub fn leaderboard_position_for_user(&self, user_id: &str) -> Result<Option<i32>, Status> {
        let leaderboard = self.list_leaderboard()?;
        let user = self
            .get_user_by_id(user_id)?
            .ok_or_else(|| Status::not_found("user not found"))?;

        for (index, entry) in leaderboard.iter().enumerate() {
            if entry.username == user.username {
                return Ok(Some((index + 1) as i32));
            }
        }

        Ok(None)
    }

    pub fn set_user_ban_state(&self, user_id: &str, is_banned: bool) -> Result<StoredUser, Status> {
        self.execute_user_update(
            "UPDATE users SET is_banned = ?2 WHERE id = ?1",
            params![user_id, bool_to_int(is_banned)],
            user_id,
        )
    }

    pub fn set_user_leaderboard_state(
        &self,
        user_id: &str,
        hidden: bool,
    ) -> Result<StoredUser, Status> {
        self.execute_user_update(
            "UPDATE users SET leaderboard_hidden = ?2 WHERE id = ?1",
            params![user_id, bool_to_int(hidden)],
            user_id,
        )
    }

    pub fn reset_user_competitive_state(&self, user_id: &str) -> Result<StoredUser, Status> {
        self.execute_user_update(
            "
            UPDATE users
            SET tournaments_played = 0,
                solved_problems = 0,
                calibration_solved = 0,
                leaderboard_rating = NULL,
                leaderboard_hidden = 1
            WHERE id = ?1
            ",
            params![user_id],
            user_id,
        )
    }

    pub fn assign_user_title(&self, user_id: &str, title: &str) -> Result<StoredUser, Status> {
        self.execute_user_update(
            "UPDATE users SET title = ?2 WHERE id = ?1",
            params![user_id, empty_to_null(title)],
            user_id,
        )
    }

    pub fn set_user_role(&self, user_id: &str, role: &str) -> Result<StoredUser, Status> {
        self.execute_user_update(
            "UPDATE users SET role = ?2 WHERE id = ?1",
            params![user_id, role],
            user_id,
        )
    }

    fn execute_user_update<P: rusqlite::Params>(
        &self,
        query: &str,
        params: P,
        user_id: &str,
    ) -> Result<StoredUser, Status> {
        let connection = self.connection()?;
        connection
            .execute(query, params)
            .map_err(|_| Status::internal("failed to update user"))?;

        self.get_user_by_id(user_id)?
            .ok_or_else(|| Status::not_found("user not found"))
    }

    pub fn list_problems(&self) -> Result<Vec<StoredProblem>, Status> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "
                SELECT problem_id, slug, title, category, difficulty, status, solved_count,
                       time_limit, statement, created_at_unix
                FROM problems
                ORDER BY created_at_unix DESC, title ASC
                ",
            )
            .map_err(|_| Status::internal("failed to prepare problems query"))?;
        let rows = statement
            .query_map([], |row| {
                Ok(StoredProblem {
                    problem_id: row.get(0)?,
                    slug: row.get(1)?,
                    title: row.get(2)?,
                    category: row.get(3)?,
                    difficulty: row.get(4)?,
                    status: row.get(5)?,
                    solved_count: row.get(6)?,
                    time_limit: row.get(7)?,
                    statement: row.get(8)?,
                    created_at_unix: row.get(9)?,
                })
            })
            .map_err(|_| Status::internal("failed to query problems"))?;

        let mut problems = Vec::new();
        for row in rows {
            problems.push(row.map_err(|_| Status::internal("failed to decode problem"))?);
        }
        Ok(problems)
    }

    pub fn list_problem_categories(&self) -> Result<Vec<String>, Status> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare("SELECT DISTINCT category FROM problems ORDER BY category ASC")
            .map_err(|_| Status::internal("failed to prepare categories query"))?;
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|_| Status::internal("failed to query categories"))?;

        let mut categories = Vec::new();
        for row in rows {
            categories.push(row.map_err(|_| Status::internal("failed to decode category"))?);
        }
        Ok(categories)
    }

    pub fn create_problem(
        &self,
        created_by_user_id: &str,
        title: &str,
        category: &str,
        difficulty: i32,
        status: &str,
        time_limit: &str,
        statement: &str,
    ) -> Result<StoredProblem, Status> {
        let connection = self.connection()?;
        let problem = StoredProblem {
            problem_id: problem_identifier(),
            slug: slugify(title),
            title: title.to_string(),
            category: category.to_string(),
            difficulty,
            status: status.to_string(),
            solved_count: 0,
            time_limit: time_limit.to_string(),
            statement: statement.to_string(),
            created_at_unix: unix_now(),
        };

        connection
            .execute(
                "
                INSERT INTO problems (
                    problem_id, slug, title, category, difficulty, status, solved_count,
                    time_limit, statement, created_at_unix, created_by_user_id
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, ?10)
                ",
                params![
                    problem.problem_id,
                    problem.slug,
                    problem.title,
                    problem.category,
                    problem.difficulty,
                    problem.status,
                    problem.time_limit,
                    problem.statement,
                    problem.created_at_unix,
                    created_by_user_id
                ],
            )
            .map_err(map_unique_violation)?;

        Ok(problem)
    }
}

fn query_user<P: rusqlite::Params>(
    connection: &Connection,
    query: &str,
    params: P,
) -> Result<Option<StoredUser>, Status> {
    connection
        .query_row(query, params, map_user_row)
        .optional()
        .map_err(|_| Status::internal("failed to query user"))
}

fn map_user_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<StoredUser> {
    Ok(StoredUser {
        id: row.get("id")?,
        login: row.get("login")?,
        email: row.get("email")?,
        username: row.get("username")?,
        password_hash: row.get("password_hash")?,
        role: row.get("role")?,
        title: row.get("title")?,
        visibility: row.get("visibility")?,
        tournaments_played: row.get("tournaments_played")?,
        solved_problems: row.get("solved_problems")?,
        calibration_solved: row.get("calibration_solved")?,
        leaderboard_rating: row.get("leaderboard_rating")?,
        leaderboard_hidden: row.get::<_, i64>("leaderboard_hidden")? == 1,
        is_banned: row.get::<_, i64>("is_banned")? == 1,
        last_online_unix: row.get("last_online_unix")?,
        created_at_unix: row.get("created_at_unix")?,
    })
}

fn map_unique_violation(error: rusqlite::Error) -> Status {
    let message = error.to_string();
    if message.contains("UNIQUE constraint failed: users.login") {
        return Status::already_exists("login is already registered");
    }
    if message.contains("UNIQUE constraint failed: users.username") {
        return Status::already_exists("username is already taken");
    }
    if message.contains("UNIQUE constraint failed: problems.slug") {
        return Status::already_exists("problem slug already exists");
    }

    Status::internal("database operation failed")
}

fn empty_to_null(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn bool_to_int(value: bool) -> i32 {
    if value { 1 } else { 0 }
}

fn unix_now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn slugify(value: &str) -> String {
    value
        .trim()
        .to_lowercase()
        .chars()
        .map(|character| if character.is_ascii_alphanumeric() { character } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn problem_identifier() -> String {
    let raw = Uuid::new_v4().simple().to_string().to_uppercase();
    format!("P-{}", &raw[..6])
}

fn migrate_legacy_schema(connection: &Connection) -> Result<(), rusqlite::Error> {
    let mut statement = connection.prepare("PRAGMA table_info(users)")?;
    let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
    let mut has_users_table = false;
    let mut has_email = false;

    for column in columns {
        has_users_table = true;
        if column? == "email" {
            has_email = true;
        }
    }

    if !has_users_table || has_email {
        return Ok(());
    }

    connection.execute_batch(
        "
        ALTER TABLE users RENAME TO users_legacy;

        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            login TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            title TEXT,
            visibility TEXT NOT NULL,
            tournaments_played INTEGER NOT NULL,
            solved_problems INTEGER NOT NULL,
            calibration_solved INTEGER NOT NULL,
            leaderboard_rating INTEGER,
            leaderboard_hidden INTEGER NOT NULL,
            is_banned INTEGER NOT NULL,
            last_online_unix INTEGER NOT NULL,
            created_at_unix INTEGER NOT NULL
        );

        INSERT INTO users (
            id, login, email, username, password_hash, role, title, visibility,
            tournaments_played, solved_problems, calibration_solved, leaderboard_rating,
            leaderboard_hidden, is_banned, last_online_unix, created_at_unix
        )
        SELECT
            id,
            login,
            login || '@users.statecode.local',
            username,
            password_hash,
            'user',
            NULL,
            'public',
            0,
            0,
            0,
            NULL,
            0,
            0,
            created_at_unix,
            created_at_unix
        FROM users_legacy;

        DROP TABLE users_legacy;
        DROP TABLE IF EXISTS sessions;
        DROP TABLE IF EXISTS problems;
        ",
    )?;

    Ok(())
}
