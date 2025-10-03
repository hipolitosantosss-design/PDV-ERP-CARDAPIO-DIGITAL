/* ===================================
   ARQUIVO: admin.js
   DESCRIÇÃO: Lógica do Painel Administrativo
   =================================== */

// ===== DATABASE =====
let DB = {users: [], clients: [], products: [], sales: [], expenses: []};

// ===== STORAGE =====
function loadFromStorage() {
    try {
        const stored = localStorage.getItem('pdv_data');
        if (stored) {
            const data = JSON.parse(stored);
            DB.users = data.users || [];
            DB.clients = data.clients || [];
            DB.products = data.products || [];
            DB.sales = data.sales || [];
            DB.expenses = data.expenses || [];
            return true;
        }
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
    }
    return false;
}

function saveToStorage() {
    try {
        localStorage.setItem('pdv_data', JSON.stringify(DB));
        if (window.opener && !window.opener.closed && window.opener.saveToStorage) {
            window.opener.saveToStorage();
        }
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
    }
}

function syncWithParent() {
    try {
        if (window.opener && !window.opener.closed && window.opener.DB) {
            DB = window.opener.DB;
            return true;
        }
    } catch (e) {
        console.error('Erro ao sincronizar:', e);
    }
    return false;
}

if (!syncWithParent()) loadFromStorage();

setInterval(() => {
    syncWithParent() ? refreshCurrentTab() : (loadFromStorage(), refreshCurrentTab());
}, 1000);

// ===== HELPERS =====
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    document.querySelector('.admin-content').insertBefore(alertDiv, document.querySelector('.admin-content').firstChild);
    setTimeout(() => alertDiv.remove(), 3000);
}

const categoryNames = {alimentos:'Alimentos',bebidas:'Bebidas',assados:'Assados',frios:'Frios',mercearia:'Mercearia'};

// ===== TABS =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(tab + 'Tab').classList.add('active');
        refreshCurrentTab();
    });
});

function refreshCurrentTab() {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (!activeBtn) return;
    const activeTab = activeBtn.getAttribute('data-tab');
    const tabActions = {produtos:loadProducts,despesas:loadExpenses,relatorio:loadSalesReport,financeiro:loadFinancial,usuarios:loadUsers,metadiaria:calculateDailyGoal};
    if (tabActions[activeTab]) tabActions[activeTab]();
}

// ===== PRODUTOS =====
document.getElementById('showProductFormBtn').addEventListener('click', () => {
    document.getElementById('productFormContainer').style.display = 'block';
});

document.getElementById('cancelProductBtn').addEventListener('click', () => {
    document.getElementById('productFormContainer').style.display = 'none';
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
});

document.getElementById('prodImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('imagePreview').src = event.target.result;
            document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('prodCode').value.trim().toUpperCase();
    if (DB.products.find(p => p.code === code)) {
        showAlert('Já existe um produto com este código!', 'error');
        return;
    }
    const imageFile = document.getElementById('prodImage').files[0];
    const saveProduct = (imgData) => {
        DB.products.push({
            id: Date.now(),
            name: document.getElementById('prodName').value.trim(),
            code: code,
            category: document.getElementById('prodCategory').value,
            description: document.getElementById('prodDescription').value.trim(),
            price: parseFloat(document.getElementById('prodPrice').value),
            stock: parseInt(document.getElementById('prodStock').value),
            active: true,
            image: imgData
        });
        saveToStorage();
        showAlert('Produto cadastrado com sucesso!', 'success');
        document.getElementById('productForm').reset();
        document.getElementById('productFormContainer').style.display = 'none';
        document.getElementById('imagePreview').style.display = 'none';
        loadProducts();
    };
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = (event) => saveProduct(event.target.result);
        reader.readAsDataURL(imageFile);
    } else saveProduct(null);
});

function loadProducts() {
    const tbody = document.getElementById('productsTable');
    tbody.innerHTML = '';
    if (DB.products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Nenhum produto cadastrado</td></tr>';
        return;
    }
    DB.products.forEach(product => {
        const isActive = product.active !== false;
        const tr = document.createElement('tr');
        tr.style.opacity = isActive ? '1' : '0.5';
        tr.innerHTML = `
            <td>${product.image?`<img src="${product.image}" class="product-image-cell">`:'<div style="width:80px;height:80px;background:#e0e0e0;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">Sem imagem</div>'}</td>
            <td>${product.code||'N/A'}</td>
            <td>${product.name}</td>
            <td>${categoryNames[product.category]||product.category||'N/A'}</td>
            <td>${product.description||'Sem descrição'}</td>
            <td>R$ ${product.price.toFixed(2)}</td>
            <td>${product.stock}</td>
            <td>${isActive?(product.stock>0?'<span style="color:green;">Ativo</span>':'<span style="color:orange;">Sem estoque</span>'):'<span style="color:red;">Inativo</span>'}</td>
            <td><label class="toggle-switch"><input type="checkbox" ${isActive?'checked':''} onchange="toggleProduct(${product.id},this.checked)"><span class="toggle-slider"></span></label></td>
            <td>
                <div class="product-actions">
                    <button class="btn btn-small btn-primary" onclick="editStock(${product.id})">Editar Estoque</button>
                    <button class="btn btn-small btn-danger" onclick="deleteProduct(${product.id})">Excluir</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.toggleProduct = function(productId, isActive) {
    const product = DB.products.find(p => p.id === productId);
    if (!product) return;
    product.active = isActive;
    saveToStorage();
    loadProducts();
    showAlert(isActive ? 'Produto ativado!' : 'Produto desativado!', 'success');
};

window.editStock = function(productId) {
    const product = DB.products.find(p => p.id === productId);
    if (!product) return;
    const newStock = prompt(`Estoque atual: ${product.stock}\nNovo estoque (máx: 999999):`, product.stock);
    if (newStock !== null && !isNaN(newStock)) {
        const stockValue = parseInt(newStock);
        if (stockValue >= 0 && stockValue <= 999999) {
            product.stock = stockValue;
            saveToStorage();
            loadProducts();
            showAlert('Estoque atualizado!', 'success');
        } else showAlert('Estoque deve estar entre 0 e 999999!', 'error');
    }
};

window.deleteProduct = function(productId) {
    if (confirm('Deseja realmente excluir este produto?')) {
        const index = DB.products.findIndex(p => p.id === productId);
        if (index > -1) {
            DB.products.splice(index, 1);
            saveToStorage();
            loadProducts();
            showAlert('Produto excluído!', 'success');
        }
    }
};

// ===== DESPESAS =====
document.getElementById('showExpenseFormBtn').addEventListener('click', () => {
    document.getElementById('expenseFormContainer').style.display = 'block';
});

document.getElementById('cancelExpenseBtn').addEventListener('click', () => {
    document.getElementById('expenseFormContainer').style.display = 'none';
    document.getElementById('expenseForm').reset();
    document.getElementById('recurringMonths').style.display = 'none';
});

document.getElementById('expRecurring').addEventListener('change', (e) => {
    document.getElementById('recurringMonths').style.display = e.target.checked ? 'flex' : 'none';
});

document.getElementById('expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const description = document.getElementById('expDesc').value;
    const value = parseFloat(document.getElementById('expValue').value);
    const date = new Date(document.getElementById('expDate').value);
    const paymentStatus = document.getElementById('expPaymentStatus').value;
    const isRecurring = document.getElementById('expRecurring').checked;
    const months = isRecurring ? parseInt(document.getElementById('expMonths').value) : 1;
    
    if (isRecurring && months > 0) {
        for (let i = 0; i < months; i++) {
            const expenseDate = new Date(date);
            expenseDate.setMonth(expenseDate.getMonth() + i);
            DB.expenses.push({id:Date.now()+i,description,value,date:expenseDate.toISOString(),paymentStatus,isRecurring:true,month:i+1,totalMonths:months});
        }
        showAlert(`Despesa recorrente criada para ${months} meses!`, 'success');
    } else {
        DB.expenses.push({id:Date.now(),description,value,date:date.toISOString(),paymentStatus,isRecurring:false});
        showAlert('Despesa cadastrada com sucesso!', 'success');
    }
    saveToStorage();
    document.getElementById('expenseForm').reset();
    document.getElementById('expenseFormContainer').style.display = 'none';
    document.getElementById('recurringMonths').style.display = 'none';
    loadExpenses();
});

function updateExpensesSummary() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthExpenses = DB.expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });
    
    const totalExpenses = currentMonthExpenses.reduce((sum, expense) => sum + (expense.value || 0), 0);
    
    const paidExpenses = currentMonthExpenses
        .filter(expense => expense.paymentStatus === 'paid')
        .reduce((sum, expense) => sum + (expense.value || 0), 0);
    
    const pendingExpenses = totalExpenses - paidExpenses;
    
    document.getElementById('monthTotalExpense').textContent = `R$ ${totalExpenses.toFixed(2)}`;
    document.getElementById('monthPaidExpense').textContent = `R$ ${paidExpenses.toFixed(2)}`;
    document.getElementById('monthPendingExpense').textContent = `R$ ${pendingExpenses.toFixed(2)}`;
    
    console.log('=== RESUMO DESPESAS ===');
    console.log('Total despesas do mês:', currentMonthExpenses.length);
    console.log('Total em R$:', totalExpenses.toFixed(2));
    console.log('Despesas pagas:', currentMonthExpenses.filter(e => e.paymentStatus === 'paid').length);
    console.log('Pago em R$:', paidExpenses.toFixed(2));
    console.log('A Pagar em R$:', pendingExpenses.toFixed(2));
}

function loadExpenses() {
    updateExpensesSummary();
    
    const container = document.getElementById('expensesList');
    container.innerHTML = '';
    if (DB.expenses.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">Nenhuma despesa cadastrada.</p>';
        return;
    }
    const sortedExpenses = [...DB.expenses].sort((a,b) => new Date(b.date) - new Date(a.date));
    sortedExpenses.forEach(expense => {
        const div = document.createElement('div');
        const isPaid = expense.paymentStatus === 'paid';
        div.className = `expense-item ${expense.isRecurring?'expense-recurring':''} ${isPaid?'expense-paid-status':''}`;
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('pt-BR');
        div.innerHTML = `
            <div class="expense-info">
                <h4>${expense.description}</h4>
                <p>Data: ${formattedDate} ${expense.isRecurring?`<br>Recorrente (${expense.month}/${expense.totalMonths})`:''}</p>
            </div>
            <div class="expense-price">
                <span class="expense-price-value">R$ ${expense.value.toFixed(2)}</span>
            </div>
            <div class="expense-status-column">
                <span class="expense-status-badge ${isPaid?'badge-paid':'badge-pending'}">${isPaid?'✓ Pago':'⏳ A Pagar'}</span>
            </div>
            <div class="expense-actions">
                <button class="btn btn-small ${isPaid?'btn-secondary':'btn-success'}" onclick="togglePaymentStatus(${expense.id})">${isPaid?'Marcar A Pagar':'Marcar Pago'}</button>
                <button class="btn btn-small btn-danger" onclick="deleteExpense(${expense.id})">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });
}

window.togglePaymentStatus = function(expenseId) {
    const expense = DB.expenses.find(e => e.id === expenseId);
    if (!expense) return;
    expense.paymentStatus = expense.paymentStatus === 'paid' ? 'pending' : 'paid';
    saveToStorage();
    loadExpenses();
    showAlert(`Status alterado para: ${expense.paymentStatus === 'paid' ? 'Pago' : 'A Pagar'}`, 'success');
};

window.deleteExpense = function(expenseId) {
    if (confirm('Deseja realmente excluir esta despesa?')) {
        const index = DB.expenses.findIndex(e => e.id === expenseId);
        if (index > -1) {
            DB.expenses.splice(index, 1);
            saveToStorage();
            loadExpenses();
            showAlert('Despesa excluída!', 'success');
        }
    }
};

// ===== RELATÓRIO DE VENDAS =====
function loadSalesReport() {
    const totalSales = DB.sales.length;
    const totalRevenue = DB.sales.reduce((sum, sale) => sum + sale.total, 0);
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
    document.getElementById('totalSales').textContent = totalSales;
    document.getElementById('totalRevenue').textContent = `R$ ${totalRevenue.toFixed(2)}`;
    document.getElementById('avgTicket').textContent = `R$ ${avgTicket.toFixed(2)}`;
    const tbody = document.getElementById('salesTable');
    tbody.innerHTML = '';
    if (DB.sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma venda registrada</td></tr>';
        return;
    }
    const sortedSales = [...DB.sales].sort((a,b) => new Date(b.date) - new Date(a.date));
    sortedSales.forEach(sale => {
        const date = new Date(sale.date);
        const formattedDate = date.toLocaleDateString('pt-BR');
        const formattedTime = date.toLocaleTimeString('pt-BR');
        const client = DB.clients.find(c => c.id === sale.clientId);
        const clientName = client ? client.name : 'Não cadastrado';
        const itemsList = sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${formattedDate} ${formattedTime}</td><td>${clientName}</td><td>${itemsList}</td><td>${sale.paymentMethod.toUpperCase()}</td><td><strong>R$ ${sale.total.toFixed(2)}</strong></td><td>${sale.user}</td>`;
        tbody.appendChild(tr);
    });
}

// ===== FINANCEIRO =====
function loadFinancial() {
    const totalRevenue = DB.sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalExpenses = DB.expenses.reduce((sum, exp) => sum + exp.value, 0);
    const profit = totalRevenue - totalExpenses;
    document.getElementById('finRevenue').textContent = `R$ ${totalRevenue.toFixed(2)}`;
    document.getElementById('finExpenses').textContent = `R$ ${totalExpenses.toFixed(2)}`;
    document.getElementById('finProfit').textContent = `R$ ${profit.toFixed(2)}`;
    document.getElementById('finProfit').style.color = profit >= 0 ? '#28a745' : '#dc3545';
    const expensesByMonth = {};
    DB.expenses.forEach(expense => {
        const date = new Date(expense.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
        const monthName = date.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
        if (!expensesByMonth[monthKey]) expensesByMonth[monthKey] = {name:monthName,total:0,items:[]};
        expensesByMonth[monthKey].total += expense.value;
        expensesByMonth[monthKey].items.push(expense);
    });
    const container = document.getElementById('expensesByMonth');
    container.innerHTML = '';
    const sortedMonths = Object.keys(expensesByMonth).sort().reverse();
    if (sortedMonths.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;">Nenhuma despesa cadastrada.</p>';
        return;
    }
    sortedMonths.forEach(monthKey => {
        const month = expensesByMonth[monthKey];
        const div = document.createElement('div');
        div.style.cssText = 'background:white;padding:20px;border-radius:10px;margin-bottom:15px;border:2px solid #e0e0e0;';
        div.innerHTML = `<h3 style="color:#2c3e50;margin-bottom:15px;text-transform:capitalize;">${month.name} - Total: R$ ${month.total.toFixed(2)}</h3><div style="display:grid;gap:10px;">${month.items.map(item => {
            const isPaid = item.paymentStatus === 'paid';
            const bgColor = isPaid ? '#d4edda' : '#f8f9fa';
            const textColor = isPaid ? '#155724' : '#dc3545';
            const badge = isPaid ? ' <span style="color:#28a745;font-weight:bold;">✓ PAGO</span>' : ' <span style="color:#dc3545;font-weight:bold;">⏳ A PAGAR</span>';
            return `<div style="padding:10px;background:${bgColor};border-radius:5px;display:flex;justify-content:space-between;align-items:center;border:1px solid ${isPaid?'#c3e6cb':'#e0e0e0'};"><span>${item.description}${badge}</span><strong style="color:${textColor};">R$ ${item.value.toFixed(2)}</strong></div>`;
        }).join('')}</div>`;
        container.appendChild(div);
    });
}

// ===== USUÁRIOS =====
function loadUsers() {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';
    if (DB.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum usuário cadastrado</td></tr>';
        return;
    }
    DB.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${user.name}</td><td>${user.username}</td><td>${user.isAdmin?'<span style="color:#667eea;font-weight:bold;">Administrador</span>':'Usuário'}</td><td>${user.id!==1?`<button class="btn btn-small btn-danger" onclick="deleteUser(${user.id})">Excluir</button>`:'<span style="color:#999;">Não removível</span>'}</td>`;
        tbody.appendChild(tr);
    });
}

window.deleteUser = function(userId) {
    const user = DB.users.find(u => u.id === userId);
    if (!user) return;
    if (user.id === 1) {
        showAlert('Não é possível excluir o usuário administrador principal!', 'error');
        return;
    }
    if (confirm(`Deseja realmente excluir o usuário "${user.name}"?`)) {
        const index = DB.users.findIndex(u => u.id === userId);
        if (index > -1) {
            DB.users.splice(index, 1);
            saveToStorage();
            loadUsers();
            showAlert('Usuário excluído com sucesso!', 'success');
        }
    }
};

// ===== META DIÁRIA =====
function calculateDailyGoal() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthExpenses = DB.expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });
    const totalExpenses = currentMonthExpenses.reduce((sum, expense) => sum + expense.value, 0);
    const workingDaysPerWeek = parseInt(document.getElementById('workingDaysPerWeek').value);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const weeksInMonth = daysInMonth / 7;
    const workingDaysInMonth = Math.floor(weeksInMonth * workingDaysPerWeek);
    const dailyGoal = workingDaysInMonth > 0 ? totalExpenses / workingDaysInMonth : 0;
    document.getElementById('totalExpensesMonth').textContent = `R$ ${totalExpenses.toFixed(2)}`;
    document.getElementById('workingDays').textContent = workingDaysInMonth;
    document.getElementById('dailyGoal').textContent = `R$ ${dailyGoal.toFixed(2)}`;
    const interpretation = document.getElementById('goalInterpretation');
    if (totalExpenses === 0) {
        interpretation.innerHTML = 'Você não tem despesas cadastradas para este mês. Cadastre suas despesas na aba "Despesas" para calcular sua meta diária.';
    } else {
        interpretation.innerHTML = `Para cobrir todas as suas despesas mensais de <strong>R$ ${totalExpenses.toFixed(2)}</strong>, você precisa vender em média <strong>R$ ${dailyGoal.toFixed(2)}</strong> por dia durante os <strong>${workingDaysInMonth} dias</strong> de funcionamento do mês. Isso garantirá que você feche o mês no ponto de equilíbrio (lucro zero).`;
    }
    const expensesList = document.getElementById('currentMonthExpensesList');
    if (currentMonthExpenses.length === 0) {
        expensesList.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Nenhuma despesa cadastrada para este mês.</p>';
    } else {
        expensesList.innerHTML = currentMonthExpenses.map(expense => {
            const date = new Date(expense.date);
            const formattedDate = date.toLocaleDateString('pt-BR');
            return `<div style="padding:12px;background:#f8f9fa;border-radius:5px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;"><div><strong>${expense.description}</strong><p style="font-size:12px;color:#666;margin-top:4px;">${formattedDate}${expense.isRecurring?` - Recorrente (${expense.month}/${expense.totalMonths})`:''}</p></div><div style="font-size:18px;font-weight:bold;color:#dc3545;">R$ ${expense.value.toFixed(2)}</div></div>`;
        }).join('');
    }
}

window.calculateDailyGoal = calculateDailyGoal;

// ===== GESTÃO DE LOGO =====
document.getElementById('logoUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const logoData = event.target.result;
            localStorage.setItem('company_logo', logoData);
            document.getElementById('logoPreview').src = logoData;
            document.getElementById('logoPreviewContainer').style.display = 'block';
            showAlert('Logo enviada com sucesso!', 'success');
            if (window.opener && !window.opener.closed) window.opener.loadCompanyLogo();
        };
        reader.readAsDataURL(file);
    }
});

window.removeLogo = function() {
    if (confirm('Deseja realmente remover a logo?')) {
        localStorage.removeItem('company_logo');
        document.getElementById('logoPreviewContainer').style.display = 'none';
        document.getElementById('logoUpload').value = '';
        showAlert('Logo removida com sucesso!', 'success');
        if (window.opener && !window.opener.closed) window.opener.loadCompanyLogo();
    }
};

function loadLogoPreview() {
    const logoData = localStorage.getItem('company_logo');
    if (logoData) {
        document.getElementById('logoPreview').src = logoData;
        document.getElementById('logoPreviewContainer').style.display = 'block';
    }
}

// ===== INICIALIZAR =====
loadProducts();
loadLogoPreview();