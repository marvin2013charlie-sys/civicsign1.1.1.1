package uk.co.civicsign.scan

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Bundle
import android.util.Base64
import com.facebook.react.bridge.*
import net.sf.scuba.smartcards.CardService
import org.jmrtd.BACKey
import org.jmrtd.PassportService
import org.jmrtd.lds.icao.DG1File
import org.jmrtd.lds.SODFile

/**
 * Reads a passport chip over NFC and hands the raw material to JavaScript.
 *
 * It deliberately makes no judgement about authenticity: the security object
 * and data page go to CivicSign, which runs passive authentication on the
 * server. A tampered app therefore cannot claim a chip was genuine.
 */
class PassportModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    override fun getName() = "CivicSignPassport"

    @ReactMethod
    fun isAvailable(promise: Promise) {
        val adapter = NfcAdapter.getDefaultAdapter(context)
        promise.resolve(adapter != null && adapter.isEnabled)
    }

    /**
     * Wait for a passport and read it. The access key comes from the machine
     * readable zone, which is why the signer photographs the page first.
     */
    @ReactMethod
    fun read(documentNumber: String, dateOfBirth: String, dateOfExpiry: String, promise: Promise) {
        val activity: Activity = currentActivity
            ?: return promise.reject("no_activity", "The app is not in the foreground")
        val adapter = NfcAdapter.getDefaultAdapter(context)
            ?: return promise.reject("no_nfc", "This phone has no NFC reader")
        if (!adapter.isEnabled) {
            return promise.reject("nfc_off", "Turn on NFC in your phone's settings")
        }

        val settled = java.util.concurrent.atomic.AtomicBoolean(false)

        val callback = NfcAdapter.ReaderCallback { tag: Tag ->
            if (!settled.compareAndSet(false, true)) return@ReaderCallback
            try {
                adapter.disableReaderMode(activity)
                promise.resolve(readTag(tag, documentNumber, dateOfBirth, dateOfExpiry))
            } catch (e: Exception) {
                promise.reject("read_failed", friendlyMessage(e), e)
            }
        }

        // Presence checks are slow for passports, hence the longer delay.
        val options = Bundle().apply { putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, 1000) }
        adapter.enableReaderMode(
            activity,
            callback,
            NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or
                NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            options,
        )
    }

    @ReactMethod
    fun cancel(promise: Promise) {
        currentActivity?.let { NfcAdapter.getDefaultAdapter(context)?.disableReaderMode(it) }
        promise.resolve(true)
    }

    private fun readTag(
        tag: Tag,
        documentNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
    ): WritableMap {
        val isoDep = IsoDep.get(tag)
            ?: throw IllegalStateException("That is not a passport chip")
        isoDep.timeout = 20_000

        val service = PassportService(
            CardService.getInstance(isoDep),
            PassportService.NORMAL_MAX_TRANCEIVE_LENGTH,
            PassportService.DEFAULT_MAX_BLOCKSIZE,
            false,
            false,
        )
        service.open()
        service.sendSelectApplet(false)

        // Basic Access Control: the key is derived from the printed page.
        service.doBAC(BACKey(documentNumber, dateOfBirth, dateOfExpiry))

        val dg1 = service.getInputStream(PassportService.EF_DG1).use { DG1File(it) }
        val sod = service.getInputStream(PassportService.EF_SOD).use { SODFile(it) }
        service.close()

        return Arguments.createMap().apply {
            putString("dg1", Base64.encodeToString(dg1.encoded, Base64.NO_WRAP))
            putString("sod", Base64.encodeToString(sod.encoded, Base64.NO_WRAP))
        }
    }

    private fun friendlyMessage(e: Exception): String {
        val text = e.message ?: ""
        return when {
            text.contains("6982") || text.contains("authentication", true) ->
                "The chip refused the details from the photo page — check them and try again"
            text.contains("tag was lost", true) ->
                "Keep the phone still on the passport until the read finishes"
            else -> "Could not read the chip: $text"
        }
    }
}
