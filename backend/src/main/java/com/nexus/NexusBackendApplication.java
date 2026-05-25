package com.nexus;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/*
 * @EnableAsync activa el soporte para @Async en EmailService.
 * Sin esto, el envío de email bloquearía el hilo HTTP del registro.
 */
@SpringBootApplication
@EnableAsync
public class NexusBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(NexusBackendApplication.class, args);
	}

}
