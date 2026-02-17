let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();

        if (!data.user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = data.user;
        loadShippingInfo();
    } catch (error) {
        console.error('Error al cargar la sesión:', error);
        alert('No se pudo cargar tu información. Por favor, inicia sesión de nuevo.');
        window.location.href = 'login.html';
    }
});

function loadShippingInfo() {
    if (!currentUser) return;
    const savedInfo = JSON.parse(localStorage.getItem(`shippingInfo-${currentUser.email}`));
    if (savedInfo) {
        document.getElementById('shipping-phone').value = savedInfo.phone || '';
        document.getElementById('shipping-address').value = savedInfo.address || '';
    }
}

function saveShippingInfo(e) {
    e.preventDefault();
    if (!currentUser) return;

    const shippingInfo = {
        phone: document.getElementById('shipping-phone').value,
        address: document.getElementById('shipping-address').value
    };

    localStorage.setItem(`shippingInfo-${currentUser.email}`, JSON.stringify(shippingInfo));
    alert('¡Configuración de envío guardada!');
}