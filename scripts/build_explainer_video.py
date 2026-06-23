#!/usr/bin/env python3
"""PortabIA — vidéo explicative (voix Marie Voxtral + sous-titres + musique, SANS intro/outro).
Explique : à quoi ça sert · libre & gratuit · comment ça marche (mécanisme réel).
Réutilise la voix Marie ESSN, la music-bed habituelle, atempo ~0.95 (ralenti featurette).
E²SN — Guillaume BOUTON."""
import os, sys, subprocess, json, wave, contextlib, math

ROOT = '/home/dev/portabia'
PVID = '/tmp/pvid'
MUSIC = '/home/dev/spot-pub-dessin-anime-2026-06/assets/music-bed.mp3'
OUT = f'{ROOT}/docs/detective/portabia-explainer.mp4'
MARIE = '5893adbb-8a8c-4f4a-9083-09b24ab06ec7'
TEMPO = 0.95   # ralenti ~5% (norme featurette Marie)
TAIL = 0.55    # silence de respiration après chaque segment
W, H = 1920, 1080

# (image, VO pour Voxtral, sous-titre affiché)
SEGMENTS = [
    ('s1_hero',
     "Changer d'intelligence artificielle, aujourd'hui, c'est tout réexpliquer depuis zéro. Portabia fait passer votre contexte de travail d'une IA à une autre.",
     "Changer d'IA, c'est tout réexpliquer.\\NPortabIA fait passer votre contexte d'une IA à l'autre."),
    ('s2_privacy',
     "C'est un service libre, open source, et entièrement gratuit. Tout se passe dans votre navigateur : aucune donnée n'est envoyée sur un serveur, et rien n'est stocké.",
     "Libre, open source et gratuit.\\NTout se passe dans votre navigateur — rien n'est stocké."),
    ('s4_source',
     "Le principe est simple. Vous choisissez votre intelligence artificielle de départ, et celle d'arrivée.",
     "Vous choisissez votre IA de départ\\Net votre IA d'arrivée."),
    ('s6_granularity',
     "Puis ce que vous emportez : instructions, projets, historique. Tout, ou seulement l'essentiel, axe par axe.",
     "Puis ce que vous emportez :\\Ntout, ou l'essentiel, axe par axe."),
    ('s7_modeA_top',
     "Et tout cela reste gratuit, car Portabia ne dépend d'aucun abonnement extérieur. Quelques étapes simples, entièrement dans votre navigateur, suffisent.",
     "Aucune API : copiez le texte dans votre IA,\\Ncollez sa réponse en retour."),
    ('s8_modeA_result',
     "Au final, vous obtenez le vrai fichier de configuration de votre nouvelle intelligence artificielle : un fichier Claude point M D, ou Agents point M D, prêt à déposer dans votre projet.",
     "Vous obtenez le vrai fichier natif (CLAUDE.md, AGENTS.md)\\Nà déposer dans le projet — ou un prompt à coller."),
    ('s3_howto',
     "Gratuit, privé, sans installation. Votre contexte vous suit, d'une intelligence artificielle à l'autre. Portabia, par E deux S N.",
     "Gratuit, privé, sans installation.\\NPortabIA — par E²SN · portabia.essn.fr"),
]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('FFMPEG ERR:', ' '.join(cmd[:6]), '\n', r.stderr[-800:]); sys.exit(1)
    return r

def dur_wav(path):
    with contextlib.closing(wave.open(path,'r')) as w:
        return w.getnframes()/float(w.getframerate())

def load_env_key():
    for line in open('/home/dev/essnauthor/backend/.env'):
        if line.startswith('MISTRAL_API_KEY='):
            os.environ['MISTRAL_API_KEY'] = line.split('=',1)[1].strip()
            return
load_env_key()
sys.path.insert(0, '/home/dev/essnauthor/backend')
from services.voxtral_tts import synth_voxtral

os.makedirs(PVID, exist_ok=True)

# 1) TTS Marie + ralenti atempo -> wav 48k mono ; mesure durées
durs = []
for i,(img, vo, sub) in enumerate(SEGMENTS):
    mp3 = f'{PVID}/vo{i}.mp3'
    if not (os.path.exists(mp3) and os.path.getsize(mp3) > 0):
        print(f'  TTS {i}: {vo[:50]}…')
        audio = synth_voxtral(vo, MARIE)   # évalué AVANT d'ouvrir le fichier (pas de 0-byte si échec)
        open(mp3,'wb').write(audio)
    wav = f'{PVID}/vo{i}.wav'
    run(['ffmpeg','-y','-i',mp3,'-filter:a',f'atempo={TEMPO}','-ar','48000','-ac','1',wav])
    d = dur_wav(wav) + TAIL
    durs.append(d)
    print(f'  seg{i} durée={d:.2f}s')
TOTAL = sum(durs)
print(f'TOTAL = {TOTAL:.1f}s')

# 2) piste voix : concat (voix + silence de queue) dans l'ordre
parts = []
for i,d in enumerate(durs):
    sil = f'{PVID}/sil{i}.wav'
    run(['ffmpeg','-y','-f','lavfi','-i','anullsrc=r=48000:cl=mono','-t',f'{TAIL}','-ar','48000','-ac','1',sil])
    parts += [f'{PVID}/vo{i}.wav', sil]
concat_list = f'{PVID}/voconcat.txt'
open(concat_list,'w').write('\n'.join(f"file '{p}'" for p in parts))
voice = f'{PVID}/voice.wav'
run(['ffmpeg','-y','-f','concat','-safe','0','-i',concat_list,'-c','copy',voice])

# 3) clips vidéo par segment (image cover 1920x1080 + léger zoom)
clips = []
for i,(img, vo, sub) in enumerate(SEGMENTS):
    src = f'{PVID}/{img}.png'
    clip = f'{PVID}/clip{i}.mp4'
    d = durs[i]
    frames = max(2, int(d*30))
    # cover + zoompan lent (1.0 -> 1.05)
    vf = (f"scale={W*2}:-1:force_original_aspect_ratio=increase,crop={W*2}:{H*2},"
          f"zoompan=z='min(zoom+0.0006,1.05)':d={frames}:s={W}x{H}:fps=30,format=yuv420p")
    run(['ffmpeg','-y','-loop','1','-i',src,'-t',f'{d:.3f}','-vf',vf,'-r','30',
         '-c:v','libx264','-pix_fmt','yuv420p',clip])
    clips.append(clip)
vlist = f'{PVID}/vlist.txt'
open(vlist,'w').write('\n'.join(f"file '{c}'" for c in clips))
silent = f'{PVID}/silent.mp4'
run(['ffmpeg','-y','-f','concat','-safe','0','-i',vlist,'-c','copy',silent])

# 4) sous-titres .ass (charte : blanc, ombre, bas)
def ts(t):
    h=int(t//3600); m=int((t%3600)//60); s=t%60
    return f'{h}:{m:02d}:{s:05.2f}'
ass = f'{PVID}/subs.ass'
header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Def,DejaVu Sans,46,&H00FFFFFF,&H00141B0D,&H64000000,1,1,3,2,2,120,120,80,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
lines=[]; t=0.0
for i,d in enumerate(durs):
    sub = SEGMENTS[i][2]
    lines.append(f"Dialogue: 0,{ts(t)},{ts(t+d)},Def,,0,0,0,,{sub}")
    t += d
open(ass,'w').write(header+'\n'.join(lines)+'\n')

# 5) audio final : voix + musique duckée (sidechain), loudnorm -14
af = (f"[0:a]aformat=channel_layouts=stereo,asplit=2[v1][v2];"
      f"[1:a]volume=0.22,aloop=loop=-1:size=2e9,atrim=0:{TOTAL},aformat=channel_layouts=stereo[m];"
      f"[m][v2]sidechaincompress=threshold=0.03:ratio=10:attack=5:release=300[mduck];"
      f"[v1][mduck]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]")
mixed = f'{PVID}/mixed.wav'
run(['ffmpeg','-y','-i',voice,'-i',MUSIC,'-filter_complex',af,'-map','[out]',mixed])

# 6) mux final : vidéo + sous-titres incrustés + audio, fade in/out doux
run(['ffmpeg','-y','-i',silent,'-i',mixed,
     '-vf',f"subtitles={ass},fade=t=in:st=0:d=0.4,fade=t=out:st={TOTAL-0.5:.2f}:d=0.5",
     '-map','0:v','-map','1:a','-c:v','libx264','-crf','19','-preset','medium','-pix_fmt','yuv420p',
     '-c:a','aac','-b:a','192k','-shortest',OUT])
sz = os.path.getsize(OUT)//1024
print(f'\n✅ {OUT}  ({TOTAL:.0f}s, {sz} Ko)')
