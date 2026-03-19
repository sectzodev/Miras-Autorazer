const socket = io();

// Sayfa değiştirme
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        // Aktif menüyü güncelle
        document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Sayfayı göster
        const pageId = item.dataset.page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    });
});

// Bot bağlantısı
socket.on('connect', () => {
    console.log('Panele bağlandı');
    addLog('✅ Panelle bağlantı kuruldu');
});

// Bot durumu güncelleme
socket.on('botStatus', (data) => {
    document.getElementById('botStatus').className = `status-indicator ${data.status}`;
    document.getElementById('botStatusText').textContent = data.statusText;
});

// İstatistikler
socket.on('stats', (data) => {
    document.getElementById('uptime').textContent = data.uptime;
    document.getElementById('ping').textContent = data.ping + ' ms';
    document.getElementById('ram').textContent = data.ram + ' MB';
    document.getElementById('guildCount').textContent = data.guilds;
    document.getElementById('memberCount').textContent = data.members;
    document.getElementById('channelCount').textContent = data.channels;
    document.getElementById('voiceCount').textContent = data.voice;
});

// Log ekleme
socket.on('log', (log) => {
    addLog(log);
});

function addLog(message) {
    const logs = document.getElementById('logs');
    const logDiv = document.createElement('div');
    logDiv.className = 'log';
    logDiv.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logs.insertBefore(logDiv, logs.firstChild);
    
    // Log sayısını sınırla
    if (logs.children.length > 50) {
        logs.removeChild(logs.lastChild);
    }
}

// Bot durumu güncelle
function updatePresence() {
    const data = {
        activityType: parseInt(document.getElementById('activityType').value),
        activityText: document.getElementById('activityText').value,
        status: document.getElementById('statusType').value
    };
    
    socket.emit('updatePresence', data);
    addLog('🎮 Bot durumu güncellendi');
}

// Config güncelle
function updateConfig() {
    const data = {
        prefix: document.getElementById('prefix').value,
        loncaTag: document.getElementById('loncaTag').value,
        bannerUrl: document.getElementById('bannerUrl').value
    };
    
    socket.emit('updateConfig', data);
    addLog('⚙️ Genel ayarlar güncellendi');
}

// Kanal ID'lerini güncelle
function updateChannelIds() {
    const data = {
        logKanali: document.getElementById('logKanali').value,
        hosgeldinKanali: document.getElementById('hosgeldinKanali').value,
        ozelOdaKanali: document.getElementById('ozelOdaKanali').value
    };
    
    socket.emit('updateChannels', data);
    addLog('📢 Kanal ID\'leri güncellendi');
}

// Rol ID'lerini güncelle
function updateRoles() {
    const data = {
        yetkiliRolu: document.getElementById('yetkiliRolu').value,
        loncaRolu: document.getElementById('loncaRolu').value,
        guvenliRoller: document.getElementById('guvenliRoller').value.split(',').map(r => r.trim())
    };
    
    socket.emit('updateRoles', data);
    addLog('🔰 Rol ID\'leri güncellendi');
}

// Özel komut ekle
let customCommandCount = 0;
function addCustomCommand() {
    const container = document.getElementById('ozelKomutlar');
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `
        <label>Komut ${customCommandCount + 1}</label>
        <div style="display: flex; gap: 10px;">
            <input type="text" placeholder="Komut adı" style="flex: 1;" id="cmdName${customCommandCount}">
            <input type="text" placeholder="Yanıt" style="flex: 2;" id="cmdResp${customCommandCount}">
            <button onclick="removeCommand(this)" style="background: #ff0000; color: #fff; border: none; padding: 0 15px; border-radius: 5px;">🗑️</button>
        </div>
    `;
    container.appendChild(div);
    customCommandCount++;
}

function removeCommand(btn) {
    btn.parentElement.parentElement.remove();
}

// Mevcut ayarları yükle
socket.on('loadConfig', (config) => {
    document.getElementById('prefix').value = config.prefix || '.';
    document.getElementById('loncaTag').value = config.loncaTag || '1991';
    document.getElementById('bannerUrl').value = config.bannerUrl || '';
    document.getElementById('logKanali').value = config.logKanali || '';
    document.getElementById('hosgeldinKanali').value = config.hosgeldinKanali || '';
    document.getElementById('ozelOdaKanali').value = config.ozelOdaKanali || '';
    document.getElementById('yetkiliRolu').value = config.yetkiliRolu || '';
    document.getElementById('loncaRolu').value = config.loncaRolu || '';
    document.getElementById('guvenliRoller').value = config.guvenliRoller ? config.guvenliRoller.join(', ') : '';
    document.getElementById('kufurFiltre').value = config.kufurFiltre ? 'true' : 'false';
    document.getElementById('reklamFiltre').value = config.reklamFiltre ? 'true' : 'false';
});
