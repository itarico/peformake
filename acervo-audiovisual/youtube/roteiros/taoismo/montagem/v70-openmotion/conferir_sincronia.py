# Confere a sincronia de 3 objetos: onde o som novo comeca (diferenca entre o mix v70 e o mix v60) x quando o objeto entra.
import subprocess, numpy as np
SR = 48000
def ler(p, ss, dur):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(ss), '-t', str(dur), '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.float32)
checks = [('corte_risco', 26.93 + 6.38), ('mapa_pequim', 305.1 + 2.1), ('livro_81', 324.12 + 18.6)]
for nome, t in checks:
    a = ler('mix_v70_bruto.wav', t - .25, 1); b = ler('../mix_bruto.wav', t - .25, 1)  # janela curta: nao pega o som do objeto anterior
    env = np.convolve(np.abs(a - b), np.ones(240) / 240, 'same'); m = int(np.argmin(env[:int(.3 * SR)])); on = (m + np.argmax(env[m:] > env.max() * .3)) / SR - .25  # comeca a busca depois do vale (ignora o rabo do som anterior)
    print(f'{nome}: objeto entra {t:.2f}s, som comeca {t + on:.2f}s, diferenca {on * 1000:+.0f} ms')
    for k, dt in enumerate((-0.15, 0.3)):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t + dt:.3f}', '-i', '../taoismo_final_v70.mp4', '-frames:v', '1', '-vf', 'scale=640:-1', f'conferir/{nome}_{k}.jpg'], check=True)
