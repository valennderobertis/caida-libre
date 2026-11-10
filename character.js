/**
 * character.js - Control, Físicas y Renderizado del Personaje Principal (Soldado Pixel-Art)
 * Hitbox reducida y más permisiva para calibrar la dificultad en un -30%.
 */

class Skydiver {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.width = 135;
    this.height = 58;

    this.x = canvasWidth / 2;
    this.y = 230;

    this.vx = 0;
    this.speed = 540; // Control ágil y responsivo en X

    // Sistema de 3 frames de inclinación hacia 45°
    this.tiltStep = 0; // -3, -2, -1, 0, 1, 2, 3
    this.frameTimer = 0;
    this.frameDuration = 0.045;
    this.currentAngle = 0;

    // Estados
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.hasParachute = false;
    this.parachuteOpen = false;
    this.parachuteScale = 0;

    this.windTimer = 0;
  }

  reset(x = this.canvasWidth / 2) {
    this.x = x;
    this.vx = 0;
    this.tiltStep = 0;
    this.currentAngle = 0;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;
    this.hasParachute = false;
    this.parachuteOpen = false;
    this.parachuteScale = 0;
  }

  update(dt, input) {
    this.windTimer += dt * 15;

    // Temporizador de invulnerabilidad tras impacto
    if (this.isInvulnerable) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
      }
    }

    // Despliegue de paracaídas (Nivel 10)
    if (this.parachuteOpen && this.parachuteScale < 1) {
      this.parachuteScale = Math.min(1, this.parachuteScale + dt * 2.5);
    }

    // Movimiento lateral en eje X
    let moveDir = 0;
    if (input.left && !input.right) moveDir = -1;
    if (input.right && !input.left) moveDir = 1;

    this.vx = moveDir * this.speed;
    this.x += this.vx * dt;

    // Límites de pantalla laterales
    const halfW = this.width / 2;
    if (this.x < halfW + 10) this.x = halfW + 10;
    if (this.x > this.canvasWidth - halfW - 10) this.x = this.canvasWidth - halfW - 10;

    // Inclinación en 3 fotogramas
    this.frameTimer += dt;
    if (this.frameTimer >= this.frameDuration) {
      this.frameTimer = 0;
      if (moveDir === -1) {
        if (this.tiltStep > -3) this.tiltStep--;
      } else if (moveDir === 1) {
        if (this.tiltStep < 3) this.tiltStep++;
      } else {
        if (this.tiltStep < 0) this.tiltStep++;
        else if (this.tiltStep > 0) this.tiltStep--;
      }
    }

    const targetAngle = (this.tiltStep * 15) * (Math.PI / 180);
    this.currentAngle += (targetAngle - this.currentAngle) * Math.min(1, dt * 25);
  }

  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      radius: 18 // Hitbox justa y reducida un 30% (centrada en torso y cabeza)
    };
  }

  triggerHit() {
    this.isInvulnerable = true;
    this.invulnerableTimer = 1.8; // Mayor tiempo de invulnerabilidad
  }

  deployParachute() {
    this.hasParachute = true;
    this.parachuteOpen = true;
    this.parachuteScale = 0.1;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.currentAngle);

    // Parpadeo de invulnerabilidad
    if (this.isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    if (this.parachuteOpen) {
      this.drawParachute(ctx);
    }

    const sprite = window.assets.get('player');
    if (sprite) {
      const flutter = Math.sin(this.windTimer) * 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-this.width / 2, flutter);
      ctx.lineTo(-this.width / 2 - 18, -20 + flutter);
      ctx.moveTo(this.width / 2, -flutter);
      ctx.lineTo(this.width / 2 + 18, -20 - flutter);
      ctx.stroke();

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        sprite,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    }

    ctx.restore();
  }

  drawParachute(ctx) {
    ctx.save();
    const s = this.parachuteScale;
    ctx.scale(s, s);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-45, -10);
    ctx.lineTo(-100, -125);
    ctx.moveTo(-15, -10);
    ctx.lineTo(-35, -135);
    ctx.moveTo(15, -10);
    ctx.lineTo(35, -135);
    ctx.moveTo(45, -10);
    ctx.lineTo(100, -125);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -135, 110, Math.PI, 0, false);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-110, -180, 110, -135);
    grad.addColorStop(0, '#166534');
    grad.addColorStop(0.3, '#f97316');
    grad.addColorStop(0.5, '#fef08a');
    grad.addColorStop(0.7, '#f97316');
    grad.addColorStop(1, '#166534');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-60, -135);
    ctx.quadraticCurveTo(-30, -210, 0, -245);
    ctx.moveTo(60, -135);
    ctx.quadraticCurveTo(30, -210, 0, -245);
    ctx.stroke();

    ctx.restore();
  }
}
