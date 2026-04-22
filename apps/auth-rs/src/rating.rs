use crate::models::CALIBRATION_TARGET;

const RANK_RULES: &[(i32, &str)] = &[
    (2400, "Legend"),
    (2100, "Grandmaster"),
    (1800, "Master"),
    (1500, "Candidate Master"),
    (1250, "Expert"),
    (1000, "Specialist"),
    (750, "Apprentice"),
    (0, "Novice"),
];

pub fn resolve_rank(rating: Option<i32>, calibration_solved: i32) -> String {
    if calibration_solved < CALIBRATION_TARGET || rating.is_none() {
        return "Calibrating".to_string();
    }

    let rating_value = rating.unwrap_or_default();
    RANK_RULES
        .iter()
        .find(|(threshold, _)| rating_value >= *threshold)
        .map(|(_, label)| (*label).to_string())
        .unwrap_or_else(|| "Novice".to_string())
}
