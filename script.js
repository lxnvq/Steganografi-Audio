// ================================
// ENCODE
// Menyembunyikan pesan ke audio
// ================================

async function encodeMessage() {

    const file = document.getElementById("audioInput").files[0];
    const message = document.getElementById("message").value;
    const status = document.getElementById("encodeStatus");

    if (!file) {
        status.textContent = "Pilih file audio WAV terlebih dahulu.";
        return;
    }

    if (message === "") {
        status.textContent = "Masukkan pesan terlebih dahulu.";
        return;
    }

    try {

        // Membaca file audio
        const buffer = await file.arrayBuffer();

        // Membuat salinan data audio
        const data = new Uint8Array(buffer.slice(0));

        // Mengubah pesan menjadi byte
        const messageBytes = new TextEncoder().encode(message);

        // Penanda awal pesan
        const header = new TextEncoder().encode("STEG");

        // Menyimpan panjang pesan dalam 4 byte
        const length = messageBytes.length;

        const lengthBytes = new Uint8Array(4);

        lengthBytes[0] = (length >> 24) & 255;
        lengthBytes[1] = (length >> 16) & 255;
        lengthBytes[2] = (length >> 8) & 255;
        lengthBytes[3] = length & 255;

        // Menggabungkan:
        // STEG + panjang pesan + pesan
        const secretData = new Uint8Array(
            header.length + 4 + messageBytes.length
        );

        secretData.set(header, 0);
        secretData.set(lengthBytes, header.length);
        secretData.set(messageBytes, header.length + 4);

        // Mengubah data menjadi bit
        const bits = [];

        for (let byte of secretData) {

            for (let i = 7; i >= 0; i--) {

                const bit = (byte >> i) & 1;

                bits.push(bit);
            }
        }

        /*
         * Setiap 1 byte audio digunakan
         * untuk menyimpan 1 bit pesan.
         *
         * Bit terakhir (LSB) diubah
         * sesuai dengan bit pesan.
         */

        const start = 44;

        if (bits.length > data.length - start) {
            status.textContent = "Pesan terlalu panjang untuk audio ini.";
            return;
        }

        for (let i = 0; i < bits.length; i++) {

            const position = start + i;

            // Mengubah LSB
            data[position] =
                (data[position] & 254) | bits[i];
        }

        // Membuat file audio baru
        const blob = new Blob([data], {
            type: "audio/wav"
        });

        // Membuat link download
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "audio_tersembunyi.wav";

        link.textContent = "Download Audio Hasil Steganografi";

        link.style.display = "block";
        link.style.marginTop = "15px";

        status.innerHTML = "";
        status.appendChild(link);

    } catch (error) {

        status.textContent =
            "Terjadi kesalahan saat memproses audio.";
    }
}


// ================================
// DECODE
// Mengambil pesan dari audio
// ================================

async function decodeMessage() {

    const file =
        document.getElementById("encodedAudio").files[0];

    const output =
        document.getElementById("decodedMessage");

    const status =
        document.getElementById("decodeStatus");

    if (!file) {

        status.textContent =
            "Pilih audio terlebih dahulu.";

        return;
    }

    try {

        // Membaca audio
        const buffer = await file.arrayBuffer();

        const data = new Uint8Array(buffer);

        const start = 44;

        // Menyimpan bit yang ditemukan
        const bits = [];

        /*
         * Membaca LSB dari setiap byte audio
         */

        for (let i = start; i < data.length; i++) {

            const bit = data[i] & 1;

            bits.push(bit);
        }

        // Mengubah bit menjadi byte
        const bytes = [];

        for (let i = 0; i + 7 < bits.length; i += 8) {

            let byte = 0;

            for (let j = 0; j < 8; j++) {

                byte =
                    (byte << 1) | bits[i + j];
            }

            bytes.push(byte);
        }

        const result = new Uint8Array(bytes);

        // Membaca header "STEG"
        const header = new TextDecoder().decode(
            result.slice(0, 4)
        );

        if (header !== "STEG") {

            status.textContent =
                "Tidak ditemukan pesan tersembunyi.";

            output.value = "";

            return;
        }

        // Membaca panjang pesan
        const length =
            (result[4] << 24) |
            (result[5] << 16) |
            (result[6] << 8) |
            result[7];

        // Mengambil pesan
        const messageBytes =
            result.slice(8, 8 + length);

        const message =
            new TextDecoder().decode(messageBytes);

        output.value = message;

        status.textContent =
            "Pesan berhasil ditemukan!";

    } catch (error) {

        status.textContent =
            "Terjadi kesalahan saat membaca audio.";

        output.value = "";
    }
}