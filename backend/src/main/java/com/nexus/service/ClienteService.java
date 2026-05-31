package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.ClienteDTO;
import com.nexus.model.Cliente;
import com.nexus.repository.ClienteRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final AuditService      auditService;

    public ClienteService(ClienteRepository clienteRepository,
                          AuditService auditService) {
        this.clienteRepository = clienteRepository;
        this.auditService      = auditService;
    }

    public Page<ClienteDTO> listar(String buscar, Pageable pageable) {
        if (buscar != null && !buscar.isBlank()) {
            return clienteRepository
                    .findByNombreContainingIgnoreCaseAndActivoTrue(buscar, pageable)
                    .map(this::toDTO);
        }
        return clienteRepository.findByActivoTrue(pageable).map(this::toDTO);
    }

    public ClienteDTO buscarPorId(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente no encontrado: " + id));
        return toDTO(cliente);
    }

    @Transactional
    public ClienteDTO crear(ClienteDTO dto) {
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            clienteRepository.findByEmail(dto.getEmail()).ifPresent(c -> {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ya existe un cliente con el email: " + dto.getEmail());
            });
        }
        Cliente cliente = toEntity(dto);
        ClienteDTO saved = toDTO(clienteRepository.save(cliente));
        auditService.log("CLIENTE", "CREATE", saved.getId(),
                saved.getNombre() + (saved.getEmail() != null ? " | " + saved.getEmail() : ""));
        return saved;
    }

    @Transactional
    public ClienteDTO editar(Long id, ClienteDTO dto) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente no encontrado: " + id));
        if (dto.getEmail() != null && !dto.getEmail().equals(cliente.getEmail())) {
            clienteRepository.findByEmail(dto.getEmail()).ifPresent(c -> {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ya existe un cliente con el email: " + dto.getEmail());
            });
        }
        cliente.setNombre(dto.getNombre());
        cliente.setEmail(dto.getEmail());
        cliente.setTelefono(dto.getTelefono());
        if (dto.getPuntosFidelidad() != null) {
            cliente.setPuntosFidelidad(dto.getPuntosFidelidad());
        }
        ClienteDTO result = toDTO(clienteRepository.save(cliente));
        auditService.log("CLIENTE", "UPDATE", id, result.getNombre());
        return result;
    }

    @Transactional
    public ClienteDTO sumarPuntos(Long id, int puntos) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente no encontrado: " + id));
        int nuevoPuntos = cliente.getPuntosFidelidad() + puntos;
        if (nuevoPuntos < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Los puntos no pueden quedar en negativo.");
        }
        cliente.setPuntosFidelidad(nuevoPuntos);
        return toDTO(clienteRepository.save(cliente));
    }

    @Transactional
    public void softDelete(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente no encontrado: " + id));
        String nombre = cliente.getNombre();
        cliente.setActivo(false);
        clienteRepository.save(cliente);
        auditService.log("CLIENTE", "DELETE", id, "Baja lógica | " + nombre);
    }

    public ClienteDTO toDTO(Cliente c) {
        ClienteDTO dto = new ClienteDTO();
        dto.setId(c.getId());
        dto.setNombre(c.getNombre());
        dto.setEmail(c.getEmail());
        dto.setTelefono(c.getTelefono());
        dto.setPuntosFidelidad(c.getPuntosFidelidad());
        dto.setActivo(c.getActivo());
        dto.setCreadoEn(c.getCreadoEn());
        dto.setActualizadoEn(c.getActualizadoEn());
        return dto;
    }

    private Cliente toEntity(ClienteDTO dto) {
        Cliente c = new Cliente();
        c.setNombre(dto.getNombre());
        c.setEmail(dto.getEmail());
        c.setTelefono(dto.getTelefono());
        c.setPuntosFidelidad(dto.getPuntosFidelidad() != null ? dto.getPuntosFidelidad() : 0);
        c.setActivo(true);
        return c;
    }
}
