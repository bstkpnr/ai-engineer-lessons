import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.MODEL ?? "claude-sonnet-5-5";
export const client = new Anthropic({ timeout: 60_000, maxRetries: 2 });
export { Anthropic };

// Bazı yeni modeller `temperature` ayarını artık kabul etmiyor (400: "temperature is deprecated").
// İlk denemede gönderiyoruz; model reddederse bir daha göndermiyoruz ve isteği onsuz tekrarlıyoruz.
let temperatureSupported = process.env.DISABLE_TEMPERATURE !== "1";

// İsteğe eklenecek ayar: destekleniyorsa { temperature }, değilse hiçbir şey
export const sampling = (temperature) => (temperatureSupported ? { temperature } : {});

// Geliştirici paneli için: gerçekten gönderilen değer (gönderilmediyse null)
export const sentTemperature = (temperature) => (temperatureSupported ? temperature : null);

const isTemperatureError = (error) =>
  error?.status === 400 && /temperature/i.test(error?.message ?? "");

// `run` her çağrıldığında sampling() ile isteği yeniden kurmalı
export async function withTemperatureFallback(run) {
  try {
    return await run();
  } catch (error) {
    if (!temperatureSupported || !isTemperatureError(error)) throw error;
    temperatureSupported = false;
    console.warn(`ℹ️  ${MODEL} temperature ayarını desteklemiyor; istekler artık onsuz gönderilecek.`);
    return await run();
  }
}
