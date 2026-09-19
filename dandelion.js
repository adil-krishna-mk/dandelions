/**
 * Lumina Bloom — Interactive Dandelion Garden Simulation Engine
 * Recreates the magical, immersive visualizer from the reference art installation.
 * Simulates multi-segmented botanical stems, realistic pappus seeds with aerodynamic
 * tension, curl noise turbulence, dynamic blooming regrowth, and luminous glowing palettes.
 */

// ============================================================================
// Simplex / Curl Noise approximation for fluid wind eddies
// ============================================================================
class WindField {
  constructor() {
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
  }

  // Fast procedural 2D noise for turbulent swirling wind gusts
  getVector(x, y, windPower) {
    const scale = 0.0025;
    const t = this.time * 1.4;

    // Layered harmonic frequencies for organic eddies
    const n1 = Math.sin(x * scale + t * 0.7) * Math.cos(y * scale * 0.8 + t * 0.5);
    const n2 = Math.cos(x * scale * 1.8 - t * 0.9) * Math.sin(y * scale * 1.5 + t * 0.7);
    const n3 = Math.sin((x + y) * scale * 1.2 + t);

    // Primary gentle breeze: upward and slightly drifting rightwards
    const baseVx = 0.6 + n1 * 0.5;
    const baseVy = -1.2 + n2 * 0.7 + n3 * 0.4;

    const gustMultiplier = 1.0 + windPower * 2.8;

    return {
      x: baseVx * gustMultiplier,
      y: baseVy * gustMultiplier + (Math.random() - 0.5) * 0.3
    };
  }
}

// ============================================================================
// Dandelion Seed (Pappus + Stalk + Achene)
// ============================================================================
class DandelionSeed {
  constructor(flower, angle, radiusFraction, palette) {
    this.flower = flower;
    this.angle = angle;                  // Angle on the spherical head (0 to 2PI)
    this.radiusFraction = radiusFraction;// 0.0 (near core) to 1.0 (outer perimeter)
    this.palette = palette;

    // Attached state properties
    this.isAttached = true;
    this.stalkLength = 22 + Math.random() * 16;
    this.umbrellaRadius = 8 + Math.random() * 6;
    this.numRays = 7 + Math.floor(Math.random() * 4); // Umbrella parachute rays

    // Multi-tier physical anchor strength (Physical Strength & Difficulty Challenge)
    // Outer fluff (0.7 - 1.0): 0.24 - 0.38
    // Mid layer (0.4 - 0.7): 0.48 - 0.68
    // Stubborn core (0.0 - 0.4): 0.75 - 0.96 (requires sustained, strong lung power!)
    if (radiusFraction > 0.7) {
      this.baseStrength = 0.24 + (1.0 - radiusFraction) * 0.38 + Math.random() * 0.12;
    } else if (radiusFraction > 0.4) {
      this.baseStrength = 0.48 + (0.7 - radiusFraction) * 0.50 + Math.random() * 0.14;
    } else {
      this.baseStrength = 0.74 + (0.4 - radiusFraction) * 0.55 + Math.random() * 0.16;
    }
    this.looseness = 0.0; // Requires continuous breath force to dislodge

    // Free flight physics properties
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.tilt = angle;
    this.rotSpeed = (Math.random() - 0.5) * 0.06;
    this.mass = 0.35 + Math.random() * 0.2;
    this.alpha = 1.0;
    this.life = 1.0;                     // Free flight lifetime
    this.decayRate = 0.0003 + Math.random() * 0.0002; // Linger for ~10-12 seconds
    this.glowSize = 9 + Math.random() * 12;
    this.sparkleTimer = Math.random() * Math.PI * 2;
  }

  // Dislodges the seed into the air
  detach(initialVx, initialVy) {
    this.isAttached = false;
    const headPos = this.flower.getHeadPosition();
    const currentAngle = this.flower.getEffectiveHeadAngle() + this.angle;
    const headRadius = this.flower.headRadius * this.radiusFraction;

    this.x = headPos.x + Math.cos(currentAngle) * headRadius;
    this.y = headPos.y + Math.sin(currentAngle) * headRadius;

    // Gentle realistic detachment burst
    this.vx = initialVx * 0.55 + Math.cos(currentAngle) * (1.2 + Math.random() * 1.6);
    this.vy = initialVy * 0.55 + Math.sin(currentAngle) * (0.8 + Math.random() * 1.2) - (0.8 + Math.random() * 1.0);
    this.tilt = currentAngle;

    // Play chime sound
    if (window.soundEngine) {
      window.soundEngine.playSeedReleaseChime(0.8 + (1 - this.radiusFraction) * 0.5);
    }
  }

  updateFlight(dt, windField, windPower, width, height) {
    if (this.isAttached) return;

    this.sparkleTimer += dt * 3.0;

    // Wind force from curl field
    const wind = windField.getVector(this.x, this.y, windPower);
    this.vx += (wind.x / this.mass) * dt * 1.8;
    this.vy += (wind.y / this.mass) * dt * 1.8;

    // Aerodynamic parachute drag (high surface area of pappus umbrella)
    this.vx *= 0.965;
    this.vy *= 0.975;
    // Upward buoyancy & slow fall
    this.vy -= (0.20 - Math.sin(this.sparkleTimer) * 0.06) * dt;

    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;

    // Soft tumble & tilt
    const targetTilt = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    this.tilt += (targetTilt - this.tilt) * 0.04 + this.rotSpeed;

    this.life -= this.decayRate * 60 * dt;
    this.alpha = Math.max(0, Math.min(1, this.life * 1.8));

    // Seeds disperse naturally into the atmosphere and fade out cleanly
    // AVOID ANY seeds flowing back in from the bottom of the screen!
    if (this.x < -120 || this.x > width + 120 || this.y < -120 || this.y > height + 80) {
      this.life = 0;
    }
  }

  drawAttached(ctx, headX, headY, headAngle, scale = 1.0) {
    if (!this.isAttached) return;

    const effAngle = headAngle + this.angle;
    const baseDist = (this.flower.headRadius * this.radiusFraction) * scale;
    const totalLength = (baseDist + this.stalkLength) * scale;

    const cos = Math.cos(effAngle);
    const sin = Math.sin(effAngle);

    const stalkStartX = headX + cos * baseDist;
    const stalkStartY = headY + sin * baseDist;
    const stalkEndX = headX + cos * totalLength;
    const stalkEndY = headY + sin * totalLength;

    // 1. Delicate Stalk
    ctx.strokeStyle = this.palette.stalkColor;
    ctx.lineWidth = 0.75 * scale;
    ctx.beginPath();
    ctx.moveTo(stalkStartX, stalkStartY);
    ctx.lineTo(stalkEndX, stalkEndY);
    ctx.stroke();

    // 2. Umbrella Fluff Ray Tuft (Pappus Parachute)
    ctx.strokeStyle = this.palette.fluffColor;
    ctx.lineWidth = 0.6 * scale;
    const uRad = this.umbrellaRadius * scale;

    ctx.beginPath();
    for (let r = 0; r < this.numRays; r++) {
      const raySpread = (r / (this.numRays - 1) - 0.5) * 1.25;
      const rayAngle = effAngle + raySpread;
      const rx = stalkEndX + Math.cos(rayAngle) * uRad;
      const ry = stalkEndY + Math.sin(rayAngle) * uRad;
      ctx.moveTo(stalkEndX, stalkEndY);
      ctx.lineTo(rx, ry);
    }
    ctx.stroke();

    // 3. Tiny achene seed head at the bottom
    ctx.fillStyle = this.palette.seedColor;
    ctx.beginPath();
    ctx.arc(stalkStartX, stalkStartY, 1.2 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFree(ctx) {
    if (this.isAttached || this.life <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);

    // Luminescent Ambient Glow Halo around parachute
    ctx.fillStyle = this.palette.glowColor;
    ctx.beginPath();
    ctx.arc(0, -this.stalkLength, this.glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Stalk
    ctx.strokeStyle = this.palette.stalkColor;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -this.stalkLength);
    ctx.stroke();

    // Umbrella rays
    ctx.strokeStyle = this.palette.fluffColor;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (let r = 0; r < this.numRays; r++) {
      const raySpread = (r / (this.numRays - 1) - 0.5) * 1.35;
      const rayAngle = -Math.PI / 2 + raySpread;
      const rx = Math.cos(rayAngle) * this.umbrellaRadius;
      const ry = -this.stalkLength + Math.sin(rayAngle) * this.umbrellaRadius;
      ctx.moveTo(0, -this.stalkLength);
      ctx.lineTo(rx, ry);
    }
    ctx.stroke();

    // Seed achene (oval)
    ctx.fillStyle = this.palette.seedColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ============================================================================
// Multi-Segment Botanical Stem & Dandelion Plant
// ============================================================================
class DandelionFlower {
  constructor(x, baseY, height, headRadius, palette, index) {
    this.x = x;
    this.baseY = baseY;
    this.targetHeight = height;
    this.currentHeight = height;
    this.headRadius = headRadius;
    this.palette = palette;
    this.index = index;

    // Organic stem joints (multi-segment inverse kinematics)
    this.numSegments = 7;
    this.segmentLength = this.currentHeight / this.numSegments;
    this.angles = new Float32Array(this.numSegments).fill(0);
    this.swayPhase = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.8 + Math.random() * 0.5;

    // Seeds collection
    this.seeds = [];
    this.freeSeeds = []; // Detached floating seeds
    this.seedCount = 140 + Math.floor(Math.random() * 50);

    // Life cycle / Regrowth state
    this.state = 'bloomed'; // 'bloomed', 'bare', 'regrowing'
    this.regrowthTimer = 0;
    this.bloomScale = 1.0;

    this.populateSeeds();
  }

  populateSeeds() {
    this.seeds = [];
    for (let i = 0; i < this.seedCount; i++) {
      // Golden angle distribution for natural spiral packing on spherical torus
      const angle = (i * 2.399963) % (Math.PI * 2);
      const radiusFraction = 0.25 + Math.sqrt((i + 1) / this.seedCount) * 0.75;
      this.seeds.push(new DandelionSeed(this, angle, radiusFraction, this.palette));
    }
  }

  getHeadPosition() {
    let currX = this.x;
    let currY = this.baseY;
    let currentAngle = -Math.PI / 2;

    for (let i = 0; i < this.numSegments; i++) {
      currentAngle += this.angles[i];
      currX += Math.cos(currentAngle) * (this.segmentLength * this.bloomScale);
      currY += Math.sin(currentAngle) * (this.segmentLength * this.bloomScale);
    }

    return { x: currX, y: currY };
  }

  getEffectiveHeadAngle() {
    let total = -Math.PI / 2;
    for (let i = 0; i < this.numSegments; i++) {
      total += this.angles[i];
    }
    return total;
  }

  update(dt, windPower, windField, width, height, pointerWind = null) {
    this.swayPhase += dt * this.swaySpeed;

    // Stem kinematics: gentle ambient sway + reaction to breath wind
    const ambientBreeze = Math.sin(this.swayPhase) * 0.045 + Math.cos(this.swayPhase * 0.6) * 0.02;
    const breathBend = windPower * (0.12 + (this.index % 3) * 0.03);

    for (let i = 0; i < this.numSegments; i++) {
      // Higher segments bend more
      const segmentWeight = (i + 1) / this.numSegments;
      const targetAngle = ambientBreeze * segmentWeight + breathBend * Math.pow(segmentWeight, 1.4);
      this.angles[i] += (targetAngle - this.angles[i]) * 0.12;
    }

    // Localized touch & mouse cursor wind interaction
    if (pointerWind && pointerWind.active && pointerWind.speed > 60) {
      const headPos = this.getHeadPosition();
      const dx = pointerWind.x - headPos.x;
      const dy = pointerWind.y - headPos.y;
      const dist = Math.hypot(dx, dy);
      const hitRadius = this.headRadius * 2.8 + (pointerWind.isDown ? 75 : 45);

      if (dist < hitRadius) {
        const proximity = 1.0 - (dist / hitRadius);
        const swipeDir = Math.sign(pointerWind.vx) || 1;
        const pushForce = proximity * Math.min(0.4, (pointerWind.speed / 1200));
        this.angles[this.numSegments - 1] += swipeDir * pushForce * 0.45;

        if (this.state === 'bloomed') {
          let remainingAttached = 0;
          const difficulty = window.dandelionApp ? window.dandelionApp.difficultyMultiplier : 1.0;
          const swipePower = Math.min(1.0, (pointerWind.speed / 600)) * (pointerWind.isDown ? 1.35 : 1.0);

          for (const seed of this.seeds) {
            if (!seed.isAttached) continue;

            const threshold = seed.baseStrength * difficulty;
            if (swipePower > threshold * 0.42) {
              seed.looseness += dt * (swipePower - threshold * 0.38) * 7.0;
              if (seed.looseness >= 0.75) {
                const burstVx = (pointerWind.vx * 0.005) + (Math.random() - 0.5) * 2.2;
                const burstVy = (pointerWind.vy * 0.005) - (1.6 + Math.random() * 2.0);
                seed.detach(burstVx, burstVy);
                this.freeSeeds.push(seed);
                if (window.dandelionApp) window.dandelionApp.onSeedBlown();
                if (window.soundEngine) window.soundEngine.playSeedReleaseChime();
              } else {
                remainingAttached++;
              }
            } else {
              remainingAttached++;
            }
          }

          if (remainingAttached < 3) {
            this.state = 'bare';
            this.regrowthTimer = 0;
            if (window.dandelionApp) {
              window.dandelionApp.onFlowerCleared(this);
            }
          }
        }
      }
    }

    // Check seed detachment when general wind (breath / simulated) is present
    if (this.state === 'bloomed' && windPower > 0.05) {
      let remainingAttached = 0;
      const difficulty = window.dandelionApp ? window.dandelionApp.difficultyMultiplier : 1.0;

      for (const seed of this.seeds) {
        if (!seed.isAttached) continue;

        // Angle-relative aerodynamic drag: seeds facing into wind release first
        const effAngle = this.getEffectiveHeadAngle() + seed.angle;
        const windAlignment = Math.cos(effAngle - (-Math.PI / 3));
        const dragForce = windPower * (0.85 + Math.max(0, windAlignment) * 0.5);
        const requiredThreshold = seed.baseStrength * difficulty;

        if (dragForce > requiredThreshold) {
          // Drag exceeds anchor strength -> loosen progressively
          seed.looseness += dt * (dragForce - requiredThreshold) * 4.5;
          if (seed.looseness >= 1.0) {
            seed.detach(windPower * 3.2, -windPower * 3.6);
            this.freeSeeds.push(seed);
            if (window.dandelionApp) window.dandelionApp.onSeedBlown();
            if (window.soundEngine) window.soundEngine.playSeedReleaseChime();
          } else {
            remainingAttached++;
          }
        } else {
          // Re-stabilize if breath drops
          seed.looseness = Math.max(0, seed.looseness - dt * 1.8);
          remainingAttached++;
        }
      }

      // If flower head is cleared of its stubborn seeds!
      if (remainingAttached < 3) {
        this.state = 'bare';
        this.regrowthTimer = 0;
        if (window.dandelionApp) {
          window.dandelionApp.onFlowerCleared(this);
        }
      }
    }

    // Regrowth lifecycle (reduced delay, smooth organic sprouting)
    if (this.state === 'bare') {
      this.regrowthTimer += dt;
      if (this.regrowthTimer > 1.8) { // 1.8s brief gentle pause
        this.state = 'regrowing';
        this.regrowthTimer = 0;
        this.bloomScale = 0.0;
        this.populateSeeds();
      }
    } else if (this.state === 'regrowing') {
      this.regrowthTimer += dt;
      // Smooth organic growth curve (ease out cubic)
      const progress = Math.min(1.0, this.regrowthTimer / 2.0);
      this.bloomScale = 1.0 - Math.pow(1.0 - progress, 3);

      if (progress >= 1.0) {
        this.state = 'bloomed';
        this.bloomScale = 1.0;
      }
    }

    // Update free detached seeds
    for (let i = this.freeSeeds.length - 1; i >= 0; i--) {
      const s = this.freeSeeds[i];
      s.updateFlight(dt, windField, windPower, width, height);
      if (s.life <= 0) {
        this.freeSeeds.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    const scale = this.bloomScale;
    if (scale <= 0.02) return;

    // 1. Draw Multi-Segment Curving Stem
    ctx.save();
    ctx.strokeStyle = this.palette.stemColor;
    ctx.lineWidth = 3.2 * Math.max(0.6, scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let currX = this.x;
    let currY = this.baseY;
    let currentAngle = -Math.PI / 2;

    ctx.beginPath();
    ctx.moveTo(currX, currY);

    for (let i = 0; i < this.numSegments; i++) {
      currentAngle += this.angles[i];
      currX += Math.cos(currentAngle) * (this.segmentLength * scale);
      currY += Math.sin(currentAngle) * (this.segmentLength * scale);
      ctx.lineTo(currX, currY);
    }
    ctx.stroke();

    // 2. Draw Receptacle Core (central torus)
    const headAngle = currentAngle;
    ctx.fillStyle = this.palette.receptacleColor;
    ctx.beginPath();
    ctx.arc(currX, currY, (this.headRadius * 0.35) * scale, 0, Math.PI * 2);
    ctx.fill();

    // 3. Volumetric Glow Behind the Flower Head (Exhibition Ambience)
    const glowGrad = ctx.createRadialGradient(
      currX, currY, 2,
      currX, currY, (this.headRadius * 1.8) * scale
    );
    glowGrad.addColorStop(0, this.palette.headGlowInner);
    glowGrad.addColorStop(0.5, this.palette.headGlowOuter);
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(currX, currY, (this.headRadius * 1.8) * scale, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw Attached Seeds
    for (const seed of this.seeds) {
      seed.drawAttached(ctx, currX, currY, headAngle, scale);
    }

    ctx.restore();

    // 5. Draw Detached Flying Seeds
    for (const seed of this.freeSeeds) {
      seed.drawFree(ctx);
    }
  }
}

// ============================================================================
// Ambient Spore & Botanical Background Scenery
// ============================================================================
class AmbientParticle {
  constructor(width, height) {
    this.reset(width, height, true);
  }

  reset(width, height, randomY = false) {
    this.x = Math.random() * width;
    this.y = randomY ? Math.random() * height : height + 10;
    this.radius = 1.0 + Math.random() * 2.2;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = -(0.3 + Math.random() * 0.6);
    this.alpha = 0.15 + Math.random() * 0.5;
    this.glow = 4 + Math.random() * 8;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt, windPower, width, height) {
    this.phase += dt * 1.2;
    this.x += (this.vx + Math.sin(this.phase) * 0.4 + windPower * 2.5) * 60 * dt;
    this.y += (this.vy - windPower * 3.0) * 60 * dt;

    if (this.y < -20 || this.x < -20 || this.x > width + 20) {
      this.reset(width, height);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = 'rgba(253, 230, 138, 0.85)';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = this.glow;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================================
// Triumphant Celebration Sparks (Rewarded when full dandelion is cleared)
// ============================================================================
class CelebrationSpark {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.0 + Math.random() * 5.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.8;
    this.color = color || '#facc15';
    this.life = 1.0;
    this.decay = 0.018 + Math.random() * 0.02;
    this.size = 2.5 + Math.random() * 3.5;
  }

  update(dt) {
    this.vy += 2.2 * dt; // Gentle gravity
    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
    this.life -= this.decay * 60 * dt;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.life));
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================================
// Color Palettes (Enchanting, Luminous Art Exhibition Aesthetic)
// ============================================================================
const PALETTES = {
  // Luminous Art Exhibition: Rose Gold, Cyan Opal, Honey Amber, Mint Jade, and Moonstone
  exhibition: [
    {
      name: 'Radiant Golden Starlight',
      stalkColor: 'rgba(255, 244, 190, 0.72)',
      fluffColor: 'rgba(255, 228, 100, 0.98)',
      seedColor: '#f59e0b',
      stemColor: '#365314',
      receptacleColor: '#ca8a04',
      headGlowInner: 'rgba(251, 191, 36, 0.45)',
      headGlowOuter: 'rgba(245, 158, 11, 0.12)',
      glowColor: 'rgba(251, 191, 36, 0.32)'
    },
    {
      name: 'Celestial Cyan Opal',
      stalkColor: 'rgba(207, 250, 254, 0.72)',
      fluffColor: 'rgba(103, 232, 249, 0.98)',
      seedColor: '#0891b2',
      stemColor: '#164e63',
      receptacleColor: '#0e7490',
      headGlowInner: 'rgba(34, 211, 238, 0.45)',
      headGlowOuter: 'rgba(6, 182, 212, 0.12)',
      glowColor: 'rgba(34, 211, 238, 0.32)'
    },
    {
      name: 'Sakura Rose Pearl',
      stalkColor: 'rgba(255, 228, 230, 0.72)',
      fluffColor: 'rgba(254, 178, 190, 0.98)',
      seedColor: '#e11d48',
      stemColor: '#4c1d95',
      receptacleColor: '#be123c',
      headGlowInner: 'rgba(251, 113, 133, 0.45)',
      headGlowOuter: 'rgba(244, 63, 94, 0.12)',
      glowColor: 'rgba(251, 113, 133, 0.32)'
    },
    {
      name: 'Aurora Mint Jade',
      stalkColor: 'rgba(236, 252, 203, 0.72)',
      fluffColor: 'rgba(190, 242, 100, 0.98)',
      seedColor: '#65a30d',
      stemColor: '#264e12',
      receptacleColor: '#4d7c0f',
      headGlowInner: 'rgba(163, 230, 53, 0.45)',
      headGlowOuter: 'rgba(132, 204, 22, 0.12)',
      glowColor: 'rgba(163, 230, 53, 0.32)'
    },
    {
      name: 'Dreamy Twilight Lilac',
      stalkColor: 'rgba(243, 232, 255, 0.72)',
      fluffColor: 'rgba(216, 180, 254, 0.98)',
      seedColor: '#9333ea',
      stemColor: '#3b0764',
      receptacleColor: '#7e22ce',
      headGlowInner: 'rgba(192, 132, 252, 0.45)',
      headGlowOuter: 'rgba(168, 85, 247, 0.12)',
      glowColor: 'rgba(192, 132, 252, 0.32)'
    },
    {
      name: 'Silvery Moonstone',
      stalkColor: 'rgba(248, 250, 252, 0.8)',
      fluffColor: 'rgba(255, 255, 255, 1.0)',
      seedColor: '#94a3b8',
      stemColor: '#334155',
      receptacleColor: '#475569',
      headGlowInner: 'rgba(255, 255, 255, 0.45)',
      headGlowOuter: 'rgba(226, 232, 240, 0.1)',
      glowColor: 'rgba(255, 255, 255, 0.32)'
    }
  ],
  bioluminescent: [
    {
      name: 'Cyan Deep Sea',
      stalkColor: 'rgba(56, 189, 248, 0.7)',
      fluffColor: 'rgba(14, 165, 233, 0.98)',
      seedColor: '#0369a1',
      stemColor: '#064e3b',
      receptacleColor: '#0891b2',
      headGlowInner: 'rgba(6, 182, 212, 0.48)',
      headGlowOuter: 'rgba(14, 116, 144, 0.14)',
      glowColor: 'rgba(6, 182, 212, 0.3)'
    },
    {
      name: 'Emerald Aurora',
      stalkColor: 'rgba(52, 211, 153, 0.7)',
      fluffColor: 'rgba(16, 185, 129, 0.98)',
      seedColor: '#047857',
      stemColor: '#064e3b',
      receptacleColor: '#059669',
      headGlowInner: 'rgba(16, 185, 129, 0.48)',
      headGlowOuter: 'rgba(4, 120, 87, 0.14)',
      glowColor: 'rgba(16, 185, 129, 0.3)'
    }
  ],
  ethereal: [
    {
      name: 'Pure Silver Opal',
      stalkColor: 'rgba(248, 250, 252, 0.75)',
      fluffColor: 'rgba(255, 255, 255, 1.0)',
      seedColor: '#cbd5e1',
      stemColor: '#334155',
      receptacleColor: '#64748b',
      headGlowInner: 'rgba(255, 255, 255, 0.48)',
      headGlowOuter: 'rgba(203, 213, 225, 0.1)',
      glowColor: 'rgba(255, 255, 255, 0.32)'
    }
  ],
  sunset: [
    {
      name: 'Sunset Magenta',
      stalkColor: 'rgba(244, 114, 182, 0.7)',
      fluffColor: 'rgba(236, 72, 153, 0.98)',
      seedColor: '#be185d',
      stemColor: '#831843',
      receptacleColor: '#9d174d',
      headGlowInner: 'rgba(244, 63, 94, 0.48)',
      headGlowOuter: 'rgba(225, 29, 72, 0.14)',
      glowColor: 'rgba(244, 63, 94, 0.3)'
    },
    {
      name: 'Honey Amber',
      stalkColor: 'rgba(251, 191, 36, 0.7)',
      fluffColor: 'rgba(245, 158, 11, 0.98)',
      seedColor: '#b45309',
      stemColor: '#78350f',
      receptacleColor: '#d97706',
      headGlowInner: 'rgba(251, 191, 36, 0.48)',
      headGlowOuter: 'rgba(217, 119, 6, 0.14)',
      glowColor: 'rgba(251, 191, 36, 0.3)'
    }
  ]
};

// ============================================================================
// Main Application / Garden Canvas Orchestrator
// ============================================================================
class DandelionGardenApp {
  constructor() {
    this.canvas = document.getElementById('garden-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.windField = new WindField();
    this.flowers = [];
    this.ambientParticles = [];

    this.currentTheme = 'exhibition';
    this.targetFlowerCount = 16; // Rich, dense exhibition garden
    this.difficultyMultiplier = 1.0; // 1.0 standard, 1.45 gale challenge, 0.7 gentle
    this.seedsBlownTotal = 0;
    this.flowersClearedTotal = 0;
    this.celebrationSparks = [];

    // DOM score references
    this.elClearedCount = document.getElementById('cleared-count');
    this.elTotalCount = document.getElementById('total-count');
    this.elSeedsCount = document.getElementById('seeds-blown-counter');

    this.lastTime = performance.now();
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // HUD Auto-hide state
    this.hud = document.getElementById('hud');
    this.lastActivityTime = performance.now();
    this.autoHideEnabled = true;

    // Pointer & Touch Wind Tracking State
    this.pointer = {
      x: 0,
      y: 0,
      prevX: 0,
      prevY: 0,
      vx: 0,
      vy: 0,
      speed: 0,
      isDown: false,
      lastTime: performance.now(),
      active: false
    };

    this.initCanvas();
    this.createGarden();
    this.bindEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  onSeedBlown() {
    this.seedsBlownTotal++;
    if (this.elSeedsCount) {
      this.elSeedsCount.textContent = this.seedsBlownTotal.toLocaleString();
    }
  }

  onFlowerCleared(flower) {
    this.flowersClearedTotal++;
    if (this.elClearedCount) {
      this.elClearedCount.textContent = `${this.flowersClearedTotal}`;
    }

    // Spawn burst of celebratory glowing sparks
    const pos = flower.getHeadPosition();
    for (let i = 0; i < 30; i++) {
      this.celebrationSparks.push(new CelebrationSpark(pos.x, pos.y, flower.palette.fluffColor));
    }

    if (window.soundEngine) {
      window.soundEngine.playFlowerClearedChime();
    }
  }

  initCanvas() {
    const dpr = Math.min(2.0, window.devicePixelRatio || 1);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  createGarden() {
    this.flowers = [];
    const paletteList = PALETTES[this.currentTheme] || PALETTES.exhibition;

    // Create a rich multi-layer field of dandelions staggered across horizontal width
    const margin = this.width * 0.05;
    const availableWidth = this.width - margin * 2;
    const spacing = availableWidth / (this.targetFlowerCount - 1);

    for (let i = 0; i < this.targetFlowerCount; i++) {
      // Natural jitter in position and height with staggered depth layers
      const posX = margin + i * spacing + (Math.random() - 0.5) * spacing * 0.65;
      const baseY = this.height + 25;

      // Heights range from 38% to 78% of screen height for rich vertical staggering
      const stemHeight = this.height * (0.38 + Math.random() * 0.38);
      const headRadius = 24 + Math.random() * 22; // Size of dandelion sphere

      const palette = paletteList[i % paletteList.length];
      this.flowers.push(new DandelionFlower(posX, baseY, stemHeight, headRadius, palette, i));
    }

    // Sort by height so background dandelions render first (proper botanical occlusion)
    this.flowers.sort((a, b) => a.targetHeight - b.targetHeight);

    // Ambient floating spore dust
    this.ambientParticles = [];
    for (let i = 0; i < 50; i++) {
      this.ambientParticles.push(new AmbientParticle(this.width, this.height));
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.initCanvas();
      this.createGarden();
    });

    // Activity tracking for exhibition HUD auto-hide
    const registerActivity = () => {
      this.lastActivityTime = performance.now();
      if (this.hud && this.hud.classList.contains('hud-hidden')) {
        this.hud.classList.remove('hud-hidden');
      }
    };
    window.addEventListener('keydown', registerActivity);

    // One-time audio unlock on any user gesture across modern browsers
    const unlockAudio = () => {
      if (window.soundEngine) {
        window.soundEngine.init();
        window.soundEngine.resume();
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('click', unlockAudio, { once: true });

    // Pointer & Touch Wind Tracking
    const handlePointerMove = (clientX, clientY, isDown = false) => {
      registerActivity();
      const now = performance.now();
      const timeDelta = Math.max(1, now - this.pointer.lastTime);

      const dx = clientX - this.pointer.prevX;
      const dy = clientY - this.pointer.prevY;
      const vx = (dx / timeDelta) * 1000;
      const vy = (dy / timeDelta) * 1000;
      const speed = Math.hypot(vx, vy);

      this.pointer.vx = this.pointer.vx * 0.4 + vx * 0.6;
      this.pointer.vy = this.pointer.vy * 0.4 + vy * 0.6;
      this.pointer.speed = speed;
      this.pointer.x = clientX;
      this.pointer.y = clientY;
      this.pointer.prevX = clientX;
      this.pointer.prevY = clientY;
      this.pointer.lastTime = now;
      this.pointer.isDown = isDown;
      this.pointer.active = true;

      // Add to global wind if moving fast
      if (speed > 120 && window.inputManager) {
        const gestIntensity = Math.min(0.85, (speed / 1400) * (isDown ? 1.3 : 1.0));
        window.inputManager.addGestureWind(gestIntensity);
      }
    };

    window.addEventListener('pointermove', (e) => {
      handlePointerMove(e.clientX, e.clientY, e.buttons > 0);
    });

    window.addEventListener('pointerdown', (e) => {
      this.pointer.prevX = e.clientX;
      this.pointer.prevY = e.clientY;
      this.pointer.lastTime = performance.now();
      handlePointerMove(e.clientX, e.clientY, true);
    });

    window.addEventListener('pointerup', () => {
      this.pointer.isDown = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        const t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY, true);
      }
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        const t = e.touches[0];
        this.pointer.prevX = t.clientX;
        this.pointer.prevY = t.clientY;
        this.pointer.lastTime = performance.now();
        handlePointerMove(t.clientX, t.clientY, true);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.pointer.isDown = false;
    });

    // Serial button
    const btnSerial = document.getElementById('btn-serial');
    if (btnSerial) {
      btnSerial.addEventListener('click', () => {
        window.inputManager.toggleWebSerial();
      });
    }

    // Breath Mic button
    const btnMic = document.getElementById('btn-mic');
    if (btnMic) {
      btnMic.addEventListener('click', () => {
        window.inputManager.toggleMicrophone();
      });
    }

    // Audio Mute toggle
    const btnAudio = document.getElementById('btn-audio');
    const iconSoundOn = document.getElementById('icon-sound-on');
    const iconSoundOff = document.getElementById('icon-sound-off');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        if (window.soundEngine) {
          window.soundEngine.init();
          const isMuted = window.soundEngine.toggleMute();
          if (iconSoundOn && iconSoundOff) {
            iconSoundOn.classList.toggle('hidden', isMuted);
            iconSoundOff.classList.toggle('hidden', !isMuted);
          }
        }
      });
    }

    // Settings Modal
    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnSettings && settingsModal) {
      btnSettings.addEventListener('click', () => {
        settingsModal.classList.toggle('hidden');
      });
      if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => {
          settingsModal.classList.add('hidden');
        });
      }
    }

    // Sensitivity slider
    const sliderSens = document.getElementById('slider-sensitivity');
    const valSens = document.getElementById('val-sensitivity');
    if (sliderSens) {
      sliderSens.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        window.inputManager.sensitivity = v;
        if (valSens) valSens.textContent = `${v.toFixed(1)}x`;
      });
    }

    // Dandelion density slider
    const sliderDensity = document.getElementById('slider-flowers');
    const valDensity = document.getElementById('val-flowers');
    if (sliderDensity) {
      sliderDensity.addEventListener('input', (e) => {
        this.targetFlowerCount = parseInt(e.target.value);
        if (valDensity) valDensity.textContent = `${this.targetFlowerCount} Flowers`;
        this.createGarden();
      });
    }

    // Palette selector
    const selTheme = document.getElementById('select-color-theme');
    if (selTheme) {
      selTheme.addEventListener('change', (e) => {
        this.currentTheme = e.target.value;
        this.createGarden();
      });
    }

    // Autohide checkbox
    const chkAutohide = document.getElementById('chk-autohide');
    if (chkAutohide) {
      chkAutohide.addEventListener('change', (e) => {
        this.autoHideEnabled = e.target.checked;
        if (!this.autoHideEnabled && this.hud) {
          this.hud.classList.remove('hud-hidden');
        }
      });
    }

    // Difficulty challenge selector
    const selDiff = document.getElementById('select-difficulty');
    const valDiff = document.getElementById('val-difficulty');
    if (selDiff) {
      selDiff.addEventListener('change', (e) => {
        this.difficultyMultiplier = parseFloat(e.target.value) || 1.0;
        if (valDiff) {
          valDiff.textContent = e.target.options[e.target.selectedIndex].text.split(' ')[0];
        }
      });
    }

    // Fullscreen exhibition toggle
    const btnFs = document.getElementById('btn-fullscreen');
    const iconFsEnter = document.getElementById('icon-fs-enter');
    const iconFsExit = document.getElementById('icon-fs-exit');
    if (btnFs) {
      btnFs.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          if (iconFsEnter && iconFsExit) {
            iconFsEnter.classList.add('hidden');
            iconFsExit.classList.remove('hidden');
          }
        } else {
          document.exitFullscreen().catch(() => {});
          if (iconFsEnter && iconFsExit) {
            iconFsEnter.classList.remove('hidden');
            iconFsExit.classList.add('hidden');
          }
        }
      });
    }
  }

  loop(timestamp) {
    const dt = Math.min(0.08, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    // 1. Update Input Manager (WebSerial / Mic / Keys)
    const windPower = window.inputManager.update(dt);

    // 2. Auto-hide HUD logic for exhibition mode (12s idle)
    if (this.autoHideEnabled && this.hud && !this.hud.classList.contains('hud-hidden')) {
      const isSettingsOpen = !document.getElementById('settings-modal').classList.contains('hidden');
      if (!isSettingsOpen && timestamp - this.lastActivityTime > 12000) {
        this.hud.classList.add('hud-hidden');
      }
    }

    // 3. Pointer momentum decay
    if (this.pointer.active) {
      this.pointer.speed *= 0.90;
      this.pointer.vx *= 0.90;
      this.pointer.vy *= 0.90;
      if (this.pointer.speed < 10) {
        this.pointer.speed = 0;
        this.pointer.active = false;
      }
    }

    // 4. Update physics fields
    this.windField.update(dt);

    // 5. Render Scene
    // Clear screen with deep nocturnal gradient
    this.ctx.fillStyle = '#06080d';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Ambient floating particles
    for (const p of this.ambientParticles) {
      p.update(dt, windPower, this.width, this.height);
      p.draw(this.ctx);
    }

    // Dandelion garden
    for (const flower of this.flowers) {
      flower.update(dt, windPower, this.windField, this.width, this.height, this.pointer);
      flower.draw(this.ctx);
    }

    // Celebratory spark fireworks when flowers are cleared
    for (let i = this.celebrationSparks.length - 1; i >= 0; i--) {
      const spark = this.celebrationSparks[i];
      spark.update(dt);
      spark.draw(this.ctx);
      if (spark.life <= 0) {
        this.celebrationSparks.splice(i, 1);
      }
    }

    requestAnimationFrame(this.loop);
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.dandelionApp = new DandelionGardenApp();
});
