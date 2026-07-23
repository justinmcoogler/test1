// Real-world weather & seasons. Deterministic from world time + seed + the
// player's local biome climate, so seasons survive save/load with zero extra
// state (current weather is transient and re-converges in a few seconds on load).
// Drives mood (sky/fog tint, daylight), precipitation, and the felt-temperature
// offset the body-temperature system consumes.
import { DAY_LEN } from './world.js';
import { clamp } from '../core/math.js';

const DAYS_PER_SEASON = 3;
export const SEASON_LEN = DAY_LEN * DAYS_PER_SEASON;
export const YEAR_LEN = SEASON_LEN * 4;
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

// Weather archetypes → visual + climate effect. tempOff is in worldgen
// temperature units (0–1); fog/day are multipliers applied by the renderer.
export const WEATHER = {
  clear:    { label: 'Clear',    tint: null,               fog: 0.00, day: 1.00, precip: null,   tempOff:  0.03 },
  cloudy:   { label: 'Cloudy',   tint: [0.60, 0.63, 0.68], fog: 0.15, day: 0.84, precip: null,   tempOff: -0.02 },
  fog:      { label: 'Fog',      tint: [0.72, 0.74, 0.77], fog: 0.62, day: 0.80, precip: null,   tempOff: -0.02 },
  rain:     { label: 'Rain',     tint: [0.48, 0.53, 0.60], fog: 0.40, day: 0.66, precip: 'rain', tempOff: -0.06 },
  storm:    { label: 'Storm',    tint: [0.32, 0.35, 0.42], fog: 0.55, day: 0.46, precip: 'rain', tempOff: -0.07, wind: 1.4 },
  snow:     { label: 'Snow',     tint: [0.80, 0.83, 0.88], fog: 0.45, day: 0.74, precip: 'snow', tempOff: -0.09 },
  blizzard: { label: 'Blizzard', tint: [0.88, 0.90, 0.94], fog: 0.72, day: 0.56, precip: 'snow', tempOff: -0.16, wind: 1.6 },
  heatwave: { label: 'Heatwave', tint: [0.96, 0.84, 0.62], fog: 0.10, day: 1.00, precip: null,   tempOff:  0.12 },
};

// cheap deterministic smooth value noise in 1-D (weather fronts)
function hash1(n) { const s = Math.sin(n) * 43758.5453; return s - Math.floor(s); }
function vnoise(x) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) * (1 - u) + hash1(i + 1) * u;
}

export class Weather {
  constructor(seed = 1) {
    this.seed = seed;
    this.worldTime = 0;
    this.current = 'clear';
    this.intensity = 0;                        // eases so weather fades in/out
    this.climate = { temp: 0.5, moist: 0.4 };  // smoothed local biome climate
  }

  yearPhase() { return (this.worldTime / YEAR_LEN) % 1; }
  seasonIndex() { return Math.floor(this.yearPhase() * 4) % 4; }
  get season() { return SEASONS[this.seasonIndex()]; }

  // −0.12 (deep winter) … +0.12 (peak summer), smooth
  seasonTempOffset() { return -Math.cos(this.yearPhase() * Math.PI * 2) * 0.12; }

  // the archetype the current front + local climate + season is trending toward
  targetWeather() {
    const t = clamp(this.climate.temp + this.seasonTempOffset(), 0, 1);
    const m = this.climate.moist;
    const front = vnoise(this.worldTime / (DAY_LEN * 1.5) + this.seed * 0.017);
    const wet = clamp(m * 0.8 + (front - 0.4) * 1.5, 0, 1);
    if (wet > 0.62) {
      if (t < 0.34) return wet > 0.85 ? 'blizzard' : 'snow';
      return wet > 0.86 ? 'storm' : 'rain';
    }
    if (wet > 0.42) {
      if (t < 0.30) return 'snow';
      return m > 0.5 ? 'fog' : 'cloudy';
    }
    if (t > 0.82 && m < 0.30 && front > 0.66) return 'heatwave';
    return front > 0.5 ? 'clear' : 'cloudy';
  }

  update(dt, worldTime, climate) {
    this.worldTime = worldTime;
    if (climate) {
      // ease local climate so crossing a biome edge doesn't snap the weather
      this.climate.temp += (climate.temp - this.climate.temp) * Math.min(1, dt * 0.5);
      this.climate.moist += (climate.moist - this.climate.moist) * Math.min(1, dt * 0.5);
    }
    const target = this.targetWeather();
    if (target === this.current) {
      this.intensity += (1 - this.intensity) * Math.min(1, dt * 0.4);
    } else {
      this.intensity -= this.intensity * Math.min(1, dt * 0.6);  // fade old out…
      if (this.intensity < 0.06) this.current = target;           // …then swap and fade up
    }
  }

  def() { return WEATHER[this.current]; }

  // felt-temperature contribution (0–1 units) for the body-temperature system
  tempOffset() { return this.seasonTempOffset() + this.def().tempOff * this.intensity; }

  // render hints consumed by renderer.draw({ weather })
  renderState() {
    const d = this.def();
    return {
      tint: d.tint,
      fog: (d.fog || 0) * this.intensity,
      day: 1 - (1 - (d.day ?? 1)) * this.intensity,
      precip: this.intensity > 0.25 ? d.precip : null,
      intensity: this.intensity,
      wind: (d.wind || 0.4) * this.intensity,
    };
  }
}
