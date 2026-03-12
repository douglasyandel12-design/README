let cart = JSON.parse(localStorage.getItem('lvs_cart')) || [];
const container = document.getElementById('cart-container');
const summary = document.getElementById('cart-summary');
const totalEl = document.getElementById('total-amount');
let globalSettings = {};

// Inyectar estilos de alerta si no existen (para página dedicada de carrito)
if (!document.getElementById('swal-custom-style')) {
    const style = document.createElement('style');
    style.id = 'swal-custom-style';
    style.innerHTML = `
        div:where(.swal2-container) {
            z-index: 9999 !important;
        }
        div:where(.swal2-container) div:where(.swal2-popup) {
            border-radius: 12px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            padding: 2rem !important;
            background: #ffffff !important;
            color: #1f2937 !important;
            border: 1px solid #e5e7eb !important;
            font-family: system-ui, -apple-system, sans-serif !important;
        }
        div:where(.swal2-title) {
            font-size: 1.5rem !important;
            font-weight: 700 !important;
            color: #111827 !important;
        }
        div:where(.swal2-html-container) {
            font-size: 1rem !important;
            color: #4b5563 !important;
        }
        div:where(.swal2-confirm) {
            background-color: #2563eb !important;
            color: #ffffff !important;
            border-radius: 6px !important;
            padding: 0.75rem 1.5rem !important;
            font-weight: 600 !important;
            border: 1px solid transparent !important;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2) !important;
        }
        div:where(.swal2-cancel) {
            background-color: #ef4444 !important;
            color: #ffffff !important;
            border: 1px solid #ef4444 !important;
            border-radius: 6px !important;
            padding: 0.75rem 1.5rem !important;
            font-weight: 600 !important;
        }
        div:where(.swal2-cancel):hover {
            background-color: #dc2626 !important;
            border-color: #dc2626 !important;
        }
        div:where(.swal2-icon) {
            border-color: #e5e7eb !important;
        }
    `;
    document.head.appendChild(style);
}

// Cargar configuración para saber cuál es el producto en promo
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            globalSettings = await res.json();
            renderCart();
        }
        
        // Verificar sesión y sincronizar carrito
        const authRes = await fetch('/api/auth/status');
        if (authRes.ok) {
            const authData = await authRes.json();
            window.currentUser = authData.user;
            
            if (window.currentUser) {
                const cartRes = await fetch('/api/cart');
                if (cartRes.ok) {
                    const serverCart = await cartRes.json();
                    // Sincronizar: Si servidor tiene datos, ganan. Si no, subimos lo local.
                    if (serverCart && serverCart.length > 0) {
                        cart = serverCart;
                        localStorage.setItem('lvs_cart', JSON.stringify(cart));
                        renderCart();
                    } else if (cart.length > 0) {
                        saveCart(); // Subir local a nube
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

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

        const isPromo = globalSettings.promo_product_id && item.id == globalSettings.promo_product_id;
        const promoMsg = (isPromo && item.price < item.originalPrice) 
            ? `<br><small style="color: #d97706; font-weight: bold;">🔥 ¡Descuento progresivo aplicado!</small>` 
            : '';

        total += item.price * item.quantity;
        html += `
            <tr>
                <td>
                    ${item.name}
                    ${promoMsg}
                </td>
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
    saveCart();
    renderCart();
}

function clearCart() {
    Swal.fire({
        title: '¿Vaciar carrito?',
        text: "Se eliminarán todos los productos seleccionados.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, vaciar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            cart = [];
            saveCart();
            renderCart();
            Swal.fire({ title: '¡Listo!', text: 'Tu carrito ha sido vaciado.', icon: 'success', confirmButtonText: 'Ok' });
        }
    });
}

function saveCart() {
    localStorage.setItem('lvs_cart', JSON.stringify(cart));
    if (window.currentUser) {
        fetch('/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart })
        }).catch(console.error);
    }
}

renderCart();
loadSettings();

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