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

    container.innerHTML = `
        <div class="settings-layout">
            <div class="settings-sidebar">
                <button class="settings-menu-btn active" onclick="switchSettingsTab('profile')">👤 Mi Perfil</button>
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
                            <label>Nombre Completo</label>
                            <input type="text" id="profile-name" value="${currentUser.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Correo Electrónico</label>
                            <input type="email" value="${currentUser.email || ''}" readonly title="El correo no se puede cambiar">
                            <small style="color: #6b7280; display: block; margin-top: 5px;">Para cambiar tu correo, contacta con soporte.</small>
                        </div>
                        <button type="submit" class="btn-save">Guardar Cambios</button>
                    </form>
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