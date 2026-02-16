function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.tab');
    
    loginForm.classList.toggle('hidden', tab !== 'login');
    regForm.classList.toggle('hidden', tab !== 'register');
    tabs[0].classList.toggle('active', tab === 'login');
    tabs[1].classList.toggle('active', tab === 'register');
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    try {
        const res = await fetch('/.netlify/functions/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });

        if (res.ok) {
            window.location.href = 'index.html'; // Vamos al inicio para ver el menú de Admin
        } else {
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
        const response = await fetch('/.netlify/functions/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password: pass })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al registrar la cuenta.');
        }

        alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
        switchTab('login'); // Cambiar a la pestaña de login

    } catch (error) {
        console.error('Error en el registro:', error);
        alert(error.message);
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = 'Crear Cuenta';
    }
}