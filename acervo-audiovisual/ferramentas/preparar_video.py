"""Prepara um vídeo para engenharia reversa: baixa, tira quadros, monta a folha de contato e junta a fala.

Uso: python preparar_video.py <URL> <pasta_saida> [transcricao_existente.txt]

Gera em <pasta_saida>: video.mp4, info.json, contato.jpg (24 quadros com o tempo escrito), quadros/,
transcricao.txt (copiada se existir; senão faster-whisper base na CPU; WHISPER_MODELO=small para mais qualidade, =nenhum para pular) e meta.txt (números do post).
Nada disso vai para o Git: é material de terceiros. Só a ficha escrita entra no acervo.
Requisitos: yt-dlp (python -m pip install yt-dlp), ffmpeg no PATH, faster-whisper e numpy (só se transcrever).
"""
import json, os, shutil, subprocess, sys

def run(*a):
    return subprocess.run(a, capture_output=True, text=True, encoding='utf-8', errors='replace')

def main():
    url, out = sys.argv[1], sys.argv[2]
    trans = sys.argv[3] if len(sys.argv) > 3 else None
    os.makedirs(os.path.join(out, 'quadros'), exist_ok=True)
    if not os.path.exists(os.path.join(out, 'video.mp4')):
        r = run(sys.executable, '-m', 'yt_dlp', '-q', '--no-warnings', '-f', 'mp4/best',
                '-o', os.path.join(out, 'video.%(ext)s'), '--write-info-json', '--playlist-items', '1', url)
        if not os.path.exists(os.path.join(out, 'video.mp4')):
            print('FALHOU_DOWNLOAD', r.stderr[-300:]); sys.exit(2)
    info = {}
    for n in ('video.info.json',):
        p = os.path.join(out, n)
        if os.path.exists(p):
            info = json.load(open(p, encoding='utf-8'))
    dur = float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                    os.path.join(out, 'video.mp4')).stdout.strip() or 0)
    n = 24
    step = max(dur / n, 0.5)
    for i in range(n):
        t = min(i * step + 0.2, max(dur - 0.1, 0))
        run('ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', os.path.join(out, 'video.mp4'), '-frames:v', '1',
            '-vf', f"scale=300:-1,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='{t:.1f}s':x=6:y=6:fontsize=22:fontcolor=yellow:box=1:boxcolor=black",
            os.path.join(out, 'quadros', f'q{i:02d}.jpg'))
    run('ffmpeg', '-v', 'error', '-y', '-i', os.path.join(out, 'quadros', 'q%02d.jpg'), '-vf', 'tile=6x4',
        os.path.join(out, 'contato.jpg'))
    tdst = os.path.join(out, 'transcricao.txt')
    if trans and os.path.exists(trans) and os.path.getsize(trans) > 20:
        shutil.copy(trans, tdst)
    elif os.environ.get('WHISPER_MODELO') == 'nenhum':
        pass
    elif not os.path.exists(tdst):
        raw = os.path.join(out, 'audio.raw')
        run('ffmpeg', '-v', 'error', '-y', '-i', os.path.join(out, 'video.mp4'), '-ac', '1', '-ar', '16000', '-f', 's16le', raw)
        try:
            import numpy as np
            from faster_whisper import WhisperModel
            a = np.fromfile(raw, dtype=np.int16).astype(np.float32) / 32768
            segs, _ = WhisperModel(os.environ.get('WHISPER_MODELO', 'base'), device='cpu', compute_type='int8').transcribe(a, language='pt')
            with open(tdst, 'w', encoding='utf-8') as f:
                for s in segs:
                    f.write(f'[{s.start:6.1f}-{s.end:6.1f}] {s.text.strip()}\n')
        except Exception as e:
            open(tdst, 'w', encoding='utf-8').write(f'(sem transcrição: {e})\n')
    with open(os.path.join(out, 'meta.txt'), 'w', encoding='utf-8') as f:
        for k in ('uploader', 'channel', 'upload_date', 'like_count', 'comment_count', 'view_count', 'description'):
            f.write(f'{k}: {info.get(k)}\n')
        f.write(f'duracao: {dur:.1f}\n')
    print('OK', out, f'{dur:.1f}s')

if __name__ == '__main__':
    main()
