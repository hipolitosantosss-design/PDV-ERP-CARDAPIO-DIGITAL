// ===== DATA =====
let cart = [];
let currentCategory = 'todos';
let products = [];
let lastDataHash = '';

const categoryNames = {
    todos: 'Todos',
    alimentos: 'Alimentos',
    bebidas: 'Bebidas',
    assados: 'Assados',
    frios: 'Frios',
    mercearia: 'Mercearia'
};

// ===== STORAGE =====
function generateDataHash(data) {
    return JSON.stringify(data);
}

function loadProducts() {
    const indicator = document.getElementById('syncIndicator');
    indicator.textContent = '● Sincronizando...';
    indicator.classList.add('syncing');
    
    try {
        const stored = localStorage.getItem('pdv_data');
        if (stored) {
            const data = JSON.parse(stored);
            const hash = generateDataHash(data.products);
            
            if (hash !== lastDataHash) {
                products = data.products || [];
                lastDataHash = hash;
                renderProducts();
                console.log('✓ Produtos atualizados:', products.length);
            }
        }
        
        indicator.textContent = '● Sincronizado';
        indicator.classList.remove('syncing');
    } catch (e) {
        console.error('Erro:', e);
        indicator.textContent = '● Erro';
        indicator.style.background = '#dc3545';
    }
}

setInterval(loadProducts, 500);

window.addEventListener('storage', (e) => {
    if (e.key === 'pdv_data') {
        console.log('✓ Mudança detectada');
        loadProducts();
    }
});

// ===== RENDER PRODUCTS =====
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
    
    let filtered = products.filter(p => {
        const matchCategory = currentCategory === 'todos' || p.category === currentCategory;
        const matchSearch = p.name.toLowerCase().includes(searchTerm) || 
                          (p.description && p.description.toLowerCase().includes(searchTerm));
        const isActive = p.active !== false;
        return matchCategory && matchSearch && isActive;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;color:#8B6F47;grid-column:1/-1;"><h2>Nenhum produto encontrado</h2></div>';
        return;
    }
    
    grid.innerHTML = filtered.map(p => {
        const available = p.stock > 0;
        const description = p.description || 'Nenhuma descrição detalhada disponível.';
        
        return `
            <div class="product-card ${!available ? 'unavailable' : ''}">
                ${p.image 
                    ? `<img src="${p.image}" class="product-image" alt="${p.name}">` 
                    : '<div class="product-image-placeholder">🍽️</div>'}
                <div class="product-info">
                    <span class="product-category">${categoryNames[p.category] || p.category}</span>
                    <div class="product-header">
                        <div class="product-name">${p.name}</div>
                        <span class="description-icon" data-description="${description}">&#9432;</span>
                    </div>
                    <div class="product-footer">
                        <div class="product-price">R$ ${p.price.toFixed(2)}</div>
                        ${available 
                            ? `<button class="add-btn" onclick="addToCart(${p.id})">Adicionar</button>` 
                            : '<span class="unavailable-label">Indisponível</span>'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== CATEGORY FILTER =====
document.querySelectorAll('.category-btn').forEach(btn => 
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        document.getElementById('currentCategoryText').textContent = categoryNames[currentCategory] || currentCategory;
        renderProducts();
    })
);

// ===== SEARCH =====
document.getElementById('searchProduct').addEventListener('input', renderProducts);

// ===== CART =====
window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock === 0) return;
    
    const cartItem = cart.find(i => i.id === productId);
    
    if (cartItem) {
        if (cartItem.quantity < product.stock) {
            cartItem.quantity++;
        } else {
            alert('Quantidade máxima disponível!');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock
        });
    }
    
    updateCartUI();
    showNotification(`${product.name} adicionado!`);
};

function updateCartUI() {
    const container = document.getElementById('cartItemsContainer');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart"><p>Seu carrinho está vazio</p></div>';
    } else {
        container.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-header">
                    <div>
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">R$ ${item.price.toFixed(2)} x ${item.quantity} = R$ ${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                </div>
                <div class="cart-item-controls">
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="decreaseQty(${index})">-</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button class="qty-btn" onclick="increaseQty(${index})">+</button>
                    </div>
                    <button class="remove-btn" onclick="removeItem(${index})">Remover</button>
                </div>
            </div>
        `).join('');
    }
    
    document.getElementById('cartTotal').textContent = total.toFixed(2);
    document.getElementById('checkoutTotal').textContent = total.toFixed(2);
}

window.increaseQty = function(index) {
    if (cart[index].quantity < cart[index].maxStock) {
        cart[index].quantity++;
        updateCartUI();
    } else {
        alert('Quantidade máxima!');
    }
};

window.decreaseQty = function(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
        updateCartUI();
    }
};

window.removeItem = function(index) {
    cart.splice(index, 1);
    updateCartUI();
    showNotification('Item removido');
};

window.clearCart = function() {
    if (cart.length === 0) return;
    if (confirm('Limpar carrinho?')) {
        cart = [];
        updateCartUI();
        showNotification('Carrinho limpo!');
    }
};

// ===== CHECKOUT =====
window.showCheckoutForm = function() {
    if (cart.length === 0) {
        alert('Carrinho vazio!');
        return;
    }
    document.getElementById('checkoutModal').classList.add('active');
};

window.closeCheckout = function() {
    document.getElementById('checkoutModal').classList.remove('active');
};

document.getElementById('checkoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const street = document.getElementById('clientStreet').value.trim();
    const number = document.getElementById('clientNumber').value.trim();
    const district = document.getElementById('clientDistrict').value.trim();
    const city = document.getElementById('clientCity').value.trim();
    const reference = document.getElementById('clientReference').value.trim();
    
    let message = `*🛒 NOVO PEDIDO - CARDÁPIO DIGITAL*\n\n`;
    message += `*👤 Cliente:* ${name}\n`;
    message += `*📱 Telefone:* ${phone}\n\n`;
    message += `*📍 Endereço:*\n`;
    message += `${street}, ${number} - ${district}\n`;
    message += `${city}`;
    
    if (reference) {
        message += `\n*Referência:* ${reference}`;
    }
    
    message += `\n\n*📝 ITENS DO PEDIDO:*\n`;
    
    const orderItems = cart.map(item => 
        `- ${item.quantity}x ${item.name} (R$ ${item.price.toFixed(2)}) = R$ ${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');
    
    message += orderItems + '\n\n';
    
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
    message += `*💵 TOTAL DO PEDIDO: R$ ${totalPrice}*`;
    
    const whatsappUrl = `https://wa.me/SEU_NUMERO_AQUI?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
});

// ===== NOTIFICATIONS =====
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = 'position:fixed;top:80px;right:20px;background:#28a745;color:white;padding:15px 25px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:3000;font-weight:600';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// ===== LOGO =====
function loadCompanyLogo() {
    const logoData = localStorage.getItem('company_logo');
    
    if (logoData) {
        let logoContainer = document.querySelector('.header-logo');
        if (!logoContainer) {
            logoContainer = document.createElement('div');
            logoContainer.className = 'header-logo';
            logoContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:1000;background:rgba(255,255,255,0.9);padding:10px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);';
            document.body.appendChild(logoContainer);
        }
        
        logoContainer.innerHTML = `<img src="${logoData}" alt="Logo" style="max-width:150px;max-height:80px;object-fit:contain;display:block;">`;
    }
}

loadCompanyLogo();

window.addEventListener('storage', (e) => {
    if (e.key === 'company_logo') {
        loadCompanyLogo();
    }
});