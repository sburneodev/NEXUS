package com.nexus.service;

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

    public ClienteService(ClienteRepository clienteRepository) {
        this.clienteRepository = clienteRepository;
    }

    // ── Listar (con búsqueda opcional por nombre) ──────────────────────
    public Page<ClienteDTO> listar(String buscar, Pageable pageable) {
        if (buscar != null && !buscar.isBlank()) {
            return clienteRepository
                    .findByNombreContainingIgnoreCaseAndActivoTrue(buscar, pageable)
                    .map(this::toDTO);
        }
        return clienteRepository.findByActivoTrue(pageable).map(this::toDTO);
    }

    // ── Buscar por ID ──────────────────────────────────────────────────
    public ClienteDTO buscarPorId(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente no encontrado: " + id));
        return toDTO(cliente);
    }

    // ── Crear ──────────────────────────────────────────────────────────
    @Transactional
    public ClienteDTO crear(ClienteDTO dto) {
        // Comprobar email duplicado si se proporcionó
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            clienteRepository.findByEmail(dto.getEmail()).ifPresent(c -> {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ya existe un cliente con el email: " + dto.getEmail());
            });
        }

        Cliente cliente = toEntity(dto);
        return toDTO(clienteRepository.save(cliente));
    }

    // ── Editar ─────────────────────────────────────────────────────────
    @Transactional
    public ClienteDTO editar(Long id, ClienteDTO dto) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente no encontrado: " + id));

        // Si el email cambia, comprobar que no lo tenga otro cliente
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

        return toDTO(clienteRepository.save(cliente));
    }

    // ── Sumar puntos de fidelidad ──────────────────────────────────────
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

    // ── Baja lógica (soft delete) ──────────────────────────────────────
    @Transactional
    public void softDelete(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente no encontrado: " + id));
        cliente.setActivo(false);
        clienteRepository.save(cliente);
    }

    // ── Mapeo entidad → DTO ────────────────────────────────────────────
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

    // ── Mapeo DTO → entidad ────────────────────────────────────────────
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
