const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Wajib install: npm install axios
const https = require('https'); // Bawaan nodejs, tidak perlu install

const app = express();
app.use(cors());

// ==========================================
// 1. AREA DUMMY DATA (DATA PALSU)
// ==========================================
// Kamu bisa edit-edit angka di sini sesuka hati untuk tes tampilan
const DUMMY_DATA = {
    total_alert_today: 50, // Coba ganti angkanya biar beda
    top_alerts: [
        { name: "SSH Brute Force (Mode Dummy)", count: 20 },
        { name: "SQL Injection (Mode Dummy)", count: 15 },
        { name: "Malware Detected (Mode Dummy)", count: 5 },
        { name: "Port Scanning (Mode Dummy)", count: 10 }
    ]
};

// ==========================================
// 2. KONFIGURASI WAZUH (DATA ASLI)
// ==========================================
// Nanti diisi kalau Tim 2 sudah kasih IP
const WAZUH_CONFIG = {
    url: "https://192.168.10.XXX:55000", //  IP Wazuh 
    user: "wazuh",                        //  user 
    pass: "wazuh"                         //  password 
};

// Agent untuk menembus SSL (Wajib di Lab)
const agent = new https.Agent({  
  rejectUnauthorized: false
});

// Fungsi Login Wazuh
async function getWazuhToken() {
    try {
        const res = await axios.post(`${WAZUH_CONFIG.url}/security/user/authenticate`, {}, {
            auth: { username: WAZUH_CONFIG.user, password: WAZUH_CONFIG.pass },
            httpsAgent: agent,
            timeout: 2000 // Kalau 2 detik gak respon, anggap gagal
        });
        return res.data.data.token;
    } catch (err) {
        return null; // Login gagal
    }
}

// ==========================================
// 3. ENDPOINT UTAMA (OTAKNYA)
// ==========================================
app.get('/alerts', async (req, res) => {
    console.log("Menerima request dari Frontend...");

    try {
        // --- COBA AMBIL DATA ASLI ---
        const token = await getWazuhToken();
        
        if (!token) {
            throw new Error("Gagal connect ke Wazuh (VPN Mati/IP Salah)");
        }

        // Kalau token dapat, ambil data alert beneran
        const response = await axios.get(`${WAZUH_CONFIG.url}/analysis/security_events`, {
            headers: { 'Authorization': `Bearer ${token}` },
            httpsAgent: agent,
            params: { limit: 5 }
        });

        // Format data asli biar sama strukturnya dengan dummy
        const realData = {
            total_alert_today: response.data.data.total_affected_items, 
            top_alerts: response.data.data.items.map(item => ({
                name: item.rule.description,
                count: 1 
            }))
        };
        
        console.log("✅ SUKSES: Mengirim Data REAL dari Wazuh");
        res.json(realData);

    } catch (error) {
        // --- JIKA GAGAL, PAKAI DUMMY ---
        console.log("❌ GAGAL CONNECT. Mengirim DUMMY DATA.");
        console.log("Penyebab:", error.message);
        
        // Di sinilah DUMMY_DATA kamu dipanggil!
        res.json(DUMMY_DATA); 
    }
});

app.listen(3000, () => {
    console.log("Server Integrator siap di port 3000");
    console.log("Mode: HYBRID (Otomatis switch Dummy/Real)");
});