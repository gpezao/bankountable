-- Esquema de base de datos para Bankountable
-- MySQL 8.0

-- Tabla de cuentas bancarias
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    account_type VARCHAR(50), -- 'checking', 'credit', 'savings', etc.
    account_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- Color hex para UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de etiquetas
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de imports (registro de archivos importados)
CREATE TABLE IF NOT EXISTS imports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    account_id INT,
    import_type VARCHAR(50), -- 'pdf', 'email', 'manual', etc.
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    transactions_count INT DEFAULT 0,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_import_status (status),
    INDEX idx_import_date (imported_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT,
    import_id INT,
    transaction_date DATE NOT NULL,
    description VARCHAR(500) NOT NULL,
    merchant VARCHAR(255),
    amount DECIMAL(15, 2) NOT NULL,
    category_id INT,
    payment_method VARCHAR(50), -- 'credit', 'debit', 'cash', etc.
    raw_data TEXT, -- Datos originales del parsing para debugging
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_transaction_category (category_id),
    INDEX idx_transaction_account (account_id),
    INDEX idx_transaction_merchant (merchant),
    INDEX idx_transaction_description (description(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de relación many-to-many entre transacciones y etiquetas
CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id, tag_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    INDEX idx_transaction_tag (transaction_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar categorías iniciales
INSERT IGNORE INTO categories (name, description) VALUES
('Alimentación', 'Gastos en comida y bebidas'),
('Transporte', 'Gastos de transporte y movilización'),
('Entretenimiento', 'Gastos de ocio y entretenimiento'),
('Compras', 'Compras varias'),
('Servicios', 'Pagos de servicios'),
('Salud', 'Gastos médicos y de salud'),
('Educación', 'Gastos educativos'),
('Otros', 'Otros gastos');


