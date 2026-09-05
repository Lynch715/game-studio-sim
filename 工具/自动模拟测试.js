const { chromium } = require('playwright');
const policy = process.argv[2] || 'smart';
const years = +(process.argv[3] || 12);
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 2).join(' | ')));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  page.on('dialog', d => d.accept());
  await page.goto('file://' + __dirname + '/开个游戏公司.html');
  await page.waitForTimeout(400);
  const result = await page.evaluate(async ({ policy, years }) => {
    const log = [];
    newGame();
    const closeAll = () => {
      for (const d of [...document.querySelectorAll('dialog[open]')]) {
        const title = (byId('dlgTitle').textContent || '');
        if (d.id === 'dlg') {
          if (title.includes('抉择')) { applyDecision(rnd(0, 2)); }
          else if (title.includes('挖角')) { resolvePoach(S.money > 300000 ? 'raise' : 'talk'); }
          else if (title.includes('公司危机')) { if (policy === 'smart' && S.loans.length < 2) takeLoan(); else closeDlg(); }
          else if (title.includes('停止营业')) { return 'gameover'; }
          else if (title.includes('颁奖典礼')) { ceremony.i = ceremony.res.length; renderCeremony(); }
          else if (title.includes('金像素奖')) { ceremony = null; setAnnualGoal(rnd(0, GOALS.length - 1)); }
          else if (title.includes('游戏展 · 现场')) { closeDlg(); }
          else if (title.includes('星云游戏展')) { resolveExpo(policy === 'smart' ? (S.money > 500000 ? 'std' : 'small') : pick(['none', 'small'])); }
          else if (title.includes('使用道具') || title.includes('道具商店')) { closeDlg(); }
          else if (title.includes('董事会目标')) { setAnnualGoal(rnd(0, GOALS.length - 1)); }
          else if (title.includes('十年')) { closeDlg(); }
          else if (title.includes('传承')) { closeDlg(); }
          else if (S.event) { resolveEvent(policy === 'smart' ? S.money > 400000 : Math.random() < .5); }
          else closeDlg();
        } else if (d.id === 'reviewDialog') closeReview();
        else if (d.id === 'projectDialog') closeProjectDialog();
      }
      if (S.alert) dismissAlert();
    };
    let released = 0, weeks = 0, itemsUsed = 0, jobChanges = 0;
    const snap = [], qualAtRelease = [];
    const bestPreset = g => { const w = GENRE_W[g]; const order = DIMS.slice().sort((a, b) => w[b] - w[a]); const pts = { code: 0, art: 0, music: 0, idea: 0 }; pts[order[0]] = 4; pts[order[1]] = 3; pts[order[2]] = 1; return pts; };
    while (S && S.year < 2028 + years && weeks < 48 * years + 5) {
      const go = closeAll(); if (go === 'gameover') { log.push('GAME OVER at ' + S.year + '.' + S.month); break; }
      for (const p of [...S.projects]) {
        if (p.stage === 'debug') {
          if (policy === 'smart') { let n = 0; while (p.bugs > 3 && S.money > 150000 && n++ < 3) debugProject(p.id, false); if (S.money > 900000) debugProject(p.id, true); }
          else if (p.bugs > 6 && S.money > 100000) debugProject(p.id, false);
          qualAtRelease.push({ size: p.size, q: { ...p.quality }, bugs: p.bugs });
          releaseProject(p.id); released++;
          closeAll();
        }
        if (p.paused) { try { resumeProject(p.id); } catch (e) { } }
      }
      closeAll();
      if (S.projects.length < capacity()) {
        const free = S.staff.filter(e => !e.status && e.energy > 40);
        if (free.length >= 2 && S.money > 250000) {
          openProject();
          const boxes = [...document.querySelectorAll('#projectPicks input')];
          boxes.forEach(b => b.checked = false);
          const ids = free.sort((a, b) => b.lvl - a.lvl).slice(0, 3).map(e => e.id);
          boxes.forEach(b => { if (ids.includes(+b.value)) b.checked = true; });
          const size = S.money > 2500000 && S.level >= 2 ? 'large' : S.money > 900000 ? 'normal' : 'small';
          byId('psize').value = size;
          const g = byId('pgenre'), t = byId('ptheme');
          if (policy === 'smart') {
            // prefer known S/A combos, else random unknown
            const knownGood = Object.entries(S.combos).filter(([k, v]) => (v.tier === 'S' || v.tier === 'A') && S.unlocked.genres.includes(k.split('|')[0]) && S.unlocked.themes.includes(k.split('|')[1]));
            if (knownGood.length && Math.random() < .75) { const [k] = knownGood[rnd(0, knownGood.length - 1)]; g.value = k.split('|')[0]; t.value = k.split('|')[1]; }
            else { g.selectedIndex = rnd(0, g.options.length - 1); t.selectedIndex = rnd(0, t.options.length - 1); }
            if (S.trend.category === 'genre' && S.unlocked.genres.includes(S.trend.name) && Math.random() < .5) g.value = S.trend.name;
            byId('pmarketing').value = S.money > 1500000 ? '110000' : S.money > 600000 ? '45000' : '0';
            dirPts = bestPreset(g.value);
            // pick platform with most users
            const pl = byId('pplatform'); let best = 0, bi = 0; [...pl.options].forEach((o, i) => { const u = platform(o.value).users; if (u > best) { best = u; bi = i; } }); pl.selectedIndex = bi;
          } else {
            g.selectedIndex = rnd(0, g.options.length - 1); t.selectedIndex = rnd(0, t.options.length - 1);
            byId('pmarketing').value = '0';
          }
          byId('pname').value = 'T' + (released + 1);
          previewProject();
          try { startProject(); } catch (e) { log.push('startProject err ' + e.message); }
          closeAll();
        }
      }
      if (policy === 'smart') {
        // outsourcing when idle staff and no project possible
        if (!S.outsource && !S.outsourceCooldown && S.staff.filter(e => !e.status).length >= 2 && S.projects.length >= capacity()) {
          try { openOutsource(); selectJob('custom'); startOutsource('custom'); } catch (e) { }
          closeAll();
        }
        // hire when rich
        if (S.money > 1800000 && S.staff.length < officeDef().cap) { try { drawCandidates('web'); hire(0, 40000); } catch (e) { log.push('hire err ' + e.message); } closeAll(); }
        if (OFFICES[S.office + 1] && S.money > OFFICES[S.office + 1].cost * 2.2 && S.level >= OFFICES[S.office + 1].need && S.staff.length >= officeDef().cap - 1) { try { moveOffice(); } catch (e) { } }
        // rest tired idle
        S.staff.forEach(e => { if (e.energy < 30 && !e.status) scheduleRest(e.id); });
        closeAll();
        // train idle with money
        if (S.money > 700000) S.staff.filter(e => !e.status).slice(0, 1).forEach(e => scheduleTraining(e.id, ROLES[e.role][2]));
        closeAll();
        // research
        if (S.rp >= 20) { const r = S.researchUpgrades; const id = ['pipeline', 'market', 'academy'].sort((a, b) => r[a] - r[b])[0]; researchUpgrade(id); }
        // facilities
        if (S.money > 1200000) { const fid = Object.keys(FACILITIES).sort((a, b) => S.facilities[a] - S.facilities[b])[0]; buyFacility(fid); closeAll(); }
        if (S.money > 3000000) { const id = Object.keys(INVESTMENTS).sort((a, b) => S.investments[a] - S.investments[b])[0]; buyInvestment(id); }
        // items: buy & use
        if (S.rp >= 30 && S.projects.length) { const p = S.projects[0]; if (p.stage !== 'debug') { const w = GENRE_W[p.genre]; const k = DIMS.slice().sort((a, b) => w[b] - w[a])[0]; buyItem(k); closeAll(); useItem(k, 'project', p.id); closeAll(); itemsUsed++; } }
        if (S.money > 400000 && S.projects.some(p => p.stage === 'debug')) { const p = S.projects.find(p => p.stage === 'debug'); buyItem('hype'); closeAll(); useItem('hype', 'project', p.id); closeAll(); buyItem('debug'); closeAll(); useItem('debug', 'project', p.id); closeAll(); itemsUsed += 2; }
        // job change
        const cand = S.staff.find(e => !e.status && careerOptions(e).some(c => e.lvl >= c.minLvl));
        if (cand && (itemCount('book') || (S.rp >= 20 && S.money > 300000))) { if (!itemCount('book')) { buyItem('book'); closeAll(); } const c = careerOptions(cand).find(c => cand.lvl >= c.minLvl); changeJob(cand.id, c.id); closeAll(); jobChanges++; }
        if (S.money > 200000) { const tired = S.staff.find(e => e.energy < 40 && e.status?.kind === 'project'); if (tired) { buyItem('energy'); closeAll(); useItem('energy', 'staff', tired.id); closeAll(); itemsUsed++; } }
      }
      closeAll();
      speed = 1;
      try { advanceWeek(); } catch (e) { log.push('advanceWeek err @' + S.year + '.' + S.month + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]); break; }
      weeks++;
      if (S.week === 1 && S.month === 1) snap.push({ year: S.year, money: Math.round(S.money), fame: +S.fame.toFixed(1), fans: S.fans, staff: S.staff.length, games: S.games.length, level: S.level, office: S.office, rp: S.rp, hof: S.hallOfFame.length, awards: S.awardHistory.reduce((a, x) => a + x.playerWins, 0), avgScore: S.games.length ? +(S.games.reduce((a, g) => a + g.score, 0) / S.games.length).toFixed(2) : 0 });
    }
    // exercise pages & dialogs once
    const ui = [];
    try { for (const p of ['home', 'team', 'market', 'works', 'research', 'codex']) { page(p); } page('home'); } catch (e) { ui.push('page err ' + e.message); }
    try { openFacilities(); closeDlg(); openRecruit(); closeDlg(); openOutsource(); closeDlg(); openSystemMenu(); closeDlg(); openHelp(); closeDlg(); if (S.staff[0]) { openPerson(S.staff[0].id); closeDlg(); } if (S.games[0]) { showSalesReport(S.games[0].id); closeDlg(); openPostOps(S.games[0].id); closeDlg(); showReviewAgain(S.games[0].id); closeReview(); } chooseAnnualGoal(); closeDlg(); openImport(); closeDlg(); if (S.ips[0]) { startSequel(S.ips[0].id); closeProjectDialog(); } } catch (e) { ui.push('dialog err ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
    const games = S.games.slice(0, 60).map(g => ({ n: g.name, s: g.score, tot: g.total, size: g.size, combo: g.comboTier, cost: Math.round(g.finance.total), net: Math.round(g.netRevenue), profit: Math.round(g.profit), units: g.units, rev: g.reviews.map(r => r.score).join('/') }));
    return { log, ui, snap, games, qualAtRelease: qualAtRelease.slice(-8), weeks, released, itemsUsed, jobChanges, roles: S ? S.staff.map(e => e.role + 'L' + e.lvl).join(',') : '', expos: S ? S.expoHistory.length : 0, final: S ? { year: S.year, money: Math.round(S.money), staff: S.staff.length, games: S.games.length, combosKnown: Object.keys(S.combos).length, hof: S.hallOfFame.length } : null };
  }, { policy, years });
  console.log(JSON.stringify(result));
  console.log('ERRORS:', JSON.stringify(errors.slice(0, 20)));
  await page.screenshot({ path: __dirname + '/shot_' + policy + '.png', fullPage: false });
  await browser.close();
})();
