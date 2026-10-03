/**
 * Contraseñas de calibración (§11 del brief y casos adicionales).
 * `max`/`min` se refieren al puntaje de fuerza local, antes del tope por filtración.
 */
export interface CalibrationCase {
  readonly password: string;
  readonly min?: number;
  readonly max?: number;
}

export const CALIBRATION: readonly CalibrationCase[] = [
  { password: '123456', max: 1 },
  { password: 'password', max: 1 },
  { password: 'qwerty123', max: 1 },
  { password: 'P@ssw0rd', max: 1 },
  { password: 'Password123!', max: 3 },
  { password: 'america2024', max: 3 },
  { password: 'chivas10', max: 3 },
  { password: 'guadalupe1985', max: 3 },
  { password: 'Lunes2026!', max: 4 },
  { password: 'kX9#mQ2$vL', min: 5, max: 7 },
  { password: 'correcto caballo batería grapa', min: 8 },
  { password: 'marmota-lápiz-tormenta-cobre', min: 8 },
  { password: 'kX9#mQ2$vL7@pR4!', min: 9 },
];
