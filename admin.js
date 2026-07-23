// ===================================
// Admin Panel - لوحة التحكم
// ===================================

// البيانات الافتراضية
const defaultSettings = {
    password: 'admin123',
    companyName: 'نَتْبَع',
    contact: {
        hotline: '16000',
        whatsapp: '201001234567',
        email: 'support@netba2.com',
        address: 'القاهرة، مصر'
    }
};

// تحميل الإعدادات
function loadSettings() {
    const saved = localStorage.getItem('netba2_admin_settings');
    return saved ? JSON.parse(saved) : defaultSettings;
}

// حفظ الإعدادات
function saveSettings(settings) {
    localStorage.setItem('netba2_admin_settings', JSON.stringify(settings));
}

// ===================================
// تسجيل الدخول
// ===================================
document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    const settings = loadSettings();

    if (password === settings.password) {
        sessionStorage.setItem('netba2_admin_logged', 'true');
        showDashboard();
        showToast('success', 'تم تسجيل الدخول بنجاح');
    } else {
        showToast('error', 'كلمة المرور غير صحيحة');
    }
});

// ===================================
// تبديل كلمة المرور
// ===================================
function togglePassword() {
    const input = document.getElementById('adminPassword');
    const icon = document.querySelector('.eye-icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        `;
    } else {
        input.type = 'password';
        icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        `;
    }
}

// ===================================
// إظهار لوحة التحكم
// ===================================
function showDashboard() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    
    loadContactForm();
    loadBuses();
    loadStats();
    loadRequests();
    loadContactMessages();
    
    // تحديث الإحصائيات
    updateStats();
}

// تحديث الإحصائيات
function updateStats() {
    const buses = getBuses();
    const trips = JSON.parse(localStorage.getItem('netba2_trips') || '[]');
    const history = JSON.parse(localStorage.getItem('netba2_history') || '[]');
    const sos = JSON.parse(localStorage.getItem('netba2_sos') || '[]');
    const messages = JSON.parse(localStorage.getItem('netba2_contact_messages') || '[]');
    
    document.getElementById('totalUsers').textContent = history.length + 5;
    document.getElementById('totalBuses').textContent = buses.length;
    document.getElementById('totalTrips').textContent = trips.length;
    document.getElementById('totalSOS').textContent = sos.length + messages.length;
}

// ===================================
// تسجيل الخروج
// ===================================
function logout() {
    sessionStorage.removeItem('netba2_admin_logged');
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminPassword').value = '';
    showToast('info', 'تم تسجيل الخروج');
}

// ===================================
// التنقل بين التبويبات
// ===================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        
        // تحميل البيانات المناسبة
        if (tabId === 'requests') {
            loadRequests();
            loadContactMessages();
        }
    });
});

// التنقل بين الطلبات والرسائل
document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const subtab = btn.dataset.subtab;
        
        document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const requestsList = document.getElementById('requestsList');
        const messagesList = document.getElementById('messagesList');
        const filters = document.getElementById('requestsFilters');
        
        if (subtab === 'requests') {
            requestsList.style.display = 'flex';
            messagesList.style.display = 'none';
            filters.style.display = 'flex';
        } else {
            requestsList.style.display = 'none';
            messagesList.style.display = 'block';
            filters.style.display = 'none';
            loadContactMessages();
            updateStats(); // تحديث الإحصائيات
        }
    });
});

// ===================================
// بيانات التواصل
// ===================================
function loadContactForm() {
    const settings = loadSettings();
    document.getElementById('hotline').value = settings.contact.hotline;
    document.getElementById('whatsapp').value = settings.contact.whatsapp;
    document.getElementById('email').value = settings.contact.email;
    document.getElementById('address').value = settings.contact.address;
}

document.getElementById('contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const settings = loadSettings();
    settings.contact = {
        hotline: document.getElementById('hotline').value,
        whatsapp: document.getElementById('whatsapp').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value
    };
    
    saveSettings(settings);
    
    // حفظ في مفتاح منفصل للتطبيق الرئيسي
    localStorage.setItem('netba2_contact', JSON.stringify(settings.contact));
    
    showToast('success', '✅ تم حفظ بيانات التواصل وتحديث الموقع بنجاح!');
});

// ===================================
// إدارة الحافلات
// ===================================
function getBuses() {
    const saved = localStorage.getItem('netba2_buses');
    if (saved) return JSON.parse(saved);
    
    // الحافلة الافتراضية
    return [{
        id: 1,
        number: '127',
        driver: 'أحمد محمد',
        phone: '01012345678',
        seats: 12,
        status: 'available'
    }];
}

function saveBuses(buses) {
    localStorage.setItem('netba2_buses', JSON.stringify(buses));
}

function loadBuses() {
    const buses = getBuses();
    const container = document.getElementById('busesList');
    
    container.innerHTML = buses.map(bus => `
        <div class="bus-card" data-id="${bus.id}">
            <div class="bus-card-header">
                <div class="bus-card-title">
                    <div class="bus-icon-wrapper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 6v6M16 6v6M2 12h20M6 18h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <div>
                        <h4>حافلة رقم ${bus.number}</h4>
                        <span>${bus.seats} مقاعد</span>
                    </div>
                </div>
                <span class="bus-status-badge ${bus.status}">${getStatusText(bus.status)}</span>
            </div>
            <div class="bus-card-info">
                <div class="bus-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>السائق: ${bus.driver}</span>
                </div>
                <div class="bus-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72"/>
                    </svg>
                    <span>${bus.phone || 'غير محدد'}</span>
                </div>
            </div>
            <div class="bus-card-actions">
                <button class="bus-action-btn edit" onclick="editBus(${bus.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    تعديل
                </button>
                <button class="bus-action-btn delete" onclick="deleteBus(${bus.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                    حذف
                </button>
            </div>
        </div>
    `).join('');
}

function getStatusText(status) {
    const texts = {
        available: 'متاحة',
        onway: 'في الطريق',
        busy: 'مشغولة',
        maintenance: 'صيانة'
    };
    return texts[status] || status;
}

function showAddBusModal() {
    document.getElementById('busModalTitle').textContent = 'إضافة حافلة جديدة';
    document.getElementById('busForm').reset();
    document.getElementById('busId').value = '';
    document.getElementById('busSeats').value = '12';
    document.getElementById('busModal').classList.add('active');
}

function editBus(id) {
    const buses = getBuses();
    const bus = buses.find(b => b.id === id);
    
    if (bus) {
        document.getElementById('busModalTitle').textContent = 'تعديل الحافلة';
        document.getElementById('busId').value = bus.id;
        document.getElementById('busNumber').value = bus.number;
        document.getElementById('busDriver').value = bus.driver;
        document.getElementById('driverPhone').value = bus.phone || '';
        document.getElementById('busSeats').value = bus.seats;
        document.getElementById('busStatus').value = bus.status;
        document.getElementById('busModal').classList.add('active');
    }
}

function closeBusModal() {
    document.getElementById('busModal').classList.remove('active');
}

document.getElementById('busForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const buses = getBuses();
    const busId = document.getElementById('busId').value;
    
    const busData = {
        number: document.getElementById('busNumber').value,
        driver: document.getElementById('busDriver').value,
        phone: document.getElementById('driverPhone').value,
        seats: parseInt(document.getElementById('busSeats').value),
        status: document.getElementById('busStatus').value
    };
    
    if (busId) {
        // تحديث
        const index = buses.findIndex(b => b.id === parseInt(busId));
        if (index !== -1) {
            buses[index] = { ...buses[index], ...busData };
        }
    } else {
        // إضافة جديد
        busData.id = Date.now();
        buses.push(busData);
    }
    
    saveBuses(buses);
    loadBuses();
    updateStats();
    closeBusModal();
    showToast('success', busId ? 'تم تحديث الحافلة' : 'تم إضافة الحافلة');
});

function deleteBus(id) {
    if (confirm('هل أنت متأكد من حذف هذه الحافلة؟')) {
        let buses = getBuses();
        buses = buses.filter(b => b.id !== id);
        saveBuses(buses);
        loadBuses();
        updateStats();
        showToast('success', 'تم حذف الحافلة');
    }
}

// ===================================
// الإحصائيات
// ===================================
function loadStats() {
    const buses = getBuses();
    const trips = JSON.parse(localStorage.getItem('netba2_trips') || '[]');
    const history = JSON.parse(localStorage.getItem('netba2_history') || '[]');
    const sos = JSON.parse(localStorage.getItem('netba2_sos') || '[]');
    
    document.getElementById('totalUsers').textContent = history.length + 5; // محاكاة
    document.getElementById('totalBuses').textContent = buses.length;
    document.getElementById('totalTrips').textContent = trips.length;
    document.getElementById('totalSOS').textContent = sos.length;
}

// ===================================
// سجل الطلبات والرسائل
// ===================================
function loadRequests() {
    const history = JSON.parse(localStorage.getItem('netba2_history') || '[]');
    const container = document.getElementById('requestsList');
    
    if (history.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5;">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                </svg>
                <p>لا توجد طلبات حتى الآن</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = history.map((req, index) => {
        const date = new Date(req.timestamp);
        return `
            <div class="request-card">
                <div class="request-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 6v6M16 6v6M2 12h20M6 18h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                </div>
                <div class="request-info">
                    <h4>من: ${req.pickup}</h4>
                    <p>إلى: ${req.destination} • ${getDisabilityText(req.disabilityType)}</p>
                    ${req.passengers ? `<small>المرافقين: ${req.passengers}</small>` : ''}
                </div>
                <div class="request-meta">
                    <div>${date.toLocaleDateString('ar-EG')}</div>
                    <div>${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>
        `;
    }).join('');
}

// تحميل رسائل التواصل
function loadContactMessages() {
    const messages = JSON.parse(localStorage.getItem('netba2_contact_messages') || '[]');
    const container = document.getElementById('messagesList');
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-light);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5;">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <path d="M22 6l-10 7L2 6"/>
                </svg>
                <p>لا توجد رسائل تواصل حتى الآن</p>
            </div>
        `;
        container.style.display = 'block';
        return;
    }
    
    container.innerHTML = messages.map((msg, index) => {
        const date = new Date(msg.timestamp);
        const isWhatsApp = msg.via === 'whatsapp';
        
        return `
            <div class="request-card ${isWhatsApp ? 'whatsapp-message' : ''}">
                <div class="request-icon ${isWhatsApp ? 'whatsapp' : ''}">
                    ${isWhatsApp ? 
                        '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>' :
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>'
                    }
                </div>
                <div class="request-info">
                    <h4>${msg.name} ${isWhatsApp ? '💬' : ''}</h4>
                    <p><strong>الهاتف:</strong> ${msg.phone}</p>
                    ${msg.message ? `<p><strong>الرسالة:</strong> ${msg.message}</p>` : ''}
                </div>
                <div class="request-meta">
                    <div>${date.toLocaleDateString('ar-EG')}</div>
                    <div>${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
                    <a href="tel:${msg.phone}" style="color: var(--primary); font-size: 0.8rem;">اتصال</a>
                    <a href="https://wa.me/${msg.phone.replace(/[^0-9]/g, '')}" target="_blank" style="color: #25D366; font-size: 0.8rem;">واتساب</a>
                </div>
            </div>
        `;
    }).join('');
    
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '12px';
}

function getDisabilityText(type) {
    const texts = {
        motor: 'حركية',
        visual: 'بصرية',
        hearing: 'سمعية',
        intellectual: 'ذهنية',
        other: 'أخرى'
    };
    return texts[type] || type;
}

// ===================================
// إعدادات كلمة المرور
// ===================================
document.getElementById('passwordForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const settings = loadSettings();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    if (current !== settings.password) {
        showToast('error', 'كلمة المرور الحالية غير صحيحة');
        return;
    }
    
    if (newPass.length < 6) {
        showToast('error', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    
    if (newPass !== confirm) {
        showToast('error', 'كلمة المرور الجديدة غير متطابقة');
        return;
    }
    
    settings.password = newPass;
    saveSettings(settings);
    
    document.getElementById('passwordForm').reset();
    showToast('success', 'تم تغيير كلمة المرور بنجاح');
});

// ===================================
// إعدادات النظام
// ===================================
document.getElementById('systemSettings')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const settings = loadSettings();
    settings.companyName = document.getElementById('companyName').value;
    
    const newDefault = document.getElementById('defaultPassword').value;
    if (newDefault) {
        settings.defaultPassword = newDefault;
    }
    
    saveSettings(settings);
    showToast('success', 'تم حفظ إعدادات النظام');
});

// ===================================
// إعادة تعيين البيانات
// ===================================
function resetAllData() {
    if (confirm('هل أنت متأكد؟ سيتم حذف جميع البيانات ولا يمكن التراجع!')) {
        if (confirm('هذا الإجراء نهائي! اضغط OK للتأكيد.')) {
            localStorage.removeItem('netba2_trips');
            localStorage.removeItem('netba2_history');
            localStorage.removeItem('netba2_sos');
            localStorage.removeItem('netba2_favorites');
            localStorage.removeItem('netba2_buses');
            localStorage.removeItem('netba2_contact_messages');
            
            // إعادة الحافلة الافتراضية
            saveBuses([{
                id: 1,
                number: '127',
                driver: 'أحمد محمد',
                phone: '01012345678',
                seats: 12,
                status: 'available'
            }]);
            
            loadBuses();
            updateStats();
            loadRequests();
            loadContactMessages();
            
            showToast('success', 'تم مسح جميع البيانات');
        }
    }
}

// ===================================
// تصدير البيانات
// ===================================
function exportData() {
    const data = {
        buses: getBuses(),
        trips: JSON.parse(localStorage.getItem('netba2_trips') || '[]'),
        history: JSON.parse(localStorage.getItem('netba2_history') || '[]'),
        sos: JSON.parse(localStorage.getItem('netba2_sos') || '[]'),
        contact: loadSettings().contact,
        contactMessages: JSON.parse(localStorage.getItem('netba2_contact_messages') || '[]'),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netba2_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('success', 'تم تصدير البيانات بنجاح');
}

// ===================================
// إشعارات
// ===================================
function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ===================================
// فحص تسجيل الدخول
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('netba2_admin_logged') === 'true') {
        showDashboard();
    }
});
