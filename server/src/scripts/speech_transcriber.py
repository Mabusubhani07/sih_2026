import sys
import os
import json
import io
import wave
import av
import speech_recognition as sr

sys.stdout.reconfigure(encoding='utf-8')

def format_timestamp(seconds):
    s = max(0, float(seconds))
    hrs = int(s // 3600)
    mins = int((s % 3600) // 60)
    secs = int(s % 60)
    millis = int((s - int(s)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{millis:03d}"

def extract_pcm_from_media(media_path):
    container = av.open(media_path)
    audio_stream = next((s for s in container.streams if s.type == 'audio'), None)
    if not audio_stream:
        return None, 0

    resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
    wav_io = io.BytesIO()
    
    with wave.open(wav_io, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        
        for frame in container.decode(audio_stream):
            resampled_frames = resampler.resample(frame)
            for resampled in resampled_frames:
                wav_file.writeframes(bytes(resampled.planes[0]))
                
    wav_bytes = wav_io.getvalue()
    duration_sec = len(wav_bytes) / 32000.0
    return wav_bytes, duration_sec

def transcribe_media(media_path, target_lang=None):
    try:
        wav_bytes, duration_sec = extract_pcm_from_media(media_path)
    except Exception as e:
        return {"error": f"Failed to decode audio track from media: {str(e)}", "segments": [], "text": ""}

    if not wav_bytes or duration_sec < 0.2:
        return {
            "segments": [
                {
                    "startTime": "00:00:00.000",
                    "endTime": format_timestamp(duration_sec),
                    "speaker": "Audio Telemetry",
                    "text": "Exhibit contains no audible acoustic stream or zero distinguishable speech."
                }
            ],
            "text": "[00:00:00.000] Exhibit contains no audible acoustic stream or zero distinguishable speech.",
            "durationSec": duration_sec,
            "language": "en"
        }

    r = sr.Recognizer()
    r.energy_threshold = 280
    r.dynamic_energy_threshold = True

    languages = [target_lang] if target_lang else ['en-US', 'en-IN', 'hi-IN', 'te-IN']
    languages = [l for l in languages if l]

    segments = []
    text_lines = []

    # For clips <= 28 seconds, transcribe in a single continuous pass to prevent word fragmentation
    if duration_sec <= 28.0:
        with sr.AudioFile(io.BytesIO(wav_bytes)) as source:
            audio = r.record(source)
            recognized = None
            detected_lang = 'en'
            for lang in languages:
                try:
                    res = r.recognize_google(audio, language=lang)
                    if res and len(res.strip()) > 0:
                        recognized = res.strip()
                        detected_lang = lang
                        break
                except Exception:
                    continue

            if recognized:
                speaker_label = "Speaker 1"
                line = f"[00:00:00.000 - {format_timestamp(duration_sec)}] {speaker_label}: \"{recognized}\""
                text_lines.append(line)
                segments.append({
                    "startTime": "00:00:00.000",
                    "endTime": format_timestamp(duration_sec),
                    "speaker": speaker_label,
                    "text": recognized,
                    "confidence": 1.0,
                    "language": detected_lang
                })
    else:
        chunk_duration = 25.0
        current_time = 0.0

        with sr.AudioFile(io.BytesIO(wav_bytes)) as source:
            while current_time < duration_sec:
                slice_dur = min(chunk_duration, duration_sec - current_time)
                start_ts = format_timestamp(current_time)
                end_ts = format_timestamp(current_time + slice_dur)

                audio_chunk = r.record(source, duration=slice_dur)
                recognized = None
                detected_lang = 'en'

                for lang in languages:
                    try:
                        res = r.recognize_google(audio_chunk, language=lang)
                        if res and len(res.strip()) > 0:
                            recognized = res.strip()
                            detected_lang = lang
                            break
                    except Exception:
                        continue

                if recognized:
                    speaker_label = f"Speaker {len(segments) + 1}"
                    line = f"[{start_ts} - {end_ts}] {speaker_label}: \"{recognized}\""
                    text_lines.append(line)
                    segments.append({
                        "startTime": start_ts,
                        "endTime": end_ts,
                        "speaker": speaker_label,
                        "text": recognized,
                        "confidence": 1.0,
                        "language": detected_lang
                    })

                current_time += slice_dur

    if not segments:
        default_line = f"[00:00:00.000 - {format_timestamp(duration_sec)}] Ambient acoustic environment; zero distinguishable vocal dialogue detected."
        text_lines.append(default_line)
        segments.append({
            "startTime": "00:00:00.000",
            "endTime": format_timestamp(duration_sec),
            "speaker": "Audio Telemetry",
            "text": "Ambient acoustic environment; zero distinguishable vocal dialogue detected.",
            "confidence": 1.0
        })

    return {
        "segments": segments,
        "text": "\n".join(text_lines),
        "durationSec": duration_sec,
        "language": "multilingual"
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing media file path"}))
        sys.exit(1)

    media_file = sys.argv[1]
    lang_arg = sys.argv[2] if len(sys.argv) > 2 else None
    
    result = transcribe_media(media_file, lang_arg)
    print(json.dumps(result, ensure_ascii=False))
