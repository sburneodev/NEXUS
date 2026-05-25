package com.nexus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class NexusBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexusBackendApplication.class, args);
    }
}