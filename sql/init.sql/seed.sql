-- ============================================================
--  LevelUp Nexus ERP — sql/seed.sql
--  Docker: montado como 03_seed.sql en initdb
--  Motor: PostgreSQL 16 | Versión: v1.2.0
--  Autores: Desirée Cobo Batalla & Sebastián Burneo Reyes
--  ─────────────────────────────────────────────────────────
--  Script idempotente: todos los inserts usan ON CONFLICT DO NOTHING.
--  Puede re-ejecutarse sin duplicar datos.
--  ─────────────────────────────────────────────────────────
--  Contraseñas de demo (BCrypt cost=12):
--    admin123     → admin       |  gestor123   → gestor
--    cajero123    → cajero      |  marketing123 → mkt
--    contable123  → contable
-- ============================================================

-- ── SEED 1 · ROLES ───────────────────────────────────────────

INSERT INTO roles (nombre, descripcion) VALUES
    ('ADMIN',             'Acceso total al sistema, auditoría y gestión de usuarios'),
    ('GESTOR_INVENTARIO', 'Gestión de productos, stock, proveedores e IA logística'),
    ('CAJERO',            'Registro de ventas y tasación retro en punto de venta'),
    ('MARKETING_ANALYST', 'Lectura analítica y acceso al motor NL2SQL'),
    ('CONTABLE',          'Lectura de facturación y costes de proveedores')
ON CONFLICT (nombre) DO NOTHING;


-- ── SEED 2 · CATEGORÍAS ──────────────────────────────────────
-- Árbol de dos niveles: raíces sin id_padre, hojas con id_padre.
-- Las categorías RETRO tienen es_retro=TRUE.

INSERT INTO categorias (nombre, descripcion, id_padre, es_retro) VALUES
    ('Videojuegos Modernos', 'Juegos actuales PS5, Xbox, Switch', NULL, FALSE),
    ('Videojuegos Retro',    'Juegos y consolas de coleccionismo', NULL, TRUE),
    ('Accesorios',           'Mandos, cables y periféricos gaming', NULL, FALSE),
    ('Merchandising',        'Figuras, ropa y artículos de marca', NULL, FALSE),
    ('PS5',          'PlayStation 5',               NULL, FALSE),
    ('Xbox Series',  'Xbox Series X/S',              NULL, FALSE),
    ('Nintendo Switch','Nintendo Switch y accesorios',NULL, FALSE),
    ('SNES',         'Super Nintendo Entertainment System', NULL, TRUE),
    ('Game Boy',     'Game Boy, Color y Advance',    NULL, TRUE),
    ('Mega Drive',   'Sega Mega Drive / Genesis',    NULL, TRUE),
    ('NES',          'Nintendo Entertainment System',NULL, TRUE),
    ('Nintendo 64',  'Nintendo 64',                  NULL, TRUE),
    ('PlayStation 1','Sony PlayStation original',    NULL, TRUE),
    ('Funko Pop',    'Figuras Funko Pop! Gaming',    NULL, FALSE),
    ('Ropa Gaming',  'Camisetas y complementos',     NULL, FALSE)
ON CONFLICT (nombre) DO NOTHING;


-- ── SEED 3 · USUARIOS ────────────────────────────────────────

INSERT INTO usuarios (email, username, nombre_completo, password_hash, is_active, is_verified) VALUES
    ('admin@levelupnexus.es',    'admin',    'Administrador General',
        '$2a$12$gkncmExba6MgeKR0cb8noO2aJTxEfk60QqrId5XbPgRPJG2Hfoe9O', TRUE, TRUE),
    ('gestor@levelupnexus.es',   'gestor',   'Gestor de Inventario',
        '$2a$12$7bOMLe7JqD1ClihOTbkJUe1No3plNYpCaLj5sOEc4CPJ52z0GGhPe', TRUE, TRUE),
    ('cajero@levelupnexus.es',   'cajero',   'Cajero Tienda',
        '$2a$12$9QM9c.ByEDW5CbCxEVnyJ.JhmhhYQkF8yrDRPSNY6ZHfKSxTKHlgu', TRUE, TRUE),
    ('mkt@levelupnexus.es',      'mkt',      'Analista de Marketing',
        '$2a$12$0LoR.vQZCUITFfPcqOYbVuERwlyURLVJxlCc59NAnRq9jjycWOUh6', TRUE, TRUE),
    ('contable@levelupnexus.es', 'contable', 'Responsable de Contabilidad',
        '$2a$12$kh9DvHl5dY51LaC4uUkmIuD2N/xzcuVSFWDlCNJ2Bft4Jvon34xz.', TRUE, TRUE)
ON CONFLICT (username)
DO UPDATE SET password_hash = EXCLUDED.password_hash;
-- Roles por nombre (sin IDs hardcodeados → portátil entre entornos)
INSERT INTO usuarios_roles (id_usuario, id_rol)
SELECT u.id, r.id FROM usuarios u, roles r
WHERE (u.username='admin'    AND r.nombre='ADMIN')
    OR (u.username='gestor'   AND r.nombre='GESTOR_INVENTARIO')
    OR (u.username='cajero'   AND r.nombre='CAJERO')
    OR (u.username='mkt'      AND r.nombre='MARKETING_ANALYST')
    OR (u.username='contable' AND r.nombre='CONTABLE')
ON CONFLICT DO NOTHING;

-- Admin también tiene GESTOR para demos completas
INSERT INTO usuarios_roles (id_usuario, id_rol)
SELECT u.id, r.id FROM usuarios u, roles r
WHERE u.username='admin' AND r.nombre='GESTOR_INVENTARIO'
ON CONFLICT DO NOTHING;


-- ── SEED 4 · PROVEEDORES ─────────────────────────────────────

INSERT INTO proveedores (razon_social, cif, email, telefono, tiempo_entrega_d) VALUES
    ('Koch Media Iberia S.L.',         'B-82345678', 'pedidos@kochmedia.es',      '+34 91 555 01 01', 5),
    ('Bandai Namco Entertainment EU',  'EU-B99001',  'wholesale@bandainamco.eu',  '+49 69 555 02 02', 7),
    ('Game Traders International',     'GB-GT12345', 'orders@gametradersint.com', '+44 20 555 03 03', 10),
    ('Retromania Distribuciones S.L.', 'B-74112233', 'stock@retromania.es',       '+34 93 555 04 04', 3),
    ('Funko Inc. Europe',              'EU-FK77001', 'b2b@funko-eu.com',          '+49 89 555 05 05', 14)
ON CONFLICT DO NOTHING;


-- ── SEED 5 · CLIENTES ────────────────────────────────────────

INSERT INTO clientes (nombre, email, telefono, puntos_fidelidad) VALUES
    ('Carlos Martínez López',  'carlos.martinez@email.es', '+34 611 100 001', 320),
    ('Ana García Ruiz',        'ana.garcia@email.es',      '+34 622 200 002', 850),
    ('Pedro Sánchez Mora',     'pedro.sanchez@email.es',   '+34 633 300 003', 120),
    ('Lucía Fernández Torres', 'lucia.fernandez@email.es', '+34 644 400 004', 1540),
    ('Javier Romero Gil',      'javier.romero@email.es',   '+34 655 500 005', 75),
    ('María López Cano',       'maria.lopez@email.es',     '+34 666 600 006', 960),
    ('Alejandro Ruiz Vega',    'alex.ruiz@email.es',       NULL,              200),
    ('Sofía Molina Pérez',     'sofia.molina@email.es',    '+34 688 800 008', 430)
ON CONFLICT DO NOTHING;


-- ── SEED 6 · UBICACIONES DEL ALMACÉN ─────────────────────────
-- 25 ubicaciones distribuidas en 7 pasillos

INSERT INTO ubicaciones_almacen (pasillo, estanteria, nivel) VALUES
    ('P1','A',1),('P1','A',2),('P1','B',1),('P1','B',2),('P1','C',1),
    ('P2','A',1),('P2','A',2),('P2','B',1),('P2','C',1),
    ('P3','A',1),('P3','A',2),('P3','B',1),('P3','C',1),
    ('P4','A',1),('P4','A',2),('P4','B',1),('P4','C',1),
    ('P5','A',1),('P5','B',1),('P5','C',1),
    ('P6','A',1),('P6','B',1),('P6','C',1),
    ('P7','A',1),('P7','B',1)
ON CONFLICT DO NOTHING;


-- ── SEED 7 · 10 PRODUCTOS ESTÁNDAR ───────────────────────────

INSERT INTO productos
    (sku, nombre, descripcion, id_categoria, id_proveedor, id_ubicacion,
        precio_coste, precio_venta, stock_actual, stock_minimo, stock_maximo,
        tipo_producto, atributos_especificos)
SELECT
    p.sku, p.nombre, p.descripcion,
    cat.id  AS id_categoria,
    prov.id AS id_proveedor,
    ub.id   AS id_ubicacion,
    p.precio_coste, p.precio_venta,
    p.stock_actual, p.stock_minimo, p.stock_maximo,
    'ESTANDAR',
    p.attrs::JSONB
FROM (VALUES
    ('STD-PS5-001','God of War Ragnarök — PS5','Edición estándar física. PEGI 18.',
        'PS5','Koch Media Iberia S.L.','P1','A',1,
        35.99,69.99,42,5,200,
        '{"plataforma":"PS5","genero":"Acción/Aventura","pegi":18,"ean":"0711719787419"}'),

    ('STD-PS5-002','Elden Ring — PS5','FromSoftware. Edición estándar física.',
        'PS5','Koch Media Iberia S.L.','P1','A',2,
        29.50,59.99,28,5,200,
        '{"plataforma":"PS5","genero":"RPG/Acción","pegi":16,"ean":"3391892020236"}'),

    ('STD-NSW-001','The Legend of Zelda: TOTK — Switch','Tears of the Kingdom. Switch físico.',
        'Nintendo Switch','Bandai Namco Entertainment EU','P1','B',1,
        39.99,64.99,55,10,300,
        '{"plataforma":"Nintendo Switch","genero":"Aventura","pegi":12,"ean":"0045496479299"}'),

    ('STD-XBX-001','Halo Infinite — Xbox Series X','Campaña + Multijugador. Edición física.',
        'Xbox Series','Koch Media Iberia S.L.','P1','B',2,
        24.99,44.99,19,5,150,
        '{"plataforma":"Xbox Series X","genero":"FPS","pegi":16,"ean":"0889842576320"}'),

    ('STD-NSW-002','Mario Kart 8 Deluxe — Switch','Edición estándar con todos los DLCs.',
        'Nintendo Switch','Bandai Namco Entertainment EU','P1','C',1,
        34.99,59.99,67,10,300,
        '{"plataforma":"Nintendo Switch","genero":"Carreras","pegi":3,"ean":"0045496420260"}'),

    ('STD-FNK-001','Funko Pop! Link — Zelda #856','Figura coleccionable 9 cm. Caja original.',
        'Funko Pop','Funko Inc. Europe','P2','A',1,
        7.50,14.99,35,5,100,
        '{"linea":"Pop! Games","numero_figura":856,"altura_cm":9,"exclusiva":false}'),

    ('STD-FNK-002','Funko Pop! Master Chief — Halo #06','Figura coleccionable 9 cm.',
        'Funko Pop','Funko Inc. Europe','P2','A',2,
        7.50,14.99,22,5,100,
        '{"linea":"Pop! Games","numero_figura":6,"altura_cm":9,"exclusiva":false}'),

    ('STD-RPA-001','Camiseta Mario Bros — Talla L','100% algodón orgánico. Diseño 8-bit.',
        'Ropa Gaming','Bandai Namco Entertainment EU','P2','B',1,
        8.00,24.99,14,3,80,
        '{"talla":"L","material":"100% algodón orgánico","color":"azul marino","estampado":"8-bit"}'),

    ('STD-ACC-001','Mando DualSense — PS5 Blanco','Mando oficial Sony PlayStation 5.',
        'Accesorios','Koch Media Iberia S.L.','P2','C',1,
        48.00,74.99,11,3,50,
        '{"compatible":"PS5","color":"blanco","cable_usb_c":true,"ean":"0711719827979"}'),

    ('STD-ACC-002','Tarjeta PSN 50€','Tarjeta prepago PlayStation Network 50€.',
        'Accesorios','Koch Media Iberia S.L.','P3','A',1,
        47.00,50.00,30,10,200,
        '{"tipo":"tarjeta_prepago","region":"EUR","importe_eur":50}')

) AS p(sku,nombre,descripcion,nombre_cat,razon_prov,pasillo,estanteria,nivel,
    precio_coste,precio_venta,stock_actual,stock_minimo,stock_maximo,attrs)
JOIN categorias          cat  ON cat.nombre       = p.nombre_cat
JOIN proveedores         prov ON prov.razon_social = p.razon_prov
JOIN ubicaciones_almacen ub   ON ub.pasillo=p.pasillo AND ub.estanteria=p.estanteria AND ub.nivel=p.nivel
ON CONFLICT (sku) DO NOTHING;


-- ── SEED 8 · 10 PRODUCTOS RETRO — La Bóveda Retro ────────────
-- stock=1 siempre. Pieza única de coleccionismo.

INSERT INTO productos
    (sku, nombre, descripcion, id_categoria, id_proveedor, id_ubicacion,
    precio_coste, precio_venta, stock_actual, stock_minimo, stock_maximo,
    tipo_producto, estado_conservacion, atributos_especificos)
SELECT
    p.sku, p.nombre, p.descripcion,
    cat.id  AS id_categoria,
    prov.id AS id_proveedor,
    ub.id   AS id_ubicacion,
    p.precio_coste, p.precio_venta,
    1, 1, 1,
    'RETRO',
    p.conservacion::VARCHAR(10),
    p.attrs::JSONB
FROM (VALUES
    ('RET-SNES-001','Super Mario World — SNES CIB',
    'Cartucho + Caja + Manual. Rozaduras leves en esquinas de caja.',
    'SNES','Retromania Distribuciones S.L.','P4','A',1,
    45.00,124.99,'CIB',
    '{"plataforma":"SNES","region":"PAL","anio_lanzamiento":1990,"tiene_caja":true,"tiene_manual":true,"tiene_cartucho":true,"desperfectos":"Rozaduras leves en esquinas","tasacion_ia_eur":124.99}'),

    ('RET-SNES-002','Donkey Kong Country — SNES MINT',
    'Precintado original. Pieza de colección premium.',
    'SNES','Retromania Distribuciones S.L.','P4','A',2,
    110.00,299.00,'MINT',
    '{"plataforma":"SNES","region":"PAL","anio_lanzamiento":1994,"tiene_caja":true,"tiene_manual":true,"precintado":true,"desperfectos":null,"tasacion_ia_eur":299.00}'),

    ('RET-GB-001','Pokémon Red — Game Boy LOOSE',
    'Solo cartucho. Batería recién reemplazada.',
    'Game Boy','Retromania Distribuciones S.L.','P4','B',1,
    15.00,34.99,'LOOSE',
    '{"plataforma":"Game Boy","region":"EUR","anio_lanzamiento":1999,"tiene_caja":false,"tiene_manual":false,"bateria_reemplazada":true,"desperfectos":"Desgaste normal en etiqueta","tasacion_ia_eur":34.99}'),

    ('RET-MD-001','Sonic the Hedgehog 2 — Mega Drive CIB',
    'Completo en caja. Muy buen estado.',
    'Mega Drive','Retromania Distribuciones S.L.','P4','C',1,
    28.00,69.99,'CIB',
    '{"plataforma":"Mega Drive","region":"PAL","anio_lanzamiento":1992,"tiene_caja":true,"tiene_manual":true,"desperfectos":null,"tasacion_ia_eur":69.99}'),

    ('RET-NES-001','Super Mario Bros 3 — NES CIB',
    'Caja original en muy buen estado. Manual con ilustraciones intactas.',
    'NES','Game Traders International','P5','A',1,
    60.00,159.00,'CIB',
    '{"plataforma":"NES","region":"PAL","anio_lanzamiento":1990,"tiene_caja":true,"tiene_manual":true,"desperfectos":"Leve amarillamiento en caja","tasacion_ia_eur":159.00}'),

    ('RET-GB-002','Zelda: Link''s Awakening — Game Boy LOOSE_D',
    'Solo cartucho. Etiqueta parcialmente despegada.',
    'Game Boy','Game Traders International','P5','B',1,
    8.00,18.99,'LOOSE_D',
    '{"plataforma":"Game Boy","region":"EUR","anio_lanzamiento":1993,"tiene_caja":false,"tiene_manual":false,"desperfectos":"Etiqueta parcialmente despegada. Arañazo en esquina superior.","tasacion_ia_eur":18.99}'),

    ('RET-PS1-001','Final Fantasy VII — PlayStation 1 CIB',
    '3 discos originales. Icónico JRPG de los 90.',
    'PlayStation 1','Retromania Distribuciones S.L.','P6','A',1,
    35.00,89.00,'CIB',
    '{"plataforma":"PlayStation 1","region":"PAL","anio_lanzamiento":1997,"tiene_caja":true,"tiene_manual":true,"num_discos":3,"desperfectos":null,"tasacion_ia_eur":89.00}'),

    ('RET-SNES-003','Street Fighter II Turbo — SNES LOOSE',
    'Solo cartucho. Funciona perfectamente.',
    'SNES','Retromania Distribuciones S.L.','P6','B',1,
    12.00,28.00,'LOOSE',
    '{"plataforma":"SNES","region":"PAL","anio_lanzamiento":1993,"tiene_caja":false,"tiene_manual":false,"desperfectos":null,"tasacion_ia_eur":28.00}'),

    ('RET-N64-001','The Legend of Zelda: Ocarina of Time — N64 CIB',
    'Completo en caja. Manual en español. Cartucho dorado.',
    'Nintendo 64','Game Traders International','P7','A',1,
    70.00,189.00,'CIB',
    '{"plataforma":"Nintendo 64","region":"PAL","anio_lanzamiento":1998,"tiene_caja":true,"tiene_manual":true,"cartucho_dorado":true,"desperfectos":"Pequeño golpe en esquina inferior de la caja","tasacion_ia_eur":189.00}'),

    ('RET-GBA-001','Castlevania: Aria of Sorrow — GBA MINT',
    'Precintado. Altísima demanda en el mercado retro.',
    'Game Boy','Game Traders International','P7','B',1,
    120.00,320.00,'MINT',
    '{"plataforma":"Game Boy Advance","region":"EUR","anio_lanzamiento":2003,"tiene_caja":true,"tiene_manual":true,"precintado":true,"desperfectos":null,"tasacion_ia_eur":320.00}')

) AS p(sku,nombre,descripcion,nombre_cat,razon_prov,pasillo,estanteria,nivel,
    precio_coste,precio_venta,conservacion,attrs)
JOIN categorias          cat  ON cat.nombre       = p.nombre_cat
JOIN proveedores         prov ON prov.razon_social = p.razon_prov
JOIN ubicaciones_almacen ub   ON ub.pasillo=p.pasillo AND ub.estanteria=p.estanteria AND ub.nivel=p.nivel
ON CONFLICT (sku) DO NOTHING;


-- ── SEED 9 · TRANSACCIONES HISTÓRICAS (30 días para Chart.js) ─

-- Entradas de proveedor
INSERT INTO transacciones_stock
    (id_producto, id_usuario, id_proveedor, tipo_movimiento, cantidad,
    stock_antes, stock_despues, precio_unitario, referencia, fecha)
SELECT prod.id, usr.id, prov.id,
    'ENTRADA', t.cant, t.s_antes, t.s_antes + t.cant, t.precio,
    'ALB-E-' || TO_CHAR(t.fecha_mov,'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER()::TEXT,4,'0'),
    t.fecha_mov
FROM (VALUES
    ('STD-PS5-001','Koch Media Iberia S.L.',        20,22,35.99, NOW()-INTERVAL'28 days'),
    ('STD-NSW-001','Bandai Namco Entertainment EU', 30,25,39.99, NOW()-INTERVAL'25 days'),
    ('STD-NSW-002','Bandai Namco Entertainment EU', 25,42,34.99, NOW()-INTERVAL'20 days'),
    ('STD-FNK-001','Funko Inc. Europe',             20,15, 7.50, NOW()-INTERVAL'18 days'),
    ('STD-PS5-002','Koch Media Iberia S.L.',        15,13,29.50, NOW()-INTERVAL'15 days'),
    ('STD-ACC-001','Koch Media Iberia S.L.',         8, 3,48.00, NOW()-INTERVAL'10 days'),
    ('STD-XBX-001','Koch Media Iberia S.L.',        10, 9,24.99, NOW()-INTERVAL'5 days')
) AS t(sku, razon_prov, cant, s_antes, precio, fecha_mov)
JOIN productos   prod ON prod.sku          = t.sku
JOIN proveedores prov ON prov.razon_social = t.razon_prov
JOIN usuarios    usr  ON usr.username      = 'gestor'
ON CONFLICT DO NOTHING;

-- Ventas a cliente (alimentan el gráfico LINE del dashboard)
INSERT INTO transacciones_stock
    (id_producto, id_usuario, id_cliente, tipo_movimiento, cantidad,
    stock_antes, stock_despues, precio_unitario, referencia, fecha)
SELECT prod.id, usr.id, cli.id,
    'SALIDA', 1, t.s_antes, t.s_antes-1, t.precio,
    'VTA-' || TO_CHAR(t.fecha_mov,'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER()::TEXT,4,'0'),
    t.fecha_mov
FROM (VALUES
    ('STD-PS5-001','carlos.martinez@email.es', 5,69.99, NOW()-INTERVAL'29 days'),
    ('STD-NSW-001','ana.garcia@email.es',       8,64.99, NOW()-INTERVAL'27 days'),
    ('STD-FNK-001','pedro.sanchez@email.es',    4,14.99, NOW()-INTERVAL'26 days'),
    ('STD-PS5-002','lucia.fernandez@email.es',  3,59.99, NOW()-INTERVAL'24 days'),
    ('STD-NSW-002','javier.romero@email.es',    6,59.99, NOW()-INTERVAL'22 days'),
    ('STD-RPA-001','maria.lopez@email.es',      2,24.99, NOW()-INTERVAL'21 days'),
    ('STD-ACC-001','carlos.martinez@email.es',  4,74.99, NOW()-INTERVAL'19 days'),
    ('STD-PS5-001','sofia.molina@email.es',     3,69.99, NOW()-INTERVAL'17 days'),
    ('STD-NSW-001','alex.ruiz@email.es',        5,64.99, NOW()-INTERVAL'15 days'),
    ('STD-XBX-001','ana.garcia@email.es',       2,44.99, NOW()-INTERVAL'14 days'),
    ('STD-FNK-002','lucia.fernandez@email.es',  3,14.99, NOW()-INTERVAL'12 days'),
    ('STD-PS5-002','carlos.martinez@email.es',  4,59.99, NOW()-INTERVAL'10 days'),
    ('STD-NSW-002','pedro.sanchez@email.es',    7,59.99, NOW()-INTERVAL'8 days'),
    ('STD-ACC-002','javier.romero@email.es',    5,50.00, NOW()-INTERVAL'6 days'),
    ('STD-PS5-001','maria.lopez@email.es',      6,69.99, NOW()-INTERVAL'4 days'),
    ('STD-NSW-001','sofia.molina@email.es',     4,64.99, NOW()-INTERVAL'2 days'),
    ('STD-FNK-001','carlos.martinez@email.es',  3,14.99, NOW()-INTERVAL'1 day'),
    ('STD-XBX-001','ana.garcia@email.es',       2,44.99, NOW()-INTERVAL'12 hours')
) AS t(sku, email_cli, s_antes, precio, fecha_mov)
JOIN productos prod ON prod.sku  = t.sku
JOIN clientes  cli  ON cli.email = t.email_cli
JOIN usuarios  usr  ON usr.username = 'cajero'
ON CONFLICT DO NOTHING;

-- Venta retro única (demo de La Bóveda)
INSERT INTO transacciones_stock
    (id_producto, id_usuario, id_cliente, tipo_movimiento,
    cantidad, stock_antes, stock_despues, precio_unitario,
    referencia, notas, fecha)
SELECT prod.id, usr.id, cli.id,
    'SALIDA', 1, 1, 0, 69.99,
    'VTA-RETRO-2026-0001',
    'Venta de pieza retro única. Estado CIB confirmado por el gestor.',
    NOW() - INTERVAL '3 days'
FROM productos prod
JOIN usuarios  usr ON usr.username = 'cajero'
JOIN clientes  cli ON cli.email    = 'lucia.fernandez@email.es'
WHERE prod.sku = 'RET-MD-001'
ON CONFLICT DO NOTHING;

-- Reflejar la venta retro en el stock del producto
-- El trigger trg_productos_after_update registrará este cambio en audit_log
UPDATE productos SET stock_actual = 0 WHERE sku = 'RET-MD-001';


-- ── SEED 10 · ORDEN DE COMPRA DE EJEMPLO ─────────────────────

INSERT INTO ordenes_compra (id_proveedor, id_usuario, estado, notas, fecha_envio)
SELECT prov.id, usr.id, 'ENVIADA',
    'Orden generada por el Asistente Logístico IA. Reponer stock PS5 y Switch.',
    NOW() - INTERVAL '2 days'
FROM proveedores prov, usuarios usr
WHERE prov.razon_social = 'Koch Media Iberia S.L.' AND usr.username = 'gestor'
ON CONFLICT DO NOTHING;

INSERT INTO detalles_orden_compra (id_orden, id_producto, cantidad, precio_unitario)
SELECT oc.id, prod.id, det.cant, det.precio
FROM ordenes_compra oc
JOIN (VALUES
    ('STD-PS5-001',20,35.99),
    ('STD-PS5-002',15,29.50),
    ('STD-ACC-001', 5,48.00)
) AS det(sku,cant,precio) ON TRUE
JOIN productos prod ON prod.sku = det.sku
WHERE oc.notas LIKE 'Orden generada por el Asistente Logístico IA%'
ON CONFLICT DO NOTHING;