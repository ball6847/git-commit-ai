import { assertEquals } from '@std/assert';
import { loadConfig } from '../../../src/config.ts';

Deno.test('loadConfig: returns empty config when file does not exist', async () => {
  const result = await loadConfig('/nonexistent/path/config.json');
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, {});
  }
});

Deno.test('loadConfig: parses valid config file', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/config.json`;
  await Deno.writeTextFile(
    configPath,
    JSON.stringify({ model: 'gpt-4o', temperature: 0.5 }),
  );

  const result = await loadConfig(configPath);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.model, 'gpt-4o');
    assertEquals(result.value.temperature, 0.5);
  }

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test('loadConfig: returns error when file contains invalid JSON', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/config.json`;
  await Deno.writeTextFile(configPath, 'not valid json {[');

  const result = await loadConfig(configPath);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.message.includes('Failed to parse config file'), true);
  }

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test('loadConfig: returns error when file is an array', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/config.json`;
  await Deno.writeTextFile(configPath, JSON.stringify([1, 2, 3]));

  const result = await loadConfig(configPath);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.message, 'Config file must be a JSON object');
  }

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test('loadConfig: returns error when file is a string', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/config.json`;
  await Deno.writeTextFile(configPath, JSON.stringify('hello'));

  const result = await loadConfig(configPath);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.message, 'Config file must be a JSON object');
  }

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test('loadConfig: returns error when file is a number', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/config.json`;
  await Deno.writeTextFile(configPath, JSON.stringify(42));

  const result = await loadConfig(configPath);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.message, 'Config file must be a JSON object');
  }

  await Deno.remove(tempDir, { recursive: true });
});
