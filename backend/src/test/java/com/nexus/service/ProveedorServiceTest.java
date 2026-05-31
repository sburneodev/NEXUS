package com.nexus.service;

import com.nexus.audit.AuditService;
import com.nexus.dto.ProveedorDTO;
import com.nexus.model.Proveedor;
import com.nexus.repository.ProveedorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * QA-01 — Tests unitarios de ProveedorService.
 *
 * Cubre:
 *  1. listar: devuelve lista de activos
 *  2. buscarPorId: encontrado OK, no encontrado → excepción
 *  3. crear: persiste y audita
 *  4. editar: actualiza campos y audita, no encontrado → excepción
 *  5. softDelete: marca activo=false, audita, no encontrado → excepción
 */
@ExtendWith(MockitoExtension.class)
class ProveedorServiceTest {

    @Mock private ProveedorRepository proveedorRepository;
    @Mock private AuditService        auditService;

    @InjectMocks private ProveedorService proveedorService;

    // ── Helpers ───────────────────────────────────────────────────────

    private Proveedor proveedorValido() {
        Proveedor p = new Proveedor();
        p.setRazonSocial("DistribuTech S.L.");
        p.setCif("B-12345678");
        p.setEmail("pedidos@distributech.es");
        p.setTelefono("+34 910 000 001");
        p.setDireccion("C/ Mayor 1, Madrid");
        p.setTiempoEntregaD((short) 3);
        p.setActivo(true);
        return p;
    }

    private ProveedorDTO dtoValido() {
        ProveedorDTO dto = new ProveedorDTO();
        dto.setRazonSocial("DistribuTech S.L.");
        dto.setCif("B-12345678");
        dto.setEmail("pedidos@distributech.es");
        dto.setTelefono("+34 910 000 001");
        dto.setDireccion("C/ Mayor 1, Madrid");
        dto.setTiempoEntregaD((short) 3);
        return dto;
    }

    // ── TEST 1 — listar ───────────────────────────────────────────────

    @Test
    void listar_devuelve_activos() {
        when(proveedorRepository.findByActivoTrue())
                .thenReturn(List.of(proveedorValido()));

        List<ProveedorDTO> result = proveedorService.listar();

        assertEquals(1, result.size());
        assertEquals("DistribuTech S.L.", result.get(0).getRazonSocial());
    }

    @Test
    void listar_sin_activos_devuelve_lista_vacia() {
        when(proveedorRepository.findByActivoTrue()).thenReturn(List.of());

        assertTrue(proveedorService.listar().isEmpty());
    }

    // ── TEST 2 — buscarPorId ──────────────────────────────────────────

    @Test
    void buscarPorId_encontrado_devuelveDTO() {
        when(proveedorRepository.findById(1L))
                .thenReturn(Optional.of(proveedorValido()));

        ProveedorDTO result = proveedorService.buscarPorId(1L);
        assertEquals("DistribuTech S.L.", result.getRazonSocial());
    }

    @Test
    void buscarPorId_no_encontrado_lanza_excepcion() {
        when(proveedorRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> proveedorService.buscarPorId(999L));
    }

    // ── TEST 3 — crear ────────────────────────────────────────────────

    @Test
    void crear_proveedor_persiste_y_audita() {
        Proveedor guardado = proveedorValido();
        when(proveedorRepository.save(any())).thenReturn(guardado);

        ProveedorDTO result = proveedorService.crear(dtoValido());

        assertEquals("DistribuTech S.L.", result.getRazonSocial());
        assertEquals("B-12345678",        result.getCif());
        verify(auditService).log(eq("PROVEEDOR"), eq("CREATE"), any(), anyString());
    }

    // ── TEST 4 — editar ───────────────────────────────────────────────

    @Test
    void editar_proveedor_actualiza_campos_y_audita() {
        Proveedor p = proveedorValido();
        when(proveedorRepository.findById(1L)).thenReturn(Optional.of(p));
        when(proveedorRepository.save(any())).thenReturn(p);

        ProveedorDTO dto = dtoValido();
        dto.setRazonSocial("NuevoNombre S.A.");
        dto.setTiempoEntregaD((short) 5);

        ProveedorDTO result = proveedorService.editar(1L, dto);

        assertEquals("NuevoNombre S.A.", p.getRazonSocial());
        assertEquals((short) 5, p.getTiempoEntregaD());
        assertNotNull(result);
        verify(auditService).log(eq("PROVEEDOR"), eq("UPDATE"), eq(1L), any());
    }

    @Test
    void editar_proveedor_no_encontrado_lanza_excepcion() {
        when(proveedorRepository.findById(88L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> proveedorService.editar(88L, dtoValido()));

        verify(proveedorRepository, never()).save(any());
    }

    // ── TEST 5 — softDelete ───────────────────────────────────────────

    @Test
    void softDelete_desactiva_proveedor_y_audita() {
        Proveedor p = proveedorValido();
        when(proveedorRepository.findById(1L)).thenReturn(Optional.of(p));
        when(proveedorRepository.save(any())).thenReturn(p);

        proveedorService.softDelete(1L);

        assertFalse(p.getActivo());
        verify(auditService).log(eq("PROVEEDOR"), eq("DELETE"), eq(1L), anyString());
    }

    @Test
    void softDelete_no_encontrado_lanza_excepcion() {
        when(proveedorRepository.findById(66L)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class,
                () -> proveedorService.softDelete(66L));

        verify(proveedorRepository, never()).save(any());
    }
}