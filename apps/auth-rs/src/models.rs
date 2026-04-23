use chrono::{DateTime, Utc};

pub const CALIBRATION_TARGET: i32 = 5;

#[derive(Debug, Clone)]
pub struct StoredUser {
    pub id: String,
    pub login: String,
    pub email: String,
    pub username: String,
    pub password_hash: String,
    pub role: String,
    pub title: Option<String>,
    pub visibility: String,
    pub tournaments_played: i32,
    pub solved_problems: i32,
    pub calibration_solved: i32,
    pub leaderboard_rating: Option<i32>,
    pub leaderboard_hidden: bool,
    pub is_banned: bool,
    pub last_online_unix: i64,
    pub created_at_unix: i64,
}

#[derive(Debug, Clone)]
pub struct StoredProblem {
    pub problem_id: String,
    pub slug: String,
    pub title: String,
    pub category: String,
    pub difficulty: i32,
    pub status: String,
    pub solved_count: i32,
    pub time_limit: String,
    pub statement: String,
    pub languages: Vec<String>,
    pub created_at_unix: i64,
    pub solved_by_current_user: bool,
}

#[derive(Debug, Clone)]
pub struct LeaderboardUser {
    pub username: String,
    pub title: String,
    pub rating: i32,
    pub solved_problems: i32,
    pub tournaments_played: i32,
}

pub fn to_iso(timestamp: i64) -> String {
    DateTime::<Utc>::from_timestamp(timestamp, 0)
        .unwrap_or_else(Utc::now)
        .to_rfc3339()
}

pub fn profile_url(username: &str) -> String {
    format!("https://statecode.dev/{username}")
}

pub fn supported_languages() -> Vec<String> {
    [
        "C",
        "C++17",
        "C++20",
        "Rust",
        "Go",
        "Java 21",
        "Kotlin",
        "Python 3.12",
        "JavaScript",
        "TypeScript",
        "C#",
    ]
    .into_iter()
    .map(str::to_string)
    .collect()
}
