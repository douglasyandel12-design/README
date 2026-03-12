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