package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.ProveedorDTO;
import com.nexus.model.Proveedor;
import com.nexus.repository.ProveedorRepository;
import org.springframework.stereotype.Service;

import java.util.List;

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
        return proveedorRepository.findByActivoTrue()
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
        p.setRazonSocial(dto.getRazonSocial());
        p.setCif(dto.getCif());
        p.setEmail(dto.getEmail());
        p.setTelefono(dto.getTelefono());
        p.setDireccion(dto.getDireccion());
        p.setTiempoEntregaD(dto.getTiempoEntregaD());
        ProveedorDTO result = toDTO(proveedorRepository.save(p));
        auditService.log("PROVEEDOR", "UPDATE", id, result.getRazonSocial());
        return result;
    }

    public void softDelete(Long id) {
        Proveedor p = proveedorRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado: " + id));
        String razon = p.getRazonSocial();
        p.setActivo(false);
        proveedorRepository.save(p);
        auditService.log("PROVEEDOR", "DELETE", id, "Baja lógica | " + razon);
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
