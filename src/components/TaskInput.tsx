"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from "react";

interface Props {
  onSubmit: (rawInput: string) => Promise<void> | void;
  disabled?: boolean;
}

type RecState = "idle" | "recording" | "transcribing";

const MAX_RECORD_SECONDS = 120;
const MIN_RECORD_MS = 300;
const AUDIO_BITS_PER_SECOND = 128_000;

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

// Більш «чистий» аудіопотік для Whisper: моно, 48 kHz, з вбудованою
// шумоочисткою і AGC. На мобільних дефолти браузера часто гірші.
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48_000,
};

function pickAudioMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const m of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return undefined;
}

let cachedVoiceSupport: boolean | null = null;
function detectVoiceSupport(): boolean {
  if (cachedVoiceSupport !== null) return cachedVoiceSupport;
  if (typeof window === "undefined") return false;
  cachedVoiceSupport =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined" &&
    pickAudioMime() !== undefined;
  return cachedVoiceSupport;
}

const noopSubscribe = () => () => {};

function extForMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function TaskInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recState, setRecState] = useState<RecState>("idle");
  const [recError, setRecError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const voiceSupported = useSyncExternalStore(
    noopSubscribe,
    detectVoiceSupport,
    () => false
  );

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const mimeRef = useRef<string | undefined>(undefined);
  const stoppedManuallyRef = useRef<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = submitting || disabled;
  const recording = recState === "recording";
  const transcribing = recState === "transcribing";

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const r = recorderRef.current;
      if (r && r.state !== "inactive") {
        try {
          r.stop();
        } catch {}
      }
      recorderRef.current = null;
      chunksRef.current = [];
    };
  }, []);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isBusy || recording || transcribing) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  }

  async function startRecording() {
    if (recState !== "idle" || isBusy) return;
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
      });
      const mime = pickAudioMime();
      mimeRef.current = mime;
      const recorder = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      stoppedManuallyRef.current = false;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onerror = (ev) => {
        console.error("[recorder.onerror]", ev);
        setRecError("Помилка запису");
        teardownStream();
        setRecState("idle");
        setSeconds(0);
      };
      recorder.onstop = () => {
        const elapsedMs = Date.now() - startedAtRef.current;
        const blobType = mimeRef.current ?? "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        chunksRef.current = [];
        teardownStream();
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const tooShort = elapsedMs < MIN_RECORD_MS;
        if (tooShort || blob.size === 0) {
          setRecState("idle");
          setSeconds(0);
          if (tooShort && stoppedManuallyRef.current) {
            setRecError("Запис надто короткий — потримай довше");
          }
          return;
        }
        void uploadAndTranscribe(blob, blobType);
      };

      startedAtRef.current = Date.now();
      recorder.start();
      setRecState("recording");
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch (err) {
      console.error("[startRecording]", err);
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setRecError("Дозвіл на мікрофон не надано");
      } else if (name === "NotFoundError") {
        setRecError("Мікрофон не знайдено");
      } else {
        setRecError("Не вдалося отримати доступ до мікрофона");
      }
      teardownStream();
      setRecState("idle");
      setSeconds(0);
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    stoppedManuallyRef.current = true;
    try {
      recorder.stop();
    } catch (err) {
      console.error("[stopRecording]", err);
      teardownStream();
      setRecState("idle");
      setSeconds(0);
    }
  }

  function teardownStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }

  async function uploadAndTranscribe(blob: Blob, mime: string) {
    setRecState("transcribing");
    try {
      const ext = extForMime(mime);
      const fd = new FormData();
      fd.append("audio", new File([blob], `voice.${ext}`, { type: mime }));
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Не вдалося розпізнати голос");
      }
      const data = (await res.json()) as { text?: string };
      const text = (data.text ?? "").trim();
      if (text) {
        setValue((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
        requestAnimationFrame(() => textareaRef.current?.focus());
      } else {
        setRecError("Нічого не розпізнано — спробуй ще раз");
      }
    } catch (err) {
      setRecError(
        err instanceof Error ? err.message : "Помилка транскрипції"
      );
    } finally {
      setRecState("idle");
      setSeconds(0);
    }
  }

  const submitDisabled =
    isBusy || recording || transcribing || value.trim().length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)] transition focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_15%,transparent)]"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder='Що треба зробити? Напр. "завтра написати Славі про відео до обіду, терміново"'
        disabled={isBusy}
        className="block w-full resize-none bg-transparent px-1 py-1 text-base leading-relaxed text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted)] disabled:opacity-60"
      />
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-2.5">
          {voiceSupported && (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={isBusy || transcribing}
              aria-label={recording ? "Зупинити запис" : "Записати голосом"}
              aria-pressed={recording}
              title={recording ? "Зупинити запис" : "Записати голосом"}
              className={
                recording
                  ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-priority-high-soft)] text-[var(--color-danger)] shadow-inner ring-2 ring-[color-mix(in_oklab,var(--color-danger)_35%,transparent)] transition"
                  : transcribing
                  ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]"
                  : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground-muted)] shadow-[var(--shadow-soft)] transition hover:border-[var(--color-border-strong)] hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {recording ? (
                <StopIcon />
              ) : transcribing ? (
                <Spinner />
              ) : (
                <MicIcon />
              )}
            </button>
          )}

          {recording ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-[var(--color-danger)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-danger)]" />
              Запис · {formatTime(seconds)}
            </span>
          ) : transcribing ? (
            <span className="text-xs font-medium text-[var(--color-foreground-muted)]">
              Розпізнаю…
            </span>
          ) : recError ? (
            <span className="truncate text-xs font-medium text-[var(--color-danger)]">
              {recError}
            </span>
          ) : (
            <>
              <span className="hidden items-center gap-1.5 text-xs text-[var(--color-muted)] sm:flex">
                <span>Швидко додати</span>
                <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-foreground-muted)]">
                  ⌘
                </kbd>
                <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-foreground-muted)]">
                  Enter
                </kbd>
              </span>
              <span className="text-xs text-[var(--color-muted)] sm:hidden">
                AI розбере все сам
              </span>
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={submitDisabled}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-pressed)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {submitting ? (
            <>
              <Spinner />
              Розбираю…
            </>
          ) : (
            <>
              Додати
              <ArrowRight />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="spinner h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden
    >
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
