function getResult(homeScore, awayScore) {
  if (homeScore > awayScore) return "HOME_WIN";
  if (homeScore < awayScore) return "AWAY_WIN";
  return "DRAW";
}

function calcularPontuacao(palpite, resultado) {
  const ph = palpite.predicted_home_score;
  const pa = palpite.predicted_away_score;

  const rh = resultado.home_score;
  const ra = resultado.away_score;

  const palpiteResultado = getResult(ph, pa);
  const resultadoReal = getResult(rh, ra);

  const palpiteDiff = Math.abs(ph - pa);
  const resultadoDiff = Math.abs(rh - ra);

  // Placar exato
  if (ph === rh && pa === ra) {
    return 25;
  }

  // Errou vencedor/empate
  if (palpiteResultado !== resultadoReal) {
    return 0;
  }

  // Apenas resultado correto em caso de empate
  if (resultadoReal === "DRAW") {
    return 10;
  }

  const vencedorHome = rh > ra;

  const golsVencedorPalpite = vencedorHome ? ph : pa;
  const golsVencedorReal = vencedorHome ? rh : ra;

  const golsPerdedorPalpite = vencedorHome ? pa : ph;
  const golsPerdedorReal = vencedorHome ? ra : rh;

  // Vencedor + gols do vencedor
  if (golsVencedorPalpite === golsVencedorReal) {
    return 18;
  }

  // Vencedor + diferença de gols
  if (palpiteDiff === resultadoDiff) {
    return 15;
  }

  // Vencedor + gols do perdedor
  if (golsPerdedorPalpite === golsPerdedorReal) {
    return 12;
  }

  // Apenas resultado correto
  return 10;
}

module.exports = {
  calcularPontuacao,
};