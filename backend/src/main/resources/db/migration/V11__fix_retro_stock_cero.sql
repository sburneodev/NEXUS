-- V11: los artículos retro con stock = 0 deben estar inactivos (vendidos)
UPDATE productos
SET activo = false
WHERE tipo_producto = 'RETRO'
  AND stock_actual  = 0
  AND activo        = true;
