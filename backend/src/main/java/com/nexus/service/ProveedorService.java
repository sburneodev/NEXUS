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

    private final ProveedorRepository proveedorRepository;
    private final AuditService        auditService;

    public ProveedorService(ProveedorRepository proveedorRepository,
                            AuditService auditService) {
        this.proveedorRepository = proveedorRepository;
        this.auditService        = auditService;
    }

    public List<ProveedorDTO> listar() {
        // Devuelve TODOS (activos e inactivos) — el frontend filtra por estado
        return proveedorRepository.findAll()
                .stream().map(this::toDTO).toList();
    }

    public ProveedorDTO buscarPorId(Long id) {
        return toDTO(proveedorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado: " + id)));
    }

    public ProveedorDTO crear(ProveedorDTO dto) {
        Proveedor p = toEntity(dto);
        ProveedorDTO saved = toDTO(proveedorRepository.save(p));
        auditService.log("PROVEEDOR", "CREATE", saved.getId(),
                saved.getRazonSocial() + (saved.getCif() != null ? " | CIF: " + saved.getCif() : ""));
        return saved;
    }

    public ProveedorDTO editar(Long id, ProveedorDTO dto) {
        Proveedor p = proveedorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado: " + id));

        // Capturar valores anteriores para el diff de auditoría
        String  razonAnterior  = p.getRazonSocial();
        String  cifAnterior    = p.getCif();
        String  emailAnterior  = p.getEmail();
        String  telAnterior    = p.getTelefono();
        String  dirAnterior    = p.getDireccion();
        Short   tiempoAnterior = p.getTiempoEntregaD();
        boolean activoAnterior = Boolean.TRUE.equals(p.getActivo());

        // Aplicar cambios
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
        boolean activoNuevo = Boolean.TRUE.equals(result.getActivo());

        // Construir diff completo de campos modificados
        List<String> cambios = new ArrayList<>();
        if (!Objects.equals(razonAnterior, dto.getRazonSocial()))
            cambios.add("razón social: " + strAudit(razonAnterior) + "→" + strAudit(dto.getRazonSocial()));
        if (!Objects.equals(cifAnterior, dto.getCif()))
            cambios.add("CIF: " + strAudit(cifAnterior) + "→" + strAudit(dto.getCif()));
        if (!Objects.equals(emailAnterior, dto.getEmail()))
            cambios.add("email: " + strAudit(emailAnterior) + "→" + strAudit(dto.getEmail()));
        if (!Objects.equals(telAnterior, dto.getTelefono()))
            cambios.add("tel: " + strAudit(telAnterior) + "→" + strAudit(dto.getTelefono()));
        if (!Objects.equals(dirAnterior, dto.getDireccion()))
            cambios.add("dirección: " + strAudit(dirAnterior) + "→" + strAudit(dto.getDireccion()));
        if (!Objects.equals(tiempoAnterior, dto.getTiempoEntregaD()))
            cambios.add("entrega: " + strAudit(tiempoAnterior) + "→" + strAudit(dto.getTiempoEntregaD()));
        if (activoAnterior != activoNuevo)
            cambios.add("estado: " + (activoAnterior ? "ACTIVO" : "INACTIVO") + "→" + (activoNuevo ? "ACTIVO" : "INACTIVO"));

        String detalle = result.getRazonSocial();
        if (!cambios.isEmpty()) {
            detalle += " | " + String.join(" | ", cambios);
        } else {
            detalle += " | sin cambios";
        }
        auditService.log("PROVEEDOR", "UPDATE", id, detalle);
        return result;
    }

    public void softDelete(Long id) {
        Proveedor p = proveedorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado: " + id));
        String razon = p.getRazonSocial();
        p.setActivo(false);
        proveedorRepository.save(p);
        auditService.log("PROVEEDOR", "DELETE", id, razon + " | baja lógica");
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

    /** Devuelve el valor como string para el log de auditoría; null → "—" */
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
}
