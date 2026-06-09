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

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class ClienteService {

    private static final String ENTIDAD       = "CLIENTE";
    private static final String NOT_FOUND_MSG = "Cliente no encontrado: ";

    private final ClienteRepository clienteRepository;
    private final AuditService      auditService;

    public ClienteService(ClienteRepository clienteRepository,
                          AuditService auditService) {
        this.clienteRepository = clienteRepository;
        this.auditService      = auditService;
    }

    public Page<ClienteDTO> listar(String buscar, Boolean activo, Pageable pageable) {
        boolean hayBusqueda = buscar != null && !buscar.isBlank();

        if (activo == null) {
            if (hayBusqueda) {
                return clienteRepository
                        .findByNombreContainingIgnoreCase(buscar, pageable)
                        .map(this::toDTO);
            }
            return clienteRepository.findAll(pageable).map(this::toDTO);
        }

        if (hayBusqueda) {
            return clienteRepository
                    .findByNombreContainingIgnoreCaseAndActivo(buscar, activo, pageable)
                    .map(this::toDTO);
        }
        return clienteRepository.findByActivo(activo, pageable).map(this::toDTO);
    }

    public ClienteDTO buscarPorId(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, NOT_FOUND_MSG + id));
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
        auditService.log(ENTIDAD, "CREATE", saved.getId(),
                saved.getNombre() + (saved.getEmail() != null ? " | " + saved.getEmail() : ""));
        return saved;
    }

    @Transactional
    public ClienteDTO editar(Long id, ClienteDTO dto) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, NOT_FOUND_MSG + id));
        if (dto.getEmail() != null && !dto.getEmail().equals(cliente.getEmail())) {
            clienteRepository.findByEmail(dto.getEmail()).ifPresent(c -> {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Ya existe un cliente con el email: " + dto.getEmail());
            });
        }

        String  nombreAnterior = cliente.getNombre();
        String  emailAnterior  = cliente.getEmail();
        String  telAnterior    = cliente.getTelefono();
        Integer puntosAnterior = cliente.getPuntosFidelidad();
        boolean activoAnterior = Boolean.TRUE.equals(cliente.getActivo());

        cliente.setNombre(dto.getNombre());
        cliente.setEmail(dto.getEmail());
        cliente.setTelefono(dto.getTelefono());
        if (dto.getPuntosFidelidad() != null) {
            cliente.setPuntosFidelidad(dto.getPuntosFidelidad());
        }
        if (dto.getActivo() != null) {
            cliente.setActivo(dto.getActivo());
        }

        ClienteDTO result = toDTO(clienteRepository.save(cliente));
        boolean activoNuevo = Boolean.TRUE.equals(result.getActivo());

        List<String> cambios = new ArrayList<>();
        if (!Objects.equals(nombreAnterior, dto.getNombre()))
            cambios.add("nombre: " + strAudit(nombreAnterior) + "→" + strAudit(dto.getNombre()));
        if (!Objects.equals(emailAnterior, dto.getEmail()))
            cambios.add("email: " + strAudit(emailAnterior) + "→" + strAudit(dto.getEmail()));
        if (!Objects.equals(telAnterior, dto.getTelefono()))
            cambios.add("tel: " + strAudit(telAnterior) + "→" + strAudit(dto.getTelefono()));
        if (dto.getPuntosFidelidad() != null && !Objects.equals(puntosAnterior, dto.getPuntosFidelidad()))
            cambios.add("puntos: " + strAudit(puntosAnterior) + "→" + strAudit(dto.getPuntosFidelidad()));
        if (activoAnterior != activoNuevo)
            cambios.add("estado: " + (activoAnterior ? "ACTIVO" : "INACTIVO") + "→" + (activoNuevo ? "ACTIVO" : "INACTIVO"));

        String detalle = result.getNombre();
        if (!cambios.isEmpty()) {
            detalle += " | " + String.join(" | ", cambios);
        } else {
            detalle += " | sin cambios";
        }
        auditService.log(ENTIDAD, "UPDATE", id, detalle);
        return result;
    }

    @Transactional
    public ClienteDTO sumarPuntos(Long id, int puntos) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, NOT_FOUND_MSG + id));
        int nuevoPuntos = cliente.getPuntosFidelidad() + puntos;
        if (nuevoPuntos < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Los puntos no pueden quedar en negativo.");
        }
        cliente.setPuntosFidelidad(nuevoPuntos);
        ClienteDTO result = toDTO(clienteRepository.save(cliente));
        auditService.log(ENTIDAD, "UPDATE", id,
            "Puntos de fidelidad: " + (nuevoPuntos - puntos) + " → " + nuevoPuntos
            + " (delta: " + (puntos >= 0 ? "+" : "") + puntos + ")");
        return result;
    }

    @Transactional
    public void softDelete(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, NOT_FOUND_MSG + id));
        String nombre = cliente.getNombre();
        cliente.setActivo(false);
        clienteRepository.save(cliente);
        auditService.log(ENTIDAD, "DELETE", id, nombre + " | baja lógica");
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

    private static String strAudit(Object val) {
        return val != null ? val.toString() : "—";
    }
}