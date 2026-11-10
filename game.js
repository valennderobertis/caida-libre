/**
 * game.js - Lógica Principal, Estados y Bucle de Juego de "Caída Libre"
 * Dificultad +12% calibrada. Pantallas 100% auténticas sin superposiciones.
 */

class CaidaLibreGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Módulos
    this.player = new Skydiver(this.canvas.width, this.canvas.height);
    this.obstacleMgr = new ObstacleManager(this.canvas.width, this.canvas.height);
    this.env = new Environment(this.canvas.width, this.canvas.height);

    // Canvas auxiliar para procesamiento de efectos de Glitch
    this.glitchCanvas = document.createElement('canvas');
    this.glitchCanvas.width = this.canvas.width;
    this.glitchCanvas.height = this.canvas.height;
    this.glitchCtx = this.glitchCanvas.getContext('2d');

    // Estados
    this.state = 'START_SCREEN';
    this.currentLevel = 1;
    this.maxLevels = 10;
    this.lives = 3;
    this.score = 0;

    // Monedas
    this.levelCoins = 0;
    this.totalCoins = 0;

    // Cronómetro
    this.gameTimeSeconds = 0;

    // Físicas: +12% de dificultad (velocidad base 490 px/s, aumento de 50 px/s por nivel)
    this.levelDistance = 9000;
    this.playerWorldY = 0;
    this.baseSpeed = 490;
    this.currentFallSpeed = 490;

    // Controles
    this.input = { left: false, right: false, space: false };
    this.setupInput();

    // Timers
    this.stateTimer = 0;
    this.screenShake = 0;

    // Pantallas DOM
    this.screens = {
      start: document.getElementById('screen-start'),
      tutorial: document.getElementById('screen-tutorial'),
      death: document.getElementById('screen-death'),
      loop: document.getElementById('screen-loop'),
      gameover: document.getElementById('screen-gameover'),
      victory: document.getElementById('screen-victory')
    };

    // Botones
    this.buttons = {
      btnStart: document.getElementById('btn-start-action'),
      btnTutorial: document.getElementById('btn-tutorial-ok'),
      btnRetry: document.getElementById('btn-retry-action'),
      btnLoop: document.getElementById('btn-loop-jump'),
      btnRestart: document.getElementById('btn-restart-action'),
      btnPlayAgain: document.getElementById('btn-play-again-action')
    };

    this.setupButtonEvents();

    // Carga de recursos
    window.assets.loadAll(null, () => {
      console.log("¡Todos los recursos pixel-art cargados con éxito!");
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    });
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code) || ['ArrowLeft', 'a', 'A'].includes(e.key)) {
        this.input.left = true;
      }
      if (['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code) || ['ArrowRight', 'd', 'D'].includes(e.key)) {
        this.input.right = true;
      }
      if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
        this.input.space = true;
        this.handleSpaceAction();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code) || ['ArrowLeft', 'a', 'A'].includes(e.key)) {
        this.input.left = false;
      }
      if (['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code) || ['ArrowRight', 'd', 'D'].includes(e.key)) {
        this.input.right = false;
      }
      if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter') {
        this.input.space = false;
      }
    });
  }

  setupButtonEvents() {
    // Clic en botones o en cualquier parte de la pantalla activa avanza la acción
    Object.keys(this.screens).forEach((key) => {
      const scr = this.screens[key];
      if (scr) {
        scr.addEventListener('click', (e) => {
          this.handleSpaceAction();
        });
      }
    });
  }

  handleSpaceAction() {
    window.soundEngine.init();
    window.soundEngine.resume();

    switch (this.state) {
      case 'START_SCREEN':
        this.showTutorialScreen();
        break;

      case 'TUTORIAL':
        this.startGameSession();
        break;

      case 'INTRO':
        this.startLevelDescent();
        break;

      case 'LOOP_DIALOG':
        this.startLevelDescent();
        break;

      case 'HIT_PAUSE':
        this.retryLevel();
        break;

      case 'GAMEOVER':
        this.restartFromBeginning();
        break;

      case 'VICTORY':
        this.restartFromBeginning();
        break;
    }
  }

  hideAllScreens() {
    Object.values(this.screens).forEach((scr) => {
      if (scr) {
        scr.classList.add('hidden');
        scr.classList.remove('active');
      }
    });
  }

  showScreen(screenKey) {
    this.hideAllScreens();
    if (this.screens[screenKey]) {
      this.screens[screenKey].classList.remove('hidden');
      this.screens[screenKey].classList.add('active');
    }
  }

  showTutorialScreen() {
    this.state = 'TUTORIAL';
    this.showScreen('tutorial');
  }

  startGameSession() {
    this.currentLevel = 1;
    this.lives = 3;
    this.score = 0;
    this.totalCoins = 0;
    this.gameTimeSeconds = 0;
    this.startHelicopterIntro();
  }

  restartFromBeginning() {
    this.currentLevel = 1;
    this.lives = 3;
    this.score = 0;
    this.totalCoins = 0;
    this.gameTimeSeconds = 0;
    this.startHelicopterIntro();
  }

  retryLevel() {
    this.hideAllScreens();
    this.levelCoins = 0;
    this.startLevelDescent(true);
  }

  startHelicopterIntro() {
    this.hideAllScreens();
    this.state = 'INTRO';
    this.stateTimer = 0;
    window.soundEngine.startHelicopterSound();
  }

  startLevelDescent(isRetry = false) {
    window.soundEngine.stopHelicopterSound(0.5);
    this.hideAllScreens();
    this.state = 'PLAYING';
    this.stateTimer = 0;

    // +12% de velocidad por nivel
    this.currentFallSpeed = this.baseSpeed + (this.currentLevel - 1) * 50;

    this.playerWorldY = 0;
    this.player.reset(this.canvas.width / 2);

    if (!isRetry) {
      this.levelCoins = 0;
    }

    // Generar obstáculos, los 2 árboles al suelo y 10 monedas
    this.obstacleMgr.generateLevel(this.currentLevel, this.levelDistance);

    window.soundEngine.playJump();
    window.soundEngine.setWindIntensity(0.45 + (this.currentLevel / this.maxLevels) * 0.45);
    window.soundEngine.startMusicLoop();
  }

  // --- BUCLE PRINCIPAL ---

  gameLoop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 32);
    }

    switch (this.state) {
      case 'INTRO':
        this.updateIntro(dt);
        break;

      case 'PLAYING':
        this.updatePlaying(dt);
        break;

      case 'LOOP_WARP':
        this.updateLoopWarp(dt);
        break;

      case 'PARACHUTE_OUTRO':
        this.updateParachuteOutro(dt);
        break;
    }
  }

  updateIntro(dt) {
    this.stateTimer += dt;
    if (this.stateTimer >= 2.5) {
      this.startLevelDescent();
    }
  }

  updatePlaying(dt) {
    this.gameTimeSeconds += dt;
    this.playerWorldY += this.currentFallSpeed * dt;
    this.score += Math.floor(dt * 55 * this.currentLevel);

    const progress = Math.min(1.0, this.playerWorldY / this.levelDistance);
    const altitudeMeters = Math.max(0, Math.floor(10000 * (1 - progress)));

    this.env.update(dt, progress, this.currentFallSpeed);
    this.player.update(dt, this.input);
    this.obstacleMgr.update(dt, this.playerWorldY, this.player.y, this.currentFallSpeed);

    const collision = this.obstacleMgr.checkCollisions(
      this.player,
      this.playerWorldY,
      (coin) => this.onCollectCoin(coin),
      (parachute) => this.onCollectParachute(parachute)
    );

    if (collision) {
      this.onPlayerHit();
      return;
    }

    // Llegada al Lago (Final del Nivel)
    if (this.playerWorldY >= this.levelDistance) {
      if (this.currentLevel === 10 && this.player.hasParachute) {
        this.triggerParachuteVictory();
      } else {
        this.triggerTimeLoopWarp();
      }
    }
  }

  onCollectCoin(coin) {
    this.levelCoins++;
    this.totalCoins++;
    this.score += 250;
    window.soundEngine.playCoin();
  }

  onCollectParachute(item) {
    this.player.deployParachute();
    window.soundEngine.playParachute();
    this.currentFallSpeed *= 0.40;
  }

  onPlayerHit() {
    window.soundEngine.stopMusicLoop();
    this.player.triggerHit();
    this.lives--;
    this.screenShake = 18;
    window.soundEngine.playCrash();

    if (this.lives > 0) {
      this.state = 'HIT_PAUSE';
      this.showScreen('death');
    } else {
      this.state = 'GAMEOVER';
      this.showScreen('gameover');
    }
  }

  // --- BUCLE TEMPORAL Y EFECTO GLITCH (NIVELES 1 A 9) ---

  triggerTimeLoopWarp() {
    window.soundEngine.stopMusicLoop();
    this.state = 'LOOP_WARP';
    this.stateTimer = 0;
    this.screenShake = 0; // Sin sacudida destructiva de muerte; el glitch maneja su propia distorsión digital
    this.score += 1500 * this.currentLevel; // Bonificación de nivel completado
    window.soundEngine.playTimeLoopWarp(); // Arpegio triunfal + glitch cibernético
  }

  updateLoopWarp(dt) {
    this.stateTimer += dt;
    if (this.stateTimer >= 1.85) {
      this.currentLevel++;
      this.state = 'LOOP_DIALOG';
      this.showScreen('loop');
    }
  }

  // --- VICTORIA (NIVEL 10 CON PARACAÍDAS) ---

  triggerParachuteVictory() {
    window.soundEngine.stopMusicLoop();
    this.state = 'PARACHUTE_OUTRO';
    this.stateTimer = 0;
    window.soundEngine.playVictoryChord();
  }

  updateParachuteOutro(dt) {
    this.stateTimer += dt;
    this.player.x += 150 * dt;
    if (this.stateTimer >= 2.4) {
      this.state = 'VICTORY';
      this.showScreen('victory');
    }
  }

  // --- RENDERIZADO VISUAL ---

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const progress = Math.min(1.0, this.playerWorldY / this.levelDistance);
    const altitudeMeters = Math.max(0, Math.floor(10000 * (1 - progress)));

    this.ctx.save();

    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(sx, sy);
    }

    if (this.state === 'INTRO') {
      const sx = (Math.random() - 0.5) * 6;
      const sy = (Math.random() - 0.5) * 6;
      this.env.drawHelicopterIntro(this.ctx, this.stateTimer, sx, sy);
    } else if (this.state === 'PLAYING' || this.state === 'LOOP_WARP' || this.state === 'PARACHUTE_OUTRO') {
      // 1. Entorno 2.5D (Cielo, montañas, nubes, lago angosto)
      this.env.draw(this.ctx, progress, altitudeMeters);

      // 2. Escombros, los 2 árboles al suelo, aves y monedas
      this.obstacleMgr.draw(this.ctx, this.playerWorldY, this.player.y);

      // 3. Personaje principal en caída libre
      this.player.draw(this.ctx);

      // 4. Efecto Glitch y Ruptura Temporal al Pasar de Nivel
      if (this.state === 'LOOP_WARP') {
        this.renderGlitchEffect();
      }

      // 5. Barra HUD oficial
      this.renderHUD();
    }

    this.ctx.restore();
  }

  // --- EFECTO GLITCH RETRO ARCADE DE NIVEL SUPERADO ---
  renderGlitchEffect() {
    const totalDuration = 1.85;
    const progress = Math.min(1.0, this.stateTimer / totalDuration);

    // 1. Capturar el fotograma renderizado en el canvas auxiliar
    this.glitchCtx.drawImage(this.canvas, 0, 0);

    // Curva de intensidad: arranca rápido, pico intenso en el centro y flash final
    const intensity = Math.min(1.0, Math.sin(progress * Math.PI) * 1.4);

    // 2. Desplazamiento horizontal por franjas (Slicing / Tear Glitch)
    const numSlices = Math.floor(12 + Math.random() * 14);
    for (let i = 0; i < numSlices; i++) {
      const sy = Math.floor(Math.random() * this.canvas.height);
      const sh = Math.floor(8 + Math.random() * 32);
      const maxShift = 46 * intensity;
      const shiftX = (Math.random() - 0.5) * maxShift;

      this.ctx.drawImage(
        this.glitchCanvas,
        0, sy, this.canvas.width, sh,
        shiftX, sy, this.canvas.width, sh
      );
    }

    // 3. Aberración Cromática RGB Split (Canal Cian y Magenta desfasados)
    const rgbShift = (Math.sin(this.stateTimer * 40) + (Math.random() - 0.5) * 1.4) * 14 * intensity;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.globalAlpha = 0.42 * intensity;
    // Canal Cian (+X)
    this.ctx.drawImage(this.glitchCanvas, rgbShift, 0);
    // Canal Magenta (-X)
    this.ctx.drawImage(this.glitchCanvas, -rgbShift, 0);
    this.ctx.restore();

    // 4. Bloques de píxeles corruptos de color neón (Cyber Artifacts)
    const cyberColors = ['#00f3ff', '#ff007f', '#39ff14', '#ffe600', '#a855f7', '#ffffff'];
    const numBlocks = Math.floor(16 + Math.random() * 16);
    this.ctx.save();
    for (let b = 0; b < numBlocks; b++) {
      const bx = Math.random() * this.canvas.width;
      const by = Math.random() * this.canvas.height;
      const bw = 16 + Math.random() * 85;
      const bh = 3 + Math.random() * 14;
      this.ctx.fillStyle = cyberColors[b % cyberColors.length];
      this.ctx.globalAlpha = (0.28 + Math.random() * 0.55) * intensity;
      this.ctx.fillRect(bx, by, bw, bh);
    }
    this.ctx.restore();

    // 5. Líneas horizontales de estática VHS y escaneo láser
    this.ctx.save();
    const scanCount = Math.floor(4 + Math.random() * 5);
    for (let s = 0; s < scanCount; s++) {
      const sy = Math.random() * this.canvas.height;
      this.ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0, 243, 255, 0.75)' : 'rgba(255, 255, 255, 0.85)';
      this.ctx.fillRect(0, sy, this.canvas.width, 1 + Math.random() * 3);
    }
    this.ctx.restore();

    // 6. Fragmentos de Código Cibernético y Datos de la Anomalía Temporal
    this.ctx.save();
    this.ctx.font = 'bold 13px monospace';
    this.ctx.fillStyle = '#00f3ff';
    this.ctx.globalAlpha = 0.75 * intensity;
    const glitchTexts = [
      '01001100 01001111 01001111 01010000',
      'ANOMALÍA_TEMPORAL::0x7F',
      'REWIND_VORTEX >> 10.000m',
      'REALIDAD_FRAGMENTADA_OK',
      'TIME_LOOP_DESCENT::ACTIVE'
    ];
    glitchTexts.forEach((txt, idx) => {
      const gx = 25 + ((idx * 140) % (this.canvas.width - 200));
      const gy = 120 + idx * 160 + Math.sin(this.stateTimer * 10 + idx) * 12;
      this.ctx.fillText(txt, gx, gy);
    });
    this.ctx.restore();

    // 7. CARTEL RETRO ARCADE DE VICTORIA Y GLITCH (¡Feedback de éxito 100% indiscutible!)
    this.ctx.save();
    const cardW = 580;
    const cardH = 220;
    const cardX = (this.canvas.width - cardW) / 2;
    const cardY = (this.canvas.height - cardH) / 2 - 30;

    // Jitter cibernético del cartel
    const cardJitterX = (Math.random() - 0.5) * 6 * intensity;
    const cardJitterY = (Math.random() - 0.5) * 4 * intensity;

    // Fondo del cartel cyber
    this.ctx.fillStyle = 'rgba(6, 11, 22, 0.93)';
    this.ctx.fillRect(cardX + cardJitterX, cardY + cardJitterY, cardW, cardH);

    // Bordes dobles de neón cian y magenta
    this.ctx.strokeStyle = '#00f3ff';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(cardX + cardJitterX, cardY + cardJitterY, cardW, cardH);

    this.ctx.strokeStyle = '#ff007f';
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(cardX + cardJitterX + 5, cardY + cardJitterY + 5, cardW - 10, cardH - 10);

    // Pestaña superior: ★ ¡NIVEL SUPERADO! ★
    const badgeW = 280;
    const badgeH = 34;
    const badgeX = (this.canvas.width - badgeW) / 2 + cardJitterX;
    const badgeY = cardY - 17 + cardJitterY;

    this.ctx.fillStyle = '#15803d';
    this.ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
    this.ctx.strokeStyle = '#4ade80';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

    this.ctx.fillStyle = '#fef08a';
    this.ctx.font = '900 16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`★ ¡NIVEL ${this.currentLevel} SUPERADO! ★`, badgeX + badgeW / 2, badgeY + badgeH / 2);

    // Título Principal con Glitch Cromático: ¡NIVEL COMPLETADO!
    const titleX = this.canvas.width / 2 + cardJitterX;
    const titleY = cardY + 70 + cardJitterY;
    this.ctx.font = '900 34px monospace';

    // Sombra Magenta desplazada
    this.ctx.fillStyle = '#ff007f';
    this.ctx.fillText('¡NIVEL COMPLETADO!', titleX - 3, titleY + 1);

    // Sombra Cian desplazada
    this.ctx.fillStyle = '#00f3ff';
    this.ctx.fillText('¡NIVEL COMPLETADO!', titleX + 3, titleY - 1);

    // Texto Central Blanco brillante
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText('¡NIVEL COMPLETADO!', titleX, titleY);

    // Subtítulo: ANOMALÍA: BUCLE TEMPORAL
    this.ctx.font = 'bold 18px monospace';
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillText('⚡ ANOMALÍA: BUCLE TEMPORAL ACTIVADO ⚡', titleX, cardY + 115 + cardJitterY);

    // Mensaje de rebobinado
    this.ctx.font = '14px monospace';
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.fillText('Rebobinando espacio-tiempo al momento del salto...', titleX, cardY + 148 + cardJitterY);

    // Monedas y bonificación
    this.ctx.font = 'bold 15px monospace';
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.fillText(`Monedas: ${this.levelCoins}/10 recolectadas  •  +${1500 * this.currentLevel} pts`, titleX, cardY + 185 + cardJitterY);

    this.ctx.restore();

    // 8. Flash final de teletransporte blanco-cian (últimos 0.35s)
    if (progress > 0.78) {
      const flashAlpha = Math.min(1.0, (progress - 0.78) / 0.22);
      this.ctx.save();
      const flashGrad = this.ctx.createRadialGradient(
        this.canvas.width / 2, this.canvas.height / 2, 40,
        this.canvas.width / 2, this.canvas.height / 2, this.canvas.width
      );
      flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha * 0.95})`);
      flashGrad.addColorStop(0.5, `rgba(0, 243, 255, ${flashAlpha * 0.75})`);
      flashGrad.addColorStop(1, `rgba(168, 85, 247, ${flashAlpha * 0.6})`);

      this.ctx.fillStyle = flashGrad;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
  }

  renderHUD() {
    const hudImg = window.assets.get('hudBar');
    if (!hudImg) return;

    this.ctx.save();

    const hudX = 16;
    const hudY = 16;
    const hudW = this.canvas.width - 32;
    const hudH = (hudW / hudImg.width) * hudImg.height;

    this.ctx.drawImage(hudImg, hudX, hudY, hudW, hudH);

    const scale = hudW / hudImg.width;

    // 1. Vidas: oscurecer corazones perdidos si corresponde
    if (this.lives < 3) {
      const h3X = hudX + 200 * scale;
      const h3Y = hudY + 80 * scale;
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      this.ctx.fillRect(h3X, h3Y, 48 * scale, 50 * scale);
    }
    if (this.lives < 2) {
      const h2X = hudX + 145 * scale;
      const h2Y = hudY + 80 * scale;
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      this.ctx.fillRect(h2X, h2Y, 48 * scale, 50 * scale);
    }

    // 2. Monedas
    const coinTextX = hudX + 380 * scale;
    const coinTextY = hudY + 80 * scale;
    this.ctx.fillStyle = '#314022';
    this.ctx.fillRect(coinTextX, coinTextY, 78 * scale, 55 * scale);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${Math.floor(26 * scale)}px monospace`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${this.totalCoins}`, coinTextX + 4, coinTextY + 28 * scale);

    // 3. Nivel
    const lvlTextX = hudX + 580 * scale;
    const lvlTextY = hudY + 80 * scale;
    this.ctx.fillStyle = '#314022';
    this.ctx.fillRect(lvlTextX, lvlTextY, 110 * scale, 55 * scale);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`${this.currentLevel}/10`, lvlTextX + 4, lvlTextY + 28 * scale);

    // 4. Tiempo MM:SS
    const timeTextX = hudX + 795 * scale;
    const timeTextY = hudY + 80 * scale;
    this.ctx.fillStyle = '#314022';
    this.ctx.fillRect(timeTextX, timeTextY, 130 * scale, 55 * scale);

    const mins = Math.floor(this.gameTimeSeconds / 60);
    const secs = Math.floor(this.gameTimeSeconds % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(timeStr, timeTextX + 4, timeTextY + 28 * scale);

    this.ctx.restore();
  }
}

window.addEventListener('load', () => {
  window.game = new CaidaLibreGame();
});
