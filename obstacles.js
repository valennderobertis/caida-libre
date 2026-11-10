/**
 * obstacles.js - Gestión de Obstáculos, Debris, Aves, los 2 Grandes Árboles al Suelo y Monedas
 * Dificultad calibrada con un +12% por nivel.
 * Los 2 árboles son más grandes y sus troncos/raíces llegan firmemente hasta el suelo final.
 */

class ObstacleManager {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.obstacles = [];
    this.trees = [];
    this.coins = [];
    this.particles = [];
    this.parachuteItem = null;
  }

  reset() {
    this.obstacles = [];
    this.trees = [];
    this.coins = [];
    this.particles = [];
    this.parachuteItem = null;
  }

  /**
   * Genera obstáculos, exactamente 2 árboles que tocan el suelo y 10 monedas.
   * Dificultad ajustada (+12% en velocidad y cantidad de escombros).
   */
  generateLevel(level, totalLevelDistance) {
    this.reset();

    // 1. Cantidad de obstáculos (+12% respecto a la versión reducida)
    const obstacleCount = Math.round(16 + level * 3.4); // Nivel 1: 19, Nivel 10: 50

    // 10 Monedas por nivel
    const coinSpawnAltitudes = [];
    for (let c = 0; c < 10; c++) {
      const fraction = 0.08 + (c / 9.5) * 0.76;
      coinSpawnAltitudes.push(fraction * totalLevelDistance);
    }
    let coinIndex = 0;

    // --- 2. LOS 2 ÁRBOLES FINALES LLEGAN HASTA EL SUELO (NO FLOTAN) Y SON MÁS GRANDES ---
    // Dimensiones más grandes
    const treeW = 280;
    const treeH = 1600;

    // Para que las raíces toquen exactamente el fondo de la pantalla (1024) al llegar al lago:
    // tree.worldY = totalLevelDistance + 1024 - playerScreenY (230) - treeH
    const treeAltitude = totalLevelDistance + 794 - treeH; // totalLevelDistance - 806

    // Árbol Izquierdo (tronco en borde izquierdo)
    this.trees.push({
      type: 'tree1',
      side: 'left',
      worldY: treeAltitude,
      width: treeW,
      height: treeH,
      branches: [
        { relY: 0.35 * treeH, reach: 0.72 * treeW, radius: 18 },
        { relY: 0.52 * treeH, reach: 0.78 * treeW, radius: 18 },
        { relY: 0.68 * treeH, reach: 0.74 * treeW, radius: 18 },
        { relY: 0.82 * treeH, reach: 0.65 * treeW, radius: 18 }
      ]
    });

    // Árbol Derecho (tronco en borde derecho, espejado)
    this.trees.push({
      type: 'tree2',
      side: 'right',
      worldY: treeAltitude,
      width: treeW,
      height: treeH,
      branches: [
        { relY: 0.36 * treeH, reach: 0.74 * treeW, radius: 18 },
        { relY: 0.54 * treeH, reach: 0.79 * treeW, radius: 18 },
        { relY: 0.70 * treeH, reach: 0.72 * treeW, radius: 18 },
        { relY: 0.84 * treeH, reach: 0.64 * treeW, radius: 18 }
      ]
    });

    // --- 3. ESCOMBROS Y AVES (+12% de velocidad y dinamismo) ---
    for (let i = 0; i < obstacleCount; i++) {
      const alt = (i / obstacleCount) * (totalLevelDistance * 0.76) + 550;
      const progress = alt / totalLevelDistance;

      const margin = 85;
      const x = margin + Math.random() * (this.canvasWidth - margin * 2);

      let spriteKey = 'debrisCockpit';
      let width = 78;
      let height = 58;
      let radius = 22;
      let downwardSpeed = 125;
      let rotSpeed = (Math.random() - 0.5) * 1.4;
      let isBird = false;

      if (progress < 0.32) {
        // Zona Alta: Grandes secciones de aeronaves derribadas
        const highTypes = [
          { key: 'helicopterIntro', w: 135, h: 62, r: 28, spd: 125 },
          { key: 'planeCockpit', w: 98, h: 60, r: 24, spd: 135 },
          { key: 'planeFuselage', w: 104, h: 64, r: 25, spd: 130 },
          { key: 'planeTail', w: 98, h: 75, r: 25, spd: 135 },
          { key: 'debrisCockpit', w: 98, h: 60, r: 24, spd: 125 },
          { key: 'debrisFuselage', w: 98, h: 60, r: 24, spd: 130 }
        ];
        const chosen = highTypes[Math.floor(Math.random() * highTypes.length)];
        spriteKey = chosen.key;
        width = chosen.w;
        height = chosen.h;
        radius = chosen.r;
        downwardSpeed = chosen.spd;
      } else if (progress < 0.62) {
        // Zona Media-Alta: Partes y escombros en rotación
        const debrisTypes = [
          { key: 'debrisRotor', w: 84, h: 50, r: 21, spd: 145, rot: 9 },
          { key: 'debrisEngine', w: 70, h: 54, r: 19, spd: 140, rot: 1.8 },
          { key: 'debrisDoorStar', w: 55, h: 64, r: 17, spd: 150, rot: 2.2 },
          { key: 'debrisSkid', w: 88, h: 44, r: 17, spd: 155, rot: 1.4 },
          { key: 'debrisSeat', w: 60, h: 64, r: 17, spd: 135, rot: 2.0 },
          { key: 'debrisHatch', w: 60, h: 66, r: 17, spd: 145, rot: 1.8 },
          { key: 'debrisScrap', w: 60, h: 50, r: 16, spd: 155, rot: 2.8 },
          { key: 'planeWing', w: 98, h: 50, r: 21, spd: 145, rot: 1.4 },
          { key: 'planeWheel', w: 46, h: 68, r: 17, spd: 155, rot: 2.2 }
        ];
        const chosen = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
        spriteKey = chosen.key;
        width = chosen.w;
        height = chosen.h;
        radius = chosen.r;
        downwardSpeed = chosen.spd;
        rotSpeed = chosen.rot || rotSpeed;
      } else {
        // Zona Media (antes de los árboles): Águilas volando
        isBird = true;
        spriteKey = 'bird';
        width = 72;
        height = 52;
        radius = 19;
        downwardSpeed = 42;
        rotSpeed = 0;
      }

      const obstacle = {
        id: i,
        spriteKey: spriteKey,
        isBird: isBird,
        x: x,
        worldY: alt,
        width: width,
        height: height,
        radius: radius,
        angle: (Math.random() - 0.5) * 0.35,
        rotSpeed: rotSpeed,
        downwardSpeed: downwardSpeed,
        smokeTimer: 0,
        birdFrame: 0,
        birdFrameTimer: Math.random() * 0.2,
        birdVx: (Math.random() < 0.5 ? -1 : 1) * (58 + Math.random() * 38)
      };

      this.obstacles.push(obstacle);

      // Moneda cercana para incentivar el riesgo
      if (coinIndex < 10 && alt >= coinSpawnAltitudes[coinIndex]) {
        const offsetSide = Math.random() < 0.5 ? -1 : 1;
        const offsetDist = obstacle.radius + 44;
        let coinX = obstacle.x + offsetSide * offsetDist;
        coinX = Math.max(70, Math.min(this.canvasWidth - 70, coinX));

        this.coins.push({
          id: coinIndex,
          x: coinX,
          worldY: alt + (Math.random() - 0.5) * 25,
          radius: 22,
          width: 44,
          height: 48,
          collected: false,
          wobbleTimer: Math.random() * Math.PI * 2
        });
        coinIndex++;
      }
    }

    // Asegurar 10 monedas exactas
    while (coinIndex < 10) {
      const alt = coinSpawnAltitudes[coinIndex] || (totalLevelDistance * (0.1 + (coinIndex / 10) * 0.7));
      this.coins.push({
        id: coinIndex,
        x: 120 + Math.random() * (this.canvasWidth - 240),
        worldY: alt,
        radius: 22,
        width: 44,
        height: 48,
        collected: false,
        wobbleTimer: Math.random() * Math.PI * 2
      });
      coinIndex++;
    }

    // NIVEL 10: Baliza de Paracaídas
    if (level === 10) {
      this.parachuteItem = {
        x: this.canvasWidth / 2,
        worldY: totalLevelDistance - 950,
        radius: 38,
        width: 72,
        height: 72,
        collected: false,
        bobTimer: 0
      };
    }
  }

  update(dt, playerWorldY, playerScreenY, fallSpeed) {
    // 1. Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.worldY -= p.vy * dt;
      p.x += p.vx * dt;
      p.life -= dt;
      p.size += dt * 12;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // 2. Obstáculos
    for (const obs of this.obstacles) {
      obs.worldY += obs.downwardSpeed * dt;
      obs.angle += obs.rotSpeed * dt;

      if (obs.isBird) {
        obs.birdFrameTimer += dt;
        if (obs.birdFrameTimer >= 0.08) {
          obs.birdFrameTimer = 0;
          obs.birdFrame = (obs.birdFrame + 1) % 4;
        }
        obs.x += obs.birdVx * dt;
        if (obs.x < 50) { obs.x = 50; obs.birdVx = Math.abs(obs.birdVx); }
        if (obs.x > this.canvasWidth - 50) { obs.x = this.canvasWidth - 50; obs.birdVx = -Math.abs(obs.birdVx); }
      } else {
        obs.smokeTimer += dt;
        if (obs.smokeTimer > 0.11) {
          obs.smokeTimer = 0;
          this.addSmoke(obs.x + (Math.random() - 0.5) * 16, obs.worldY);
        }
      }
    }

    // 3. Monedas
    for (const coin of this.coins) {
      coin.wobbleTimer += dt * 3.8;
    }

    // 4. Paracaídas
    if (this.parachuteItem) {
      this.parachuteItem.bobTimer += dt * 3.2;
    }
  }

  addSmoke(x, worldY) {
    if (this.particles.length > 70) return;
    this.particles.push({
      x: x,
      worldY: worldY,
      vx: (Math.random() - 0.5) * 22,
      vy: 12 + Math.random() * 22,
      size: 8 + Math.random() * 8,
      life: 0.6 + Math.random() * 0.3,
      maxLife: 0.9,
      isFire: Math.random() < 0.32
    });
  }

  checkCollisions(player, playerWorldY, onCoinCollect, onParachuteCollect) {
    const pBox = player.getHitbox();

    // 1. Monedas
    for (const coin of this.coins) {
      if (!coin.collected) {
        const screenY = player.y + (coin.worldY - playerWorldY);
        const dx = pBox.x - coin.x;
        const dy = pBox.y - screenY;
        if (Math.hypot(dx, dy) < pBox.radius + coin.radius + 6) {
          coin.collected = true;
          onCoinCollect(coin);
        }
      }
    }

    // 2. Paracaídas
    if (this.parachuteItem && !this.parachuteItem.collected) {
      const screenY = player.y + (this.parachuteItem.worldY - playerWorldY);
      const dx = pBox.x - this.parachuteItem.x;
      const dy = pBox.y - screenY;
      if (Math.hypot(dx, dy) < pBox.radius + this.parachuteItem.radius + 20) {
        this.parachuteItem.collected = true;
        onParachuteCollect(this.parachuteItem);
      }
    }

    if (player.isInvulnerable) return false;

    // 3. Colisión con Ramas de los 2 Árboles
    for (const tree of this.trees) {
      const screenTreeY = player.y + (tree.worldY - playerWorldY);
      if (screenTreeY < -tree.height || screenTreeY > this.canvasHeight + 100) continue;

      for (const branch of tree.branches) {
        const branchY = screenTreeY + branch.relY;
        let branchX = (tree.side === 'left') ? branch.reach : (this.canvasWidth - branch.reach);

        const dx = pBox.x - branchX;
        const dy = pBox.y - branchY;
        if (Math.hypot(dx, dy) < pBox.radius + branch.radius) {
          return true;
        }
      }
    }

    // 4. Obstáculos
    for (const obs of this.obstacles) {
      const screenY = player.y + (obs.worldY - playerWorldY);
      if (screenY < -90 || screenY > this.canvasHeight + 90) continue;

      const dx = pBox.x - obs.x;
      const dy = pBox.y - screenY;
      if (Math.hypot(dx, dy) < pBox.radius + obs.radius) {
        return true;
      }
    }

    return false;
  }

  draw(ctx, playerWorldY, playerScreenY) {
    ctx.imageSmoothingEnabled = false;

    // 1. Partículas
    for (const p of this.particles) {
      const screenY = playerScreenY + (p.worldY - playerWorldY);
      if (screenY < -40 || screenY > this.canvasHeight + 40) continue;

      ctx.save();
      const alpha = p.life / p.maxLife;
      if (p.isFire) {
        ctx.fillStyle = `rgba(255, ${Math.floor(140 * alpha + 60)}, 20, ${alpha * 0.75})`;
      } else {
        ctx.fillStyle = `rgba(50, 55, 65, ${alpha * 0.55})`;
      }
      ctx.beginPath();
      ctx.arc(p.x, screenY, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Dibujar los 2 Árboles Gigantes hasta el suelo
    for (const tree of this.trees) {
      const screenY = playerScreenY + (tree.worldY - playerWorldY);
      if (screenY < -tree.height || screenY > this.canvasHeight + 100) continue;

      const treeImg = window.assets.get(tree.type);
      if (!treeImg) continue;

      ctx.save();
      if (tree.side === 'left') {
        ctx.drawImage(treeImg, 0, screenY, tree.width, tree.height);
      } else {
        ctx.translate(this.canvasWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(treeImg, 0, screenY, tree.width, tree.height);
      }
      ctx.restore();
    }

    // 3. Obstáculos
    for (const obs of this.obstacles) {
      const screenY = playerScreenY + (obs.worldY - playerWorldY);
      if (screenY < -110 || screenY > this.canvasHeight + 110) continue;

      ctx.save();
      ctx.translate(obs.x, screenY);

      if (obs.isBird) {
        const frameKey = `bird${obs.birdFrame + 1}`;
        const birdImg = window.assets.get(frameKey);
        if (birdImg) {
          if (obs.birdVx < 0) ctx.scale(-1, 1);
          ctx.drawImage(birdImg, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
        }
      } else {
        ctx.rotate(obs.angle);
        const sprite = window.assets.get(obs.spriteKey);
        if (sprite) {
          ctx.drawImage(sprite, -obs.width / 2, -obs.height / 2, obs.width, obs.height);
        }
      }

      ctx.restore();
    }

    // 4. Monedas
    const coinImg = window.assets.get('coin');
    for (const coin of this.coins) {
      if (coin.collected) continue;
      const screenY = playerScreenY + (coin.worldY - playerWorldY);
      if (screenY < -50 || screenY > this.canvasHeight + 50) continue;

      ctx.save();
      ctx.translate(coin.x, screenY);
      const scaleX = 0.88 + 0.12 * Math.sin(coin.wobbleTimer);
      ctx.scale(scaleX, 1);

      if (coinImg) {
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.drawImage(coinImg, -coin.width / 2, -coin.height / 2, coin.width, coin.height);
      }
      ctx.restore();
    }

    // 5. Baliza de Paracaídas
    if (this.parachuteItem && !this.parachuteItem.collected) {
      const screenY = playerScreenY + (this.parachuteItem.worldY - playerWorldY);
      if (screenY > -100 && screenY < this.canvasHeight + 100) {
        this.drawParachuteBeacon(ctx, this.parachuteItem.x, screenY + Math.sin(this.parachuteItem.bobTimer) * 7);
      }
    }
  }

  drawParachuteBeacon(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 25;

    ctx.fillStyle = '#1e3a1e';
    ctx.beginPath();
    ctx.rect(-30, -25, 60, 50);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-6, -18, 12, 36);
    ctx.fillRect(-18, -6, 36, 12);

    const alpha = (Math.sin(Date.now() / 120) + 1) * 0.5;
    ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
    ctx.beginPath();
    ctx.arc(0, -32, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PARACAÍDAS', 0, 42);

    ctx.restore();
  }
}
