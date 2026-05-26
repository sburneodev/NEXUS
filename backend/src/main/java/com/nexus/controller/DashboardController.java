package com.nexus.controller;

import com.nexus.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyAuthority('CAJERO','GESTOR_INVENTARIO','ADMIN','MARKETING_ANALYST','CONTABLE')")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok(dashboardService.getAnalytics());
    }
}