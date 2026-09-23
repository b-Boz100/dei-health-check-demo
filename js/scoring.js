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
    const totals = categoryTotals.get(question.categoryId);
    totals.sum += answer;
    totals.count += 1;
  }

  const categoryScores = {};
  let categoryScoreSum = 0;

  for (const category of config.categories) {
    const totals = categoryTotals.get(category.id);
    const score = Math.round((totals.sum / totals.count / 5) * 100);
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
