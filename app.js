// ===================================
// نَتْبَع - تطبيق تتبع الحافلات
// مع دعم GPS + ميزات متقدمة
// ===================================

// بيانات التطبيق
const appData = {
    bus: {
        id: 127,
        driver: 'أحمد محمد',
        driverPhone: '01012345678',
        position: { lat: 30.0444, lng: 31.2357 },
        status: 'available',
        availableSeats: 8,
        eta: 5
    },
    user: {
        id: null,
        name: '',
        phone: '',
        position: { lat: 30.0484, lng: 31.2397 },
        address: ''
    },
    currentRequest: null,
    isLocating: false
};

// DOM Elements
let elements = {};

const defaultElements = {
    map: null,
    googleMap: null,
    busMarker: null,
    userMarker: null,
    pickupMarker: null,
    routeLine: null,
    directionsService: null,
    directionsRenderer: null,
    useGoogleMaps: false
};

// ===================================
// تهيئة عناصر DOM
// ===================================
function initElements() {
    elements = {
        ...defaultElements,
        statusBadge: document.getElementById('statusBadge'),
        statusText: document.getElementById('statusText'),
        busNumber: document.getElementById('busNumber'),
        driverName: document.getElementById('driverName'),
        availableSeats: document.getElementById('availableSeats'),
        eta: document.getElementById('eta'),
        requestBtn: document.getElementById('requestBtn'),
        requestModal: document.getElementById('requestModal'),
        tripModal: document.getElementById('tripModal'),
        tripsList: document.getElementById('tripsList'),
        emptyTrips: document.getElementById('emptyTrips'),
        toastContainer: document.getElementById('toastContainer'),
        mapLoading: document.getElementById('mapLoading'),
        apiKeyNotice: document.getElementById('apiKeyNotice'),
        sections: document.querySelectorAll('.section'),
        navBtns: document.querySelectorAll('.nav-btn'),
        pickupInput: document.getElementById('pickupLocation'),
        locateStatus: document.getElementById('locateStatus'),
        currentAddress: document.getElementById('currentAddress'),
        sosBtn: document.getElementById('sosBtn'),
        emergencyContact: document.getElementById('emergencyContact'),
        nearbyStops: document.getElementById('nearbyStops'),
        tripCount: document.getElementById('tripCount'),
        savedLocations: document.getElementById('savedLocations')
    };
}

// ===================================
// تهيئة الخريطة
// ===================================
function initMap() {
    if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
        initGoogleMaps();
        setTimeout(() => {
            if (!elements.googleMap) initLeafletMap();
        }, 3000);
    } else {
        initLeafletMap();
    }
}

// ===================================
// GPS - الحصول على الموقع تلقائياً
// ===================================
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('المتصفح لا يدعم تحديد الموقع'));
            return;
        }

        appData.isLocating = true;
        showToast('info', 'جاري تحديد موقعك... 📍');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                appData.user.position.lat = position.coords.latitude;
                appData.user.position.lng = position.coords.longitude;
                appData.isLocating = false;
                
                // محاولة الحصول على العنوان
                reverseGeocode(position.coords.latitude, position.coords.longitude)
                    .then(address => {
                        appData.user.address = address;
                        resolve({ ...appData.user.position, address });
                    })
                    .catch(() => {
                        resolve(appData.user.position);
                    });
            },
            (error) => {
                appData.isLocating = false;
                let errorMsg = 'تعذر تحديد الموقع';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = 'يرجى السماح بالوصول للموقع';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = 'الموقع غير متاح';
                        break;
                    case error.TIMEOUT:
                        errorMsg = 'انتهت مهلة تحديد الموقع';
                        break;
                }
                reject(new Error(errorMsg));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// ===================================
// تحويل الإحداثيات إلى عنوان
// ===================================
function reverseGeocode(lat, lng) {
    return new Promise((resolve, reject) => {
        // استخدام Nominatim (مجاني)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`)
            .then(response => response.json())
            .then(data => {
                if (data.display_name) {
                    resolve(data.display_name);
                } else {
                    reject(new Error('لم يتم العثور على عنوان'));
                }
            })
            .catch(reject);
    });
}

// ===================================
// حفظ الموقع المفضل
// ===================================
function saveFavoriteLocation(name, position, address) {
    const favorites = JSON.parse(localStorage.getItem('netba2_favorites')) || [];
    favorites.push({
        id: Date.now(),
        name,
        position,
        address,
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('netba2_favorites', JSON.stringify(favorites));
    showToast('success', `تم حفظ "${name}" كموقع مفضل ⭐`);
    renderFavoriteLocations();
}

// ===================================
// عرض المواقع المحفوظة
// ===================================
function renderFavoriteLocations() {
    const favorites = JSON.parse(localStorage.getItem('netba2_favorites')) || [];
    const container = document.getElementById('favoriteLocations');
    
    if (!container) return;
    
    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-favorites">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                <p>لا توجد مواقع محفوظة</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = favorites.map(fav => `
        <div class="favorite-location" onclick="useFavoriteLocation(${fav.id})">
            <div class="fav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
            </div>
            <div class="fav-info">
                <strong>${fav.name}</strong>
                <span>${fav.address.substring(0, 40)}...</span>
            </div>
            <button class="fav-delete" onclick="event.stopPropagation(); deleteFavorite(${fav.id})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `).join('');
}

function useFavoriteLocation(id) {
    const favorites = JSON.parse(localStorage.getItem('netba2_favorites')) || [];
    const fav = favorites.find(f => f.id === id);
    if (fav) {
        appData.user.position = fav.position;
        appData.user.address = fav.address;
        document.getElementById('pickupLocation').value = fav.address;
        
        // تحديث العلامة على الخريطة
        if (elements.userMarker) {
            elements.userMarker.setPosition(fav.position);
        }
        
        showToast('success', `تم تحديد "${fav.name}"`);
    }
}

function deleteFavorite(id) {
    let favorites = JSON.parse(localStorage.getItem('netba2_favorites')) || [];
    favorites = favorites.filter(f => f.id !== id);
    localStorage.setItem('netba2_favorites', JSON.stringify(favorites));
    renderFavoriteLocations();
    showToast('info', 'تم حذف الموقع');
}

// ===================================
// تهيئة خرائط جوجل
// ===================================
function initGoogleMaps() {
    try {
        if (!google.maps.places) {
            throw new Error('Google Maps API not loaded');
        }

        const mapOptions = {
            center: { lat: appData.bus.position.lat, lng: appData.bus.position.lng },
            zoom: 14,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: false,
            styles: getMapStyle()
        };

        elements.googleMap = new google.maps.Map(document.getElementById('map'), mapOptions);
        elements.useGoogleMaps = true;

        elements.directionsService = new google.maps.DirectionsService();
        elements.directionsRenderer = new google.maps.DirectionsRenderer({
            map: elements.googleMap,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#2563EB',
                strokeOpacity: 0.8,
                strokeWeight: 4
            }
        });

        addGoogleMarkers();
        setupGooglePlacesAutocomplete();

        setTimeout(() => {
            elements.mapLoading.classList.add('hidden');
        }, 1500);

        setInterval(updateBusPositionGoogle, 3000);

    } catch (error) {
        console.warn('Google Maps failed:', error);
        initLeafletMap();
    }
}

function getMapStyle() {
    const isDark = document.body.classList.contains('dark');
    if (isDark) {
        return [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
        ];
    }
    return [];
}

function addGoogleMarkers() {
    // علامة الحافلة
    const busIcon = {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="23" fill="#2563EB" stroke="white" stroke-width="3"/>
                <text x="25" y="32" text-anchor="middle" fill="white" font-size="24">🚌</text>
            </svg>
        `),
        scaledSize: new google.maps.Size(50, 50),
        anchor: new google.maps.Point(25, 50)
    };

    elements.busMarker = new google.maps.Marker({
        position: { lat: appData.bus.position.lat, lng: appData.bus.position.lng },
        map: elements.googleMap,
        icon: busIcon,
        animation: google.maps.Animation.BOUNCE
    });

    const busInfoWindow = new google.maps.InfoWindow({
        content: createBusInfoWindow()
    });

    elements.busMarker.addListener('click', () => {
        busInfoWindow.open(elements.googleMap, elements.busMarker);
    });

    setTimeout(() => { elements.busMarker.setAnimation(null); }, 3000);

    // علامة المستخدم
    elements.userMarker = new google.maps.Marker({
        position: { lat: appData.user.position.lat, lng: appData.user.position.lng },
        map: elements.googleMap,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#059669',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 3
        }
    });

    drawGoogleRoute();
}

function createBusInfoWindow() {
    return `
        <div style="padding: 15px; min-width: 200px; direction: rtl;">
            <h3 style="margin: 0 0 10px; color: #2563EB;">🚌 حافلة رقم ${appData.bus.id}</h3>
            <p style="margin: 5px 0;"><strong>السائق:</strong> ${appData.bus.driver}</p>
            <p style="margin: 5px 0;"><strong>الهاتف:</strong> ${appData.bus.driverPhone}</p>
            <p style="margin: 5px 0;"><strong>المقاعد:</strong> ${appData.bus.availableSeats} متاحة</p>
            <p style="margin: 5px 0;"><strong>الوقت المتوقع:</strong> ${appData.bus.eta} دقيقة</p>
        </div>
    `;
}

function drawGoogleRoute() {
    if (!elements.useGoogleMaps) return;

    elements.directionsService.route({
        origin: { lat: appData.user.position.lat, lng: appData.user.position.lng },
        destination: { lat: appData.bus.position.lat, lng: appData.bus.position.lng },
        travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
        if (status === 'OK') {
            elements.directionsRenderer.setDirections(result);
            appData.bus.eta = Math.round(result.routes[0].legs[0].duration.value / 60);
            if (elements.eta) elements.eta.textContent = appData.bus.eta;
        }
    });
}

function updateBusPositionGoogle() {
    if (!elements.useGoogleMaps) return;

    const moveAmount = 0.0003;
    appData.bus.position.lat += (Math.random() - 0.5) * moveAmount;
    appData.bus.position.lng += (Math.random() - 0.5) * moveAmount;

    elements.busMarker.setPosition({
        lat: appData.bus.position.lat,
        lng: appData.bus.position.lng
    });

    drawGoogleRoute();
}

function setupGooglePlacesAutocomplete() {
    if (!elements.useGoogleMaps) return;

    const options = {
        componentRestrictions: { country: 'eg' },
        fields: ['address_components', 'geometry', 'name'],
        types: ['address']
    };

    const autocomplete = new google.maps.places.Autocomplete(elements.pickupInput, options);

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            appData.user.position.lat = place.geometry.location.lat();
            appData.user.position.lng = place.geometry.location.lng();
            appData.user.address = place.formatted_address;
            
            elements.userMarker.setPosition(place.geometry.location);
            elements.googleMap.setCenter(place.geometry.location);
            
            showToast('success', 'تم تحديد الموقع 📍');
        }
    });
}

// ===================================
// تهيئة Leaflet
// ===================================
function initLeafletMap() {
    if (elements.map || elements.googleMap) return;

    elements.map = L.map('map', { zoomControl: false })
        .setView([appData.bus.position.lat, appData.bus.position.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(elements.map);

    addLeafletMarkers();

    if (elements.apiKeyNotice) {
        elements.apiKeyNotice.style.display = 'flex';
    }

    setTimeout(() => { elements.mapLoading.classList.add('hidden'); }, 1500);
    setInterval(updateBusPositionLeaflet, 3000);
}

function addLeafletMarkers() {
    const busIcon = L.divIcon({
        className: 'custom-bus-marker',
        html: `<svg viewBox="0 0 24 24" fill="#2563EB" stroke="#1E40AF" stroke-width="1" style="width:40px;height:40px;"><path d="M8 6v6M16 6v6M2 12h20M6 18h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });

    elements.busMarker = L.marker([appData.bus.position.lat, appData.bus.position.lng], { icon: busIcon })
        .addTo(elements.map);

    const userIcon = L.divIcon({
        className: 'user-marker',
        html: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    elements.userMarker = L.marker([appData.user.position.lat, appData.user.position.lng], { icon: userIcon })
        .addTo(elements.map);

    drawLeafletRoute();
}

function drawLeafletRoute() {
    if (elements.routeLine) elements.map.removeLayer(elements.routeLine);
    
    elements.routeLine = L.polyline([
        [appData.user.position.lat, appData.user.position.lng],
        [appData.bus.position.lat, appData.bus.position.lng]
    ], { color: '#2563EB', weight: 3, opacity: 0.7, dashArray: '10, 10' }).addTo(elements.map);
}

function updateBusPositionLeaflet() {
    if (elements.useGoogleMaps) return;

    const moveAmount = 0.0005;
    appData.bus.position.lat += (Math.random() - 0.5) * moveAmount;
    appData.bus.position.lng += (Math.random() - 0.5) * moveAmount;

    elements.busMarker.setLatLng([appData.bus.position.lat, appData.bus.position.lng]);
    drawLeafletRoute();

    const distance = calculateDistance(
        appData.user.position.lat, appData.user.position.lng,
        appData.bus.position.lat, appData.bus.position.lng
    );
    appData.bus.eta = Math.max(1, Math.round(distance / 0.5));
    if (elements.eta) elements.eta.textContent = appData.bus.eta;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ===================================
// التنقل
// ===================================
function initNavigation() {
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;

            elements.navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            elements.sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');

            if (sectionId === 'track') {
                setTimeout(() => {
                    if (elements.useGoogleMaps && elements.googleMap) {
                        google.maps.event.trigger(elements.googleMap, 'resize');
                    } else if (elements.map) {
                        elements.map.invalidateSize();
                    }
                }, 100);
            }
        });
    });
}

// ===================================
// أزرار التحكم
// ===================================
function initMapControls() {
    document.getElementById('zoomIn')?.addEventListener('click', () => {
        if (elements.useGoogleMaps) {
            elements.googleMap.setZoom(elements.googleMap.getZoom() + 1);
        } else {
            elements.map?.zoomIn();
        }
    });

    document.getElementById('zoomOut')?.addEventListener('click', () => {
        if (elements.useGoogleMaps) {
            elements.googleMap.setZoom(elements.googleMap.getZoom() - 1);
        } else {
            elements.map?.zoomOut();
        }
    });

    document.getElementById('satelliteBtn')?.addEventListener('click', () => {
        if (elements.useGoogleMaps) {
            const currentType = elements.googleMap.getMapTypeId();
            elements.googleMap.setMapTypeId(
                currentType === google.maps.MapTypeId.ROADMAP 
                    ? google.maps.MapTypeId.SATELLITE 
                    : google.maps.MapTypeId.ROADMAP
            );
        }
        showToast('info', 'تم تغيير نوع الخريطة 🗺️');
    });

    document.getElementById('locateBtn')?.addEventListener('click', async () => {
        try {
            await getCurrentLocation();
            
            if (elements.useGoogleMaps && elements.googleMap) {
                elements.userMarker.setPosition(appData.user.position);
                elements.googleMap.setCenter(appData.user.position);
            } else if (elements.map) {
                elements.userMarker.setLatLng([appData.user.position.lat, appData.user.position.lng]);
                elements.map.setView([appData.user.position.lat, appData.user.position.lng], 15);
            }
            
            showToast('success', `تم تحديد موقعك في ${appData.user.address.substring(0, 30)}...`);
        } catch (error) {
            showToast('error', error.message);
        }
    });

    // زر SOS
    document.getElementById('sosBtn')?.addEventListener('click', sendSOS);
}

async function sendSOS() {
    if (confirm('هل تريد إرسال نداء استغاثة؟ سيتم إخطار مركز التحكم والسائق.')) {
        const sosData = {
            userId: appData.user.id || 'زائر',
            location: appData.user.position,
            address: appData.user.address,
            timestamp: new Date().toISOString()
        };
        
        // حفظ في LocalStorage
        const sosHistory = JSON.parse(localStorage.getItem('netba2_sos') || '[]');
        sosHistory.push(sosData);
        localStorage.setItem('netba2_sos', JSON.stringify(sosHistory));
        
        showToast('success', '🆘 تم إرسال نداء الاستغاثة! سيتم التواصل معك فوراً');
        
        // محاكاة إرسال SMS
        console.log('SOS Data:', sosData);
    }
}

// ===================================
// طلب الحافلة
// ===================================
function initRequestBus() {
    elements.requestBtn?.addEventListener('click', async () => {
        // الحصول على الموقع تلقائياً أولاً
        try {
            showToast('info', 'جاري تحديد موقعك تلقائياً... 📍');
            await getCurrentLocation();
            
            // ملء حقل الاستلام تلقائياً
            document.getElementById('pickupLocation').value = appData.user.address || 
                `${appData.user.position.lat.toFixed(4)}, ${appData.user.position.lng.toFixed(4)}`;
            
            showToast('success', 'تم تحديد موقعك! ✅');
        } catch (error) {
            showToast('warning', 'تعذر تحديد الموقع تلقائياً، أدخله يدوياً');
        }
        
        elements.requestModal?.classList.add('active');
        updateBusStatus('onway');
    });

    document.getElementById('closeRequestModal')?.addEventListener('click', closeRequestModal);
    document.getElementById('cancelRequest')?.addEventListener('click', closeRequestModal);
    elements.requestModal?.addEventListener('click', (e) => {
        if (e.target === elements.requestModal) closeRequestModal();
    });

    document.getElementById('requestForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        submitRequest();
    });

    // حفظ الموقع كمفضل
    document.getElementById('saveLocationBtn')?.addEventListener('click', () => {
        const name = prompt('أدخل اسم لهذا الموقع:');
        if (name) {
            saveFavoriteLocation(name, appData.user.position, appData.user.address);
        }
    });

    // تحديث الموقع
    document.getElementById('refreshLocationBtn')?.addEventListener('click', async () => {
        try {
            await getCurrentLocation();
            document.getElementById('pickupLocation').value = appData.user.address || 
                `${appData.user.position.lat.toFixed(4)}, ${appData.user.position.lng.toFixed(4)}`;
            showToast('success', 'تم تحديث الموقع ✅');
        } catch (error) {
            showToast('error', error.message);
        }
    });
}

function closeRequestModal() {
    elements.requestModal?.classList.remove('active');
}

function submitRequest() {
    const pickup = document.getElementById('pickupLocation')?.value;
    const destination = document.getElementById('destinationLocation')?.value;
    const disabilityType = document.getElementById('disabilityType')?.value;

    if (!pickup || !destination || !disabilityType) {
        showToast('error', 'يرجى ملء جميع الحقول المطلوبة');
        return;
    }

    // حفظ بيانات الرحلة
    appData.currentRequest = {
        pickup,
        destination,
        disabilityType,
        assistiveDevice: document.getElementById('assistiveDevice')?.value,
        time: document.getElementById('tripTime')?.value,
        passengers: document.getElementById('passengers')?.value,
        timestamp: new Date().toISOString()
    };

    // حفظ في السجل
    const history = JSON.parse(localStorage.getItem('netba2_history') || '[]');
    history.unshift(appData.currentRequest);
    if (history.length > 20) history.pop();
    localStorage.setItem('netba2_history', JSON.stringify(history));

    elements.requestBtn.classList.add('loading');
    elements.requestBtn.innerHTML = `<div class="spinner"></div><span>جاري الإرسال...</span>`;

    setTimeout(() => {
        elements.requestBtn.classList.remove('loading');
        elements.requestBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 6v6M16 6v6M2 12h20M6 18h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2zM6 18v2M18 18v2"/>
            </svg>
            <span>طلب الحافلة الآن</span>
        `;

        closeRequestModal();
        showToast('success', '✅ تم إرسال طلبك! الحافلة في الطريق إليك');
        document.getElementById('requestForm')?.reset();
    }, 2000);
}

// ===================================
// إدارة الرحلات
// ===================================
function initSchedule() {
    loadTrips();
    renderStats();

    document.getElementById('addTripBtn')?.addEventListener('click', () => {
        const today = new Date();
        document.getElementById('tripDate').value = today.toISOString().split('T')[0];
        document.getElementById('tripDate').min = today.toISOString().split('T')[0];
        elements.tripModal?.classList.add('active');
    });

    document.getElementById('closeTripModal')?.addEventListener('click', closeTripModal);
    document.getElementById('cancelTrip')?.addEventListener('click', closeTripModal);
    elements.tripModal?.addEventListener('click', (e) => {
        if (e.target === elements.tripModal) closeTripModal();
    });

    document.getElementById('tripForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        addTrip();
    });

    renderFavoriteLocations();
}

function closeTripModal() {
    elements.tripModal?.classList.remove('active');
}

function loadTrips() {
    const trips = JSON.parse(localStorage.getItem('netba2_trips') || '[]');
    renderTrips(trips);
}

function renderTrips(trips) {
    if (trips.length === 0) {
        elements.tripsList.innerHTML = '';
        elements.emptyTrips?.classList.remove('hidden');
        return;
    }

    elements.emptyTrips?.classList.add('hidden');

    elements.tripsList.innerHTML = trips.map((trip, index) => {
        const date = new Date(trip.date);
        const day = date.getDate();
        const month = date.toLocaleDateString('ar-EG', { month: 'short' });
        const isPast = new Date(trip.date + 'T' + trip.time) < new Date();

        return `
            <div class="trip-card ${isPast ? 'past' : ''}" data-index="${index}">
                <div class="trip-date-badge">
                    <span class="trip-day">${day}</span>
                    <span class="trip-month">${month}</span>
                </div>
                <div class="trip-info">
                    <div class="trip-time">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        ${trip.time} ${isPast ? '<span style="color: #EF4444; font-size: 0.8rem;">(ماضية)</span>' : ''}
                    </div>
                    <div class="trip-route">
                        <span class="from">${trip.from}</span>
                        <svg class="trip-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                        <span class="to">${trip.to}</span>
                    </div>
                    ${trip.notes ? `<p style="color: var(--text-light); font-size: 0.85rem; margin-top: 4px;">${trip.notes}</p>` : ''}
                </div>
                <div class="trip-actions">
                    <button class="trip-action-btn edit" onclick="quickRequest(${index})" title="طلب سريع">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 6v6M16 6v6M2 12h20M6 18h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                    </button>
                    <button class="trip-action-btn delete" onclick="deleteTrip(${index})" title="حذف">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function addTrip() {
    const trip = {
        date: document.getElementById('tripDate')?.value,
        time: document.getElementById('tripTimeScheduled')?.value,
        from: document.getElementById('tripFrom')?.value,
        to: document.getElementById('tripTo')?.value,
        notes: document.getElementById('tripNotes')?.value
    };

    let trips = JSON.parse(localStorage.getItem('netba2_trips') || '[]');
    trips.push(trip);
    trips.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    localStorage.setItem('netba2_trips', JSON.stringify(trips));
    renderTrips(trips);
    closeTripModal();
    renderStats();
    showToast('success', '✅ تم إضافة الرحلة بنجاح');
    document.getElementById('tripForm')?.reset();
}

function quickRequest(index) {
    const trips = JSON.parse(localStorage.getItem('netba2_trips') || '[]');
    const trip = trips[index];
    
    if (trip) {
        document.getElementById('pickupLocation').value = trip.from;
        document.getElementById('destinationLocation').value = trip.to;
        
        // الانتقال لقسم التتبع وفتح الطلب
        document.querySelector('[data-section="track"]')?.click();
        elements.requestBtn?.click();
        
        showToast('info', `تم تعبئة بيانات الرحلة من "${trip.from}" إلى "${trip.to}"`);
    }
}

function deleteTrip(index) {
    if (confirm('هل أنت متأكد من حذف هذه الرحلة؟')) {
        let trips = JSON.parse(localStorage.getItem('netba2_trips') || '[]');
        trips.splice(index, 1);
        localStorage.setItem('netba2_trips', JSON.stringify(trips));
        renderTrips(trips);
        renderStats();
        showToast('success', 'تم حذف الرحلة');
    }
}

function renderStats() {
    const trips = JSON.parse(localStorage.getItem('netba2_trips') || '[]');
    const history = JSON.parse(localStorage.getItem('netba2_history') || '[]');
    const favorites = JSON.parse(localStorage.getItem('netba2_favorites') || '[]');
    const sosHistory = JSON.parse(localStorage.getItem('netba2_sos') || '[]');

    const upcomingTrips = trips.filter(t => new Date(t.date + 'T' + t.time) >= new Date()).length;

    document.getElementById('tripCount').textContent = upcomingTrips;
    document.getElementById('totalTrips').textContent = history.length;
    document.getElementById('savedLocationsCount').textContent = favorites.length;
}

// ===================================
// نموذج التواصل
// ===================================
function initContactForm() {
    // نموذج إرسال عادي
    document.getElementById('contactForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('contactName')?.value;
        const phone = document.getElementById('contactPhone')?.value;
        const message = document.getElementById('contactMessage')?.value;

        if (!name || !phone) {
            showToast('error', 'يرجى ملء الاسم ورقم الهاتف');
            return;
        }

        // حفظ الرسالة
        saveContactMessage({ name, phone, message });
        showToast('success', '✅ تم إرسال رسالتك! سنرد عليك قريباً');
        document.getElementById('contactForm')?.reset();
    });

    // زر إرسال عبر واتساب
    document.getElementById('sendWhatsApp')?.addEventListener('click', sendToWhatsApp);
}

function sendToWhatsApp() {
    const name = document.getElementById('contactName')?.value;
    const phone = document.getElementById('contactPhone')?.value;
    const message = document.getElementById('contactMessage')?.value;

    if (!name || !phone) {
        showToast('error', 'يرجى ملء الاسم ورقم الهاتف أولاً');
        return;
    }

    // الحصول على رقم واتساب من الإعدادات
    let contact = JSON.parse(localStorage.getItem('netba2_contact'));
    if (!contact) {
        contact = { whatsapp: '+201001234567' };
    }

    // تنسيق رقم الواتساب
    let whatsappNumber = contact.whatsapp.replace(/[^0-9]/g, '');
    if (whatsappNumber.startsWith('0')) {
        whatsappNumber = '2' + whatsappNumber; // إضافة كود مصر
    }
    if (!whatsappNumber.startsWith('20')) {
        whatsappNumber = '20' + whatsappNumber;
    }

    // إنشاء رسالة واتساب
    const whatsappMessage = `*مرحباً، رسالة من تطبيق نَتْبَع*

*الاسم:* ${name}
*رقم الهاتف:* ${phone}
${message ? `*الرسالة:*\n${message}` : ''}

*تاريخ الإرسال:* ${new Date().toLocaleString('ar-EG')}`;

    // إنشاء رابط واتساب
    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    // حفظ الرسالة في السجل
    saveContactMessage({ name, phone, message, via: 'whatsapp' });

    // فتح واتساب
    window.open(whatsappURL, '_blank');

    showToast('success', 'جاري فتح واتساب... 💬');
}

function saveContactMessage(data) {
    const messages = JSON.parse(localStorage.getItem('netba2_contact_messages') || '[]');
    messages.unshift({
        ...data,
        timestamp: new Date().toISOString()
    });
    if (messages.length > 100) messages.pop();
    localStorage.setItem('netba2_contact_messages', JSON.stringify(messages));
}

// ===================================
// تحديث حالة الحافلة
// ===================================
function updateBusStatus(status) {
    appData.bus.status = status;
    
    if (!elements.statusBadge) return;
    
    elements.statusBadge.className = 'status-badge ' + status;

    switch (status) {
        case 'available':
            elements.statusText.textContent = 'متاحة';
            appData.bus.eta = Math.floor(Math.random() * 3) + 1;
            break;
        case 'onway':
            elements.statusText.textContent = 'في الطريق';
            appData.bus.eta = Math.floor(Math.random() * 5) + 3;
            break;
        case 'busy':
            elements.statusText.textContent = 'مشغولة';
            appData.bus.eta = '--';
            break;
    }

    if (elements.eta) elements.eta.textContent = appData.bus.eta;
}

// ===================================
// السمة
// ===================================
function initThemeToggle() {
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem('netba2_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    
    if (elements.useGoogleMaps && elements.googleMap) {
        elements.googleMap.setOptions({ styles: getMapStyle() });
        setTimeout(() => google.maps.event.trigger(elements.googleMap, 'resize'), 100);
    } else if (elements.map) {
        setTimeout(() => elements.map.invalidateSize(), 100);
    }
    
    showToast('info', document.body.classList.contains('dark') ? 'الوضع الداكن 🌙' : 'الوضع الفاتح ☀️');
}

function loadTheme() {
    const saved = localStorage.getItem('netba2_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (saved === 'dark' || (!saved && prefersDark)) {
        document.body.classList.add('dark');
    }
}

// ===================================
// إشعارات
// ===================================
function showToast(type, message) {
    const icons = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>`,
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
        warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${icons[type]}
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
    `;

    elements.toastContainer?.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// ===================================
// تشغيل التطبيق
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    loadTheme();
    loadContactInfo();
    initNavigation();
    initMapControls();
    initRequestBus();
    initSchedule();
    initContactForm();
    initThemeToggle();
    initMap();

    // محاولة تحديد الموقع عند التحميل
    setTimeout(async () => {
        try {
            await getCurrentLocation();
            showToast('success', `تم تحديد موقعك! 📍`);
        } catch (e) {
            // تجاهل
        }
    }, 3000);

    setTimeout(() => showToast('info', 'مرحباً بك في نَتْبَع! 🚌'), 2000);
});

// ===================================
// تحميل بيانات التواصل
// ===================================
function loadContactInfo() {
    // محاولة تحميل من localStorage
    let contact = JSON.parse(localStorage.getItem('netba2_contact'));
    
    // إذا لم توجد، استخدم الإعدادات الافتراضية
    if (!contact) {
        contact = {
            hotline: '16000',
            whatsapp: '+201001234567',
            email: 'support@netba2.com',
            address: 'القاهرة، مصر'
        };
    }
    
    // تحديث العناصر
    const hotlineDisplay = document.getElementById('hotlineDisplay');
    const whatsappDisplay = document.getElementById('whatsappDisplay');
    const emailDisplay = document.getElementById('emailDisplay');
    
    if (hotlineDisplay) hotlineDisplay.textContent = contact.hotline;
    if (whatsappDisplay) {
        whatsappDisplay.textContent = contact.whatsapp;
        const whatsappCard = document.getElementById('whatsappCard');
        if (whatsappCard) {
            whatsappCard.href = `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`;
        }
    }
    if (emailDisplay) {
        emailDisplay.textContent = contact.email;
        const emailCard = document.getElementById('emailCard');
        if (emailCard) emailCard.href = `mailto:${contact.email}`;
    }
    
    // تحديث رقم الخط الساخن للرابط
    const hotlineCard = document.getElementById('hotlineCard');
    if (hotlineCard) hotlineCard.href = `tel:${contact.hotline}`;
}

// ===================================
// SOS Modal Functions
// ===================================
function sendSOS() {
    document.getElementById('sosModal').classList.add('active');
    
    // تحديد الموقع
    getCurrentLocation()
        .then(location => {
            document.getElementById('sosLocation').textContent = location.address || 
                `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`;
        })
        .catch(() => {
            document.getElementById('sosLocation').textContent = 'تعذر تحديد الموقع';
        });
}

function closeSosModal() {
    document.getElementById('sosModal').classList.remove('active');
}

function confirmSOS() {
    const sosData = {
        userId: appData.user.id || 'زائر',
        location: appData.user.position,
        address: appData.user.address,
        timestamp: new Date().toISOString()
    };
    
    const sosHistory = JSON.parse(localStorage.getItem('netba2_sos') || '[]');
    sosHistory.unshift(sosData);
    if (sosHistory.length > 20) sosHistory.pop();
    localStorage.setItem('netba2_sos', JSON.stringify(sosHistory));
    
    closeSosModal();
    showToast('success', '🆘 تم إرسال نداء الاستغاثة! سيتم التواصل معك فوراً');
    
    console.log('SOS Alert:', sosData);
}

// Global functions
window.deleteTrip = deleteTrip;
window.quickRequest = quickRequest;
window.useFavoriteLocation = useFavoriteLocation;
window.deleteFavorite = deleteFavorite;
window.toggleTheme = toggleTheme;
window.closeSosModal = closeSosModal;
window.confirmSOS = confirmSOS;
