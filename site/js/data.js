/* LaCheie – date pentru calculatorul orientativ și contact.
   TOATE VALORILE DE AICI SUNT EXEMPLE pentru macheta demo.
   Firma reală le înlocuiește cu prețurile și ritmul ei de lucru.

   Cum se calculează (vezi js/app.js → estimeaza):
   - manoperă  = pret[nivel].manopera × m²  + jumătate din costFix
   - materiale = pret[nivel].materiale × m² + jumătate din costFix
   - demolare  = demolare.leiMp × m² + demolare.fix   (doar dacă e bifată)
   - interval preț = total ± marjaPret, rotunjit la 500 lei
   - zile = (durata.baza + durata.zileMp × m²) × nivel.factorDurata
            + durata.demolare (doar dacă e bifată)
   - interval durată = zile × durataMin … zile × durataMax,
     afișat în unitatea tipului (zile / săptămâni / luni)          */
window.LACHEIE = {
  // Număr WhatsApp în format internațional, fără + și fără spații (EXEMPLU)
  WHATSAPP_NUMBER: '40700000000',
  TELEFON_AFISAT: '0700 000 000',
  TELEFON_LINK: '+40700000000',
  FORM_NAME: 'renovari-lacheie',

  // Încărcare poze în formular
  POZE_MAX: 10,
  POZE_MAX_MB: 8,

  marjaPret: 0.10, // ±10 %
  durataMin: 0.9,  // -10 %
  durataMax: 1.12, // +12 %

  nivele: {
    standard: { nume: 'Standard', factorDurata: 1.0 },
    premium: { nume: 'Premium', factorDurata: 1.15 },
    lux: { nume: 'Lux', factorDurata: 1.3 }
  },

  tipuri: {
    baie: {
      nume: 'Baie',
      mp: { min: 2, max: 20, implicit: 6 },
      // lei/m², cu TVA (EXEMPLE)
      pret: {
        standard: { manopera: 2600, materiale: 2600 },
        premium: { manopera: 2900, materiale: 4000 },
        lux: { manopera: 3400, materiale: 6500 }
      },
      costFix: 2500, // instalații sanitare, racorduri (EXEMPLU)
      demolare: { leiMp: 400, fix: 1500 },
      durata: { baza: 8, zileMp: 0.6, demolare: 2, unitate: 'zile' }
    },
    bucatarie: {
      nume: 'Bucătărie',
      mp: { min: 4, max: 30, implicit: 10 },
      pret: {
        standard: { manopera: 1100, materiale: 1200 },
        premium: { manopera: 1300, materiale: 1900 },
        lux: { manopera: 1600, materiale: 3000 }
      },
      costFix: 3000,
      demolare: { leiMp: 250, fix: 1500 },
      durata: { baza: 7, zileMp: 0.5, demolare: 2, unitate: 'zile' }
    },
    apartament: {
      nume: 'Apartament complet',
      mp: { min: 25, max: 200, implicit: 72 },
      pret: {
        standard: { manopera: 650, materiale: 650 },
        premium: { manopera: 850, materiale: 1050 },
        lux: { manopera: 1100, materiale: 1700 }
      },
      costFix: 5000,
      demolare: { leiMp: 120, fix: 1500 },
      durata: { baza: 20, zileMp: 0.5, demolare: 5, unitate: 'saptamani' }
    },
    casa: {
      nume: 'Casă',
      mp: { min: 60, max: 400, implicit: 140 },
      pret: {
        standard: { manopera: 750, materiale: 700 },
        premium: { manopera: 950, materiale: 1050 },
        lux: { manopera: 1150, materiale: 1600 }
      },
      costFix: 10000,
      demolare: { leiMp: 150, fix: 3000 },
      durata: { baza: 40, zileMp: 0.55, demolare: 10, unitate: 'luni' }
    }
  }
};
