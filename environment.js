/**
 * environment.js - Atmósfera 2.5D, Nubes Pixel-Art, Cordillera Nevada, Pinos y Lago Angosto
 * El lago ahora es más angosto en el centro, flanqueado por las orillas boscosas donde se asientan los 2 árboles.
 */

class Environment {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.clouds = [];
    this.initClouds();

    this.speedLines = [];
    this.initSpeedLines();

    this.mountains = [];
    this.initMountains();
  }

  initClouds() {
    this.clouds = [];
    for (let i = 0; i < 16; i++) {
      const cloudIdx = Math.floor(Math.random() * 10) + 1;
      const depth = 0.2 + Math.random() * 0.8;
      this.clouds.push({
        spriteKey: `cloud${cloudIdx}`,
        x: Math.random() * this.canvasWidth,
        relY: Math.random() * 1800,
        depth: depth,
        scale: 0.35 + depth * 0.55,
        alpha: 0.35 + depth * 0.65,
        width: 160 + depth * 140,
        height: 75 + depth * 65
      });
    }
  }

  initSpeedLines() {
    this.speedLines = [];
    for (let i = 0; i < 28; i++) {
      this.speedLines.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        length: 25 + Math.random() * 45,
        speed: 600 + Math.random() * 350,
        alpha: 0.12 + Math.random() * 0.2
      });
    }
  }

  initMountains() {
    this.mountains = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      this.mountains.push({
        x: (i / (count - 1)) * (this.canvasWidth + 240) - 120,
        height: 180 + Math.random() * 130,
        width: 160 + Math.random() * 80,
        snowHeight: 45 + Math.random() * 30
      });
    }
  }

  update(dt, progress, fallSpeed) {
    // 1. Nubes con paralaje vertical
    for (const c of this.clouds) {
      c.relY -= fallSpeed * c.depth * dt;
      if (c.relY < -150) {
        c.relY = this.canvasHeight + 120 + Math.random() * 200;
        c.x = Math.random() * this.canvasWidth;
        const cloudIdx = Math.floor(Math.random() * 10) + 1;
        c.spriteKey = `cloud${cloudIdx}`;
      }
    }

    // 2. Estelas de viento
    for (const line of this.speedLines) {
      line.y -= (line.speed + fallSpeed * 0.4) * dt;
      if (line.y < -line.length) {
        line.y = this.canvasHeight + line.length + Math.random() * 40;
        line.x = Math.random() * this.canvasWidth;
      }
    }
  }

  draw(ctx, progress, altitudeMeters) {
    ctx.imageSmoothingEnabled = false;

    // 1. Cielo y sol poniente
    this.drawSky(ctx, progress);

    // 2. Nubes lejanas
    this.drawCloudLayer(ctx, 0.45);

    // 3. Montañas y pinos
    if (progress > 0.45) {
      this.drawMountains(ctx, progress);
    }

    // 4. Nubes medias
    this.drawCloudLayer(ctx, 1.0);

    // 5. Lago Angosto en el centro (con las orillas a los lados para los 2 árboles)
    if (progress > 0.62) {
      this.drawNarrowLake(ctx, progress);
    }

    // 6. Estelas de viento
    this.drawSpeedLines(ctx);
  }

  drawSky(ctx, progress) {
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);

    if (progress < 0.35) {
      grad.addColorStop(0, '#0a1128');
      grad.addColorStop(0.5, '#152b52');
      grad.addColorStop(1, '#1e3a8a');
    } else if (progress < 0.70) {
      grad.addColorStop(0, '#152b52');
      grad.addColorStop(0.4, '#1e40af');
      grad.addColorStop(1, '#3b82f6');
    } else {
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(0.35, '#3b82f6');
      grad.addColorStop(0.65, '#f472b6');
      grad.addColorStop(0.85, '#fb923c');
      grad.addColorStop(1, '#fde047');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (progress > 0.65) {
      const sunProgress = (progress - 0.65) / 0.35;
      const sunY = this.canvasHeight - 190 + (1 - sunProgress) * 90;
      ctx.save();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(this.canvasWidth / 2, sunY, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(this.canvasWidth / 2, sunY, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawCloudLayer(ctx, maxDepth) {
    for (const c of this.clouds) {
      if (c.depth > maxDepth) continue;
      const cloudSprite = window.assets.get(c.spriteKey);
      if (!cloudSprite) continue;

      ctx.save();
      ctx.globalAlpha = c.alpha;
      ctx.drawImage(
        cloudSprite,
        c.x,
        c.relY,
        c.width * c.scale,
        c.height * c.scale
      );
      ctx.restore();
    }
  }

  drawMountains(ctx, progress) {
    const factor = (progress - 0.45) / 0.55;
    const horizonY = this.canvasHeight * (1 - factor * 0.32);

    ctx.save();

    // Cordillera lejana
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-100, this.canvasHeight);
    for (const m of this.mountains) {
      ctx.lineTo(m.x, horizonY - m.height * factor * 0.7);
    }
    ctx.lineTo(this.canvasWidth + 100, this.canvasHeight);
    ctx.closePath();
    ctx.fill();

    // Cumbres nevadas
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-100, this.canvasHeight);
    for (let i = 0; i < this.mountains.length; i++) {
      const m = this.mountains[i];
      const peakY = horizonY - m.height * factor * 0.5;
      ctx.lineTo(m.x + 30, peakY);
    }
    ctx.lineTo(this.canvasWidth + 100, this.canvasHeight);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < this.mountains.length; i++) {
      const m = this.mountains[i];
      const peakY = horizonY - m.height * factor * 0.5;
      ctx.beginPath();
      ctx.moveTo(m.x + 30, peakY);
      ctx.lineTo(m.x + 10, peakY + m.snowHeight * factor);
      ctx.lineTo(m.x + 20, peakY + m.snowHeight * factor - 8);
      ctx.lineTo(m.x + 30, peakY + m.snowHeight * factor);
      ctx.lineTo(m.x + 40, peakY + m.snowHeight * factor - 6);
      ctx.lineTo(m.x + 50, peakY + m.snowHeight * factor);
      ctx.closePath();
      ctx.fill();
    }

    // Bosque de pinos en horizonte
    ctx.fillStyle = '#064e3b';
    const pineY = horizonY + 20;
    ctx.beginPath();
    ctx.moveTo(-20, this.canvasHeight);
    for (let px = -20; px <= this.canvasWidth + 20; px += 16) {
      ctx.lineTo(px, pineY + ((px % 32 === 0) ? -14 : 0));
    }
    ctx.lineTo(this.canvasWidth + 20, this.canvasHeight);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Lago Angosto en el centro, flanqueado por las orillas de los 2 árboles laterales
  drawNarrowLake(ctx, progress) {
    const lakeProg = (progress - 0.62) / 0.38;
    const lakeHeight = Math.pow(lakeProg, 1.7) * (this.canvasHeight * 0.44);
    const lakeY = this.canvasHeight - lakeHeight;

    ctx.save();

    // 1. Orillas rocosas laterales completas (donde van plantados los 2 árboles)
    const bankWidth = 175; // Ancho de tierra en cada lateral
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, lakeY - 14, this.canvasWidth, lakeHeight + 14);

    // Suelo verde y rocas en la orilla izquierda y derecha
    const grassGrad = ctx.createLinearGradient(0, lakeY - 10, 0, this.canvasHeight);
    grassGrad.addColorStop(0, '#14532d');
    grassGrad.addColorStop(1, '#062c16');
    ctx.fillStyle = grassGrad;
    // Orilla izquierda
    ctx.fillRect(0, lakeY - 10, bankWidth, lakeHeight + 10);
    // Orilla derecha
    ctx.fillRect(this.canvasWidth - bankWidth, lakeY - 10, bankWidth, lakeHeight + 10);

    // Bordes rocosos pixel-art
    ctx.fillStyle = '#334155';
    for (let ry = lakeY; ry < this.canvasHeight; ry += 24) {
      ctx.fillRect(bankWidth - 10 + Math.sin(ry) * 6, ry, 10, 14);
      ctx.fillRect(this.canvasWidth - bankWidth + Math.sin(ry) * 6, ry, 10, 14);
    }

    // 2. Agua del Lago Angosto (Centro de la pantalla: de bankWidth a canvasWidth - bankWidth)
    const lakeLeft = bankWidth;
    const lakeWidth = this.canvasWidth - (bankWidth * 2); // ~418px de ancho

    const waterGrad = ctx.createLinearGradient(0, lakeY, 0, this.canvasHeight);
    waterGrad.addColorStop(0, '#0284c7');
    waterGrad.addColorStop(0.5, '#0369a1');
    waterGrad.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = waterGrad;

    ctx.fillRect(lakeLeft, lakeY, lakeWidth, lakeHeight);

    // 3. Reflejo dorado del Sol en el centro del lago angosto
    const sunCenterX = this.canvasWidth / 2;
    ctx.fillStyle = '#fde047';
    for (let y = lakeY + 4; y < this.canvasHeight; y += 10) {
      const distFromLakeTop = (y - lakeY) / lakeHeight;
      const reflectWidth = (16 + distFromLakeTop * 65) * Math.min(1.2, lakeProg * 1.4);
      const shift = Math.sin(y * 0.12 + Date.now() * 0.003) * 5;
      ctx.fillRect(sunCenterX - reflectWidth / 2 + shift, y, reflectWidth, 4);
    }

    // 4. Ondas de agua cristalina
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let y = lakeY + 8; y < this.canvasHeight; y += 18) {
      const waveShift = Math.sin(y + Date.now() * 0.002) * 12;
      ctx.fillRect(lakeLeft + 25 + waveShift, y, 45, 3);
      ctx.fillRect(lakeLeft + lakeWidth - 70 - waveShift, y, 50, 3);
    }

    // 5. Vórtice temporal del lago (Niveles 1 a 9)
    if (lakeProg > 0.55) {
      const pulse = (Math.sin(Date.now() / 90) + 1) * 0.35 + 0.2;
      ctx.fillStyle = `rgba(168, 85, 247, ${pulse})`;
      ctx.beginPath();
      ctx.ellipse(sunCenterX, lakeY + lakeHeight * 0.55, 36 * lakeProg, 15 * lakeProg, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawSpeedLines(ctx) {
    ctx.save();
    for (const l of this.speedLines) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${l.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x, l.y - l.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHelicopterIntro(ctx, timer, shakeX, shakeY) {
    ctx.fillStyle = '#0a1128';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.save();
    const cloudImg = window.assets.get('cloud1');
    if (cloudImg) {
      const cy = (timer * 350) % (this.canvasHeight + 200) - 100;
      ctx.globalAlpha = 0.35;
      ctx.drawImage(cloudImg, 50, this.canvasHeight - cy, 320, 160);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(this.canvasWidth / 2 + shakeX, 360 + shakeY);

    for (let i = 0; i < 6; i++) {
      const sOffset = Math.sin(timer * 22 + i) * 16;
      ctx.fillStyle = `rgba(255, ${70 + i * 25}, 20, 0.75)`;
      ctx.beginPath();
      ctx.arc(-60 - i * 32, -45 + sOffset, 18 + i * 12, 0, Math.PI * 2);
      ctx.fill();
    }

    const heliImg = window.assets.get('helicopterIntro');
    if (heliImg) {
      const hw = 320;
      const hh = 145;
      ctx.drawImage(heliImg, -hw / 2, -hh / 2, hw, hh);
    }

    const alarmFlash = Math.floor(timer * 8) % 2 === 0;
    if (alarmFlash) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 35;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.beginPath();
      ctx.arc(80, -20, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
