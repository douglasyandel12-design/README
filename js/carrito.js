let cart = JSON.parse(localStorage.getItem('lvs_cart')) || [];
const container = document.getElementById('cart-container');
const summary = document.getElementById('cart-summary');
const totalEl = document.getElementById('total-amount');

function renderCart() {
    if (cart.length === 0) {
        container.innerHTML = '<p>No hay productos en el carrito.</p>';
        summary.style.display = 'none';
        return;
    }
    
    // Asegurar compatibilidad
    cart = cart.map(item => item.quantity ? item : { ...item, quantity: 1 });

    let html = `
        <table class="cart-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
    `;

    let total = 0;
    cart.forEach((item, index) => {
        total += item.price * item.quantity;
        html += `
            <tr>
                <td>${item.name}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td><button class="btn btn-danger" onclick="removeItem(${index})">Eliminar</button></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
    totalEl.textContent = '$' + total.toFixed(2);
    summary.style.display = 'block';
}

function removeItem(index) {
    cart.splice(index, 1);
    localStorage.setItem('lvs_cart', JSON.stringify(cart));
    renderCart();
}

function clearCart() {
    cart = [];
    localStorage.setItem('lvs_cart', JSON.stringify(cart));
    renderCart();
}

renderCart();

// Manejar clic en "Proceder al Pago"
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('#checkout-btn');
    if (btn) {
        e.preventDefault();
        
        const isLogged = await verifySession();
        if (isLogged) {
            window.location.href = 'pedido.html';
        } else {
            Swal.fire({
                title: 'Inicia Sesión',
                text: 'Para finalizar la compra, por favor inicia sesión.',
                icon: 'info',
                confirmButtonText: 'Ir a Iniciar Sesión',
                confirmButtonColor: '#000000',
                showCancelButton: true,
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) window.location.href = 'login.html';
            });
        }
    }
});

async function verifySession() {
    try {
        const response = await fetch('/.netlify/functions/api/auth/status');
        if (!response.ok) return false;
        const data = await response.json();
        return !!data.user;
    } catch (error) {
        return false;
    }
}