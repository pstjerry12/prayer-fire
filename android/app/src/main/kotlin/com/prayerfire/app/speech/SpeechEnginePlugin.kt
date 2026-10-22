package com.prayerfire.app.speech

import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.Locale

/**
 * Read-aloud for the app, using Android's own TextToSpeech.
 *
 * The web speech API (window.speechSynthesis) is unreliable inside a WebView —
 * often there are no voices or speak() is silently ignored — which is why
 * "Read aloud" did nothing in the app. The web layer (src/lib/readAloud.ts)
 * calls this plugin first and only falls back to the browser engine when the
 * plugin isn't present (older installs).
 *
 * speakQueue() reads a list of items (one verse each) and tells the web layer
 * which one has started through a "verseStart" event, so the reader can highlight
 * and scroll to the verse being read. Both speak() and speakQueue() resolve when
 * everything has been read (or { stopped: true } if it was interrupted).
 * warmUp() starts the engine early so the first read has no delay.
 */
@CapacitorPlugin(name = "SpeechEngine")
class SpeechEnginePlugin : Plugin() {

    private var tts: TextToSpeech? = null
    private var ready = false
    private var initializing = false
    private val waiting = mutableListOf<(Boolean) -> Unit>()

    private var activeCall: PluginCall? = null
    private var lastUtteranceId: String? = null
    private var session = 0

    @PluginMethod
    fun speak(call: PluginCall) {
        val text = call.getString("text")?.trim().orEmpty()
        if (text.isEmpty()) {
            call.resolve()
            return
        }
        val rate = call.getFloat("rate", 0.9f) ?: 0.9f
        val pitch = call.getFloat("pitch", 1f) ?: 1f
        val lang = call.getString("lang") ?: "en"

        ensureEngine { ok ->
            if (!ok) {
                call.reject("Text-to-speech is not available on this device")
            } else {
                startSpeaking(call, text, rate, pitch, lang)
            }
        }
    }

    @PluginMethod
    fun speakQueue(call: PluginCall) {
        val array: JSArray? = call.getArray("items")
        val texts = mutableListOf<String>()
        if (array != null) {
            for (i in 0 until array.length()) {
                val t = array.optString(i, "").trim()
                if (t.isNotEmpty()) texts.add(t)
            }
        }
        if (texts.isEmpty()) {
            call.resolve()
            return
        }
        val rate = call.getFloat("rate", 0.9f) ?: 0.9f
        val pitch = call.getFloat("pitch", 1f) ?: 1f
        val lang = call.getString("lang") ?: "en"
        val hints = mutableListOf<String>()
        call.getArray("voiceHints")?.let { arr ->
            for (i in 0 until arr.length()) hints.add(arr.optString(i, ""))
        }

        ensureEngine { ok ->
            if (!ok) {
                call.reject("Text-to-speech is not available on this device")
            } else {
                startQueue(call, texts, rate, pitch, lang, hints)
            }
        }
    }

    /** Wakes the engine ahead of time so the first "Read aloud" starts instantly. */
    @PluginMethod
    fun warmUp(call: PluginCall) {
        ensureEngine { ok ->
            if (ok) call.resolve() else call.reject("Text-to-speech is not available on this device")
        }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        synchronized(this) {
            session++
            try {
                tts?.stop()
            } catch (e: Exception) {
                // engine already gone
            }
            finishActive(stopped = true)
        }
        call.resolve()
    }

    private fun ensureEngine(onReady: (Boolean) -> Unit) {
        synchronized(this) {
            if (ready) {
                onReady(true)
                return
            }
            waiting.add(onReady)
            if (initializing) return
            initializing = true
        }
        activity.runOnUiThread {
            tts = TextToSpeech(context.applicationContext) { status ->
                val ok = status == TextToSpeech.SUCCESS
                val callbacks: List<(Boolean) -> Unit>
                synchronized(this) {
                    ready = ok
                    initializing = false
                    callbacks = waiting.toList()
                    waiting.clear()
                }
                if (ok) {
                    tts?.setOnUtteranceProgressListener(progressListener)
                } else {
                    try {
                        tts?.shutdown()
                    } catch (e: Exception) {
                        // ignore
                    }
                    tts = null
                }
                callbacks.forEach { it(ok) }
            }
        }
    }

    private val progressListener = object : UtteranceProgressListener() {
        override fun onStart(utteranceId: String?) {
            // ids look like "pf-<session>-<index>": tell the web layer which item began
            val index = utteranceId?.substringAfterLast('-')?.toIntOrNull() ?: return
            val data = JSObject()
            data.put("index", index)
            this@SpeechEnginePlugin.notifyListeners("verseStart", data)
        }

        override fun onDone(utteranceId: String?) {
            synchronized(this@SpeechEnginePlugin) {
                if (utteranceId != null && utteranceId == lastUtteranceId) finishActive(stopped = false)
            }
        }

        @Deprecated("Deprecated in Java")
        override fun onError(utteranceId: String?) {
            failActive("Text-to-speech failed")
        }

        override fun onError(utteranceId: String?, errorCode: Int) {
            failActive("Text-to-speech failed (code $errorCode)")
        }
    }

    @Synchronized
    private fun startSpeaking(call: PluginCall, text: String, rate: Float, pitch: Float, lang: String) {
        val engine = tts
        if (engine == null) {
            call.reject("Text-to-speech is not available on this device")
            return
        }
        // Anything still reading is replaced by this request.
        finishActive(stopped = true)
        session++
        val mySession = session

        val availability = engine.setLanguage(localeFor(lang))
        if (availability == TextToSpeech.LANG_MISSING_DATA || availability == TextToSpeech.LANG_NOT_SUPPORTED) {
            // Voice data for that language isn't installed — read it in the default English voice.
            engine.setLanguage(Locale.US)
        }
        engine.setSpeechRate(rate)
        engine.setPitch(pitch)

        val maxLen = (TextToSpeech.getMaxSpeechInputLength() - 100).coerceIn(200, 3500)
        val chunks = splitText(text, maxLen)
        activeCall = call
        lastUtteranceId = "pf-$mySession-${chunks.size - 1}"

        chunks.forEachIndexed { index, chunk ->
            val mode = if (index == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
            val result = engine.speak(chunk, mode, null, "pf-$mySession-$index")
            if (result == TextToSpeech.ERROR) {
                failActive("Text-to-speech could not start")
                return
            }
        }
    }

    @Synchronized
    private fun startQueue(call: PluginCall, texts: List<String>, rate: Float, pitch: Float, lang: String, hints: List<String>) {
        val engine = tts
        if (engine == null) {
            call.reject("Text-to-speech is not available on this device")
            return
        }
        finishActive(stopped = true)
        session++
        val mySession = session

        val availability = engine.setLanguage(localeFor(lang))
        if (availability == TextToSpeech.LANG_MISSING_DATA || availability == TextToSpeech.LANG_NOT_SUPPORTED) {
            engine.setLanguage(Locale.US)
        }
        chooseVoice(engine, lang, hints)
        engine.setSpeechRate(rate)
        engine.setPitch(pitch)

        val maxLen = (TextToSpeech.getMaxSpeechInputLength() - 100).coerceIn(200, 3500)
        activeCall = call
        lastUtteranceId = "pf-$mySession-${texts.size - 1}"

        texts.forEachIndexed { index, raw ->
            val text = if (raw.length > maxLen) raw.substring(0, maxLen) else raw
            val mode = if (index == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
            val result = engine.speak(text, mode, null, "pf-$mySession-$index")
            if (result == TextToSpeech.ERROR) {
                failActive("Text-to-speech could not start")
                return
            }
        }
    }

    /** Prefers the first installed voice matching one of the hints (e.g. a male English voice); otherwise keeps the default. */
    private fun chooseVoice(engine: TextToSpeech, lang: String, hints: List<String>) {
        if (hints.isEmpty()) return
        try {
            val voices = engine.voices ?: return
            val wantedLang = localeFor(lang).language
            val usable = voices.filter {
                it.locale.language == wantedLang && !it.features.contains("notInstalled")
            }
            for (hint in hints) {
                if (hint.isBlank()) continue
                val match = usable.firstOrNull { it.name.contains(hint, ignoreCase = true) }
                if (match != null) {
                    engine.voice = match
                    return
                }
            }
        } catch (e: Exception) {
            // some engines don't expose their voices — the default voice is used
        }
    }

    @Synchronized
    private fun finishActive(stopped: Boolean) {
        val call = activeCall ?: return
        activeCall = null
        lastUtteranceId = null
        val result = JSObject()
        result.put("stopped", stopped)
        call.resolve(result)
    }

    @Synchronized
    private fun failActive(message: String) {
        val call = activeCall ?: return
        activeCall = null
        lastUtteranceId = null
        call.reject(message)
    }

    private fun localeFor(lang: String): Locale = when (lang) {
        "es" -> Locale("es", "ES")
        "fr" -> Locale.FRANCE
        "pt" -> Locale("pt", "BR")
        "sw" -> Locale("sw", "TZ")
        else -> Locale.US
    }

    /** Splits on sentence ends so each piece stays under the engine's input limit. */
    private fun splitText(text: String, maxLen: Int): List<String> {
        val clean = text.replace(Regex("\\s+"), " ").trim()
        val sentences = clean.split(Regex("(?<=[.!?;:])\\s+"))
        val chunks = mutableListOf<String>()
        var current = StringBuilder()
        for (sentence in sentences) {
            var piece = sentence
            while (piece.length > maxLen) {
                val cut = piece.lastIndexOf(' ', maxLen).takeIf { it > 0 } ?: maxLen
                if (current.isNotEmpty()) {
                    chunks.add(current.toString())
                    current = StringBuilder()
                }
                chunks.add(piece.substring(0, cut).trim())
                piece = piece.substring(cut).trim()
            }
            if (current.length + piece.length + 1 > maxLen && current.isNotEmpty()) {
                chunks.add(current.toString())
                current = StringBuilder()
            }
            if (current.isNotEmpty()) current.append(' ')
            current.append(piece)
        }
        if (current.isNotEmpty()) chunks.add(current.toString())
        return chunks.filter { it.isNotBlank() }.ifEmpty { listOf(clean) }
    }

    override fun handleOnDestroy() {
        try {
            tts?.stop()
            tts?.shutdown()
        } catch (e: Exception) {
            // ignore
        }
        tts = null
        ready = false
        super.handleOnDestroy()
    }
}
