package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.ClienteDTO;
import com.nexus.model.Cliente;
import com.nexus.repository.ClienteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * QA-01 — Tests unitarios de ClienteService.
 *
 * Cubre:
 *  1. crear: cliente nuevo OK, email duplicado → 409
 *  2. buscarPorId: encontrado OK, no encontrado → 404
 *  3. editar: OK, no encontrado → 404, email en conflicto → 409
 *  4. sumarPuntos: OK, resultado negativo → 400
 *  5. softDelete: marca activo=false y llama a audit
 *  6. listar: sin búsqueda devuelve página
 */
@ExtendWith(MockitoExtension.class)
class ClienteServiceTest {

    @Mock private ClienteRepository clienteRepository;
    @Mock private AuditService      auditService;

    @InjectMocks private ClienteService clienteService;

    // ── Helpers ───────────────────────────────────────────────────────

    private Cliente clienteValido() {
        Cliente c = new Cliente();
        c.setNombre("Carlos Test");
        c.setEmail("carlos@test.es");
        c.setTelefono("+34 600 000 001");
        c.setPuntosFidelidad(100);
        c.setActivo(true);
        return c;
    }

    private ClienteDTO dtoValido() {
        ClienteDTO dto = new ClienteDTO();
        dto.setNombre("Carlos Test");
        dto.setEmail("carlos@test.es");
        dto.setTelefono("+34 600 000 001");
        dto.setPuntosFidelidad(100);
        return dto;
    }

    // ── TEST 1 — crear ────────────────────────────────────────────────

    @Test
    void crear_cliente_nuevo_ok() {
        when(clienteRepository.findByEmail("carlos@test.es")).thenReturn(Optional.empty());
        when(clienteRepository.save(any())).thenReturn(clienteValido());

        ClienteDTO result = clienteService.crear(dtoValido());

        assertEquals("Carlos Test", result.getNombre());
        verify(auditService).log(eq("CLIENTE"), eq("CREATE"), any(), anyString());
    }

    @Test
    void crear_cliente_email_duplicado_lanza409() {
        when(clienteRepository.findByEmail("carlos@test.es"))
                .thenReturn(Optional.of(clienteValido()));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clienteService.crear(dtoValido()));

        assertEquals(409, ex.getStatusCode().value());
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void crear_cliente_sin_email_no_comprueba_duplicado() {
        ClienteDTO dto = dtoValido();
        dto.setEmail(null);

        Cliente guardado = clienteValido();
        guardado.setEmail(null);
        when(clienteRepository.save(any())).thenReturn(guardado);

        ClienteDTO result = clienteService.crear(dto);
        assertNotNull(result);
        // Si email es null, no debe consultar findByEmail
        verify(clienteRepository, never()).findByEmail(any());
    }

    // ── TEST 2 — buscarPorId ──────────────────────────────────────────

    @Test
    void buscarPorId_encontrado_devuelveDTO() {
        Cliente c = clienteValido();
        try {
            var f = Cliente.class.getDeclaredField("id");
            f.setAccessible(true);
            f.set(c, 1L);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(c));

        ClienteDTO result = clienteService.buscarPorId(1L);
        assertEquals("Carlos Test", result.getNombre());
    }

    @Test
    void buscarPorId_no_encontrado_lanza404() {
        when(clienteRepository.findById(999L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clienteService.buscarPorId(999L));

        assertEquals(404, ex.getStatusCode().value());
    }

    // ── TEST 3 — editar ───────────────────────────────────────────────

    @Test
    void editar_cliente_ok() {
        Cliente c = clienteValido();
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(c));
        when(clienteRepository.save(any())).thenReturn(c);

        ClienteDTO dto = dtoValido();
        dto.setNombre("Carlos Editado");

        ClienteDTO result = clienteService.editar(1L, dto);
        assertNotNull(result);
        verify(auditService).log(eq("CLIENTE"), eq("UPDATE"), eq(1L), any());
    }

    @Test
    void editar_cliente_no_encontrado_lanza404() {
        when(clienteRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clienteService.editar(99L, dtoValido()));

        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void editar_cliente_email_en_conflicto_lanza409() {
        Cliente c = clienteValido();
        c.setEmail("viejo@test.es");
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(c));

        Cliente otroCon = new Cliente();
        otroCon.setEmail("nuevo@test.es");
        when(clienteRepository.findByEmail("nuevo@test.es"))
                .thenReturn(Optional.of(otroCon));

        ClienteDTO dto = dtoValido();
        dto.setEmail("nuevo@test.es");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clienteService.editar(1L, dto));

        assertEquals(409, ex.getStatusCode().value());
    }

    // ── TEST 4 — sumarPuntos ──────────────────────────────────────────

    @Test
    void sumarPuntos_suma_correctamente() {
        Cliente c = clienteValido();
        c.setPuntosFidelidad(200);
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(c));
        when(clienteRepository.save(any())).thenReturn(c);

        ClienteDTO result = clienteService.sumarPuntos(1L, 50);
        assertEquals(250, c.getPuntosFidelidad());
        assertNotNull(result);
    }

    @Test
    void sumarPuntos_resultado_negativo_lanza400() {
        Cliente c = clienteValido();
        c.setPuntosFidelidad(10);
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(c));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clienteService.sumarPuntos(1L, -50));

        assertEquals(400, ex.getStatusCode().value());
    }

    // ── TEST 5 — softDelete ───────────────────────────────────────────

    @Test
    void softDelete_desactiva_cliente_y_audita() {
        Cliente c = clienteValido();
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(c));
        when(clienteRepository.save(any())).thenReturn(c);

        clienteService.softDelete(1L);

        assertFalse(c.getActivo());
        verify(auditService).log(eq("CLIENTE"), eq("DELETE"), eq(1L), anyString());
    }

    @Test
    void softDelete_no_encontrado_lanza404() {
        when(clienteRepository.findById(77L)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> clienteService.softDelete(77L));

        assertEquals(404, ex.getStatusCode().value());
    }

    // ── TEST 6 — listar ───────────────────────────────────────────────

    @Test
    void listar_sin_busqueda_devuelve_pagina() {
        when(clienteRepository.findByActivoTrue(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(clienteValido())));

        var result = clienteService.listar(null, Pageable.unpaged());
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void listar_con_busqueda_filtra_por_nombre() {
        when(clienteRepository.findByNombreContainingIgnoreCaseAndActivoTrue(
                eq("Carlos"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(clienteValido())));

        var result = clienteService.listar("Carlos", Pageable.unpaged());
        assertEquals(1, result.getTotalElements());
    }
}