package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.ProveedorDTO;
import com.nexus.model.Proveedor;
import com.nexus.repository.ProveedorRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class ProveedorService {

    private static final String ENTIDAD       = "PROVEEDOR";
    private static final String NOT_FOUND_MSG = "Proveedor no encontrado: ";

    private final ProveedorRepository proveedorRepository;
    private final AuditService        auditService;

    public ProveedorService(ProveedorRepository proveedorRepository,
                            AuditService auditService) {
        this.proveedorRepository = proveedorRepository;
        this.auditService        = auditService;
    }

    public List<ProveedorDTO> listar() {
        return proveedorRepository.findAll()
                .stream().map(this::toDTO).toList();
    }

    public ProveedorDTO buscarPorId(Long id) {
        return toDTO(proveedorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(NOT_FOUND_MSG + id)));
    }

    public ProveedorDTO crear(ProveedorDTO dto) {
        Proveedor p = toEntity(dto);
        ProveedorDTO saved = toDTO(proveedorRepository.save(p));
        auditService.log(ENTIDAD, "CREATE", saved.getId(),
                saved.getRazonSocial() + (saved.getCif() != null ? " | CIF: " + saved.getCif() : ""));
        return saved;
    }

    public ProveedorDTO editar(Long id, ProveedorDTO dto) {
        Proveedor p = proveedorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(NOT_FOUND_MSG + id));

        EstadoAnterior anterior = new EstadoAnterior(
                p.getRazonSocial(), p.getCif(), p.getEmail(),
                p.getTelefono(), p.getDireccion(), p.getTiempoEntregaD(),
                Boolean.TRUE.equals(p.getActivo())
        );

        p.setRazonSocial(dto.getRazonSocial());
        p.setCif(dto.getCif());
        p.setEmail(dto.getEmail());
        p.setTelefono(dto.getTelefono());
        p.setDireccion(dto.getDireccion());
        p.setTiempoEntregaD(dto.getTiempoEntregaD());
        if (dto.getActivo() != null) {
            p.setActivo(dto.getActivo());
        }

        ProveedorDTO result = toDTO(proveedorRepository.save(p));
        String detalle = construirDetalle(result, dto, anterior);
        auditService.log(ENTIDAD, "UPDATE", id, detalle);
        return result;
    }
    public void softDelete(Long id) {
        Proveedor p = proveedorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException(NOT_FOUND_MSG + id));
        String razon = p.getRazonSocial();
        p.setActivo(false);
        proveedorRepository.save(p);
        auditService.log(ENTIDAD, "DELETE", id, razon + " | baja lógica");
    }

    private String construirDetalle(ProveedorDTO result, ProveedorDTO dto, EstadoAnterior ant) {
        boolean activoNuevo = Boolean.TRUE.equals(result.getActivo());
        List<String> cambios = new ArrayList<>();

        if (!Objects.equals(ant.razonSocial(), dto.getRazonSocial()))
            cambios.add("razón social: " + strAudit(ant.razonSocial()) + "→" + strAudit(dto.getRazonSocial()));
        if (!Objects.equals(ant.cif(), dto.getCif()))
            cambios.add("CIF: " + strAudit(ant.cif()) + "→" + strAudit(dto.getCif()));
        if (!Objects.equals(ant.email(), dto.getEmail()))
            cambios.add("email: " + strAudit(ant.email()) + "→" + strAudit(dto.getEmail()));
        if (!Objects.equals(ant.telefono(), dto.getTelefono()))
            cambios.add("tel: " + strAudit(ant.telefono()) + "→" + strAudit(dto.getTelefono()));
        if (!Objects.equals(ant.direccion(), dto.getDireccion()))
            cambios.add("dirección: " + strAudit(ant.direccion()) + "→" + strAudit(dto.getDireccion()));
        if (!Objects.equals(ant.tiempoEntrega(), dto.getTiempoEntregaD()))
            cambios.add("entrega: " + strAudit(ant.tiempoEntrega()) + "→" + strAudit(dto.getTiempoEntregaD()));
        if (ant.activo() != activoNuevo)
            cambios.add("estado: " + (ant.activo() ? "ACTIVO" : "INACTIVO")
                      + "→" + (activoNuevo ? "ACTIVO" : "INACTIVO"));

        String detalle = result.getRazonSocial();
        return cambios.isEmpty() ? detalle + " | sin cambios"
                                 : detalle + " | " + String.join(" | ", cambios);
    }

    private ProveedorDTO toDTO(Proveedor p) {
        ProveedorDTO dto = new ProveedorDTO();
        dto.setId(p.getId());
        dto.setRazonSocial(p.getRazonSocial());
        dto.setCif(p.getCif());
        dto.setEmail(p.getEmail());
        dto.setTelefono(p.getTelefono());
        dto.setDireccion(p.getDireccion());
        dto.setTiempoEntregaD(p.getTiempoEntregaD());
        dto.setActivo(p.getActivo());
        return dto;
    }

    private static String strAudit(Object val) {
        return val != null ? val.toString() : "—";
    }

    private Proveedor toEntity(ProveedorDTO dto) {
        Proveedor p = new Proveedor();
        p.setRazonSocial(dto.getRazonSocial());
        p.setCif(dto.getCif());
        p.setEmail(dto.getEmail());
        p.setTelefono(dto.getTelefono());
        p.setDireccion(dto.getDireccion());
        p.setTiempoEntregaD(dto.getTiempoEntregaD());
        p.setActivo(true);
        return p;
    }
    private record EstadoAnterior(
    	    String razonSocial, String cif, String email,
    	    String telefono, String direccion, Short tiempoEntrega,
    	    boolean activo
    	) {}
}