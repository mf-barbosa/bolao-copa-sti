export const teamFlags = {
  México: '/icons/flags/mx.svg',
  Mexico: '/icons/flags/mx.svg',

  'África do Sul': '/icons/flags/za.svg',
  'Africa do Sul': '/icons/flags/za.svg',

  'Coreia do Sul': '/icons/flags/kr.svg',

  'República Tcheca': '/icons/flags/cz.svg',
  'Republica Tcheca': '/icons/flags/cz.svg',

  Canadá: '/icons/flags/ca.svg',
  Canada: '/icons/flags/ca.svg',

  Bósnia: '/icons/flags/ba.svg',
  Bosnia: '/icons/flags/ba.svg',

  Catar: '/icons/flags/qa.svg',
  Qatar: '/icons/flags/qa.svg',

  Suíça: '/icons/flags/ch.svg',
  Suica: '/icons/flags/ch.svg',

  Brasil: '/icons/flags/br.svg',

  Marrocos: '/icons/flags/ma.svg',

  Haiti: '/icons/flags/ht.svg',

  Escócia: '/icons/flags/gb-sct.svg',
  Escocia: '/icons/flags/gb-sct.svg',

  'Estados Unidos': '/icons/flags/us.svg',
  EUA: '/icons/flags/us.svg',
  USA: '/icons/flags/us.svg',

  Paraguai: '/icons/flags/py.svg',

  Austrália: '/icons/flags/au.svg',
  Australia: '/icons/flags/au.svg',

  Turquia: '/icons/flags/tr.svg',

  Alemanha: '/icons/flags/de.svg',

  Curaçao: '/icons/flags/cw.svg',
  Curacao: '/icons/flags/cw.svg',

  'Costa do Marfim': '/icons/flags/ci.svg',

  Equador: '/icons/flags/ec.svg',

  Holanda: '/icons/flags/nl.svg',
  'Países Baixos': '/icons/flags/nl.svg',
  'Paises Baixos': '/icons/flags/nl.svg',

  Japão: '/icons/flags/jp.svg',
  Japao: '/icons/flags/jp.svg',

  Suécia: '/icons/flags/se.svg',
  Suecia: '/icons/flags/se.svg',

  Tunísia: '/icons/flags/tn.svg',
  Tunisia: '/icons/flags/tn.svg',

  Bélgica: '/icons/flags/be.svg',
  Belgica: '/icons/flags/be.svg',

  Egito: '/icons/flags/eg.svg',

  Irã: '/icons/flags/ir.svg',
  Ira: '/icons/flags/ir.svg',

  'Nova Zelândia': '/icons/flags/nz.svg',
  'Nova Zelandia': '/icons/flags/nz.svg',

  Espanha: '/icons/flags/es.svg',

  'Cabo Verde': '/icons/flags/cv.svg',

  'Arábia Saudita': '/icons/flags/sa.svg',
  'Arabia Saudita': '/icons/flags/sa.svg',

  Uruguai: '/icons/flags/uy.svg',

  França: '/icons/flags/fr.svg',
  Franca: '/icons/flags/fr.svg',

  Senegal: '/icons/flags/sn.svg',

  Iraque: '/icons/flags/iq.svg',

  Noruega: '/icons/flags/no.svg',

  Argentina: '/icons/flags/ar.svg',

  Argélia: '/icons/flags/dz.svg',
  Argelia: '/icons/flags/dz.svg',

  Áustria: '/icons/flags/at.svg',
  Austria: '/icons/flags/at.svg',

  Jordânia: '/icons/flags/jo.svg',
  Jordania: '/icons/flags/jo.svg',

  Portugal: '/icons/flags/pt.svg',

  'RD Congo': '/icons/flags/cd.svg',
  'República Democrática do Congo': '/icons/flags/cd.svg',
  'Republica Democratica do Congo': '/icons/flags/cd.svg',

  Uzbequistão: '/icons/flags/uz.svg',
  Uzbequistao: '/icons/flags/uz.svg',

  Colômbia: '/icons/flags/co.svg',
  Colombia: '/icons/flags/co.svg',

  Inglaterra: '/icons/flags/gb-eng.svg',

  Croácia: '/icons/flags/hr.svg',
  Croacia: '/icons/flags/hr.svg',

  Gana: '/icons/flags/gh.svg',

  Panamá: '/icons/flags/pa.svg',
  Panama: '/icons/flags/pa.svg',
};

export function getTeamFlag(teamName) {
  if (!teamName) {
    return null;
  }

  return teamFlags[teamName.trim()] || null;
}