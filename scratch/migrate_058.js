import fs from 'fs';
import { PGlite } from '@electric-sql/pglite';

async function seed() {
  const dump = JSON.parse(fs.readFileSync('d:/Projets/sem-7-project/scratch/data_dump.json', 'utf8'));
  const db = new PGlite('d:/Projets/sem-7-project/pglite_data/v058_acme');
  await db.waitReady;
  console.log('Database v058_acme ready in PGlite 0.5.8!');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(100),
      role VARCHAR(50) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      owner_email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      customer_id INTEGER PRIMARY KEY,
      customer_name VARCHAR(255),
      email VARCHAR(255),
      city VARCHAR(255),
      phone VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS products (
      product_id INTEGER PRIMARY KEY,
      product_name VARCHAR(255),
      category VARCHAR(255),
      price NUMERIC,
      stock INTEGER
    );

    CREATE TABLE IF NOT EXISTS orders (
      order_id INTEGER PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(customer_id),
      order_date DATE,
      order_status VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      item_id INTEGER PRIMARY KEY,
      order_id INTEGER REFERENCES orders(order_id),
      product_id INTEGER REFERENCES products(product_id),
      quantity INTEGER
    );

    CREATE TABLE IF NOT EXISTS payments (
      payment_id INTEGER PRIMARY KEY,
      order_id INTEGER REFERENCES orders(order_id),
      amount NUMERIC,
      payment_method VARCHAR(255),
      payment_status VARCHAR(255)
    );

    INSERT INTO users (email, name, role)
    VALUES ('admin@local.dev', 'Local Administrator', 'admin'),
           ('developer@local.dev', 'Lead Developer', 'developer')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO projects (id, name, description, owner_email)
    VALUES ('acme-api', 'acme-api Workspace', 'Isolated PGlite Database for acme-api', 'admin@local.dev')
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('Tables created with FK constraints!');

  for (const c of dump.customers) {
    await db.query('INSERT INTO customers (customer_id, customer_name, email, city, phone) VALUES ($1, $2, $3, $4, $5)', [c.customer_id, c.customer_name, c.email, c.city, c.phone]);
  }
  for (const p of dump.products) {
    await db.query('INSERT INTO products (product_id, product_name, category, price, stock) VALUES ($1, $2, $3, $4, $5)', [p.product_id, p.product_name, p.category, p.price, p.stock]);
  }
  for (const o of dump.orders) {
    await db.query('INSERT INTO orders (order_id, customer_id, order_date, order_status) VALUES ($1, $2, $3, $4)', [o.order_id, o.customer_id, o.order_date, o.order_status]);
  }
  for (const oi of dump.order_items) {
    await db.query('INSERT INTO order_items (item_id, order_id, product_id, quantity) VALUES ($1, $2, $3, $4)', [oi.item_id, oi.order_id, oi.product_id, oi.quantity]);
  }
  for (const py of dump.payments) {
    await db.query('INSERT INTO payments (payment_id, order_id, amount, payment_method, payment_status) VALUES ($1, $2, $3, $4, $5)', [py.payment_id, py.order_id, py.amount, py.payment_method, py.payment_status]);
  }
  console.log('Seeded all 5 tables in PGlite 0.5.8 successfully!');

  const test = await db.query('SELECT COUNT(*) FROM customers;');
  console.log('Verified customers count:', test.rows[0].count);
  await db.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
