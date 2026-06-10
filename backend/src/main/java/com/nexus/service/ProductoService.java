package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.ProductoDTO;
import com.nexus.model.Categoria;
import com.nexus.model.Producto;
import com.nexus.model.Proveedor;
import com.nexus.model.UbicacionAlmacen;
import com.nexus.repository.CategoriaRepository;
import com.nexus.repository.ProductoRepository;
import com.nexus.repository.ProveedorRepository;
import com.nexus.repository.UbicacionAlmacenRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductoService {

    private final ProductoRepository         productoRepository;
    private final ProveedorRepository        proveedorRepository;
    private final CategoriaRepository        categoriaRepository;
    private final UbicacionAlmacenRepository ubicacionRepository;
    private final AuditService               auditService;
    private static final String ENTIDAD = "PRODUCTO";

    public ProductoService(ProductoRepository productoRepository,
                           ProveedorRepository proveedorRepository,
                           CategoriaRepository categoriaRepository,
                           UbicacionAlmacenRepository ubicacionRepository,
                           AuditService auditService) {
        this.productoRepository  = productoRepository;
        this.proveedorRepository = proveedorRepository;
        this.categoriaRepository = categoriaRepository;
        this.ubicacionRepository = ubicacionRepository;
        this.auditService        = auditService;
    }

    public ProductoDTO crear(ProductoDTO dto) {
        if (productoRepository.findBySkuAndActivoTrue(dto.getSku()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ya existe un producto con SKU: " + dto.getSku());
        }
        Producto p = toEntity(dto);
        ProductoDTO saved = toDTO(productoRepository.save(p));
        auditService.log(ENTIDAD, "CREATE", saved.getId(),
                "SKU: " + saved.getSku() + " | " + saved.getNombre());
        return saved;
    }

    public ProductoDTO editar(Long id, ProductoDTO dto) {
        Producto p = productoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Producto no encontrado: " + id));
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
        if (dto.getIdProveedor() != null) {
            Proveedor prov = proveedorRepository.findById(dto.getIdProveedor())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Proveedor no encontrado con id: " + dto.getIdProveedor()));
            p.setProveedor(prov);
        } else {
            p.setProveedor(null);
        }
        if (dto.getIdCategoria() != null) {
            Categoria cat = categoriaRepository.findById(dto.getIdCategoria())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Categoría no encontrada con id: " + dto.getIdCategoria()));
            p.setCategoria(cat);
        } else {
            p.setCategoria(null);
        }
        if (dto.getIdUbicacion() != null) {
            UbicacionAlmacen ubic = ubicacionRepository.findById(dto.getIdUbicacion())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Ubicación no encontrada con id: " + dto.getIdUbicacion()));
            p.setUbicacion(ubic);
        } else {
            p.setUbicacion(null);
        }
        ProductoDTO result = toDTO(productoRepository.save(p));
        auditService.log(ENTIDAD, "UPDATE", id,
                "SKU: " + result.getSku() + " | " + result.getNombre());
        return result;
    }

    public Page<ProductoDTO> listar(Pageable pageable) {
        return productoRepository.findByActivoTrue(pageable).map(this::toDTO);
    }

    public Page<ProductoDTO> listarPorTipo(String tipo, Pageable pageable) {
        return productoRepository.findByTipoProductoAndActivoTrue(tipo, pageable).map(this::toDTO);
    }

    public Page<ProductoDTO> buscar(String query, Pageable pageable) {
        return productoRepository.buscarContains(query, pageable).map(this::toDTO);
    }

    public Page<ProductoDTO> buscarPorTipo(String query, String tipo, Pageable pageable) {
        return productoRepository.buscarContainsPorTipo(query, tipo, pageable).map(this::toDTO);
    }

    public void softDelete(Long id) {
        Producto p = productoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Producto no encontrado: " + id));
        p.setActivo(false);
        productoRepository.save(p);
        auditService.log(ENTIDAD, "DELETE", id,
                "Baja lógica | SKU: " + p.getSku() + " | " + p.getNombre());
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
        if (p.getCategoria() != null) {
            dto.setIdCategoria(p.getCategoria().getId());
            dto.setCategoriaNombre(p.getCategoria().getNombre());
        }
        if (p.getUbicacion() != null) {
            dto.setIdUbicacion(p.getUbicacion().getId());
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
        if (dto.getIdProveedor() != null) {
            Proveedor prov = proveedorRepository.findById(dto.getIdProveedor())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Proveedor no encontrado con id: " + dto.getIdProveedor()));
            p.setProveedor(prov);
        }
        if (dto.getIdCategoria() != null) {
            Categoria cat = categoriaRepository.findById(dto.getIdCategoria())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Categoría no encontrada con id: " + dto.getIdCategoria()));
            p.setCategoria(cat);
        }
        if (dto.getIdUbicacion() != null) {
            UbicacionAlmacen ubic = ubicacionRepository.findById(dto.getIdUbicacion())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Ubicación no encontrada con id: " + dto.getIdUbicacion()));
            p.setUbicacion(ubic);
        }
        return p;
    }
}