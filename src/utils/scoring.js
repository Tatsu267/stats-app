export const INITIAL_SCORE = 40;
export const MAX_SCORE = 100;
export const MIN_SCORE = 0;

/**
 * Calculate new score based on answer correctness, difficulty, and time taken.
 * @param {number} currentScore - Current score (0-100)
 * @param {boolean} isCorrect - Whether the answer was correct
 * @param {string} difficulty - 'Easy', 'Medium', 'Hard'
 * @param {number} timeTakenSeconds - Time taken to answer in seconds
 * @returns {number} New score
 */
export function calculateNewScore(currentScore, isCorrect, difficulty, timeTakenSeconds) {
    let change = 0;

    // Base points based on difficulty
    const basePoints = {
        'Easy': 2,
        'Medium': 4,
        'Hard': 6
    };

    const points = basePoints[difficulty] || 2;

    if (isCorrect) {
        change = points;

        // Time bonus: if answered within 10 seconds, add 1 point bonus
        if (timeTakenSeconds < 10) {
            change += 1;
        }
    } else {
        // Penalty is half of the potential gain, but at least 1
        change = -Math.max(1, Math.floor(points / 2));
    }

    // Calculate new score and clamp between MIN and MAX
    const newScore = Math.min(MAX_SCORE, Math.max(MIN_SCORE, currentScore + change));

    return newScore;
}

/**
 * Get score label/grade based on score
 * @param {number} score 
 * @returns {string}
 */
export function getScoreGrade(score) {
    if (score >= 90) return 'SS';
    if (score >= 80) return 'S';
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return 'D';
}
