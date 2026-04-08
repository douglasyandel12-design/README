// --- SISTEMA DE MODO OSCURO GLOBAL ---
(function applyDarkMode(){const isDark=localStorage.getItem('lvs_dark_mode')==='true';if(isDark)document.documentElement.classList.add('dark-mode');if(!document.getElementById('dark-mode-styles')){const style=document.createElement('style');style.id='dark-mode-styles';style.innerHTML=`html.dark-mode body{background-color:#000 !important;color:#fff !important;}html.dark-mode header,html.dark-mode footer,html.dark-mode nav,html.dark-mode .settings-sidebar,html.dark-mode .settings-content,html.dark-mode .order-card,html.dark-mode .product-card,html.dark-mode .sp-media,html.dark-mode form,html.dark-mode .order-summary,html.dark-mode .product-modal-content,html.dark-mode .cart-content,html.dark-mode .pm-details,html.dark-mode .pm-image-container,html.dark-mode .accordion-header,html.dark-mode .hero{background-color:#0a0a0a !important;color:#fff !important;border-color:#222 !important;}html.dark-mode input,html.dark-mode select,html.dark-mode textarea{background-color:#111 !important;color:#fff !important;border-color:#333 !important;}html.dark-mode h1,html.dark-mode h2,html.dark-mode h3,html.dark-mode h4,html.dark-mode strong,html.dark-mode .product-title,html.dark-mode .pm-title,html.dark-mode .item-price,html.dark-mode .total-amount,html.dark-mode .order-value,html.dark-mode .sp-details h1{color:#fff !important;}html.dark-mode .logo{color:#fff !important;}html.dark-mode .btn-outline{color:#fff !important;border-color:#fff !important;background:transparent !important;}html.dark-mode .btn-outline:hover{background:#fff !important;color:#000 !important;}html.dark-mode .btn{background-color:#fff !important;color:#000 !important;border-color:#fff !important;}html.dark-mode .btn:hover{background-color:#ccc !important;border-color:#ccc !important;}html.dark-mode .settings-menu-btn{color:#aaa !important;border-color:#222 !important;background:transparent !important;}html.dark-mode .settings-menu-btn:hover,html.dark-mode .settings-menu-btn.active{background-color:#111 !important;color:#fff !important;border-left-color:#fff !important;}html.dark-mode .empty-state,html.dark-mode .order-header,html.dark-mode .accordion-content,html.dark-mode .cart-table th{background-color:#111 !important;border-color:#222 !important;color:#ccc !important;}html.dark-mode .track-line-bg{background:#333 !important;}html.dark-mode .step-counter{background:#111 !important;border-color:#333 !important;color:#666 !important;}html.dark-mode .stepper-item.active .step-counter{border-color:#fff !important;color:#fff !important;background:#000 !important;}html.dark-mode .stepper-item.completed .step-counter{background:#fff !important;border-color:#fff !important;color:#000 !important;}html.dark-mode .filter-btn{background-color:#111 !important;color:#aaa !important;border-color:#333 !important;}html.dark-mode .filter-btn:hover,html.dark-mode .filter-btn.active{background-color:#fff !important;color:#000 !important;border-color:#fff !important;}html.dark-mode .header-search-container input{background:#111 !important;border-color:#333 !important;color:#fff !important;}html.dark-mode .filter-chip{background:#111 !important;color:#aaa !important;border-color:#333 !important;}html.dark-mode .filter-chip.active{background:#fff !important;color:#000 !important;}html.dark-mode .dropdown-menu{background:#111 !important;border-color:#333 !important;}html.dark-mode .dropdown-menu a{color:#ccc !important;}html.dark-mode .dropdown-menu a:hover{background:#222 !important;color:#fff !important;}html.dark-mode .cart-table td,html.dark-mode .total-row,html.dark-mode .summary-row,html.dark-mode .item-row{border-color:#222 !important;}html.dark-mode .sp-media{background:transparent !important;}html.dark-mode .profile-info h2,html.dark-mode .profile-info p{color:#fff !important;}html.dark-mode .sp-description,html.dark-mode .pm-description{color:#ccc !important;}html.dark-mode div:where(.swal2-container) div:where(.swal2-popup){background-color:#111 !important;color:#fff !important;border:1px solid #333 !important;}html.dark-mode div:where(.swal2-title){color:#fff !important;}html.dark-mode div:where(.swal2-html-container){color:#ccc !important;}`;document.head.appendChild(style);}})();

let currentUser = null;
let cropInstance = null; // Instancia del recortador
let cropResolve = null;  // Promesa para manejar la respuesta

document.addEventListener('DOMContentLoaded', async () => {
    // Inyectar estilos profesionales
    injectSettingsStyles();

    // Buscar contenedor principal. Si no existe uno específico, usar main o body
    const container = document.querySelector('main') || document.body;
    
    // Renderizar estructura base (Loading)
    container.innerHTML = `<div style="text-align:center; padding: 4rem;"><p>Cargando configuración...</p></div>`;
    fixPageFavicon();

    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (!data.user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = data.user;
        
        // Renderizar Interfaz Completa
        renderSettingsUI(container);
        loadShippingInfo();

    } catch (error) {
        console.error('Error al cargar la sesión:', error);
        Swal.fire('Error', 'No se pudo cargar tu información. Por favor, inicia sesión de nuevo.', 'error');
        window.location.href = 'login.html';
    }
});

function injectSettingsStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        .settings-layout { display: flex; gap: 2rem; max-width: 1000px; margin: 2rem auto; padding: 0 1rem; align-items: flex-start; }
        .settings-sidebar { flex: 0 0 250px; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .settings-menu-btn { 
            width: 100%; text-align: left; padding: 1rem 1.5rem; border: none; background: none; 
            cursor: pointer; font-size: 0.95rem; font-weight: 500; color: #4b5563; 
            border-bottom: 1px solid #f3f4f6; transition: all 0.2s;
        }
        .settings-menu-btn:hover { background-color: #f9fafb; color: #000; }
        .settings-menu-btn.active { background-color: #f3f4f6; color: #000; font-weight: 600; border-left: 4px solid #000; }
        
        .settings-content { flex: 1; background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .settings-section { display: none; animation: fadeIn 0.3s ease; }
        .settings-section.active { display: block; }
        
        .settings-header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; }
        .settings-header h2 { margin: 0; font-size: 1.5rem; font-weight: 700; color: #111; }
        .settings-header p { margin: 0.5rem 0 0 0; color: #6b7280; font-size: 0.9rem; }

        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151; font-size: 0.9rem; }
        .form-group input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; transition: border-color 0.2s; }
        .form-group input:focus { border-color: #000; outline: none; ring: 1px solid #000; }
        .form-group input[readonly] { background-color: #f3f4f6; color: #6b7280; cursor: not-allowed; }
        
        .btn-save { background: #000; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
        .btn-save:hover { opacity: 0.9; }

        .avatar-section { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #f3f4f6; }
        .avatar-preview { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb; }
        .avatar-btn { color: #2563eb; font-weight: 500; font-size: 0.9rem; cursor: pointer; background: none; border: none; padding: 0; }
        .avatar-btn:hover { text-decoration: underline; }

        .switch input:checked + .slider { background-color: #3b82f6; }
        .switch input:checked ~ .slider-dot { transform: translateX(26px); }

        @media (max-width: 768px) {
            .settings-layout { flex-direction: column; }
            .settings-sidebar { width: 100%; display: flex; overflow-x: auto; }
            .settings-menu-btn { border-bottom: none; border-right: 1px solid #f3f4f6; white-space: nowrap; }
            .settings-menu-btn.active { border-left: none; border-bottom: 4px solid #000; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
}

function renderSettingsUI(container) {
    // Verificar si es usuario de Google para ocultar seguridad
    const isGoogleUser = currentUser.provider === 'google';

    // Icono SVG
    const googleIcon = isGoogleUser ? `<svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align: -2px; margin-left: 4px;"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>` : '';

    container.innerHTML = `
        <div class="settings-layout">
            <div class="settings-sidebar">
                <button class="settings-menu-btn active" onclick="switchSettingsTab('profile')">👤 Mi Perfil ${googleIcon}</button>
                <button class="settings-menu-btn" onclick="switchSettingsTab('appearance')">🎨 Apariencia</button>
                ${!isGoogleUser ? `<button class="settings-menu-btn" onclick="switchSettingsTab('security')">🔒 Seguridad</button>` : ''}
                <button class="settings-menu-btn" onclick="switchSettingsTab('shipping')">🚚 Datos de Envío</button>
            </div>
            
            <div class="settings-content">
                <!-- SECCIÓN PERFIL -->
                <div id="tab-profile" class="settings-section active">
                    <div class="settings-header">
                        <h2>Información Personal</h2>
                        <p>Actualiza tu información básica de identificación.</p>
                    </div>

                    <div class="avatar-section">
                        <img src="${currentUser.picture || 'https://ui-avatars.com/api/?name=' + currentUser.name}" id="avatar-img" class="avatar-preview">
                        <div>
                            <label for="avatar-input" class="avatar-btn">Cambiar foto de perfil</label>
                            <input type="file" id="avatar-input" accept="image/*" style="display: none;" onchange="handleAvatarUpload(this)">
                            <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #6b7280;">Recomendado: Cuadrada, máx 2MB.</p>
                        </div>
                    </div>

                    <form onsubmit="handleUpdateProfile(event)">
                        <div class="form-group">
                            <label>Nombre Completo ${googleIcon}</label>
                            <input type="text" id="profile-name" value="${currentUser.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Correo Electrónico</label>
                            <input type="email" value="${currentUser.email || ''}" readonly title="El correo no se puede cambiar">
                            <small style="color: #6b7280; display: block; margin-top: 5px;">Para cambiar tu correo, contacta con soporte.</small>
                        </div>
                        <button type="submit" class="btn-save">Guardar Cambios</button>
                    </form>

                    <!-- ZONA DE PELIGRO -->
                    <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #fee2e2;">
                        <h3 style="color: #991b1b; font-size: 1.1rem; margin-top: 0;">Zona de Peligro</h3>
                        <p style="color: #7f1d1d; font-size: 0.9rem; margin-bottom: 1rem;">
                            Si eliminas tu cuenta, perderás acceso a tu historial y perfil. Esta acción es irreversible.
                        </p>
                        <button type="button" onclick="handleDeleteAccount()" class="btn-save" style="background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; width: auto;">
                            Eliminar Cuenta Permanentemente
                        </button>
                    </div>
                </div>

                <!-- SECCIÓN APARIENCIA -->
                <div id="tab-appearance" class="settings-section">
                    <div class="settings-header">
                        <h2>Apariencia</h2>
                        <p>Personaliza cómo se ve la tienda en tu dispositivo.</p>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px; background: transparent;">
                        <div>
                            <strong style="display: block; font-size: 1.1rem; margin-bottom: 4px;">Modo Oscuro</strong>
                            <span style="color: #6b7280; font-size: 0.9rem;">Cambia el tema visual de la página a colores oscuros.</span>
                        </div>
                        <label class="switch" style="position: relative; display: inline-block; width: 60px; height: 34px;">
                            <input type="checkbox" id="dark-mode-toggle" onchange="window.toggleDarkMode(this.checked)" style="opacity: 0; width: 0; height: 0;" ${localStorage.getItem('lvs_dark_mode') === 'true' ? 'checked' : ''}>
                            <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px;"></span>
                            <span class="slider-dot" style="position: absolute; height: 26px; width: 26px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
                        </label>
                    </div>
                </div>

                <!-- SECCIÓN SEGURIDAD -->
                ${!isGoogleUser ? `
                <div id="tab-security" class="settings-section">
                    <div class="settings-header">
                        <h2>Contraseña y Seguridad</h2>
                        <p>Gestiona tu clave de acceso para mantener tu cuenta segura.</p>
                    </div>
                    <form onsubmit="handleChangePassword(event)">
                        <div class="form-group">
                            <label>Contraseña Actual</label>
                            <input type="password" id="current-pass" placeholder="••••••••" required>
                        </div>
                        <div class="form-group">
                            <label>Nueva Contraseña</label>
                            <input type="password" id="new-pass" placeholder="Mínimo 6 caracteres" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Confirmar Nueva Contraseña</label>
                            <input type="password" id="confirm-pass" placeholder="Repite la nueva contraseña" required>
                        </div>
                        <button type="submit" class="btn-save">Actualizar Contraseña</button>
                    </form>
                </div>
                ` : ''}

                <!-- SECCIÓN ENVÍO -->
                <div id="tab-shipping" class="settings-section">
                    <div class="settings-header">
                        <h2>Datos de Envío Predeterminados</h2>
                        <p>Estos datos se rellenarán automáticamente al realizar una compra.</p>
                    </div>
                    <form onsubmit="saveShippingInfo(event)">
                        <div class="form-group">
                            <label>Teléfono de Contacto</label>
                            <input type="tel" id="shipping-phone" placeholder="Ej: 0991234567">
                        </div>
                        <div class="form-group">
                            <label>Dirección Principal (Calle y Número)</label>
                            <input type="text" id="shipping-address" placeholder="Ej: Av. Principal 123">
                        </div>
                        <div style="background-color: #f0fdf4; color: #166534; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.9rem;">
                            💡 <strong>Nota:</strong> Estos datos se guardan solo en este dispositivo para agilizar tus compras.
                        </div>
                        <button type="submit" class="btn-save">Guardar Preferencias</button>
                    </form>
                </div>
            </div>
        </div>
    `;
}

window.switchSettingsTab = function(tabName) {
    // Botones
    document.querySelectorAll('.settings-menu-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Secciones
    document.querySelectorAll('.settings-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

window.toggleDarkMode = function(isDark) {
    if (isDark) {
        localStorage.setItem('lvs_dark_mode', 'true');
        document.documentElement.classList.add('dark-mode');
    } else {
        localStorage.setItem('lvs_dark_mode', 'false');
        document.documentElement.classList.remove('dark-mode');
    }

    // Guardar en la base de datos de manera silenciosa si hay sesión
    if (currentUser) {
        fetch('/api/auth/preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ darkMode: isDark })
        }).catch(e => console.error('Error guardando preferencia:', e));
    }
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const name = document.getElementById('profile-name').value;
    
    try {
        const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        
        if (res.ok) {
            Swal.fire('¡Actualizado!', 'Tu perfil ha sido actualizado.', 'success');
            // Actualizar nombre en el header si existe
            const headerName = document.querySelector('.user-info p');
            if(headerName) headerName.textContent = name;
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    const currentPass = document.getElementById('current-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if (newPass !== confirmPass) {
        return Swal.fire('Error', 'Las contraseñas nuevas no coinciden.', 'warning');
    }

    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
        });
        const data = await res.json();

        if (res.ok) {
            Swal.fire('¡Éxito!', 'Tu contraseña ha sido cambiada.', 'success');
            e.target.reset(); // Limpiar formulario
        } else {
            Swal.fire('Error', data.message, 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
    }
}

function loadShippingInfo() {
    if (!currentUser) return;
    const savedInfo = JSON.parse(localStorage.getItem(`shippingInfo-${currentUser.email}`));
    if (savedInfo) {
        const phoneEl = document.getElementById('shipping-phone');
        const addrEl = document.getElementById('shipping-address');
        if(phoneEl) phoneEl.value = savedInfo.phone || '';
        if(addrEl) addrEl.value = savedInfo.address || '';
    }
}

window.saveShippingInfo = function(e) {
    e.preventDefault();
    if (!currentUser) return;

    const shippingInfo = {
        phone: document.getElementById('shipping-phone').value,
        address: document.getElementById('shipping-address').value
    };

    localStorage.setItem(`shippingInfo-${currentUser.email}`, JSON.stringify(shippingInfo));
    Swal.fire('Guardado', 'Tus datos de envío predeterminados se han guardado localmente.', 'success');
}

window.handleAvatarUpload = async function(input) {
    const file = input.files[0];
    if (!file) return;

    // VALIDACIÓN: Solo permitir imágenes
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        Swal.fire('Formato no válido', 'Por favor selecciona una imagen JPG o PNG.', 'warning');
        input.value = ''; // Limpiar el input
        return;
    }

    // VALIDACIÓN: Tamaño máximo 2MB
    if (file.size > 2 * 1024 * 1024) { // 2MB en bytes
        Swal.fire('Archivo muy pesado', 'La imagen no puede pesar más de 2MB.', 'warning');
        input.value = '';
        return;
    }

    // INICIO DEL RECORTE
    // En lugar de comprimir directo, primero abrimos el recortador
    const croppedBase64 = await promptCrop(file, 1); // 1 = Relación de aspecto Cuadrada (1:1)
    if (!croppedBase64) return; // Si el usuario canceló

    try {
        // Mostrar cargando
        const preview = document.getElementById('avatar-img');
        const originalSrc = preview.src;
        preview.style.opacity = '0.5';

        // Ya tenemos la imagen recortada y comprimida desde promptCrop

        // Enviar al servidor
        const res = await fetch('/api/auth/profile-picture', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ picture: croppedBase64 })
        });

        if (res.ok) {
            const data = await res.json();
            preview.src = data.picture;
            // Actualizar también el icono del header si es visible
            const headerIcon = document.querySelector('.profile-icon img');
            if (headerIcon) headerIcon.src = data.picture;
            Swal.fire('¡Foto actualizada!', 'Tu foto de perfil se ha guardado correctamente.', 'success');
        } else {
            throw new Error('Error al subir la imagen');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo actualizar la foto. Intenta con una imagen más pequeña.', 'error');
    } finally {
        document.getElementById('avatar-img').style.opacity = '1';
        input.value = ''; // Limpiar input
    }
}

window.handleDeleteAccount = async function() {
    const result = await Swal.fire({
        title: '¿Estás absolutamente seguro?',
        text: "Esta acción no se puede deshacer. Tu cuenta y tus datos personales serán borrados permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626', // Rojo intenso
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar mi cuenta',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
            if (res.ok) {
                await Swal.fire('Cuenta Eliminada', 'Lamentamos que te vayas. Tu cuenta ha sido borrada.', 'success');
                window.location.href = 'index.html';
            } else {
                Swal.fire('Error', 'No se pudo eliminar la cuenta. Inténtalo más tarde.', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Error de conexión.', 'error');
        }
    }
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Redimensionar a máximo 300x300 para perfil (ahorra mucho espacio)
                const MAX_SIZE = 300;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Comprimir a JPEG calidad 0.8
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// --- SISTEMA DE RECORTE (CROPPER.JS) ---

async function promptCrop(file, aspectRatio = NaN) {
    // 1. Cargar librería dinámicamente si no existe
    if (!document.getElementById('cropper-css')) {
        const link = document.createElement('link'); link.id = 'cropper-css'; link.rel = 'stylesheet'; link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css'; document.head.appendChild(link);
    }
    if (typeof Cropper === 'undefined') {
        await new Promise(resolve => {
            const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js'; 
            script.onload = resolve; document.head.appendChild(script);
        });
    }

    // 2. Crear Modal si no existe
    if (!document.getElementById('crop-modal')) {
        const modal = document.createElement('div');
        modal.id = 'crop-modal';
        modal.style.cssText = "display:none; position:fixed; z-index:10000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.95); flex-direction:column; align-items:center; justify-content:center;";
        modal.innerHTML = `
            <div style="position:relative; width:90%; height:80%; max-width:800px; background:#000; display:flex; justify-content:center; align-items:center; border-radius:8px; overflow:hidden;">
                <img id="crop-image-target" style="max-width:100%; max-height:100%; display:block;">
            </div>
            <div style="margin-top:20px; display:flex; gap:15px; z-index:10001;">
                <button onclick="closeCropModal(false)" style="background:#ef4444; color:white; padding:12px 24px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:1rem;">Cancelar</button>
                <button onclick="closeCropModal(true)" style="background:#10b981; color:white; padding:12px 24px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:1rem;">✅ Recortar y Guardar</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 3. Iniciar lógica
    return new Promise((resolve) => {
        cropResolve = resolve;
        const modal = document.getElementById('crop-modal');
        const img = document.getElementById('crop-image-target');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target.result;
            modal.style.display = 'flex';
            if (cropInstance) cropInstance.destroy();
            cropInstance = new Cropper(img, { aspectRatio: aspectRatio, viewMode: 1, autoCropArea: 0.9 });
        };
        reader.readAsDataURL(file);
    });
}

window.closeCropModal = function(save) {
    document.getElementById('crop-modal').style.display = 'none';
    if (save && cropInstance) {
        const canvas = cropInstance.getCroppedCanvas({ width: 600, height: 600, imageSmoothingQuality: 'high' });
        const base64 = canvas.toDataURL('image/jpeg', 0.85); // Calidad alta pero optimizada
        if (cropResolve) cropResolve(base64);
    } else {
        if (cropResolve) cropResolve(null);
    }
    if (cropInstance) { cropInstance.destroy(); cropInstance = null; }
}

function fixPageFavicon() {
    const link = document.querySelector("link[rel*='icon']");
    if (!link || link.href.startsWith('data:')) return;
    const img = new Image();
    img.onload = () => {
        const size = 32; const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const aspect = img.width / img.height;
        let w=size, h=size, x=0, y=0;
        if(aspect > 1) { h=size/aspect; y=(size-h)/2; } else { w=size*aspect; x=(size-w)/2; }
        ctx.drawImage(img, x, y, w, h); link.href = canvas.toDataURL('image/png');
    }; img.src = link.href;
}