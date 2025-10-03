// ===== DATABASE =====
const DB = {
    users: [],
    clients: [],
    products: [],
    sales: [],
    expenses: [],
    currentUser: null,
    cart: []
};

// ===== STORAGE =====
function loadFromStorage() {
    try {
        const stored = localStorage.getItem('pdv_data');
        if (stored) {
            const data = JSON.parse(stored);
            Object.assign(DB, {
                users: data.users || [],
                clients: data.clients || [],
                products: data.products || [],
                sales: data.sales || [],
                expenses: data.expenses || []
            });
        }
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
    }
}

function saveToStorage() {
    try {
        const { users, clients, products, sales, expenses } = DB;
        localStorage.setItem('pdv_data', JSON.stringify({ users, clients, products, sales, expenses }));
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
    }
}

window.DB = DB;
window.saveToStorage = saveToStorage;

// ===== INICIALIZAÇÃO =====
function initializeDB() {
    loadFromStorage();
    
    if (DB.users.length === 0) {
        DB.users.push({
            id: 1,
            name: 'Administrador Sistema',
            username: 'admin',
            password: 'admin123',
            isAdmin: true,
            secretQuestion: 'pet',
            secretAnswer: 'rex'
        });
        saveToStorage();
    }

    if (DB.products.length === 0) {
        DB.products.push(
            { id: 1, name: 'Café Puro', code: '001', description: 'Café preparado com grãos classe 1 moído na hora', price: 9.00, stock: 5, active: true },
            { id: 2, name: 'Água de coco', code: '002', description: 'Água de coco em garrafa 200ML', price: 8.00, stock: 20, active: true },
            { id: 3, name: 'Frango Assado inteiro', code: '003', description: 'Frango assado inteiro, o melhor tempero, sabor Beulah', price: 55.00, stock: 70, active: true },
            { id: 4, name: 'Coxa de Frango Assado', code: '004', description: '10 coxas de frango assado, melhor tempero, sabor Beulah', price: 55.00, stock: 30, active: true }
        );
        saveToStorage();
    }
}

// ===== HELPERS =====
const showScreen = screenId => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
};

const showPage = pageId => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.querySelector(`[data-page="${pageId.replace('Page', '')}"]`)?.classList.add('active');
};

function showAlert(message, type = 'success') {
    document.querySelectorAll('.alert').forEach(alert => alert.remove());

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const insertPoint = document.querySelector('.content') || document.querySelector('.login-box') || document.body;
    insertPoint.insertBefore(alertDiv, insertPoint.firstChild);
    
    setTimeout(() => alertDiv.remove(), 3000);
}

const validateFullName = name => name.trim().split(' ').filter(p => p.length > 0).length >= 2;

// ===== LOGO =====
function loadCompanyLogo() {
    const logoData = localStorage.getItem('company_logo');
    const loginContainer = document.getElementById('loginLogoContainer');
    const sidebarContainer = document.getElementById('sidebarLogoContainer');
    
    if (logoData) {
        if (loginContainer) {
            loginContainer.innerHTML = `<img src="${logoData}" alt="Logo" style="max-width:150px;max-height:80px;object-fit:contain;">`;
        }
        if (sidebarContainer) {
            sidebarContainer.innerHTML = `<img src="${logoData}" alt="Logo" style="max-width:120px;max-height:60px;object-fit:contain;margin-bottom:10px;">`;
        }
    } else {
        if (loginContainer) loginContainer.innerHTML = '<h1 style="color:#5C4033;">PDV</h1>';
    }
}

window.loadCompanyLogo = loadCompanyLogo;

window.addEventListener('storage', (e) => {
    if (e.key === 'company_logo') loadCompanyLogo();
});

// ===== AUTENTICAÇÃO =====
document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!username || !password) {
        showAlert('Preencha todos os campos.', 'error');
        return;
    }

    const user = DB.users.find(u => u.username === username && u.password === password);
    
    if (user) {
        DB.currentUser = user;
        document.getElementById('currentUser').textContent = user.name;
        
        if (user.isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('show'));
        }
        
        document.getElementById('loginForm').reset();
        showScreen('pdvScreen');
        loadProducts();
        loadClients();
        loadClientesSelect();
        showAlert('Login realizado com sucesso!', 'success');
    } else {
        showAlert('Usuário ou senha incorretos!', 'error');
    }
});

// ===== CADASTRO =====
document.getElementById('showRegisterLink').addEventListener('click', e => {
    e.preventDefault();
    showScreen('registerScreen');
});

document.getElementById('backToLogin').addEventListener('click', () => {
    showScreen('loginScreen');
    document.getElementById('registerForm').reset();
});

document.getElementById('registerForm').addEventListener('submit', e => {
    e.preventDefault();
    
    const name = document.getElementById('regName').value.trim();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const secretQuestion = document.getElementById('regSecretQuestion').value;
    const secretAnswer = document.getElementById('regSecretAnswer').value.toLowerCase().trim();
    
    if (!validateFullName(name)) {
        showAlert('Por favor, informe nome e sobrenome completos!', 'error');
        return;
    }
    
    if (DB.users.find(u => u.username === username)) {
        showAlert('Usuário já existe!', 'error');
        return;
    }
    
    DB.users.push({
        id: Date.now(),
        name,
        username,
        password,
        isAdmin: false,
        secretQuestion,
        secretAnswer
    });
    
    saveToStorage();
    showAlert('Usuário cadastrado com sucesso!', 'success');
    
    setTimeout(() => {
        showScreen('loginScreen');
        document.getElementById('registerForm').reset();
    }, 1500);
});

// ===== RECUPERAÇÃO DE SENHA =====
document.getElementById('showRecoveryLink').addEventListener('click', e => {
    e.preventDefault();
    showScreen('recoveryScreen');
    document.getElementById('recoveryForm').reset();
    document.getElementById('recSecretQuestion').disabled = true;
    document.getElementById('recAnswer').disabled = true;
    document.getElementById('checkAnswerBtn').disabled = true;
    document.getElementById('newPasswordGroup').style.display = 'none';
    document.getElementById('changePasswordBtn').style.display = 'none';
    document.getElementById('checkAnswerBtn').style.display = 'inline-block';
});

document.getElementById('backToLoginFromRecovery').addEventListener('click', () => {
    showScreen('loginScreen');
    document.getElementById('recoveryForm').reset();
});

document.getElementById('recUsername').addEventListener('input', e => {
    const username = e.target.value.trim();
    const user = DB.users.find(u => u.username === username);
    
    document.getElementById('recAnswer').value = '';
    document.getElementById('newPasswordGroup').style.display = 'none';
    document.getElementById('changePasswordBtn').style.display = 'none';
    document.getElementById('checkAnswerBtn').style.display = 'inline-block';
    
    if (user) {
        document.getElementById('recSecretQuestion').value = user.secretQuestion;
        document.getElementById('recSecretQuestion').disabled = false;
        document.getElementById('recAnswer').disabled = false;
        document.getElementById('checkAnswerBtn').disabled = false;
    } else {
        document.getElementById('recSecretQuestion').value = '';
        document.getElementById('recSecretQuestion').disabled = true;
        document.getElementById('recAnswer').disabled = true;
        document.getElementById('checkAnswerBtn').disabled = true;
    }
});

document.getElementById('checkAnswerBtn').addEventListener('click', () => {
    const username = document.getElementById('recUsername').value.trim();
    const answer = document.getElementById('recAnswer').value.toLowerCase().trim();
    
    if (!username || !answer) {
        showAlert('Preencha o usuário e a resposta.', 'error');
        return;
    }

    const user = DB.users.find(u => u.username === username);
    
    if (user && user.secretAnswer === answer) {
        document.getElementById('newPasswordGroup').style.display = 'block';
        document.getElementById('changePasswordBtn').style.display = 'inline-block';
        document.getElementById('checkAnswerBtn').style.display = 'none';
        showAlert('Resposta correta! Digite a nova senha.', 'success');
    } else {
        showAlert('Usuário ou resposta incorretos!', 'error');
    }
});

document.getElementById('recoveryForm').addEventListener('submit', e => {
    e.preventDefault();
    
    const username = document.getElementById('recUsername').value.trim();
    const newPassword = document.getElementById('recNewPassword').value.trim();
    
    if (!newPassword) {
        showAlert('A nova senha não pode estar vazia!', 'error');
        return;
    }
    
    const user = DB.users.find(u => u.username === username);
    if (user) {
        user.password = newPassword;
        saveToStorage();
        showAlert('Senha alterada com sucesso!', 'success');
        
        setTimeout(() => {
            showScreen('loginScreen');
            document.getElementById('recoveryForm').reset();
        }, 1500);
    }
});

// ===== LOGOUT =====
document.getElementById('logoutBtn').addEventListener('click', () => {
    DB.currentUser = null;
    DB.cart = [];
    document.getElementById('loginForm').reset();
    showScreen('loginScreen');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('show'));
    showPage('vendaPage');
});

// ===== NAVEGAÇÃO =====
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        const page = e.target.getAttribute('data-page');
        
        if (page === 'admin') {
            window.open('admin.html', 'AdminWindow', 'width=1200,height=800');
        } else {
            showPage(page + 'Page');
        }
    });
});

// ===== PRODUTOS =====
function loadProducts() {
    const container = document.getElementById('productsList');
    container.innerHTML = '';
    
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
    const filteredProducts = DB.products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        (p.code && p.code.toLowerCase().includes(searchTerm)) ||
        (p.description && p.description.toLowerCase().includes(searchTerm))
    );
    
    filteredProducts.forEach(product => {
        const isActive = product.active !== false;
        const isAvailable = product.stock > 0 && isActive;
        
        const div = document.createElement('div');
        div.className = `product-item ${!isAvailable ? 'unavailable' : ''}`;
        div.innerHTML = `
            <div class="product-info">
                <h4>${product.name}</h4>
                <p>${product.code ? `Código: ${product.code} | ` : ''}Estoque: ${product.stock} unidades</p>
                ${product.description ? `<p style="font-style: italic;">${product.description}</p>` : ''}
                ${!isActive ? '<p style="color: red; font-weight: bold;">PRODUTO INATIVO</p>' : ''}
            </div>
            <div>
                <div class="product-price">R$ ${product.price.toFixed(2)}</div>
                ${isAvailable ? `<button class="btn btn-primary btn-small" onclick="addToCart(${product.id})">Adicionar</button>` : '<span style="color: red;">Indisponível</span>'}
            </div>
        `;
        container.appendChild(div);
    });
}

document.getElementById('searchProduct').addEventListener('input', loadProducts);

window.addToCart = function(productId) {
    const product = DB.products.find(p => p.id === productId);
    if (!product || product.stock === 0 || product.active === false) {
        showAlert('Produto indisponível.', 'error');
        return;
    }
    
    const cartItem = DB.cart.find(item => item.id === productId);
    
    if (cartItem) {
        if (cartItem.quantity < product.stock) {
            cartItem.quantity++;
        } else {
            showAlert('Quantidade máxima em estoque atingida!', 'error');
            return;
        }
    } else {
        DB.cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock
        });
    }
    
    updateCart();
    showAlert(`${product.name} adicionado ao carrinho!`, 'success');
};

function updateCart() {
    const container = document.getElementById('cartItems');
    container.innerHTML = '';
    
    let total = 0;
    
    DB.cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>R$ ${item.price.toFixed(2)} x ${item.quantity} = R$ ${itemTotal.toFixed(2)}</p>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="decreaseQty(${index})">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="increaseQty(${index})">+</button>
                <button class="btn btn-danger btn-small" onclick="removeFromCart(${index})">Remover</button>
            </div>
        `;
        container.appendChild(div);
    });
    
    document.getElementById('cartTotal').textContent = total.toFixed(2);
}

window.increaseQty = function(index) {
    const item = DB.cart[index];
    if (item.quantity < item.maxStock) {
        item.quantity++;
        updateCart();
    } else {
        showAlert('Quantidade máxima em estoque!', 'error');
    }
};

window.decreaseQty = function(index) {
    const item = DB.cart[index];
    if (item.quantity > 1) {
        item.quantity--;
        updateCart();
    } else {
        removeFromCart(index);
    }
};

window.removeFromCart = function(index) {
    DB.cart.splice(index, 1);
    updateCart();
    showAlert('Item removido do carrinho.', 'success');
};

document.getElementById('limparCarrinhoBtn').addEventListener('click', () => {
    DB.cart = [];
    updateCart();
    showAlert('Carrinho limpo.', 'success');
});

// ===== FINALIZAR VENDA =====
document.getElementById('finalizarVendaBtn').addEventListener('click', () => {
    if (DB.cart.length === 0) {
        showAlert('Carrinho vazio!', 'error');
        return;
    }
    
    const total = DB.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('modalTotal').textContent = total.toFixed(2);
    document.getElementById('vendaModal').classList.add('active');
    loadClientesSelect();
});

document.getElementById('cancelarVendaBtn').addEventListener('click', () => {
    document.getElementById('vendaModal').classList.remove('active');
});

document.getElementById('confirmarVendaBtn').addEventListener('click', () => {
    const clientId = document.getElementById('vendaCliente').value;
    const paymentMethod = document.getElementById('vendaPagamento').value;
    const totalVenda = DB.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    DB.sales.push({
        id: Date.now(),
        date: new Date().toISOString(),
        clientId: clientId || null,
        items: [...DB.cart],
        paymentMethod,
        total: totalVenda,
        user: DB.currentUser.name
    });
    
    DB.cart.forEach(cartItem => {
        const product = DB.products.find(p => p.id === cartItem.id);
        if (product) product.stock -= cartItem.quantity;
    });
    
    saveToStorage();
    showAlert(`Venda de R$ ${totalVenda.toFixed(2)} finalizada!`, 'success');
    
    DB.cart = [];
    updateCart();
    loadProducts();
    document.getElementById('vendaModal').classList.remove('active');
});

// ===== CLIENTES =====
function loadClients() {
    const container = document.getElementById('clientsList');
    container.innerHTML = '';
    
    const searchTerm = document.getElementById('searchClient').value.toLowerCase();
    const filteredClients = DB.clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm) ||
        c.phone.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm))
    );
    
    filteredClients.forEach(client => {
        const div = document.createElement('div');
        div.className = 'client-item';
        div.innerHTML = `
            <h4>${client.name}</h4>
            <p><strong>Telefone:</strong> ${client.phone}</p>
            <p><strong>E-mail:</strong> ${client.email}</p>
            ${client.address ? `<p><strong>Endereço:</strong> ${client.address}</p>` : ''}
            ${client.reference ? `<p><strong>Referência:</strong> ${client.reference}</p>` : ''}
        `;
        container.appendChild(div);
    });
}

function loadClientesSelect() {
    const select = document.getElementById('vendaCliente');
    select.innerHTML = '<option value="">Cliente não cadastrado</option>';
    
    DB.clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        select.appendChild(option);
    });
}

document.getElementById('searchClient').addEventListener('input', loadClients);

document.getElementById('showClientFormBtn').addEventListener('click', () => {
    document.getElementById('clientFormContainer').style.display = 'block';
});

document.getElementById('cancelClientBtn').addEventListener('click', () => {
    document.getElementById('clientFormContainer').style.display = 'none';
    document.getElementById('clientForm').reset();
});

document.getElementById('clientForm').addEventListener('submit', e => {
    e.preventDefault();
    
    const name = document.getElementById('clientName').value.trim();
    
    if (!validateFullName(name)) {
        showAlert('Por favor, informe nome e sobrenome completos!', 'error');
        return;
    }
    
    DB.clients.push({
        id: Date.now(),
        name,
        doc: document.getElementById('clientDoc').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        address: document.getElementById('clientAddress').value.trim(),
        reference: document.getElementById('clientReference').value.trim()
    });
    
    saveToStorage();
    showAlert('Cliente cadastrado com sucesso!', 'success');
    
    document.getElementById('clientForm').reset();
    document.getElementById('clientFormContainer').style.display = 'none';
    
    loadClients();
    loadClientesSelect();
});

// ===== INICIALIZAR =====
initializeDB();
loadCompanyLogo();