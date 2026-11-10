/**
 * assets.js - Cargador y Administrador Central de Sprites e Imágenes
 * Precarga todos los recursos en memoria para renderizado pixel-perfect instantáneo.
 */

class AssetManager {
  constructor() {
    this.images = {};
    this.totalToLoad = 0;
    this.loadedCount = 0;
    this.isReady = false;
  }

  loadAll(onProgress, onComplete) {
    const assetManifest = {
      // Pantallas e Interfaces
      startScreen: 'assets/start_screen.jpg',
      howItWorks: 'assets/how_it_works.jpg',
      deathScreen: 'assets/death_screen.jpg',
      loopDialogScreen: 'assets/loop_dialog_screen.jpg',
      gameOverScreen: 'assets/gameover_screen.jpg',
      victoryScreen: 'assets/victory_screen.jpg',
      hudBar: 'assets/hud_bar.png',

      // Personaje y Cinemática
      player: 'assets/player.png',
      helicopterIntro: 'assets/helicopter_intro.png',

      // Moneda
      coin: 'assets/coin.png',

      // Árboles en bordes
      tree1: 'assets/tree_1.png',
      tree2: 'assets/tree_2.png',

      // Aves (Ciclo de 4 fotogramas)
      bird1: 'assets/bird_1.png',
      bird2: 'assets/bird_2.png',
      bird3: 'assets/bird_3.png',
      bird4: 'assets/bird_4.png',

      // Nubes (10 variantes)
      cloud1: 'assets/cloud_1.png',
      cloud2: 'assets/cloud_2.png',
      cloud3: 'assets/cloud_3.png',
      cloud4: 'assets/cloud_4.png',
      cloud5: 'assets/cloud_5.png',
      cloud6: 'assets/cloud_6.png',
      cloud7: 'assets/cloud_7.png',
      cloud8: 'assets/cloud_8.png',
      cloud9: 'assets/cloud_9.png',
      cloud10: 'assets/cloud_10.png',

      // Partes de Helicóptero
      debrisCockpit: 'assets/debris_cockpit.png',
      debrisEngine: 'assets/debris_engine.png',
      debrisFuselage: 'assets/debris_fuselage.png',
      debrisTail: 'assets/debris_tail.png',
      debrisRotor: 'assets/debris_rotor.png',
      debrisDoorStar: 'assets/debris_door_star.png',
      debrisSkid: 'assets/debris_skid.png',
      debrisSeat: 'assets/debris_seat.png',
      debrisHatch: 'assets/debris_hatch.png',
      debrisScrap: 'assets/debris_scrap.png',

      // Partes de Avión
      planeCockpit: 'assets/plane_cockpit.png',
      planeFuselage: 'assets/plane_fuselage.png',
      planeTail: 'assets/plane_tail.png',
      planeWing: 'assets/plane_wing.png',
      planeWheel: 'assets/plane_wheel.png'
    };

    const keys = Object.keys(assetManifest);
    this.totalToLoad = keys.length;

    keys.forEach((key) => {
      const img = new Image();
      img.src = assetManifest[key];
      img.onload = () => {
        this.images[key] = img;
        this.loadedCount++;
        if (onProgress) onProgress(this.loadedCount / this.totalToLoad);
        if (this.loadedCount === this.totalToLoad) {
          this.isReady = true;
          if (onComplete) onComplete();
        }
      };
      img.onerror = () => {
        console.warn(`Error al cargar asset: ${assetManifest[key]}`);
        this.loadedCount++;
        if (this.loadedCount === this.totalToLoad) {
          this.isReady = true;
          if (onComplete) onComplete();
        }
      };
    });
  }

  get(name) {
    return this.images[name] || null;
  }
}

window.assets = new AssetManager();
