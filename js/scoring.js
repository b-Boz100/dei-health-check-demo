export function computeScores(answers, config) {
  const categoryTotals = new Map(
    config.categories.map((category) => [category.id, { sum: 0, count: 0 }])
  );

  for (const question of config.questions) {
    const answer = answers[question.id];
    if (
      typeof answer !== 'number' ||
      !Number.isInteger(answer) ||
      answer < 1 ||
      answer > 5
    ) {
      throw new Error(`Invalid or missing answer for question "${question.id}": ${answer}`);
    }
    // Answers are 1-5 but scored 0-4, so Strongly Disagree is a true 0%.
    const totals = categoryTotals.get(question.categoryId);
    totals.sum += answer - 1;
    totals.count += 1;
  }

  const categoryScores = {};
  let categoryScoreSum = 0;

  for (const category of config.categories) {
    const totals = categoryTotals.get(category.id);
    const score = Math.round((totals.sum / totals.count / 4) * 100);
    categoryScores[category.id] = { score, band: bandFor(score, config.bands) };
    categoryScoreSum += score;
  }

  const overallScore = Math.round(categoryScoreSum / config.categories.length);

  return {
    categoryScores,
    overall: { score: overallScore, band: bandFor(overallScore, config.bands) },
  };
}

function bandFor(score, bands) {
  const band = bands.find((b) => score >= b.minScore && score <= b.maxScore);
  if (!band) {
    throw new Error(`No band configured covering score ${score}`);
  }
  return band.id;
}
