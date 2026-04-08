// --- SISTEMA DE MODO OSCURO GLOBAL ---
(function applyDarkMode(){const isDark=localStorage.getItem('lvs_dark_mode')==='true';if(isDark)document.documentElement.classList.add('dark-mode');if(!document.getElementById('dark-mode-styles')){const style=document.createElement('style');style.id='dark-mode-styles';style.innerHTML=`html.dark-mode body{background-color:#000 !important;color:#fff !important;}html.dark-mode header,html.dark-mode footer,html.dark-mode nav,html.dark-mode .settings-sidebar,html.dark-mode .settings-content,html.dark-mode .order-card,html.dark-mode .product-card,html.dark-mode .sp-media,html.dark-mode form,html.dark-mode .order-summary,html.dark-mode .product-modal-content,html.dark-mode .cart-content,html.dark-mode .pm-details,html.dark-mode .pm-image-container,html.dark-mode .accordion-header,html.dark-mode .hero{background-color:#0a0a0a !important;color:#fff !important;border-color:#222 !important;}html.dark-mode input,html.dark-mode select,html.dark-mode textarea{background-color:#111 !important;color:#fff !important;border-color:#333 !important;}html.dark-mode h1,html.dark-mode h2,html.dark-mode h3,html.dark-mode h4,html.dark-mode strong,html.dark-mode .product-title,html.dark-mode .pm-title,html.dark-mode .item-price,html.dark-mode .total-amount,html.dark-mode .order-value,html.dark-mode .sp-details h1{color:#fff !important;}html.dark-mode .logo{color:#fff !important;}html.dark-mode .btn-outline{color:#fff !important;border-color:#fff !important;background:transparent !important;}html.dark-mode .btn-outline:hover{background:#fff !important;color:#000 !important;}html.dark-mode .btn{background-color:#fff !important;color:#000 !important;border-color:#fff !important;}html.dark-mode .btn:hover{background-color:#ccc !important;border-color:#ccc !important;}html.dark-mode .settings-menu-btn{color:#aaa !important;border-color:#222 !important;background:transparent !important;}html.dark-mode .settings-menu-btn:hover,html.dark-mode .settings-menu-btn.active{background-color:#111 !important;color:#fff !important;border-left-color:#fff !important;}html.dark-mode .empty-state,html.dark-mode .order-header,html.dark-mode .accordion-content,html.dark-mode .cart-table th{background-color:#111 !important;border-color:#222 !important;color:#ccc !important;}html.dark-mode .track-line-bg{background:#333 !important;}html.dark-mode .step-counter{background:#111 !important;border-color:#333 !important;color:#666 !important;}html.dark-mode .stepper-item.active .step-counter{border-color:#fff !important;color:#fff !important;background:#000 !important;}html.dark-mode .stepper-item.completed .step-counter{background:#fff !important;border-color:#fff !important;color:#000 !important;}html.dark-mode .filter-btn{background-color:#111 !important;color:#aaa !important;border-color:#333 !important;}html.dark-mode .filter-btn:hover,html.dark-mode .filter-btn.active{background-color:#fff !important;color:#000 !important;border-color:#fff !important;}html.dark-mode .header-search-container input{background:#111 !important;border-color:#333 !important;color:#fff !important;}html.dark-mode .filter-chip{background:#111 !important;color:#aaa !important;border-color:#333 !important;}html.dark-mode .filter-chip.active{background:#fff !important;color:#000 !important;}html.dark-mode .dropdown-menu{background:#111 !important;border-color:#333 !important;}html.dark-mode .dropdown-menu a{color:#ccc !important;}html.dark-mode .dropdown-menu a:hover{background:#222 !important;color:#fff !important;}html.dark-mode .cart-table td,html.dark-mode .total-row,html.dark-mode .summary-row,html.dark-mode .item-row{border-color:#222 !important;}html.dark-mode .sp-media{background:transparent !important;}html.dark-mode .profile-info h2,html.dark-mode .profile-info p{color:#fff !important;}html.dark-mode .sp-description,html.dark-mode .pm-description{color:#ccc !important;}html.dark-mode div:where(.swal2-container) div:where(.swal2-popup){background-color:#111 !important;color:#fff !important;border:1px solid #333 !important;}html.dark-mode div:where(.swal2-title){color:#fff !important;}html.dark-mode div:where(.swal2-html-container){color:#ccc !important;}`;document.head.appendChild(style);}})();

function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.tab');
    const verifyForm = document.getElementById('verify-form');
    
    loginForm.classList.toggle('hidden', tab !== 'login');
    regForm.classList.toggle('hidden', tab !== 'register');
    if(verifyForm) verifyForm.classList.add('hidden'); // Ocultar verificación si se cambia de tab

    tabs[0].classList.toggle('active', tab === 'login');
    tabs[1].classList.toggle('active', tab === 'register');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });

        if (res.ok) {
            window.location.href = 'index.html'; // Vamos al inicio para ver el menú de Admin
        } else {
            const data = await res.json();
            if (data.error) document.getElementById('login-error').innerText = data.error;
            document.getElementById('login-error').style.display = 'block';
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const registerButton = e.target.querySelector('button');
    registerButton.disabled = true;
    registerButton.textContent = 'Enviando...';

    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password: pass })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al registrar la cuenta.');
        }

        // SI EL SERVIDOR PIDE VERIFICACIÓN
        if (data.requiresVerification) {
            // Ocultar tabs y formulario de registro
            document.querySelector('.tabs').style.display = 'none';
            document.getElementById('register-form').classList.add('hidden');
            
            // Mostrar formulario de verificación
            const verifyForm = document.getElementById('verify-form');
            verifyForm.classList.remove('hidden');
            
            // Poner email en el texto
            document.getElementById('verify-email-display').textContent = data.email;
            
            // Guardar email temporalmente para el envío del código
            window.tempRegisterEmail = data.email;
        } else {
            alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
            switchTab('login');
        }

    } catch (error) {
        console.error('Error en el registro:', error);
        alert(error.message);
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = 'Crear Cuenta';
    }
}

async function handleVerification(e) {
    e.preventDefault();
    const code = document.getElementById('verify-code').value;
    const email = window.tempRegisterEmail;

    try {
        const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await res.json();

        if (res.ok) {
            alert('✅ ' + data.message);
            window.location.href = 'index.html'; // Entrar directamente
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('Error de conexión verificando el código.');
    }
}

// Fix Favicon Aspect Ratio
(function() {
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
})();