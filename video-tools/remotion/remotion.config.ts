import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);

// No ambiente na nuvem, usa o Chromium já instalado (no PC, remova esta linha
// ou deixe: se o caminho não existir o Remotion baixa o próprio navegador).
import { existsSync } from "node:fs";
if (existsSync("/opt/pw-browsers/chromium")) {
  Config.setBrowserExecutable("/opt/pw-browsers/chromium");
}
