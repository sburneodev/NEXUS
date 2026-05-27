package com.nexus.service;

import com.nexus.dto.ProductoDTO;
import com.nexus.model.Producto;
import com.nexus.model.Proveedor;
import com.nexus.repository.ProductoRepository;
import com.nexus.repository.ProveedorRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final ProveedorRepository proveedorRepository;

    public ProductoService(ProductoRepository productoRepository,
                           ProveedorRepository proveedorRepository) {
        this.productoRepository = productoRepository;
        this.proveedorRepository = proveedorRepository;
    }

    public ProductoDTO crear(ProductoDTO dto) {
        if (productoRepository.findBySkuAndActivoTrue(dto.getSku()).isPresent()) {
            throw new RuntimeException("Ya existe un producto con SKU: " + dto.getSku());
        }
        Producto p = toEntity(dto);
        return toDTO(productoRepository.save(p));
    }

    public ProductoDTO editar(Long id, ProductoDTO dto) {
        Producto p = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + id));
        p.setSku(dto.getSku());
        p.setNombre(dto.getNombre());
        p.setDescripcion(dto.getDescripcion());
        p.setPrecioCoste(dto.getPrecioCoste());
        p.setPrecioVenta(dto.getPrecioVenta());
        p.setStockActual(dto.getStockActual());
        p.setStockMinimo(dto.getStockMinimo());
        p.setStockMaximo(dto.getStockMaximo());
        p.setTipoProducto(dto.getTipoProducto());
        p.setEstadoConservacion(dto.getEstadoConservacion());
        p.setAtributosEspecificos(dto.getAtributosEspecificos());
        p.setActivo(dto.getActivo() != null ? dto.getActivo() : true);
        // Actualiza proveedor: si idProveedor es null se desvincula; si tiene valor se busca en DB
        if (dto.getIdProveedor() != null) {
            Proveedor prov = proveedorRepository.findById(dto.getIdProveedor())
                    .orElseThrow(() -> new RuntimeException(
                            "Proveedor no encontrado con id: " + dto.getIdProveedor()));
            p.setProveedor(prov);
        } else {
            p.setProveedor(null);
        }
        return toDTO(productoRepository.save(p));
    }

    public Page<ProductoDTO> listar(Pageable pageable) {
        return productoRepository.findByActivoTrue(pageable).map(this::toDTO);
    }

    public Page<ProductoDTO> listarPorTipo(String tipo, Pageable pageable) {
        return productoRepository.findByTipoProductoAndActivoTrue(tipo, pageable).map(this::toDTO);
    }

    /** Búsqueda parcial (contiene) en nombre, SKU y descripción. */
    public Page<ProductoDTO> buscar(String query, Pageable pageable) {
        return productoRepository.buscarContains(query, pageable).map(this::toDTO);
    }

    /** Búsqueda parcial filtrada además por tipo de producto. */
    public Page<ProductoDTO> buscarPorTipo(String query, String tipo, Pageable pageable) {
        return productoRepository.buscarContainsPorTipo(query, tipo, pageable).map(this::toDTO);
    }

    public void softDelete(Long id) {
        Producto p = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + id));
        p.setActivo(false);
        productoRepository.save(p);
    }

    public ProductoDTO toDTO(Producto p) {
        ProductoDTO dto = new ProductoDTO();
        dto.setId(p.getId());
        dto.setSku(p.getSku());
        dto.setNombre(p.getNombre());
        dto.setDescripcion(p.getDescripcion());
        dto.setPrecioCoste(p.getPrecioCoste());
        dto.setPrecioVenta(p.getPrecioVenta());
        dto.setStockActual(p.getStockActual());
        dto.setStockMinimo(p.getStockMinimo());
        dto.setStockMaximo(p.getStockMaximo());
        dto.setTipoProducto(p.getTipoProducto());
        dto.setEstadoConservacion(p.getEstadoConservacion());
        dto.setAtributosEspecificos(p.getAtributosEspecificos());
        dto.setActivo(p.getActivo());
        if (p.getProveedor() != null) {
            dto.setIdProveedor(p.getProveedor().getId());
            dto.setProveedorNombre(p.getProveedor().getRazonSocial());
        }
        return dto;
    }

    private Producto toEntity(ProductoDTO dto) {
        Producto p = new Producto();
        p.setSku(dto.getSku());
        p.setNombre(dto.getNombre());
        p.setDescripcion(dto.getDescripcion());
        p.setPrecioCoste(dto.getPrecioCoste());
        p.setPrecioVenta(dto.getPrecioVenta());
        p.setStockActual(dto.getStockActual() != null ? dto.getStockActual() : 0);
        p.setStockMinimo(dto.getStockMinimo() != null ? dto.getStockMinimo() : 0);
        p.setStockMaximo(dto.getStockMaximo() != null ? dto.getStockMaximo() : 9999);
        p.setTipoProducto(dto.getTipoProducto() != null ? dto.getTipoProducto() : "ESTANDAR");
        p.setEstadoConservacion(dto.getEstadoConservacion());
        p.setAtributosEspecificos(dto.getAtributosEspecificos());
        p.setActivo(true);
        // Asignación de proveedor por FK — integridad referencial garantizada
        if (dto.getIdProveedor() != null) {
            Proveedor prov = proveedorRepository.findById(dto.getIdProveedor())
                    .orElseThrow(() -> new RuntimeException(
                            "Proveedor no encontrado con id: " + dto.getIdProveedor()));
            p.setProveedor(prov);
        }
        return p;
    }
}