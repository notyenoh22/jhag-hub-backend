const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');  // ← ONLY DECLARED ONCE at the top

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// ============ FILE PATHS ============
const productsPath = path.join(__dirname, 'products.json');
const ordersPath = path.join(__dirname, 'orders.json');

// ============ LOAD/SAVE PRODUCTS FROM JSON FILE ============
let products = [];
let orders = [];

function loadProducts() {
    try {
        const data = fs.readFileSync(productsPath, 'utf8');
        products = JSON.parse(data);
        console.log(`✅ Loaded ${products.length} products`);
    } catch (error) {
        console.log('products.json not found, creating default...');
        products = getDefaultProducts();
        saveProducts();
    }
}

function saveProducts() {
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    console.log(`💾 Saved ${products.length} products`);
}

function getDefaultProducts() {
    return [
        { id: 1, name: 'Midnight Oud', price: 2899, tag: 'BESTSELLER', category: 'Oriental', img: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400', description: 'Rich oud and saffron with vanilla base', rating: 4.8, stock: 12 },
        { id: 2, name: 'Citrus Bloom', price: 1599, tag: 'NEW', category: 'Fresh', img: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400', description: 'Bergamot, neroli and white musk', rating: 4.5, stock: 25 },
        { id: 3, name: 'Velvet Rose', price: 1999, tag: 'SALE', category: 'Floral', img: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400', description: 'Damascus rose with amber woods', rating: 4.7, stock: 18 },
        { id: 4, name: 'Ocean Breeze', price: 1299, tag: 'HOT', category: 'Aquatic', img: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400', description: 'Sea salt, sage and driftwood', rating: 4.3, stock: 30 },
        { id: 5, name: 'Vanilla Smoke', price: 2399, tag: 'PREMIUM', category: 'Gourmand', img: 'https://images.unsplash.com/photo-1588405748880-8d4d8bc8ed3e?w=400', description: 'Tobacco, vanilla and tonka bean', rating: 4.9, stock: 8 },
        { id: 6, name: 'Green Tea', price: 999, tag: 'ECO', category: 'Fresh', img: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400', description: 'Matcha, jasmine and cedar', rating: 4.2, stock: 40 },
        { id: 7, name: 'Santal Royal', price: 3199, tag: 'LIMITED', category: 'Woody', img: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400', description: 'Sandalwood, leather and amber', rating: 4.8, stock: 5 },
        { id: 8, name: 'Cherry Blossom', price: 1399, tag: 'NEW', category: 'Floral', img: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400', description: 'Cherry, peony and soft musk', rating: 4.4, stock: 22 }
    ];
}

function loadOrders() {
    try {
        const data = fs.readFileSync(ordersPath, 'utf8');
        orders = JSON.parse(data);
    } catch (error) {
        orders = [];
    }
}

function saveOrders() {
    fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2));
}

// Load data
loadProducts();
loadOrders();

// Watch for product file changes
fs.watchFile(productsPath, () => {
    console.log('📦 products.json changed, reloading...');
    loadProducts();
});

// ============ IN-MEMORY CART ============
let cart = [];

// ============ CUSTOMER ROUTES ============

// Test endpoint
app.get('/ping', (req, res) => {
    res.json({ success: true, message: 'pong', productsCount: products.length });
});

// GET products
app.get('/products', (req, res) => {
    res.json({ success: true, products: products });
});

// GET cart
app.get('/cart', (req, res) => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.json({ success: true, cart: cart, total: total });
});

// POST cart
app.post('/cart', (req, res) => {
    const { productId, quantity } = req.body;
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += (quantity || 1);
    } else {
        cart.push({
            id: Date.now(),
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: quantity || 1,
            img: product.img
        });
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.json({ success: true, cart: cart, total: total, message: 'Added to cart!' });
});

// Delete cart item
app.delete('/cart/:itemId', (req, res) => {
    const itemId = parseInt(req.params.itemId);
    cart = cart.filter(item => item.id !== itemId);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.json({ success: true, cart: cart, total: total });
});

// Update cart quantity
app.put('/cart/:itemId', (req, res) => {
    const itemId = parseInt(req.params.itemId);
    const { quantity } = req.body;
    const item = cart.find(i => i.id === itemId);
    if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
    }
    if (quantity <= 0) {
        cart = cart.filter(i => i.id !== itemId);
    } else {
        item.quantity = quantity;
    }
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    res.json({ success: true, cart: cart, total: total });
});

// Place order
app.post('/orders', (req, res) => {
    const { customerName, address, paymentMethod, total } = req.body;
    const newOrder = {
        id: 'ORD-' + Date.now(),
        customer: { name: customerName, address: address },
        items: [...cart],
        total: total,
        paymentMethod: paymentMethod,
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    saveOrders();
    cart = [];
    res.json({ success: true, order: newOrder, message: 'Order placed successfully!' });
});

// Get profile
app.get('/profile', (req, res) => {
    res.json({
        success: true,
        profile: {
            name: 'Maria Santos',
            email: 'customer@jhag.com',
            phone: '+63 912 345 6789',
            address: 'Manila, Philippines',
            memberSince: '2024-01-15'
        }
    });
});

// ============ ADMIN ROUTES ============

// Admin login (simple authentication)
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ success: true, message: 'Login successful', token: 'admin-token-123' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Get all products (admin)
app.get('/admin/products', (req, res) => {
    res.json({ success: true, products: products });
});

// Add new product
app.post('/admin/products', (req, res) => {
    const newProduct = req.body;
    const maxId = Math.max(...products.map(p => p.id), 0);
    newProduct.id = maxId + 1;
    products.push(newProduct);
    saveProducts();
    res.json({ success: true, product: newProduct, message: 'Product added successfully' });
});

// Update product
app.put('/admin/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    products[index] = { ...products[index], ...req.body };
    saveProducts();
    res.json({ success: true, product: products[index], message: 'Product updated successfully' });
});

// Delete product
app.delete('/admin/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Product not found' });
    }
    products.splice(index, 1);
    saveProducts();
    res.json({ success: true, message: 'Product deleted successfully' });
});

// Get all orders (admin)
app.get('/admin/orders', (req, res) => {
    res.json({ success: true, orders: orders });
});

// Update order status
app.put('/admin/orders/:id/status', (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order.status = status;
    saveOrders();
    res.json({ success: true, order: order, message: 'Order status updated' });
});

// Get dashboard stats
app.get('/admin/stats', (req, res) => {
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    res.json({
        success: true,
        stats: {
            totalProducts,
            totalOrders,
            totalRevenue,
            pendingOrders
        }
    });
});

// Serve admin panel HTML
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ============ START SERVER ============
app.listen(PORT, () => {
    console.log(`✅ JHAG Hub Server running at http://localhost:${PORT}`);
    console.log(`📦 Products file: ${productsPath}`);
    console.log(`📊 Products loaded: ${products.length}`);
    console.log(`🔐 Admin login: admin / admin123`);
    console.log('\n📱 Customer Routes:');
    console.log('   GET  /products');
    console.log('   GET  /cart');
    console.log('   POST /cart');
    console.log('\n👑 Admin Routes:');
    console.log('   GET  /admin');
    console.log('   POST /admin/login');
    console.log('   GET  /admin/products');
    console.log('   POST /admin/products');
    console.log('   PUT  /admin/products/:id');
    console.log('   DELETE /admin/products/:id');
    console.log('   GET  /admin/orders');
    console.log('   GET  /admin/stats');
});