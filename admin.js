/* ===================================
   ARQUIVO: admin.js (REFATORADO)
   DESCRIÇÃO: Painel Administrativo Modular
   =================================== */

// ===== MÓDULO: DATABASE & STORAGE =====
const StorageModule = (() => {
    let DB = { users: [], clients: [], products: [], sales: [], expenses: [] };

    const loadFromStorage = () => {
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
            showAlert('Erro ao carregar dados do sistema', 'error');
        }
        return false;
    };

    const saveToStorage = () => {
        try {
            localStorage.setItem('pdv_data', JSON.stringify(DB));
            if (window.opener && !window.opener.closed && window.opener.saveToStorage) {
                window.opener.saveToStorage();
            }
            return true;
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
            showAlert('Erro ao salvar dados', 'error');
            return false;
        }
    };

    const syncWithParent = () => {
        try {
            if (window.opener && !window.opener.closed && window.opener.DB) {
                DB = window.opener.DB;
                return true;
            }
        } catch (e) {
            console.error('Erro ao sincronizar:', e);
        }
        return false;
    };

    const getDB = () => DB;
    const setDB = (newDB) => { DB = newDB; };

    return { loadFromStorage, saveToStorage, syncWithParent, getDB, setDB };
})();

// ===== MÓDULO: HELPERS & UTILITIES =====
const UtilsModule = (() => {
    const categoryNames = {
        alimentos: 'Alimentos',
        bebidas: 'Bebidas',
        assados: 'Assados',
        frios: 'Frios',
        mercearia: 'Mercearia'
    };

    const validateFullName = (name) => {
        return name.trim().split(' ').filter(p => p.length > 0).length >= 2;
    };

    const formatCurrency = (value) => {
        return `R$ ${parseFloat(value).toFixed(2)}`;
    };

    const formatDate = (dateInput) => {
        try {
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) return 'Data inválida';
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (e) {
            console.error('Erro ao formatar data:', e);
            return 'Data inválida';
        }
    };

    const formatDateTime = (dateInput) => {
        try {
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) return 'Data inválida';
            
            return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`;
        } catch (e) {
            console.error('Erro ao formatar data/hora:', e);
            return 'Data inválida';
        }
    };

    const dateToInputFormat = (dateInput) => {
        try {
            const date = new Date(dateInput);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error('Erro ao converter data:', e);
            return '';
        }
    };

    const isCurrentMonth = (dateInput) => {
        const date = new Date(dateInput);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    };

    const showAlert = (message, type = 'success') => {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        const content = document.querySelector('.admin-content');
        if (content) {
            content.insertBefore(alertDiv, content.firstChild);
            setTimeout(() => alertDiv.remove(), 3000);
        }
    };

    const createModal = (title, content, buttons) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(44,30,20,0.85);z-index:3000;align-items:center;justify-content:center;';
        
        const buttonsHTML = buttons.map(btn => 
            `<button class="btn ${btn.class}" id="${btn.id}" style="width:100%;">${btn.text}</button>`
        ).join('');

        modal.innerHTML = `
            <div class="modal-content" style="max-width:500px;background:#F5E6D3;padding:30px;border-radius:15px;box-shadow:0 10px 40px rgba(0,0,0,0.4);">
                <h3 style="color:#5C4033;margin-bottom:20px;">${title}</h3>
                <p style="margin:20px 0;color:#5C4033;line-height:1.6;">${content}</p>
                <div style="display:flex;flex-direction:column;gap:10px;">${buttonsHTML}</div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    };

    return {
        categoryNames,
        validateFullName,
        formatCurrency,
        formatDate,
        formatDateTime,
        dateToInputFormat,
        isCurrentMonth,
        showAlert,
        createModal
    };
})();

// Expor showAlert globalmente
window.showAlert = UtilsModule.showAlert;

// ===== MÓDULO: TABS =====
const TabsModule = (() => {
    const init = () => {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => handleTabClick(btn));
        });
    };

    const handleTabClick = (btn) => {
        const tab = btn.getAttribute('data-tab');
        
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        const tabContent = document.getElementById(tab + 'Tab');
        if (tabContent) tabContent.classList.add('active');
        
        refreshCurrentTab();
    };

    const refreshCurrentTab = () => {
        const activeBtn = document.querySelector('.tab-btn.active');
        if (!activeBtn) return;
        
        const activeTab = activeBtn.getAttribute('data-tab');
        const tabActions = {
            produtos: ProductsModule.load,
            despesas: ExpensesModule.load,
            relatorio: ReportsModule.loadSales,
            financeiro: ReportsModule.loadFinancial,
            usuarios: UsersModule.load,
            metadiaria: GoalsModule.calculate
        };
        
        if (tabActions[activeTab]) {
            tabActions[activeTab]();
        }
    };

    return { init, refreshCurrentTab };
})();

// ===== MÓDULO: PRODUTOS =====
const ProductsModule = (() => {
    const DB = StorageModule.getDB;
    const { showAlert, formatCurrency, categoryNames } = UtilsModule;

    const init = () => {
        document.getElementById('showProductFormBtn')?.addEventListener('click', showForm);
        document.getElementById('cancelProductBtn')?.addEventListener('click', hideForm);
        document.getElementById('prodImage')?.addEventListener('change', handleImagePreview);
        document.getElementById('productForm')?.addEventListener('submit', handleSubmit);
        document.getElementById('deleteAllProductsBtn')?.addEventListener('click', deleteAll);
    };

    const showForm = () => {
        const container = document.getElementById('productFormContainer');
        if (container) {
            container.style.display = 'block';
            document.getElementById('productForm').onsubmit = handleSubmit;
        }
    };

    const hideForm = () => {
        const container = document.getElementById('productFormContainer');
        if (container) {
            container.style.display = 'none';
            document.getElementById('productForm').reset();
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('productForm').onsubmit = handleSubmit;
        }
    };

    const handleImagePreview = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('imagePreview').src = event.target.result;
                document.getElementById('imagePreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const code = document.getElementById('prodCode').value.trim().toUpperCase();
        
        if (DB().products.find(p => p.code === code)) {
            showAlert('Já existe um produto com este código!', 'error');
            return;
        }

        const imageFile = document.getElementById('prodImage').files[0];
        
        const saveProduct = (imgData) => {
            try {
                const productData = {
                    id: Date.now(),
                    name: document.getElementById('prodName').value.trim(),
                    code: code,
                    category: document.getElementById('prodCategory').value,
                    description: document.getElementById('prodDescription').value.trim(),
                    price: parseFloat(document.getElementById('prodPrice').value),
                    stock: parseInt(document.getElementById('prodStock').value),
                    active: true,
                    image: imgData
                };
                
                DB().products.push(productData);
                
                StorageModule.saveToStorage();
                showAlert(`Produto "${productData.name}" cadastrado com sucesso! Código: ${productData.code}`, 'success');
                hideForm();
                load();
            } catch (error) {
                console.error('Erro ao salvar produto:', error);
                showAlert('Erro ao salvar produto', 'error');
            }
        };

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (event) => saveProduct(event.target.result);
            reader.readAsDataURL(imageFile);
        } else {
            saveProduct(null);
        }
    };

    const load = () => {
        const tbody = document.getElementById('productsTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (DB().products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;"><div style="color:#666;"><strong style="font-size:18px;display:block;margin-bottom:10px;">📦 Nenhum produto cadastrado</strong><p style="margin:10px 0;">Clique no botão "Cadastrar Novo Produto" acima para adicionar seu primeiro item.</p></div></td></tr>';
            return;
        }

        DB().products.forEach(product => {
            const isActive = product.active !== false;
            const tr = document.createElement('tr');
            tr.style.opacity = isActive ? '1' : '0.5';
            
            const imageHTML = product.image 
                ? `<img src="${product.image}" class="product-image-cell">`
                : '<div style="width:80px;height:80px;background:#e0e0e0;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">Sem imagem</div>';
            
            const statusHTML = isActive 
                ? (product.stock > 0 ? '<span style="color:green;">Ativo</span>' : '<span style="color:orange;">Sem estoque</span>')
                : '<span style="color:red;">Inativo</span>';

            tr.innerHTML = `
                <td>${imageHTML}</td>
                <td>${product.code || 'N/A'}</td>
                <td>${product.name}</td>
                <td>${categoryNames[product.category] || product.category || 'N/A'}</td>
                <td>${product.description || 'Sem descrição'}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.stock}</td>
                <td>${statusHTML}</td>
                <td><label class="toggle-switch"><input type="checkbox" ${isActive ? 'checked' : ''} onchange="ProductsModule.toggle(${product.id}, this.checked)"><span class="toggle-slider"></span></label></td>
                <td>
                    <div class="product-actions">
                        <button class="btn btn-small btn-success" onclick="ProductsModule.editStock(${product.id})">Editar Estoque</button>
                        <button class="btn btn-small btn-danger" onclick="ProductsModule.delete(${product.id})">Excluir</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    const toggle = (productId, isActive) => {
        const product = DB().products.find(p => p.id === productId);
        if (!product) return;
        
        product.active = isActive;
        StorageModule.saveToStorage();
        load();
        showAlert(isActive ? 'Produto ativado!' : 'Produto desativado!', 'success');
    };

    const edit = (productId) => {
        const product = DB().products.find(p => p.id === productId);
        if (!product) {
            showAlert('Produto não encontrado!', 'error');
            return;
        }

        // Armazena o código original para comparação
        const originalCode = product.code;

        document.getElementById('prodName').value = product.name;
        document.getElementById('prodCode').value = product.code;
        document.getElementById('prodCategory').value = product.category;
        document.getElementById('prodDescription').value = product.description || '';
        document.getElementById('prodPrice').value = product.price;
        document.getElementById('prodStock').value = product.stock;

        if (product.image) {
            document.getElementById('imagePreview').src = product.image;
            document.getElementById('imagePreview').style.display = 'block';
        } else {
            document.getElementById('imagePreview').style.display = 'none';
        }

        const submitBtn = document.querySelector('#productForm button[type="submit"]');
        submitBtn.textContent = 'Salvar Edição';

        document.getElementById('productFormContainer').style.display = 'block';
        document.getElementById('productFormContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });

        const form = document.getElementById('productForm');
        form.onsubmit = (e) => handleEditSubmit(e, productId, product, originalCode, submitBtn, form);
    };

    const handleEditSubmit = (e, productId, product, originalCode, submitBtn, form) => {
        e.preventDefault();

        const newCode = document.getElementById('prodCode').value.trim().toUpperCase();
        
        // Só valida código duplicado se o código foi alterado
        if (newCode !== originalCode) {
            const otherProductWithSameCode = DB().products.find(p => p.id !== productId && p.code === newCode);
            
            if (otherProductWithSameCode) {
                showAlert('Já existe outro produto com este código!', 'error');
                return;
            }
        }

        const updateProduct = (imgData) => {
            try {
                product.name = document.getElementById('prodName').value.trim();
                product.code = newCode;
                product.category = document.getElementById('prodCategory').value;
                product.description = document.getElementById('prodDescription').value.trim();
                product.price = parseFloat(document.getElementById('prodPrice').value);
                product.stock = parseInt(document.getElementById('prodStock').value);
                if (imgData) product.image = imgData;

                StorageModule.saveToStorage();
                showAlert('Produto atualizado com sucesso!', 'success');

                submitBtn.textContent = 'Salvar Produto';
                form.reset();
                document.getElementById('productFormContainer').style.display = 'none';
                document.getElementById('imagePreview').style.display = 'none';
                form.onsubmit = handleSubmit;

                load();
            } catch (error) {
                console.error('Erro ao atualizar produto:', error);
                showAlert('Erro ao atualizar produto', 'error');
            }
        };

        const imageFile = document.getElementById('prodImage').files[0];
        if (imageFile) {
            const reader = new FileReader();
            reader.onload = (event) => updateProduct(event.target.result);
            reader.readAsDataURL(imageFile);
        } else {
            updateProduct(null);
        }
    };

    const editStock = (productId) => {
        const product = DB().products.find(p => p.id === productId);
        if (!product) {
            showAlert('Produto não encontrado!', 'error');
            return;
        }

        const newQuantity = prompt(
            `Editar Estoque\n\nProduto: ${product.name}\nEstoque Atual: ${product.stock} unidades\n\nDigite a nova quantidade:`,
            product.stock
        );

        if (newQuantity === null) return;

        const quantity = parseInt(newQuantity);
        if (isNaN(quantity) || quantity < 0 || quantity > 999999) {
            showAlert('Quantidade inválida! Use um valor entre 0 e 999999.', 'error');
            return;
        }

        product.stock = quantity;
        StorageModule.saveToStorage();
        load();
        showAlert('Estoque atualizado com sucesso!', 'success');
    };

    const deleteProduct = (productId) => {
        if (confirm('Deseja realmente excluir este produto?')) {
            const index = DB().products.findIndex(p => p.id === productId);
            if (index > -1) {
                DB().products.splice(index, 1);
                StorageModule.saveToStorage();
                load();
                showAlert('Produto excluído!', 'success');
            }
        }
    };

    const deleteAll = () => {
        if (DB().products.length === 0) {
            showAlert('Não há produtos para excluir.', 'error');
            return;
        }

        const totalProducts = DB().products.length;
        const confirmMessage = `⚠️ ATENÇÃO!\n\nVocê está prestes a excluir TODOS OS ${totalProducts} PRODUTOS cadastrados.\n\nEsta ação NÃO PODE ser desfeita!\n\nDeseja realmente continuar?`;

        if (confirm(confirmMessage)) {
            const doubleConfirm = prompt(`Para confirmar, digite: EXCLUIR TUDO`);
            if (doubleConfirm === 'EXCLUIR TUDO') {
                DB().products = [];
                StorageModule.saveToStorage();
                load();
                showAlert(`${totalProducts} produtos excluídos com sucesso!`, 'success');
            } else {
                showAlert('Exclusão cancelada. Texto de confirmação incorreto.', 'error');
            }
        }
    };

    return {
        init,
        load,
        toggle,
        edit,
        editStock,
        delete: deleteProduct,
        deleteAll
    };
})();

// Expor globalmente para onclick
window.ProductsModule = ProductsModule;

// ===== MÓDULO: DESPESAS =====
const ExpensesModule = (() => {
    const DB = StorageModule.getDB;
    const { showAlert, formatCurrency, formatDate, dateToInputFormat, isCurrentMonth, createModal } = UtilsModule;

    let isEditingExpense = false;
    let editingExpenseId = null;
    let editAllSeriesFlag = false;

    const init = () => {
        document.getElementById('showExpenseFormBtn')?.addEventListener('click', showForm);
        document.getElementById('cancelExpenseBtn')?.addEventListener('click', hideForm);
        document.getElementById('expRecurring')?.addEventListener('change', handleRecurringChange);
        document.getElementById('expenseForm')?.addEventListener('submit', handleSubmit);
        document.getElementById('deleteAllExpensesBtn')?.addEventListener('click', deleteAll);
        document.getElementById('filterExpenseName')?.addEventListener('change', load);
        document.getElementById('filterExpenseStatus')?.addEventListener('change', load);
    };

    const showForm = () => {
        resetEditState();
        document.getElementById('expenseForm').reset();
        document.getElementById('expRecurring').disabled = false;
        document.getElementById('expMonths').disabled = false;
        document.getElementById('expenseFormContainer').style.display = 'block';
    };

    const hideForm = () => {
        resetEditState();
        document.getElementById('expenseFormContainer').style.display = 'none';
        document.getElementById('expenseForm').reset();
        document.getElementById('recurringMonths').style.display = 'none';
        document.getElementById('expRecurring').disabled = false;
        document.getElementById('expMonths').disabled = false;
    };

    const resetEditState = () => {
        isEditingExpense = false;
        editingExpenseId = null;
        editAllSeriesFlag = false;
    };

    const handleRecurringChange = (e) => {
        document.getElementById('recurringMonths').style.display = e.target.checked ? 'flex' : 'none';
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const description = document.getElementById('expDesc').value;
        const value = parseFloat(document.getElementById('expValue').value);
        const dateInput = document.getElementById('expDate').value;
        const date = new Date(dateInput + 'T12:00:00');
        const paymentStatus = document.getElementById('expPaymentStatus').value;
        const isRecurring = document.getElementById('expRecurring').checked;
        const months = isRecurring ? parseInt(document.getElementById('expMonths').value) : 1;

        if (isEditingExpense && editingExpenseId) {
            handleEdit(editingExpenseId, { description, value, date, paymentStatus });
            return;
        }

        createExpenses({ description, value, date, paymentStatus, isRecurring, months });
    };

    const createExpenses = ({ description, value, date, paymentStatus, isRecurring, months }) => {
        try {
            if (isRecurring && months > 0) {
                for (let i = 0; i < months; i++) {
                    const expenseDate = new Date(date);
                    expenseDate.setMonth(expenseDate.getMonth() + i);
                    
                    DB().expenses.push({
                        id: Date.now() + i,
                        description,
                        value,
                        date: expenseDate.toISOString(),
                        paymentStatus,
                        isRecurring: true,
                        month: i + 1,
                        totalMonths: months
                    });
                }
                showAlert(`Despesa recorrente criada para ${months} meses!`, 'success');
            } else {
                DB().expenses.push({
                    id: Date.now(),
                    description,
                    value,
                    date: date.toISOString(),
                    paymentStatus,
                    isRecurring: false
                });
                showAlert('Despesa cadastrada com sucesso!', 'success');
            }

            StorageModule.saveToStorage();
            hideForm();
            load();
        } catch (error) {
            console.error('Erro ao criar despesa:', error);
            showAlert('Erro ao criar despesa', 'error');
        }
    };

    const handleEdit = (expenseId, data) => {
        const expense = DB().expenses.find(e => e.id === expenseId);
        if (!expense) return;

        try {
            if (editAllSeriesFlag && expense.isRecurring) {
                const sameSeriesExpenses = findSeriesExpenses(expense);
                sameSeriesExpenses.forEach(exp => {
                    exp.description = data.description;
                    exp.value = data.value;
                    exp.paymentStatus = data.paymentStatus;
                });
                showAlert(`${sameSeriesExpenses.length} despesas da série atualizadas!`, 'success');
            } else {
                expense.description = data.description;
                expense.value = data.value;
                expense.date = data.date.toISOString();
                expense.paymentStatus = data.paymentStatus;
                showAlert('Despesa atualizada com sucesso!', 'success');
            }

            StorageModule.saveToStorage();
            hideForm();
            load();
        } catch (error) {
            console.error('Erro ao editar despesa:', error);
            showAlert('Erro ao editar despesa', 'error');
        }
    };

    const findSeriesExpenses = (expense) => {
        return DB().expenses.filter(e =>
            e.description === expense.description &&
            Math.abs(e.value - expense.value) < 0.01 &&
            e.isRecurring &&
            e.totalMonths === expense.totalMonths
        );
    };

    const updateSummary = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        DB().expenses.forEach(expense => {
            if (!expense.paymentStatus) expense.paymentStatus = 'pending';
        });

        const currentMonthExpenses = DB().expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        let totalExpenses = 0, paidExpenses = 0;

        currentMonthExpenses.forEach(expense => {
            const val = parseFloat(expense.value) || 0;
            totalExpenses += val;
            if (expense.paymentStatus === 'paid') paidExpenses += val;
        });

        const pendingExpenses = totalExpenses - paidExpenses;

        document.getElementById('monthTotalExpense').textContent = formatCurrency(totalExpenses);
        document.getElementById('monthPaidExpense').textContent = formatCurrency(paidExpenses);
        document.getElementById('monthPendingExpense').textContent = formatCurrency(pendingExpenses);

        updateFilters();
    };

    const updateFilters = () => {
        const filterSelect = document.getElementById('filterExpenseName');
        if (!filterSelect) return;

        const uniqueNames = [...new Set(DB().expenses.map(e => e.description))];
        const currentValue = filterSelect.value;

        filterSelect.innerHTML = '<option value="todos">Todas</option>';
        uniqueNames.sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            filterSelect.appendChild(option);
        });

        if (uniqueNames.includes(currentValue)) filterSelect.value = currentValue;
    };

    const load = () => {
        updateSummary();

        const container = document.getElementById('expensesList');
        if (!container) return;
        
        container.innerHTML = '';

        const filterName = document.getElementById('filterExpenseName')?.value || 'todos';
        const filterStatus = document.getElementById('filterExpenseStatus')?.value || 'todos';

        let filtered = applyFilters(filterName, filterStatus);

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#666;">Nenhuma despesa encontrada.</p>';
            return;
        }

        const sortedExpenses = sortExpenses(filtered);

        sortedExpenses.forEach(expense => renderExpenseItem(expense, container));
    };

    const applyFilters = (filterName, filterStatus) => {
        let filtered = [...DB().expenses];

        if (filterName !== 'todos') {
            filtered = filtered.filter(e => e.description === filterName);
        }

        if (filterStatus === 'pago') {
            filtered = filtered.filter(e => e.paymentStatus === 'paid');
        } else if (filterStatus === 'nao-pago') {
            filtered = filtered.filter(e => e.paymentStatus === 'pending');
        } else if (filterStatus === 'mes-vigente') {
            filtered = filtered.filter(e => isCurrentMonth(e.date));
        }

        return filtered;
    };

    const sortExpenses = (expenses) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return expenses.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            const isACurrentMonth = dateA.getMonth() === currentMonth && dateA.getFullYear() === currentYear;
            const isBCurrentMonth = dateB.getMonth() === currentMonth && dateB.getFullYear() === currentYear;

            if (isACurrentMonth && !isBCurrentMonth) return -1;
            if (isBCurrentMonth && !isACurrentMonth) return 1;

            return dateA - dateB;
        });
    };

    const renderExpenseItem = (expense, container) => {
        const isPaid = expense.paymentStatus === 'paid';
        const div = document.createElement('div');
        div.className = `expense-item ${expense.isRecurring ? 'expense-recurring' : ''} ${isPaid ? 'expense-paid-status' : ''}`;

        const recurringInfo = expense.isRecurring 
            ? `<br>Recorrente (${expense.month}/${expense.totalMonths})`
            : '';

        div.innerHTML = `
            <div class="expense-info">
                <h4>${expense.description}</h4>
                <p>Vencimento: ${formatDate(expense.date)}${recurringInfo}</p>
            </div>
            <div class="expense-price">
                <span class="expense-price-value">${formatCurrency(expense.value)}</span>
            </div>
            <div class="expense-status-column">
                <span class="expense-status-badge ${isPaid ? 'badge-paid' : 'badge-pending'}">
                    ${isPaid ? '✓ Pago' : '⏳ A Pagar'}</span>
            </div>
            <div class="expense-actions">
                <button class="btn btn-small btn-primary" onclick="ExpensesModule.edit(${expense.id})">Editar</button>
                <button class="btn btn-small ${isPaid ? 'btn-secondary' : 'btn-success'}" onclick="ExpensesModule.togglePayment(${expense.id})">
                    ${isPaid ? 'Marcar A Pagar' : 'Marcar Pago'}
                </button>
                <button class="btn btn-small btn-danger" onclick="ExpensesModule.delete(${expense.id})">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    };

    const togglePayment = (expenseId) => {
        const expense = DB().expenses.find(e => e.id === expenseId);
        if (!expense) return;

        if (!expense.paymentStatus) expense.paymentStatus = 'pending';
        expense.paymentStatus = expense.paymentStatus === 'paid' ? 'pending' : 'paid';
        
        StorageModule.saveToStorage();
        load();
        showAlert(`Status alterado para: ${expense.paymentStatus === 'paid' ? 'Pago' : 'A Pagar'}`, 'success');
    };

    const deleteExpense = (expenseId) => {
        const expense = DB().expenses.find(e => e.id === expenseId);
        if (!expense) return;

        if (expense.isRecurring) {
            showRecurringDeleteModal(expense, expenseId);
        } else {
            if (confirm('Deseja realmente excluir esta despesa?')) {
                removeExpense(expenseId);
            }
        }
    };

    const showRecurringDeleteModal = (expense, expenseId) => {
        const modal = createModal(
            'Excluir Despesa Recorrente',
            `Esta é uma <strong>despesa recorrente</strong> (${expense.month}/${expense.totalMonths}).<br><br>O que deseja fazer?`,
            [
                { id: 'deleteOnlyThis', class: 'btn-danger', text: `Excluir apenas esta despesa (${expense.month}/${expense.totalMonths})` },
                { id: 'deleteAllRecurring', class: 'btn-danger', text: `Excluir TODAS as ${expense.totalMonths} despesas desta série` },
                { id: 'cancelDelete', class: 'btn-secondary', text: 'Cancelar' }
            ]
        );

        document.getElementById('deleteOnlyThis').addEventListener('click', () => {
            removeExpense(expenseId);
            modal.remove();
        });

        document.getElementById('deleteAllRecurring').addEventListener('click', () => {
            const sameSeriesExpenses = findSeriesExpenses(expense);
            const confirmMsg = `Confirma a exclusão de ${sameSeriesExpenses.length} despesas desta série recorrente?\n\n"${expense.description}" - ${formatCurrency(expense.value)}`;
            
            if (confirm(confirmMsg)) {
                DB().expenses = DB().expenses.filter(e => !sameSeriesExpenses.includes(e));
                StorageModule.saveToStorage();
                load();
                showAlert(`${sameSeriesExpenses.length} despesas da série excluídas!`, 'success');
            }
            modal.remove();
        });

        document.getElementById('cancelDelete').addEventListener('click', () => modal.remove());
    };

    const removeExpense = (expenseId) => {
        const index = DB().expenses.findIndex(e => e.id === expenseId);
        if (index > -1) {
            DB().expenses.splice(index, 1);
            StorageModule.saveToStorage();
            load();
            showAlert('Despesa excluída!', 'success');
        }
    };

    const edit = (expenseId) => {
        const expense = DB().expenses.find(e => e.id === expenseId);
        if (!expense) return;

        if (expense.isRecurring) {
            showRecurringEditModal(expense, expenseId);
        } else {
            openEditForm(expenseId, false);
        }
    };

    const showRecurringEditModal = (expense, expenseId) => {
        const modal = createModal(
            'Editar Despesa Recorrente',
            `Esta é uma <strong>despesa recorrente</strong> (${expense.month}/${expense.totalMonths}).<br><br>O que deseja editar?`,
            [
                { id: 'editOnlyThis', class: 'btn-primary', text: `Editar apenas esta despesa (${expense.month}/${expense.totalMonths})` },
                { id: 'editAllRecurring', class: 'btn-primary', text: `Editar TODAS as ${expense.totalMonths} despesas desta série` },
                { id: 'cancelEdit', class: 'btn-secondary', text: 'Cancelar' }
            ]
        );

        document.getElementById('editOnlyThis').addEventListener('click', () => {
            modal.remove();
            openEditForm(expenseId, false);
        });

        document.getElementById('editAllRecurring').addEventListener('click', () => {
            modal.remove();
            openEditForm(expenseId, true);
        });

        document.getElementById('cancelEdit').addEventListener('click', () => modal.remove());
    };

    const openEditForm = (expenseId, editAllSeries) => {
        const expense = DB().expenses.find(e => e.id === expenseId);
        if (!expense) return;

        isEditingExpense = true;
        editingExpenseId = expenseId;
        editAllSeriesFlag = editAllSeries;

        document.getElementById('expDesc').value = expense.description;
        document.getElementById('expValue').value = expense.value;
        document.getElementById('expDate').value = dateToInputFormat(expense.date);
        document.getElementById('expPaymentStatus').value = expense.paymentStatus;

        if (expense.isRecurring) {
            document.getElementById('expRecurring').checked = true;
            document.getElementById('expRecurring').disabled = true;
            document.getElementById('recurringMonths').style.display = 'flex';
            document.getElementById('expMonths').value = expense.totalMonths;
            document.getElementById('expMonths').disabled = true;
        } else {
            document.getElementById('expRecurring').checked = false;
            document.getElementById('expRecurring').disabled = true;
            document.getElementById('recurringMonths').style.display = 'none';
        }

        document.getElementById('expenseFormContainer').style.display = 'block';
        document.getElementById('expenseFormContainer').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const deleteAll = () => {
        if (DB().expenses.length === 0) {
            showAlert('Não há despesas para excluir.', 'error');
            return;
        }

        const totalExpenses = DB().expenses.length;
        const confirmMessage = `⚠️ ATENÇÃO!\n\nVocê está prestes a excluir TODAS AS ${totalExpenses} DESPESAS cadastradas.\n\nEsta ação NÃO PODE ser desfeita!\n\nDeseja realmente continuar?`;

        if (confirm(confirmMessage)) {
            const doubleConfirm = prompt(`Para confirmar, digite: EXCLUIR TUDO`);
            if (doubleConfirm === 'EXCLUIR TUDO') {
                DB().expenses = [];
                StorageModule.saveToStorage();
                load();
                showAlert(`${totalExpenses} despesas excluídas com sucesso!`, 'success');
            } else {
                showAlert('Exclusão cancelada. Texto de confirmação incorreto.', 'error');
            }
        }
    };

    return {
        init,
        load,
        edit,
        delete: deleteExpense,
        togglePayment,
        deleteAll
    };
})();

// Expor globalmente
window.ExpensesModule = ExpensesModule;

// ===== MÓDULO: RELATÓRIOS =====
const ReportsModule = (() => {
    const DB = StorageModule.getDB;
    const { formatCurrency, formatDateTime, isCurrentMonth } = UtilsModule;

    const loadSales = () => {
        const totalSales = DB().sales.length;
        const totalRevenue = DB().sales.reduce((sum, sale) => sum + sale.total, 0);
        const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

        document.getElementById('totalSales').textContent = totalSales;
        document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('avgTicket').textContent = formatCurrency(avgTicket);

        const tbody = document.getElementById('salesTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (DB().sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma venda registrada</td></tr>';
            return;
        }

        const sortedSales = [...DB().sales].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedSales.forEach(sale => {
            const client = DB().clients.find(c => c.id === sale.clientId);
            const clientName = client ? client.name : 'Não cadastrado';
            const itemsList = sale.items.map(item => `${item.name} (${item.quantity}x)`).join(', ');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatDateTime(sale.date)}</td>
                <td>${clientName}</td>
                <td>${itemsList}</td>
                <td>${sale.paymentMethod.toUpperCase()}</td>
                <td><strong>${formatCurrency(sale.total)}</strong></td>
                <td>${sale.user}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    const loadFinancial = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const currentMonthSales = DB().sales.filter(sale => isCurrentMonth(sale.date));
        const currentMonthExpenses = DB().expenses.filter(expense => isCurrentMonth(expense.date));

        const totalRevenue = currentMonthSales.reduce((sum, sale) => sum + sale.total, 0);
        const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.value, 0);
        const profit = totalRevenue - totalExpenses;

        document.getElementById('finRevenue').textContent = formatCurrency(totalRevenue);
        document.getElementById('finExpenses').textContent = formatCurrency(totalExpenses);
        document.getElementById('finProfit').textContent = formatCurrency(profit);
        document.getElementById('finProfit').style.color = profit >= 0 ? '#28a745' : '#dc3545';

        loadExpensesByMonth();
    };

    const loadExpensesByMonth = () => {
        const expensesByMonth = {};

        DB().expenses.forEach(expense => {
            const date = new Date(expense.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            if (!expensesByMonth[monthKey]) {
                expensesByMonth[monthKey] = { name: monthName, total: 0, items: [] };
            }
            expensesByMonth[monthKey].total += expense.value;
            expensesByMonth[monthKey].items.push(expense);
        });

        const container = document.getElementById('expensesByMonth');
        if (!container) return;
        
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

            const itemsHTML = month.items.map(item => {
                const isPaid = item.paymentStatus === 'paid';
                const bgColor = isPaid ? '#d4edda' : '#f8f9fa';
                const borderColor = isPaid ? '#c3e6cb' : '#e0e0e0';
                const valueColor = isPaid ? '#155724' : '#dc3545';
                const statusBadge = isPaid
                    ? '<span style="color:#28a745;font-weight:bold;font-size:11px;margin-left:8px;">✓ PAGO</span>'
                    : '<span style="color:#dc3545;font-weight:bold;font-size:11px;margin-left:8px;">⏳ A PAGAR</span>';

                return `<div style="padding:12px;background:${bgColor};border-radius:5px;display:flex;justify-content:space-between;align-items:center;border:2px solid ${borderColor};">
                    <span style="font-weight:500;">${item.description}${statusBadge}</span>
                    <strong style="color:${valueColor};font-size:16px;">${formatCurrency(item.value)}</strong>
                </div>`;
            }).join('');

            div.innerHTML = `
                <h3 style="color:#2c3e50;margin-bottom:15px;text-transform:capitalize;">${month.name} - Total: ${formatCurrency(month.total)}</h3>
                <div style="display:grid;gap:10px;">${itemsHTML}</div>
            `;
            container.appendChild(div);
        });
    };

    return { loadSales, loadFinancial };
})();

// ===== MÓDULO: USUÁRIOS =====
const UsersModule = (() => {
    const DB = StorageModule.getDB;
    const { showAlert, validateFullName } = UtilsModule;

    const init = () => {
        document.getElementById('showUserFormBtn')?.addEventListener('click', showForm);
        document.getElementById('cancelUserBtn')?.addEventListener('click', hideForm);
        document.getElementById('userForm')?.addEventListener('submit', handleSubmit);
    };

    const showForm = () => {
        document.getElementById('userFormContainer').style.display = 'block';
    };

    const hideForm = () => {
        document.getElementById('userFormContainer').style.display = 'none';
        document.getElementById('userForm').reset();
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const name = document.getElementById('userName').value.trim();
        const username = document.getElementById('userUsername').value.trim();
        const password = document.getElementById('userPassword').value.trim();
        const secretQuestion = document.getElementById('userSecretQuestion').value;
        const secretAnswer = document.getElementById('userSecretAnswer').value.toLowerCase().trim();

        if (!validateFullName(name)) {
            showAlert('Por favor, informe nome e sobrenome completos!', 'error');
            return;
        }

        if (DB().users.find(u => u.username === username)) {
            showAlert('Já existe um usuário com este login!', 'error');
            return;
        }

        try {
            DB().users.push({
                id: Date.now(),
                name,
                username,
                password,
                isAdmin: true,
                secretQuestion,
                secretAnswer
            });

            StorageModule.saveToStorage();
            showAlert('Administrador cadastrado com sucesso!', 'success');
            hideForm();
            load();
        } catch (error) {
            console.error('Erro ao cadastrar usuário:', error);
            showAlert('Erro ao cadastrar usuário', 'error');
        }
    };

    const load = () => {
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        if (DB().users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum usuário cadastrado</td></tr>';
            return;
        }

        DB().users.forEach(user => {
            const tr = document.createElement('tr');
            const roleText = user.isAdmin
                ? '<span style="color:#667eea;font-weight:bold;">Administrador</span>'
                : '<span style="color:#8B6F47;font-weight:bold;">Usuário Comum</span>';
            
            const actionHTML = user.id !== 1
                ? `<button class="btn btn-small btn-danger" onclick="UsersModule.delete(${user.id})">Excluir</button>`
                : '<span style="color:#999;">Não removível</span>';

            tr.innerHTML = `
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td>${roleText}</td>
                <td>${actionHTML}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    const deleteUser = (userId) => {
        const user = DB().users.find(u => u.id === userId);
        if (!user) return;

        if (user.id === 1) {
            showAlert('Não é possível excluir o usuário administrador principal!', 'error');
            return;
        }

        if (confirm(`Deseja realmente excluir o usuário "${user.name}"?`)) {
            const index = DB().users.findIndex(u => u.id === userId);
            if (index > -1) {
                DB().users.splice(index, 1);
                StorageModule.saveToStorage();
                load();
                showAlert('Usuário excluído com sucesso!', 'success');
            }
        }
    };

    return { init, load, delete: deleteUser };
})();

// Expor globalmente
window.UsersModule = UsersModule;

// ===== MÓDULO: META DIÁRIA =====
const GoalsModule = (() => {
    const DB = StorageModule.getDB;
    const { formatCurrency, formatDate, isCurrentMonth } = UtilsModule;

    const init = () => {
        document.getElementById('workingDaysPerWeek')?.addEventListener('change', calculate);
    };

    const calculate = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const currentMonthExpenses = DB().expenses.filter(expense => isCurrentMonth(expense.date));
        const totalExpenses = currentMonthExpenses.reduce((sum, expense) => sum + expense.value, 0);

        const workingDaysPerWeek = parseInt(document.getElementById('workingDaysPerWeek')?.value || 6);
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const weeksInMonth = daysInMonth / 7;
        const workingDaysInMonth = Math.floor(weeksInMonth * workingDaysPerWeek);
        const dailyGoal = workingDaysInMonth > 0 ? totalExpenses / workingDaysInMonth : 0;

        document.getElementById('totalExpensesMonth').textContent = formatCurrency(totalExpenses);
        document.getElementById('workingDays').textContent = workingDaysInMonth;
        document.getElementById('dailyGoal').textContent = formatCurrency(dailyGoal);

        updateInterpretation(totalExpenses, dailyGoal, workingDaysInMonth);
        loadExpensesList(currentMonthExpenses);
    };

    const updateInterpretation = (totalExpenses, dailyGoal, workingDays) => {
        const interpretation = document.getElementById('goalInterpretation');
        if (!interpretation) return;

        if (totalExpenses === 0) {
            interpretation.innerHTML = 'Você não tem despesas cadastradas para este mês. Cadastre suas despesas na aba "Despesas" para calcular sua meta diária.';
        } else {
            interpretation.innerHTML = `Para cobrir todas as suas despesas mensais de <strong>${formatCurrency(totalExpenses)}</strong>, você precisa vender em média <strong>${formatCurrency(dailyGoal)}</strong> por dia durante os <strong>${workingDays} dias</strong> de funcionamento do mês. Isso garantirá que você feche o mês no ponto de equilíbrio (lucro zero).`;
        }
    };

    const loadExpensesList = (expenses) => {
        const list = document.getElementById('currentMonthExpensesList');
        if (!list) return;

        if (expenses.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:#666;padding:20px;">Nenhuma despesa cadastrada para este mês.</p>';
            return;
        }

        list.innerHTML = expenses.map(expense => {
            const recurringInfo = expense.isRecurring
                ? ` - Recorrente (${expense.month}/${expense.totalMonths})`
                : '';

            return `<div style="padding:12px;background:#f8f9fa;border-radius:5px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <strong>${expense.description}</strong>
                    <p style="font-size:12px;color:#666;margin-top:4px;">${formatDate(expense.date)}${recurringInfo}</p>
                </div>
                <div style="font-size:18px;font-weight:bold;color:#dc3545;">${formatCurrency(expense.value)}</div>
            </div>`;
        }).join('');
    };

    return { init, calculate };
})();

// ===== MÓDULO: LOGO =====
const LogoModule = (() => {
    const { showAlert } = UtilsModule;

    const init = () => {
        document.getElementById('logoUpload')?.addEventListener('change', handleUpload);
        loadPreview();
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const logoData = event.target.result;
                localStorage.setItem('company_logo', logoData);
                document.getElementById('logoPreview').src = logoData;
                document.getElementById('logoPreviewContainer').style.display = 'block';
                showAlert('Logo enviada com sucesso!', 'success');
                
                if (window.opener && !window.opener.closed && window.opener.loadCompanyLogo) {
                    window.opener.loadCompanyLogo();
                }
            } catch (error) {
                console.error('Erro ao salvar logo:', error);
                showAlert('Erro ao salvar logo', 'error');
            }
        };
        reader.readAsDataURL(file);
    };

    const remove = () => {
        if (confirm('Deseja realmente remover a logo?')) {
            try {
                localStorage.removeItem('company_logo');
                document.getElementById('logoPreviewContainer').style.display = 'none';
                document.getElementById('logoUpload').value = '';
                showAlert('Logo removida com sucesso!', 'success');
                
                if (window.opener && !window.opener.closed && window.opener.loadCompanyLogo) {
                    window.opener.loadCompanyLogo();
                }
            } catch (error) {
                console.error('Erro ao remover logo:', error);
                showAlert('Erro ao remover logo', 'error');
            }
        }
    };

    const loadPreview = () => {
        try {
            const logoData = localStorage.getItem('company_logo');
            if (logoData) {
                document.getElementById('logoPreview').src = logoData;
                document.getElementById('logoPreviewContainer').style.display = 'block';
            }
        } catch (error) {
            console.error('Erro ao carregar logo:', error);
        }
    };

    return { init, remove, loadPreview };
})();

// Expor globalmente
window.removeLogo = LogoModule.remove;

// ===== INICIALIZAÇÃO =====
const AppInit = (() => {
    const fixOldExpenses = () => {
        let fixed = 0;
        StorageModule.getDB().expenses.forEach(expense => {
            if (expense.paymentStatus === undefined || expense.paymentStatus === null) {
                expense.paymentStatus = 'pending';
                fixed++;
            }
        });
        if (fixed > 0) {
            StorageModule.saveToStorage();
            console.log(`✓ ${fixed} despesas antigas corrigidas com status 'pending'`);
        }
    };

    const setupSync = () => {
        if (!StorageModule.syncWithParent()) {
            StorageModule.loadFromStorage();
        }

        let lastSync = Date.now();
        setInterval(() => {
            const now = Date.now();
            if (now - lastSync > 3000) {
                StorageModule.syncWithParent() || StorageModule.loadFromStorage();
                lastSync = now;
            }
        }, 3000);
    };

    const init = () => {
        setupSync();
        fixOldExpenses();

        // Inicializar módulos
        TabsModule.init();
        ProductsModule.init();
        ExpensesModule.init();
        UsersModule.init();
        GoalsModule.init();
        LogoModule.init();

        // Carregar primeira aba
        ProductsModule.load();
    };

    return { init };
})();

// Iniciar aplicação quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', AppInit.init);
} else {
    AppInit.init();
}