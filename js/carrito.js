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
        // Lógica para mostrar precio original vs. rebajado
        const priceDisplay = (item.originalPrice && item.price < item.originalPrice)
            ? `<span style="text-decoration: line-through; color: #ef4444; margin-right: 4px;">$${item.originalPrice.toFixed(2)}</span> <strong style="color: #000;">$${item.price.toFixed(2)}</strong>`
            : `$${item.price.toFixed(2)}`;

        total += item.price * item.quantity;
        html += `
            <tr>
                <td>${item.name}</td>
                <td>${priceDisplay}</td>
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
        // Ya no obligamos a iniciar sesión, cualquiera puede comprar
        window.location.href = 'pedido.html';
    }
});

async function verifySession() {
    try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) return false;
        const data = await response.json();
        return !!data.user;
    } catch (error) {
        return false;
    }
}