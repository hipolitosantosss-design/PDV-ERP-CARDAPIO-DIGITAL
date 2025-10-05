/* ===================================
   ARQUIVO: cardapio.js
   DESCRIÇÃO: Cardápio Digital com Sincronização
   =================================== */

// ===== DADOS =====
let DB = { products: [], clients: [], sales: [] };
let cart = [];
let currentCategory = 'todos';

// ===== STORAGE & SYNC =====
function loadFromStorage() {
    try {
        const stored = localStorage.getItem('pdv_data');
        if (stored) {
            const data = JSON.parse(stored);
            DB.products = data.products || [];
            DB.clients = data.clients || [];
            DB.sales = data.sales || [];
            return true;
        }
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
    }
    return false;
}

function saveToStorage() {
    try {
        const stored = localStorage.getItem('pdv_data');
        if (stored) {
            const data = JSON.parse(stored);
            data.clients = DB.clients;
            data.sales = DB.sales;
            localStorage.setItem('pdv_data', JSON.stringify(data));
        }
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
    }
}

// Sincronização automática a cada 2 segundos
let lastSync = Date.now();
setInterval(() => {
    const now = Date.now();
    if (now - lastSync > 2000) {
        const oldProductsLength = DB.products.length;
        loadFromStorage();
        
        // Se produtos mudaram, recarrega a visualização
        if (oldProductsLength !== DB.products.length) {
            renderProducts();
            updateSyncIndicator(true);
        }
        
        lastSync = now;
    }
}, 2000);

// Listener para mudanças no localStorage (sincroniza entre abas)
window.addEventListener('storage', (e) => {
    if (e.key === 'pdv_data') {
        loadFromStorage();
        renderProducts();
        updateSyncIndicator(true);
    }
});

// ===== INDICADOR DE SINCRONIZAÇÃO =====
function updateSyncIndicator(synced = true) {
    const indicator = document.getElementById('syncIndicator');
    if (synced) {
        indicator.textContent = '● Sincronizado';
        indicator.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
        setTimeout(() => {
            indicator.style.background = '#4CAF50';
        }, 2000);
    } else {
        indicator.textContent = '⟳ Sincronizando...';
        indicator.style.background = '#ff9800';
    }
}

// ===== HELPERS =====
function formatCurrency(value) {
    return parseFloat(value).toFixed(2).replace('.', ',');
}

function formatPhone(value) {
    let phone = value.replace(/\D/g, '');
    if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (phone.length === 10) {
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
}

function validateFullName(name) {
    return name.trim().split(' ').filter(p => p.length > 0).length >= 2;
}

// ===== RENDERIZAÇÃO DE PRODUTOS =====
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Filtrar produtos ativos e com estoque
    let filteredProducts = DB.products.filter(p => {
        const isActive = p.active !== false;
        const hasStock = p.stock > 0;
        const matchesCategory = currentCategory === 'todos' || p.category === currentCategory;
        const matchesSearch = filterBySearch(p);
        
        return isActive && hasStock && matchesCategory && matchesSearch;
    });

    if (filteredProducts.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:60px 20px;">
                <div style="font-size:48px; margin-bottom:20px;">🛒</div>
                <h3 style="color:#666; margin-bottom:10px;">Nenhum produto disponível</h3>
                <p style="color:#999;">Não há produtos nesta categoria no momento.</p>
            </div>
        `;
        return;
    }

    filteredProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const imageHTML = product.image 
            ? `<img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">`
            : `<div class="product-image-placeholder">
                 <span style="font-size:48px;">📦</span>
               </div>`;

        const descriptionHTML = product.description 
            ? `<span class="description-icon" data-description="${product.description.replace(/"/g, '&quot;')}" tabindex="0" role="button" aria-label="Ver descrição">i</span>`
            : '';

        card.innerHTML = `
            ${imageHTML}
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${product.name}</h3>
                    ${descriptionHTML}
                </div>
                <div class="product-footer">
                    <span class="product-price">R$ ${formatCurrency(product.price)}</span>
                    <button class="add-btn" onclick="addToCart(${product.id})" aria-label="Adicionar ${product.name} ao carrinho">
                        Adicionar
                    </button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });

    // Adicionar listener para tooltip com teclado
    document.querySelectorAll('.description-icon').forEach(icon => {
        icon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                icon.classList.toggle('active');
            }
        });
    });
}

function filterBySearch(product) {
    const searchInput = document.getElementById('searchProduct');
    if (!searchInput) return true;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (!searchTerm) return true;
    
    return product.name.toLowerCase().includes(searchTerm) ||
           (product.description && product.description.toLowerCase().includes(searchTerm)) ||
           (product.code && product.code.toLowerCase().includes(searchTerm));
}

// ===== CATEGORIAS =====
function initCategories() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    const categoryToggle = document.querySelector('.category-toggle');
    const categoryMenu = document.querySelector('.category-menu');
    const dropdown = document.querySelector('.category-dropdown');

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentCategory = btn.getAttribute('data-category');
            
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.getElementById('currentCategoryText').textContent = btn.textContent;
            categoryMenu?.classList.remove('show');
            
            renderProducts();
        });
    });

    // Toggle com suporte touch e hover
    categoryToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        categoryMenu?.classList.toggle('show');
    });

    // Hover para desktop
    if (window.matchMedia('(hover: hover)').matches) {
        dropdown?.addEventListener('mouseenter', () => {
            categoryMenu?.classList.add('show');
        });
        dropdown?.addEventListener('mouseleave', () => {
            categoryMenu?.classList.remove('show');
        });
    }

    // Fechar menu ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.category-dropdown')) {
            categoryMenu?.classList.remove('show');
        }
    });

    // Fechar ao pressionar ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            categoryMenu?.classList.remove('show');
        }
    });
}

// ===== BUSCA =====
function initSearch() {
    const searchInput = document.getElementById('searchProduct');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderProducts();
        });
    }
}

// ===== CARRINHO =====
function addToCart(productId) {
    const product = DB.products.find(p => p.id === productId);
    if (!product) {
        alert('Produto não encontrado!');
        return;
    }

    const cartItem = cart.find(item => item.id === productId);
    
    if (cartItem) {
        if (cartItem.quantity >= product.stock) {
            alert(`Estoque insuficiente! Disponível: ${product.stock} unidades`);
            return;
        }
        cartItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock
        });
    }
    
    renderCart();
    
    // Feedback visual
    const btn = event.target;
    btn.textContent = 'Adicionado!';
    btn.style.background = '#28a745';
    setTimeout(() => {
        btn.textContent = 'Adicionar';
        btn.style.background = '';
    }, 1000);
}

function updateCartQuantity(productId, change) {
    const cartItem = cart.find(item => item.id === productId);
    if (!cartItem) return;

    cartItem.quantity += change;

    if (cartItem.quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    if (cartItem.quantity > cartItem.maxStock) {
        alert(`Estoque insuficiente! Disponível: ${cartItem.maxStock} unidades`);
        cartItem.quantity = cartItem.maxStock;
    }

    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    renderCart();
}

function clearCart() {
    if (cart.length === 0) return;
    
    if (confirm('Deseja realmente limpar o carrinho?')) {
        cart = [];
        renderCart();
    }
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    const totalElement = document.getElementById('cartTotal');
    
    if (!container || !totalElement) return;

    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart">🛒 Carrinho vazio</div>';
        totalElement.textContent = '0,00';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-header">
                <div>
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">R$ ${formatCurrency(item.price)}</div>
                </div>
            </div>
            <div class="cart-item-controls">
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateCartQuantity(${item.id}, -1)" aria-label="Diminuir quantidade">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQuantity(${item.id}, 1)" aria-label="Aumentar quantidade">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})" aria-label="Remover ${item.name}">🗑️</button>
            </div>
            <div style="text-align:right;margin-top:8px;font-weight:bold;color:#5C4033;font-size:12px;">
                R$ ${formatCurrency(item.price * item.quantity)}
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalElement.textContent = formatCurrency(total);
}

// ===== CHECKOUT =====
function showCheckoutForm() {
    if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('checkoutTotal').textContent = formatCurrency(total);
    document.getElementById('checkoutModal').classList.add('active');
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('active');
}

// Aplicar máscara de telefone
document.getElementById('clientPhone')?.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length >= 11) {
        e.target.value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length >= 10) {
        e.target.value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (value.length >= 6) {
        e.target.value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length >= 2) {
        e.target.value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    } else {
        e.target.value = value;
    }
});

// ===== FINALIZAR PEDIDO =====
document.getElementById('checkoutForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const street = document.getElementById('clientStreet').value.trim();
    const number = document.getElementById('clientNumber').value.trim();
    const district = document.getElementById('clientDistrict').value.trim();
    const city = document.getElementById('clientCity').value.trim();
    const reference = document.getElementById('clientReference').value.trim();

    if (!validateFullName(name)) {
        alert('Por favor, informe nome e sobrenome completos!');
        return;
    }

    // Salvar ou atualizar cliente
    let client = DB.clients.find(c => c.phone === phone.replace(/\D/g, ''));
    if (!client) {
        client = {
            id: Date.now(),
            name,
            phone: phone.replace(/\D/g, ''),
            address: { street, number, district, city, reference }
        };
        DB.clients.push(client);
    } else {
        client.name = name;
        client.address = { street, number, district, city, reference };
    }

    // Registrar venda
    const sale = {
        id: Date.now(),
        date: new Date().toISOString(),
        clientId: client.id,
        items: cart.map(item => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
        })),
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        paymentMethod: 'pendente',
        user: 'Cardápio Digital'
    };

    DB.sales.push(sale);

    // Atualizar estoque
    cart.forEach(item => {
        const product = DB.products.find(p => p.id === item.id);
        if (product) {
            product.stock -= item.quantity;
        }
    });

    saveToStorage();

    // Gerar mensagem WhatsApp
    const whatsappMessage = generateWhatsAppMessage(client, cart, sale.total);
    const whatsappNumber = '5573988079359'; // ALTERE PARA SEU NÚMERO
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

    // Limpar carrinho e fechar modal
    cart = [];
    renderCart();
    closeCheckout();
    document.getElementById('checkoutForm').reset();

    // Abrir WhatsApp
    window.open(whatsappURL, '_blank');
});

function generateWhatsAppMessage(client, items, total) {
    let message = `🛒 *NOVO PEDIDO - CARDÁPIO DIGITAL*\n\n`;
    message += `👤 *Cliente:* ${client.name}\n`;
    message += `📱 *Telefone:* ${formatPhone(client.phone)}\n\n`;
    message += `📍 *Endereço de Entrega:*\n`;
    message += `${client.address.street}, ${client.address.number}\n`;
    message += `${client.address.district} - ${client.address.city}\n`;
    if (client.address.reference) {
        message += `Referência: ${client.address.reference}\n`;
    }
    message += `\n📦 *Itens do Pedido:*\n`;
    
    items.forEach(item => {
        message += `\n${item.quantity}x ${item.name}\n`;
        message += `R$ ${formatCurrency(item.price)} × ${item.quantity} = R$ ${formatCurrency(item.price * item.quantity)}\n`;
    });
    
    message += `\n💰 *TOTAL: R$ ${formatCurrency(total)}*\n\n`;
    message += `⏰ Pedido realizado em: ${new Date().toLocaleString('pt-BR')}`;
    
    return message;
}

// ===== INICIALIZAÇÃO =====
function init() {
    loadFromStorage();
    initCategories();
    initSearch();
    renderProducts();
    renderCart();
    
    console.log('✓ Cardápio Digital inicializado');
    console.log('✓ Produtos carregados:', DB.products.length);
    console.log('✓ Produtos ativos com estoque:', DB.products.filter(p => p.active !== false && p.stock > 0).length);
}

// Carregar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Expor funções globalmente
window.addToCart = addToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.showCheckoutForm = showCheckoutForm;
window.closeCheckout = closeCheckout;