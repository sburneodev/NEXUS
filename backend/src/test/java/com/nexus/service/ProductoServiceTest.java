package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.ProductoDTO;
import com.nexus.model.Producto;
import com.nexus.repository.ProductoRepository;
import com.nexus.repository.ProveedorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductoServiceTest {

    @Mock private AuditService        auditService;
    @Mock private ProductoRepository  productoRepository;
    @Mock private ProveedorRepository proveedorRepository;
    @InjectMocks private ProductoService productoService;

    private Producto productoValido() {
        Producto p = new Producto();
        p.setSku("STD-TEST-001");
        p.setNombre("Producto Test");
        p.setPrecioCoste(BigDecimal.TEN);
        p.setPrecioVenta(BigDecimal.valueOf(19.99));
        p.setTipoProducto("ESTANDAR");
        p.setActivo(true);
        return p;
    }

    @Test
    void crear_producto_nuevo_ok() {
        ProductoDTO dto = new ProductoDTO();
        dto.setSku("STD-TEST-001");
        dto.setNombre("Producto Test");
        dto.setPrecioCoste(BigDecimal.TEN);
        dto.setPrecioVenta(BigDecimal.valueOf(19.99));

        when(productoRepository.findBySkuAndActivoTrue("STD-TEST-001")).thenReturn(Optional.empty());
        when(productoRepository.save(any())).thenReturn(productoValido());

        ProductoDTO result = productoService.crear(dto);
        assertEquals("STD-TEST-001", result.getSku());
    }

    @Test
    void crear_producto_sku_duplicado_lanza_excepcion() {
        ProductoDTO dto = new ProductoDTO();
        dto.setSku("STD-TEST-001");

        when(productoRepository.findBySkuAndActivoTrue("STD-TEST-001"))
                .thenReturn(Optional.of(productoValido()));

        assertThrows(RuntimeException.class, () -> productoService.crear(dto));
    }

    @Test
    void buscar_producto_no_encontrado_lanza_excepcion() {
        when(productoRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> productoService.editar(999L, new ProductoDTO()));
    }

    @Test
    void listar_devuelve_pagina() {
        when(productoRepository.findByActivoTrue(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(productoValido())));

        var result = productoService.listar(Pageable.unpaged());
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void soft_delete_desactiva_producto() {
        Producto p = productoValido();
        when(productoRepository.findById(1L)).thenReturn(Optional.of(p));
        when(productoRepository.save(any())).thenReturn(p);

        productoService.softDelete(1L);
        assertFalse(p.getActivo());
    }
}