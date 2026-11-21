# Junta V1 (imagens) + V2 (textos e legenda com alfa) + mix_v80.wav -> montagem/taoismo_final_v80.mp4 (1080p)
# e taoismo_final_v80_720p.mp4 (previa com menos de 45 MB para o WhatsApp).
import json, pathlib, subprocess
V80 = pathlib.Path(__file__).resolve().parent.parent; MONT = V80.parent
SAI = pathlib.Path('G:/lucas/taoismo_v80/saida')
final = MONT / 'taoismo_final_v80.mp4'; previa = MONT / 'taoismo_final_v80_720p.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(SAI / 'v1.mp4'), '-i', str(SAI / 'v2.mov'), '-i', str(SAI / 'mix_v80.wav'),
                '-filter_complex', '[0:v][1:v]overlay=format=auto,format=yuv420p[v]', '-map', '[v]', '-map', '2:a',
                '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', str(final)], check=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(final)], capture_output=True, text=True).stdout)
vk = int((44 * 8 * 1024 / dur) - 64)  # orcamento de 44 MB menos o audio de 64 kb/s
for passo in (1, 2):
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(final), '-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'slow', '-b:v', f'{vk}k', '-pass', str(passo),
           '-passlogfile', str(SAI / 'p720')]
    cmd += (['-an', '-f', 'null', 'NUL'] if passo == 1 else ['-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-movflags', '+faststart', str(previa)])
    subprocess.run(cmd, check=True)
for f in (final, previa): print('ok', f, round(f.stat().st_size / 2**20, 1), 'MB')
