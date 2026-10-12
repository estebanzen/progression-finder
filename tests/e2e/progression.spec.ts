import { test, expect } from '@playwright/test';

test('progression drives scale, selection, guitar and piano without competing updates', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.getByLabel('Progresión con símbolos de acordes').fill('Gm C Fmaj7 D7');
  await expect(page.getByRole('heading', { name: 'Tonalidad principal: Fa mayor' })).toBeVisible();
  await expect(page.locator('.analyzer-degrees')).toHaveText('ii – V – I – V7/ii');
  await expect(page.locator('.progression-chord')).toHaveCount(4);
  await page.getByRole('button', { name: 'Expandir Escalas', exact: true }).click();
  await expect(page.getByLabel('Notas de la escala en cifrado americano')).toHaveValue('F G A Bb C D E');
  await expect(page.getByLabel('Seleccionar nota raíz de la escala')).toHaveValue('F');
  await expect(page.getByLabel('Seleccionar tipo de escala')).toHaveValue('major');

  await page.getByRole('button', { name: 'Seleccionar y escuchar D7, V7/ii', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Seleccionar y escuchar D7, V7/ii', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.guitar-diagram .diagram-header')).toHaveText('D7');
  await expect(page.locator('.piano-chord-section strong')).toHaveText('D7');
  await expect(page.locator('.piano-chord-section').getByRole('button', { name: 'Tocar F#4', exact: true })).toHaveClass(/active/);
  await expect(page.locator('.piano-scale-section').getByRole('button', { name: 'Tocar F#4', exact: true })).not.toHaveClass(/active/);
  await expect(page.locator('.piano-scale-section').getByRole('button', { name: 'Tocar Bb4', exact: true })).toHaveClass(/active/);
  await expect(page.locator('.scale-fretboard')).toHaveAttribute('aria-label', 'Diapasón con las notas F, G, A, Bb, C, D, E');
  await expect(page.getByRole('heading', { name: 'Acordes que podés agregar', exact: true })).toBeVisible();
  await expect(page.locator('.recommendation-card')).toHaveCount(6);
  await page.screenshot({ path: 'test-results/progression-desktop.png', fullPage: true });

  await page.evaluate(() => {
    const browser = window as typeof window & { scaleSyncCalls: number };
    browser.scaleSyncCalls = 0;
    const replace = history.replaceState.bind(history);
    history.replaceState = (...args: Parameters<History['replaceState']>) => { browser.scaleSyncCalls++; replace(...args); };
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key === 'current_scale_root' || key === 'current_scale_notes') browser.scaleSyncCalls++;
      write.call(this, key, value);
    };
  });

  await page.getByRole('button', { name: 'Escuchar sugerencia Bbmaj7', exact: true }).click();
  await expect(page.locator('.piano-chord-section strong')).toHaveText('D7');
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm C Fmaj7 D7');
  await page.getByRole('button', { name: 'Ver sugerencia Bbmaj7 en guitarra y piano', exact: true }).click();
  await expect(page.locator('.piano-chord-section strong')).toHaveText('Bbmaj7');
  await expect(page.locator('.guitar-diagram .diagram-header')).toHaveText('Bbmaj7');
  await expect(page.locator('.guitar-view-container')).toContainText('todavía no pertenece');
  await expect(page.locator('.progression-chord[aria-pressed="true"]')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/suggestion-preview-desktop.png', fullPage: true });
  await expect(page.getByLabel('Notas de la escala en cifrado americano')).toHaveValue('F G A Bb C D E');
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm C Fmaj7 D7');
  expect(await page.evaluate(() => (window as typeof window & { scaleSyncCalls: number }).scaleSyncCalls)).toBe(0);
  await page.getByRole('button', { name: 'Agregar Bbmaj7 acá', exact: true }).click();
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm C Fmaj7 Bbmaj7 D7');
  await expect(page.locator('.progression-chord[aria-pressed="true"] .chord-name')).toHaveText('Bbmaj7');
  await expect(page.locator('.piano-chord-section strong')).toHaveText('Bbmaj7');
  await page.getByRole('button', { name: 'Deshacer inserción', exact: true }).click();
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm C Fmaj7 D7');
  await expect(page.locator('.piano-chord-section strong')).toHaveText('D7');
  await page.getByRole('button', { name: 'Agregar Bbmaj7 acá', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm C Fmaj7 Bbmaj7 D7');
  await expect(page.locator('.piano-chord-section strong')).toHaveText('Bbmaj7');
  await expect(page.getByLabel('Notas de la escala en cifrado americano')).toHaveValue('F G A Bb C D E');

  await page.getByLabel('Progresión con símbolos de acordes').fill('C Am');
  await expect(page.getByRole('button', { name: 'Usar Do mayor', exact: true })).toBeVisible();
  await expect(page.locator('.analyzer-key-choice')).toContainText('La escala actual se conserva');
  await page.getByRole('button', { name: 'Usar Do mayor', exact: true }).click();
  await expect(page.getByLabel('Notas de la escala en cifrado americano')).toHaveValue('C D E F G A B');
  await page.getByLabel('Progresión con símbolos de acordes').fill('H Cmaj9');
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Progresión con símbolos de acordes').fill('');
  await expect(page.getByRole('heading', { name: 'Acordes de la Escala', exact: true })).toBeVisible();
  await expect(page.getByLabel('Notas de la escala en cifrado americano')).toBeEditable();
  expect(errors).toEqual([]);
});

test('contextual choices support circular positions, preview, undo and explicit variants', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.getByLabel('Progresión con símbolos de acordes').fill('Gm C Fmaj7 D7');
  await expect(page.locator('.recommendation-card')).toHaveCount(6);
  await page.getByRole('button', { name: /^Ver todas/ }).click();
  await expect(page.getByRole('button', { name: 'Escuchar sugerencia Bbm7', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escuchar sugerencia Dbmaj7', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver sugerencia F#dim7 en guitarra y piano', exact: true }).click();
  await expect(page.locator('.piano-chord-section strong')).toHaveText('F#dim7');
  await expect(page.locator('.guitar-diagram .diagram-header')).toHaveText('F#dim7');
  await expect(page.locator('.piano-chord-section .piano-key-black.active')).toHaveCount(2);
  await expect(page.locator('.scale-fretboard')).toHaveAttribute('aria-label', 'Diapasón con las notas F, G, A, Bb, C, D, E');
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm C Fmaj7 D7');
  await page.getByLabel('Ubicación para F#dim7').selectOption('4');
  await page.getByRole('button', { name: 'Agregar F#dim7 acá', exact: true }).click();
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm C Fmaj7 D7 F#dim7');
  await expect(page.locator('.progression-chord[aria-pressed="true"] .chord-name')).toHaveText('F#dim7');
  await page.getByRole('button', { name: 'Deshacer inserción', exact: true }).click();
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm C Fmaj7 D7');
  await page.getByRole('button', { name: 'Escuchar variante 1', exact: true }).click();
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm C Fmaj7 D7');
  await page.getByRole('button', { name: 'Usar progresión 1', exact: true }).click();
  await expect(page.getByLabel('Progresión con símbolos de acordes')).toHaveValue('Gm7 C7 Fmaj7 Am7 D7');
  await expect(page.locator('.analyzer-degrees')).toHaveText('ii – V – I – iii – V7/ii');
  await expect(page.getByRole('button', { name: 'Deshacer inserción', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('minor and C major integrate correctly on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByLabel('Progresión con símbolos de acordes').fill('Dm G Cmaj7');
  await expect(page.getByRole('heading', { name: 'Tonalidad principal: Do mayor' })).toBeVisible();
  await page.getByRole('button', { name: 'Seleccionar y escuchar Cmaj7, I', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.piano-chord-section strong')).toHaveText('Cmaj7');
  await page.getByLabel('Progresión con símbolos de acordes').fill('Am Dm E7 Am');
  await expect(page.getByRole('heading', { name: 'Tonalidad principal: La menor' })).toBeVisible();
  await page.getByRole('button', { name: 'Seleccionar y escuchar E7, V', exact: true }).click();
  await expect(page.locator('.piano-chord-section strong')).toHaveText('E7');
  await expect(page.locator('.guitar-diagram .diagram-header')).toHaveText('E7');
  await expect(page.locator('.scale-fretboard')).toHaveAttribute('aria-label', 'Diapasón con las notas A, B, C, D, E, F, G');
  await page.screenshot({ path: 'test-results/progression-mobile.png', fullPage: true });
});


test('suspended selection updates guitar and piano', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Progresión con símbolos de acordes').fill('Gm Csus4 C Fmaj7 D7');
  await expect(page.locator('.analyzer-degrees')).toHaveText('ii – Vsus4 – V – I – V7/ii');
  await page.getByRole('button', { name: 'Seleccionar y escuchar Csus4, Vsus4', exact: true }).click();
  await expect(page.locator('.guitar-diagram .diagram-header')).toHaveText('Csus4');
  await expect(page.locator('.piano-chord-section strong')).toHaveText('Csus4');
  for (const note of ['C','F','G']) await expect(page.locator('.piano-chord-section').getByRole('button', {name: 'Tocar ' + note + '4', exact: true})).toHaveClass(/active/);
  await expect(page.locator('.piano-chord-section .active')).toHaveCount(3);
});
