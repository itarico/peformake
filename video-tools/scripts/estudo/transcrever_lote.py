"""Transcreve vários arquivos (áudio ou vídeo) com faster-whisper local; pula os que já têm transcricao.txt."""
import sys
from pathlib import Path
from faster_whisper import WhisperModel
m = WhisperModel(r"C:\Users\intal\.video-models\whisper-small", device="cpu", compute_type="int8", cpu_threads=4)
for a in map(Path, sys.argv[1:]):
    out = a.parent / "transcricao.txt"
    if out.exists():
        continue
    segs, info = m.transcribe(str(a), language=None, vad_filter=True, beam_size=1)
    out.write_text(f"idioma: {info.language}\n" + "\n".join(
        f"[{int(s.start//60):02d}:{int(s.start%60):02d}] {s.text.strip()}" for s in segs), encoding="utf-8")
    print("OK", a.parent.name, flush=True)
